'use strict'

const Router = require('koa-router')

/**
 * Class must implement all the methods required of KoaApp.js
 */
class KoaRouter {

  constructor (options = {}) {
    this._options = options
    this._parentId = options.parentId
    this._options.useFirstMatch = true
  }

  init () {
    this._router = new Router(this._options)
  }

  get router () {
    return this._router
  }

  routes (...args) {
    return this._router.routes(...args)
  }

  allowedMethods (...args) {
    return this._router.allowedMethods(...args)
  }

  /**
   * Use the given middleware
   * @param args
   * @returns {Router}
   */
  use (...args) {
    return this._router.use(...args)
  }

  get (...args) {
    return this._router.get(...args)
  }

  post (...args) {
    return this._router.post(...args)
  }

  del (...args) {
    return this._router.del(...args)
  }

  put (...args) {
    return this._router.put(...args)
  }

  patch (...args) {
    return this._router.patch(...args)
  }
}

module.exports = KoaRouter
