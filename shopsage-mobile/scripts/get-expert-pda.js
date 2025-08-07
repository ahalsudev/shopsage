const { PublicKey } = require('@solana/web3.js');
const { Buffer } = require('buffer');

// Hardcoded values from constants/programs.ts
const PDA_EXPERT_SEED = 'expert';
const SHOPSAGE_EXPERT_PROGRAM_ID = new PublicKey('GHfHdFkfV93FGVz5atrTSUyBHpKkot4XkTRTaVdHD9b3');

// Your wallet public key
const authority = new PublicKey('E1BfwcowrHMGC6KUPzxVvbyXBCBmFHPfgykFfZfs1cgM');

const [expertAccountPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from(PDA_EXPERT_SEED), authority.toBuffer()],
  SHOPSAGE_EXPERT_PROGRAM_ID
);

console.log('Expert Account PDA:', expertAccountPDA.toString());