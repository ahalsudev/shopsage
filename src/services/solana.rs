use reqwest::Client;
use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(thiserror::Error, Debug)]
pub enum SolanaError {
  #[error("HTTP request error: {0}")]
  RequestError(#[from] reqwest::Error),
  #[error("Invalid transaction signature: {0}")]
  InvalidSignature(String),
  #[error("Transaction not found: {0}")]
  TransactionNotFound(String),
  #[error("Invalid amount or parsing error")]
  InvalidAmount,
  #[error("Transaction failed: {0}")]
  TransactionFailed(String),
  #[error("Invalid wallet address: {0}")]
  InvalidWalletAddress(String),
  #[error("JSON parsing error: {0}")]
  JsonError(#[from] serde_json::Error),
}

#[derive(Debug, Serialize)]
struct RpcRequest {
  jsonrpc: String,
  id: u64,
  method: String,
  params: Value,
}

#[derive(Debug, Deserialize)]
struct RpcResponse<T> {
  result: Option<T>,
  error: Option<RpcError>,
}

#[derive(Debug, Deserialize)]
struct RpcError {
  code: i32,
  message: String,
}

#[derive(Debug, Deserialize)]
struct TransactionResponse {
  meta: Option<TransactionMeta>,
  transaction: TransactionData,
}

#[derive(Debug, Deserialize)]
struct TransactionMeta {
  err: Option<Value>,
  #[serde(rename = "preBalances")]
  pre_balances: Option<Vec<u64>>,
  #[serde(rename = "postBalances")]
  post_balances: Option<Vec<u64>>,
  fee: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct TransactionData {
  message: TransactionMessage,
}

#[derive(Debug, Deserialize)]
struct TransactionMessage {
  #[serde(rename = "accountKeys")]
  account_keys: Vec<String>,
  instructions: Vec<Value>,
}

#[derive(Debug, Deserialize)]
struct AccountInfo {
  lamports: u64,
  owner: String,
  executable: bool,
  #[serde(rename = "rentEpoch")]
  rent_epoch: u64,
}

pub struct SolanaService {
  client: Client,
  rpc_url: String,
}

impl SolanaService {
  pub fn new(rpc_url: &str) -> Self {
    Self {
      client: Client::new(),
      rpc_url: rpc_url.to_string(),
    }
  }

  /// Verify a Solana transaction exists and matches expected criteria
  pub async fn verify_transaction(
    &self,
    transaction_hash: &str,
    expected_amount_sol: Decimal,
    expected_recipient: Option<&str>,
  ) -> Result<bool, SolanaError> {
    // Validate transaction signature format (base58, 64-88 chars)
    if !self.is_valid_signature(transaction_hash) {
      return Err(SolanaError::InvalidSignature(transaction_hash.to_string()));
    }

    // Get transaction details from Solana RPC
    let transaction = self.get_transaction(transaction_hash).await?;

    // Check if transaction was successful
    if let Some(meta) = &transaction.meta {
      if meta.err.is_some() {
        return Err(SolanaError::TransactionFailed(
          "Transaction failed on-chain".to_string(),
        ));
      }
    } else {
      return Err(SolanaError::InvalidAmount);
    }

    // Verify the transfer amount
    let actual_amount = self.extract_transfer_amount(&transaction)?;
    let actual_sol = self.lamports_to_sol(actual_amount);

    // Allow small tolerance for fees and rounding (0.001 SOL = 1,000,000 lamports)
    let tolerance = Decimal::new(1, 3); // 0.001 SOL
    let difference = (expected_amount_sol - actual_sol).abs();

    if difference > tolerance {
      tracing::warn!(
        "Amount mismatch: expected {}, actual {}, difference {}",
        expected_amount_sol,
        actual_sol,
        difference
      );
      return Ok(false);
    }

    // Optionally verify recipient address
    if let Some(recipient) = expected_recipient {
      if !self.verify_recipient(&transaction, recipient)? {
        tracing::warn!("Recipient verification failed for {}", recipient);
        return Ok(false);
      }
    }

    Ok(true)
  }

  /// Get account balance in SOL
  pub async fn get_balance(&self, wallet_address: &str) -> Result<Decimal, SolanaError> {
    if !self.is_valid_wallet_address(wallet_address) {
      return Err(SolanaError::InvalidWalletAddress(
        wallet_address.to_string(),
      ));
    }

    let request = RpcRequest {
      jsonrpc: "2.0".to_string(),
      id: 1,
      method: "getBalance".to_string(),
      params: serde_json::json!([wallet_address]),
    };

    let response: RpcResponse<HashMap<String, u64>> = self.send_rpc_request(request).await?;

    if let Some(result) = response.result {
      if let Some(lamports) = result.get("value") {
        return Ok(self.lamports_to_sol(*lamports));
      }
    }

    if let Some(error) = response.error {
      return Err(SolanaError::InvalidAmount);
    }

    Err(SolanaError::InvalidAmount)
  }

  /// Validate wallet address format (base58, 32-44 characters)
  pub fn is_valid_wallet_address(&self, address: &str) -> bool {
    if address.len() < 32 || address.len() > 44 {
      return false;
    }

    // Basic base58 character validation
    address
      .chars()
      .all(|c| matches!(c, '1'..='9' | 'A'..='H' | 'J'..='N' | 'P'..='Z' | 'a'..='k' | 'm'..='z'))
  }

  /// Validate transaction signature format
  pub fn is_valid_signature(&self, signature: &str) -> bool {
    if signature.len() < 64 || signature.len() > 88 {
      return false;
    }

    // Basic base58 validation
    signature
      .chars()
      .all(|c| matches!(c, '1'..='9' | 'A'..='H' | 'J'..='N' | 'P'..='Z' | 'a'..='k' | 'm'..='z'))
  }

  /// Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
  pub fn lamports_to_sol(&self, lamports: u64) -> Decimal {
    Decimal::from(lamports) / Decimal::from(1_000_000_000u64)
  }

  /// Convert SOL to lamports
  pub fn sol_to_lamports(&self, sol: Decimal) -> u64 {
    (sol * Decimal::from(1_000_000_000u64))
      .to_u64()
      .unwrap_or(0)
  }

  // Private helper methods

  async fn get_transaction(&self, signature: &str) -> Result<TransactionResponse, SolanaError> {
    let request = RpcRequest {
      jsonrpc: "2.0".to_string(),
      id: 1,
      method: "getTransaction".to_string(),
      params: serde_json::json!([
          signature,
          {
              "encoding": "json",
              "maxSupportedTransactionVersion": 0
          }
      ]),
    };

    let response: RpcResponse<TransactionResponse> = self.send_rpc_request(request).await?;

    if let Some(result) = response.result {
      Ok(result)
    } else if let Some(error) = response.error {
      Err(SolanaError::TransactionNotFound(format!(
        "RPC Error {}: {}",
        error.code, error.message
      )))
    } else {
      Err(SolanaError::TransactionNotFound(signature.to_string()))
    }
  }

  fn extract_transfer_amount(&self, transaction: &TransactionResponse) -> Result<u64, SolanaError> {
    let meta = transaction
      .meta
      .as_ref()
      .ok_or(SolanaError::InvalidAmount)?;

    // Get balance changes
    let pre_balances = meta
      .pre_balances
      .as_ref()
      .ok_or(SolanaError::InvalidAmount)?;
    let post_balances = meta
      .post_balances
      .as_ref()
      .ok_or(SolanaError::InvalidAmount)?;

    if pre_balances.len() != post_balances.len() {
      return Err(SolanaError::InvalidAmount);
    }

    // Find the largest positive balance change (money received)
    let mut max_increase = 0u64;
    for (pre, post) in pre_balances.iter().zip(post_balances.iter()) {
      if post > pre {
        let increase = post - pre;
        if increase > max_increase {
          max_increase = increase;
        }
      }
    }

    if max_increase == 0 {
      return Err(SolanaError::InvalidAmount);
    }

    Ok(max_increase)
  }

  fn verify_recipient(
    &self,
    transaction: &TransactionResponse,
    expected_recipient: &str,
  ) -> Result<bool, SolanaError> {
    // Check if the expected recipient is in the account keys
    let account_keys = &transaction.transaction.message.account_keys;
    Ok(account_keys.contains(&expected_recipient.to_string()))
  }

  async fn send_rpc_request<T>(&self, request: RpcRequest) -> Result<RpcResponse<T>, SolanaError>
  where
    T: for<'de> Deserialize<'de>,
  {
    let response = self
      .client
      .post(&self.rpc_url)
      .header("Content-Type", "application/json")
      .json(&request)
      .send()
      .await?;

    let rpc_response: RpcResponse<T> = response.json().await?;
    Ok(rpc_response)
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_wallet_address_validation() {
    let service = SolanaService::new("https://api.mainnet-beta.solana.com");

    // Valid addresses
    assert!(service.is_valid_wallet_address("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"));
    assert!(service.is_valid_wallet_address("11111111111111111111111111111112"));

    // Invalid addresses
    assert!(!service.is_valid_wallet_address("invalid"));
    assert!(!service.is_valid_wallet_address(""));
    assert!(!service.is_valid_wallet_address("0xabc123")); // Ethereum format
  }

  #[test]
  fn test_lamports_conversion() {
    let service = SolanaService::new("https://api.mainnet-beta.solana.com");

    assert_eq!(service.lamports_to_sol(1_000_000_000), Decimal::from(1));
    assert_eq!(service.lamports_to_sol(500_000_000), Decimal::new(5, 1));
    assert_eq!(service.sol_to_lamports(Decimal::from(1)), 1_000_000_000);
  }
}
