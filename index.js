// validate an email address is local, using qmail-deliverabled

const http = require('http')
const querystring = require('querystring')
const url = require('url')

let outbound

exports.register = function () {
  this.load_qmd_ini()

  if (process.env.HARAKA) {
    // permit testing outside of Haraka
    outbound = this.haraka_require('outbound')
  }

  if (this.cfg.main.check_mail_from) {
    this.register_hook('mail', 'check_mail_from')
  }
}

exports.load_qmd_ini = function () {
  this.cfg = this.config.get(
    'qmail-deliverable.ini',
    {
      booleans: ['+main.check_mail_from', '*.check_mail_from'],
    },
    () => {
      this.load_qmd_ini()
    },
  )
}

exports.check_mail_from = function (next, connection, params) {
  if (!this.cfg.main.check_mail_from) return next()

  // determine if MAIL FROM domain is local
  const txn = connection.transaction

  const email = params[0].address()
  if (!email) {
    // likely an IP with relaying permission
    txn.results.add(this, { skip: 'mail_from.null', emit: true })
    return next()
  }

  const domain = params[0].host.toLowerCase()

  this.get_qmd_response(connection, params[0], (err, qmd_r) => {
    if (err) {
      txn.results.add(this, { err })
      return next(DENYSOFT, err)
    }

    // the MAIL FROM sender is verified as a local address
    if (qmd_r[0] === OK) {
      txn.results.add(this, { pass: `mail_from.${qmd_r[1]}` })
      txn.notes.local_sender = domain
      return next()
    }

    if (qmd_r[0] === undefined) {
      txn.results.add(this, { err: `mail_from.${qmd_r[1]}` })
      return next()
    }

    txn.results.add(this, { msg: `mail_from.${qmd_r[1]}` })
    next(CONT, `mail_from.${qmd_r[1]}`)
  })
}

function do_relaying(plugin, txn, next) {
  // any RCPT is acceptable for txns with relaying privileges
  // this is called in several places where errors or non-local rcpt would
  // otherwise not be allowed
  txn.results.add(plugin, {
    pass: `relaying${txn.notes.local_sender ? ' local sender' : ''}`,
  })
  txn.notes.set('queue.wants', 'outbound')
  next(OK)
}

exports.hook_rcpt = function (next, connection, params) {
  const txn = connection.transaction

  const rcpt = params[0]

  // Qmail::Deliverable::Client does a rfc2822 "atext" test
  // but Haraka has already validated for us
  this.get_qmd_response(connection, rcpt, (err, qmd_res) => {
    if (err) {
      if (connection.relaying) return do_relaying(this, txn, next)
      txn.results.add(this, { err })
      return next(DENYSOFT, 'error validating email address')
    }
    this.do_qmd_response(qmd_res, connection, rcpt, next)
  })
}

exports.do_qmd_response = function (qmd_res, connection, rcpt, next) {
  const txn = connection.transaction

  const [r_code, dst_type] = qmd_res

  if (r_code === undefined) {
    if (connection.relaying) return do_relaying(this, txn, next)
    txn.results.add(this, { err: `rcpt.${dst_type}` })
    return next()
  }

  if (r_code !== OK) {
    if (connection.relaying) return do_relaying(this, txn, next)
    // no need to DENY[SOFT] for invalid addresses. If no rcpt_to.* plugin
    // returns OK, then the address is not accepted.
    txn.results.add(this, { msg: `rcpt.${dst_type}` })
    return next(CONT, dst_type)
  }

  const domain = rcpt.host.toLowerCase()
  const dom_cfg = this.cfg[domain] || this.cfg.main

  txn.notes.local_recipient = domain
  txn.results.add(this, { pass: `rcpt.${dst_type}` })

  let queue = this.get_queue(domain)
  let next_hop = this.get_next_hop(domain, queue)

  if (dst_type === 'vpopmail dir' && next_hop) {
    if (/^lmtp/.test(next_hop)) queue = 'lmtp'
    next_hop = this.get_next_hop(domain, queue)
  }

  if (this.is_split(txn, queue, next_hop)) {
    if (dom_cfg?.split === 'defer') {
      if (connection.relaying) return do_relaying(this, txn, next)
      return next(DENYSOFT, 'Split transaction, retry soon')
    }
    txn.results.add(this, { msg: `split queue.wants=outbound`, emit: true })
    txn.notes.set('queue.wants', 'outbound')
    delete txn.notes?.queue?.next_hop
  } else {
    if (!txn.notes.get('queue.wants')) {
      txn.results.add(this, {
        msg: `queue.wants=${queue}, next_hop=${next_hop}`,
        emit: true,
      })
      txn.notes.set('queue.wants', queue)
      txn.notes.set('queue.next_hop', next_hop)
    }
  }

  next(OK)
}

exports.is_split = function (txn, queue, next_hop) {
  if (txn.rcpt_to.length > 1) {
    const qw = txn.notes.get('queue.wants')
    if (qw && qw !== queue) return true

    const qnh = txn.notes.get('queue.next_hop')
    if (qnh && qnh !== next_hop) return true
  }

  return false // identical destinations
}

exports.get_next_hop = function (domain, queue) {
  const hop = this.cfg[domain]?.next_hop || this.cfg.main.next_hop
  if (hop) return hop
  return `${queue === 'lmtp' ? 'lmtp' : 'smtp'}://${this.get_host(domain)}`
}

exports.get_queue = function (domain) {
  // lmtp, outbound, smtp_forward, qmail-queue
  return this.cfg[domain]?.queue || this.cfg.main.queue
}

exports.get_host = function (domain) {
  return this.cfg[domain]?.host || this.cfg.main.host || '127.0.0.1'
}

exports.get_port = function (domain) {
  return this.cfg[domain]?.port || this.cfg.main.port || 8998
}

exports.get_qmd_response = function (connection, addr, cb) {
  const plugin = this

  const domain = addr.host.toLowerCase()
  const email = addr.address()

  const options = {
    method: 'get',
    host: plugin.get_host(domain),
    port: plugin.get_port(domain),
  }

  connection.logdebug(plugin, `checking ${email}`)
  options.path = `/qd1/deliverable?${querystring.escape(email)}`
  // connection.logdebug(plugin, 'PATH: ' + options.path);
  http
    .get(options, function (res) {
      connection.logprotocol(plugin, `STATUS: ${res.statusCode}`)
      connection.logprotocol(plugin, `HEADERS: ${JSON.stringify(res.headers)}`)
      res.setEncoding('utf8')
      res.on('data', function (chunk) {
        connection.logprotocol(plugin, `BODY: ${chunk}`)
        const hexnum = new Number(chunk).toString(16)
        const arr = plugin.decode_qmd_response(connection, hexnum)
        connection.logdebug(plugin, arr[1])
        cb(undefined, arr)
      })
    })
    .on('error', cb)
}

exports.decode_qmd_response = function (connection, hexnum) {
  connection.logprotocol(this, `HEXRV: ${hexnum}`)

  switch (hexnum) {
    case '11':
      return [DENYSOFT, 'permission failure']
    case '12':
      return [OK, 'qmail-command in dot-qmail']
    case '13':
      return [OK, 'bouncesaying with program']
    case '14': {
      const from = connection.transaction.mail_from.address()
      if (!from || from === '<>') {
        return [DENY, 'mailing lists do not accept null senders']
      }
      return [OK, 'ezmlm list']
    }
    case '21':
      return [DENYSOFT, 'Temporarily undeliverable: group/world writable']
    case '22':
      return [DENYSOFT, 'Temporarily undeliverable: sticky home directory']
    case '2f':
      return [DENYSOFT, 'error communicating with qmail-deliverabled.']
    case 'f1':
      return [OK, 'normal delivery']
    case 'f2':
      return [OK, 'vpopmail dir']
    case 'f3':
      return [OK, 'vpopmail alias']
    case 'f4':
      return [OK, 'vpopmail catchall']
    case 'f5':
      return [OK, 'vpopmail vuser']
    case 'f6':
      return [OK, 'vpopmail qmail-ext']
    case 'fe':
      return [DENYSOFT, 'SHOULD NOT HAPPEN']
    case 'ff':
      return [DENY, 'not local']
    case '0':
      return [DENY, 'not deliverable']
    default:
      return [undefined, `unknown rv(${hexnum})`]
  }
}

exports.hook_queue = function (next, connection) {
  const qw = connection.transaction.notes.get('queue.wants')
  switch (qw) {
    case 'lmtp':
    case 'outbound':
      this.logdebug(`routing to outbound: queue.wants=${qw}`)
      outbound.send_email(connection.transaction, next)
      break
    default:
      next() // do nothing
  }
}

exports.hook_get_mx = function (next, hmail, domain) {
  if (hmail.todo.notes.get('queue.wants') !== 'lmtp') return next()

  const mx = {
    using_lmtp: true,
    priority: 0,
    port: 24,
    exchange: this.get_host(domain.toLowerCase()),
  }

  const nh = hmail.todo.notes.get('queue.next_hop')
  if (nh) {
    const dest = new url.URL(nh)
    if (dest.hostname) mx.exchange = dest.hostname
    if (dest.port) mx.port = dest.port
    if (dest.auth) {
      mx.auth_type = 'plain'
      mx.auth_user = dest.auth.split(':')[0]
      mx.auth_pass = dest.auth.split(':')[1]
    }
  }

  this.logdebug(mx)
  next(OK, mx)
}
