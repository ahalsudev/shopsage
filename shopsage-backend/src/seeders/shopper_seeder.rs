use chrono::{FixedOffset, Utc};
use rust_decimal::{prelude::FromPrimitive, Decimal};
use sea_orm::*;
use serde_json::json;
use uuid::Uuid;

use super::user_seeder::UserSeeder;
use crate::database::DatabaseResult;
use crate::entities::{prelude::*, shopper_profiles};

pub struct ShopperSeeder;

impl ShopperSeeder {
  pub async fn seed(db: &DatabaseConnection) -> DatabaseResult<()> {
    tracing::info!("🌱 Seeding shopper profiles...");

    // Check if shopper profiles already exist
    let existing_count = ShopperProfiles::find().count(db).await?;
    if existing_count > 0 {
      tracing::info!("Shopper profiles already exist, skipping shopper seeding");
      return Ok(());
    }

    let shopper_ids = UserSeeder::get_shopper_ids();
    let expert_ids = UserSeeder::get_expert_ids();

    let shopper_profiles_data = vec![
      // Alice Johnson - Fashion enthusiast
      shopper_profiles::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(shopper_ids[0]),
        categories: Set(json!(["Fashion & Style", "Beauty & Skincare", "Shopping"])),
        price_range_min: Set(Decimal::from(25)),
        price_range_max: Set(Decimal::from(150)),
        preferred_experts: Set(json!([
          expert_ids[0].to_string(),
          expert_ids[2].to_string()
        ])),
        saved_experts: Set(json!([expert_ids[0].to_string()])),
        interests: Set(json!([
          "Sustainable Fashion",
          "Vintage Style",
          "Minimalist Wardrobe"
        ])),
        total_sessions: Set(12),
        total_spent: Set(Decimal::from_f32(1450.75).unwrap()),
        average_rating: Set(Decimal::from_f32(4.8).unwrap()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      // Bob Smith - Tech enthusiast
      shopper_profiles::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(shopper_ids[1]),
        categories: Set(json!([
          "Technology & Gadgets",
          "Gaming & Electronics",
          "Smart Home"
        ])),
        price_range_min: Set(Decimal::from(50)),
        price_range_max: Set(Decimal::from(500)),
        preferred_experts: Set(json!([
          expert_ids[1].to_string(),
          expert_ids[3].to_string()
        ])),
        saved_experts: Set(json!([
          expert_ids[1].to_string(),
          expert_ids[3].to_string()
        ])),
        interests: Set(json!([
          "Latest Tech",
          "Gaming Gear",
          "AI & Machine Learning",
          "Productivity Tools"
        ])),
        total_sessions: Set(8),
        total_spent: Set(Decimal::from_f32(2340.00).unwrap()),
        average_rating: Set(Decimal::from_f32(4.9).unwrap()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      // Carol Davis - Health & wellness focused
      shopper_profiles::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(shopper_ids[2]),
        categories: Set(json!(["Health & Wellness", "Beauty & Skincare", "Fitness"])),
        price_range_min: Set(Decimal::from(20)),
        price_range_max: Set(Decimal::from(200)),
        preferred_experts: Set(json!([
          expert_ids[4].to_string(),
          expert_ids[2].to_string()
        ])),
        saved_experts: Set(json!([expert_ids[4].to_string()])),
        interests: Set(json!([
          "Natural Products",
          "Wellness Coaching",
          "Skincare Routines",
          "Meditation"
        ])),
        total_sessions: Set(15),
        total_spent: Set(Decimal::from_f32(980.50).unwrap()),
        average_rating: Set(Decimal::from_f32(4.7).unwrap()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
    ];

    ShopperProfiles::insert_many(shopper_profiles_data)
      .exec(db)
      .await?;

    tracing::info!(
      "✅ Successfully seeded {} shopper profiles",
      shopper_ids.len()
    );
    Ok(())
  }

  pub async fn clear(db: &DatabaseConnection) -> DatabaseResult<()> {
    tracing::info!("🧹 Clearing shopper profiles...");

    ShopperProfiles::delete_many().exec(db).await?;

    tracing::info!("✅ Shopper profiles cleared");
    Ok(())
  }
}
