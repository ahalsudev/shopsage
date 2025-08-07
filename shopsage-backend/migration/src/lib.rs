pub use sea_orm_migration::prelude::*;

mod m20250726_092311_create_initial_schema;
mod m20250726_095152_fix_decimal_precision;
mod m20250804_000000_create_sessions_table;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250726_092311_create_initial_schema::Migration),
            Box::new(m20250726_095152_fix_decimal_precision::Migration),
            Box::new(m20250804_000000_create_sessions_table::Migration),
        ]
    }
}
