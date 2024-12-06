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

test('inject with trace', () => {
  tracer.trace('foo', (span) => {
    assert(span)
    const carrier = {}
    tracer.inject(span, 'text_map', carrier)
    assert(carrier)

    assert.strictEqual(typeof carrier, 'object')
    const keys = Reflect.ownKeys(carrier)
    assert.strictEqual(keys.length, 0)
  })
})

// TODO all the rest
