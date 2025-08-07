/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/shopsage_session.json`.
 */
export type ShopsageSession = {
  "address": "5dDShygfkN6qwRh7jrPN5BmNcDY4EF5LY88Ffw7dS1Zc",
  "metadata": {
    "name": "shopsageSession",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "ShopSage Session Management"
  },
  "instructions": [
    {
      "name": "cancelSession",
      "discriminator": [
        57,
        207,
        155,
        166,
        136,
        32,
        99,
        116
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "sessionId"
              }
            ]
          }
        },
        {
          "name": "shopper",
          "signer": true
        },
        {
          "name": "expert",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "sessionId",
          "type": "string"
        }
      ]
    },
    {
      "name": "createSession",
      "discriminator": [
        242,
        193,
        143,
        179,
        150,
        25,
        122,
        227
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "sessionId"
              }
            ]
          }
        },
        {
          "name": "expert"
        },
        {
          "name": "shopper",
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
          "name": "sessionId",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "endSession",
      "discriminator": [
        11,
        244,
        61,
        154,
        212,
        249,
        15,
        66
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "sessionId"
              }
            ]
          }
        },
        {
          "name": "expert",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "sessionId",
          "type": "string"
        }
      ]
    },
    {
      "name": "startSession",
      "discriminator": [
        23,
        227,
        111,
        142,
        212,
        230,
        3,
        175
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "sessionId"
              }
            ]
          }
        },
        {
          "name": "expert",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "sessionId",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "sessionAccount",
      "discriminator": [
        74,
        34,
        65,
        133,
        96,
        163,
        80,
        69
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidStatus",
      "msg": "Invalid session status"
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "Unauthorized action"
    }
  ],
  "types": [
    {
      "name": "sessionAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sessionId",
            "type": "string"
          },
          {
            "name": "expert",
            "type": "pubkey"
          },
          {
            "name": "shopper",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "sessionStatus"
              }
            }
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "actualStartTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "endTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "sessionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "active"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    }
  ]
};

export const IDL: ShopsageSession = {
  "address": "5dDShygfkN6qwRh7jrPN5BmNcDY4EF5LY88Ffw7dS1Zc",
  "metadata": {
    "name": "shopsageSession",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "ShopSage Session Management"
  },
  "instructions": [
    {
      "name": "cancelSession",
      "discriminator": [
        57,
        207,
        155,
        166,
        136,
        32,
        99,
        116
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "sessionId"
              }
            ]
          }
        },
        {
          "name": "shopper",
          "signer": true
        },
        {
          "name": "expert",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "sessionId",
          "type": "string"
        }
      ]
    },
    {
      "name": "createSession",
      "discriminator": [
        242,
        193,
        143,
        179,
        150,
        25,
        122,
        227
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "sessionId"
              }
            ]
          }
        },
        {
          "name": "expert"
        },
        {
          "name": "shopper",
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
          "name": "sessionId",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "endSession",
      "discriminator": [
        11,
        244,
        61,
        154,
        212,
        249,
        15,
        66
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "sessionId"
              }
            ]
          }
        },
        {
          "name": "expert",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "sessionId",
          "type": "string"
        }
      ]
    },
    {
      "name": "startSession",
      "discriminator": [
        23,
        227,
        111,
        142,
        212,
        230,
        3,
        175
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "sessionId"
              }
            ]
          }
        },
        {
          "name": "expert",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "sessionId",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "sessionAccount",
      "discriminator": [
        74,
        34,
        65,
        133,
        96,
        163,
        80,
        69
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidStatus",
      "msg": "Invalid session status"
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "Unauthorized action"
    }
  ],
  "types": [
    {
      "name": "sessionAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sessionId",
            "type": "string"
          },
          {
            "name": "expert",
            "type": "pubkey"
          },
          {
            "name": "shopper",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "sessionStatus"
              }
            }
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "actualStartTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "endTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "sessionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "active"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    }
  ]
};
