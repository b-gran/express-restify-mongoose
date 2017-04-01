'use strict'
const debug = require('debug')('erm:koa')

module.exports = function (options) {
  return function ensureContentType (ctx, next) {
    const ct = ctx.request.headers['content-type']
    debug('%s ensureContentType for \'%s\'', ctx.state._ermReqId, ct)
    if (!ct) {
      return Promise.reject(new Error('missing_content_type'))
    }

    if (ct.indexOf('application/json') === -1) {
      return Promise.reject(new Error('invalid_content_type'))
    }

    return next()
  }
}
