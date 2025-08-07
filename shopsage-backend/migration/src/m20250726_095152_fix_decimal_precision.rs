use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Fix decimal precision for rating and satisfaction fields
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE expert_profiles ALTER COLUMN rating TYPE DECIMAL(5,2);")
            .await?;
            
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE expert_stats ALTER COLUMN satisfaction TYPE DECIMAL(5,2);")
            .await?;
            
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE shopper_profiles ALTER COLUMN average_rating TYPE DECIMAL(5,2);")
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Revert back to original precision
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE expert_profiles ALTER COLUMN rating TYPE DECIMAL(3,2);")
            .await?;
            
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE expert_stats ALTER COLUMN satisfaction TYPE DECIMAL(3,2);")
            .await?;
            
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE shopper_profiles ALTER COLUMN average_rating TYPE DECIMAL(3,2);")
            .await?;

        Ok(())
    }
}
