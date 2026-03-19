'use strict'

const assert = require('node:assert')
const { beforeEach, afterEach, describe, it } = require('node:test')

const Address = require('address-rfc2821').Address
const fixtures = require('haraka-test-fixtures')

function _set_up() {
  this.plugin = new fixtures.plugin('qmail-deliverable')
  this.connection = new fixtures.connection.createConnection()
  this.connection.init_transaction()
}

describe('get_qmd_response resilient failures', function () {
  beforeEach(function () {
    _set_up.call(this)
    this.plugin.cfg = { main: {} }
    this.plugin.originalFetch = this.plugin.fetch
  })

  afterEach(function () {
    this.plugin.fetch = this.plugin.originalFetch
  })

  it('rejects on timeout (AbortError)', async function () {
    this.plugin.fetch = async () => {
      const e = new Error('aborted')
      e.name = 'AbortError'
      throw e
    }

    const res = await this.plugin.get_qmd_response(this.connection, new Address('<user@example.com>'))
    assert.equal(res, undefined)
  })

  it('rejects on non-OK HTTP status', async function () {
    this.plugin.fetch = async () => ({
      ok: false,
      status: 500,
      headers: { entries() { return [['content-type', 'text/plain']] } },
      text: async () => '500',
    })

    const res = await this.plugin.get_qmd_response(this.connection, new Address('<user@example.com>'))
    assert.equal(res, undefined)
  })

  it('rejects on invalid body', async function () {
    this.plugin.fetch = async () => ({
      ok: true,
      status: 200,
      headers: { entries() { return [['content-type', 'text/plain']] } },
      text: async () => 'not-a-number',
    })

    const res = await this.plugin.get_qmd_response(this.connection, new Address('<user@example.com>'))
    assert.equal(res, undefined)
  })
})

describe('hook_queue outbound integration', function () {
  beforeEach(function () {
    _set_up.call(this)
    delete process.env.HARAKA
    this.plugin.register()
  })

  afterEach(function () {
    delete process.env.HARAKA
  })

  it('routes to outbound sender when queue.wants=outbound', function (t, done) {
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

    this.connection.transaction.notes.set('queue.wants', 'outbound')

    this.plugin.hook_queue((code) => {
      assert.equal(code, OK)
      done()
    }, this.connection)
  })
})
