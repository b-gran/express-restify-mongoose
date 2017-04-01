const assert = require('assert')
const sinon = require('sinon')
const _ = require('lodash')

describe('access', () => {
  const access = require('../../../lib/middleware/access')

  const failIfErrorHandlerCalled = (err, req, res, next) => {
    return next(new Error(`Should not call the error handler.`, err))
  }

  let next = sinon.spy()

  afterEach(() => {
    next.reset()
  })

  describe('with sync options.access', () => {
    it('adds access field to req', done => {
      let req = {
        params: {},
        _erm: {},
        _ermReqId: 2
      }

      access({
        access: () => {
          return 'private'
        },
        onError: failIfErrorHandlerCalled
      })(req, {}, err => {
        assert.ok(!err)
        assert.equal(req._erm.access, 'private')
        done()
      })
    })

    it('raises an exception with unsupported parameter', done => {
      let req = {
        params: {},
        _erm: {},
        _ermReqId: 2
      }

      access({
        access: () => {
          return 'foo'
        },
        onError: (err, req) => {
          assert.ok(err)
          assert.ok(err.message === 'Unsupported access, must be "private", "protected" or "public"')
          assert.equal(req._erm.access, undefined)
          sinon.assert.notCalled(next)
          done()
        }
      })(req, {}, next)
    })
  })

  describe('with async options.access', () => {
    it('adds access field to req', done => {
      let req = {
        params: {},
        _erm: {},
        _ermReqId: 2
      }

      access({
        access: (req, cb) => {
          return cb(null, 'private')
        }
      })(req, {}, err => {
        assert.ok(!err)
        assert.equal(req._erm.access, 'private')
        done()
      })
    })

    it('calls onError', done => {
      let req = {
        erm: {},
        params: {},
        _erm: {},
        _ermReqId: 2
      }
      let err = new Error('Something bad happened')

      access({
        access: (req, cb) => {
          return cb(err, 'private')
        },
        onError: (errInner, reqInner, res, nextInner) => {
          assert.strictEqual(errInner, err)
          assert.strictEqual(reqInner, req)
          assert.ok(_.isEmpty(res))
          assert.strictEqual(nextInner, next)
          sinon.assert.notCalled(next)
          assert.equal(req._erm.access, undefined)
          done()
        }
      })(req, {}, next)
    })

    it('raises an exception with unsupported parameter', done => {
      let req = {
        params: {},
        _erm: {},
        _ermReqId: 2
      }

      access({
        access: () => {
          return 'foo'
        },
        onError: (err, req) => {
          assert.ok(err)
          assert.ok(err.message === 'Unsupported access, must be "private", "protected" or "public"')
          assert.equal(req._erm.access, undefined)
          sinon.assert.notCalled(next)
          done()
        }
      })(req, {}, next)
    })
  })
})
