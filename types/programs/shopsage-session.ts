export type ShopsageSession = {
  version: '0.1.0'
  name: 'shopsage_session'
  instructions: [
    {
      name: 'createSession'
      accounts: [
        {
          name: 'session'
          isMut: true
          isSigner: false
        },
        {
          name: 'expert'
          isMut: false
          isSigner: false
        },
        {
          name: 'shopper'
          isMut: true
          isSigner: true
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'sessionId'
          type: 'string'
        },
        {
          name: 'amount'
          type: 'u64'
        },
      ]
    },
    {
      name: 'startSession'
      accounts: [
        {
          name: 'session'
          isMut: true
          isSigner: false
        },
        {
          name: 'expert'
          isMut: false
          isSigner: true
        },
      ]
      args: [
        {
          name: 'sessionId'
          type: 'string'
        },
      ]
    },
    {
      name: 'endSession'
      accounts: [
        {
          name: 'session'
          isMut: true
          isSigner: false
        },
        {
          name: 'expert'
          isMut: false
          isSigner: true
        },
      ]
      args: [
        {
          name: 'sessionId'
          type: 'string'
        },
      ]
    },
    {
      name: 'cancelSession'
      accounts: [
        {
          name: 'session'
          isMut: true
          isSigner: false
        },
        {
          name: 'shopper'
          isMut: false
          isSigner: true
        },
        {
          name: 'expert'
          isMut: false
          isSigner: true
        },
      ]
      args: [
        {
          name: 'sessionId'
          type: 'string'
        },
      ]
    },
  ]
  accounts: [
    {
      name: 'sessionAccount'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'sessionId'
            type: 'string'
          },
          {
            name: 'expert'
            type: 'publicKey'
          },
          {
            name: 'shopper'
            type: 'publicKey'
          },
          {
            name: 'amount'
            type: 'u64'
          },
          {
            name: 'status'
            type: {
              defined: 'SessionStatus'
            }
          },
          {
            name: 'startTime'
            type: 'i64'
          },
          {
            name: 'actualStartTime'
            type: {
              option: 'i64'
            }
          },
          {
            name: 'endTime'
            type: {
              option: 'i64'
            }
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
  ]
  types: [
    {
      name: 'SessionStatus'
      type: {
        kind: 'enum'
        variants: [
          {
            name: 'Pending'
          },
          {
            name: 'Active'
          },
          {
            name: 'Completed'
          },
          {
            name: 'Cancelled'
          },
        ]
      }
    },
  ]
  errors: [
    {
      code: 6000
      name: 'InvalidStatus'
      msg: 'Invalid session status'
    },
    {
      code: 6001
      name: 'Unauthorized'
      msg: 'Unauthorized action'
    },
  ]
}

export const IDL: ShopsageSession = {
  version: '0.1.0',
  name: 'shopsage_session',
  instructions: [
    {
      name: 'createSession',
      accounts: [
        {
          name: 'session',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'expert',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'shopper',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'sessionId',
          type: 'string',
        },
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
    {
      name: 'startSession',
      accounts: [
        {
          name: 'session',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'expert',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'sessionId',
          type: 'string',
        },
      ],
    },
    {
      name: 'endSession',
      accounts: [
        {
          name: 'session',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'expert',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'sessionId',
          type: 'string',
        },
      ],
    },
    {
      name: 'cancelSession',
      accounts: [
        {
          name: 'session',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'shopper',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'expert',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'sessionId',
          type: 'string',
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'sessionAccount',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'sessionId',
            type: 'string',
          },
          {
            name: 'expert',
            type: 'publicKey',
          },
          {
            name: 'shopper',
            type: 'publicKey',
          },
          {
            name: 'amount',
            type: 'u64',
          },
          {
            name: 'status',
            type: {
              defined: 'SessionStatus',
            },
          },
          {
            name: 'startTime',
            type: 'i64',
          },
          {
            name: 'actualStartTime',
            type: {
              option: 'i64',
            },
          },
          {
            name: 'endTime',
            type: {
              option: 'i64',
            },
          },
          {
            name: 'bump',
            type: 'u8',
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'SessionStatus',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Pending',
          },
          {
            name: 'Active',
          },
          {
            name: 'Completed',
          },
          {
            name: 'Cancelled',
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'InvalidStatus',
      msg: 'Invalid session status',
    },
    {
      code: 6001,
      name: 'Unauthorized',
      msg: 'Unauthorized action',
    },
  ],
}
