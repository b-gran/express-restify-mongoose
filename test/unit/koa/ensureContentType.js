const assert = require('assert')
const sinon = require('sinon')

describe('ensureContentType', () => {
  const ensureContentType = require('../../../lib/koa/ensureContentType')

  let next = sinon.stub().returns(Promise.resolve())

  afterEach(() => {
    next.reset()
  })

  it('calls next with an error (missing_content_type)', () => {
    let options = {}
    let ctx = {
      request: {
        headers: {}
      },
      state: {
        _ermReqId: 1,
        _erm: {}
      }
    }

    return new Promise((resolve, reject) => {
      ensureContentType(options)(ctx, next)
        .then((resp) => {
          reject(new Error('Should result in an error'))
        }, (err) => {
          sinon.assert.notCalled(next)
          assert.ok(err)
          assert(err.message, 'missing_content_type')
          assert.equal(ctx.state._erm.access, undefined)
          resolve()
        })
    })
  })

  it('calls next with an error (invalid_content_type)', () => {
    let options = {}
    let ctx = {
      request: {
        headers: {
          'content-type': 'invalid/type'
        }
      },
      state: {
        _ermReqId: 1,
        _erm: {}
      }
    }

    return new Promise((resolve, reject) => {
      ensureContentType(options)(ctx, next)
        .then((resp) => {
          reject(new Error('Should result in an error'))
        }, (err) => {
          sinon.assert.notCalled(next)
          assert.ok(err)
          assert(err.message, 'invalid_content_type')
          assert.equal(ctx.state._erm.access, undefined)
          resolve()
        })
    })
  })

  it('calls next', () => {
    let options = {}
    let ctx = {
      request: {
        headers: {
          'content-type': 'application/json'
        }
      },
      state: {
        _ermReqId: 1,
        _erm: {}
      }
    }

    return new Promise((resolve, reject) => {
      ensureContentType(options)(ctx, next)
        .then((resp) => {
          sinon.assert.calledOnce(next)
          sinon.assert.calledWithExactly(next)
          resolve()
        }, (err) => {
          reject(new Error('Should not result in an error: ' + err))
        })
    })
  })
})
