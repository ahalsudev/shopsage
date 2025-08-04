use axum::{
  extract::{Extension, Path, State},
  http::StatusCode,
  Json,
};
use chrono::{FixedOffset, Utc};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::entities::{prelude::*, sessions, users};
use crate::middleware::auth::AuthError;
use crate::services::user_service::UserProfile;
use crate::AppState;

#[derive(Debug, Serialize)]
pub struct SessionResponse {
  pub id: Uuid,
  pub expert_id: Uuid,
  pub shopper_id: Uuid,
  pub status: String,
  pub amount: String,
  pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct SessionsResponse {
  pub sessions: Vec<SessionResponse>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
  pub expert_id: Uuid,
  pub amount: f64,
}

pub async fn create_session(
  State(app_state): State<AppState>,
  Extension(user): Extension<UserProfile>,
  Json(request): Json<CreateSessionRequest>,
) -> Result<Json<SessionResponse>, (StatusCode, Json<AuthError>)> {
  let shopper_id = Uuid::parse_str(&user.id).map_err(|_| {
    (
      StatusCode::BAD_REQUEST,
      Json(AuthError::InvalidToken),
    )
  })?;

  let session_id = Uuid::new_v4();
  let session = sessions::ActiveModel {
    id: Set(session_id),
    expert_id: Set(request.expert_id),
    shopper_id: Set(shopper_id),
    status: Set("created".to_string()),
    amount: Set(rust_decimal::Decimal::try_from(request.amount).unwrap_or_default()),
    start_time: NotSet,
    end_time: NotSet,
    notes: NotSet,
    created_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
    updated_at: Set(Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap())),
  };

  let created_session = session.insert(app_state.db.connection()).await.map_err(|_| {
    (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(AuthError::DatabaseError),
    )
  })?;

  let response = SessionResponse {
    id: created_session.id,
    expert_id: created_session.expert_id,
    shopper_id: created_session.shopper_id,
    status: created_session.status,
    amount: created_session.amount.to_string(),
    created_at: created_session.created_at.to_rfc3339(),
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
        id: session_data.id,
        expert_id: session_data.expert_id,
        shopper_id: session_data.shopper_id,
        status: session_data.status,
        amount: session_data.amount.to_string(),
        created_at: session_data.created_at.to_rfc3339(),
      };
      Ok(Json(response))
    }
    None => Err((StatusCode::NOT_FOUND, Json(AuthError::InvalidToken))),
  }
}

pub async fn list_sessions(
  State(app_state): State<AppState>,
  Extension(user): Extension<UserProfile>,
) -> Result<Json<SessionsResponse>, (StatusCode, Json<AuthError>)> {
  let user_id = Uuid::parse_str(&user.id).map_err(|_| {
    (
      StatusCode::BAD_REQUEST,
      Json(AuthError::InvalidToken),
    )
  })?;

  let sessions = Sessions::find()
    .filter(
      sessions::Column::ShopperId
        .eq(user_id)
        .or(sessions::Column::ExpertId.eq(user_id)),
    )
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
      id: session.id,
      expert_id: session.expert_id,
      shopper_id: session.shopper_id,
      status: session.status,
      amount: session.amount.to_string(),
      created_at: session.created_at.to_rfc3339(),
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
      id: updated_session.id,
      expert_id: updated_session.expert_id,
      shopper_id: updated_session.shopper_id,
      status: updated_session.status,
      amount: updated_session.amount.to_string(),
      created_at: updated_session.created_at.to_rfc3339(),
    };

    Ok(Json(response))
  } else {
    Err((StatusCode::NOT_FOUND, Json(AuthError::InvalidToken)))
  }
}
