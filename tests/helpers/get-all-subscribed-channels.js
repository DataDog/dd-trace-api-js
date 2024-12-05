const dc = require('dc-polyfill')
const Module = require('module')

let channelNames = []
dc.channel = (name) => {
  if (name.startsWith('datadog-api')) {
    channelNames.push(name)
  }
  return {
    subscribe: () => {},
    hasSubscribers: false
  }
}

const requireCache = Module._cache
Module._cache = {}
const Plugin = require('dd-trace/packages/datadog-plugin-dd-trace-api/src')
const plugin = new Plugin()
plugin.configure({ enabled: true })
Module._cache = requireCache

module.exports = channelNames.sort()
