const dc = require('dc-polyfill')
const assert = require('node:assert')

let channels = {}
let retVals = {}

class TestChannel {
  constructor(name) {
    channels[name] = this
    this.name = name
    this.messages = []
  }

  publish(payload) {
    this.messages.push(payload)
    if (retVals[this.name]) {    
      payload.ret.value = retVals[this.name]
    }
  }

  get hasSubscribers() {
    return true
  }
}

dc.channel = (name) => {
  if (channels[name]) return channels[name]
  channels[name] = new TestChannel(name)
  return channels[name]
}

function clearChannels () {
  channels = {}
}

function channelWasCalled (name, options = {}) {
  const times = options.times || 1
  assert.ok(channels[name], `channel ${name} does not exist`)
  assert.strictEqual(channels[name].messages.length, times)
}

const testBase = require('node:test')
const test = (name, fn, options = {}) => {
  name = 'datadog-api:v1:' + name
  if ('ret' in options) {
    retVals[name] = options.ret
}
  testBase(`event: "${name}"`, () => {
    try {
      fn()
      channelWasCalled(name, options)
    } catch (e) {
      delete retVals[name]
      throw e
    }
  })
}

let tracer

test('tracerinit', () => {
  tracer = require('../index.js')
})

let span
test('startSpan', () => {
  span = tracer.startSpan('foo')
})
test('span:setTag', () => {
  span.setTag('foo', 'bar')
})
test('span:addTags', () => {
  span.addTags({ foo: 'bar' })
})
test('span:addLink', () => {
  span.addLink('foo', 'bar')
})
let ctx
test('span:context', () => {
  ctx = span.context()
})
// TODO missing context methods

test('inject', () => {
  const carrier = {}
  tracer.inject(span, 'text_map', carrier)
})

test('extract', () => {
  const carrier = {}
  tracer.extract('text_map', carrier)
}, { ret: {} })

test('span:finish', () => {
  span.finish()
})

test('setUrl', () => {
  tracer.setUrl('https://example.com')
})
test('use', () => {
  tracer.use('foo')
})

// TODO test scope

// TODO test trace and wrap

test('getRumData', () => {
  tracer.getRumData()
}, { ret: {} })

test('setUser', () => {
  tracer.setUser('foo')
})

test('appsec:trackUserLoginSuccessEvent', () => {
  tracer.appsec.trackUserLoginSuccessEvent('foo')
})

test('appsec:trackUserLoginFailureEvent', () => {
  tracer.appsec.trackUserLoginFailureEvent('foo')
})

test('appsec:tracerCustomEvent', () => {
  tracer.appsec.tracerCustomEvent('foo', 'bar')
})

test('appsec:isUserBlocked', () => {
  tracer.appsec.isUserBlocked('foo')
}, { ret: true })

test('appsec:blockRequest', () => {
  tracer.appsec.blockRequest('foo')
}, { ret: {} })

test('appsec:setUser', () => {
  tracer.appsec.setUser('foo')
})

test('dogstatsd:increment', () => {
  tracer.dogstatsd.increment('foo')
})

test('dogstatsd:decrement', () => {
  tracer.dogstatsd.decrement('foo')
})

test('dogstatsd:distribution', () => {
  tracer.dogstatsd.distribution('foo', 'bar')
})

test('dogstatsd:gauge', () => {
  tracer.dogstatsd.gauge('foo', 'bar')
})

test('dogstatsd:histogram', () => {
  tracer.dogstatsd.histogram('foo', 'bar')
})

test('dogstatsd:flush', () => {
  tracer.dogstatsd.flush()
})

// TODO llmobs
