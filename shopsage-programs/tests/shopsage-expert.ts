import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { ShopsageExpert } from "../target/types/shopsage_expert";
import { expect } from "chai";

describe("shopsage-expert", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ShopsageExpert as Program<ShopsageExpert>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  it("Should register an expert", async () => {
    const name = "Test Expert";
    const specialization = "Test Specialization";
    const sessionRate = new anchor.BN(100);

    const [expertPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("expert"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerExpert(name, specialization, sessionRate)
      .accounts({
        expert: expertPda,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const expertAccount = await program.account.expertAccount.fetch(expertPda);

    expect(expertAccount.authority.toString()).to.equal(provider.wallet.publicKey.toString());
    expect(expertAccount.name).to.equal(name);
    expect(expertAccount.specialization).to.equal(specialization);
    expect(expertAccount.sessionRate.toNumber()).to.equal(sessionRate.toNumber());
    expect(expertAccount.rating.toNumber()).to.equal(0);
    expect(expertAccount.totalConsultations.toNumber()).to.equal(0);
    expect(expertAccount.isVerified).to.be.false;
    expect(expertAccount.isOnline).to.be.false;
  });
});