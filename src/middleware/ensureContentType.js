const debug = require('debug')('erm:middleware')

module.exports = function (options) {
  const errorHandler = require('../errorHandler')(options)

  return function ensureContentType (req, res, next) {
    const ct = req.headers['content-type']
    debug('%s ensureContentType for \'%s\'', req._ermReqId, ct)

    if (!ct) {
      return errorHandler(req, res, next)(new Error('missing_content_type'))
    }

    if (ct.indexOf('application/json') === -1) {
      return errorHandler(req, res, next)(new Error('invalid_content_type'))
    }

    next()
  }
}
