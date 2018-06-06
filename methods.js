// verbose export of public methods
const {isPoll, isChooseOnePoll, isPosition, isChooseOnePosition} = require('ssb-poll-schema')

module.exports = {
  poll: {
    async: {
      publishChooseOne: require('./poll/async/publishChooseOne'),
      get: require('./poll/async/get')
    },
    sync: {
      isPoll: () => isPoll,
      isChooseOnePoll: () => isChooseOnePoll
      // Poll: // this is not exported - doesn't follow the inject pattern atm
    },
    pull: {
      closed: require('./poll/pull/closed'),
      open: require('./poll/pull/open'),
      all: require('./poll/pull/all')
    }
  },
  position: {
    async: {
      buildChooseOne: require('./position/async/buildChooseOne'),
      publishChooseOne: require('./position/async/publishChooseOne'),
      buildPosition: require('./position/async/buildPosition'),
      publishPosition: require('./position/async/publishPosition')
    },
    sync: {
      isChooseOnePosition: () => isChooseOnePosition
    }
  }
}
