export type ShopsagePayment = {
  version: '0.1.0'
  name: 'shopsage_payment'
  instructions: [
    {
      name: 'initializePayment'
      accounts: [
        {
          name: 'paymentAccount'
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
          name: 'consultationFee'
          type: 'u64'
        },
      ]
    },
    {
      name: 'processConsultationPayment'
      accounts: [
        {
          name: 'paymentAccount'
          isMut: true
          isSigner: false
        },
        {
          name: 'shopper'
          isMut: true
          isSigner: true
        },
        {
          name: 'shopperTokenAccount'
          isMut: true
          isSigner: false
        },
        {
          name: 'expertTokenAccount'
          isMut: true
          isSigner: false
        },
        {
          name: 'platformTokenAccount'
          isMut: true
          isSigner: false
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'amount'
          type: 'u64'
        },
      ]
    },
  ]
  accounts: [
    {
      name: 'paymentAccount'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'authority'
            type: 'publicKey'
          },
          {
            name: 'consultationFee'
            type: 'u64'
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
      name: 'InsufficientFunds'
      msg: 'Insufficient funds for payment'
    },
    {
      code: 6001
      name: 'InvalidAmount'
      msg: 'Invalid payment amount'
    },
  ]
}

export const IDL: ShopsagePayment = {
  version: '0.1.0',
  name: 'shopsage_payment',
  instructions: [
    {
      name: 'initializePayment',
      accounts: [
        {
          name: 'paymentAccount',
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
          name: 'consultationFee',
          type: 'u64',
        },
      ],
    },
    {
      name: 'processConsultationPayment',
      accounts: [
        {
          name: 'paymentAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'shopper',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'shopperTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'expertTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'platformTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'paymentAccount',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'authority',
            type: 'publicKey',
          },
          {
            name: 'consultationFee',
            type: 'u64',
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
      name: 'InsufficientFunds',
      msg: 'Insufficient funds for payment',
    },
    {
      code: 6001,
      name: 'InvalidAmount',
      msg: 'Invalid payment amount',
    },
  ],
}
