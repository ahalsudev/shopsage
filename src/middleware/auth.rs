use axum::{
  extract::Request,
  http::{header, StatusCode},
  middleware::Next,
  response::Response,
  Json,
};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::services::user_service::UserProfile;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
  pub wallet_address: String,
  pub user_id: Uuid,
  pub exp: usize,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum AuthError {
  InvalidToken,
  DatabaseError,
  Custom { error: String },
}

impl AuthError {
  pub fn custom(message: &str) -> Self {
    Self::Custom {
      error: message.to_string(),
    }
  }
}

pub async fn auth_middleware(
  mut request: Request,
  next: Next,
) -> Result<Response, (StatusCode, Json<AuthError>)> {
  let token = extract_token(&request)?;

  // For now, just verify the token structure is valid
  // In a full implementation, you'd verify against the database
  let claims = verify_basic_token(&token)?;

  // Create a mock user profile from the claims
  // In a real implementation, you'd fetch the user from the database
  let user = UserProfile {
    id: claims.user_id.to_string(),
    wallet_address: claims.wallet_address.clone(),
    name: "Mock User".to_string(), // Would come from database
    email: Some("user@example.com".to_string()), // Would come from database
    created_at: "2024-01-01T00:00:00Z".to_string(), // Would come from database
    updated_at: "2024-01-01T00:00:00Z".to_string(), // Would come from database
  };

  // Insert the user into request extensions
  request.extensions_mut().insert(user);

  Ok(next.run(request).await)
}

fn extract_token(request: &Request) -> Result<String, (StatusCode, Json<AuthError>)> {
  let auth_header = request
    .headers()
    .get(header::AUTHORIZATION)
    .and_then(|header| header.to_str().ok())
    .ok_or((
      StatusCode::UNAUTHORIZED,
      Json(AuthError::custom("Missing authorization header")),
    ))?;

  if !auth_header.starts_with("Bearer ") {
    return Err((
      StatusCode::UNAUTHORIZED,
      Json(AuthError::custom("Invalid authorization format")),
    ));
  }

  Ok(auth_header.trim_start_matches("Bearer ").to_string())
}

fn verify_basic_token(token: &str) -> Result<Claims, (StatusCode, Json<AuthError>)> {
  // Use a default secret for now - in production this would come from config
  let secret = "your-secret-key";
  let validation = Validation::new(Algorithm::HS256);
  let token_data = decode::<Claims>(
    token,
    &DecodingKey::from_secret(secret.as_ref()),
    &validation,
  )
  .map_err(|_| {
    (
      StatusCode::UNAUTHORIZED,
      Json(AuthError::InvalidToken),
    )
  })?;

  Ok(token_data.claims)
}

pub fn generate_token(
  wallet_address: &str,
  user_id: Uuid,
  secret: &str,
) -> Result<String, jsonwebtoken::errors::Error> {
  let expiration = chrono::Utc::now()
    .checked_add_signed(chrono::Duration::days(7))
    .expect("valid timestamp")
    .timestamp();

  let claims = Claims {
    wallet_address: wallet_address.to_string(),
    user_id,
    exp: expiration as usize,
  };

  let header = Header::new(Algorithm::HS256);
  encode(&header, &claims, &EncodingKey::from_secret(secret.as_ref()))
}

// Helper function to extract user from request extensions
pub fn extract_user(request: &Request) -> Result<&UserProfile, (StatusCode, Json<AuthError>)> {
  request.extensions().get::<UserProfile>().ok_or((
    StatusCode::UNAUTHORIZED,
    Json(AuthError::custom("User not found in request")),
  ))
}
