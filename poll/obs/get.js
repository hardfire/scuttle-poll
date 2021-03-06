//
// DEPRECATED
//   - we noticed that building a fully obs getter was painful
//   - also from user side there are only some things which need to be live updated
//   - seems a pull({live}) + asyncUpdate might be sufficient
//

const pull = require('pull-stream')
const sort = require('ssb-sort')
const { Struct, Value, Array: MutantArray, computed, resolve } = require('mutant')
const getContent = require('ssb-msg-content')
const { isPoll, isPosition, isChooseOnePoll, isPollUpdate, isChooseOnePosition } = require('ssb-poll-schema')
isPoll.chooseOne = isChooseOnePoll
isPosition.chooseOne = isChooseOnePosition
const buildResults = require('../../results/sync/buildResults')

module.exports = function (server) {
  return function get (key) {
    const myKey = server.id

    const positions = MutantArray([])
    const closingTimes = MutantArray([])
    const sortedClosingTimes = computed(closingTimes, sort)
    const sortedPositions = computed(positions, sort)
    const myPosition = computed(sortedPositions, (positions) => {
      const myPositions = positions.filter(position => position.value.author === myKey)
      return myPositions.pop()
    })
    const closesAt = computed(sortedClosingTimes, (times) => {
      const time = times.pop()
      return time ? time.value.content.closesAt : ''
    })

    // This is ugly, would all be done by pollDoc. Refactor in the future.
    const pollObs = Value({})

    const results = computed(sortedPositions, (positions) => {
      const resultsErrors = buildResults({ poll: resolve(pollObs), positions })
      return resultsErrors ? resultsErrors.results : []
    })

    const errors = computed(sortedPositions, (positions) => {
      const resultsErrors = buildResults({ poll: resolve(pollObs), positions })
      if (resultsErrors && resultsErrors.errors) { }
      return resultsErrors ? resultsErrors.errors : []
    })

    function PollDoc (poll) {
      poll = poll || {
        key: '',
        value: {
          author: '',
          content: {
            title: '',
            body: '',
            channel: '',
            details: {
              type: 'UNKNOWN'
            }
          },
          recps: [],
          mentions: []
        }
      }

      return Struct(Object.assign({}, decoratePoll(poll), {
        sync: false,
        closesAt,
        myPosition,
        positions: sortedPositions,
        results,
        errors
      }))
    }

    const pollDoc = PollDoc()

    server.get(key, (err, value) => {
      if (err) return err

      var poll = { key, value }
      if (!isPoll(poll)) return new Error('scuttle-poll could not get poll, key provided was not a valid poll key')

      // give subscribers a chance to start listening so they don't miss updates.
      setImmediate(function () {
        const decoratedPoll = decoratePoll(poll)
        pollObs.set(decoratedPoll)

        Object.keys(decoratedPoll).forEach(function (key) {
          pollDoc[key].set(decoratedPoll[key])
        })

        pull(
          createBacklinkStream(key, {live: false, old: true}),
          pull.collect((err, refs) => {
            if (!err) {
              const sorted = sort(refs)
              const decoratedPosition = sorted
                .filter(isPosition)
                .map(DecoratePosition(poll))

              positions.set(decoratedPosition)
              // push in the closing time from the poll object and then update if there are updates published.
              closingTimes.push(poll)

              setImmediate(() => pollDoc.sync.set(true))
            }
          })
        )

        pull(
          createBacklinkStream(key, {old: false, live: true}),
          pull.filter(isPosition),
          pull.map(DecoratePosition(poll)),
          pull.drain(positions.push)
        )

        pull(
          createBacklinkStream(key, {old: true, live: true}),
          pull.filter(isPollUpdate),
          pull.drain(closingTimes.push)
        )
      })
    })
    return pollDoc
  }

  function createBacklinkStream (key, opts) {
    opts = opts || {
      live: true,
      old: true
    }

    var filterQuery = {
      $filter: {
        dest: key
      }
    }

    return server.backlinks.read(Object.assign({
      query: [filterQuery],
      index: 'DTA' // use asserted timestamps
    }, opts))
  }
}

function decoratePoll (rawPoll) {
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
    mentions
  })

  return poll
}

function DecoratePosition (poll) {
  return (position) => decoratePosition({position, poll})
}

function decoratePosition ({position: rawPosition, poll: rawPoll}) {
  var position = getContent(rawPosition)
  var poll = getContent(rawPoll)

  // NOTE this isn't deep enough to be a safe clone
  var newPosition = Object.assign({}, rawPosition)
  newPosition.reason = position.reason

  if (isPoll.chooseOne(poll)) {
    var choiceIndex = position.details.choice
    newPosition.choice = poll.details.choices[choiceIndex]
  }
  return newPosition
}
