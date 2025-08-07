use chrono::{FixedOffset, Utc};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;
use validator::Validate;

use crate::database::DatabaseResult;
use crate::entities::{
  expert_availability, expert_profiles, expert_stats, prelude::*, shopper_profiles, users,
};

// Frontend-compatible types (matching React Redux interface)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
  pub id: String,
  #[serde(rename = "walletAddress")]
  pub wallet_address: String,
  pub name: String,
  pub email: Option<String>,
  #[serde(rename = "createdAt")]
  pub created_at: String,
  #[serde(rename = "updatedAt")]
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserCompleteProfile {
  pub user: UserProfile,
  pub shopper: Option<ShopperProfile>,
  pub expert: Option<ExpertProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShopperProfile {
  pub preferences: ShopperPreferences,
  #[serde(rename = "consultationHistory")]
  pub consultation_history: ConsultationHistory,
  #[serde(rename = "savedExperts")]
  pub saved_experts: Vec<String>,
  pub interests: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShopperPreferences {
  pub categories: Vec<String>,
  #[serde(rename = "priceRange")]
  pub price_range: PriceRange,
  #[serde(rename = "preferredExperts")]
  pub preferred_experts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceRange {
  pub min: f64,
  pub max: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsultationHistory {
  #[serde(rename = "totalSessions")]
  pub total_sessions: i32,
  #[serde(rename = "totalSpent")]
  pub total_spent: f64,
  #[serde(rename = "averageRating")]
  pub average_rating: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpertProfile {
  pub id: Uuid,
  pub user_id: Uuid,
  pub specialization: String,
  pub bio: String,
  #[serde(rename = "sessionRate")]
  pub session_rate: f64,
  pub rating: f64,
  #[serde(rename = "totalConsultations")]
  pub total_consultations: i32,
  #[serde(rename = "isVerified")]
  pub is_verified: bool,
  #[serde(rename = "isOnline")]
  pub is_online: bool,
  pub availability: Availability,
  #[serde(rename = "profileImageUrl")]
  pub profile_image_url: Option<String>,
  pub stats: ExpertStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Availability {
  pub schedule: HashMap<String, ScheduleSlot>,
  pub timezone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleSlot {
  pub start: String,
  pub end: String,
  pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpertStats {
  #[serde(rename = "totalEarnings")]
  pub total_earnings: f64,
  #[serde(rename = "totalHours")]
  pub total_hours: f64,
  #[serde(rename = "responseTime")]
  pub response_time: f64,
  pub satisfaction: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
  Shopper,
  Expert,
}

// Request types
#[derive(Debug, Deserialize, Validate)]
pub struct CreateUserRequest {
  #[validate(length(min = 32, max = 64))]
  pub wallet_address: String,
  #[validate(length(min = 1, max = 100))]
  pub name: String,
  #[validate(email)]
  pub email: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateUserRequest {
  #[validate(length(min = 1, max = 100))]
  pub name: Option<String>,
  #[validate(email)]
  pub email: Option<String>,
}

pub struct UserService;

impl UserService {
  pub async fn find_by_wallet_address(
    db: &DatabaseConnection,
    wallet_address: &str,
  ) -> DatabaseResult<Option<UserCompleteProfile>> {
    let user_model = Users::find()
      .filter(users::Column::WalletAddress.eq(wallet_address))
      .one(db)
      .await?;

    if let Some(user_model) = user_model {
      let user = Self::build_user_from_model(&user_model, db).await?;
      Ok(Some(user))
    } else {
      Ok(None)
    }
  }

  pub async fn find_by_id(
    db: &DatabaseConnection,
    id: Uuid,
  ) -> DatabaseResult<Option<UserProfile>> {
    let user_model = Users::find_by_id(id).one(db).await?;

    if let Some(user_model) = user_model {
      let user = Self::build_user_from_model(&user_model, db).await?;
      Ok(Some(user.user))
    } else {
      Ok(None)
    }
  }

  pub async fn create(
    db: &DatabaseConnection,
    request: CreateUserRequest,
  ) -> DatabaseResult<UserCompleteProfile> {
    let user_active_model = users::ActiveModel {
      id: Set(Uuid::new_v4()),
      wallet_address: Set(request.wallet_address),
      name: Set(request.name),
      email: Set(request.email.unwrap_or_default()),
      created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
    };

    let user_model = user_active_model.insert(db).await?;

    // Create associated profiles (shopper and expert) for all users
    let shopper_profile = shopper_profiles::ActiveModel {
      id: Set(Uuid::new_v4()),
      user_id: Set(user_model.id),
      categories: Set(json!([])),
      price_range_min: Set(rust_decimal::Decimal::from(0)),
      price_range_max: Set(rust_decimal::Decimal::from(5)),
      preferred_experts: Set(json!([])),
      saved_experts: Set(json!([])),
      interests: Set(json!([])),
      total_sessions: Set(0),
      total_spent: Set(rust_decimal::Decimal::from(0)),
      average_rating: Set(rust_decimal::Decimal::from(0)),
      created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
    };
    shopper_profile.insert(db).await?;

    let expert_profile = expert_profiles::ActiveModel {
      id: Set(Uuid::new_v4()),
      user_id: Set(user_model.id),
      specialization: Set("Unverified consultant".to_string()),
      bio: Set("Unverified consultant".to_string()),
      session_rate: Set(rust_decimal::Decimal::from(0)),
      rating: Set(rust_decimal::Decimal::from(0)),
      total_consultations: Set(0),
      is_verified: Set(false),
      is_online: Set(false),
      profile_image_url: Set(
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300".to_string(),
      ),
      created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
    };
    expert_profile.insert(db).await?;

    let expert_stats = expert_stats::ActiveModel {
      id: Set(Uuid::new_v4()),
      user_id: Set(user_model.id),
      total_earnings: Set(rust_decimal::Decimal::from(0)),
      total_hours: Set(rust_decimal::Decimal::from(0)),
      response_time: Set(rust_decimal::Decimal::from(0)),
      satisfaction: Set(rust_decimal::Decimal::from(0)),
      created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
    };
    expert_stats.insert(db).await?;

    Self::build_user_from_model(&user_model, db).await
  }

  async fn build_user_from_model(
    user_model: &users::Model,
    db: &DatabaseConnection,
  ) -> DatabaseResult<UserCompleteProfile> {
    let profile = UserProfile {
      id: user_model.id.to_string(),
      wallet_address: user_model.wallet_address.clone(),
      name: user_model.name.clone(),
      email: Some(user_model.email.clone()),
      created_at: user_model.created_at.to_rfc3339(),
      updated_at: user_model.updated_at.to_rfc3339(),
    };

    
    let shopper_profile = Self::get_shopper_profile(db, user_model.id).await?;
    let expert_profile = Self::get_expert_profile(db, user_model.id).await?;

    Ok(UserCompleteProfile {
      user: profile,
      shopper: shopper_profile,
      expert: expert_profile,
    })
  }

  async fn get_shopper_profile(
    db: &DatabaseConnection,
    user_id: Uuid,
  ) -> DatabaseResult<Option<ShopperProfile>> {
    let shopper_data = crate::entities::shopper_profiles::Entity::find()
      .filter(shopper_profiles::Column::UserId.eq(user_id))
      .one(db)
      .await?;

    if let Some(data) = shopper_data {
      Ok(Some(ShopperProfile {
        preferences: ShopperPreferences {
          categories: serde_json::from_value(data.categories.clone()).unwrap_or_default(),
          price_range: PriceRange {
            min: data.price_range_min.to_string().parse().unwrap_or(0.0),
            max: data.price_range_max.to_string().parse().unwrap_or(1000.0),
          },
          preferred_experts: serde_json::from_value(data.preferred_experts.clone())
            .unwrap_or_default(),
        },
        consultation_history: ConsultationHistory {
          total_sessions: data.total_sessions,
          total_spent: data.total_spent.to_string().parse().unwrap_or(0.0),
          average_rating: data.average_rating.to_string().parse().unwrap_or(0.0),
        },
        saved_experts: serde_json::from_value(data.saved_experts.clone()).unwrap_or_default(),
        interests: serde_json::from_value(data.interests.clone()).unwrap_or_default(),
      }))
    } else {
      Ok(None)
    }
  }

  pub async fn get_expert_profile(
    db: &DatabaseConnection,
    user_id: Uuid,
  ) -> DatabaseResult<Option<ExpertProfile>> {
    let expert_data = crate::entities::expert_profiles::Entity::find()
      .filter(expert_profiles::Column::UserId.eq(user_id))
      .one(db)
      .await?;

    let expert_stats_data = crate::entities::expert_stats::Entity::find()
      .filter(expert_stats::Column::UserId.eq(user_id))
      .one(db)
      .await?;

    let availability_data = crate::entities::expert_availability::Entity::find()
      .filter(expert_availability::Column::UserId.eq(user_id))
      .all(db)
      .await?;

    if let Some(data) = expert_data {
      let stats = if let Some(stats_data) = expert_stats_data {
        ExpertStats {
          total_earnings: stats_data.total_earnings.to_string().parse().unwrap_or(0.0),
          total_hours: stats_data.total_hours.to_string().parse().unwrap_or(0.0),
          response_time: stats_data.response_time.to_string().parse().unwrap_or(0.0),
          satisfaction: stats_data.satisfaction.to_string().parse().unwrap_or(0.0),
        }
      } else {
        ExpertStats {
          total_earnings: 0.0,
          total_hours: 0.0,
          response_time: 0.0,
          satisfaction: 0.0,
        }
      };

      let mut schedule = HashMap::new();
      for avail in availability_data {
        schedule.insert(
          avail.day_of_week,
          ScheduleSlot {
            start: avail.start_time.to_string(),
            end: avail.end_time.to_string(),
            available: avail.available,
          },
        );
      }

      Ok(Some(ExpertProfile {
        id: data.id,
        user_id,
        specialization: data.specialization,
        bio: data.bio,
        session_rate: data.session_rate.to_string().parse().unwrap_or(0.0),
        rating: data.rating.to_string().parse().unwrap_or(0.0),
        total_consultations: data.total_consultations,
        is_verified: data.is_verified,
        is_online: data.is_online,
        availability: Availability {
          schedule,
          timezone: "UTC".to_string(),
        },
        profile_image_url: Some(data.profile_image_url),
        stats,
      }))
    } else {
      Ok(None)
    }
  }

  // Profile management methods
  pub async fn has_shopper_profile(db: &DatabaseConnection, user_id: Uuid) -> DatabaseResult<bool> {
    let shopper_profile = ShopperProfiles::find()
      .filter(shopper_profiles::Column::UserId.eq(user_id))
      .one(db)
      .await?;
    Ok(shopper_profile.is_some())
  }

  pub async fn has_expert_profile(db: &DatabaseConnection, user_id: Uuid) -> DatabaseResult<bool> {
    let expert_profile = ExpertProfiles::find()
      .filter(expert_profiles::Column::UserId.eq(user_id))
      .one(db)
      .await?;
    Ok(expert_profile.is_some())
  }

  pub async fn get_user_roles(
    db: &DatabaseConnection,
    user_id: Uuid,
  ) -> DatabaseResult<(bool, bool)> {
    let can_shop = Self::has_shopper_profile(db, user_id).await?;
    let can_expert = Self::has_expert_profile(db, user_id).await?;
    Ok((can_shop, can_expert))
  }

  pub async fn create_shopper_profile_only(
    db: &DatabaseConnection,
    user_id: Uuid,
    categories: Vec<String>,
    price_range_min: f64,
    price_range_max: f64,
    interests: Vec<String>,
  ) -> DatabaseResult<()> {
    let shopper_profile = shopper_profiles::ActiveModel {
      id: Set(Uuid::new_v4()),
      user_id: Set(user_id),
      categories: Set(json!(categories)),
      price_range_min: Set(rust_decimal::Decimal::try_from(price_range_min).unwrap_or_default()),
      price_range_max: Set(rust_decimal::Decimal::try_from(price_range_max).unwrap_or_default()),
      preferred_experts: Set(json!([])),
      saved_experts: Set(json!([])),
      interests: Set(json!(interests)),
      total_sessions: Set(0),
      total_spent: Set(rust_decimal::Decimal::from(0)),
      average_rating: Set(rust_decimal::Decimal::from(0)),
      created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
    };
    shopper_profile.insert(db).await?;
    Ok(())
  }

  pub async fn create_expert_profile_only(
    db: &DatabaseConnection,
    user_id: Uuid,
    specialization: String,
    bio: String,
    session_rate: f64,
    profile_image_url: Option<String>,
  ) -> DatabaseResult<()> {
    let expert_profile = expert_profiles::ActiveModel {
      id: Set(Uuid::new_v4()),
      user_id: Set(user_id),
      specialization: Set(specialization),
      bio: Set(bio),
      session_rate: Set(rust_decimal::Decimal::try_from(session_rate).unwrap_or_default()),
      rating: Set(rust_decimal::Decimal::from(0)),
      total_consultations: Set(0),
      is_verified: Set(false),
      is_online: Set(false),
      profile_image_url: Set(profile_image_url.unwrap_or_default()),
      created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
    };
    expert_profile.insert(db).await?;

    // Also create expert stats
    let expert_stats = expert_stats::ActiveModel {
      id: Set(Uuid::new_v4()),
      user_id: Set(user_id),
      total_earnings: Set(rust_decimal::Decimal::from(0)),
      total_hours: Set(rust_decimal::Decimal::from(0)),
      response_time: Set(rust_decimal::Decimal::from(0)),
      satisfaction: Set(rust_decimal::Decimal::from(0)),
      created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
      updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
    };
    expert_stats.insert(db).await?;

    Ok(())
  }

  pub async fn update_expert_profile(
    db: &DatabaseConnection,
    user_id: Uuid,
    specialization: Option<String>,
    bio: Option<String>,
    session_rate: Option<f64>,
    profile_image_url: Option<String>,
    is_online: Option<bool>,
  ) -> DatabaseResult<()> {
    let expert_profile = expert_profiles::Entity::find()
      .filter(expert_profiles::Column::UserId.eq(user_id))
      .one(db)
      .await?;

    if let Some(profile) = expert_profile {
      let mut active_model: expert_profiles::ActiveModel = profile.into();

      if let Some(spec) = specialization {
        active_model.specialization = Set(spec);
      }
      if let Some(bio_text) = bio {
        active_model.bio = Set(bio_text);
      }
      if let Some(rate) = session_rate {
        active_model.session_rate = Set(rust_decimal::Decimal::try_from(rate).unwrap_or_default());
      }
      if let Some(img_url) = profile_image_url {
        active_model.profile_image_url = Set(img_url);
      }
      if let Some(online) = is_online {
        active_model.is_online = Set(online);
      }

      active_model.updated_at = Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap()));
      active_model.update(db).await?;
    }

    Ok(())
  }

  pub async fn update_user_profile(
    db: &DatabaseConnection,
    user_id: Uuid,
    name: Option<String>,
    email: Option<String>,
  ) -> DatabaseResult<UserProfile> {
    let user = users::Entity::find_by_id(user_id).one(db).await?;

    if let Some(user_data) = user {
      let mut active_model: users::ActiveModel = user_data.into();

      if let Some(new_name) = name {
        active_model.name = Set(new_name);
      }
      if let Some(new_email) = email {
        active_model.email = Set(new_email);
      }

      active_model.updated_at = Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap()));
      let updated_user = active_model.update(db).await?;

      Ok(UserProfile {
        id: updated_user.id.to_string(),
        wallet_address: updated_user.wallet_address,
        name: updated_user.name,
        email: Some(updated_user.email),
        created_at: updated_user.created_at.to_rfc3339(),
        updated_at: updated_user.updated_at.to_rfc3339(),
      })
    } else {
      Err(crate::database::DatabaseError::UserNotFound)
    }
  }

  pub async fn update_shopper_profile(
    db: &DatabaseConnection,
    user_id: Uuid,
    categories: Option<Vec<String>>,
    price_range_min: Option<f64>,
    price_range_max: Option<f64>,
    interests: Option<Vec<String>>,
  ) -> DatabaseResult<()> {
    let shopper_profile = shopper_profiles::Entity::find()
      .filter(shopper_profiles::Column::UserId.eq(user_id))
      .one(db)
      .await?;

    if let Some(profile) = shopper_profile {
      let mut active_model: shopper_profiles::ActiveModel = profile.into();

      if let Some(cats) = categories {
        active_model.categories = Set(serde_json::json!(cats));
      }
      if let Some(min) = price_range_min {
        active_model.price_range_min = Set(rust_decimal::Decimal::try_from(min).unwrap_or_default());
      }
      if let Some(max) = price_range_max {
        active_model.price_range_max = Set(rust_decimal::Decimal::try_from(max).unwrap_or_default());
      }
      if let Some(int) = interests {
        active_model.interests = Set(serde_json::json!(int));
      }

      active_model.updated_at = Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap()));
      active_model.update(db).await?;
    }

    Ok(())
  }
}
