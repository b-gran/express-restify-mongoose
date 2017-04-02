const serializer = require('serialize-error')

module.exports = function serializeError (err, paramsId) {
  let errObj = serializer(err)
  delete errObj.stack
  if (errObj.errors) {
    for (let key in errObj.errors) {
      delete errObj.errors[key].reason
      delete errObj.errors[key].stack
    }
  }
  return errObj
}
