'use strict'
require('dd-trace/init')

const testBase = require('node:test')
const assert = require('node:assert')

// Because the dd-trace-api plugin in dd-trace is not loaded unless the
// dd-trace-api module is loaded from node_modules, we need to mimic that here.
const dc = require('diagnostics_channel')
dc.channel('dd-trace:instrumentation:load').publish({ name: 'dd-trace-api' })

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

test('inject with trace', async () => {
  const obj = {}
  const val = await tracer.trace('foo', async (span) => {
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
    return obj
  })
  assert.strictEqual(val, obj)
})

test('trace returns same value (non-promise)', () => {
  const obj = {}
  const val = tracer.trace('foo', (span) => {
    return obj
  })
  assert.strictEqual(val, obj)
})

test('inject with wrap', async () => {
  const obj = {}
  const val = await tracer.wrap('foo', {}, async () => {
    const span = tracer.scope().active()
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
    return obj
  })()
  assert.strictEqual(val, obj)
})

test('wrap returns same value (non-promise)', () => {
  const obj = {}
  const val = tracer.wrap('foo', {}, () => {
    return obj
  })()
  assert.strictEqual(val, obj)
})

test('get active span and interact with it', () => {
  const span = tracer.startSpan('foo')

  const activated = tracer.scope().activate(span, () => {
    const activeSpan = tracer.scope().active()
    assert.ok(activeSpan)
    assert.strictEqual(typeof activeSpan, 'object')
    return 'pass'
  })
  assert.strictEqual(activated, 'pass')

  const bound = tracer.scope().bind(() => {
    const activeSpan = tracer.scope().active()
    assert.ok(activeSpan)
    assert.strictEqual(typeof activeSpan, 'object')
    return 'pass'
  }, span)
  assert.strictEqual(bound(), 'pass')
})

test('get some stuff off context', () => {
  const span = tracer.startSpan('foo')
  const context = span.context()
  assert.strictEqual(typeof context.toTraceId(), 'string')
  assert.strictEqual(typeof context.toSpanId(), 'string')
  assert.strictEqual(typeof context.toTraceparent(), 'string')
})

test('getRumData', () => {
  const rumData = tracer.getRumData()
  assert.strictEqual(typeof rumData, 'string')
})

test('profilerStarted', async () => {
  assert.strictEqual(await tracer.profilerStarted(), false)
})
