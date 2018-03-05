const raw = require('./methods')
const PLUGIN_DEPS = ['backlinks']

const niceMappings = {
  isPoll: raw.poll.sync.isPoll
}
// by following this pattern you can write your own API

module.exports = function (server, opts) {
  const methods = Object.assign({}, raw, niceMappings)

  return require('./lib/inject')(server, methods, PLUGIN_DEPS)
}
