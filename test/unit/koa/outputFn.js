const assert = require('assert')

describe('outputFn', () => {
  const outputFn = require('../../../lib/koa/outputFn')

  let ctx = {
    state: {
      erm: {
        statusCode: 342,
        result: 'Valid result'
      }
    }
  }

  it('sends status code and message', () => {
    outputFn()(ctx)
    assert(ctx.status, ctx.state.erm.statusCode)
    assert(ctx.body, ctx.state.erm.result)
  })
})
