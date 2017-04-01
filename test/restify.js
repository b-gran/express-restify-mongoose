const restify = require('restify')

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

const db = require('./integration/setup')()

function Restify () {
  let app = restify.createServer()
  app.use(restify.queryParser())
  app.use(restify.bodyParser())
  app.isRestify = true
  return app
}

function setup (callback) {
  db.initialize((err) => {
    if (err) {
      return callback(err)
    }

    db.reset(callback)
  })
}

function dismantle (app, server, callback) {
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

function runTests (createFn) {
  describe(createFn.name, () => {
    createTests(createFn, setup, dismantle)
    readTests(createFn, setup, dismantle)
    Object.keys(updateTests).forEach((test) => {
      updateTests[test](createFn, setup, dismantle)
    })
    Object.keys(deleteTests).forEach((test) => {
      deleteTests[test](createFn, setup, dismantle)
    })
    Object.keys(accessTests).forEach((test) => {
      accessTests[test](createFn, setup, dismantle)
    })
    contextFilterTests(createFn, setup, dismantle)
    hookTests(createFn, setup, dismantle)
    Object.keys(middlewareTests).forEach((test) => {
      middlewareTests[test](createFn, setup, dismantle)
    })
    Object.keys(optionsTests).forEach((test) => {
      optionsTests[test](createFn, setup, dismantle)
    })
    Object.keys(virtualsTests).forEach((test) => {
      virtualsTests[test](createFn, setup, dismantle)
    })
  })
}

runTests(Restify)
