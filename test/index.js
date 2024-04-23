const assert = require('assert')

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
    assert.equal(this.plugin.register_hook.args[0], 'mail')
    // console.log(this.plugin);
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

describe('do_qmd_response', function () {
  beforeEach(_set_up_cfg)
  const rcpt = new Address('<user@example.com>')

  it('queue=undefined, dir', function (done) {
    this.plugin.cfg = {
      main: { host: '1.2.3.4' },
    }
    this.plugin.do_qmd_response(
      [OK, 'vpopmail dir'],
      this.connection,
      rcpt,
      (code, msg) => {
        assert.equal(
          this.connection.transaction.notes.get('queue.wants'),
          undefined,
        )
        assert.equal(
          this.connection.transaction.notes.get('queue.next_hop'),
          'smtp://1.2.3.4',
        )
        done()
      },
    )
  })

  it('queue=undefined, alias', function (done) {
    this.plugin.cfg = {
      main: { host: '1.2.3.4' },
    }
    this.plugin.do_qmd_response(
      [OK, 'vpopmail alias'],
      this.connection,
      rcpt,
      (code, msg) => {
        assert.equal(
          this.connection.transaction.notes.get('queue.wants'),
          undefined,
        )
        assert.equal(
          this.connection.transaction.notes.get('queue.next_hop'),
          'smtp://1.2.3.4',
        )
        done()
      },
    )
  })

  it('example.com: queue=undefined, dir', function (done) {
    this.plugin.cfg['example.com'] = { host: '1.2.3.4' }
    this.plugin.do_qmd_response(
      [OK, 'vpopmail dir'],
      this.connection,
      rcpt,
      (code, msg) => {
        assert.equal(
          this.connection.transaction.notes.get('queue.wants'),
          undefined,
        )
        assert.equal(
          this.connection.transaction.notes.get('queue.next_hop'),
          'smtp://1.2.3.4',
        )
        done()
      },
    )
  })

  it('example.com: queue=undefined, forward', function (done) {
    this.plugin.cfg['example.com'] = { host: '1.2.3.4' }
    this.plugin.do_qmd_response(
      [OK, 'vpopmail forward'],
      this.connection,
      rcpt,
      (code, msg) => {
        assert.equal(
          this.connection.transaction.notes.get('queue.wants'),
          undefined,
        )
        assert.equal(
          this.connection.transaction.notes.get('queue.next_hop'),
          'smtp://1.2.3.4',
        )
        done()
      },
    )
  })

  it('example.com: queue=smtp_forward', function (done) {
    this.plugin.cfg['example.com'] = { host: '1.2.3.4', queue: 'smtp_forward' }
    this.plugin.do_qmd_response(
      [OK, 'vpopmail dir'],
      this.connection,
      rcpt,
      (code, msg) => {
        assert.equal(
          this.connection.transaction.notes.get('queue.wants'),
          'smtp_forward',
        )
        assert.equal(
          this.connection.transaction.notes.get('queue.next_hop'),
          'smtp://1.2.3.4',
        )
        done()
      },
    )
  })

  it('example.com: next_hop=lmtp sets LMTP', function (done) {
    this.plugin.cfg.main.queue = 'smtp_forward'
    this.plugin.cfg['example.com'] = {
      host: '1.2.3.4',
      next_hop: 'lmtp://5.6.7.8',
    }
    this.plugin.do_qmd_response(
      [OK, 'vpopmail dir'],
      this.connection,
      rcpt,
      (code, msg) => {
        assert.equal(
          this.connection.transaction.notes.get('queue.wants'),
          'lmtp',
        )
        assert.equal(
          this.connection.transaction.notes.get('queue.next_hop'),
          'lmtp://5.6.7.8',
        )
        done()
      },
    )
  })

  it('example.com: next_hop=lmtp + alias = smtp_forward', function (done) {
    this.plugin.cfg.main.queue = 'smtp_forward'
    this.plugin.cfg['example.com'] = {
      host: '1.2.3.4',
      next_hop: 'lmtp://5.6.7.8',
    }
    this.plugin.do_qmd_response(
      [OK, 'vpopmail alias'],
      this.connection,
      rcpt,
      (code, msg) => {
        assert.equal(
          this.connection.transaction.notes.get('queue.wants'),
          'smtp_forward',
        )
        assert.equal(
          this.connection.transaction.notes.get('queue.next_hop'),
          'lmtp://5.6.7.8',
        )
        done()
      },
    )
  })

  it('example.com: queue=smtp_forward sets queue.wants & queue.next_hop', function (done) {
    this.plugin.cfg['example.com'] = { host: '1.2.3.4', queue: 'smtp_forward' }
    this.plugin.do_qmd_response(
      [OK, 'vpopmail dir'],
      this.connection,
      rcpt,
      (code, msg) => {
        assert.equal(
          this.connection.transaction.notes.get('queue.wants'),
          'smtp_forward',
        )
        assert.equal(
          this.connection.transaction.notes.get('queue.next_hop'),
          'smtp://1.2.3.4',
        )
        done()
      },
    )
  })

  it('example.com: queue=lmtp sets queue.wants & queue.next_hop', function (done) {
    this.plugin.cfg['example.com'] = { host: '1.2.3.5', queue: 'lmtp' }
    this.plugin.do_qmd_response(
      [OK, 'vpopmail dir'],
      this.connection,
      rcpt,
      (code, msg) => {
        assert.equal(
          this.connection.transaction.notes.get('queue.wants'),
          'lmtp',
        )
        assert.equal(
          this.connection.transaction.notes.get('queue.next_hop'),
          'lmtp://1.2.3.5',
        )
        done()
      },
    )
  })

  it('example.com: split txn, 1st recipient', function (done) {
    this.plugin.cfg['example.com'] = { host: '1.2.3.5', queue: 'lmtp' }
    this.connection.transaction.rcpt_to.push(
      new Address('matt@other-domain.com'),
    )

    this.plugin.do_qmd_response(
      [OK, 'vpopmail dir'],
      this.connection,
      rcpt,
      (code, msg) => {
        assert.equal(
          this.connection.transaction.notes.get('queue.wants'),
          'lmtp',
        )
        assert.equal(
          this.connection.transaction.notes.get('queue.next_hop'),
          'lmtp://1.2.3.5',
        )
        done()
      },
    )
  })

  it('example.com: split txn, different next_hop', function (done) {
    this.plugin.cfg['example.com'] = { host: '1.2.3.5', queue: 'lmtp' }
    this.connection.transaction.rcpt_to.push(
      rcpt,
      new Address('matt@other-domain.com'),
    )
    this.connection.transaction.notes.set('queue.next_hop', 'smtp://2.3.4.5')

    this.plugin.do_qmd_response(
      [OK, 'vpopmail dir'],
      this.connection,
      rcpt,
      (code, msg) => {
        assert.equal(
          this.connection.transaction.notes.get('queue.wants'),
          'outbound',
        )
        assert.equal(
          this.connection.transaction.notes.get('queue.next_hop'),
          undefined,
        )
        done()
      },
    )
  })
})

describe('get_qmd_response', function () {
  beforeEach(_set_up)

  it('stub', function () {
    // can't test this well without a QMD server
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
    assert.equal(
      this.plugin.is_split(
        this.connection.transaction,
        'lmtp',
        'smtp://1.2.3.5',
      ),
      false,
    )
  })

  it('returns false for two recipients with same next hop', function () {
    this.plugin.cfg['example.com'] = { host: '1.2.3.5', queue: 'lmtp' }
    this.connection.transaction.rcpt_to.push(
      new Address('<1@example.com>'),
      new Address('<2@example.com>'),
    )
    assert.equal(
      this.plugin.is_split(
        this.connection.transaction,
        'lmtp',
        'smtp://1.2.3.5',
      ),
      false,
    )
  })

  it('returns true for two recipients with different queue.wants', function () {
    this.connection.transaction.notes.set('queue.wants', 'outbound')
    this.connection.transaction.notes.set('queue.next_hop', 'smtp//1.2.3.5')
    this.connection.transaction.rcpt_to.push(
      new Address('<1@example.com>'),
      new Address('<2@test-example.com>'),
    )
    assert.equal(
      this.plugin.is_split(
        this.connection.transaction,
        'lmtp',
        'smtp://1.2.3.5',
      ),
      true,
    )
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
      this.plugin.is_split(
        this.connection.transaction,
        'outbound',
        'smtp://1.2.3.6',
      ),
      true,
    )
  })
})

describe('hook_get_mx', function () {
  beforeEach(_set_up_cfg)

  it('returns nothing unless queue.wants=lmtp', function (done) {
    const hmail = new fixtures.transaction.createTransaction(null, smtp_ini)
    hmail.todo = { notes: hmail.notes }

    this.plugin.hook_get_mx(
      (code, msg) => {
        assert.equal(code, undefined)
        assert.equal(msg, undefined)
        done()
      },
      hmail,
      'example.com',
    )
  })

  it('returns MX when queue.wants=lmtp', function (done) {
    const hmail = new fixtures.transaction.createTransaction(null, smtp_ini)
    hmail.todo = { notes: hmail.notes }
    hmail.todo.notes.set('queue.wants', 'lmtp')

    this.plugin.hook_get_mx(
      (code, mx) => {
        assert.equal(code, OK)
        assert.deepEqual(mx, {
          exchange: '127.0.0.1',
          port: 24,
          priority: 0,
          using_lmtp: true,
        })
        done()
      },
      hmail,
      'example.com',
    )
  })

  it('MX steered by queue.next_hop', function (done) {
    const hmail = new fixtures.transaction.createTransaction(null, smtp_ini)
    hmail.todo = { notes: hmail.notes }
    hmail.todo.notes.set('queue.wants', 'lmtp')
    hmail.todo.notes.set('queue.next_hop', 'lmtp://127.1.1.1:23')

    this.plugin.hook_get_mx(
      (code, mx) => {
        assert.equal(code, OK)
        assert.deepEqual(mx, {
          exchange: '127.1.1.1',
          port: 23,
          priority: 0,
          using_lmtp: true,
        })
        done()
      },
      hmail,
      'example.com',
    )
  })
})
