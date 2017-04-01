'use strict'

const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const KoaRouter = require('./integration/KoaRouter')
const KoaBetterRouter = require('./integration/KoaBetterRouter')
const compose = require('koa-compose')
const qs = require('koa-qs')

const createTests = require('./integration/create')
const readTests = require('./integration/read')
const updateTests = require('./integration/update')
const deleteTests = require('./integration/delete')
const accessTests = require('./integration/access')
const contextFilterTests = require('./integration/contextFilter')
const hookTests = require('./integration/hooks')
const middlewareTests = require('./integration/middleware')
const optionsTests = require('./integration/options')
const virtualsTests = require('./integration/virtuals')

let idx = 0
const db = require('./integration/setup')()

class KoaTest {
  constructor (routerClass) {
    this._routerClass = routerClass
    this.idx = ++idx
    this.isKoa = true
    this.compose = compose
  }

  get koaRouter () {
    return this._router
  }

  listen (...args) {
    return this._app.listen(...args)
  }

  create () {
    this._router = new this._routerClass({ parentId: this.idx })
    return this
  }

  setup (callback) {
    this._app = new Koa()
    this._app.use(bodyParser({ enableTypes: ['json'], strict: true }))
    // Must use koa-qs with koa to parse nested queries
    qs(this._app)
    this._router.init()
    this._app.use(this._router.routes(), this._router.allowedMethods())
    db.initialize(function (err) {
      if (err) {
        return callback(err)
      } else {
        db.reset(function (err) {
          return callback(err)
        })
      }
    })
  }

  dismantle (app, server, callback) {
    db.close((err) => {
      if (err) {
        return callback(err)
      }

      if (app.close) {
        return app.close(callback)
      }

      server.close(callback)
    })
  }
}

function runTests (Router) {
  function testCtx (testFn) {
    let koaTest = new KoaTest(Router)

    function create (...args) {
      return koaTest.create(...args)
    }

    function setup (callback) {
      return koaTest.setup(function (err) {
        callback(err)
      })
    }

    function dismantle (...args) {
      return koaTest.dismantle(...args)
    }

    testFn(create, setup, dismantle)
  }

  function testAll (tests) {
    Object.keys(tests).forEach((test) => {
      testCtx(tests[test])
    })
  }

  describe(Router.name, () => {
    testCtx(createTests)
    testCtx(readTests)
    testAll(updateTests)
    testAll(deleteTests.deleteTrue)
    testAll(accessTests.accessPrivate)
    testCtx(contextFilterTests)
    testCtx(hookTests)
    testAll(middlewareTests)
    testAll(optionsTests)
    testAll(virtualsTests)
  })
}

runTests(KoaBetterRouter)
runTests(KoaRouter)
