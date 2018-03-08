const errorSchema = require('./error')
const cloneDeep = require('lodash.cedeep')

const schema = cloneDeep(errorSchema)

// collapse the details down to be ONLY choice error
schema.properties.type = { $ref: '#/definitions/errorTypes/errorChoice' }

module.exports = schema
