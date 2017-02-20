'use strict'

// STILL WORKING ON THIS ...

class Context {

  constructor (ctx) {
    this._ctx = ctx     // express = { request: req, response: res }, koa = ctx
  }

  get requestBody () {
    return this._ctx.request.body
  }

  // Hack needed by filterRequestBody
  set requestBody (val) {
    this._ctx.request.body = val
  }

  set responseBody (val) {
    this._ctx.response.body = val
  }

}

class KoaContext extends Context {

  get erm () {
    return this._ctx.state.erm
  }

  get privateErm () {
    return this._ctx.state._erm
  }

}

class ExpressContext extends Context {

  constructor (req, res) {
    super({ request: req, response: res })
  }

  get erm () {
    return this._ctx.request.erm
  }

  get privateErm () {
    return this._ctx.request._erm
  }

}

module.exports = {
  KoaContext: KoaContext,
  ExpressContext: ExpressContext
}
