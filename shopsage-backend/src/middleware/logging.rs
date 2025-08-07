use axum::{
  extract::Request,
  http::{Method, Uri, Version},
  middleware::Next,
  response::IntoResponse,
};
use std::time::Instant;
use tracing::{error, info, warn};
use uuid::Uuid;

#[derive(Clone)]
pub struct RequestId(pub String);

pub async fn logging_middleware(request: Request, next: Next) -> impl IntoResponse {
  let start = Instant::now();
  let request_id = Uuid::new_v4().to_string();

  // Extract useful information from request
  let method = request.method().clone();
  let uri = request.uri().clone();
  let version = request.version();
  let headers = request.headers().clone();
  let user_agent = headers
    .get("user-agent")
    .and_then(|h| h.to_str().ok())
    .unwrap_or("unknown");

  let content_type = headers
    .get("content-type")
    .and_then(|h| h.to_str().ok())
    .unwrap_or("none");

  let accept = headers
    .get("accept")
    .and_then(|h| h.to_str().ok())
    .unwrap_or("none");

  let path = uri.path();

  // Add request ID to request extensions for use in handlers
  // Note: we can't modify the request directly here, so skip this for now

  // Log the incoming request
  info!(
      request_id = %request_id,
      method = %method,
      path = %path,
      uri = %uri,
      version = ?version,
      user_agent = %user_agent,
      content_type = %content_type,
      accept = %accept,
      "📥 Incoming request"
  );

  // Process the request
  let response = next.run(request).await;

  let latency = start.elapsed();
  let status = response.status();

  // Log based on status code level
  match status.as_u16() {
    200..=299 => {
      info!(
          request_id = %request_id,
          status = %status,
          latency_ms = latency.as_millis(),
          "✅ Request completed successfully"
      );
    }
    300..=399 => {
      info!(
          request_id = %request_id,
          status = %status,
          latency_ms = latency.as_millis(),
          "↩️ Request redirected"
      );
    }
    400..=499 => {
      warn!(
          request_id = %request_id,
          status = %status,
          latency_ms = latency.as_millis(),
          "⚠️ Client error"
      );
    }
    500..=599 => {
      error!(
          request_id = %request_id,
          status = %status,
          latency_ms = latency.as_millis(),
          "❌ Server error"
      );
    }
    _ => {
      info!(
          request_id = %request_id,
          status = %status,
          latency_ms = latency.as_millis(),
          "📤 Request completed"
      );
    }
  }

  response
}

// Helper to extract request ID from extensions in handlers
pub fn get_request_id<B>(request: &Request<B>) -> Option<String> {
  request
    .extensions()
    .get::<RequestId>()
    .map(|req_id| req_id.0.clone())
}
