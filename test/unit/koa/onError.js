const sinon = require('sinon')
const assert = require('assert')

describe('onError', () => {
  const onError = require('../../../lib/koa/onError')

  let next = sinon.stub()

  let options = {}
  let ctx = {
    state: {
      erm: {
        statusCode: 398
      },
      _ernReqId: 5
    },
    params: {},
    response: {
      header: {}
    }
  }

  afterEach(() => {
    next.reset()
  })

  it('no error', () => {
    return new Promise((resolve, reject) => {
      next.returns(Promise.resolve('should pass thru return value'))
      onError(options)(ctx, next)
        .then((resp) => {
          sinon.assert.calledOnce(next)
          assert(resp, 'should pass thru return value')
          resolve()
        }, (err) => {
          reject(new Error('should not result in an error: ' + err))
        })
    })
  })

  it('error', () => {
    let nextFail = function () {
      return Promise.reject(new Error('Should see error'))
    }
    return new Promise((resolve, reject) => {
      onError(options)(ctx, nextFail)
        .then((resp) => {
          assert(ctx.status, 398)
          assert(ctx.response.header['Content-Type'], 'application/json')
          assert(ctx.body.message, 'Should see error')
          assert(ctx.body.name, 'Error')
          resolve()
        }, (err) => {
          reject(new Error('should not result in an error: ' + err))
        })
    })
  })
})
