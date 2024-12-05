'use strict'

const dc = require('dc-polyfill')
const Module = require('module')

let channelNames = []
dc.channel = (name) => {
  if (name.startsWith('datadog-api')) {
    channelNames.push(name)
  }
  return {
    publish: () => {},
    hasSubscribers: false
  }
}

const requireCache = Module._cache
Module._cache = {}
require('../../index')
Module._cache = requireCache

module.exports = channelNames.sort()
