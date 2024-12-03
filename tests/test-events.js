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

dc.channel = (name) => new TestChannel(name)

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
      channelWasCalled(name)
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
