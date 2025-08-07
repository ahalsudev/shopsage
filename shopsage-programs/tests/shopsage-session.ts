import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { ShopsageSession } from "../target/types/shopsage_session";
import { expect } from "chai";

describe("shopsage-session", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ShopsageSession as Program<ShopsageSession>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  let expert: Keypair;
  let shopper: Keypair;
  let sessionId: string;
  let sessionPda: PublicKey;
  let sessionBump: number;

  before(async () => {
    expert = Keypair.generate();
    shopper = Keypair.generate();
    sessionId = "test-session-123";

    [sessionPda, sessionBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), Buffer.from(sessionId)],
      program.programId
    );

    // Fund expert and shopper accounts for testing
    const connection = provider.connection;
    console.log(`Airdropping 50 SOL to expert: ${expert.publicKey.toBase58()}`);
    const expertAirdropTx = await connection.requestAirdrop(expert.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(expertAirdropTx);
    console.log(`Airdropping 100 SOL to shopper: ${shopper.publicKey.toBase58()}`);
    const shopperAirdropTx = await connection.requestAirdrop(shopper.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(shopperAirdropTx);
    console.log("Airdrop complete.");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second

    // Verify shopper balance
    let shopperBalance = await connection.getBalance(shopper.publicKey);
    console.log(`Shopper balance after airdrop: ${shopperBalance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
    expect(shopperBalance).to.be.greaterThan(0);
  });

  it("Should create a session", async () => {
    const amount = new anchor.BN(1000); // Example amount

    await program.methods
      .createSession(sessionId, amount)
      .accounts({
        session: sessionPda,
        expert: expert.publicKey,
        shopper: shopper.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([shopper])
      .rpc();

    const sessionAccount = await program.account.sessionAccount.fetch(sessionPda);

    expect(sessionAccount.sessionId).to.equal(sessionId);
    expect(sessionAccount.expert.toString()).to.equal(expert.publicKey.toString());
    expect(sessionAccount.shopper.toString()).to.equal(shopper.publicKey.toString());
    expect(sessionAccount.amount.toNumber()).to.equal(amount.toNumber());
    expect(sessionAccount.status).to.eql({ pending: {} });
    expect(sessionAccount.startTime.toNumber()).to.be.closeTo(Date.now() / 1000, 5); // Within 5 seconds
    expect(sessionAccount.bump).to.equal(sessionBump);
  });

  it("Should start a session", async () => {
    await program.methods
      .startSession(sessionId)
      .accounts({
        session: sessionPda,
        expert: expert.publicKey,
      })
      .signers([expert])
      .rpc();

    const sessionAccount = await program.account.sessionAccount.fetch(sessionPda);
    expect(sessionAccount.status).to.eql({ active: {} });
    expect(sessionAccount.actualStartTime.toNumber()).to.be.closeTo(Date.now() / 1000, 5);
  });

  it("Should not start a session if not expert", async () => {
    try {
      await program.methods
        .startSession(sessionId)
        .accounts({
          session: sessionPda,
          expert: shopper.publicKey, // Try to start as shopper
        })
        .signers([shopper])
        .rpc();
      expect.fail("Should have failed with unauthorized error");
    } catch (err) {
      expect(err.error.errorMessage).to.include("Unauthorized action");
    }
  });

  it("Should not start a session if not pending", async () => {
    // Create a new session for this test to ensure it's in a non-pending state
    const newSessionId = "test-session-non-pending";
    const newSessionAmount = new anchor.BN(500);
    const [newSessionPda, newSessionBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), Buffer.from(newSessionId)],
      program.programId
    );

    await program.methods
      .createSession(newSessionId, newSessionAmount)
      .accounts({
        session: newSessionPda,
        expert: expert.publicKey,
        shopper: shopper.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([shopper])
      .rpc();

    // Start the session to make it active
    await program.methods
      .startSession(newSessionId)
      .accounts({
        session: newSessionPda,
        expert: expert.publicKey,
      })
      .signers([expert])
      .rpc();

    try {
      await program.methods
        .startSession(newSessionId)
        .accounts({
          session: newSessionPda,
          expert: expert.publicKey,
        })
        .signers([expert])
        .rpc();
      expect.fail("Should have failed with invalid status error");
    } catch (err) {
      expect(err.error.errorMessage).to.include("Invalid session status");
    }
  });

  it("Should end a session", async () => {
    // Create a new session and start it to be able to end it
    const endSessionId = "test-session-end";
    const endSessionAmount = new anchor.BN(2000);
    const [endSessionPda, endSessionBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), Buffer.from(endSessionId)],
      program.programId
    );

    await program.methods
      .createSession(endSessionId, endSessionAmount)
      .accounts({
        session: endSessionPda,
        expert: expert.publicKey,
        shopper: shopper.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([shopper])
      .rpc();

    await program.methods
      .startSession(endSessionId)
      .accounts({
        session: endSessionPda,
        expert: expert.publicKey,
      })
      .signers([expert])
      .rpc();

    await program.methods
      .endSession(endSessionId)
      .accounts({
        session: endSessionPda,
        expert: expert.publicKey,
      })
      .signers([expert])
      .rpc();

    const sessionAccount = await program.account.sessionAccount.fetch(endSessionPda);
    expect(sessionAccount.status).to.eql({ completed: {} });
    expect(sessionAccount.endTime.toNumber()).to.be.closeTo(Date.now() / 1000, 5);
  });

  it("Should not end a session if not expert", async () => {
    // Create a new session and start it to be able to end it
    const endSessionIdUnauthorized = "test-session-end-unauth";
    const endSessionAmountUnauthorized = new anchor.BN(2000);
    const [endSessionPdaUnauthorized, endSessionBumpUnauthorized] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), Buffer.from(endSessionIdUnauthorized)],
      program.programId
    );

    await program.methods
      .createSession(endSessionIdUnauthorized, endSessionAmountUnauthorized)
      .accounts({
        session: endSessionPdaUnauthorized,
        expert: expert.publicKey,
        shopper: shopper.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([shopper])
      .rpc();

    await program.methods
      .startSession(endSessionIdUnauthorized)
      .accounts({
        session: endSessionPdaUnauthorized,
        expert: expert.publicKey,
      })
      .signers([expert])
      .rpc();

    try {
      await program.methods
        .endSession(endSessionIdUnauthorized)
        .accounts({
          session: endSessionPdaUnauthorized,
          expert: shopper.publicKey, // Try to end as shopper
        })
        .signers([shopper])
        .rpc();
      expect.fail("Should have failed with unauthorized error");
    } catch (err) {
      expect(err.error.errorMessage).to.include("Unauthorized action");
    }
  });

  it("Should not end a session if not active", async () => {
    // Create a new session for this test to ensure it's in a non-active state
    const endSessionIdNonActive = "test-session-end-non-active";
    const endSessionAmountNonActive = new anchor.BN(500);
    const [endSessionPdaNonActive, endSessionBumpNonActive] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), Buffer.from(endSessionIdNonActive)],
      program.programId
    );

    await program.methods
      .createSession(endSessionIdNonActive, endSessionAmountNonActive)
      .accounts({
        session: endSessionPdaNonActive,
        expert: expert.publicKey,
        shopper: shopper.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([shopper])
      .rpc();

    try {
      await program.methods
        .endSession(endSessionIdNonActive)
        .accounts({
          session: endSessionPdaNonActive,
          expert: expert.publicKey,
        })
        .signers([expert])
        .rpc();
      expect.fail("Should have failed with invalid status error");
    } catch (err) {
      expect(err.error.errorMessage).to.include("Invalid session status");
    }
  });

  it("Should cancel a session by shopper", async () => {
    const cancelSessionIdShopper = "test-session-cancel-shopper";
    const cancelSessionAmountShopper = new anchor.BN(750);
    const [cancelSessionPdaShopper, cancelSessionBumpShopper] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), Buffer.from(cancelSessionIdShopper)],
      program.programId
    );

    await program.methods
      .createSession(cancelSessionIdShopper, cancelSessionAmountShopper)
      .accounts({
        session: cancelSessionPdaShopper,
        expert: expert.publicKey,
        shopper: shopper.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([shopper])
      .rpc();

    await program.methods
      .cancelSession(cancelSessionIdShopper)
      .accounts({
        session: cancelSessionPdaShopper,
        shopper: shopper.publicKey,
        expert: expert.publicKey, // Expert also needs to be passed for the check in the program
      })
      .signers([shopper, expert])
      .rpc();

    const sessionAccount = await program.account.sessionAccount.fetch(cancelSessionPdaShopper);
    expect(sessionAccount.status).to.eql({ cancelled: {} });
  });

  it("Should cancel a session by expert", async () => {
    const cancelSessionIdExpert = "test-session-cancel-expert";
    const cancelSessionAmountExpert = new anchor.BN(1200);
    const [cancelSessionPdaExpert, cancelSessionBumpExpert] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), Buffer.from(cancelSessionIdExpert)],
      program.programId
    );

    await program.methods
      .createSession(cancelSessionIdExpert, cancelSessionAmountExpert)
      .accounts({
        session: cancelSessionPdaExpert,
        expert: expert.publicKey,
        shopper: shopper.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([shopper])
      .rpc();

    await program.methods
      .cancelSession(cancelSessionIdExpert)
      .accounts({
        session: cancelSessionPdaExpert,
        shopper: shopper.publicKey, // Shopper also needs to be passed for the check in the program
        expert: expert.publicKey,
      })
      .signers([shopper, expert])
      .rpc();

    const sessionAccount = await program.account.sessionAccount.fetch(cancelSessionPdaExpert);
    expect(sessionAccount.status).to.eql({ cancelled: {} });
  });

  it("Should not cancel a session if not pending", async () => {
    // Create a new session and start it to make it non-pending
    const cancelSessionIdNonPending = "test-session-cancel-non-pending";
    const cancelSessionAmountNonPending = new anchor.BN(300);
    const [cancelSessionPdaNonPending, cancelSessionBumpNonPending] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), Buffer.from(cancelSessionIdNonPending)],
      program.programId
    );

    await program.methods
      .createSession(cancelSessionIdNonPending, cancelSessionAmountNonPending)
      .accounts({
        session: cancelSessionPdaNonPending,
        expert: expert.publicKey,
        shopper: shopper.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([shopper])
      .rpc();

    await program.methods
      .startSession(cancelSessionIdNonPending)
      .accounts({
        session: cancelSessionPdaNonPending,
        expert: expert.publicKey,
      })
      .signers([expert])
      .rpc();

    try {
      await program.methods
        .cancelSession(cancelSessionIdNonPending)
        .accounts({
          session: cancelSessionPdaNonPending,
          shopper: shopper.publicKey,
          expert: expert.publicKey,
        })
        .signers([shopper, expert])
        .rpc();
      expect.fail("Should have failed with invalid status error");
    } catch (err) {
      expect(err.error.errorMessage).to.include("Invalid session status");
    }
  });

  it("Should not cancel a session if unauthorized", async () => {
    const cancelSessionIdUnauthorized = "test-session-cancel-unauth";
    const cancelSessionAmountUnauthorized = new anchor.BN(900);
    const [cancelSessionPdaUnauthorized, cancelSessionBumpUnauthorized] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), Buffer.from(cancelSessionIdUnauthorized)],
      program.programId
    );

    await program.methods
      .createSession(cancelSessionIdUnauthorized, cancelSessionAmountUnauthorized)
      .accounts({
        session: cancelSessionPdaUnauthorized,
        expert: expert.publicKey,
        shopper: shopper.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([shopper])
      .rpc();

    const randomUser = Keypair.generate();
    await provider.connection.requestAirdrop(randomUser.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL);

    try {
      await program.methods
        .cancelSession(cancelSessionIdUnauthorized)
        .accounts({
          session: cancelSessionPdaUnauthorized,
          shopper: randomUser.publicKey, // Unauthorized user
          expert: randomUser.publicKey, // Unauthorized user
        })
        .signers([randomUser])
        .rpc();
      expect.fail("Should have failed with unauthorized error");
    } catch (err) {
      expect(err.error.errorMessage).to.include("Unauthorized action");
    }
  });
});
