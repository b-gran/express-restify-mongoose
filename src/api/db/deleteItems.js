import APIMethod from '../../APIMethod'
import applyQueryToContext from '../applyQueryToContext'

/**
 * Delete all of the items specified by a query in an Express request.
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise}
 */
function doDeleteItems (state, req) {
  // Explicit construction because contextFilter() takes a callback
  return applyQueryToContext(state.options, state.context.remove(), state.query)
    .then(() => state.set('statusCode', 204))
}

export default new APIMethod(doDeleteItems)
