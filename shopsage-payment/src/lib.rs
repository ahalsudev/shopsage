use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Transfer};

declare_id!("6cMZaPoG9diMkt9ZAjM4QVKiTzEEnS5X5m3Rk4KD2GiH");

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

        let expert_transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.shopper_token_account.to_account_info(),
                to: ctx.accounts.expert_token_account.to_account_info(),
                authority: ctx.accounts.shopper.to_account_info(),
            },
        );
        token::transfer(expert_transfer_ctx, expert_commission)?;

        let platform_transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.shopper_token_account.to_account_info(),
                to: ctx.accounts.platform_token_account.to_account_info(),
                authority: ctx.accounts.shopper.to_account_info(),
            },
        );
        token::transfer(platform_transfer_ctx, platform_commission)?;

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
    /// CHECK: shopper's token account - validated by token program
    #[account(mut)]
    pub shopper_token_account: AccountInfo<'info>,
    /// CHECK: expert's token account - validated by token program
    #[account(mut)]
    pub expert_token_account: AccountInfo<'info>,
    /// CHECK: platform's token account - validated by token program
    #[account(mut)]
    pub platform_token_account: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
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
