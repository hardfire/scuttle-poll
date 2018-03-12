const Validator = require('is-my-json-valid')
const schema = require('../schema/chooseOnePosition')
const validator = Validator(schema, {verbose: true})
const getMsgContent = require('../../lib/getMsgContent')

// server is not used here. Closure pattern is just for consistency of use with other functions.
module.exports = function (server) {
  return function isChooseOnePosition (obj) {
    const result = validator(getMsgContent(obj))

    // exposes error messages provided by is-my-json-valid
    isChooseOnePosition.errors = validator.errors

    return result
  }
}