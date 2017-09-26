'use strict';

const Address      = require('address-rfc2821');
const fixtures     = require('haraka-test-fixtures');

const _set_up = function (done) {

    this.plugin = new fixtures.plugin('qmail-deliverable');
    this.connection = new fixtures.connection.createConnection();

    done();
};

const _set_up_cfg = function (done) {

    this.plugin = new fixtures.plugin('qmail-deliverable');
    this.connection = new fixtures.connection.createConnection();
    this.connection.transaction = new fixtures.transaction.createTransaction();
    // this.connection.transaction.queue = {};
    this.plugin.register();

    done();
};

exports.load_qmd_ini = {
    setUp : _set_up,
    'loads config' : function (test) {
        test.expect(1);
        this.plugin.load_qmd_ini();
        test.ok(this.plugin.cfg.main.check_outbound);
        test.done();
    }
}

exports.register = {
    setUp : _set_up,
    'loads the config' : function (test) {
        test.expect(1);
        this.plugin.register();
        test.ok(this.plugin.cfg.main.check_outbound);
        test.done();
    },
    'registers the mail hook' : function (test) {
        test.expect(1);
        this.plugin.register();
        test.equal(this.plugin.register_hook.args[0], 'mail');
        // console.log(this.plugin);
        test.done();
    }

}

exports.get_next_hop = {
    setUp : _set_up_cfg,
    'wants_queue=empty sets smtp://' : function (test) {
        test.expect(1);
        const testConfig = {
            host: '1.2.3.5',
        }
        test.equal(
            this.plugin.get_next_hop(testConfig),
            'smtp://1.2.3.5'
        );
        test.done();
    },
    'wants_queue=lmtp sets lmtp://' : function (test) {
        test.expect(1);
        const testConfig = {
            host: '1.2.3.5',
        }
        test.equal(
            this.plugin.get_next_hop(testConfig, 'lmtp'),
            'lmtp://1.2.3.5'
        );
        test.done();
    },
}

exports.set_queue = {
    setUp : _set_up_cfg,
    'wants_queue=empty sets none' : function (test) {
        test.expect(3);
        this.plugin.cfg = {
            'example.com': { host: '1.2.3.4' },
        }
        test.equal(
            this.plugin.set_queue(this.connection, undefined, 'example.com'),
            true
        );
        test.equal(this.connection.transaction.notes.get('queue.wants'), undefined);
        test.equal(this.connection.transaction.notes.get('queue.next_hop'), undefined);
        test.done();
    },
    'wants_queue=smtp_forward sets txn.notes.queue.wants & queue.next_hop': function (test) {
        test.expect(3);
        this.plugin.cfg = {
            'example.com': { host: '1.2.3.4' },
        }
        test.equal(
            this.plugin.set_queue(this.connection, 'smtp_forward', 'example.com'),
            true
        );
        test.equal(this.connection.transaction.notes.get('queue.wants'), 'smtp_forward');
        test.equal(this.connection.transaction.notes.get('queue.next_hop'), 'smtp://1.2.3.4');
        test.done();
    },
    'wants_queue=lmtp sets txn.queue.wants & queue.next_hop': function (test) {
        test.expect(3);
        this.plugin.cfg = {
            'example.com': { host: '1.2.3.5' },
        }
        test.equal(
            this.plugin.set_queue(this.connection, 'lmtp', 'example.com'),
            true
        );
        test.equal(this.connection.transaction.notes.get('queue.wants'), 'lmtp');
        test.equal(this.connection.transaction.notes.get('queue.next_hop'), 'lmtp://1.2.3.5');
        test.done();
    }
}

exports.get_qmd_response = {
    setUp : _set_up,
    'stub' : function (test) {
        test.expect(0);
        // can't really test this very well without a QMD server
        test.done();
    },
}

exports.check_qmd_response = {
    setUp : _set_up,
    '11' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, '11');
        test.equal(DENYSOFT, r[0]);
        test.done();
    },
    '12' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, '12');
        test.equal(OK, r[0]);
        test.done();
    },
    '13' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, '13');
        test.equal(OK, r[0]);
        test.done();
    },
    '14' : function (test) {
        test.expect(2);
        this.connection.transaction = {
            mail_from: new Address.Address('<matt@example.com>'),
        };
        let r = this.plugin.check_qmd_response(this.connection, '14');
        test.equal(OK, r[0]);

        this.connection.transaction.mail_from = new Address.Address('<>');
        r = this.plugin.check_qmd_response(this.connection, '14');
        test.equal(DENY, r[0]);
        test.done();
    },
    '21' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, '21');
        test.equal(DENYSOFT, r[0]);
        test.done();
    },
    '22' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, '22');
        test.equal(DENYSOFT, r[0]);
        test.done();
    },
    '2f' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, '2f');
        test.equal(DENYSOFT, r[0]);
        test.done();
    },
    'f1' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, 'f1');
        test.equal(OK, r[0]);
        test.done();
    },
    'f2' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, 'f2');
        test.equal(OK, r[0]);
        test.done();
    },
    'f3' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, 'f3');
        test.equal(OK, r[0]);
        test.done();
    },
    'f4' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, 'f4');
        test.equal(OK, r[0]);
        test.done();
    },
    'f5' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, 'f5');
        test.equal(OK, r[0]);
        test.done();
    },
    'f6' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, 'f6');
        test.equal(OK, r[0]);
        test.done();
    },
    'fe' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, 'fe');
        test.equal(DENYSOFT, r[0]);
        test.done();
    },
    'ff' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, 'ff');
        test.equal(DENY, r[0]);
        test.done();
    },
    '0' : function (test) {
        test.expect(2);
        const r = this.plugin.check_qmd_response(this.connection, '0');
        test.equal(DENY, r[0]);
        test.equal('not deliverable', r[1]);
        test.done();
    },
    'blah' : function (test) {
        test.expect(1);
        const r = this.plugin.check_qmd_response(this.connection, 'blah');
        test.equal(undefined, r[0]);
        test.done();
    },
}
