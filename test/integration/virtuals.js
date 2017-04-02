const assert = require('assert')
const request = require('request')

const erm = require('../../lib/express-restify-mongoose')
const db = require('./setup')()

const testPort = 30023
const testUrl = `http://localhost:${testPort}`

module.exports = {

  leanTrue: function (createFn, setup, dismantle) {
    describe('virtuals lean: true', () => {
      let app = createFn()
      let router = app.koaRouter || app
      let server

      beforeEach((done) => {
        setup((err) => {
          if (err) {
            return done(err)
          }

          erm.serve(router, db.models.Customer, {
            lean: true,
            restify: app.isRestify,
            compose: app.compose,
            koa: app.isKoa
          })

          db.models.Customer.create({
            name: 'Bob'
          }).then((createdCustomers) => {
            server = app.listen(testPort, done)
          }, (err) => {
            done(err)
          })
        })
      })

      afterEach((done) => {
        dismantle(app, server, done)
      })

      it('GET /Customer 200 - unavailable', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          assert.equal(body[0].info, undefined)
          done()
        })
      })
    })
  },

  leanFalse: function (createFn, setup, dismantle) {
    describe('virtuals lean: false', () => {
      let app = createFn()
      let router = app.koaRouter || app
      let server

      beforeEach((done) => {
        setup((err) => {
          if (err) {
            return done(err)
          }

          erm.serve(router, db.models.Customer, {
            lean: false,
            restify: app.isRestify,
            compose: app.compose,
            koa: app.isKoa
          })

          db.models.Customer.create({
            name: 'Bob'
          }).then((createdCustomers) => {
            server = app.listen(testPort, done)
          }, (err) => {
            done(err)
          })
        })
      })

      afterEach((done) => {
        dismantle(app, server, done)
      })

      it('GET /Customer 200 - available', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          assert.equal(body[0].info, 'Bob is awesome')
          done()
        })
      })
    })
  },

  readPreference: function (createFn, setup, dismantle) {
    describe('readPreference: secondary', () => {
      let app = createFn()
      let router = app.koaRouter || app
      let server

      beforeEach((done) => {
        setup((err) => {
          if (err) {
            return done(err)
          }

          erm.serve(router, db.models.Customer, {
            readPreference: 'secondary',
            restify: app.isRestify,
            compose: app.compose,
            koa: app.isKoa
          })

          db.models.Customer.create({
            name: 'Bob'
          }).then((createdCustomers) => {
            server = app.listen(testPort, done)
          }, (err) => {
            done(err)
          })
        })
      })

      afterEach((done) => {
        dismantle(app, server, done)
      })

      it('GET /Customer 200 - available', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })
    })
  }
}
