'use strict'
const debug = require('debug')('erm:koa')

module.exports = function (options) {
  const prepareQueryAsPromise = require('../api/prepareQuery')(options.allowRegex)

  return function prepareQuery (ctx, next) {
    debug('%s prepareQuery %s', ctx.state._ermReqId, JSON.stringify(ctx.request.query))
    return prepareQueryAsPromise(ctx.request.query)
      .then(queryOptions => {
        ctx.state._erm.queryOptions = queryOptions
        return next()
          .then((resp) => {
            debug('%s prepareQuery response', ctx.state._ermReqId)
            return Promise.resolve(resp)
          }, (err) => {
            debug('%s prepareQuery error response', ctx.state._ermReqId)
            return Promise.reject(err)
          })
      })
  }
}
