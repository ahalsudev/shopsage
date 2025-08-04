use sea_orm::{Database as SeaDatabase, DatabaseConnection, DbErr};

#[derive(Clone)]
pub struct Database {
  pub connection: DatabaseConnection,
}

impl Database {
  pub async fn new(database_url: &str) -> Result<Self, DbErr> {
    let connection = SeaDatabase::connect(database_url).await?;
    Ok(Database { connection })
  }

  pub fn connection(&self) -> &DatabaseConnection {
    &self.connection
  }
}

#[derive(thiserror::Error, Debug)]
pub enum DatabaseError {
  #[error("Database error: {0}")]
  DbError(#[from] DbErr),
  #[error("User not found")]
  UserNotFound,
  #[error("Expert not found")]
  ExpertNotFound,
  #[error("Session not found")]
  SessionNotFound,
  #[error("Payment not found")]
  PaymentNotFound,
}

pub type DatabaseResult<T> = Result<T, DatabaseError>;
