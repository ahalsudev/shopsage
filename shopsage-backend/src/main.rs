use axum::{
  extract::Path,
  middleware::from_fn,
  routing::{get, post, put},
  Json, Router,
};
use clap::{Parser, Subcommand};
use serde_json::{json, Value};
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod database;
mod entities;
mod handlers;
mod middleware;
mod seeders;
mod services;

use config::Config;
use database::Database;
use handlers::{auth, experts, profiles, sessions};
use middleware::logging;
use seeders::Seeder;
use services::solana::SolanaService;

#[derive(Clone)]
pub struct AppState {
  pub db: Database,
}

#[derive(Parser)]
#[command(name = "shopsage-backend")]
#[command(about = "ShopSage backend server with database utilities")]
struct Cli {
  #[command(subcommand)]
  command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
  /// Start the web server (default)
  Serve,
  /// Run database migrations
  Migrate,
  /// Seed the database with sample data
  Seed,
  /// Clear all seeded data from the database
  ClearSeeds,
  /// Reset database (migrate + seed)
  Reset,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
  // Initialize tracing with enhanced logging
  tracing_subscriber::registry()
    .with(
      tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "shopsage_backend=debug,tower_http=debug,axum=debug,sea_orm=debug".into()),
    )
    .with(
      tracing_subscriber::fmt::layer()
        .with_target(true)
        .with_line_number(true)
        .with_file(true),
    )
    .init();

  // Parse CLI arguments
  let cli = Cli::parse();

  // Load configuration
  let config = Config::from_env()?;

  // Set up database connection
  let database = Database::new(&config.database_url).await?;

  // Handle different commands
  match cli.command.unwrap_or(Commands::Serve) {
    Commands::Serve => {
      start_server(database, config).await?;
    }
    Commands::Migrate => {
      tracing::info!("Use 'sea-orm-cli migrate up --migration-dir ./migration' to run migrations");
    }
    Commands::Seed => {
      Seeder::run_all(database.connection()).await?;
    }
    Commands::ClearSeeds => {
      Seeder::clear_all(database.connection()).await?;
    }
    Commands::Reset => {
      tracing::info!(
        "Run migrations with 'sea-orm-cli migrate up --migration-dir ./migration' first, then:"
      );
      Seeder::clear_all(database.connection()).await?;
      Seeder::run_all(database.connection()).await?;
      tracing::info!("✅ Database reset completed!");
    }
  }

  Ok(())
}

async fn start_server(
  database: Database,
  config: Config,
) -> Result<(), Box<dyn std::error::Error>> {
  // Create application state
  let state = AppState { db: database };

  // Build application router
  let app = Router::new()
    .route("/", get(health_check))
    .route("/api/test", get(test_endpoint))
    .route(
      "/api/solana/validate-address/{address}",
      get(validate_solana_address),
    )
    .nest("/api/auth", auth_routes())
    .nest("/api/experts", expert_routes())
    .nest("/api/profiles", profile_routes())
    .nest("/api/sessions", session_routes())
    .with_state(state)
    .layer(from_fn(logging::logging_middleware))
    .layer(CorsLayer::permissive());

  // Start server
  let port = std::env::var("PORT")
    .unwrap_or_else(|_| "3001".to_string())
    .parse::<u16>()
    .unwrap_or(3001);

  let addr = format!("0.0.0.0:{}", port);
  tracing::info!("🚀 ShopSage Rust Backend running on {}", addr);

  let listener = tokio::net::TcpListener::bind(&addr).await?;
  axum::serve(
    listener,
    app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
  )
  .await?;

  Ok(())
}

async fn health_check() -> &'static str {
  "ShopSage Backend is running!"
}

async fn test_endpoint() -> Json<Value> {
  Json(json!({
      "message": "Test endpoint working",
      "status": "ok"
  }))
}

async fn validate_solana_address(Path(address): Path<String>) -> Json<Value> {
  let solana_service = SolanaService::new("https://api.mainnet-beta.solana.com");
  let is_valid = solana_service.is_valid_wallet_address(&address);

  Json(json!({
      "address": address,
      "is_valid": is_valid,
      "message": if is_valid { "Valid Solana address" } else { "Invalid Solana address" }
  }))
}

fn profile_routes() -> Router<AppState> {
  Router::new()
    .route("/complete", get(profiles::get_complete_user_profile))
    .route("/profile", put(profiles::update_user_profile))
    .route("/shopper", post(profiles::create_shopper_profile))
    .route("/shopper", get(profiles::get_shopper_profile))
    .route("/shopper", put(profiles::update_shopper_profile))
    .route("/expert", post(profiles::create_expert_profile))
    .route("/expert", get(profiles::get_expert_profile))
    .route("/expert", put(profiles::update_expert_profile))
    .layer(from_fn(middleware::auth::auth_middleware))
}

fn session_routes() -> Router<AppState> {
  Router::new()
    .route("/", post(sessions::create_session))
    .route("/expert/{expert_id}", get(sessions::list_sessions_by_expert))
    .route("/shopper/{shopper_id}", get(sessions::list_sessions_by_shopper))
    .route("/{id}", get(sessions::get_session))
    .route("/{id}", put(sessions::update_session))
}

fn auth_routes() -> Router<AppState> {
  Router::new()
    .route("/register", post(auth::register_user))
    .route("/login", post(auth::login_user))
}

fn expert_routes() -> Router<AppState> {
  Router::new()
    .route("/list", get(experts::list_experts))
    .route("/search", get(experts::search_experts))
    .route("/{id}", get(experts::get_expert_by_id))
}
