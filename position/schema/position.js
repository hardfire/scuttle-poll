const Validate = require('is-my-json-valid')
const { msgIdRegex, feedIdRegex, blobIdRegex } = require('ssb-ref')
const chooseOneDetails = require('./details/chooseOne')

const schema = {
  $schema: 'http://json-schema.org/schema#',
  type: 'object',
  required: ['type', 'positionDetails'],
  properties: {
    version: {
      type: 'string',
      pattern: '^0.1.0$'
    },
    type: {
      type: 'string',
      pattern: '^position$'
    },
    text: { type: 'string' },
    reason: { type: 'string' },
    positionDetails: {
      oneOf: [
        { $ref: '#/definitions/positionDetails/chooseOne' }
      ]
    },
    mentions: {
      oneOf: [
        { type: 'null' },
        {
          type: 'array',
          items: {
            oneOf: [
              { $ref: '#/definitions/mentions/message' },
              { $ref: '#/definitions/mentions/feed' },
              { $ref: '#/definitions/mentions/blob' }
            ]
          }
        }
      ]
    },
    recps: {
      oneOf: [
        { type: 'null' },
        {
          type: 'array',
          items: {
            oneOf: [
              { $ref: '#/definitions/feedId' },
              { $ref: '#/definitions/mentions/feed' }
            ]
          }
        }
      ]
    }
  },
  definitions: {

    positionDetails: {
      type: 'object',
      chooseOne: chooseOneDetails
    },
    messageId: {
      type: 'string',
      pattern: msgIdRegex
    },
    rootId: {
      type: 'string',
      pattern: msgIdRegex
    },
    branchId: {
      oneOf: [
        {
          type: 'string',
          pattern: msgIdRegex
        },
        {
          type: 'array',
          items: {
            type: 'string',
            pattern: msgIdRegex
          }
        }
      ]
    },
    feedId: {
      type: 'string',
      pattern: feedIdRegex
    },
    blobId: {
      type: 'string',
      pattern: blobIdRegex
    },
    mentions: {
      message: {
        type: 'object',
        required: ['link'],
        properties: {
          link: { $ref: '#/definitions/messageId' }
        }
      },
      feed: {
        type: 'object',
        required: ['link', 'name'],
        properties: {
          link: { $ref: '#/definitions/feedId' },
          name: { type: 'string' }
        }
      },
      blob: {
        type: 'object',
        required: ['link', 'name'],
        properties: {
          link: { $ref: '#/definitions/blobId' },
          name: { type: 'string' }
        }
      }
    }
  }
}

module.exports = schema
