use axum::{
    extract::{Request, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::middleware::auth::{extract_user, AuthError};
use crate::services::solana::SolanaService;
use crate::AppState;

#[derive(Debug, Deserialize, Validate)]
pub struct ProcessPaymentRequest {
    pub session_id: uuid::Uuid,
    pub transaction_hash: String,
}

#[derive(Debug, Serialize)]
pub struct ProcessPaymentResponse {
    pub payment: Payment,
    pub session: Session,
}

#[derive(Debug, Serialize)]
pub struct PaymentHistoryResponse {
    pub payments: Vec<PaymentWithDetails>,
}

#[derive(Debug, Deserialize)]
pub struct WebhookRequest {
    pub transaction_hash: String,
    pub status: String,
}

pub async fn process_payment(
    State(state): State<AppState>,
    request: Request,
    Json(payment_request): Json<ProcessPaymentRequest>,
) -> Result<Json<ProcessPaymentResponse>, (StatusCode, Json<AuthError>)> {
    let user = extract_user(&request)?;

    // Validate input
    payment_request.validate().map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(AuthError {
                error: format!("Validation error: {}", e),
            }),
        )
    })?;

    // Get session to verify ownership and amount
    let session = Session::find_by_id(&state.db.pool, payment_request.session_id)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthError {
                    error: "Database error".to_string(),
                }),
            )
        })?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(AuthError {
                error: "Session not found".to_string(),
            }),
        ))?;

    // Verify user is the shopper in the session
    if session.shopper_id != user.id {
        return Err((
            StatusCode::FORBIDDEN,
            Json(AuthError {
                error: "Access denied".to_string(),
            }),
        ));
    }

    // Initialize Solana service
    let solana_service = SolanaService::new(&state.config.solana_rpc_url);

    // Verify transaction on Solana blockchain
    let is_valid = solana_service
        .verify_transaction(&payment_request.transaction_hash, &session.amount)
        .await
        .map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                Json(AuthError {
                    error: "Invalid transaction".to_string(),
                }),
            )
        })?;

    if !is_valid {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(AuthError {
                error: "Transaction verification failed".to_string(),
            }),
        ));
    }

    // Create payment record
    let create_payment_request = CreatePaymentRequest {
        session_id: payment_request.session_id,
        amount: session.amount.clone(),
        transaction_hash: Some(payment_request.transaction_hash.clone()),
    };

    let payment = Payment::create(&state.db.pool, create_payment_request)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthError {
                    error: "Failed to create payment".to_string(),
                }),
            )
        })?;

    // Update session payment status
    let update_session_request = UpdateSessionRequest {
        status: None,
        end_time: None,
        payment_status: Some(crate::models::session::PaymentStatus::Completed),
        transaction_hash: Some(payment_request.transaction_hash),
    };

    let updated_session = Session::update(&state.db.pool, payment_request.session_id, update_session_request)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthError {
                    error: "Failed to update session".to_string(),
                }),
            )
        })?;

    // Update payment status to completed
    let update_payment_request = UpdatePaymentRequest {
        status: Some(PaymentStatus::Completed),
        transaction_hash: None,
    };

    let final_payment = Payment::update(&state.db.pool, payment.id, update_payment_request)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthError {
                    error: "Failed to update payment".to_string(),
                }),
            )
        })?;

    Ok(Json(ProcessPaymentResponse {
        payment: final_payment,
        session: updated_session,
    }))
}

pub async fn get_payment_history(
    State(state): State<AppState>,
    request: Request,
) -> Result<Json<PaymentHistoryResponse>, (StatusCode, Json<AuthError>)> {
    let user = extract_user(&request)?;

    let payments = Payment::find_by_user_id(&state.db.pool, user.id)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthError {
                    error: "Failed to fetch payment history".to_string(),
                }),
            )
        })?;

    Ok(Json(PaymentHistoryResponse { payments }))
}

pub async fn webhook(
    State(state): State<AppState>,
    Json(webhook_request): Json<WebhookRequest>,
) -> Result<StatusCode, (StatusCode, Json<AuthError>)> {
    // Find payment by transaction hash
    let payments = sqlx::query!(
        "SELECT id FROM payments WHERE transaction_hash = $1",
        webhook_request.transaction_hash
    )
    .fetch_all(&state.db.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(AuthError {
                error: "Database error".to_string(),
            }),
        )
    })?;

    if payments.is_empty() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(AuthError {
                error: "Payment not found".to_string(),
            }),
        ));
    }

    // Update payment status based on webhook
    let status = match webhook_request.status.as_str() {
        "completed" => PaymentStatus::Completed,
        "failed" => PaymentStatus::Failed,
        _ => PaymentStatus::Pending,
    };

    let update_request = UpdatePaymentRequest {
        status: Some(status),
        transaction_hash: None,
    };

    Payment::update(&state.db.pool, payments[0].id, update_request)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthError {
                    error: "Failed to update payment".to_string(),
                }),
            )
        })?;

    Ok(StatusCode::OK)
}