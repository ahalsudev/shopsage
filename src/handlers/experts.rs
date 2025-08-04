use axum::{extract::{Path, State}, http::StatusCode, Json};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::entities::{expert_profiles, prelude::*, users};
use crate::AppState;

#[derive(Debug, Serialize)]
pub struct ExpertListResponse {
  pub experts: Vec<ExpertBasicInfo>,
  pub total: i32,
}

#[derive(Debug, Serialize)]
pub struct ExpertBasicInfo {
  pub id: String,
  pub name: String,
  pub specialization: String,
  #[serde(rename = "sessionRate")]
  pub session_rate: f64,
  pub rating: f64,
  #[serde(rename = "isOnline")]
  pub is_online: bool,
  #[serde(rename = "isVerified")]
  pub is_verified: bool,
  #[serde(rename = "profileImageUrl")]
  pub profile_image_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ExpertError {
  pub error: String,
}

#[derive(Debug, Serialize)]
pub struct ExpertDetailResponse {
  pub id: Uuid,
  pub name: String,
  pub specialization: String,
  pub bio: String,
  #[serde(rename = "sessionRate")]
  pub session_rate: f64,
  pub rating: f64,
  #[serde(rename = "totalConsultations")]
  pub total_consultations: i32,
  #[serde(rename = "isOnline")]
  pub is_online: bool,
  #[serde(rename = "isVerified")]
  pub is_verified: bool,
  #[serde(rename = "profileImageUrl")]
  pub profile_image_url: Option<String>,
}

pub async fn list_experts(
  State(app_state): State<AppState>,
) -> Result<Json<ExpertListResponse>, (StatusCode, Json<ExpertError>)> {
  let experts_data = ExpertProfiles::find()
    .find_also_related(Users)
    .filter(expert_profiles::Column::IsVerified.eq(true))
    .order_by_desc(expert_profiles::Column::Rating)
    .all(app_state.db.connection())
    .await
    .map_err(|_| {
      (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ExpertError {
          error: "Database error".to_string(),
        }),
      )
    })?;

  let experts: Vec<ExpertBasicInfo> = experts_data
    .into_iter()
    .filter_map(|(expert_profile, user)| {
      if expert_profile.is_verified {
        user.map(|u| ExpertBasicInfo {
          id: expert_profile.id.to_string(),
          name: u.name,
          specialization: expert_profile.specialization,
          session_rate: expert_profile.session_rate.to_string().parse().unwrap_or(0.0),
          rating: expert_profile.rating.to_string().parse().unwrap_or(0.0),
          is_online: expert_profile.is_online,
          is_verified: expert_profile.is_verified,
          profile_image_url: if expert_profile.profile_image_url.is_empty() {
            None
          } else {
            Some(expert_profile.profile_image_url)
          },
        })
      } else {
        None
      }
    })
    .collect();

  let total = experts.len() as i32;
  let response = ExpertListResponse { experts, total };

  Ok(Json(response))
}

pub async fn search_experts(
  State(app_state): State<AppState>,
) -> Result<Json<ExpertListResponse>, (StatusCode, Json<ExpertError>)> {
  // For now, same as list_experts but could add search parameters later
  list_experts(State(app_state)).await
}

pub async fn get_expert_by_id(
  State(app_state): State<AppState>,
  Path(expert_id): Path<Uuid>,
) -> Result<Json<ExpertDetailResponse>, (StatusCode, Json<ExpertError>)> {
  let expert_data = ExpertProfiles::find_by_id(expert_id)
    .find_also_related(Users)
    .one(app_state.db.connection())
    .await
    .map_err(|_| {
      (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ExpertError {
          error: "Database error".to_string(),
        }),
      )
    })?;

  match expert_data {
    Some((expert_profile, user)) => {
      if !expert_profile.is_verified {
        return Err((
          StatusCode::NOT_FOUND,
          Json(ExpertError {
            error: "Expert not found or not verified".to_string(),
          }),
        ));
      }

      let user = user.ok_or((
        StatusCode::NOT_FOUND,
        Json(ExpertError {
          error: "User not found".to_string(),
        }),
      ))?;

      let response = ExpertDetailResponse {
        id: expert_profile.id,
        name: user.name,
        specialization: expert_profile.specialization,
        bio: expert_profile.bio,
        session_rate: expert_profile.session_rate.to_string().parse().unwrap_or(0.0),
        rating: expert_profile.rating.to_string().parse().unwrap_or(0.0),
        total_consultations: expert_profile.total_consultations,
        is_online: expert_profile.is_online,
        is_verified: expert_profile.is_verified,
        profile_image_url: if expert_profile.profile_image_url.is_empty() {
          None
        } else {
          Some(expert_profile.profile_image_url)
        },
      };

      Ok(Json(response))
    }
    None => Err((
      StatusCode::NOT_FOUND,
      Json(ExpertError {
        error: "Expert not found".to_string(),
      }),
    )),
  }
}
