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

function nameFuncs (obj) {
  for (const key in obj) {
    const fn = obj[key]
    if (typeof fn === 'object') {
      nameFuncs(fn)
      continue
    }
    Reflect.defineProperty(fn, 'name', { value: key })
  }
}

const dummySpanContext = {
  toTraceId: shimmable('context:toTraceId', () => '0000000000000000000'),
  toSpanId: shimmable('context:toSpanId', () => '0000000000000000000'),
  toTraceparent: shimmable('context:toTraceparent', () => '00-00000000000000000000000000000000-0000000000000000-00'),
}
nameFuncs(dummySpanContext)
function getSpanContext () {
  return Object.create(dummySpanContext)
}

const dummySpan = {
  setTag: noop('span:setTag'),
  addTags: noop('span:addTags'),
  finish: noop('span:finish'),
  context: shimmable('span:context', getSpanContext, true),
  addLink: noop('span:addLink')
}
nameFuncs(dummySpan)
function getSpan () {
  return Object.create(dummySpan)
}

const dummyScope = {
  active: shimmable('scope:active', getSpan, true), // This could return null but _so_ much code depends on having a span
  activate: shimmable('scope:activate', (_span, fn) => {
    return fn()
  }),
  bind: shimmable('scope:bind', fn => fn),
}
nameFuncs(dummyScope)
function getScope () {
  return Object.create(dummyScope)
}

const tracer = {
  // TODO configure, which just does setUrl
  startSpan: shimmable('startSpan', getSpan, true),
  inject: noop('inject'),
  extract: shimmable('extract', null),
  use: noopThis('use'),
  scope: shimmable('scope', getScope, true),
  trace: shimmable('trace', function (name, options, fn) {
    fn = typeof options === 'function' ? options : fn
    return fn.apply(this, arguments)
  }, false, [getSpan]),
  wrap (name, options, fn) {
    const tracer = this

    return function () {
      let optionsObj = options
      if (typeof optionsObj === 'function' && typeof fn === 'function') {
        optionsObj = optionsObj.apply(this, arguments)
      }

      const lastArgId = arguments.length - 1
      const cb = arguments[lastArgId]

      if (typeof cb === 'function') {
        const scopeBoundCb = tracer.scope().bind(cb)
        return tracer.trace(name, optionsObj, (span, done) => {
          arguments[lastArgId] = function (err) {
            done(err)
            return scopeBoundCb.apply(this, arguments)
          }

          return fn.apply(this, arguments)
        })
      } else {
        return tracer.trace(name, optionsObj, () => fn.apply(this, arguments))
      }
    }
  },
  getRumData: shimmable('getRumData', () => ''),
  appsec: {
    trackUserLoginSuccessEvent: noop('appsec:trackUserLoginSuccessEvent'),
    trackUserLoginFailureEvent: noop('appsec:trackUserLoginFailureEvent'),
    trackCustomEvent: noop('appsec:trackCustomEvent'),
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
  },
  profilerStarted: shimmable('profilerStarted', () => Promise.resolve(false), true),
  // TODO llmobs
}
nameFuncs(tracer)

tracer.tracer = tracer.default = tracer

const tracerInitChannel = dc.channel('datadog-api:v1:tracerinit')
tracerInitChannel.publish({ proxy: () => tracer })

module.exports = tracer
