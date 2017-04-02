'use strict'

const PrepareQueryAsPromise = require('../api/prepareQuery')
const ErrorHandler = require('../errorHandler')
const debug = require('debug')('erm:middleware')

module.exports = function (options) {
  const prepareQueryAsPromise = PrepareQueryAsPromise(options.allowRegex)
  const errorHandler = ErrorHandler(options)

  return function (req, res, next) {
    debug('%s prepareQuery %s', req._ermReqId, JSON.stringify(req.query))
    prepareQueryAsPromise(req.query)
      .then((queryOptions) => {
        req._erm = req._erm || {}
        req._erm.queryOptions = queryOptions
        return next()
      })
      .catch(err => {
        return errorHandler(req, res, next)(err)
      })
  }
}
