'use strict'

const test = require('node:test')
const dc = require('dc-polyfill')
const assert = require('node:assert')

const tracer = require('./index.js')

test('tracer', () => {
  assert.strictEqual(tracer.tracer, tracer)
})

test('default', () => {
  assert.strictEqual(tracer.default, tracer)
})

// TODO all the rest
