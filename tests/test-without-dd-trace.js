'use strict'

const testBase = require('node:test')
const assert = require('node:assert')

const tracer = require('../index.js')

const test = (name, fn) => {
  testBase('without dd-trace: ' + name, fn)
}

test('tracer', () => {
  assert.strictEqual(tracer.tracer, tracer)
})

test('default', () => {
  assert.strictEqual(tracer.default, tracer)
})

test('inject with startSpan', () => {
  const span = tracer.startSpan('foo')
  assert(span)
  const carrier = {}
  tracer.inject(span, 'text_map', carrier)
  assert(carrier)
  assert.strictEqual(typeof carrier, 'object')
  const keys = Reflect.ownKeys(carrier)
  assert.strictEqual(keys.length, 0)
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
    const keys = Reflect.ownKeys(carrier)
    assert.strictEqual(keys.length, 0)
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
  const val = await tracer.wrap('foo', async () => {
    const span = tracer.scope().active()
    assert(span)
    const carrier = {}
    tracer.inject(span, 'text_map', carrier)
    assert(carrier)
    assert.strictEqual(typeof carrier, 'object')
    const keys = Reflect.ownKeys(carrier)
    assert.strictEqual(keys.length, 0)
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

  tracer.scope().activate(span, () => {
    const activeSpan = tracer.scope().active()
    assert.ok(activeSpan)
    assert.strictEqual(typeof activeSpan, 'object')
  })

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
  assert.strictEqual(context.toTraceId(), '0000000000000000000')
  assert.strictEqual(context.toSpanId(), '0000000000000000000')
  assert.strictEqual(context.toTraceparent(), '00-00000000000000000000000000000000-0000000000000000-00')
})

test('getRumData', () => {
  const rumData = tracer.getRumData()
  assert.strictEqual(typeof rumData, 'string')
})

test('profilerStarted', async () => {
  assert.strictEqual(await tracer.profilerStarted(), false)
})
