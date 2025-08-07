import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ShopsagePayment } from "../target/types/shopsage_payment";
import { expect } from "chai";

describe("shopsage-payment", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ShopsagePayment as Program<ShopsagePayment>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  let paymentAccountPda: PublicKey;
  let bump: number;
  let shopper: Keypair;
  let expert: Keypair;
  let platform: Keypair;

  before(async () => {
    [paymentAccountPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("payment")],
      program.programId
    );

    // Create test accounts
    shopper = Keypair.generate();
    expert = Keypair.generate();
    platform = Keypair.generate();

    // Fund shopper account with SOL for testing
    const connection = provider.connection;
    const airdropTx = await connection.requestAirdrop(shopper.publicKey, 5 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropTx);
  });

  it("Should initialize payment account", async () => {
    const consultationFee = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL

    const tx = await program.methods
      .initializePayment(consultationFee)
      .accountsPartial({
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize payment transaction signature:", tx);

    // Fetch the account to verify initialization
    const paymentAccount = await program.account.paymentAccount.fetch(paymentAccountPda);
    
    expect(paymentAccount.authority.toString()).to.equal(provider.wallet.publicKey.toString());
    expect(paymentAccount.consultationFee.toString()).to.equal(consultationFee.toString());
    expect(paymentAccount.bump).to.equal(bump);
  });

  it("Should have correct payment account data", async () => {
    const paymentAccount = await program.account.paymentAccount.fetch(paymentAccountPda);
    
    expect(paymentAccount.authority).to.be.instanceOf(PublicKey);
    expect(paymentAccount.consultationFee.toNumber()).to.be.greaterThan(0);
    expect(paymentAccount.bump).to.be.a('number');
  });

  it("Should process consultation payment with correct splits", async () => {
    const paymentAmount = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL
    const connection = provider.connection;

    // Get initial balances
    const initialShopperBalance = await connection.getBalance(shopper.publicKey);
    const initialExpertBalance = await connection.getBalance(expert.publicKey);
    const initialPlatformBalance = await connection.getBalance(platform.publicKey);

    const tx = await program.methods
      .processConsultationPayment(paymentAmount)
      .accountsPartial({
        paymentAccount: paymentAccountPda,
        shopper: shopper.publicKey,
        expert: expert.publicKey,
        platform: platform.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([shopper])
      .rpc();

    console.log("Process payment transaction signature:", tx);

    // Get final balances
    const finalShopperBalance = await connection.getBalance(shopper.publicKey);
    const finalExpertBalance = await connection.getBalance(expert.publicKey);
    const finalPlatformBalance = await connection.getBalance(platform.publicKey);

    // Calculate expected amounts (80% to expert, 20% to platform)
    const expertCommission = paymentAmount.toNumber() * 80 / 100;
    const platformCommission = paymentAmount.toNumber() * 20 / 100;

    // Verify balances changed correctly
    expect(finalExpertBalance - initialExpertBalance).to.equal(expertCommission);
    expect(finalPlatformBalance - initialPlatformBalance).to.equal(platformCommission);
    
    // Shopper should have paid the full amount plus transaction fees
    const shopperPaid = initialShopperBalance - finalShopperBalance;
    expect(shopperPaid).to.be.greaterThanOrEqual(paymentAmount.toNumber()); // Includes tx fees
    
    // Verify the total paid out equals the payment amount
    const totalPaidOut = (finalExpertBalance - initialExpertBalance) + (finalPlatformBalance - initialPlatformBalance);
    expect(totalPaidOut).to.equal(paymentAmount.toNumber());
  });
});