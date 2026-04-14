const assert = require('node:assert')
const { afterEach, beforeEach, describe, it } = require('node:test')

const Address = require('address-rfc2821').Address
const fixtures = require('haraka-test-fixtures')

const smtp_ini = { main: {}, headers: {} }

function _set_up() {
  this.plugin = new fixtures.plugin('qmail-deliverable')
  this.connection = new fixtures.connection.createConnection()
  this.connection.init_transaction()
}

function _set_up_cfg() {
  this.plugin = new fixtures.plugin('qmail-deliverable')
  this.connection = new fixtures.connection.createConnection()
  this.connection.init_transaction()

  this.plugin.register()
}

function _set_up_no_txn() {
  this.plugin = new fixtures.plugin('qmail-deliverable')
  this.connection = new fixtures.connection.createConnection()
  // intentionally no init_transaction() — simulates a remote disconnect
}

function _set_up_cfg_no_txn() {
  this.plugin = new fixtures.plugin('qmail-deliverable')
  this.connection = new fixtures.connection.createConnection()
  // intentionally no init_transaction() — simulates a remote disconnect
  this.plugin.register()
}

describe('load_qmd_ini', function () {
  beforeEach(_set_up)

  it('loads config', function () {
    this.plugin.load_qmd_ini()
    assert.ok(this.plugin.cfg.main.check_mail_from)
  })
})

describe('register', function () {
  beforeEach(_set_up)

  it('loads the config', function () {
    this.plugin.register()
    assert.ok(this.plugin.cfg.main.check_mail_from)
  })

  it('registers the mail hook', function () {
    this.plugin.register()
    assert.equal(this.plugin.hooks.mail, 'check_mail_from')
  })
})

describe('get_host', function () {
  beforeEach(_set_up)

  it('gets default host', function () {
    this.plugin.cfg = { main: { host: undefined } }
    assert.equal(this.plugin.get_host('example.com'), '127.0.0.1')
  })

  it('gets main host', function () {
    this.plugin.cfg = { main: { host: '127.1.1.1' } }
    assert.equal(this.plugin.get_host('example.com'), '127.1.1.1')
  })

  it('gets per-domain host', function () {
    this.plugin.cfg = {
      main: { host: '127.1.1.1' },
      'example.com': { host: '127.2.2.2' },
    }
    assert.equal(this.plugin.get_host('example.com'), '127.2.2.2')
  })
})

describe('get_next_hop', function () {
  beforeEach(_set_up)

  it('prefers explicit per-domain next_hop', function () {
    this.plugin.cfg = {
      main: { host: '127.0.0.1', next_hop: 'smtp://main-hop' },
      'example.com': { next_hop: 'lmtp://domain-hop' },
    }
    assert.equal(this.plugin.get_next_hop('example.com', 'smtp_forward'), 'lmtp://domain-hop')
  })

  it('falls back to lmtp host URI when queue is lmtp', function () {
    this.plugin.cfg = {
      main: { host: '127.9.9.9' },
    }
    assert.equal(this.plugin.get_next_hop('example.com', 'lmtp'), 'lmtp://127.9.9.9')
  })
})

describe('get_queue', function () {
  beforeEach(_set_up)

  it('gets main queue', function () {
    this.plugin.cfg = { main: { queue: 'outbound' } }
    assert.equal(this.plugin.get_queue('example.com'), 'outbound')
  })

  it('gets per-domain queue', function () {
    this.plugin.cfg = {
      main: { queue: 'outbound' },
      'example.com': { queue: 'lmtp' },
    }
    assert.equal(this.plugin.get_queue('example.com'), 'lmtp')
  })
})

describe('get_port', function () {
  beforeEach(_set_up)

  it('gets default port', function () {
    this.plugin.cfg = { main: { port: undefined } }
    assert.equal(this.plugin.get_port('example.com'), 8998)
  })

  it('gets per-domain port', function () {
    this.plugin.cfg = {
      main: { port: 8998 },
      'example.com': { port: 19000 },
    }
    assert.equal(this.plugin.get_port('example.com'), 19000)
  })
})

describe('do_qmd_response', function () {
  beforeEach(_set_up_cfg)
  const rcpt = new Address('<user@example.com>')

  it('queue=undefined, dir', async function () {
    this.plugin.cfg = {
      main: { host: '1.2.3.4' },
    }
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail dir'], this.connection, rcpt, () => {
        assert.equal(this.connection.transaction.notes.get('queue.wants'), undefined)
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'smtp://1.2.3.4')
        resolve()
      })
    })
  })

  it('queue=undefined, alias', async function () {
    this.plugin.cfg = {
      main: { host: '1.2.3.4' },
    }
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail alias'], this.connection, rcpt, () => {
        assert.equal(this.connection.transaction.notes.get('queue.wants'), undefined)
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'smtp://1.2.3.4')
        resolve()
      })
    })
  })

  it('example.com: queue=undefined, dir', async function () {
    this.plugin.cfg['example.com'] = { host: '1.2.3.4' }
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail dir'], this.connection, rcpt, () => {
        assert.equal(this.connection.transaction.notes.get('queue.wants'), undefined)
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'smtp://1.2.3.4')
        resolve()
      })
    })
  })

  it('example.com: queue=undefined, forward', async function () {
    this.plugin.cfg['example.com'] = { host: '1.2.3.4' }
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail forward'], this.connection, rcpt, () => {
        assert.equal(this.connection.transaction.notes.get('queue.wants'), undefined)
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'smtp://1.2.3.4')
        resolve()
      })
    })
  })

  it('example.com: queue=smtp_forward', async function () {
    this.plugin.cfg['example.com'] = { host: '1.2.3.4', queue: 'smtp_forward' }
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail dir'], this.connection, rcpt, () => {
        assert.equal(this.connection.transaction.notes.get('queue.wants'), 'smtp_forward')
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'smtp://1.2.3.4')
        resolve()
      })
    })
  })

  it('example.com: next_hop=lmtp sets LMTP', async function () {
    this.plugin.cfg.main.queue = 'smtp_forward'
    this.plugin.cfg['example.com'] = {
      host: '1.2.3.4',
      next_hop: 'lmtp://5.6.7.8',
    }
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail dir'], this.connection, rcpt, () => {
        assert.equal(this.connection.transaction.notes.get('queue.wants'), 'lmtp')
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'lmtp://5.6.7.8')
        resolve()
      })
    })
  })

  it('example.com: next_hop=lmtp + alias = smtp_forward', async function () {
    this.plugin.cfg.main.queue = 'smtp_forward'
    this.plugin.cfg['example.com'] = {
      host: '1.2.3.4',
      next_hop: 'lmtp://5.6.7.8',
    }
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail alias'], this.connection, rcpt, () => {
        assert.equal(this.connection.transaction.notes.get('queue.wants'), 'smtp_forward')
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'lmtp://5.6.7.8')
        resolve()
      })
    })
  })

  it('example.com: queue=smtp_forward sets queue.wants & queue.next_hop', async function () {
    this.plugin.cfg['example.com'] = { host: '1.2.3.4', queue: 'smtp_forward' }
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail dir'], this.connection, rcpt, () => {
        assert.equal(this.connection.transaction.notes.get('queue.wants'), 'smtp_forward')
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'smtp://1.2.3.4')
        resolve()
      })
    })
  })

  it('example.com: queue=lmtp sets queue.wants & queue.next_hop', async function () {
    this.plugin.cfg['example.com'] = { host: '1.2.3.5', queue: 'lmtp' }
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail dir'], this.connection, rcpt, () => {
        assert.equal(this.connection.transaction.notes.get('queue.wants'), 'lmtp')
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'lmtp://1.2.3.5')
        resolve()
      })
    })
  })

  it('example.com: split txn, 1st recipient', async function () {
    this.plugin.cfg['example.com'] = { host: '1.2.3.5', queue: 'lmtp' }
    this.connection.transaction.rcpt_to.push(new Address('matt@other-domain.com'))

    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail dir'], this.connection, rcpt, () => {
        assert.equal(this.connection.transaction.notes.get('queue.wants'), 'lmtp')
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'lmtp://1.2.3.5')
        resolve()
      })
    })
  })

  it('example.com: split txn, different next_hop', async function () {
    this.plugin.cfg['example.com'] = { host: '1.2.3.5', queue: 'lmtp' }
    this.connection.transaction.rcpt_to.push(rcpt, new Address('matt@other-domain.com'))
    this.connection.transaction.notes.set('queue.next_hop', 'smtp://2.3.4.5')

    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail dir'], this.connection, rcpt, () => {
        assert.equal(this.connection.transaction.notes.get('queue.wants'), 'outbound')
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), undefined)
        resolve()
      })
    })
  })

  it('returns next() when qmd response code is undefined and not relaying', async function () {
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([undefined, 'unknown'], this.connection, rcpt, (code, msg) => {
        assert.equal(code, undefined)
        assert.equal(msg, undefined)
        resolve()
      })
    })
  })

  it('returns CONT when qmd response is non-OK and not relaying', async function () {
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([DENY, 'not local'], this.connection, rcpt, (code, msg) => {
        assert.equal(code, CONT)
        assert.equal(msg, 'not local')
        resolve()
      })
    })
  })

  it('returns DENYSOFT on split defer policy', async function () {
    this.plugin.cfg['example.com'] = {
      host: '1.2.3.5',
      queue: 'lmtp',
      split: 'defer',
    }
    this.connection.transaction.rcpt_to.push(rcpt, new Address('matt@other-domain.com'))
    this.connection.transaction.notes.set('queue.next_hop', 'smtp://2.3.4.5')

    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail dir'], this.connection, rcpt, (code, msg) => {
        assert.equal(code, DENYSOFT)
        assert.equal(msg, 'Split transaction, retry soon')
        resolve()
      })
    })
  })
})

describe('get_qmd_response', function () {
  beforeEach(function () {
    _set_up.call(this)
    this.plugin.cfg = { main: {} }
    this.plugin.originalFetch = this.plugin.fetch
  })

  afterEach(function () {
    this.plugin.fetch = this.plugin.originalFetch
  })

  it('resolves a decoded response', async function () {
    this.plugin.fetch = async (resource, options) => {
      assert.equal(resource, 'http://127.0.0.1:8998/qd1/deliverable?user%40example.com')
      assert.equal(options.method, 'GET')
      assert.equal(options.headers?.Connection, 'close')

      return {
        ok: true,
        status: 200,
        headers: {
          entries() {
            return [['content-type', 'text/plain']]
          },
        },
        text: async () => '241',
      }
    }

    const result = await this.plugin.get_qmd_response(
      this.connection,
      new Address('<user@example.com>'),
    )

    assert.deepEqual(result, [OK, 'normal delivery'])
  })

  it('rejects on fetch error', async function () {
    this.plugin.fetch = async () => {
      throw new Error('connect failed')
    }

    const res = await this.plugin.get_qmd_response(
      this.connection,
      new Address('<user@example.com>'),
    )
    assert.equal(res, undefined)
  })

  it('passes AbortSignal.timeout to fetch using configured timeout', async function () {
    this.plugin.cfg = { main: { timeout: 10 } }

    let capturedSignal
    this.plugin.fetch = async (resource, options) => {
      capturedSignal = options.signal
      return {
        ok: true,
        status: 200,
        headers: {
          entries() {
            return []
          },
        },
        text: async () => '241',
      }
    }

    await this.plugin.get_qmd_response(this.connection, new Address('<user@example.com>'))
    assert.ok(capturedSignal instanceof AbortSignal)
  })

  it('returns undefined on timeout (AbortError)', async function () {
    this.plugin.fetch = async () => {
      const err = new DOMException('The operation was aborted', 'AbortError')
      throw err
    }

    const res = await this.plugin.get_qmd_response(
      this.connection,
      new Address('<user@example.com>'),
    )
    assert.equal(res, undefined)
  })
})

describe('check_mail_from', function () {
  beforeEach(_set_up_cfg)

  it('skips when check_mail_from is disabled', async function () {
    this.plugin.cfg.main.check_mail_from = false

    let called = false
    this.plugin.get_qmd_response = async () => {
      called = true
      return [OK, 'normal delivery']
    }

    let nextCode
    await this.plugin.check_mail_from(
      (code) => {
        nextCode = code
      },
      this.connection,
      [new Address('<user@example.com>')],
    )

    assert.equal(called, false)
    assert.equal(nextCode, undefined)
  })

  it('accepts and marks local sender when qmd returns OK', async function () {
    this.plugin.get_qmd_response = async () => [OK, 'normal delivery']

    let nextCode
    await this.plugin.check_mail_from(
      (code) => {
        nextCode = code
      },
      this.connection,
      [new Address('<user@example.com>')],
    )

    assert.equal(nextCode, undefined)
    assert.equal(this.connection.transaction.notes.local_sender, 'example.com')
  })

  it('calls next() without DENY when qmd is unavailable (returns undefined)', async function () {
    this.plugin.get_qmd_response = async () => undefined

    let nextCode
    await this.plugin.check_mail_from(
      (code) => {
        nextCode = code
      },
      this.connection,
      [new Address('<user@example.com>')],
    )

    assert.equal(nextCode, undefined)
  })
})

describe('hook_rcpt', function () {
  beforeEach(_set_up_cfg)

  it('passes qmd response to do_qmd_response', async function () {
    const rcpt = new Address('<user@example.com>')
    this.plugin.get_qmd_response = async () => [OK, 'normal delivery']

    let called = false
    this.plugin.do_qmd_response = (qmd_res, connection, addr, next) => {
      called = true
      assert.deepEqual(qmd_res, [OK, 'normal delivery'])
      assert.equal(addr.address(), rcpt.address())
      next()
    }

    await this.plugin.hook_rcpt(() => {}, this.connection, [rcpt])
    assert.equal(called, true)
  })

  it('returns DENYSOFT when not relaying and qmd lookup fails', async function () {
    this.connection.relaying = false
    this.plugin.get_qmd_response = async () => {
      throw new Error('connect failed')
    }

    let nextCode
    let nextMsg
    await this.plugin.hook_rcpt(
      (code, msg) => {
        nextCode = code
        nextMsg = msg
      },
      this.connection,
      [new Address('<user@example.com>')],
    )

    assert.equal(nextCode, DENYSOFT)
    assert.equal(nextMsg, 'error validating email address')
  })

  it('permits relaying when qmd lookup fails', async function () {
    this.connection.relaying = true
    this.plugin.get_qmd_response = async () => {
      throw new Error('connect failed')
    }

    let nextCode
    await this.plugin.hook_rcpt(
      (code) => {
        nextCode = code
      },
      this.connection,
      [new Address('<user@example.com>')],
    )

    assert.equal(nextCode, OK)
    assert.equal(this.connection.transaction.notes.get('queue.wants'), 'outbound')
  })
})

describe('decode_qmd_response', function () {
  beforeEach(_set_up)

  it('11', function () {
    const r = this.plugin.decode_qmd_response(this.connection, '11')
    assert.equal(DENYSOFT, r[0])
  })
  it('12', function () {
    const r = this.plugin.decode_qmd_response(this.connection, '12')
    assert.equal(OK, r[0])
  })
  it('13', function () {
    const r = this.plugin.decode_qmd_response(this.connection, '13')
    assert.equal(OK, r[0])
  })
  it('14', function () {
    this.connection.transaction = {
      mail_from: new Address('<matt@example.com>'),
    }
    let r = this.plugin.decode_qmd_response(this.connection, '14')
    assert.equal(OK, r[0])

    this.connection.transaction.mail_from = new Address('<>')
    r = this.plugin.decode_qmd_response(this.connection, '14')
    assert.equal(DENY, r[0])
  })
  it('21', function () {
    const r = this.plugin.decode_qmd_response(this.connection, '21')
    assert.equal(DENYSOFT, r[0])
  })
  it('22', function () {
    const r = this.plugin.decode_qmd_response(this.connection, '22')
    assert.equal(DENYSOFT, r[0])
  })
  it('2f', function () {
    const r = this.plugin.decode_qmd_response(this.connection, '2f')
    assert.equal(DENYSOFT, r[0])
  })
  it('f1', function () {
    const r = this.plugin.decode_qmd_response(this.connection, 'f1')
    assert.equal(OK, r[0])
  })
  it('f2', function () {
    const r = this.plugin.decode_qmd_response(this.connection, 'f2')
    assert.equal(OK, r[0])
  })
  it('f3', function () {
    const r = this.plugin.decode_qmd_response(this.connection, 'f3')
    assert.equal(OK, r[0])
  })
  it('f4', function () {
    const r = this.plugin.decode_qmd_response(this.connection, 'f4')
    assert.equal(OK, r[0])
  })
  it('f5', function () {
    const r = this.plugin.decode_qmd_response(this.connection, 'f5')
    assert.equal(OK, r[0])
  })
  it('f6', function () {
    const r = this.plugin.decode_qmd_response(this.connection, 'f6')
    assert.equal(OK, r[0])
  })
  it('fe', function () {
    const r = this.plugin.decode_qmd_response(this.connection, 'fe')
    assert.equal(DENYSOFT, r[0])
  })
  it('ff', function () {
    const r = this.plugin.decode_qmd_response(this.connection, 'ff')
    assert.equal(DENY, r[0])
  })
  it('0', function () {
    const r = this.plugin.decode_qmd_response(this.connection, '0')
    assert.equal(DENY, r[0])
    assert.equal('not deliverable', r[1])
  })
  it('blah', function () {
    const r = this.plugin.decode_qmd_response(this.connection, 'blah')
    assert.equal(undefined, r[0])
  })
})

describe('is_split', function () {
  beforeEach(_set_up_cfg)

  it('returns false for a single recipient', function () {
    this.plugin.cfg['example.com'] = { host: '1.2.3.5', queue: 'lmtp' }
    this.connection.transaction.rcpt_to.push(new Address('<matt@example.com>'))
    assert.equal(this.plugin.is_split(this.connection.transaction, 'lmtp', 'smtp://1.2.3.5'), false)
  })

  it('returns false for two recipients with same next hop', function () {
    this.plugin.cfg['example.com'] = { host: '1.2.3.5', queue: 'lmtp' }
    this.connection.transaction.rcpt_to.push(
      new Address('<1@example.com>'),
      new Address('<2@example.com>'),
    )
    assert.equal(this.plugin.is_split(this.connection.transaction, 'lmtp', 'smtp://1.2.3.5'), false)
  })

  it('returns true for two recipients with different queue.wants', function () {
    this.connection.transaction.notes.set('queue.wants', 'outbound')
    this.connection.transaction.notes.set('queue.next_hop', 'smtp//1.2.3.5')
    this.connection.transaction.rcpt_to.push(
      new Address('<1@example.com>'),
      new Address('<2@test-example.com>'),
    )
    assert.equal(this.plugin.is_split(this.connection.transaction, 'lmtp', 'smtp://1.2.3.5'), true)
  })

  it('returns true for two recipients with different next hops', function () {
    // this.plugin.cfg['example.com'] = { host: '1.2.3.5', queue: 'lmtp' }
    this.connection.transaction.notes.set('queue.wants', 'outbound')
    this.connection.transaction.notes.set('queue.next_hop', 'smtp//1.2.3.5')
    this.connection.transaction.rcpt_to.push(
      new Address('<1@example.com>'),
      new Address('<2@test-example.com>'),
    )
    assert.equal(
      this.plugin.is_split(this.connection.transaction, 'outbound', 'smtp://1.2.3.6'),
      true,
    )
  })
})

describe('hook_get_mx', function () {
  beforeEach(_set_up_cfg)

  it('returns nothing unless queue.wants=lmtp', async function () {
    const hmail = new fixtures.transaction.createTransaction(null, smtp_ini)
    hmail.todo = { notes: hmail.notes }

    await new Promise((resolve) => {
      this.plugin.hook_get_mx(
        (code, msg) => {
          assert.equal(code, undefined)
          assert.equal(msg, undefined)
          resolve()
        },
        hmail,
        'example.com',
      )
    })
  })

  it('returns MX when queue.wants=lmtp', async function () {
    const hmail = new fixtures.transaction.createTransaction(null, smtp_ini)
    hmail.todo = { notes: hmail.notes }
    hmail.todo.notes.set('queue.wants', 'lmtp')

    await new Promise((resolve) => {
      this.plugin.hook_get_mx(
        (code, mx) => {
          assert.equal(code, OK)
          assert.deepEqual(mx, {
            exchange: '127.0.0.1',
            port: 24,
            priority: 0,
            using_lmtp: true,
          })
          resolve()
        },
        hmail,
        'example.com',
      )
    })
  })

  it('MX steered by queue.next_hop', async function () {
    const hmail = new fixtures.transaction.createTransaction(null, smtp_ini)
    hmail.todo = { notes: hmail.notes }
    hmail.todo.notes.set('queue.wants', 'lmtp')
    hmail.todo.notes.set('queue.next_hop', 'lmtp://127.1.1.1:23')

    await new Promise((resolve) => {
      this.plugin.hook_get_mx(
        (code, mx) => {
          assert.equal(code, OK)
          assert.deepEqual(mx, {
            exchange: '127.1.1.1',
            port: 23,
            priority: 0,
            using_lmtp: true,
          })
          resolve()
        },
        hmail,
        'example.com',
      )
    })
  })

  it('MX parses host and port from queue.next_hop with credentials', async function () {
    const hmail = new fixtures.transaction.createTransaction(null, smtp_ini)
    hmail.todo = { notes: hmail.notes }
    hmail.todo.notes.set('queue.wants', 'lmtp')
    hmail.todo.notes.set('queue.next_hop', 'lmtp://user:pass@127.1.1.1:23')

    await new Promise((resolve) => {
      this.plugin.hook_get_mx(
        (code, mx) => {
          assert.equal(code, OK)
          assert.deepEqual(mx, {
            auth_pass: 'pass',
            auth_type: 'plain',
            auth_user: 'user',
            exchange: '127.1.1.1',
            port: '23',
            priority: 0,
            using_lmtp: true,
          })
          resolve()
        },
        hmail,
        'example.com',
      )
    })
  })
})

describe('hook_queue (no transaction)', function () {
  beforeEach(function () {
    _set_up_no_txn.call(this)
    delete process.env.HARAKA
    this.plugin.register()
  })
  afterEach(function () {
    delete process.env.HARAKA
  })

  it('returns next() without crashing when transaction is absent', function () {
    let nextCalled = false
    let nextCode
    this.plugin.hook_queue((code) => {
      nextCalled = true
      nextCode = code
    }, this.connection)
    assert.equal(nextCalled, true)
    assert.equal(nextCode, undefined)
  })
})

describe('hook_queue', function () {
  beforeEach(function () {
    _set_up.call(this)
    delete process.env.HARAKA
    this.plugin.register()
  })
  afterEach(function () {
    delete process.env.HARAKA
  })

  it('does nothing for non-outbound queue values', function () {
    this.connection.transaction.notes.set('queue.wants', 'smtp_forward')

    let nextCalled = false
    this.plugin.hook_queue(() => {
      nextCalled = true
    }, this.connection)

    assert.equal(nextCalled, true)
  })

  it('routes to outbound sender for lmtp queue', function () {
    process.env.HARAKA = '1'
    this.plugin.haraka_require = (mod) => {
      assert.equal(mod, 'outbound')
      return {
        send_trans_email: (txn, next) => {
          assert.equal(txn, this.connection.transaction)
          next(OK)
        },
      }
    }
    this.plugin.register()

    this.connection.transaction.notes.set('queue.wants', 'lmtp')
    let nextCode
    this.plugin.hook_queue((code) => {
      nextCode = code
    }, this.connection)

    assert.equal(nextCode, OK)
  })

  it('returns DENYSOFT when outbound is unavailable', function () {
    this.connection.transaction.notes.set('queue.wants', 'lmtp')

    let nextCode
    let nextMsg
    this.plugin.hook_queue((code, msg) => {
      nextCode = code
      nextMsg = msg
    }, this.connection)

    assert.equal(nextCode, DENYSOFT)
    assert.equal(nextMsg, 'outbound is unavailable')
  })
})

describe('do_qmd_response (no transaction)', function () {
  beforeEach(_set_up_cfg_no_txn)
  const rcpt = new Address('<user@example.com>')

  it('calls next() without crashing when transaction is absent', async function () {
    await new Promise((resolve) => {
      this.plugin.do_qmd_response([OK, 'vpopmail dir'], this.connection, rcpt, (code, msg) => {
        assert.equal(code, undefined)
        assert.equal(msg, undefined)
        resolve()
      })
    })
  })
})

describe('decode_qmd_response (no transaction)', function () {
  beforeEach(_set_up_no_txn)

  it('14: returns DENY for null sender when transaction is absent', function () {
    const r = this.plugin.decode_qmd_response(this.connection, '14')
    assert.equal(r[0], DENY)
    assert.equal(r[1], 'mailing lists do not accept null senders')
  })
})

describe('check_mail_from (no transaction)', function () {
  beforeEach(_set_up_cfg_no_txn)

  it('handles missing transaction gracefully when qmd returns OK', async function () {
    this.plugin.get_qmd_response = async () => [OK, 'normal delivery']

    let nextCode
    await this.plugin.check_mail_from(
      (code) => {
        nextCode = code
      },
      this.connection,
      [new Address('<user@example.com>')],
    )

    assert.equal(nextCode, undefined)
  })

  it('calls next() without DENY when qmd is unavailable', async function () {
    this.plugin.get_qmd_response = async () => undefined

    let nextCode
    await this.plugin.check_mail_from(
      (code) => {
        nextCode = code
      },
      this.connection,
      [new Address('<user@example.com>')],
    )

    assert.equal(nextCode, undefined)
  })
})

describe('hook_rcpt (no transaction)', function () {
  beforeEach(_set_up_cfg_no_txn)

  it('calls next() without crashing when qmd returns OK', async function () {
    this.plugin.get_qmd_response = async () => [OK, 'normal delivery']

    let nextCode
    await this.plugin.hook_rcpt(
      (code) => {
        nextCode = code
      },
      this.connection,
      [new Address('<user@example.com>')],
    )

    // do_qmd_response returns next() with no args when transaction is absent
    assert.equal(nextCode, undefined)
  })

  it('returns DENYSOFT when qmd lookup fails and not relaying', async function () {
    this.connection.relaying = false
    this.plugin.get_qmd_response = async () => {
      throw new Error('connect failed')
    }

    let nextCode
    let nextMsg
    await this.plugin.hook_rcpt(
      (code, msg) => {
        nextCode = code
        nextMsg = msg
      },
      this.connection,
      [new Address('<user@example.com>')],
    )

    assert.equal(nextCode, DENYSOFT)
    assert.equal(nextMsg, 'error validating email address')
  })

  it('calls next() without crashing when relaying and transaction is absent', async function () {
    this.connection.relaying = true
    this.plugin.get_qmd_response = async () => {
      throw new Error('connect failed')
    }

    let nextCalled = false
    let nextCode
    await this.plugin.hook_rcpt(
      (code) => {
        nextCalled = true
        nextCode = code
      },
      this.connection,
      [new Address('<user@example.com>')],
    )

    // do_relaying returns next() with no args when transaction is absent
    assert.equal(nextCalled, true)
    assert.equal(nextCode, undefined)
  })
})
