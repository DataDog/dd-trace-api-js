'use strict'

const assert = require('assert')
const test = require('test')

const publishedEvents = require('./helpers/get-all-published-channels')
const subscribedEvents = require('./helpers/get-all-subscribed-channels')

test('published events are the same as subscribed events', () => {
  if (subscribedEvents.includes('datadog-api:v1:wrap')) {
    // This event is unnecessary, since it's been replaced with just doing
    // `wrap` in this library. That said, it's in a published version of
    // dd-trace, so we need to account for it here.
    subscribedEvents.splice(subscribedEvents.indexOf('datadog-api:v1:wrap'), 1)
  }
  assert.deepStrictEqual(publishedEvents.sort(), subscribedEvents.sort())
})
