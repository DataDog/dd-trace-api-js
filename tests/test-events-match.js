'use strict'

/* eslint-disable no-unused-vars */

const assert = require('assert')
const test = require('test')

const publishedEvents = require('./helpers/get-all-published-channels')
const subscribedEvents = require('./helpers/get-all-subscribed-channels')

test('published events are the same as subscribed events', () => {
  assert.deepStrictEqual(publishedEvents.sort(), subscribedEvents.sort())
})
