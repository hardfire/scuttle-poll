const test = require('tape')
const Server = require('../../../lib/testServer')
const pull = require('pull-stream')

const ChooseOnePoll = require('../../../poll/sync/buildChooseOne')
const ChooseOnePosition = require('../../../position/async/buildChooseOne')
const UpdatedClosingTime = require('../../../poll/async/buildUpdatedClosingTime')
const getPoll = require('../../../poll/obs/get')

const {ERROR_POSITION_CHOICE} = require('../../../types.js')

const server = Server()

const katie = server.createFeed()
const piet = server.createFeed()

const pollContent = ChooseOnePoll({
  title: "what's our mascott team?",
  choices: ['prairie dog', 'kea', 'hermit crab'],
  closesAt: nDaysTime(2)
})

const agesAway = nDaysTime(100)
const soSoon = nDaysTime(1)

test('poll.obs.get', t => {
  t.plan(15)
  piet.publish(pollContent, (err, poll) => {
    t.error(err)
    const pollDoc = getPoll(server)(poll.key)

    pollDoc.sync(function (sync) {
      t.ok(sync, 'sync gets set')
      t.equal(pollDoc.key(), poll.key, 'has valid key once sync is true')
      t.deepEqual(pollDoc.value(), poll.value, 'has value once sync is true')
      t.equal(pollDoc.author(), poll.value.author, 'has author once sync is true')
      t.equal(pollDoc.title(), poll.value.content.title, 'has title once sync is true')
    })

    pollDoc.positions(function (positions) {
      if (positions.length === 2) {
        t.ok(true, 'got 2 positions')
        t.deepEqual(positions[0].value.content.branch, [poll.key], 'first published position has poll as branch')
        t.deepEqual(positions[1].value.content.branch, [positions[0].key], 'second published branch has first position as branch')
        t.equal(positions[0].choice, pollContent.details.choices[1], 'choice is the value from the poll, not the index.')
      }
    })

    pollDoc.closesAt(function (closesAt) {
      if (closesAt === agesAway) {
        t.ok(true, 'closesAt is eventually set to agesAway')
      }
    })

    pollDoc.myPosition(function (position) {
      t.equal(position.value.content.reason, 'mine', 'my position is eventually observed')
    })

    pollDoc.results(function (results) {
      // I hate this but I need to keep going.
      if (results.length && results[1].voters[katie.id] && results[2].voters[piet.id] && Object.keys(results[1].voters).length === 2) {
        t.ok(true, 'results eventually are correct')
      }
    })

    pollDoc.errors(function (errors) {
      if (errors.length > 0) {
        t.equal(errors[0].type, ERROR_POSITION_CHOICE, 'errors are eventually observed')
      }
    })

    pull(
      pull.values([
        { author: katie, opts: { poll, choice: 1, reason: 'they are sick!' } },
        { author: piet, opts: { poll, choice: 2, reason: 'scuttles 4life' } },
        { author: piet, opts: { poll, choice: 2, reason: 'INVALID' } },
        { author: server, opts: { poll, choice: 1, reason: 'mine' } }
      ]),
      pull.asyncMap((t, cb) => {
        // NOTE: piet.get does not exist, so have to build using the master server
        ChooseOnePosition(server)(t.opts, (err, position) => {
          if (err) return cb(err)
          if (position.reason === 'INVALID') {
            position.details.choice = 1000
          }
          t.position = position
          cb(null, t)
        })
      }),
      pull.asyncMap((t, cb) => t.author.publish(t.position, cb)),
      pull.asyncMap((m, cb) => UpdatedClosingTime(server)({poll, closesAt: soSoon}, cb)),
      pull.asyncMap((m, cb) => UpdatedClosingTime(server)({poll, closesAt: agesAway}, cb)),
      pull.asyncMap((t, cb) => piet.publish(t, cb)),
      pull.drain(
        m => {},
        onDone
      )
    )

    function onDone () {
      server.close()
    }
  })
})

function nDaysTime (n) {
  const d = new Date()
  d.setDate(d.getDate() + n)

  return d.toISOString()
}
