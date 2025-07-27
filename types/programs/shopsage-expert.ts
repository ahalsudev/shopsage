export type ShopsageExpert = {
  version: '0.1.0'
  name: 'shopsage_expert'
  instructions: [
    {
      name: 'registerExpert'
      accounts: [
        {
          name: 'expert'
          isMut: true
          isSigner: false
        },
        {
          name: 'authority'
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
          name: 'name'
          type: 'string'
        },
        {
          name: 'specialization'
          type: 'string'
        },
        {
          name: 'hourlyRate'
          type: 'u64'
        },
      ]
    },
    {
      name: 'updateExpertStatus'
      accounts: [
        {
          name: 'expert'
          isMut: true
          isSigner: false
        },
        {
          name: 'authority'
          isMut: false
          isSigner: true
        },
      ]
      args: [
        {
          name: 'isOnline'
          type: 'bool'
        },
      ]
    },
    {
      name: 'updateExpertRating'
      accounts: [
        {
          name: 'expert'
          isMut: true
          isSigner: false
        },
        {
          name: 'authority'
          isMut: false
          isSigner: true
        },
      ]
      args: [
        {
          name: 'newRating'
          type: 'u8'
        },
      ]
    },
  ]
  accounts: [
    {
      name: 'expertAccount'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'authority'
            type: 'publicKey'
          },
          {
            name: 'name'
            type: 'string'
          },
          {
            name: 'specialization'
            type: 'string'
          },
          {
            name: 'hourlyRate'
            type: 'u64'
          },
          {
            name: 'rating'
            type: 'u64'
          },
          {
            name: 'totalConsultations'
            type: 'u64'
          },
          {
            name: 'isVerified'
            type: 'bool'
          },
          {
            name: 'isOnline'
            type: 'bool'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
  ]
  errors: [
    {
      code: 6000
      name: 'InvalidExpertData'
      msg: 'Invalid expert data provided'
    },
    {
      code: 6001
      name: 'ExpertAlreadyExists'
      msg: 'Expert account already exists'
    },
  ]
}

export const IDL: ShopsageExpert = {
  version: '0.1.0',
  name: 'shopsage_expert',
  instructions: [
    {
      name: 'registerExpert',
      accounts: [
        {
          name: 'expert',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'authority',
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
          name: 'name',
          type: 'string',
        },
        {
          name: 'specialization',
          type: 'string',
        },
        {
          name: 'hourlyRate',
          type: 'u64',
        },
      ],
    },
    {
      name: 'updateExpertStatus',
      accounts: [
        {
          name: 'expert',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'isOnline',
          type: 'bool',
        },
      ],
    },
    {
      name: 'updateExpertRating',
      accounts: [
        {
          name: 'expert',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'newRating',
          type: 'u8',
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'expertAccount',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'authority',
            type: 'publicKey',
          },
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'specialization',
            type: 'string',
          },
          {
            name: 'hourlyRate',
            type: 'u64',
          },
          {
            name: 'rating',
            type: 'u64',
          },
          {
            name: 'totalConsultations',
            type: 'u64',
          },
          {
            name: 'isVerified',
            type: 'bool',
          },
          {
            name: 'isOnline',
            type: 'bool',
          },
          {
            name: 'bump',
            type: 'u8',
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'InvalidExpertData',
      msg: 'Invalid expert data provided',
    },
    {
      code: 6001,
      name: 'ExpertAlreadyExists',
      msg: 'Expert account already exists',
    },
  ],
}
