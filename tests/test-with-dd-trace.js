'use strict'
require('dd-trace/init')
const dc = require('dc-polyfill')

const testBase = require('node:test')
const assert = require('node:assert')

const tracer = require('../index.js')

const test = (name, fn) => {
  testBase('with dd-trace: ' + name, fn)
}

test('inject with startSpan', () => {
  const span = tracer.startSpan('foo')
  assert(span)
  const carrier = {}
  tracer.inject(span, 'text_map', carrier)
  assert(carrier)
  assert.strictEqual(typeof carrier, 'object')
  assert.strictEqual(typeof carrier['x-datadog-trace-id'], 'string')
  assert.strictEqual(typeof carrier['x-datadog-parent-id'], 'string')
  assert.strictEqual(typeof carrier['x-datadog-sampling-priority'], 'string')
  assert.strictEqual(typeof carrier['x-datadog-tags'], 'string')
  assert.strictEqual(typeof carrier.traceparent, 'string')
  assert.strictEqual(typeof carrier.tracestate, 'string')
  span.finish()
})

test('inject with trace', () => {
  tracer.trace('foo', (span) => {
    assert(span)
    const carrier = {}
    tracer.inject(span, 'text_map', carrier)
    assert(carrier)
    assert.strictEqual(typeof carrier, 'object')
    assert.strictEqual(typeof carrier['x-datadog-trace-id'], 'string')
    assert.strictEqual(typeof carrier['x-datadog-parent-id'], 'string')
    assert.strictEqual(typeof carrier['x-datadog-sampling-priority'], 'string')
    assert.strictEqual(typeof carrier['x-datadog-tags'], 'string')
    assert.strictEqual(typeof carrier.traceparent, 'string')
    assert.strictEqual(typeof carrier.tracestate, 'string')
  })
})

// TODO all the rest
