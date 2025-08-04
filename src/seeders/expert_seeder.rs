use chrono::{FixedOffset, NaiveTime, Utc};
use rust_decimal::{prelude::FromPrimitive, Decimal};
use sea_orm::*;
use uuid::Uuid;

use super::user_seeder::UserSeeder;
use crate::database::DatabaseResult;
use crate::entities::{expert_availability, expert_profiles, expert_stats, prelude::*};

pub struct ExpertSeeder;

impl ExpertSeeder {
  pub async fn seed(db: &DatabaseConnection) -> DatabaseResult<()> {
    tracing::info!("🌱 Seeding expert profiles, stats, and availability...");

    // Check if expert profiles already exist
    let existing_count = ExpertProfiles::find().count(db).await?;
    if existing_count > 0 {
      tracing::info!("Expert profiles already exist, skipping expert seeding");
      return Ok(());
    }

    let expert_ids = UserSeeder::get_expert_ids();

    // Seed expert profiles
    Self::seed_expert_profiles(db, &expert_ids).await?;

    // Seed expert stats
    Self::seed_expert_stats(db, &expert_ids).await?;

    // Seed expert availability
    Self::seed_expert_availability(db, &expert_ids).await?;

    tracing::info!("✅ Successfully seeded all expert data");
    Ok(())
  }

  async fn seed_expert_profiles(
    db: &DatabaseConnection,
    expert_ids: &[Uuid],
  ) -> DatabaseResult<()> {
    let expert_profiles_data = vec![
      expert_profiles::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(expert_ids[0]),
        specialization: Set("Fashion & Style Consultant".to_string()),
        bio: Set("Dr. Sarah Wilson is a renowned fashion consultant.".to_string()),
        session_rate: Set(Decimal::from(85)),
        rating: Set(Decimal::from_f32(4.8).unwrap()),
        total_consultations: Set(247),
        is_verified: Set(true),
        is_online: Set(true),
        profile_image_url: Set(
          "https://images.unsplash.com/photo-1494790108755-2616b056ae6c?w=300".to_string(),
        ),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      expert_profiles::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(expert_ids[1]),
        specialization: Set("Technology & Gadgets Specialist".to_string()),
        bio: Set("Michael Chen is a senior software engineer.".to_string()),
        session_rate: Set(Decimal::from(120)),
        rating: Set(Decimal::from_f32(4.9).unwrap()),
        total_consultations: Set(189),
        is_verified: Set(true),
        is_online: Set(false),
        profile_image_url: Set(
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300".to_string(),
        ),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      expert_profiles::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(expert_ids[2]),
        specialization: Set("Beauty & Skincare Consultant".to_string()),
        bio: Set("Jessica Rodriguez is a licensed esthetician.".to_string()),
        session_rate: Set(Decimal::from(75)),
        rating: Set(Decimal::from_f32(4.7).unwrap()),
        total_consultations: Set(312),
        is_verified: Set(true),
        is_online: Set(true),
        profile_image_url: Set(
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300".to_string(),
        ),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      expert_profiles::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(expert_ids[3]),
        specialization: Set("Gaming & Electronics Advisor".to_string()),
        bio: Set("David Kumar is a professional esports coach.".to_string()),
        session_rate: Set(Decimal::from(95)),
        rating: Set(Decimal::from_f32(4.6).unwrap()),
        total_consultations: Set(156),
        is_verified: Set(true),
        is_online: Set(true),
        profile_image_url: Set(
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300".to_string(),
        ),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      expert_profiles::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(expert_ids[4]),
        specialization: Set("Health & Wellness Coach".to_string()),
        bio: Set("Emily Foster is a certified health coach.".to_string()),
        session_rate: Set(Decimal::from(65)),
        rating: Set(Decimal::from_f32(4.5).unwrap()),
        total_consultations: Set(203),
        is_verified: Set(true),
        is_online: Set(true),
        profile_image_url: Set(
          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300".to_string(),
        ),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
    ];

    ExpertProfiles::insert_many(expert_profiles_data)
      .exec(db)
      .await?;

    tracing::info!(
      "✅ Successfully seeded {} expert profiles",
      expert_ids.len()
    );
    Ok(())
  }

  async fn seed_expert_stats(db: &DatabaseConnection, expert_ids: &[Uuid]) -> DatabaseResult<()> {
    let expert_stats_data = vec![
      expert_stats::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(expert_ids[0]),
        total_earnings: Set(Decimal::from(20995)),
        total_hours: Set(Decimal::from_f32(247.0).unwrap()),
        response_time: Set(Decimal::from_f32(12.5).unwrap()),
        satisfaction: Set(Decimal::from_f32(96.2).unwrap()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      expert_stats::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(expert_ids[1]),
        total_earnings: Set(Decimal::from(22680)),
        total_hours: Set(Decimal::from_f32(189.0).unwrap()),
        response_time: Set(Decimal::from_f32(8.2).unwrap()),
        satisfaction: Set(Decimal::from_f32(98.1).unwrap()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      expert_stats::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(expert_ids[2]),
        total_earnings: Set(Decimal::from(23400)),
        total_hours: Set(Decimal::from_f32(312.0).unwrap()),
        response_time: Set(Decimal::from_f32(15.3).unwrap()),
        satisfaction: Set(Decimal::from_f32(94.7).unwrap()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      expert_stats::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(expert_ids[3]),
        total_earnings: Set(Decimal::from(14820)),
        total_hours: Set(Decimal::from_f32(156.0).unwrap()),
        response_time: Set(Decimal::from_f32(18.7).unwrap()),
        satisfaction: Set(Decimal::from_f32(92.4).unwrap()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
      expert_stats::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(expert_ids[4]),
        total_earnings: Set(Decimal::from(13195)),
        total_hours: Set(Decimal::from_f32(203.0).unwrap()),
        response_time: Set(Decimal::from_f32(10.1).unwrap()),
        satisfaction: Set(Decimal::from_f32(98.8).unwrap()),
        created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      },
    ];

    ExpertStats::insert_many(expert_stats_data).exec(db).await?;

    tracing::info!("✅ Successfully seeded {} expert stats", expert_ids.len());
    Ok(())
  }

  async fn seed_expert_availability(
    db: &DatabaseConnection,
    expert_ids: &[Uuid],
  ) -> DatabaseResult<()> {
    let mut availability_data = Vec::new();

    // Create availability for each expert (Monday to Friday, 9 AM to 5 PM)
    for &expert_id in expert_ids {
      let weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

      for day in weekdays {
        availability_data.push(expert_availability::ActiveModel {
          id: Set(Uuid::new_v4()),
          user_id: Set(expert_id),
          day_of_week: Set(day.to_string()),
          start_time: Set(NaiveTime::from_hms_opt(9, 0, 0).unwrap()),
          end_time: Set(NaiveTime::from_hms_opt(17, 0, 0).unwrap()),
          available: Set(true),
          timezone: Set("UTC".to_string()),
          created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
          updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
        });
      }
    }

    ExpertAvailability::insert_many(availability_data)
      .exec(db)
      .await?;

    tracing::info!(
      "✅ Successfully seeded expert availability for {} experts",
      expert_ids.len()
    );
    Ok(())
  }

  pub async fn clear(db: &DatabaseConnection) -> DatabaseResult<()> {
    tracing::info!("🧹 Clearing expert data...");

    ExpertAvailability::delete_many().exec(db).await?;
    ExpertStats::delete_many().exec(db).await?;
    ExpertProfiles::delete_many().exec(db).await?;

    tracing::info!("✅ Expert data cleared");
    Ok(())
  }
}
