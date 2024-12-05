'use strict'

const dc = require('dc-polyfill')
const version = require('./package.json').version
const major = version.split('.')[0]

function shimmable (name, defaultFun, mapReturnValue) {
  const channel = dc.channel(`datadog-api:v${major}:${name}`)
  function fn () {
    if (!channel.hasSubscribers) {
      return defaultFun.apply(this, arguments)
    }
    const ret = {}
    const payload = { self: this, args: arguments, ret }
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

  // This was taken from the current dd-trace. It only uses public APIs, so it 
  // can live entirely within the API package.
  trace (name, options, fn) {
    if (typeof options === 'function') {
      fn = options
      options = {}
    }
    options = Object.assign({
      childOf: this.scope().active()
    }, options)

    const span = this.startSpan(name, options)

    // TODO: Should this be reimplemented on this side, or be a dd-trace concern?
    //addTags(span, options)

    try {
      if (fn.length > 1) {
        return this.scope().activate(span, () => fn(span, err => {
          addError(span, err)
          span.finish()
        }))
      }

      const result = this.scope().activate(span, () => fn(span))

      if (result && typeof result.then === 'function') {
        return result.then(
          value => {
            span.finish()
            return value
          },
          err => {
            addError(span, err)
            span.finish()
            throw err
          }
        )
      } else {
        span.finish()
      }

      return result
    } catch (e) {
      addError(span, e)
      span.finish()
      throw e
    }
  },

  // This was taken from the current dd-trace. It only uses public APIs, so it 
  // can live entirely within the API package.
  wrap (name, options, fn) {
    const tracer = this

    return function () {
      if (tracer.scope().isNoop()) return fn.apply(this, arguments)

      let optionsObj = options
      if (typeof optionsObj === 'function' && typeof fn === 'function') {
        optionsObj = optionsObj.apply(this, arguments)
      }

      if (optionsObj && optionsObj.orphanable === false && !tracer.scope().active() && DD_MAJOR < 4) {
        return fn.apply(this, arguments)
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

function addError (span, err) {
  if (err) {
    span.setTag('error', err)
  }
}

