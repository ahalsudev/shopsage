use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("GN61kESLP3vmVREX6nhTfqEf94vyuLX8YK4trEv6u6cZ");

#[program]
pub mod shopsage_payment {
    use super::*;

    pub fn initialize_payment(
        ctx: Context<InitializePayment>,
        consultation_fee: u64,
    ) -> Result<()> {
        let payment_account = &mut ctx.accounts.payment_account;
        payment_account.authority = ctx.accounts.authority.key();
        payment_account.consultation_fee = consultation_fee;
        payment_account.bump = ctx.bumps.payment_account;
        Ok(())
    }

    // Todo: ensure session has completed in session program
    pub fn process_consultation_payment(ctx: Context<ProcessPayment>, amount: u64) -> Result<()> {
        let expert_commission = amount * 80 / 100;
        let platform_commission = amount - expert_commission;

        // Transfer 80% to expert
        let expert_transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.shopper.to_account_info(),
                to: ctx.accounts.expert.to_account_info(),
            },
        );
        system_program::transfer(expert_transfer_ctx, expert_commission)?;

        // Transfer 20% to platform
        let platform_transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.shopper.to_account_info(),
                to: ctx.accounts.platform.to_account_info(),
            },
        );
        system_program::transfer(platform_transfer_ctx, platform_commission)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePayment<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PaymentAccount::INIT_SPACE,
        seeds = [b"payment"],
        bump
    )]
    pub payment_account: Account<'info, PaymentAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(mut)]
    pub payment_account: Account<'info, PaymentAccount>,
    #[account(mut)]
    pub shopper: Signer<'info>,
    /// CHECK: expert account to receive SOL payment
    #[account(mut)]
    pub expert: AccountInfo<'info>,
    /// CHECK: platform account to receive SOL commission
    #[account(mut)]
    pub platform: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct PaymentAccount {
    pub authority: Pubkey,
    pub consultation_fee: u64,
    pub bump: u8,
}

impl PaymentAccount {
    pub const INIT_SPACE: usize = 32 + 8 + 1;
}
