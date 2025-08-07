use axum::{
  extract::{Path, State},
  http::StatusCode,
  Json,
};
use chrono::{DateTime, Duration, FixedOffset, Utc};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::entities::{prelude::*, sessions, users, expert_profiles};
use crate::middleware::auth::AuthError;
use crate::AppState;

#[derive(Debug, Serialize)]
pub struct SessionResponse {
  pub id: String,
  #[serde(rename = "expertId")]
  pub expert_id: String,
  #[serde(rename = "shopperId")]
  pub shopper_id: String,
  pub status: String,
  pub amount: String,
  #[serde(rename = "startTime")]
  pub start_time: Option<String>,
  #[serde(rename = "endTime")]
  pub end_time: Option<String>,
  #[serde(rename = "createdAt")]
  pub created_at: String,
  #[serde(rename = "updatedAt")]
  pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct SessionsResponse {
  pub sessions: Vec<SessionResponse>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
  #[serde(rename = "expertId")]
  pub expert_id: String,
  #[serde(rename = "shopperId")]  
  pub shopper_id: String,
  #[serde(rename = "startTime")]
  pub start_time: String, // ISO 8601 format
  pub amount: String, // BigDecimal as string
}

pub async fn create_session(
  State(app_state): State<AppState>,
  payload: Result<Json<CreateSessionRequest>, axum::extract::rejection::JsonRejection>,
) -> Result<Json<SessionResponse>, (StatusCode, Json<AuthError>)> {
  let Json(request) = payload.map_err(|rejection| {
    tracing::error!("JSON parsing error from React Native: {}", rejection);
    (
      StatusCode::BAD_REQUEST,
      Json(AuthError::custom(&format!("Invalid JSON: {}. Expected fields: expertId, shopperId, startTime, amount", rejection))),
    )
  })?;

  tracing::info!(
    expert_id = %request.expert_id,
    expert_id_len = request.expert_id.len(),
    expert_id_debug = ?request.expert_id,
    shopper_id = %request.shopper_id,
    shopper_id_len = request.shopper_id.len(), 
    shopper_id_debug = ?request.shopper_id,
    start_time = %request.start_time,
    start_time_len = request.start_time.len(),
    start_time_debug = ?request.start_time,
    amount = %request.amount,
    amount_len = request.amount.len(),
    amount_debug = ?request.amount,
    "Creating new session - detailed request data"
  );

  // Parse UUIDs from string inputs
  let expert_profile_id = Uuid::parse_str(&request.expert_id).map_err(|_| {
    (
      StatusCode::BAD_REQUEST,
      Json(AuthError::custom("Invalid expertId format")),
    )
  })?;

  let shopper_user_id = Uuid::parse_str(&request.shopper_id).map_err(|_| {
    (
      StatusCode::BAD_REQUEST,
      Json(AuthError::custom("Invalid shopperId format")),
    )
  })?;

  // Parse start time from ISO 8601 string
  let start_time = DateTime::parse_from_rfc3339(&request.start_time).map_err(|_| {
    (
      StatusCode::BAD_REQUEST,
      Json(AuthError::custom("Invalid startTime format, expected ISO 8601")),
    )
  })?;

  // Parse amount from string to decimal
  let amount = request.amount.parse::<rust_decimal::Decimal>().map_err(|_| {
    (
      StatusCode::BAD_REQUEST,
      Json(AuthError::custom("Invalid amount format")),
    )
  })?;

  // Look up expert profile and get the user_id
  let expert_profile = expert_profiles::Entity::find_by_id(expert_profile_id)
    .one(app_state.db.connection())
    .await
    .map_err(|err| {
      tracing::error!(error = %err, expert_profile_id = %expert_profile_id, "Failed to check if expert profile exists");
      (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(AuthError::DatabaseError),
      )
    })?;

  let expert_user_id = match expert_profile {
    Some(profile) => profile.user_id,
    None => {
      tracing::warn!(expert_profile_id = %expert_profile_id, "Expert profile not found");
      return Err((
        StatusCode::BAD_REQUEST,
        Json(AuthError::custom("Expert not found")),
      ));
    }
  };

  // Verify that shopper (user) exists
  let shopper_exists = users::Entity::find_by_id(shopper_user_id)
    .one(app_state.db.connection())
    .await
    .map_err(|err| {
      tracing::error!(error = %err, shopper_user_id = %shopper_user_id, "Failed to check if shopper exists");
      (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(AuthError::DatabaseError),
      )
    })?;

  if shopper_exists.is_none() {
    tracing::warn!(shopper_user_id = %shopper_user_id, "Shopper not found");
    return Err((
      StatusCode::BAD_REQUEST,
      Json(AuthError::custom("Shopper not found")),
    ));
  }

  let session_id = Uuid::new_v4();
  let now = Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap());
  
  // Set end_time to +5 minutes after start_time
  let end_time = start_time + Duration::minutes(5);
  
  let session = sessions::ActiveModel {
    id: Set(session_id),
    expert_id: Set(expert_user_id),
    shopper_id: Set(shopper_user_id),
    status: Set("pending".to_string()),
    amount: Set(amount),
    start_time: Set(Some(start_time.with_timezone(&FixedOffset::east_opt(0).unwrap()))),
    end_time: Set(Some(end_time.with_timezone(&FixedOffset::east_opt(0).unwrap()))),
    notes: Set(Some("".to_string())),
    created_at: Set(now),
    updated_at: Set(now),
  };

  let created_session = session.insert(app_state.db.connection()).await.map_err(|err| {
    tracing::error!(
      error = %err,
      expert_user_id = %expert_user_id,
      shopper_user_id = %shopper_user_id,
      expert_profile_id = %expert_profile_id,
      amount = %amount,
      "Failed to create session in database"
    );
    (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(AuthError::DatabaseError),
    )
  })?;

  let response = SessionResponse {
    id: created_session.id.to_string(),
    expert_id: created_session.expert_id.to_string(),
    shopper_id: created_session.shopper_id.to_string(),
    status: created_session.status,
    amount: created_session.amount.to_string(),
    start_time: created_session.start_time.map(|dt| dt.to_rfc3339()),
    end_time: created_session.end_time.map(|dt| dt.to_rfc3339()),
    created_at: created_session.created_at.to_rfc3339(),
    updated_at: created_session.updated_at.to_rfc3339(),
  };

  Ok(Json(response))
}

pub async fn get_session(
  State(app_state): State<AppState>,
  Path(session_id): Path<Uuid>,
) -> Result<Json<SessionResponse>, (StatusCode, Json<AuthError>)> {
  let session = Sessions::find_by_id(session_id)
    .one(app_state.db.connection())
    .await
    .map_err(|_| {
      (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(AuthError::DatabaseError),
      )
    })?;

  match session {
    Some(session_data) => {
      let response = SessionResponse {
        id: session_data.id.to_string(),
        expert_id: session_data.expert_id.to_string(),
        shopper_id: session_data.shopper_id.to_string(),
        status: session_data.status,
        amount: session_data.amount.to_string(),
        start_time: session_data.start_time.map(|dt| dt.to_rfc3339()),
        end_time: session_data.end_time.map(|dt| dt.to_rfc3339()),
        created_at: session_data.created_at.to_rfc3339(),
        updated_at: session_data.updated_at.to_rfc3339(),
      };
      Ok(Json(response))
    }
    None => Err((StatusCode::NOT_FOUND, Json(AuthError::InvalidToken))),
  }
}

pub async fn list_sessions_by_expert(
  State(app_state): State<AppState>,
  Path(expert_id): Path<String>,
) -> Result<Json<SessionsResponse>, (StatusCode, Json<AuthError>)> {
  let expert_uuid = Uuid::parse_str(&expert_id).map_err(|_| {
    (
      StatusCode::BAD_REQUEST,
      Json(AuthError::custom("Invalid expert ID format")),
    )
  })?;

  let sessions = Sessions::find()
    .filter(sessions::Column::ExpertId.eq(expert_uuid))
    .order_by_desc(sessions::Column::CreatedAt)
    .all(app_state.db.connection())
    .await
    .map_err(|_| {
      (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(AuthError::DatabaseError),
      )
    })?;

  let session_responses: Vec<SessionResponse> = sessions
    .into_iter()
    .map(|session| SessionResponse {
      id: session.id.to_string(),
      expert_id: session.expert_id.to_string(),
      shopper_id: session.shopper_id.to_string(),
      status: session.status,
      amount: session.amount.to_string(),
      start_time: session.start_time.map(|dt| dt.to_rfc3339()),
      end_time: session.end_time.map(|dt| dt.to_rfc3339()),
      created_at: session.created_at.to_rfc3339(),
      updated_at: session.updated_at.to_rfc3339(),
    })
    .collect();

  Ok(Json(SessionsResponse {
    sessions: session_responses,
  }))
}

pub async fn list_sessions_by_shopper(
  State(app_state): State<AppState>,
  Path(shopper_id): Path<String>,
) -> Result<Json<SessionsResponse>, (StatusCode, Json<AuthError>)> {
  let shopper_uuid = Uuid::parse_str(&shopper_id).map_err(|_| {
    (
      StatusCode::BAD_REQUEST,
      Json(AuthError::custom("Invalid shopper ID format")),
    )
  })?;

  let sessions = Sessions::find()
    .filter(sessions::Column::ShopperId.eq(shopper_uuid))
    .order_by_desc(sessions::Column::CreatedAt)
    .all(app_state.db.connection())
    .await
    .map_err(|_| {
      (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(AuthError::DatabaseError),
      )
    })?;

  let session_responses: Vec<SessionResponse> = sessions
    .into_iter()
    .map(|session| SessionResponse {
      id: session.id.to_string(),
      expert_id: session.expert_id.to_string(),
      shopper_id: session.shopper_id.to_string(),
      status: session.status,
      amount: session.amount.to_string(),
      start_time: session.start_time.map(|dt| dt.to_rfc3339()),
      end_time: session.end_time.map(|dt| dt.to_rfc3339()),
      created_at: session.created_at.to_rfc3339(),
      updated_at: session.updated_at.to_rfc3339(),
    })
    .collect();

  Ok(Json(SessionsResponse {
    sessions: session_responses,
  }))
}

pub async fn update_session(
  State(app_state): State<AppState>,
  Path(session_id): Path<Uuid>,
  Json(request): Json<serde_json::Value>,
) -> Result<Json<SessionResponse>, (StatusCode, Json<AuthError>)> {
  let session = Sessions::find_by_id(session_id)
    .one(app_state.db.connection())
    .await
    .map_err(|_| {
      (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(AuthError::DatabaseError),
      )
    })?;

  if let Some(session_data) = session {
    let mut active_model: sessions::ActiveModel = session_data.into();

    if let Some(status) = request.get("status").and_then(|v| v.as_str()) {
      active_model.status = Set(status.to_string());
    }

    active_model.updated_at = Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap()));

    let updated_session = active_model.update(app_state.db.connection()).await.map_err(|_| {
      (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(AuthError::DatabaseError),
      )
    })?;

    let response = SessionResponse {
      id: updated_session.id.to_string(),
      expert_id: updated_session.expert_id.to_string(),
      shopper_id: updated_session.shopper_id.to_string(),
      status: updated_session.status,
      amount: updated_session.amount.to_string(),
      start_time: updated_session.start_time.map(|dt| dt.to_rfc3339()),
      end_time: updated_session.end_time.map(|dt| dt.to_rfc3339()),
      created_at: updated_session.created_at.to_rfc3339(),
      updated_at: updated_session.updated_at.to_rfc3339(),
    };

    Ok(Json(response))
  } else {
    Err((StatusCode::NOT_FOUND, Json(AuthError::InvalidToken)))
  }
}
