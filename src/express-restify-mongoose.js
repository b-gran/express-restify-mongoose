const util = require('util')
const _ = require('lodash')
const debug = require('debug')('erm:app')

const Filter = require('./resource_filter')
const RESTPathGenerator = require('./RESTPathGenerator')
const ERMOperation = require('./ERMOperation')

let customDefaults = null
let excludedMap = {}
let reqId = 0

function getDefaults () {
  return _.defaults(_.clone(customDefaults) || {}, {
    prefix: '/api',
    version: '/v1',
    idProperty: '_id',
    findOneAndUpdate: true,
    findOneAndRemove: true,
    lean: true,
    restify: false,
    runValidators: false,
    allowRegex: true,
    private: [],
    protected: []
  })
}

const restify = function (app, model, opts = {}) {
  let options = {}
  _.assign(options, getDefaults(), opts)

  const getContext = require('./api/getContext')
  const filterRequestBody = require('./api/filterRequestBody')

  const middlewarePath = options.koa ? './koa/' : './middleware/'

  const access = require(middlewarePath + 'access')
  const ensureContentType = require(middlewarePath + 'ensureContentType')(options)
  const onError = require(middlewarePath + 'onError')
  const outputFn = require(middlewarePath + 'outputFn')
  const prepareQuery = require(middlewarePath + 'prepareQuery')(options)
  const prepareOutput = require(middlewarePath + 'prepareOutput')(options, excludedMap)

  if (!_.isArray(options.private)) {
    throw new Error('"options.private" must be an array of fields')
  }

  if (!_.isArray(options.protected)) {
    throw new Error('"options.protected" must be an array of fields')
  }

  model.schema.eachPath((name, path) => {
    if (path.options.access) {
      switch (path.options.access.toLowerCase()) {
        case 'private':
          options.private.push(name)
          break
        case 'protected':
          options.protected.push(name)
          break
      }
    }
  })

  options.filter = new Filter({
    model,
    excludedMap,
    filteredKeys: {
      private: options.private,
      protected: options.protected
    }
  })

  excludedMap[model.modelName] = options.filter.filteredKeys

  function ensureValueIsArray (value) {
    if (!_.isArray(value)) {
      value = value ? [value] : []
    }
    return (typeof options.compose === 'function') ? options.compose(value) : value
  }

  options.preMiddleware = ensureValueIsArray(options.preMiddleware)
  options.preCreate = ensureValueIsArray(options.preCreate)
  options.preRead = ensureValueIsArray(options.preRead)
  options.preUpdate = ensureValueIsArray(options.preUpdate)
  options.preDelete = ensureValueIsArray(options.preDelete)

  if (!options.contextFilter) {
    options.contextFilter = (model, req, done) => done(model)
  }

  options.postCreate = ensureValueIsArray(options.postCreate)
  options.postRead = ensureValueIsArray(options.postRead)
  options.postUpdate = ensureValueIsArray(options.postUpdate)
  options.postDelete = ensureValueIsArray(options.postDelete)

  options.name = options.name || model.modelName

  const initialOperationState = ERMOperation.initialize(model, options, excludedMap)

  const ops = require('./operations')(initialOperationState)
  const restPaths = new RESTPathGenerator(options.prefix, options.version, options.name)

  if (_.isUndefined(app.delete)) {
    app.delete = app.del
  }

  if (!options.outputFn) {
    options.outputFn = outputFn(!options.restify)
  }

  let initRoute

  if (options.koa) { // koa2
    initRoute = function (ctx, next) {
      // At the start of each request, add our initial operation state to be stored in ctx.erm and
      // ctx._erm
      _.merge(ctx.state, initialOperationState.serializeToRequest())
      ctx.state._ermReqId = ctx.state._ermReqId || (++reqId)
      debug('%s initRoute', ctx.state._ermReqId)
      // With koa, resultHandler is the first middleware and handles promise rejections
      const resultHandler = options.resultHandler ? options.resultHandler : require('./koa/resultHandler')(options)
      return resultHandler(ctx, next)
        .then((resp) => {
          debug('%s initRoute response', ctx.state._ermReqId)
        })
    }
  } else {    // Express and Restify
    if (!options.onError) {
      options.onError = onError(!options.restify)
    }

    initRoute = function (req, res, next) {
      // At the start of each request, add our initial operation state, to be stored in req.erm and
      // req._erm
      _.merge(req, initialOperationState.serializeToRequest())
      req._ermReqId = req._ermReqId || (++reqId)
      debug('%s initialize context state', req._ermReqId)
      next()
    }
  }

  const accessMiddleware = options.access ? access(options) : ensureValueIsArray([])
  const contextMiddleware = getContext.getMiddleware(initialOperationState)
  const filterBodyMiddleware = filterRequestBody.getMiddleware(initialOperationState)

  function deprecatePrepareQuery (text) {
    return util.deprecate(
      prepareQuery,
      `express-restify-mongoose: in a future major version, ${text} ` +
      `Use PATCH instead.`
    )
  }

  // Retrieval

  app.get(
    restPaths.allDocuments, initRoute, prepareQuery, options.preMiddleware, contextMiddleware,
    options.preRead, accessMiddleware, ops.getItems,
    prepareOutput
  )

  app.get(
    restPaths.allDocumentsCount, initRoute, prepareQuery, options.preMiddleware, contextMiddleware,
    options.preRead, accessMiddleware, ops.getCount,
    prepareOutput
  )

  app.get(
    restPaths.singleDocument, initRoute, prepareQuery, options.preMiddleware, contextMiddleware,
    options.preRead, accessMiddleware, ops.getItem,
    prepareOutput
  )

  app.get(
    restPaths.singleDocumentShallow, initRoute, prepareQuery, options.preMiddleware, contextMiddleware,
    options.preRead, accessMiddleware, ops.getShallow,
    prepareOutput
  )

  // Creation

  app.post(
    restPaths.allDocuments, initRoute, prepareQuery, ensureContentType, options.preMiddleware,
    options.preCreate, accessMiddleware, filterBodyMiddleware, ops.createObject,
    prepareOutput
  )

  // Modification

  app.post(
    restPaths.singleDocument, initRoute,
    deprecatePrepareQuery('the POST method to update resources will be removed.'),
    ensureContentType, options.preMiddleware, contextMiddleware,
    options.preUpdate, accessMiddleware, filterBodyMiddleware, ops.modifyObject,
    prepareOutput
  )

  app.put(
    restPaths.singleDocument, initRoute,
    deprecatePrepareQuery(`the PUT method will replace rather than update a resource.`),
    ensureContentType, options.preMiddleware, contextMiddleware,
    options.preUpdate, accessMiddleware, filterBodyMiddleware, ops.modifyObject,
    prepareOutput
  )

  app.patch(
    restPaths.singleDocument,
    initRoute, prepareQuery, ensureContentType, options.preMiddleware, contextMiddleware,
    options.preUpdate, accessMiddleware, filterBodyMiddleware, ops.modifyObject,
    prepareOutput
  )

  // Deletion

  app.delete(
    restPaths.allDocuments,
    initRoute, prepareQuery, options.preMiddleware, contextMiddleware,
    options.preDelete, ops.deleteItems,
    prepareOutput
  )

  app.delete(
    restPaths.singleDocument,
    initRoute, prepareQuery, options.preMiddleware, contextMiddleware,
    options.preDelete, ops.deleteItem,
    prepareOutput
  )

  return restPaths.allDocuments
}

module.exports = {
  defaults: function (options) {
    customDefaults = options
  },
  serve: restify
}
