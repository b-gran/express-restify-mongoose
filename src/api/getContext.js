const http = require('http')
const _ = require('lodash')
const Transformation = require('../Transformation').Transformation
const Promise = require('bluebird')
const cloneMongooseQuery = require('./shared').cloneMongooseQuery

/**
 *
 * @param {ERMOperation} state
 * @param {Context} ctx
 */
function getContext (state, ctx) {
  const options = state.options

  return new Promise(resolve => {
    options.contextFilter(state.model, ctx, context => resolve([context]))
  }).then(([context]) => {
    // This request operates on all documents in the context
    if (_.isNil(ctx.params.id)) {
      return state.set('context', context)
    }

    // This is the "context" of the document: the query that returns the
    // document itself.
    // We need to add both the document context AND the document to state.
    const documentQuery = context
      .findOne().and({
        [options.idProperty]: ctx.params.id !== 'count' ? ctx.params.id : undefined
      })
      .lean(false).read(options.readPreference)

    // Execute the document query
    return cloneMongooseQuery(documentQuery).exec()
      .then(document => {
        if (!document) {
          return Promise.reject(new Error(http.STATUS_CODES[404]))
        }

        // Store the document and document context in state
        return state.set('document', document).set('context', documentQuery)
      })
  })
}

module.exports = new Transformation(getContext)
