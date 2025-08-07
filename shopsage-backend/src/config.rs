use std::env;

#[derive(Clone, Debug)]
pub struct Config {
  pub database_url: String,
  pub redis_url: String,
  pub jwt_secret: String,
  pub solana_rpc_url: String,
  pub port: u16,
}

impl Config {
  pub fn from_env() -> Result<Self, env::VarError> {
    dotenvy::dotenv().ok();

    Ok(Config {
      database_url: env::var("DATABASE_URL").or_else(|_| {
        let db_host = env::var("DB_HOST").unwrap_or_else(|_| "localhost".to_string());
        let db_name = env::var("DB_NAME").unwrap_or_else(|_| "shopsage".to_string());
        let db_user = env::var("DB_USER").unwrap_or_else(|_| "postgres".to_string());
        let db_password = env::var("DB_PASSWORD").unwrap_or_else(|_| "".to_string());
        Ok(format!(
          "postgresql://{}:{}@{}/{}",
          db_user, db_password, db_host, db_name
        ))
      })?,
      redis_url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string()),
      jwt_secret: env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string()),
      solana_rpc_url: env::var("SOLANA_RPC_URL")
        .unwrap_or_else(|_| "https://api.mainnet-beta.solana.com".to_string()),
      port: env::var("PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse()
        .unwrap_or(3001),
    })
  }
}
