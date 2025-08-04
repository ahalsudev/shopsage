use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create sessions table
        manager
            .create_table(
                Table::create()
                    .table(Sessions::Table)
                    .if_not_exists()
                    .col(uuid(Sessions::Id).primary_key())
                    .col(uuid(Sessions::ExpertId).not_null())
                    .col(uuid(Sessions::ShopperId).not_null())
                    .col(string(Sessions::Status).not_null().default("created"))
                    .col(decimal_len(Sessions::Amount, 10, 2).not_null())
                    .col(timestamp_with_time_zone(Sessions::StartTime))
                    .col(timestamp_with_time_zone(Sessions::EndTime))
                    .col(text(Sessions::Notes))
                    .col(timestamp_with_time_zone(Sessions::CreatedAt).not_null())
                    .col(timestamp_with_time_zone(Sessions::UpdatedAt).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sessions_expert_id")
                            .from(Sessions::Table, Sessions::ExpertId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sessions_shopper_id")
                            .from(Sessions::Table, Sessions::ShopperId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Sessions::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Sessions {
    Table,
    Id,
    ExpertId,
    ShopperId,
    Status,
    Amount,
    StartTime,
    EndTime,
    Notes,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
}