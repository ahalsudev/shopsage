export type ShopsageExpert = {
  "address": "GHfHdFkfV93FGVz5atrTSUyBHpKkot4XkTRTaVdHD9b3"
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
          name: 'sessionRate'
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
          type: 'u64'
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
            name: 'sessionRate'
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
  "address": "GHfHdFkfV93FGVz5atrTSUyBHpKkot4XkTRTaVdHD9b3",
  "metadata": {
    "name": "shopsageExpert",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "ShopSage Expert Registration and Management"
  },
  "instructions": [
    {
      "name": "registerExpert",
      "discriminator": [
        10,
        18,
        43,
        254,
        174,
        203,
        246,
        4
      ],
      "accounts": [
        {
          "name": "expert",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  120,
                  112,
                  101,
                  114,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "specialization",
          "type": "string"
        },
        {
          "name": "sessionRate",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateExpertStatus",
      "discriminator": [
        66,
        239,
        49,
        117,
        118,
        159,
        101,
        215
      ],
      "accounts": [
        {
          "name": "expert",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "isOnline",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updateExpertRating",
      "discriminator": [
        57,
        207,
        155,
        166,
        136,
        32,
        99,
        117
      ],
      "accounts": [
        {
          "name": "expert",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newRating",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "expertAccount",
      "discriminator": [
        47,
        239,
        218,
        78,
        43,
        193,
        1,
        62
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidExpertData",
      "msg": "Invalid expert data provided"
    },
    {
      "code": 6001,
      "name": "ExpertAlreadyExists",
      "msg": "Expert account already exists"
    }
  ],
  "types": [
    {
      "name": "expertAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "specialization",
            "type": "string"
          },
          {
            "name": "sessionRate",
            "type": "u64"
          },
          {
            "name": "rating",
            "type": "u64"
          },
          {
            "name": "totalConsultations",
            "type": "u64"
          },
          {
            "name": "isVerified",
            "type": "bool"
          },
          {
            "name": "isOnline",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
