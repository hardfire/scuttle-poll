const pull = require('pull-stream')
const sort = require('ssb-sort')
const getContent = require('ssb-msg-content')
const { isPoll, isPosition, isChooseOnePoll, isChooseOnePosition } = require('ssb-poll-schema')
isPoll.chooseOne = isChooseOnePoll
isPosition.chooseOne = isChooseOnePosition
const buildResults = require('../../position/sync/buildResults')
const { CHOOSE_ONE, ERROR_POSITION_TYPE } = require('../../types')
const publishChooseOnePosition = require('../../position/async/buildChooseOne')

module.exports = function (server) {
  return function get (key, cb) {
    server.get(key, (err, value) => {
      if (err) return cb(err)

      var poll = { key, value }
      if (!isPoll(poll)) return cb(new Error('scuttle-poll could not get poll, key provided was not a valid poll key'))

      pull(
        createBacklinkStream(key),
        pull.collect((err, msgs) => {
          if (err) return cb(err)

          cb(null, decoratePoll(poll, msgs))
        })
      )
    })
  }

  function createBacklinkStream (key) {
    var filterQuery = {
      $filter: {
        dest: key
      }
    }

    return server.backlinks.read({
      query: [filterQuery],
      index: 'DTA' // use asserted timestamps
    })
  }
}

function decoratePoll (rawPoll, msgs = []) {
  const {
    author,
    content: {
      title,
      body,
      channel,
      details: { type }
    },
    recps,
    mentions
  } = rawPoll.value

  const poll = Object.assign({}, rawPoll, {
    type,
    author,
    title,
    body,
    channel,
    recps,
    mentions,

    actions: {
      publishPosition
    },
    positions: [],
    results: {},
    errors: [],
    decorated: true
  })

  function publishPosition (opts, cb) {
    if (poll.type === CHOOSE_ONE) {
      publishChooseOnePosition({
        poll,
        choice: opts.choice,
        reason: opts.reason
      }, cb)
    }
  }

  // TODO add missingContext warnings to each msg
  msgs = sort(msgs)

  poll.positions = msgs
    .filter(msg => msg.value.content.root === poll.key)
    .filter(isPosition[type])
    .map(position => {
      return decoratePosition({position, poll})
    })

  poll.errors = msgs
    .filter(msg => msg.value.content.root === poll.key)
    .filter(msg => isPosition(msg) && !isPosition[type](msg))
    .map(position => {
      return {
        type: ERROR_POSITION_TYPE,
        message: `Position responses need to be off the ${type} type for this poll`,
        position
      }
    })

  const {results, errors} = buildResults({ poll, positions: poll.positions })
  poll.results = results
  poll.errors = poll.errors.concat(errors)

  return poll
}

function decoratePosition ({position: rawPosition, poll: rawPoll}) {
  var position = getContent(rawPosition)
  var poll = getContent(rawPoll)

  // NOTE this isn't deep enough to be a safe clone
  var newPosition = Object.assign({}, rawPosition)

  if (isPoll.chooseOne(poll)) {
    var choiceIndex = position.details.choice
    newPosition.choice = poll.details.choices[choiceIndex]
  }
  return newPosition
}
