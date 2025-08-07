use axum::{
  extract::{rejection::JsonRejection, State},
  http::StatusCode,
  Json,
};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::{
  entities::shopper_profiles,
  services::user_service::{
    self, CreateUserRequest, UserCompleteProfile, UserProfile, UserService,
  },
};

#[derive(Debug, Deserialize)]
pub struct RegisterUserRequest {
  #[serde(rename = "walletAddress")]
  pub wallet_address: String,
  pub name: String,
  pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginUserRequest {
  #[serde(rename = "walletAddress")]
  pub wallet_address: String,
}

#[derive(Debug, Serialize)]
pub struct RegisterUserResponse {
  pub token: String,
  pub user: UserCompleteProfile,
}

#[derive(Debug, Serialize)]
pub struct LoginUserResponse {
  pub token: String,
  pub user: UserCompleteProfile,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
  pub id: String,
  #[serde(rename = "walletAddress")]
  pub wallet_address: String,
  pub name: String,
  pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VerifyTokenRequest {
  pub token: String,
}

#[derive(Debug, Serialize)]
pub struct VerifyTokenResponse {
  pub valid: bool,
  pub user: Option<UserResponse>,
}

#[derive(Debug, Serialize)]
pub struct AuthError {
  pub error: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
  wallet_address: String,
  user_id: String,
  exp: usize,
}

fn user_to_response(user: &UserProfile) -> UserResponse {
  UserResponse {
    id: user.id.clone(),
    wallet_address: user.wallet_address.clone(),
    name: user.name.clone(),
    email: user.email.clone(),
  }
}

pub async fn register_user(
  State(app_state): State<AppState>,
  Json(request_data): Json<RegisterUserRequest>,
) -> Result<Json<RegisterUserResponse>, (StatusCode, Json<AuthError>)> {
  let request_id = uuid::Uuid::new_v4().to_string(); // Generate a request ID if middleware didn't provide one

  tracing::info!(
    request_id = %request_id,
    wallet_address = %request_data.wallet_address,
    wallet_address_debug = ?request_data.wallet_address,
    wallet_address_len = request_data.wallet_address.len(),
    name = %request_data.name,
    email = ?request_data.email,
    "Processing user registration"
  );

  // Check if user already exists
  let existing_user =
    UserService::find_by_wallet_address(app_state.db.connection(), &request_data.wallet_address)
      .await
      .map_err(|err| {
        tracing::error!(
          request_id = %request_id,
          wallet_address = %request_data.wallet_address,
          error = %err,
          "Database error checking existing user"
        );
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          Json(AuthError {
            error: "Database error".to_string(),
          }),
        )
      })?;

  let user = if let Some(existing_user) = existing_user {
    tracing::info!(
      request_id = %request_id,
      wallet_address = %request_data.wallet_address,
      user_id = %existing_user.user.id,
      "UserProfile already exists, returning existing user"
    );
    existing_user
  } else {
    // Create new user
    let create_request = CreateUserRequest {
      wallet_address: request_data.wallet_address.clone(),
      name: request_data.name,
      email: request_data.email,
    };

    let new_user = UserService::create(app_state.db.connection(), create_request)
      .await
      .map_err(|err| {
        tracing::error!(
          request_id = %request_id,
          wallet_address = %request_data.wallet_address,
          error = %err,
          "Failed to create new user"
        );
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          Json(AuthError {
            error: "Failed to create user".to_string(),
          }),
        )
      })?;

    tracing::info!(
      request_id = %request_id,
      wallet_address = %request_data.wallet_address,
      user_id = %new_user.user.id,
      "Successfully created new user"
    );

    new_user
  };

  // Generate JWT token
  let token = generate_token(&user.user.wallet_address, &user.user.id).map_err(|_| {
    (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(AuthError {
        error: "Failed to generate token".to_string(),
      }),
    )
  })?;

  Ok(Json(RegisterUserResponse { token, user }))
}

pub async fn login_user(
  State(app_state): State<AppState>,
  payload: Result<Json<LoginUserRequest>, JsonRejection>,
) -> Result<Json<LoginUserResponse>, (StatusCode, Json<AuthError>)> {
  let Json(request) = payload.map_err(|rejection| {
    tracing::error!("JSON parsing error: {}", rejection);
    (
      StatusCode::BAD_REQUEST,
      Json(AuthError {
        error: format!(
          "Invalid JSON: {}. Required fields: walletAddress (string)",
          rejection
        ),
      }),
    )
  })?;

  // Check if user exists
  let existing_user =
    UserService::find_by_wallet_address(app_state.db.connection(), &request.wallet_address)
      .await
      .map_err(|_| {
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          Json(AuthError {
            error: "Database error".to_string(),
          }),
        )
      })?;

  let user = if let Some(existing_user) = existing_user {
    existing_user
  } else {
    return Err((
      StatusCode::NOT_FOUND,
      Json(AuthError {
        error: "UserProfile not found".to_string(),
      }),
    ));
  };

  // Generate JWT token
  let token = generate_token(&user.user.wallet_address, &user.user.id).map_err(|_| {
    (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(AuthError {
        error: "Failed to generate token".to_string(),
      }),
    )
  })?;

  Ok(Json(LoginUserResponse { token, user }))
}

pub async fn verify_token(
  State(app_state): State<AppState>,
  Json(request): Json<VerifyTokenRequest>,
) -> Json<VerifyTokenResponse> {
  match verify_jwt_token(&request.token) {
    Ok(claims) => {
      // Parse user_id from string to UUID
      if let Ok(user_id) = Uuid::parse_str(&claims.user_id) {
        // Fetch user from database
        if let Ok(Some(user)) = UserService::find_by_id(app_state.db.connection(), user_id).await {
          let user_response = user_to_response(&user);
          return Json(VerifyTokenResponse {
            valid: true,
            user: Some(user_response),
          });
        }
      }
      // If user not found or UUID parsing failed
      Json(VerifyTokenResponse {
        valid: false,
        user: None,
      })
    }
    Err(_) => Json(VerifyTokenResponse {
      valid: false,
      user: None,
    }),
  }
}

fn generate_token(
  wallet_address: &str,
  user_id: &str,
) -> Result<String, jsonwebtoken::errors::Error> {
  let secret = "your-secret-key"; // In production, use proper secret from config

  let expiration = chrono::Utc::now()
    .checked_add_signed(chrono::Duration::days(7))
    .expect("valid timestamp")
    .timestamp();

  let claims = Claims {
    wallet_address: wallet_address.to_string(),
    user_id: user_id.to_string(),
    exp: expiration as usize,
  };

  let header = Header::new(Algorithm::HS256);
  encode(&header, &claims, &EncodingKey::from_secret(secret.as_ref()))
}

fn verify_jwt_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
  let secret = "your-secret-key"; // Same secret as used for encoding
  let validation = Validation::new(Algorithm::HS256);

  let token_data = decode::<Claims>(
    token,
    &DecodingKey::from_secret(secret.as_ref()),
    &validation,
  )?;

  Ok(token_data.claims)
}
