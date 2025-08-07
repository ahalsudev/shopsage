use chrono::{DateTime, FixedOffset, Utc};
use sea_orm::*;
use uuid::Uuid;

use crate::database::DatabaseResult;
use crate::entities::{prelude::*, users};

pub struct UserSeeder;

impl UserSeeder {
  pub async fn seed(db: &DatabaseConnection) -> DatabaseResult<()> {
    tracing::info!("🌱 Seeding users...");

    // Check if users already exist to avoid duplicates
    let existing_count = Users::find().count(db).await?;
    if existing_count > 0 {
      tracing::info!("Users already exist, skipping user seeding");
      return Ok(());
    }

    let users_data = vec![
      // Shoppers
      users::ActiveModel {
        id: Set(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440001").unwrap()),
        wallet_address: Set("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM".to_string()),
        name: Set("Alice Johnson".to_string()),
        email: Set("alice.johnson@example.com".to_string()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      users::ActiveModel {
        id: Set(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440002").unwrap()),
        wallet_address: Set("2WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWN".to_string()),
        name: Set("Bob Smith".to_string()),
        email: Set("bob.smith@example.com".to_string()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      users::ActiveModel {
        id: Set(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440003").unwrap()),
        wallet_address: Set("3WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWO".to_string()),
        name: Set("Carol Davis".to_string()),
        email: Set("carol.davis@example.com".to_string()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      // Experts
      users::ActiveModel {
        id: Set(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440011").unwrap()),
        wallet_address: Set("EWzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWW1".to_string()),
        name: Set("Dr. Sarah Wilson".to_string()),
        email: Set("sarah.wilson@example.com".to_string()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      users::ActiveModel {
        id: Set(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440012").unwrap()),
        wallet_address: Set("FWzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWW2".to_string()),
        name: Set("Michael Chen".to_string()),
        email: Set("michael.chen@example.com".to_string()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      users::ActiveModel {
        id: Set(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440013").unwrap()),
        wallet_address: Set("GWzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWW3".to_string()),
        name: Set("Jessica Rodriguez".to_string()),
        email: Set("jessica.rodriguez@example.com".to_string()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      users::ActiveModel {
        id: Set(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440014").unwrap()),
        wallet_address: Set("HWzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWW4".to_string()),
        name: Set("David Kumar".to_string()),
        email: Set("david.kumar@example.com".to_string()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      users::ActiveModel {
        id: Set(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440015").unwrap()),
        wallet_address: Set("IWzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWW5".to_string()),
        name: Set("Emily Foster".to_string()),
        email: Set("emily.foster@example.com".to_string()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
    ];

    // Insert all users
    Users::insert_many(users_data).exec(db).await?;

    tracing::info!("✅ Successfully seeded {} users", 8);
    Ok(())
  }

  pub async fn clear(db: &DatabaseConnection) -> DatabaseResult<()> {
    tracing::info!("🧹 Clearing users...");

    Users::delete_many().exec(db).await?;

    tracing::info!("✅ Users cleared");
    Ok(())
  }

  // Helper methods to get seeded user IDs for other seeders
  pub fn get_shopper_ids() -> Vec<Uuid> {
    vec![
      Uuid::parse_str("550e8400-e29b-41d4-a716-446655440001").unwrap(),
      Uuid::parse_str("550e8400-e29b-41d4-a716-446655440002").unwrap(),
      Uuid::parse_str("550e8400-e29b-41d4-a716-446655440003").unwrap(),
    ]
  }

  pub fn get_expert_ids() -> Vec<Uuid> {
    vec![
      Uuid::parse_str("550e8400-e29b-41d4-a716-446655440011").unwrap(),
      Uuid::parse_str("550e8400-e29b-41d4-a716-446655440012").unwrap(),
      Uuid::parse_str("550e8400-e29b-41d4-a716-446655440013").unwrap(),
      Uuid::parse_str("550e8400-e29b-41d4-a716-446655440014").unwrap(),
      Uuid::parse_str("550e8400-e29b-41d4-a716-446655440015").unwrap(),
    ]
  }
}
