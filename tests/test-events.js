const dc = require('dc-polyfill')
const assert = require('node:assert')
const testBase = require('node:test')
const publishedEvents = require('./helpers/get-all-published-channels.js')

const channels = {}
const retVals = {}
const errors = {}
const testedEvents = []
let callCtx

class TestChannel {
  constructor (name) {
    channels[name] = this
    this.name = name
    this.messages = []
  }

  publish (payload) {
    this.messages.push(payload)
    if (errors[this.name]) {
      payload.ret.error = errors[this.name]
      delete errors[this.name]
    } else if (retVals[this.name]) {
      payload.ret.value = retVals[this.name]
      delete retVals[this.name]
    }
  }

  get hasSubscribers () {
    return true
  }
}

dc.channel = (name) => {
  if (channels[name]) return channels[name]
  channels[name] = new TestChannel(name)
  return channels[name]
}

function channelWasCalled (name, options = {}) {
  const times = options.times || 1
  assert.ok(channels[name], `channel ${name} does not exist`)
  assert.strictEqual(channels[name].messages.length, times)
  if (times === 1 && callCtx.called) {
    // Inside this if-block (i.e. in non-error cases), we're testing that
    // the arguments passed to the channel are the same as the arguments
    // passed to the original function. Similarly for the target object (self).
    const call = channels[name].messages[0]
    assert.strictEqual(call.self, callCtx.self)
    assert.deepStrictEqual(Array.from(call.args), callCtx.args)
    // Now, if options.ret is set, we'll check that the return value is passed
    // through the payload object.
    if ('ret' in options) {
      assert.strictEqual(options.ret, callCtx.ret)
    }
  }
}

// We use this function to call a method on the tracer API, so that it stashes
// the arguments and target (self), so we can test them later in `channelWasCalled`.
function makeCall (obj, fnName, ...args) {
  callCtx.called = true
  callCtx.self = obj
  callCtx.args = args
  callCtx.ret = obj[fnName](...args)
  return callCtx.ret
}

function test (name, fn, options = {}) {
  name = 'datadog-api:v1:' + name
  testedEvents.push(name)
  testBase(`event: "${name}"`, () => {
    if ('ret' in options) {
      // This sets the intended return value for the next call to the channel.
      // We'll test that this gets sent through the payload in `channelWasCalled`.
      retVals[name] = options.ret
    }
    callCtx = {} // Reset the call context every time we call the tested function
    fn()
    channelWasCalled(name, options)
  })
  if (!options.skipThrows) {
    testBase(`event throws: "${name}"`, () => {
      // Much like return values, we can set an error to passed through the payload.
      // Later on in this function, we'll test that it actually gets thrown.
      const err = new Error()
      errors[name] = err
      callCtx = {} // Reset the call context every time we call the tested function
      assert.throws(() => fn(), err)
      channelWasCalled(name, { ...options, times: 2 })
    })
  }
}

let tracer

test('tracerinit', () => {
  tracer = require('../index.js')
}, { skipThrows: true })

let span
let context
test('startSpan', () => {
  span = makeCall(tracer, 'startSpan', 'foo')
})
test('span:setTag', () => {
  makeCall(span, 'setTag', 'foo', 'bar')
})
test('span:addTags', () => {
  makeCall(span, 'addTags', { foo: 'bar' })
})
test('span:addLink', () => {
  makeCall(span, 'addLink', 'foo', 'bar')
})
test('span:context', () => {
  context = makeCall(span, 'context')
})
test('context:toTraceId', () => {
  makeCall(context, 'toTraceId')
})
test('context:toSpanId', () => {
  makeCall(context, 'toSpanId')
})
test('context:toTraceparent', () => {
  makeCall(context, 'toTraceparent')
})

test('inject', () => {
  const carrier = {}
  makeCall(tracer, 'inject', span, 'text_map', carrier)
})

test('extract', () => {
  const carrier = {}
  makeCall(tracer, 'extract', 'text_map', carrier)
}, { ret: {} })

test('span:finish', () => {
  makeCall(span, 'finish')
})

test('use', () => {
  makeCall(tracer, 'use', 'foo')
})

let scope
test('scope', () => {
  scope = makeCall(tracer, 'scope')
})
test('scope:activate', () => {
  let called = false
  makeCall(scope, 'activate', span, () => {
    called = true
  })
  assert.ok(called)
})
test('scope:active', () => {
  makeCall(scope, 'active')
})
test('scope:bind', () => {
  makeCall(scope, 'bind', () => {})
})

test('trace', () => {
  makeCall(tracer, 'trace', 'foo', {}, () => {})
})

test('wrap', () => {
  makeCall(tracer, 'wrap', 'foo', {}, () => {})
})

test('getRumData', () => {
  makeCall(tracer, 'getRumData')
}, { ret: {} })

test('appsec:trackUserLoginSuccessEvent', () => {
  makeCall(tracer.appsec, 'trackUserLoginSuccessEvent', 'foo')
})

test('appsec:trackUserLoginFailureEvent', () => {
  makeCall(tracer.appsec, 'trackUserLoginFailureEvent', 'foo')
})

test('appsec:trackCustomEvent', () => {
  makeCall(tracer.appsec, 'trackCustomEvent', 'foo', 'bar')
})

test('appsec:isUserBlocked', () => {
  makeCall(tracer.appsec, 'isUserBlocked', 'foo')
}, { ret: true })

test('appsec:blockRequest', () => {
  makeCall(tracer.appsec, 'blockRequest', 'foo')
}, { ret: {} })

test('appsec:setUser', () => {
  makeCall(tracer.appsec, 'setUser', 'foo')
})

test('dogstatsd:increment', () => {
  makeCall(tracer.dogstatsd, 'increment', 'foo')
})

test('dogstatsd:decrement', () => {
  makeCall(tracer.dogstatsd, 'decrement', 'foo')
})

test('dogstatsd:distribution', () => {
  makeCall(tracer.dogstatsd, 'distribution', 'foo', 'bar')
})

test('dogstatsd:gauge', () => {
  makeCall(tracer.dogstatsd, 'gauge', 'foo', 'bar')
})

test('dogstatsd:histogram', () => {
  makeCall(tracer.dogstatsd, 'histogram', 'foo', 'bar')
})

test('dogstatsd:flush', () => {
  makeCall(tracer.dogstatsd, 'flush')
})

test('profilerStarted', () => {
  makeCall(tracer, 'profilerStarted')
})

// TODO llmobs

testBase('all events are tested', () => {
  assert.deepStrictEqual(publishedEvents, testedEvents.sort())
})
