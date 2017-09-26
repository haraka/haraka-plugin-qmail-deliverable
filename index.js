'use strict';
// validate an email address is local, using qmail-deliverabled

const http        = require('http');
const querystring = require('querystring');
const url         = require('url');

let outbound;

exports.register = function () {
    const plugin = this;

    plugin.load_qmd_ini();

    if (process.env.HARAKA) {
        // permit testing outside of Haraka
        outbound = this.haraka_require('outbound');
    }

    if (plugin.cfg.main.check_outbound) {
        plugin.register_hook('mail', 'check_mail_from');
    }
};

exports.load_qmd_ini = function () {
    const plugin = this;
    plugin.cfg = plugin.config.get('qmail-deliverable.ini', function () {
        plugin.load_qmd_ini();
    });
};

exports.check_mail_from = function (next, connection, params) {
    const plugin = this;

    if (!plugin.cfg.main.check_outbound) return next();

    // determine if MAIL FROM domain is local
    const txn = connection.transaction;

    const email = params[0].address();
    if (!email) {
        // likely an IP with relaying permission
        txn.results.add(plugin, {skip: 'mail_from.null', emit: true});
        return next();
    }

    const domain = params[0].host.toLowerCase();

    plugin.get_qmd_response(connection, domain, email, function (err, qmd_r) {
        if (err) {
            txn.results.add(plugin, {err: err});
            return next(DENYSOFT, err);
        }

        // the MAIL FROM sender is verified as a local address
        if (qmd_r[0] === OK) {
            txn.results.add(plugin, {pass: "mail_from." + qmd_r[1]});
            txn.notes.local_sender=true;
            return next();
        }

        if (qmd_r[0] === undefined) {
            txn.results.add(plugin, {err: "mail_from." + qmd_r[1]});
            return next();
        }

        txn.results.add(plugin, {msg: "mail_from." + qmd_r[1]});
        return next(CONT, "mail_from." + qmd_r[1]);
    });
};

exports.get_next_hop = function (dom_cfg, queue_wanted) {

    if (dom_cfg.next_hop) return dom_cfg.next_hop;

    switch (queue_wanted) {
        case 'lmtp':
            return ('lmtp://' + dom_cfg.host);
        default:
            return ('smtp://' + dom_cfg.host);
    }
}

exports.set_queue = function (connection, queue_wanted, domain) {
    const plugin = this;

    let dom_cfg = plugin.cfg[domain];
    if (dom_cfg === undefined) dom_cfg = plugin.cfg.main;

    if (!queue_wanted) queue_wanted = dom_cfg.queue;
    if (!queue_wanted) return true;

    const txn = connection.transaction;
    const next_hop = plugin.get_next_hop(dom_cfg, queue_wanted);

    if (!txn.notes.get('queue.wants')) {
        txn.notes.set('queue.wants', queue_wanted);
        txn.notes.set('queue.next_hop', next_hop);
        return true;
    }

    // multiple recipients with same destination
    if (txn.notes.get('queue.wants') === queue_wanted &&
        txn.notes.get('queue.next_hop') === next_hop) {
        return true;
    }

    // multiple recipients with different forward host, soft deny
    return false;
}

exports.hook_rcpt = function (next, connection, params) {
    const plugin = this;
    const txn = connection.transaction;

    const rcpt = params[0];
    const domain = rcpt.host.toLowerCase();
    let dom_cfg = plugin.cfg[domain];
    if (dom_cfg === undefined) dom_cfg = plugin.cfg.main;

    // Qmail::Deliverable::Client does a rfc2822 "atext" test
    // but Haraka has already validated for us by this point
    plugin.get_qmd_response(connection, domain, rcpt.address(), function (err, qmd_r) {
        if (err) {
            txn.results.add(plugin, {err: err});
            return next(DENYSOFT, "error validating email address");
        }

        const [r_code, dst_type] = qmd_r;

        // a client with relaying privileges is sending from a local domain.
        // Any RCPT is acceptable.
        if (connection.relaying && txn.notes.local_sender) {
            txn.results.add(plugin, {pass: "relaying local_sender"});
            plugin.set_queue(connection, 'outbound');
            const q = txn.notes.get('queue.wants');
            if (q) connection.loginfo(`queue: ${q}`);
            return next(OK);
        }

        if (r_code === OK) {
            txn.results.add(plugin, {pass: "rcpt." + dst_type, emit: true });
            let queue = dom_cfg.queue;
            if (dst_type === 'vpopmail dir' && dom_cfg.next_hop) {
                if (/^lmtp/.test(dom_cfg.next_hop)) queue = 'lmtp';
            }
            if (plugin.set_queue(connection, queue, domain)) {
                return next(OK);
            }
            return next(DENYSOFT, "Split transaction, retry soon");
        }

        if (r_code === undefined) {
            txn.results.add(plugin, {err: "rcpt." + dst_type});
            return next();
        }

        // no need to DENY[SOFT] for invalid addresses. If no rcpt_to.* plugin
        // returns OK, then the address is not accepted.
        txn.results.add(plugin, {msg: "rcpt." + dst_type});
        return next(CONT, dst_type);
    });
};

exports.get_qmd_response = function (connection, domain, email, cb) {
    const plugin = this;

    let cfg = plugin.cfg[domain];
    if (cfg === undefined) cfg = plugin.cfg.main;

    const options = {
        method: 'get',
        host: cfg.host || '127.0.0.1',
        port: cfg.port || 8998,
    };

    // redundant
    // connection.transaction.results.add(plugin, {
    //     msg: "sock: " + options.host + ':' + options.port
    // });

    connection.logdebug(plugin, "checking " + email);
    options.path = '/qd1/deliverable?' + querystring.escape(email);
    // connection.logdebug(plugin, 'PATH: ' + options.path);
    http.get(options, function (res) {
        connection.logprotocol(plugin, 'STATUS: ' + res.statusCode);
        connection.logprotocol(plugin, 'HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            connection.logprotocol(plugin, 'BODY: ' + chunk);
            const hexnum = new Number(chunk).toString(16);
            const arr = plugin.check_qmd_response(connection, hexnum);
            connection.loginfo(plugin, arr[1]);
            cb(undefined, arr);

        });
    }).on('error', (err) => {
        return cb(err);
    });
};

exports.check_qmd_response = function (connection, hexnum) {
    const plugin = this;
    connection.logprotocol(plugin,"HEXRV: " + hexnum );

    switch (hexnum) {
        case '11':
            return [ DENYSOFT, "permission failure" ];
        case '12':
            return [ OK, "qmail-command in dot-qmail"];
        case '13':
            return [ OK, "bouncesaying with program"];
        case '14': {
            const from = connection.transaction.mail_from.address();
            if ( ! from || from === '<>') {
                return [ DENY, "mailing lists do not accept null senders" ];
            }
            return [ OK, "ezmlm list" ];
        }
        case '21':
            return [ DENYSOFT, "Temporarily undeliverable: group/world writable" ];
        case '22':
            return [ DENYSOFT, "Temporarily undeliverable: sticky home directory" ];
        case '2f':
            return [ DENYSOFT, "error communicating with qmail-deliverabled." ];
        case 'f1':
            return [ OK, "normal delivery" ];
        case 'f2':
            return [ OK, "vpopmail dir" ];
        case 'f3':
            return [ OK, "vpopmail alias" ];
        case 'f4':
            return [ OK, "vpopmail catchall" ];
        case 'f5':
            return [ OK, "vpopmail vuser" ];
        case 'f6':
            return [ OK, "vpopmail qmail-ext" ];
        case 'fe':
            return [ DENYSOFT, "SHOULD NOT HAPPEN" ];
        case 'ff':
            return [ DENY, "not local" ];
        case '0':
            return [ DENY, "not deliverable" ];
        default:
            return [ undefined, "unknown rv(" + hexnum + ")" ];
    }
};

exports.hook_queue = function (next, connection) {

    const wants = connection.transaction.notes.get('queue.wants');
    if (wants && wants !== 'lmtp') return next();

    this.logdebug('QMD routing to outbound');
    outbound.send_email(connection.transaction, next);
}

exports.hook_get_mx = function (next, hmail, domain) {
    const plugin = this;

    if (hmail.todo.notes.get('queue.wants') !== 'lmtp') return next();

    let cfg = plugin.cfg[domain.toLowerCase()];
    if (cfg === undefined) cfg = plugin.cfg.main;

    const mx = {
        using_lmtp: true,
        priority: 0,
        port: 24,
        exchange: cfg.host,
    };

    if (cfg.next_hop) {
        const dest = url.parse(cfg.next_hop);
        if (dest.hostname) mx.exchange = dest.hostname;
        if (dest.port) mx.port = dest.port;
        if (dest.auth) {
            mx.auth_type = 'plain';
            mx.auth_user = dest.auth.split(':')[0];
            mx.auth_pass = dest.auth.split(':')[1];
        }
    }

    plugin.logdebug(mx);
    return next(OK, mx);
};
