const { Connection, PublicKey } = require('@solana/web3.js');

(async () => {
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  const accountPublicKey = new PublicKey(process.argv[2]);
  const accountInfo = await connection.getAccountInfo(accountPublicKey);
  console.log(accountInfo.data.toString('hex'));
})();
