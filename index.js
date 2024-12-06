'use strict'

const dc = require('dc-polyfill')
const version = require('./package.json').version
const major = version.split('.')[0]

function shimmable (name, defaultFun, mapReturnValue, revProxy = []) {
  const channel = dc.channel(`datadog-api:v${major}:${name}`)
  function fn () {
    if (!channel.hasSubscribers) {
      return defaultFun.apply(this, arguments)
    }
    const ret = {}
    const payload = { self: this, args: arguments, ret, revProxy }
    if (mapReturnValue) {
      payload.proxy = defaultFun
    }
    channel.publish(payload)
    if (ret.error) throw ret.error
    if (!('value' in ret)) {
      return defaultFun.apply(this, arguments)
    }
    return ret.value
  }
  // TODO set fn.name
  return fn
}

function noop (name) {
  return shimmable(name, () => {})
}

function noopThis (name) {
  return shimmable(name, function () {
    return this
  })
}

const dummySpan = {
  setTag: noop('span:setTag'),
  addTags: noop('span:addTags'),
  finish: noop('span:finish'),
  context: shimmable('span:context', () => ({ dummy: 'context' }), true),
  addLink: noop('span:addLink')
}
function getSpan () {
  return Object.create(dummySpan)
}

const scopeObj = {
  active: shimmable('scope:active', getSpan), // This could return null but _so_ much code depends on having a span
  activate: shimmable('scope:activate', (_span, fn) => {
    return fn()
  }),
  bind: shimmable('scope:bind', fn => typeof fn === 'function' ? fn() : fn),
  isNoop: shimmable('scope:isNoop', false)
}

const tracer = {
  startSpan: shimmable('startSpan', getSpan, true),
  inject: noop('inject'),
  extract: shimmable('extract', null),
  setUrl: noopThis('setUrl'),
  use: noopThis('use'),
  scope: () => scopeObj,
  trace: shimmable('trace', function (name, options, fn) {
    fn = typeof options === 'function' ? options : fn
    return fn.apply(this, arguments)
  }, false, [getSpan]),
  wrap: shimmable('wrap', (name, options, fn) => {
    return typeof options === 'function' ? options : fn
  }),
  getRumData: shimmable('getRumData'),
  setUser: noopThis('setUser'),
  appsec: {
    trackUserLoginSuccessEvent: noop('appsec:trackUserLoginSuccessEvent'),
    trackUserLoginFailureEvent: noop('appsec:trackUserLoginFailureEvent'),
    tracerCustomEvent: noop('appsec:tracerCustomEvent'),
    isUserBlocked: shimmable('appsec:isUserBlocked', false),
    blockRequest: shimmable('appsec:blockRequest', false),
    setUser: noop('appsec:setUser')
  },
  dogstatsd: {
    increment: noop('dogstatsd:increment'),
    decrement: noop('dogstatsd:decrement'),
    distribution: noop('dogstatsd:distribution'),
    gauge: noop('dogstatsd:gauge'),
    histogram: noop('dogstatsd:histogram'),
    flush: noop('dogstatsd:flush')
  }
  // TODO llmobs
}
tracer.tracer = tracer.default = tracer

const tracerInitChannel = dc.channel('datadog-api:v1:tracerinit')
tracerInitChannel.publish({ proxy: () => tracer })

module.exports = tracer
