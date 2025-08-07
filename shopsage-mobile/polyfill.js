import { Buffer } from 'buffer'
global.Buffer = Buffer

import { getRandomValues as expoCryptoGetRandomValues } from 'expo-crypto'

if (typeof structuredClone === 'undefined') {
  global.structuredClone = require('core-js/actual/structured-clone');
}

// Polyfill for process (often needed for libraries that check process.env)
if (typeof process === 'undefined') {
  global.process = require('process');
}

// getRandomValues polyfill
class Crypto {
  getRandomValues = expoCryptoGetRandomValues
}

const webCrypto = typeof crypto !== 'undefined' ? crypto : new Crypto()

;(() => {
  if (typeof crypto === 'undefined') {
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      enumerable: true,
      get: () => webCrypto,
    })
  }
})()
