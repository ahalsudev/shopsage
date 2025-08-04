use crate::database::DatabaseResult;
use sea_orm::*;

pub mod expert_seeder;
pub mod shopper_seeder;
pub mod user_seeder;

pub struct Seeder;

impl Seeder {
  pub async fn run_all(db: &DatabaseConnection) -> DatabaseResult<()> {
    tracing::info!("🌱 Starting database seeding...");

    // Seed users first (they're referenced by other tables)
    user_seeder::UserSeeder::seed(db).await?;

    // Seed profiles (these depend on users)
    shopper_seeder::ShopperSeeder::seed(db).await?;
    expert_seeder::ExpertSeeder::seed(db).await?;

    tracing::info!("✅ Database seeding completed successfully!");
    Ok(())
  }

  pub async fn clear_all(db: &DatabaseConnection) -> DatabaseResult<()> {
    tracing::info!("🧹 Clearing all seeded data...");

    // Clear in reverse order due to foreign key constraints
    expert_seeder::ExpertSeeder::clear(db).await?;
    shopper_seeder::ShopperSeeder::clear(db).await?;
    user_seeder::UserSeeder::clear(db).await?;

    tracing::info!("✅ All seeded data cleared!");
    Ok(())
  }
}
