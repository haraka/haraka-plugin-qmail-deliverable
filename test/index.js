'use strict';

const assert = require('assert')

const Address      = require('address-rfc2821');
const fixtures     = require('haraka-test-fixtures');

const _set_up = function () {
    this.plugin = new fixtures.plugin('qmail-deliverable');
    this.connection = new fixtures.connection.createConnection();
};

const _set_up_cfg = function () {
    this.plugin = new fixtures.plugin('qmail-deliverable');
    this.connection = new fixtures.connection.createConnection();
    this.connection.transaction = new fixtures.transaction.createTransaction();
    // this.connection.transaction.queue = {};
    this.plugin.register();
};

describe('load_qmd_ini', function () {
    beforeEach(_set_up)

    it('loads config', function () {
        this.plugin.load_qmd_ini();
        assert.ok(this.plugin.cfg.main.check_outbound);
    })
})

describe('register', function () {
    beforeEach(_set_up)

    it('loads the config', function () {
        this.plugin.register();
        assert.ok(this.plugin.cfg.main.check_outbound);
    })
    it('registers the mail hook', function () {
        this.plugin.register();
        assert.equal(this.plugin.register_hook.args[0], 'mail');
        // console.log(this.plugin);
    })
})

describe('get_next_hop', function () {
    beforeEach(_set_up)

    it('wants_queue=empty sets smtp://', function () {
        const testConfig = {
            host: '1.2.3.5',
        }
        assert.equal(
            this.plugin.get_next_hop(testConfig),
            'smtp://1.2.3.5'
        );
    })
    it('wants_queue=lmtp sets lmtp://', function (done) {
        const testConfig = {
            host: '1.2.3.5',
        }
        assert.equal(
            this.plugin.get_next_hop(testConfig, 'lmtp'),
            'lmtp://1.2.3.5'
        );
        done()
    })
})

describe('set_queue', function () {
    beforeEach(_set_up_cfg)

    it('wants_queue=empty sets none', function (done) {
        this.plugin.cfg = {
            'example.com': { host: '1.2.3.4' },
        }
        assert.equal(
            this.plugin.set_queue(this.connection, undefined, 'example.com'),
            true
        );
        assert.equal(this.connection.transaction.notes.get('queue.wants'), undefined);
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), undefined);
        done()
    })

    it('wants_queue=smtp_forward sets txn.notes.queue.wants & queue.next_hop', function (done) {
        this.plugin.cfg = {
            'example.com': { host: '1.2.3.4' },
        }
        assert.equal(
            this.plugin.set_queue(this.connection, 'smtp_forward', 'example.com'),
            true
        );
        assert.equal(this.connection.transaction.notes.get('queue.wants'), 'smtp_forward');
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'smtp://1.2.3.4');
        done()
    })

    it('wants_queue=lmtp sets txn.queue.wants & queue.next_hop', function (done) {
        this.plugin.cfg = {
            'example.com': { host: '1.2.3.5' },
        }
        assert.equal(
            this.plugin.set_queue(this.connection, 'lmtp', 'example.com'),
            true
        );
        assert.equal(this.connection.transaction.notes.get('queue.wants'), 'lmtp');
        assert.equal(this.connection.transaction.notes.get('queue.next_hop'), 'lmtp://1.2.3.5');
        done()
    })
})

describe('get_qmd_response', function () {
    beforeEach(_set_up)

    it('stub', function (done) {
        // can't really test this very well without a QMD server
        done()
    })
})

describe('check_qmd_response', function () {
    beforeEach(_set_up)

    it('11', function () {
        const r = this.plugin.check_qmd_response(this.connection, '11');
        assert.equal(DENYSOFT, r[0]);
    })
    it('12', function () {
        const r = this.plugin.check_qmd_response(this.connection, '12');
        assert.equal(OK, r[0]);
    })
    it('13', function () {
        const r = this.plugin.check_qmd_response(this.connection, '13');
        assert.equal(OK, r[0]);
    })
    it('14', function () {
        this.connection.transaction = {
            mail_from: new Address.Address('<matt@example.com>'),
        };
        let r = this.plugin.check_qmd_response(this.connection, '14');
        assert.equal(OK, r[0]);

        this.connection.transaction.mail_from = new Address.Address('<>');
        r = this.plugin.check_qmd_response(this.connection, '14');
        assert.equal(DENY, r[0]);
    })
    it('21', function () {
        const r = this.plugin.check_qmd_response(this.connection, '21');
        assert.equal(DENYSOFT, r[0]);
    })
    it('22', function () {
        const r = this.plugin.check_qmd_response(this.connection, '22');
        assert.equal(DENYSOFT, r[0]);
    })
    it('2f', function () {
        const r = this.plugin.check_qmd_response(this.connection, '2f');
        assert.equal(DENYSOFT, r[0]);
    })
    it('f1', function () {
        const r = this.plugin.check_qmd_response(this.connection, 'f1');
        assert.equal(OK, r[0]);
    })
    it('f2', function () {
        const r = this.plugin.check_qmd_response(this.connection, 'f2');
        assert.equal(OK, r[0]);
    })
    it('f3', function () {
        const r = this.plugin.check_qmd_response(this.connection, 'f3');
        assert.equal(OK, r[0]);
    })
    it('f4', function () {
        const r = this.plugin.check_qmd_response(this.connection, 'f4');
        assert.equal(OK, r[0]);
    })
    it('f5', function () {
        const r = this.plugin.check_qmd_response(this.connection, 'f5');
        assert.equal(OK, r[0]);
    })
    it('f6', function () {
        const r = this.plugin.check_qmd_response(this.connection, 'f6');
        assert.equal(OK, r[0]);
    })
    it('fe', function () {
        const r = this.plugin.check_qmd_response(this.connection, 'fe');
        assert.equal(DENYSOFT, r[0]);
    })
    it('ff', function () {
        const r = this.plugin.check_qmd_response(this.connection, 'ff');
        assert.equal(DENY, r[0]);
    })
    it('0', function () {
        const r = this.plugin.check_qmd_response(this.connection, '0');
        assert.equal(DENY, r[0]);
        assert.equal('not deliverable', r[1]);
    })
    it('blah', function () {
        const r = this.plugin.check_qmd_response(this.connection, 'blah');
        assert.equal(undefined, r[0]);
    })
})
