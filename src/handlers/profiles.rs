use std::str::FromStr;

use axum::{
  extract::{Extension, State},
  http::StatusCode,
  Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
  services::user_service::{UserProfile, UserService},
  AppState,
};

#[derive(Debug, Deserialize)]
pub struct CreateExpertProfileRequest {
  pub specialization: String,
  pub bio: Option<String>,
  #[serde(rename = "sessionRate")]
  pub session_rate: f64,
  #[serde(rename = "profileImageUrl")]
  pub profile_image_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExpertProfileRequest {
  pub specialization: Option<String>,
  pub bio: Option<String>,
  #[serde(rename = "sessionRate")]
  pub session_rate: Option<f64>,
  #[serde(rename = "profileImageUrl")]
  pub profile_image_url: Option<String>,
  #[serde(rename = "isOnline")]
  pub is_online: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserProfileRequest {
  pub name: Option<String>,
  pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateShopperProfileRequest {
  pub categories: Option<Vec<String>>,
  #[serde(rename = "priceRangeMin")]
  pub price_range_min: Option<f64>,
  #[serde(rename = "priceRangeMax")]
  pub price_range_max: Option<f64>,
  pub interests: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateShopperProfileRequest {
  pub categories: Vec<String>,
  #[serde(rename = "priceRangeMin")]
  pub price_range_min: f64,
  #[serde(rename = "priceRangeMax")]
  pub price_range_max: f64,
  pub interests: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ExpertProfileResponse {
  pub id: Uuid,
  #[serde(rename = "userId")]
  pub user_id: Uuid,
  pub specialization: String,
  pub bio: Option<String>,
  #[serde(rename = "sessionRate")]
  pub session_rate: f64,
  pub rating: f64,
  #[serde(rename = "totalConsultations")]
  pub total_consultations: i32,
  #[serde(rename = "isVerified")]
  pub is_verified: bool,
  #[serde(rename = "isOnline")]
  pub is_online: bool,
  #[serde(rename = "profileImageUrl")]
  pub profile_image_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ShopperProfileResponse {
  pub id: String,
  #[serde(rename = "userId")]
  pub user_id: String,
  pub categories: Vec<String>,
  #[serde(rename = "priceRangeMin")]
  pub price_range_min: f64,
  #[serde(rename = "priceRangeMax")]
  pub price_range_max: f64,
  #[serde(rename = "preferredExperts")]
  pub preferred_experts: Vec<String>,
  #[serde(rename = "savedExperts")]
  pub saved_experts: Vec<String>,
  pub interests: Vec<String>,
  #[serde(rename = "totalSessions")]
  pub total_sessions: i32,
  #[serde(rename = "totalSpent")]
  pub total_spent: f64,
  #[serde(rename = "averageRating")]
  pub average_rating: f64,
}

#[derive(Debug, Serialize)]
pub struct UserRoles {
  #[serde(rename = "canShop")]
  pub can_shop: bool,
  #[serde(rename = "canExpert")]
  pub can_expert: bool,
  #[serde(rename = "activeRole")]
  pub active_role: String,
}

#[derive(Debug, Serialize)]
pub struct CompleteUserProfileResponse {
  pub user: UserBasicInfo,
  pub roles: UserRoles,
  #[serde(rename = "shopperProfile")]
  pub shopper_profile: Option<ShopperProfileResponse>,
  #[serde(rename = "expertProfile")]
  pub expert_profile: Option<ExpertProfileResponse>,
}

#[derive(Debug, Serialize)]
pub struct UserBasicInfo {
  pub id: String,
  #[serde(rename = "walletAddress")]
  pub wallet_address: String,
  pub name: String,
  pub email: String,
  #[serde(rename = "createdAt")]
  pub created_at: String,
  #[serde(rename = "updatedAt")]
  pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct ProfileError {
  pub error: String,
}

#[axum::debug_handler]
pub async fn create_expert_profile(
  State(app_state): State<AppState>,
  Extension(user): Extension<UserProfile>,
  Json(payload): Json<CreateExpertProfileRequest>,
) -> Result<Json<ExpertProfileResponse>, (StatusCode, Json<ProfileError>)> {
  let user_id = Uuid::from_str(&user.id).ok();

  let user_id = match user_id {
    Some(id) => id,
    None => {
      return Err((
        StatusCode::BAD_REQUEST,
        Json(ProfileError {
          error: "Invalid user ID".to_string(),
        }),
      ))
    }
  };

  let response = UserService::create_expert_profile_only(
    app_state.db.connection(),
    user_id,
    payload.specialization,
    payload.bio.unwrap_or_else(|| "".to_string()),
    payload.session_rate,
    payload.profile_image_url,
  )
  .await;

  match response {
    Ok(_) => {
      let profile = match UserService::get_expert_profile(
        app_state.db.connection(),
        user_id,
      )
      .await
      {
        Ok(Some(profile)) => profile,
        Ok(None) => {
          return Err((
            StatusCode::NOT_FOUND,
            Json(ProfileError {
              error: "Expert profile not found after creation".to_string(),
            }),
          ))
        }
        Err(err) => {
          return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ProfileError {
              error: format!("Database error: {}", err),
            }),
          ))
        }
      };

      let expert_profile = ExpertProfileResponse {
        id: profile.id,
        user_id: profile.user_id,
        specialization: profile.specialization,
        bio: Some(profile.bio),
        session_rate: profile.session_rate,
        rating: profile.rating,
        total_consultations: profile.total_consultations,
        is_verified: profile.is_verified,
        is_online: profile.is_online,
        profile_image_url: profile.profile_image_url,
      };

      return Ok(Json(expert_profile));
    }

    Err(err) => {
      return Err((
        StatusCode::BAD_REQUEST,
        Json(ProfileError {
          error: err.to_string(),
        }),
      ))
    }
  }
}

pub async fn get_expert_profile(
  State(app_state): State<AppState>,
  Extension(user): Extension<UserProfile>,
) -> Result<Json<ExpertProfileResponse>, (StatusCode, Json<ProfileError>)> {
  let user_id = match Uuid::from_str(&user.id) {
    Ok(id) => id,
    Err(_) => {
      return Err((
        StatusCode::BAD_REQUEST,
        Json(ProfileError {
          error: "Invalid user ID".to_string(),
        }),
      ))
    }
  };

  let expert_profile = match UserService::get_expert_profile(app_state.db.connection(), user_id)
    .await
  {
    Ok(profile) => profile,
    Err(err) => {
      return Err((
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ProfileError {
          error: format!("Database error: {}", err),
        }),
      ))
    }
  };

  if let Some(profile) = expert_profile {
    let response = ExpertProfileResponse {
      id: profile.id,
      user_id,
      specialization: profile.specialization,
      bio: Some(profile.bio),
      session_rate: profile.session_rate,
      rating: profile.rating,
      total_consultations: profile.total_consultations,
      is_verified: profile.is_verified,
      is_online: profile.is_online,
      profile_image_url: profile.profile_image_url,
    };
    Ok(Json(response))
  } else {
    Err((
      StatusCode::NOT_FOUND,
      Json(ProfileError {
        error: "Expert profile not found".to_string(),
      }),
    ))
  }


}

pub async fn create_shopper_profile(
  Extension(user): Extension<UserProfile>,
  Json(request): Json<CreateShopperProfileRequest>,
) -> Result<Json<ShopperProfileResponse>, (StatusCode, Json<ProfileError>)> {
  // Mock response for now
  let response = ShopperProfileResponse {
    id: "shopper-123".to_string(),
    user_id: user.id.clone(),
    categories: request.categories,
    price_range_min: request.price_range_min,
    price_range_max: request.price_range_max,
    preferred_experts: vec![],
    saved_experts: vec![],
    interests: request.interests,
    total_sessions: 0,
    total_spent: 0.0,
    average_rating: 0.0,
  };

  Ok(Json(response))
}

pub async fn get_shopper_profile(
  Extension(user): Extension<UserProfile>,
) -> Result<Json<ShopperProfileResponse>, (StatusCode, Json<ProfileError>)> {
  // Mock response for now
  let response = ShopperProfileResponse {
    id: "shopper-123".to_string(),
    user_id: user.id.clone(),
    categories: vec!["Electronics".to_string(), "Fashion".to_string()],
    price_range_min: 10.0,
    price_range_max: 500.0,
    preferred_experts: vec!["expert-1".to_string()],
    saved_experts: vec!["expert-2".to_string(), "expert-3".to_string()],
    interests: vec!["Tech".to_string(), "Style".to_string()],
    total_sessions: 5,
    total_spent: 250.0,
    average_rating: 4.2,
  };

  Ok(Json(response))
}

pub async fn get_complete_user_profile(
  Extension(user): Extension<UserProfile>,
) -> Result<Json<CompleteUserProfileResponse>, (StatusCode, Json<ProfileError>)> {
  // Mock response for now - in real implementation, fetch user and both profiles
  let user_info = UserBasicInfo {
    id: user.id.clone(),
    wallet_address: user.wallet_address.clone(),
    name: user.name.clone(),
    email: user.email.clone().unwrap_or_default(),
    created_at: user.created_at.clone(),
    updated_at: user.updated_at.clone(),
  };

  // Mock both profiles exist (dual role user)
  let shopper_profile = Some(ShopperProfileResponse {
    id: "shopper-123".to_string(),
    user_id: user.id.clone(),
    categories: vec!["Electronics".to_string(), "Fashion".to_string()],
    price_range_min: 10.0,
    price_range_max: 500.0,
    preferred_experts: vec!["expert-1".to_string()],
    saved_experts: vec!["expert-2".to_string()],
    interests: vec!["Tech".to_string(), "Style".to_string()],
    total_sessions: 5,
    total_spent: 250.0,
    average_rating: 4.2,
  });

  let expert_profile = Some(ExpertProfileResponse {
    id: Uuid::new_v4(),
    user_id: Uuid::from_str(&user.id).unwrap(),
    specialization: "Tech Support".to_string(),
    bio: Some("I help with technical issues".to_string()),
    session_rate: 50.0,
    rating: 4.5,
    total_consultations: 10,
    is_verified: true,
    is_online: true,
    profile_image_url: None,
  });

  let roles = UserRoles {
    can_shop: shopper_profile.is_some(),
    can_expert: expert_profile.is_some(),
    active_role: match (&shopper_profile, &expert_profile) {
      (Some(_), Some(_)) => "dual".to_string(),
      (Some(_), None) => "shopper".to_string(),
      (None, Some(_)) => "expert".to_string(),
      (None, None) => "none".to_string(),
    },
  };

  let response = CompleteUserProfileResponse {
    user: user_info,
    roles,
    shopper_profile,
    expert_profile,
  };

  Ok(Json(response))
}

#[axum::debug_handler]
pub async fn update_expert_profile(
  State(app_state): State<AppState>,
  Extension(user): Extension<UserProfile>,
  Json(payload): Json<UpdateExpertProfileRequest>,
) -> Result<Json<ExpertProfileResponse>, (StatusCode, Json<ProfileError>)> {
  let user_id = Uuid::from_str(&user.id).ok();

  let user_id = match user_id {
    Some(id) => id,
    None => {
      return Err((
        StatusCode::BAD_REQUEST,
        Json(ProfileError {
          error: "Invalid user ID".to_string(),
        }),
      ))
    }
  };

  let response = UserService::update_expert_profile(
    app_state.db.connection(),
    user_id,
    payload.specialization,
    payload.bio,
    payload.session_rate,
    payload.profile_image_url,
    payload.is_online,
  )
  .await;

  match response {
    Ok(_) => {
      let profile = match UserService::get_expert_profile(
        app_state.db.connection(),
        user_id,
      )
      .await
      {
        Ok(Some(profile)) => profile,
        Ok(None) => {
          return Err((
            StatusCode::NOT_FOUND,
            Json(ProfileError {
              error: "Expert profile not found".to_string(),
            }),
          ))
        }
        Err(err) => {
          return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ProfileError {
              error: format!("Database error: {}", err),
            }),
          ))
        }
      };

      let expert_profile = ExpertProfileResponse {
        id: profile.id,
        user_id: profile.user_id,
        specialization: profile.specialization,
        bio: Some(profile.bio),
        session_rate: profile.session_rate,
        rating: profile.rating,
        total_consultations: profile.total_consultations,
        is_verified: profile.is_verified,
        is_online: profile.is_online,
        profile_image_url: profile.profile_image_url,
      };

      return Ok(Json(expert_profile));
    }

    Err(err) => {
      return Err((
        StatusCode::BAD_REQUEST,
        Json(ProfileError {
          error: err.to_string(),
        }),
      ))
    }
  }
}

#[axum::debug_handler]
pub async fn update_user_profile(
  State(app_state): State<AppState>,
  Extension(user): Extension<UserProfile>,
  Json(payload): Json<UpdateUserProfileRequest>,
) -> Result<Json<UserBasicInfo>, (StatusCode, Json<ProfileError>)> {
  let user_id = Uuid::from_str(&user.id).ok();

  let user_id = match user_id {
    Some(id) => id,
    None => {
      return Err((
        StatusCode::BAD_REQUEST,
        Json(ProfileError {
          error: "Invalid user ID".to_string(),
        }),
      ))
    }
  };

  let response = UserService::update_user_profile(
    app_state.db.connection(),
    user_id,
    payload.name,
    payload.email,
  )
  .await;

  match response {
    Ok(updated_user) => {
      let user_info = UserBasicInfo {
        id: updated_user.id.to_string(),
        wallet_address: updated_user.wallet_address,
        name: updated_user.name,
        email: updated_user.email.unwrap_or_default(),
        created_at: updated_user.created_at,
        updated_at: updated_user.updated_at,
      };
      Ok(Json(user_info))
    }
    Err(err) => {
      return Err((
        StatusCode::BAD_REQUEST,
        Json(ProfileError {
          error: err.to_string(),
        }),
      ))
    }
  }
}

#[axum::debug_handler]
pub async fn update_shopper_profile(
  State(app_state): State<AppState>,
  Extension(user): Extension<UserProfile>,
  Json(payload): Json<UpdateShopperProfileRequest>,
) -> Result<Json<ShopperProfileResponse>, (StatusCode, Json<ProfileError>)> {
  let user_id = Uuid::from_str(&user.id).ok();

  let user_id = match user_id {
    Some(id) => id,
    None => {
      return Err((
        StatusCode::BAD_REQUEST,
        Json(ProfileError {
          error: "Invalid user ID".to_string(),
        }),
      ))
    }
  };

  // Clone the values before using them in the service call
  let categories_clone = payload.categories.clone();
  let interests_clone = payload.interests.clone();

  let response = UserService::update_shopper_profile(
    app_state.db.connection(),
    user_id,
    payload.categories,
    payload.price_range_min,
    payload.price_range_max,
    payload.interests,
  )
  .await;

  match response {
    Ok(_) => {
      // Mock response for now - would fetch updated profile from DB
      let response = ShopperProfileResponse {
        id: user_id.to_string(),
        user_id: user.id.clone(),
        categories: categories_clone.unwrap_or_default(),
        price_range_min: payload.price_range_min.unwrap_or(0.0),
        price_range_max: payload.price_range_max.unwrap_or(1000.0),
        preferred_experts: vec![],
        saved_experts: vec![],
        interests: interests_clone.unwrap_or_default(),
        total_sessions: 0,
        total_spent: 0.0,
        average_rating: 0.0,
      };
      Ok(Json(response))
    }
    Err(err) => {
      return Err((
        StatusCode::BAD_REQUEST,
        Json(ProfileError {
          error: err.to_string(),
        }),
      ))
    }
  }
}