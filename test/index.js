
// node.js built-in modules
const assert   = require('assert');

// npm modules
const fixtures = require('haraka-test-fixtures');

// start of tests
//    assert: https://nodejs.org/api/assert.html
//    mocha: http://mochajs.org

beforeEach(function (done) {
    this.plugin = new fixtures.plugin('qmail-deliverable');
    done();  // if a test hangs, assure you called done()
});

describe('qmail-deliverable', function () {
    it('loads', function (done) {
        assert.ok(this.plugin);
        done();
    });
});

describe('load_qmail-deliverable_ini', function () {
    it('loads qmail-deliverable.ini from config/qmail-deliverable.ini', function (done) {
        this.plugin.load_qmail-deliverable_ini();
        assert.ok(this.plugin.cfg);
        done();
    });

    it('initializes enabled boolean', function (done) {
        this.plugin.load_qmail-deliverable_ini();
        assert.equal(this.plugin.cfg.main.enabled, true, this.plugin.cfg);
        done();
    });
});
