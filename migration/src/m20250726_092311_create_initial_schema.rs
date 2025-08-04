use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create users table without user_type column
        manager
            .create_table(
                Table::create()
                    .table(Users::Table)
                    .if_not_exists()
                    .col(uuid(Users::Id).primary_key())
                    .col(string_len(Users::WalletAddress, 80).not_null().unique_key())
                    .col(string(Users::Name).not_null())
                    .col(string(Users::Email))
                    .col(timestamp_with_time_zone(Users::CreatedAt).not_null())
                    .col(timestamp_with_time_zone(Users::UpdatedAt).not_null())
                    .to_owned(),
            )
            .await?;

        // Create shopper_profiles table
        manager
            .create_table(
                Table::create()
                    .table(ShopperProfiles::Table)
                    .if_not_exists()
                    .col(uuid(ShopperProfiles::Id).primary_key())
                    .col(uuid(ShopperProfiles::UserId).not_null())
                    .col(json(ShopperProfiles::Categories).not_null())
                    .col(decimal_len(ShopperProfiles::PriceRangeMin, 10, 2).not_null())
                    .col(decimal_len(ShopperProfiles::PriceRangeMax, 10, 2).not_null())
                    .col(json(ShopperProfiles::PreferredExperts).not_null())
                    .col(json(ShopperProfiles::SavedExperts).not_null())
                    .col(json(ShopperProfiles::Interests).not_null())
                    .col(integer(ShopperProfiles::TotalSessions).not_null().default(0))
                    .col(decimal_len(ShopperProfiles::TotalSpent, 10, 2).not_null().default(0))
                    .col(decimal_len(ShopperProfiles::AverageRating, 5, 2).not_null().default(0))
                    .col(timestamp_with_time_zone(ShopperProfiles::CreatedAt).not_null())
                    .col(timestamp_with_time_zone(ShopperProfiles::UpdatedAt).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_shopper_profiles_user_id")
                            .from(ShopperProfiles::Table, ShopperProfiles::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        // Create expert_profiles table
        manager
            .create_table(
                Table::create()
                    .table(ExpertProfiles::Table)
                    .if_not_exists()
                    .col(uuid(ExpertProfiles::Id).primary_key())
                    .col(uuid(ExpertProfiles::UserId).not_null())
                    .col(string(ExpertProfiles::Specialization).not_null())
                    .col(text(ExpertProfiles::Bio))
                    .col(decimal_len(ExpertProfiles::SessionRate, 10, 2).not_null())
                    .col(decimal_len(ExpertProfiles::Rating, 5, 2))
                    .col(integer(ExpertProfiles::TotalConsultations))
                    .col(boolean(ExpertProfiles::IsVerified))
                    .col(boolean(ExpertProfiles::IsOnline))
                    .col(string(ExpertProfiles::ProfileImageUrl))
                    .col(timestamp_with_time_zone(ExpertProfiles::CreatedAt).not_null())
                    .col(timestamp_with_time_zone(ExpertProfiles::UpdatedAt).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_expert_profiles_user_id")
                            .from(ExpertProfiles::Table, ExpertProfiles::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        // Create expert_stats table
        manager
            .create_table(
                Table::create()
                    .table(ExpertStats::Table)
                    .if_not_exists()
                    .col(uuid(ExpertStats::Id).primary_key())
                    .col(uuid(ExpertStats::UserId).not_null())
                    .col(decimal_len(ExpertStats::TotalEarnings, 10, 2).not_null().default(0))
                    .col(decimal_len(ExpertStats::TotalHours, 10, 2).not_null().default(0))
                    .col(decimal_len(ExpertStats::ResponseTime, 10, 2).not_null().default(0))
                    .col(decimal_len(ExpertStats::Satisfaction, 5, 2).not_null().default(0))
                    .col(timestamp_with_time_zone(ExpertStats::CreatedAt).not_null())
                    .col(timestamp_with_time_zone(ExpertStats::UpdatedAt).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_expert_stats_user_id")
                            .from(ExpertStats::Table, ExpertStats::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        // Create expert_availability table
        manager
            .create_table(
                Table::create()
                    .table(ExpertAvailability::Table)
                    .if_not_exists()
                    .col(uuid(ExpertAvailability::Id).primary_key())
                    .col(uuid(ExpertAvailability::UserId).not_null())
                    .col(string(ExpertAvailability::DayOfWeek).not_null())
                    .col(time(ExpertAvailability::StartTime).not_null())
                    .col(time(ExpertAvailability::EndTime).not_null())
                    .col(boolean(ExpertAvailability::Available).not_null().default(true))
                    .col(string(ExpertAvailability::Timezone).not_null())
                    .col(timestamp_with_time_zone(ExpertAvailability::CreatedAt).not_null())
                    .col(timestamp_with_time_zone(ExpertAvailability::UpdatedAt).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_expert_availability_user_id")
                            .from(ExpertAvailability::Table, ExpertAvailability::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await

    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ExpertAvailability::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ExpertStats::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ExpertProfiles::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ShopperProfiles::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Users::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
    WalletAddress,
    Name,
    Email,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ShopperProfiles {
    Table,
    Id,
    UserId,
    Categories,
    PriceRangeMin,
    PriceRangeMax,
    PreferredExperts,
    SavedExperts,
    Interests,
    TotalSessions,
    TotalSpent,
    AverageRating,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ExpertProfiles {
    Table,
    Id,
    UserId,
    Specialization,
    Bio,
    SessionRate,
    Rating,
    TotalConsultations,
    IsVerified,
    IsOnline,
    ProfileImageUrl,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ExpertStats {
    Table,
    Id,
    UserId,
    TotalEarnings,
    TotalHours,
    ResponseTime,
    Satisfaction,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ExpertAvailability {
    Table,
    Id,
    UserId,
    DayOfWeek,
    StartTime,
    EndTime,
    Available,
    Timezone,
    CreatedAt,
    UpdatedAt,
}
