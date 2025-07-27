use anchor_lang::prelude::*;

declare_id!("96WDSiHJAPs4WmTVn8Yv5JnnWgZR8rz6JCCJiwWBn2Me");

#[program]
pub mod shopsage_expert {
    use super::*;

    pub fn register_expert(
        ctx: Context<RegisterExpert>,
        name: String,
        specialization: String,
        hourly_rate: u64,
    ) -> Result<()> {
        let expert = &mut ctx.accounts.expert;
        expert.authority = ctx.accounts.authority.key();
        expert.name = name;
        expert.specialization = specialization;
        expert.hourly_rate = hourly_rate;
        expert.rating = 0;
        expert.total_consultations = 0;
        expert.is_verified = false;
        expert.is_online = false;
        expert.bump = ctx.bumps.expert;
        Ok(())
    }

    pub fn update_expert_status(ctx: Context<UpdateExpertStatus>, is_online: bool) -> Result<()> {
        let expert = &mut ctx.accounts.expert;
        expert.is_online = is_online;
        Ok(())
    }

    // Todo: this should be called by a shopper. We need to create a shopper account and
    // link this instruction with the session program
    pub fn update_expert_rating(ctx: Context<UpdateExpertRating>, new_rating: u8) -> Result<()> {
        let expert = &mut ctx.accounts.expert;
        let total_consultations = expert.total_consultations;

        let current_total = expert.rating * total_consultations;
        let new_total = current_total + new_rating as u64;
        expert.total_consultations += 1;
        expert.rating = new_total / expert.total_consultations;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct RegisterExpert<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ExpertAccount::INIT_SPACE,
        seeds = [b"expert", authority.key().as_ref()],
        bump
    )]
    pub expert: Account<'info, ExpertAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateExpertStatus<'info> {
    #[account(
        mut,
        seeds = [b"expert", authority.key().as_ref()],
        bump = expert.bump,
        has_one = authority
    )]
    pub expert: Account<'info, ExpertAccount>,
    pub authority: Signer<'info>,
}

// Todo: update authority to shopper account
#[derive(Accounts)]
pub struct UpdateExpertRating<'info> {
    #[account(
        mut,
        seeds = [b"expert", expert.authority.as_ref()],
        bump = expert.bump,
        has_one = authority
    )]
    pub expert: Account<'info, ExpertAccount>,
    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct ExpertAccount {
    pub authority: Pubkey,
    #[max_len(50)]
    pub name: String,
    #[max_len(50)]
    pub specialization: String,
    pub hourly_rate: u64,
    pub rating: u64,
    pub total_consultations: u64,
    pub is_verified: bool,
    pub is_online: bool,
    pub bump: u8,
}

impl ExpertAccount {
    pub const INIT_SPACE: usize = 32 + 4 + 50 + 4 + 50 + 8 + 8 + 8 + 1 + 1 + 1;
}
