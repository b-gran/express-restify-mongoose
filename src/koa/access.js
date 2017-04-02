'use strict'
const debug = require('debug')('erm:koa')

module.exports = function (options) {
  return function access (ctx, next) {
    let p
    if (typeof options.access === 'function') {
      const getAccess = options.access.length > 1
        ? (ctx) => {
          return new Promise((resolve, reject) => {
            options.access(ctx, (err, resp) => {
              if (err) {
                reject(err)
              } else {
                resolve(resp)
              }
            })
          })
        }                 // options.access is async with (ctx,done)
        : options.access // options.access returns a value or Promise with (ctx)

      p = getAccess(ctx)
      if (typeof p === 'string') {
        p = Promise.resolve(p)
      }
    } else if (typeof options.access === 'string') {
      p = Promise.resolve(options.access)
    } else {
      p = Promise.resolve('public')
    }

    return p.then((access) => {
      if (['public', 'private', 'protected'].indexOf(access) < 0) {
        return Promise.reject(new Error('Unsupported access, must be "private", "protected" or "public"'))
      }
      ctx.state._erm.access = access
      debug('%s access \'%s\'', ctx.state._ermReqId, access)
      return next()
    })
      .then((resp) => {
        debug('%s access response', ctx.state._ermReqId)
        return Promise.resolve(resp)
      }, (err) => {
        debug('%s access response error', ctx.state._ermReqId)
        return Promise.reject(err)
      })
  }
}
