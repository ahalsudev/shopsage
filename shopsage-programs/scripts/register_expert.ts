import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";

// Load your Anchor program IDL (replace with your actual IDL path)
const idl = JSON.parse(fs.readFileSync("./target/idl/your_program.json", "utf-8"));

// Configure the program ID and Devnet connection
const programId = new PublicKey("GHfHdFkfV93FGVz5atrTSUyBHpKkot4XkTRTaVdHD9b3");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Load your wallet keypair (replace with your keypair path)
const walletKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync("~/.config/solana/devnet.json", "utf-8")))
);

async function registerExpert() {
  // Set up the provider
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(walletKeypair),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  // Load the program
  const program = new Program(idl, programId, provider);

  // Derive expert PDA
  const [expertPda, _bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("expert"), provider.wallet.publicKey.toBuffer()],
    programId
  );

  // Parameters for register_expert
  const name = "John Doe";
  const specialization = "Blockchain";
  const sessionRate = new anchor.BN(100); // Use BN for u64

  try {
    // Call register_expert
    const tx = await program.methods
      .registerExpert(name, specialization, sessionRate)
      .accounts({
        expert: expertPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction successful:", tx);
  } catch (error) {
    console.error("Error:", error);
  }
}

registerExpert();
