'use strict'

const assert = require('assert')
const mongoose = require('mongoose')
const request = require('request')
const sinon = require('sinon')

module.exports = function (createFn, setup, dismantle) {
  const erm = require('../../lib/express-restify-mongoose')
  const db = require('./setup')()

  const testPort = 30023
  const testUrl = `http://localhost:${testPort}`
  const invalidId = 'invalid-id'
  const randomId = mongoose.Types.ObjectId().toHexString()
  const updateMethods = ['PATCH', 'POST', 'PUT']

  function assertFnCalled (fn, isKoa) {
    sinon.assert.calledOnce(fn)
    let args = fn.args[0]
    if (isKoa) {
      assert.equal(args.length, 2)
      assert.equal(typeof args[1], 'function')
    } else {
      assert.equal(args.length, 3)
      assert.equal(typeof args[2], 'function')
    }
    let erm = isKoa ? args[0].state.erm : args[0].erm
    return erm
  }

  describe('preMiddleware/Create/Read/Update/Delete - null', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let customer

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, {
          preMiddleware: null,
          preCreate: null,
          preRead: null,
          preUpdate: null,
          preDelete: null,
          restify: app.isRestify,
          compose: app.ermTestCompose,
          koa: app.ermTestIsKoa
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      dismantle(app, server, done)
    })

    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'John'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        done()
      })
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: {
            name: 'Bobby'
          }
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })
    })

    it('DELETE /Customer/:id 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        done()
      })
    })
  })

  describe('preMiddleware', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let customer
    let options = {
      preMiddleware: app.ermTestIsKoa
        ? sinon.spy((ctx, next) => {
          return next()
        })
        : sinon.spy((req, res, next) => {
          next()
        }),
      restify: app.isRestify,
      compose: app.ermTestCompose,
      koa: app.ermTestIsKoa
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.preMiddleware.reset()
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assertFnCalled(options.preMiddleware, app.ermTestIsKoa)
        done()
      })
    })

    it('GET /Customer/:id 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assertFnCalled(options.preMiddleware, app.ermTestIsKoa)
        done()
      })
    })

    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'Pre'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        assertFnCalled(options.preMiddleware, app.ermTestIsKoa)
        done()
      })
    })

    it('POST /Customer 400 - not called (missing content type)', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        assert.deepEqual(JSON.parse(body), {
          name: 'Error',
          message: 'missing_content_type'
        })
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('POST /Customer 400 - not called (invalid content type)', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        formData: {}
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        assert.deepEqual(JSON.parse(body), {
          name: 'Error',
          message: 'invalid_content_type'
        })
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: {
            name: 'Bobby'
          }
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assertFnCalled(options.preMiddleware, app.ermTestIsKoa)
          done()
        })
      })

      it(`${method} /Customer/:id 400 - not called (missing content type)`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${customer._id}`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.deepEqual(JSON.parse(body), {
            name: 'Error',
            message: 'missing_content_type'
          })
          sinon.assert.notCalled(options.preMiddleware)
          done()
        })
      })

      it(`${method} /Customer/:id 400 - not called (invalid content type)`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          formData: {}
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.deepEqual(JSON.parse(body), {
            name: 'Error',
            message: 'invalid_content_type'
          })
          sinon.assert.notCalled(options.preMiddleware)
          done()
        })
      })
    })

    it('DELETE /Customer 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        assertFnCalled(options.preMiddleware, app.ermTestIsKoa)
        done()
      })
    })

    it('DELETE /Customer/:id 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        assertFnCalled(options.preMiddleware, app.ermTestIsKoa)
        done()
      })
    })
  })

  describe('preCreate', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let options = {
      preCreate: app.ermTestIsKoa
        ? sinon.spy((ctx, next) => {
          return next()
        })
        : sinon.spy((req, res, next) => {
          next()
        }),
      restify: app.isRestify,
      compose: app.ermTestCompose,
      koa: app.ermTestIsKoa
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, options)

        server = app.listen(testPort, done)
      })
    })

    afterEach((done) => {
      options.preCreate.reset()
      dismantle(app, server, done)
    })

    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'Bob'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        let erm = assertFnCalled(options.preCreate, app.ermTestIsKoa)
        assert.equal(erm.result.name, 'Bob')
        assert.equal(erm.statusCode, 201)
        done()
      })
    })
  })

  describe('preRead', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let customer
    let options = {
      preRead: app.ermTestIsKoa
        ? sinon.spy((ctx, next) => {
          return next()
        })
        : sinon.spy((req, res, next) => {
          next()
        }),
      restify: app.isRestify,
      compose: app.ermTestCompose,
      koa: app.ermTestIsKoa
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.preRead.reset()
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        let erm = assertFnCalled(options.preRead, app.ermTestIsKoa)
        assert.equal(erm.result[0].name, 'Bob')
        assert.equal(erm.statusCode, 200)
        done()
      })
    })

    it('GET /Customer/count 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/count`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        let erm = assertFnCalled(options.preRead, app.ermTestIsKoa)
        assert.equal(erm.result.count, 1)
        assert.equal(erm.statusCode, 200)
        done()
      })
    })

    it('GET /Customer/:id 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        let erm = assertFnCalled(options.preRead, app.ermTestIsKoa)
        assert.equal(erm.result.name, 'Bob')
        assert.equal(erm.statusCode, 200)
        done()
      })
    })

    it('GET /Customer/:id/shallow 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${customer._id}/shallow`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        let erm = assertFnCalled(options.preRead, app.ermTestIsKoa)
        assert.equal(erm.result.name, 'Bob')
        assert.equal(erm.statusCode, 200)
        done()
      })
    })
  })

  describe('preUpdate', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let customer
    let options = {
      preUpdate: app.ermTestIsKoa
        ? sinon.spy((ctx, next) => {
          return next()
        })
        : sinon.spy((req, res, next) => {
          next()
        }),
      restify: app.isRestify,
      compose: app.ermTestCompose,
      koa: app.ermTestIsKoa
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.preUpdate.reset()
      dismantle(app, server, done)
    })

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: {
            name: 'Bobby'
          }
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          let erm = assertFnCalled(options.preUpdate, app.ermTestIsKoa)
          assert.equal(erm.result.name, 'Bobby')
          assert.equal(erm.statusCode, 200)
          done()
        })
      })

      it(`${method} /Customer/:id 400 - not called (missing content type)`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${customer._id}`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.deepEqual(JSON.parse(body), {
            name: 'Error',
            message: 'missing_content_type'
          })
          sinon.assert.notCalled(options.preUpdate)
          done()
        })
      })

      it(`${method} /Customer/:id 400 - not called (invalid content type)`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          formData: {}
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.deepEqual(JSON.parse(body), {
            name: 'Error',
            message: 'invalid_content_type'
          })
          sinon.assert.notCalled(options.preUpdate)
          done()
        })
      })
    })
  })

  describe('preDelete', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let customer
    let options = {
      preDelete: app.ermTestIsKoa
        ? sinon.spy((ctx, next) => {
          return next()
        })
        : sinon.spy((req, res, next) => {
          next()
        }),
      restify: app.isRestify,
      compose: app.ermTestCompose,
      koa: app.ermTestIsKoa
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.preDelete.reset()
      dismantle(app, server, done)
    })

    it('DELETE /Customer 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        let erm = assertFnCalled(options.preDelete, app.ermTestIsKoa)
        assert.equal(erm.result, undefined)
        assert.equal(erm.statusCode, 204)
        done()
      })
    })

    it('DELETE /Customer/:id 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        let erm = assertFnCalled(options.preDelete, app.ermTestIsKoa)
        assert.equal(erm.result, undefined)
        assert.equal(erm.statusCode, 204)
        done()
      })
    })
  })

  describe('postCreate/Read/Update/Delete - null', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let customer

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, {
          postCreate: null,
          postRead: null,
          postUpdate: null,
          postDelete: null,
          restify: app.isRestify,
          compose: app.ermTestCompose,
          koa: app.ermTestIsKoa
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      dismantle(app, server, done)
    })

    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'John'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        done()
      })
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request.post({
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: {
            name: 'Bobby'
          }
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })
    })

    it('DELETE /Customer/:id 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        done()
      })
    })
  })

  describe('postCreate', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let options = {
      postCreate: app.ermTestIsKoa
        ? sinon.spy((ctx, next) => {
          return next()
        })
        : sinon.spy((req, res, next) => {
          next()
        }),
      restify: app.isRestify,
      compose: app.ermTestCompose,
      koa: app.ermTestIsKoa
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, options)

        server = app.listen(testPort, done)
      })
    })

    afterEach((done) => {
      options.postCreate.reset()
      dismantle(app, server, done)
    })

    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'Bob'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        let erm = assertFnCalled(options.postCreate, app.ermTestIsKoa)
        assert.equal(erm.result.name, 'Bob')
        assert.equal(erm.statusCode, 201)
        done()
      })
    })

    it('POST /Customer 400 - missing required field', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          comment: 'Bar'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        assert.deepEqual(body, {
          name: 'ValidationError',
          message: 'Customer validation failed',
          errors: {
            name: {
              kind: 'required',
              message: 'Path `name` is required.',
              name: 'ValidatorError',
              path: 'name',
              properties: {
                message: 'Path `{PATH}` is required.',
                path: 'name',
                type: 'required'
              }
            }
          }
        })
        sinon.assert.notCalled(options.postCreate)
        done()
      })
    })
  })

  describe('postRead', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let customer
    let options = {
      postRead: app.ermTestIsKoa
        ? sinon.spy((ctx, next) => {
          return next()
        })
        : sinon.spy((req, res, next) => {
          next()
        }),
      restify: app.isRestify,
      compose: app.ermTestCompose,
      koa: app.ermTestIsKoa
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.postRead.reset()
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        let erm = assertFnCalled(options.postRead, app.ermTestIsKoa)
        assert.equal(erm.result[0].name, 'Bob')
        assert.equal(erm.statusCode, 200)
        done()
      })
    })

    it('GET /Customer/count 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/count`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        let erm = assertFnCalled(options.postRead, app.ermTestIsKoa)
        assert.equal(erm.result.count, 1)
        assert.equal(erm.statusCode, 200)
        done()
      })
    })

    it('GET /Customer/:id 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        let erm = assertFnCalled(options.postRead, app.ermTestIsKoa)
        assert.equal(erm.result.name, 'Bob')
        assert.equal(erm.statusCode, 200)
        done()
      })
    })

    it('GET /Customer/:id 404', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${randomId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        sinon.assert.notCalled(options.postRead)
        done()
      })
    })

    it('GET /Customer/:id 404 - invalid id', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${invalidId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        sinon.assert.notCalled(options.postRead)
        done()
      })
    })

    it('GET /Customer/:id/shallow 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${customer._id}/shallow`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        let erm = assertFnCalled(options.postRead, app.ermTestIsKoa)
        assert.equal(erm.result.name, 'Bob')
        assert.equal(erm.statusCode, 200)
        done()
      })
    })
  })

  describe('postUpdate', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let customer
    let options = {
      postUpdate: app.ermTestIsKoa
        ? sinon.spy((ctx, next) => {
          return next()
        })
        : sinon.spy((req, res, next) => {
          next()
        }),
      restify: app.isRestify,
      compose: app.ermTestCompose,
      koa: app.ermTestIsKoa
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.postUpdate.reset()
      dismantle(app, server, done)
    })

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: {
            name: 'Bobby'
          }
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          let erm = assertFnCalled(options.postUpdate, app.ermTestIsKoa)
          assert.equal(erm.result.name, 'Bobby')
          assert.equal(erm.statusCode, 200)
          done()
        })
      })

      it(`${method} /Customer/:id 404 - random id`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${randomId}`,
          json: {
            name: 'Bobby'
          }
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          sinon.assert.notCalled(options.postUpdate)
          done()
        })
      })

      it(`${method} /Customer/:id 404 - invalid id`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${invalidId}`,
          json: {
            name: 'Bobby'
          }
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          sinon.assert.notCalled(options.postUpdate)
          done()
        })
      })

      it(`${method} /Customer/:id 400 - not called (missing content type)`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${customer._id}`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.deepEqual(JSON.parse(body), {
            name: 'Error',
            message: 'missing_content_type'
          })
          sinon.assert.notCalled(options.postUpdate)
          done()
        })
      })

      it(`${method} /Customer/:id 400 - not called (invalid content type)`, (done) => {
        request({
          method,
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          formData: {}
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.deepEqual(JSON.parse(body), {
            name: 'Error',
            message: 'invalid_content_type'
          })
          sinon.assert.notCalled(options.postUpdate)
          done()
        })
      })
    })
  })

  describe('postDelete', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let customer
    let options = {
      postDelete: app.ermTestIsKoa
        ? sinon.spy((ctx, next) => {
          return next()
        })
        : sinon.spy((req, res, next) => {
          next()
        }),
      restify: app.isRestify,
      compose: app.ermTestCompose,
      koa: app.ermTestIsKoa
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.postDelete.reset()
      dismantle(app, server, done)
    })

    it('DELETE /Customer 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        let erm = assertFnCalled(options.postDelete, app.ermTestIsKoa)
        assert.equal(erm.result, undefined)
        assert.equal(erm.statusCode, 204)
        done()
      })
    })

    it('DELETE /Customer/:id 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        let erm = assertFnCalled(options.postDelete, app.ermTestIsKoa)
        assert.equal(erm.result, undefined)
        assert.equal(erm.statusCode, 204)
        done()
      })
    })

    it('DELETE /Customer/:id 404', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${randomId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        sinon.assert.notCalled(options.postDelete)
        done()
      })
    })

    it('DELETE /Customer/:id 404 - invalid id', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${invalidId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        sinon.assert.notCalled(options.postDelete)
        done()
      })
    })
  })

  describe('postCreate yields an error', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let options = {
      postCreate: app.ermTestIsKoa
        ? sinon.spy((ctx, next) => {
          return Promise.reject(new Error('Something went wrong'))
        })
        : sinon.spy((req, res, next) => {
          next(new Error('Something went wrong'))
        }),
      postProcess: sinon.spy(),
      restify: app.isRestify,
      compose: app.ermTestCompose,
      koa: app.ermTestIsKoa
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, options)

        server = app.listen(testPort, done)
      })
    })

    afterEach((done) => {
      options.postCreate.reset()
      dismantle(app, server, done)
    })

    // TODO: This test is weird
    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'Bob'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        let erm = assertFnCalled(options.postCreate, app.ermTestIsKoa)
        assert.equal(erm.result.name, 'Bob')
        assert.equal(erm.statusCode, app.ermTestIsKoa?201:400)
        sinon.assert.notCalled(options.postProcess)
        done()
      })
    })
  })

  describe('postProcess', () => {
    let app = createFn()
    let router = app.ermTestRouter || app
    let server
    let options = {
      postProcess: app.ermTestIsKoa
        ? sinon.spy((ctx, next) => {
          return next()
        })
        : sinon.spy((req, res, next) => {
          next()
        }),
      restify: app.isRestify,
      compose: app.ermTestCompose,
      koa: app.ermTestIsKoa
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(router, db.models.Customer, options)

        server = app.listen(testPort, done)
      })
    })

    afterEach((done) => {
      options.postProcess.reset()
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        let erm = assertFnCalled(options.postProcess, app.ermTestIsKoa)
        assert.deepEqual(erm.result, [])
        assert.equal(erm.statusCode, 200)
        done()
      })
    })
  })
}
