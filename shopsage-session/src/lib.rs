use anchor_lang::prelude::*;

declare_id!("BE2PGfJWduNCchbXfX392oP4P2BCbNwHdWA3JpjVxjh9");

#[program]
pub mod shopsage_session {
    use super::*;

    pub fn create_session(
        ctx: Context<CreateSession>,
        session_id: String,
        amount: u64,
    ) -> Result<()> {
        let session = &mut ctx.accounts.session;
        session.session_id = session_id;
        session.expert = ctx.accounts.expert.key();
        session.shopper = ctx.accounts.shopper.key();
        session.amount = amount;
        session.status = SessionStatus::Pending;
        session.start_time = Clock::get()?.unix_timestamp;
        session.bump = ctx.bumps.session;
        Ok(())
    }

    pub fn start_session(ctx: Context<StartSession>, session_id: String) -> Result<()> {
        let session = &mut ctx.accounts.session;
        require!(
            session.status == SessionStatus::Pending,
            SessionError::InvalidStatus
        );
        require!(
            session.expert == ctx.accounts.expert.key(),
            SessionError::Unauthorized
        );

        session.status = SessionStatus::Active;
        session.actual_start_time = Some(Clock::get()?.unix_timestamp);
        Ok(())
    }

    // Todo: have end_session call payment program to process payments
    pub fn end_session(ctx: Context<EndSession>, session_id: String) -> Result<()> {
        let session = &mut ctx.accounts.session;
        require!(
            session.status == SessionStatus::Active,
            SessionError::InvalidStatus
        );
        require!(
            session.expert == ctx.accounts.expert.key(),
            SessionError::Unauthorized
        );

        session.status = SessionStatus::Completed;
        session.end_time = Some(Clock::get()?.unix_timestamp);
        Ok(())
    }

    // Todo: have different cancellation instruction for experts and shoppers
    pub fn cancel_session(ctx: Context<CancelSession>, session_id: String) -> Result<()> {
        let session = &mut ctx.accounts.session;
        require!(
            session.status == SessionStatus::Pending,
            SessionError::InvalidStatus
        );
        require!(
            session.shopper == ctx.accounts.shopper.key()
                || session.expert == ctx.accounts.expert.key(),
            SessionError::Unauthorized
        );

        session.status = SessionStatus::Cancelled;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(session_id: String)]
pub struct CreateSession<'info> {
    #[account(
        init,
        payer = shopper,
        space = 8 + SessionAccount::INIT_SPACE,
        seeds = [b"session", session_id.as_bytes()],
        bump
    )]
    pub session: Account<'info, SessionAccount>,
    /// CHECK: expert account - we just need the pubkey for reference
    pub expert: AccountInfo<'info>,
    #[account(mut)]
    pub shopper: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(session_id: String)]
pub struct StartSession<'info> {
    #[account(
        mut,
        seeds = [b"session", session_id.as_bytes()],
        bump = session.bump
    )]
    pub session: Account<'info, SessionAccount>,
    pub expert: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(session_id: String)]
pub struct EndSession<'info> {
    #[account(
        mut,
        seeds = [b"session", session_id.as_bytes()],
        bump = session.bump
    )]
    pub session: Account<'info, SessionAccount>,
    pub expert: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(session_id: String)]
pub struct CancelSession<'info> {
    #[account(
        mut,
        seeds = [b"session", session_id.as_bytes()],
        bump = session.bump
    )]
    pub session: Account<'info, SessionAccount>,
    pub shopper: Signer<'info>,
    pub expert: Signer<'info>,
}

// Todo: ensure session PDA is unique
#[account]
#[derive(InitSpace)]
pub struct SessionAccount {
    #[max_len(50)]
    pub session_id: String,
    pub expert: Pubkey,
    pub shopper: Pubkey,
    pub amount: u64,
    pub status: SessionStatus,
    pub start_time: i64,
    pub actual_start_time: Option<i64>,
    pub end_time: Option<i64>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum SessionStatus {
    Pending,
    Active,
    Completed,
    Cancelled,
}

#[error_code]
pub enum SessionError {
    #[msg("Invalid session status")]
    InvalidStatus,
    #[msg("Unauthorized action")]
    Unauthorized,
}

impl SessionAccount {
    pub const INIT_SPACE: usize = 54 + 32 + 32 + 8 + 1 + 8 + 9 + 9 + 1;
}
