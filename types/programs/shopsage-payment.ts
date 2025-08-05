/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/shopsage_payment.json`.
 */
export type ShopsagePayment = {
  "address": "GN61kESLP3vmVREX6nhTfqEf94vyuLX8YK4trEv6u6cZ",
  "metadata": {
    "name": "shopsagePayment",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "ShopSage Payment Processing and Commission Distribution"
  },
  "instructions": [
    {
      "name": "initializePayment",
      "discriminator": [
        10,
        18,
        43,
        254,
        174,
        203,
        246,
        3
      ],
      "accounts": [
        {
          "name": "paymentAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
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
          "name": "consultationFee",
          "type": "u64"
        }
      ]
    },
    {
      "name": "processConsultationPayment",
      "discriminator": [
        66,
        239,
        49,
        117,
        118,
        159,
        101,
        214
      ],
      "accounts": [
        {
          "name": "paymentAccount",
          "writable": true
        },
        {
          "name": "shopper",
          "writable": true,
          "signer": true
        },
        {
          "name": "expert",
          "writable": true
        },
        {
          "name": "platform",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "paymentAccount",
      "discriminator": [
        47,
        239,
        218,
        78,
        43,
        193,
        1,
        61
      ]
    }
  ],
  "types": [
    {
      "name": "paymentAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "consultationFee",
            "type": "u64"
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

export const IDL: ShopsagePayment = {
  "address": "GN61kESLP3vmVREX6nhTfqEf94vyuLX8YK4trEv6u6cZ",
  "metadata": {
    "name": "shopsagePayment",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "ShopSage Payment Processing and Commission Distribution"
  },
  "instructions": [
    {
      "name": "initializePayment",
      "discriminator": [
        10,
        18,
        43,
        254,
        174,
        203,
        246,
        3
      ],
      "accounts": [
        {
          "name": "paymentAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
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
          "name": "consultationFee",
          "type": "u64"
        }
      ]
    },
    {
      "name": "processConsultationPayment",
      "discriminator": [
        66,
        239,
        49,
        117,
        118,
        159,
        101,
        214
      ],
      "accounts": [
        {
          "name": "paymentAccount",
          "writable": true
        },
        {
          "name": "shopper",
          "writable": true,
          "signer": true
        },
        {
          "name": "expert",
          "writable": true
        },
        {
          "name": "platform",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "paymentAccount",
      "discriminator": [
        47,
        239,
        218,
        78,
        43,
        193,
        1,
        61
      ]
    }
  ],
  "types": [
    {
      "name": "paymentAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "consultationFee",
            "type": "u64"
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
