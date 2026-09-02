BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[roles] (
    [code] VARCHAR(32) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [is_system] BIT NOT NULL CONSTRAINT [roles_is_system_df] DEFAULT 0,
    [is_default] BIT NOT NULL CONSTRAINT [roles_is_default_df] DEFAULT 0,
    [is_active] BIT NOT NULL CONSTRAINT [roles_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [roles_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [roles_pkey] PRIMARY KEY CLUSTERED ([code]),
    CONSTRAINT [UX_roles_name] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [email] NVARCHAR(320) NOT NULL,
    [normalized_email] NVARCHAR(320) NOT NULL,
    [password_hash] NVARCHAR(500),
    [role] VARCHAR(32) NOT NULL,
    [department_id] UNIQUEIDENTIFIER,
    [is_active] BIT NOT NULL CONSTRAINT [users_is_active_df] DEFAULT 1,
    [must_change_password] BIT NOT NULL CONSTRAINT [users_must_change_password_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_users_normalized_email] UNIQUE NONCLUSTERED ([normalized_email])
);

-- CreateTable
CREATE TABLE [dbo].[refresh_tokens] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [token_hash] VARCHAR(128) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [revoked_at] DATETIME2,
    [replaced_by] UNIQUEIDENTIFIER,
    [user_agent] NVARCHAR(500),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [refresh_tokens_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [refresh_tokens_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_refresh_tokens_hash] UNIQUE NONCLUSTERED ([token_hash])
);

-- CreateTable
CREATE TABLE [dbo].[role_permissions] (
    [role] VARCHAR(32) NOT NULL,
    [can_create_edit_initiatives] BIT NOT NULL CONSTRAINT [role_permissions_can_create_edit_initiatives_df] DEFAULT 0,
    [can_delete_initiatives] BIT NOT NULL CONSTRAINT [role_permissions_can_delete_initiatives_df] DEFAULT 0,
    [can_access_admin] BIT NOT NULL CONSTRAINT [role_permissions_can_access_admin_df] DEFAULT 0,
    [is_read_only] BIT NOT NULL CONSTRAINT [role_permissions_is_read_only_df] DEFAULT 0,
    [can_edit_archive] BIT NOT NULL CONSTRAINT [role_permissions_can_edit_archive_df] DEFAULT 0,
    CONSTRAINT [role_permissions_pkey] PRIMARY KEY CLUSTERED ([role])
);

-- CreateTable
CREATE TABLE [dbo].[departments] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [normalized_name] NVARCHAR(200) NOT NULL,
    [capacity_limit_points] DECIMAL(12,2) NOT NULL CONSTRAINT [departments_capacity_limit_points_df] DEFAULT 0,
    [is_active] BIT NOT NULL CONSTRAINT [departments_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [departments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [departments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_departments_normalized_name] UNIQUE NONCLUSTERED ([normalized_name])
);

-- CreateTable
CREATE TABLE [dbo].[managers] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [normalized_name] NVARCHAR(200) NOT NULL,
    [department_id] UNIQUEIDENTIFIER,
    [is_active] BIT NOT NULL CONSTRAINT [managers_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [managers_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [managers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_managers_normalized_name] UNIQUE NONCLUSTERED ([normalized_name])
);

-- CreateTable
CREATE TABLE [dbo].[priorities] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [normalized_name] NVARCHAR(100) NOT NULL,
    [color] VARCHAR(7),
    [is_active] BIT NOT NULL CONSTRAINT [priorities_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [priorities_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [priorities_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_priorities_normalized_name] UNIQUE NONCLUSTERED ([normalized_name])
);

-- CreateTable
CREATE TABLE [dbo].[card_status_definitions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [code] VARCHAR(32) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [normalized_name] NVARCHAR(100) NOT NULL,
    [color] VARCHAR(20) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [card_status_definitions_is_active_df] DEFAULT 1,
    [is_system] BIT NOT NULL CONSTRAINT [card_status_definitions_is_system_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [card_status_definitions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [card_status_definitions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_card_status_definitions_code] UNIQUE NONCLUSTERED ([code]),
    CONSTRAINT [UX_card_status_definitions_normalized_name] UNIQUE NONCLUSTERED ([normalized_name])
);

-- CreateTable
CREATE TABLE [dbo].[task_weight_definitions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [normalized_name] NVARCHAR(100) NOT NULL,
    [weight] DECIMAL(12,2) NOT NULL,
    [is_default] BIT NOT NULL CONSTRAINT [task_weight_definitions_is_default_df] DEFAULT 0,
    [is_system] BIT NOT NULL CONSTRAINT [task_weight_definitions_is_system_df] DEFAULT 0,
    [is_active] BIT NOT NULL CONSTRAINT [task_weight_definitions_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_weight_definitions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [task_weight_definitions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_task_weight_definitions_normalized_name] UNIQUE NONCLUSTERED ([normalized_name])
);

-- CreateTable
CREATE TABLE [dbo].[initiative_size_definitions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [normalized_name] NVARCHAR(100) NOT NULL,
    [min_score] DECIMAL(12,2) NOT NULL,
    [max_score] DECIMAL(12,2) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [initiative_size_definitions_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [initiative_size_definitions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [initiative_size_definitions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_initiative_size_definitions_normalized_name] UNIQUE NONCLUSTERED ([normalized_name])
);

-- CreateTable
CREATE TABLE [dbo].[custom_field_definitions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [normalized_name] NVARCHAR(200) NOT NULL,
    [entity_type] VARCHAR(16) NOT NULL,
    [field_type] VARCHAR(16) NOT NULL,
    [is_required] BIT NOT NULL CONSTRAINT [custom_field_definitions_is_required_df] DEFAULT 0,
    [is_active] BIT NOT NULL CONSTRAINT [custom_field_definitions_is_active_df] DEFAULT 1,
    [show_in_table] BIT NOT NULL CONSTRAINT [custom_field_definitions_show_in_table_df] DEFAULT 0,
    [show_in_cards] BIT NOT NULL CONSTRAINT [custom_field_definitions_show_in_cards_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [custom_field_definitions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [custom_field_definitions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_custom_field_definitions_entity_name] UNIQUE NONCLUSTERED ([entity_type],[normalized_name])
);

-- CreateTable
CREATE TABLE [dbo].[custom_field_options] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [definition_id] UNIQUEIDENTIFIER NOT NULL,
    [value] NVARCHAR(500) NOT NULL,
    [sort_order] INT NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [custom_field_options_is_active_df] DEFAULT 1,
    CONSTRAINT [custom_field_options_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_custom_field_options_definition_value] UNIQUE NONCLUSTERED ([definition_id],[value]),
    CONSTRAINT [UX_custom_field_options_definition_order] UNIQUE NONCLUSTERED ([definition_id],[sort_order])
);

-- CreateTable
CREATE TABLE [dbo].[initiatives] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [kind] VARCHAR(32) NOT NULL,
    [name] NVARCHAR(500) NOT NULL,
    [revision] INT NOT NULL CONSTRAINT [initiatives_revision_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [initiatives_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [initiatives_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[initiative_years] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [initiative_id] UNIQUEIDENTIFIER NOT NULL,
    [year] INT NOT NULL,
    [strategic_goal] NVARCHAR(2000),
    [revision] INT NOT NULL CONSTRAINT [initiative_years_revision_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [initiative_years_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [initiative_years_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_initiative_years_initiative_year] UNIQUE NONCLUSTERED ([initiative_id],[year])
);

-- CreateTable
CREATE TABLE [dbo].[preparation_stages] (
    [initiative_year_id] UNIQUEIDENTIFIER NOT NULL,
    [manager_id] UNIQUEIDENTIFIER,
    [priority_id] UNIQUEIDENTIFIER,
    [revision] INT NOT NULL CONSTRAINT [preparation_stages_revision_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [preparation_stages_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [preparation_stages_pkey] PRIMARY KEY CLUSTERED ([initiative_year_id])
);

-- CreateTable
CREATE TABLE [dbo].[preparation_stage_departments] (
    [initiative_year_id] UNIQUEIDENTIFIER NOT NULL,
    [department_id] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [preparation_stage_departments_pkey] PRIMARY KEY CLUSTERED ([initiative_year_id],[department_id])
);

-- CreateTable
CREATE TABLE [dbo].[quarter_cards] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [initiative_year_id] UNIQUEIDENTIFIER NOT NULL,
    [quarter] INT NOT NULL,
    [manager_id] UNIQUEIDENTIFIER,
    [priority_id] UNIQUEIDENTIFIER,
    [notes] NVARCHAR(max),
    [status_id] UNIQUEIDENTIFIER NOT NULL,
    [total_weight] DECIMAL(12,2) NOT NULL CONSTRAINT [quarter_cards_total_weight_df] DEFAULT 0,
    [size_definition_id] UNIQUEIDENTIFIER,
    [size_snapshot_name] NVARCHAR(100),
    [size_snapshot_min] DECIMAL(12,2),
    [size_snapshot_max] DECIMAL(12,2),
    [moved_from_year] INT,
    [moved_from_quarter] INT,
    [revision] INT NOT NULL CONSTRAINT [quarter_cards_revision_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [quarter_cards_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [quarter_cards_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_quarter_cards_year_quarter] UNIQUE NONCLUSTERED ([initiative_year_id],[quarter])
);

-- CreateTable
CREATE TABLE [dbo].[quarter_card_departments] (
    [quarter_card_id] UNIQUEIDENTIFIER NOT NULL,
    [department_id] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [quarter_card_departments_pkey] PRIMARY KEY CLUSTERED ([quarter_card_id],[department_id])
);

-- CreateTable
CREATE TABLE [dbo].[scope_items] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [quarter_card_id] UNIQUEIDENTIFIER NOT NULL,
    [lineage_id] UNIQUEIDENTIFIER NOT NULL,
    [copied_from_item_id] UNIQUEIDENTIFIER,
    [text] NVARCHAR(2000) NOT NULL,
    [status_code] VARCHAR(16) NOT NULL CONSTRAINT [scope_items_status_code_df] DEFAULT 'DEFAULT',
    [weight_definition_id] UNIQUEIDENTIFIER NOT NULL,
    [weight_snapshot_name] NVARCHAR(100) NOT NULL,
    [weight_snapshot_value] DECIMAL(12,2) NOT NULL,
    [moved_from_card_id] UNIQUEIDENTIFIER,
    [revision] INT NOT NULL CONSTRAINT [scope_items_revision_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [scope_items_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [scope_items_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_scope_items_card_lineage] UNIQUE NONCLUSTERED ([quarter_card_id],[lineage_id])
);

-- CreateTable
CREATE TABLE [dbo].[scope_item_executors] (
    [scope_item_id] UNIQUEIDENTIFIER NOT NULL,
    [department_id] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [scope_item_executors_pkey] PRIMARY KEY CLUSTERED ([scope_item_id],[department_id])
);

-- CreateTable
CREATE TABLE [dbo].[quarter_card_custom_field_values] (
    [quarter_card_id] UNIQUEIDENTIFIER NOT NULL,
    [definition_id] UNIQUEIDENTIFIER NOT NULL,
    [text_value] NVARCHAR(max),
    [number_value] DECIMAL(18,4),
    [boolean_value] BIT,
    [date_value] DATE,
    [option_value] NVARCHAR(200),
    CONSTRAINT [quarter_card_custom_field_values_pkey] PRIMARY KEY CLUSTERED ([quarter_card_id],[definition_id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_events] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [aggregate_type] VARCHAR(100) NOT NULL,
    [aggregate_id] NVARCHAR(100) NOT NULL,
    [action_code] VARCHAR(100) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [actor_user_id] UNIQUEIDENTIFIER,
    [actor_name] NVARCHAR(200) NOT NULL,
    [source_year] INT,
    [source_quarter] CHAR(2),
    [target_year] INT,
    [target_quarter] CHAR(2),
    [occurred_at] DATETIME2 NOT NULL CONSTRAINT [audit_events_occurred_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_events_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_refresh_tokens_user_id] ON [dbo].[refresh_tokens]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_initiatives_kind] ON [dbo].[initiatives]([kind]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_initiatives_kind_name] ON [dbo].[initiatives]([kind], [name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_initiative_years_year] ON [dbo].[initiative_years]([year]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_quarter_cards_quarter] ON [dbo].[quarter_cards]([quarter]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_scope_items_lineage] ON [dbo].[scope_items]([lineage_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_audit_events_aggregate] ON [dbo].[audit_events]([aggregate_type], [aggregate_id], [occurred_at]);

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_role_fkey] FOREIGN KEY ([role]) REFERENCES [dbo].[roles]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[role_permissions] ADD CONSTRAINT [role_permissions_role_fkey] FOREIGN KEY ([role]) REFERENCES [dbo].[roles]([code]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_department_id_fkey] FOREIGN KEY ([department_id]) REFERENCES [dbo].[departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[refresh_tokens] ADD CONSTRAINT [refresh_tokens_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[managers] ADD CONSTRAINT [managers_department_id_fkey] FOREIGN KEY ([department_id]) REFERENCES [dbo].[departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[custom_field_options] ADD CONSTRAINT [custom_field_options_definition_id_fkey] FOREIGN KEY ([definition_id]) REFERENCES [dbo].[custom_field_definitions]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[initiative_years] ADD CONSTRAINT [initiative_years_initiative_id_fkey] FOREIGN KEY ([initiative_id]) REFERENCES [dbo].[initiatives]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[preparation_stages] ADD CONSTRAINT [preparation_stages_initiative_year_id_fkey] FOREIGN KEY ([initiative_year_id]) REFERENCES [dbo].[initiative_years]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[preparation_stages] ADD CONSTRAINT [preparation_stages_manager_id_fkey] FOREIGN KEY ([manager_id]) REFERENCES [dbo].[managers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[preparation_stages] ADD CONSTRAINT [preparation_stages_priority_id_fkey] FOREIGN KEY ([priority_id]) REFERENCES [dbo].[priorities]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[preparation_stage_departments] ADD CONSTRAINT [preparation_stage_departments_initiative_year_id_fkey] FOREIGN KEY ([initiative_year_id]) REFERENCES [dbo].[preparation_stages]([initiative_year_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[preparation_stage_departments] ADD CONSTRAINT [preparation_stage_departments_department_id_fkey] FOREIGN KEY ([department_id]) REFERENCES [dbo].[departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [quarter_cards_initiative_year_id_fkey] FOREIGN KEY ([initiative_year_id]) REFERENCES [dbo].[initiative_years]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [quarter_cards_manager_id_fkey] FOREIGN KEY ([manager_id]) REFERENCES [dbo].[managers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [quarter_cards_priority_id_fkey] FOREIGN KEY ([priority_id]) REFERENCES [dbo].[priorities]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [quarter_cards_status_id_fkey] FOREIGN KEY ([status_id]) REFERENCES [dbo].[card_status_definitions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [quarter_cards_size_definition_id_fkey] FOREIGN KEY ([size_definition_id]) REFERENCES [dbo].[initiative_size_definitions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_card_departments] ADD CONSTRAINT [quarter_card_departments_quarter_card_id_fkey] FOREIGN KEY ([quarter_card_id]) REFERENCES [dbo].[quarter_cards]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_card_departments] ADD CONSTRAINT [quarter_card_departments_department_id_fkey] FOREIGN KEY ([department_id]) REFERENCES [dbo].[departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[scope_items] ADD CONSTRAINT [scope_items_quarter_card_id_fkey] FOREIGN KEY ([quarter_card_id]) REFERENCES [dbo].[quarter_cards]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[scope_items] ADD CONSTRAINT [scope_items_copied_from_item_id_fkey] FOREIGN KEY ([copied_from_item_id]) REFERENCES [dbo].[scope_items]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[scope_items] ADD CONSTRAINT [scope_items_weight_definition_id_fkey] FOREIGN KEY ([weight_definition_id]) REFERENCES [dbo].[task_weight_definitions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[scope_items] ADD CONSTRAINT [scope_items_moved_from_card_id_fkey] FOREIGN KEY ([moved_from_card_id]) REFERENCES [dbo].[quarter_cards]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[scope_item_executors] ADD CONSTRAINT [scope_item_executors_scope_item_id_fkey] FOREIGN KEY ([scope_item_id]) REFERENCES [dbo].[scope_items]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[scope_item_executors] ADD CONSTRAINT [scope_item_executors_department_id_fkey] FOREIGN KEY ([department_id]) REFERENCES [dbo].[departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_card_custom_field_values] ADD CONSTRAINT [quarter_card_custom_field_values_quarter_card_id_fkey] FOREIGN KEY ([quarter_card_id]) REFERENCES [dbo].[quarter_cards]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_card_custom_field_values] ADD CONSTRAINT [quarter_card_custom_field_values_definition_id_fkey] FOREIGN KEY ([definition_id]) REFERENCES [dbo].[custom_field_definitions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_events] ADD CONSTRAINT [audit_events_actor_user_id_fkey] FOREIGN KEY ([actor_user_id]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;


-- Domain invariants not expressible in Prisma schema.
ALTER TABLE [dbo].[initiatives] ADD CONSTRAINT [CK_initiatives_kind] CHECK ([kind] IN ('PROJECT','OPERATIONAL_TASK'));
ALTER TABLE [dbo].[initiatives] ADD CONSTRAINT [CK_initiatives_revision] CHECK ([revision] >= 1);
ALTER TABLE [dbo].[initiative_years] ADD CONSTRAINT [CK_initiative_years_year] CHECK ([year] BETWEEN 2000 AND 2200);
ALTER TABLE [dbo].[initiative_years] ADD CONSTRAINT [CK_initiative_years_revision] CHECK ([revision] >= 1);
ALTER TABLE [dbo].[preparation_stages] ADD CONSTRAINT [CK_preparation_stages_revision] CHECK ([revision] >= 1);
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [CK_quarter_cards_quarter] CHECK ([quarter] BETWEEN 1 AND 4);
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [CK_quarter_cards_revision] CHECK ([revision] >= 1);
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [CK_quarter_cards_total_weight] CHECK ([total_weight] >= 0);
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [CK_quarter_cards_moved_period] CHECK (([moved_from_year] IS NULL AND [moved_from_quarter] IS NULL) OR ([moved_from_year] BETWEEN 2000 AND 2200 AND [moved_from_quarter] BETWEEN 1 AND 4));
ALTER TABLE [dbo].[scope_items] ADD CONSTRAINT [CK_scope_items_status_code] CHECK ([status_code] IN ('DEFAULT','GREEN','YELLOW','RED'));
ALTER TABLE [dbo].[scope_items] ADD CONSTRAINT [CK_scope_items_revision] CHECK ([revision] >= 1);
ALTER TABLE [dbo].[scope_items] ADD CONSTRAINT [CK_scope_items_weight_snapshot] CHECK ([weight_snapshot_value] >= 0);
ALTER TABLE [dbo].[task_weight_definitions] ADD CONSTRAINT [CK_task_weight_definitions_weight] CHECK ([weight] >= 0);
ALTER TABLE [dbo].[departments] ADD CONSTRAINT [CK_departments_capacity] CHECK ([capacity_limit_points] >= 0);
ALTER TABLE [dbo].[initiative_size_definitions] ADD CONSTRAINT [CK_initiative_size_definitions_range] CHECK ([min_score] >= 0 AND [max_score] >= [min_score]);
ALTER TABLE [dbo].[custom_field_definitions] ADD CONSTRAINT [CK_custom_field_definitions_type] CHECK ([field_type] IN ('TEXT','NUMBER','SELECT','CHECKBOX','RICHTEXT'));
ALTER TABLE [dbo].[custom_field_definitions] ADD CONSTRAINT [CK_custom_field_definitions_entity_type] CHECK ([entity_type] IN ('project','task'));
ALTER TABLE [dbo].[quarter_card_custom_field_values] ADD CONSTRAINT [CK_quarter_card_custom_field_one_value] CHECK (
    (CASE WHEN [text_value] IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN [number_value] IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN [boolean_value] IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN [date_value] IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN [option_value] IS NULL THEN 0 ELSE 1 END) = 1
);
CREATE UNIQUE NONCLUSTERED INDEX [UX_task_weight_definitions_one_default]
ON [dbo].[task_weight_definitions]([is_default]) WHERE [is_default] = 1;
CREATE UNIQUE NONCLUSTERED INDEX [UX_roles_one_default]
ON [dbo].[roles]([is_default]) WHERE [is_default] = 1;

-- Required system roles and their initial permissions.
INSERT INTO [dbo].[roles]
  ([code],[name],[is_system],[is_default],[is_active],[created_at],[updated_at])
VALUES
  ('SUPER_ADMIN',N'Супер адміністратор',1,0,1,SYSUTCDATETIME(),SYSUTCDATETIME()),
  ('ADMIN',N'Адміністратор',1,0,1,SYSUTCDATETIME(),SYSUTCDATETIME()),
  ('USER',N'Користувач',1,1,1,SYSUTCDATETIME(),SYSUTCDATETIME());

INSERT INTO [dbo].[role_permissions]
  ([role],[can_create_edit_initiatives],[can_delete_initiatives],[can_access_admin],[is_read_only],[can_edit_archive])
VALUES
  ('SUPER_ADMIN',1,1,1,0,1),
  ('ADMIN',1,1,1,0,0),
  ('USER',0,0,0,1,0);

-- Required immutable dictionary defaults.
INSERT INTO [dbo].[card_status_definitions]
  ([id],[code],[name],[normalized_name],[color],[is_active],[is_system],[created_at],[updated_at])
VALUES
  ('00000000-0000-4000-8000-000000000001','DEFAULT',N'Не визначено',N'не визначено','#94a3b8',1,1,SYSUTCDATETIME(),SYSUTCDATETIME());

INSERT INTO [dbo].[task_weight_definitions]
  ([id],[name],[normalized_name],[weight],[is_default],[is_system],[is_active],[created_at],[updated_at])
VALUES
  ('00000000-0000-4000-8000-000000000002',N'Не визначено',N'не визначено',0,1,1,1,SYSUTCDATETIME(),SYSUTCDATETIME());

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
