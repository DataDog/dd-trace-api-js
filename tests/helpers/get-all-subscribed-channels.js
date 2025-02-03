const Module = require('module')

const requireCache = Module._cache
Module._cache = {}

const dc = require('diagnostics_channel')

const channelNames = []
dc.channel = (name) => {
  if (name.startsWith('datadog-api')) {
    channelNames.push(name)
  }
  return {
    subscribe: () => {},
    hasSubscribers: false
  }
}

const Plugin = require('dd-trace/packages/datadog-plugin-dd-trace-api/src')
const plugin = new Plugin()
plugin.configure({ enabled: true })
Module._cache = requireCache

module.exports = Array.from(new Set(channelNames)).sort()
