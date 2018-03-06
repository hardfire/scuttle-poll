var isArray = require('isarray')
var isPosition = require('../../isPosition')
var Position = require('../../position/sync/position')

//Expects a po

module.exports = function ({positions, poll}) { //postions must be of the correct type ie checked by the caller.
  return positions.reduce(function (results, position) {
    var { positionDetails: {choice} } = Position(position)

    if (choice >= poll.pollDetails.choices.length || position.value.timestamp > poll.closesAt) {
      results.errors.invalidPositions.push(position)
      return results
    }

    if (!isArray(results[choice])) {
      results[choice] = []
    }
    results[choice].push(position.value.author)

    return results
  }, {errors: {invalidPositions: []}})
}
