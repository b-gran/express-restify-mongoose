const debug = require('debug')('erm:koa')
const http = require('http')
const serializeError = require('../serializeError')

/**
 *
 * @param options {Object}
 * @param [options.buildErrorResponse] {function} Sync function(ctx,errmserializedErr) to build and
 *   return the JSON response object
 * @returns {resultHandler}
 */
module.exports = function (options) {
  return function resultHandler (ctx, next) {
    debug('%s resultHandler request', ctx.state._ermReqId)
    return next()
      .then((resp) => {
        debug('%s resultHandler response no error', ctx.state._ermReqId)
        return Promise.resolve(resp)
      }, (err) => {
        debug('%s resultHandler response error %s', ctx.state._ermReqId, err)

        if (typeof err.message === 'number' && err.message >= 400 && http.STATUS_CODES[err.message]) {
          err.status = err.message
          err.message = http.STATUS_CODES[err.message]
        } else if (err.message === http.STATUS_CODES[404]) {
          err.status = 404
        } else if ((ctx.params.id && err.path === options.idProperty && err.name === 'CastError')) {
          err.status = 404
        }

        let errObj = serializeError(err)

        ctx.response.header['Content-Type'] = 'application/json'
        ctx.status = err.status || 400
        ctx.body = errObj
      })
  }
}

