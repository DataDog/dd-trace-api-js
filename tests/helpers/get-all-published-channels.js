'use strict'

const Module = require('module')

const requireCache = Module._cache
Module._cache = {}

const dc = require('dc-polyfill')

const channelNames = []
dc.channel = (name) => {
  if (name.startsWith('datadog-api')) {
    channelNames.push(name)
  }
  return {
    publish: () => {},
    hasSubscribers: false
  }
}

require('../../index')
Module._cache = requireCache

module.exports = Array.from(new Set(channelNames)).sort()
