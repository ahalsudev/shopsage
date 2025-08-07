//! `SeaORM` Entity for sessions table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "sessions")]
pub struct Model {
  #[sea_orm(primary_key, auto_increment = false)]
  pub id: Uuid,
  pub expert_id: Uuid,
  pub shopper_id: Uuid,
  pub status: String,
  #[sea_orm(column_type = "Decimal(Some((10, 2)))")]
  pub amount: Decimal,
  pub start_time: Option<DateTimeWithTimeZone>,
  pub end_time: Option<DateTimeWithTimeZone>,
  #[sea_orm(column_type = "Text")]
  pub notes: Option<String>,
  pub created_at: DateTimeWithTimeZone,
  pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
  #[sea_orm(
    belongs_to = "super::users::Entity",
    from = "Column::ExpertId",
    to = "super::users::Column::Id",
    on_update = "NoAction",
    on_delete = "Cascade"
  )]
  Expert,
  #[sea_orm(
    belongs_to = "super::users::Entity",
    from = "Column::ShopperId",
    to = "super::users::Column::Id",
    on_update = "NoAction",
    on_delete = "Cascade"
  )]
  Shopper,
}

impl Related<super::users::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Expert.def()
  }
}

impl ActiveModelBehavior for ActiveModel {}