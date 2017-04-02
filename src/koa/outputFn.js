'use strict'

/**
 * Add success() method to koa context.
 * Executes a res.json with status 200 AND logs the msg and optionally logs the data.
 * If you want to log the data, set options.logData to true.
 * If you want to log alternate data, set options.logData to the alternate data.
 * @param options
 */

module.exports = function () {
  return function outputFn (ctx) {
    if (ctx.state.erm.result) {
      ctx.body = ctx.state.erm.result
    }
    ctx.status = ctx.state.erm.statusCode || 200
    return Promise.resolve()
  }
}
