const assert = require('assert')
const sinon = require('sinon')

describe('access', () => {
  const access = require('../../../lib/koa/access')

  let next = sinon.stub().returns(Promise.resolve())

  afterEach(() => {
    next.reset()
  })

  describe('with sync options.access', () => {
    it('adds access field to ctx', () => {
      let options = {
        access: () => {
          return 'private'
        }
      }
      let ctx = {
        state: {
          _ermReqId: 1,
          _erm: {}
        }
      }
      return new Promise((resolve, reject) => {
        access(options)(ctx, next)
          .then((resp) => {
            sinon.assert.calledOnce(next)
            assert.equal(ctx.state._erm.access, 'private')
            resolve()
          }, (err) => {
            reject(new Error('Should not result in error: ' + err))
          })
      })
    })

    it('raises an exception with unsupported parameter', () => {
      let options = {
        access: () => {
          return 'foo'
        }
      }
      let ctx = {
        params: {},
        state: {
          _ermReqId: 1,
          _erm: {}
        }
      }

      return new Promise((resolve, reject) => {
        access(options)(ctx, next)
          .then((resp) => {
            assert.ok(false)
            reject(new Error('Should result in an error'))
          }, (err) => {
            sinon.assert.notCalled(next)
            assert.ok(err)
            assert(err.message, 'Unsupported access, must be "private", "protected" or "public"')
            resolve()
          })
      })
    })
  })

  describe('with promise options.access', () => {
    it('adds access field to ctx', () => {
      let ctx = {
        state: {
          _ermReqId: 1,
          _erm: {}
        }
      }

      return new Promise((resolve, reject) => {
        access({
          access: (ctx) => {
            return Promise.resolve('private')
          }
        })(ctx, next)
          .then((resp) => {
            assert.equal(ctx.state._erm.access, 'private')
            resolve()
          }, (err) => {
            assert.ok(!err)
            reject('Should not result in error')
          })
      })
    })

    it('calls onError', () => {
      let ctx = {
        erm: {},
        params: {},
        state: {
          _ermReqId: 1,
          _erm: {}
        }
      }
      let error = new Error('Something bad happened')

      return new Promise((resolve, reject) => {
        access({
          access: (ctx) => {
            return Promise.reject(error)
          }
        })(ctx, next)
          .then((resp) => {
            reject(new Error('Should result in an error'))
          }, (err) => {
            assert.strictEqual(error, err)
            resolve()
          })
      })
    })

    it('raises an exception with unsupported parameter', () => {
      let ctx = {
        params: {},
        state: {
          _ermReqId: 1,
          _erm: {}
        }
      }

      return new Promise((resolve, reject) => {
        access({
          access: () => {
            return 'foo'
          }
        })(ctx, next)
          .then((resp) => {
            reject(new Error('Should result in an error'))
          }, (err) => {
            assert.ok(err)
            assert.ok(err.message === 'Unsupported access, must be "private", "protected" or "public"')
            sinon.assert.notCalled(next)
            resolve()
          })
      })
    })
  })
})
