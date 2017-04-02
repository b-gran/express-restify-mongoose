'use strict'

const debug = require('debug')('erm:koa')
const getPostMiddlewareForMethod = require('../api/shared').getPostMiddlewareForMethod

module.exports = function (options, excludedMap) {
  if (!(typeof options.compose === 'function')) {
    throw new Error('Koa requires options.compose to be set to koa-compose')
  }

  function addMiddleware (arr, value) {
    if (value) {
      if (Array.isArray(value)) {
        arr = arr.concat(value)
      } else if (typeof value === 'function') {
        arr.push(value)
      }
    }
  }

  function outputMiddleware (ctx, next) {
    if (ctx.state.erm.result && options.filter) {
      let opts = {
        access: ctx.state._erm.access,
        excludedMap: excludedMap,
        populate: ctx.state._erm.queryOptions
          ? ctx.state._erm.queryOptions.populate
          : null
      }

      ctx.state.erm.result = options.filter.filterObject(ctx.state.erm.result, opts)
    }

    if (options.totalCountHeader && ctx.state.erm.totalCount) {
      const headerName = (typeof options.totalCountHeader === 'string')
        ? options.totalCountHeader
        : 'X-Total-Count'
      ctx.set(headerName, ctx.state.erm.totalCount)
    }

    return options.outputFn(ctx)
      .then(() => {
        return next()
      })
  }

  return function prepareOutput (ctx, next) {
    debug(ctx.state._ermReqId + ' prepareOutput')
    let middleware = []
    addMiddleware(middleware, getPostMiddlewareForMethod(options, ctx.method, ctx.state.erm.statusCode))
    middleware.push(outputMiddleware)
    addMiddleware(middleware, options.postProcess)
    return options.compose(middleware)(ctx, next)
      .then((resp) => {
        return Promise.resolve(resp)
      })
  }
}
