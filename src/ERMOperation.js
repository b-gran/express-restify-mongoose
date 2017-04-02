/**
 * @module './ERMOperation'
 */

const ImmutableRecord = require('immutable-record')
const _ = require('lodash')
const Model = require('mongoose').Model

/**
 * Underlying record for the Operation class
 */
const OperationRecord = ImmutableRecord(
  /** @lends ERMOperation */
  {
    /**
     * Query representing the document(s) we want to operate on
     * @alias module:ERMOperation#context
     * @type {function|Object}
     */
    context: {
      type: ctx => _.isFunction(ctx) || _.isObject(ctx)
    },

    /**
     * The request body, possibly transformed in preparation for the
     * operation.
     * @alias module:ERMOperation#body
     * @type {*}
     */
    body: {},

    /**
     * The permissions granted to whoever is doing the operation
     * @alias module:ERMOperation#accessLevel
     * @type {String}
     */
    accessLevel: {
      type: 'string'
    },

    /**
     * The HTTP status code of the operation, if finished
     * @alias module:ERMOperation#statusCode
     * @type {Number}
     */
    statusCode: {
      type: 'number'
    },

    /**
     * Total count of documents in the operation, if finished
     * @alias module:ERMOperation#totalCount
     * @type {Number}
     */
    totalCount: {
      type: 'number'
    },

    /**
     * The result of the operation, if applicable
     * @alias module:ERMOperation#result
     * @type {Array|Object}
     */
    result: {},

    /**
     * If the operation operates on a single document, this gets set
     * @alias module:ERMOperation#document
     * @type {Object}
     */
    document: {
      type: 'object'
    },

    /**
     * Object that represents the MongoDB query for the operation
     * @alias module:ERMOperation#query
     * @type {Object}
     */
    query: {
      type: 'object'
    },

    /**
     * Top-level ERM options for the operation.
     * @alias module:ERMOperation#options
     * @type {Object}
     */
    options: {
      type: 'object',
      required: true
    },

    /**
     * The mongoose Model we're operating on
     * @alias module:ERMOperation#model
     * @type {mongoose.Model}
     */
    model: {
      type: isModel,
      required: true
    },

    /**
     * Descendant keys to filter out
     * @alias module:ERMOperation#excludedMap
     * @type {Object}
     */
    excludedMap: {
      type: 'object',
      required: true
    }
  },
  'ERMOperation'
)

/**
 * An immutable data structure that represents an in-progress ERM operation.
 * @alias module:ERMOperation
 * @class
 */
class ERMOperation extends OperationRecord {

  /**
   * Return an object that can be stored on an Express request object to persist ERMOperation
   * state in between middleware.
   *
   * @alias module:ERMOperation#serializeToRequest
   * @return {Object}
   */
  serializeToRequest () {
    return {
      erm: {
        model: this.model,
        statusCode: this.statusCode,
        totalCount: this.totalCount,
        result: this.result,
        document: this.document
      },

      _erm: {
        access: this.accessLevel,

        queryOptions: this.query,
        context: this.context,
        body: this.body,
        options: this.options,
        excludedMap: this.excludedMap
      }
    }
  }
}

/**
 * Given an Express request, deserializes an ERMOperation from it.
 *
 * @alias module:ERMOperation.deserializeRequest
 *
 * @param {Object} req - the Express request or Koa2 ctx object
 * @return {ERMOperation}
 */
ERMOperation.deserializeRequest = function (ctx) {
  const pubErm = ctx.erm || {}
  const privErm = ctx.privateErm || {}
  return new ERMOperation(
    _.omitBy({
      model: pubErm.model,
      statusCode: pubErm.statusCode,
      totalCount: pubErm.totalCount,
      result: pubErm.result,
      document: pubErm.document,

      accessLevel: privErm.access,

      query: privErm.queryOptions,
      context: privErm.context,
      body: privErm.body,
      options: privErm.options,
      excludedMap: privErm.excludedMap
    }, _.isUndefined)
  )
}

/**
 * Initialize a new ERMOperation with a model, options, and an excludedMap.
 * All parameters are required.
 *
 * @alias module:ERMOperation.initialize
 *
 * @param {Object} model - The mongoose Model we're operating on
 * @param {Object} options - Consumer-specified options
 * @param {Object} excludedMap - Descendant keys to filter out
 *
 * @return {ERMOperation}
 */
ERMOperation.initialize = function (model, options, excludedMap) {
  return new ERMOperation({
    model, options, excludedMap
  })
}

/**
 * Returns true if the argument is a mongoose Model.
 * @param {Object} model
 * @return {boolean}
 */
function isModel (model) {
  return Object.getPrototypeOf(model) === Model
}

module.exports = ERMOperation
