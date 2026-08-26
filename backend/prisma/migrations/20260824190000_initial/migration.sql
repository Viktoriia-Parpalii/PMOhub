BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

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
    [can_create_edit_projects] BIT NOT NULL,
    [can_delete_projects] BIT NOT NULL,
    [can_access_admin] BIT NOT NULL,
    [is_read_only] BIT NOT NULL,
    [can_edit_archive] BIT NOT NULL,
    CONSTRAINT [role_permissions_pkey] PRIMARY KEY CLUSTERED ([role])
);

-- CreateTable
CREATE TABLE [dbo].[departments] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [normalized_name] NVARCHAR(200) NOT NULL,
    [capacity_limit_points] DECIMAL(12,2) NOT NULL,
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
CREATE TABLE [dbo].[initiative_statuses] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [code] VARCHAR(64) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [normalized_name] NVARCHAR(100) NOT NULL,
    [color] VARCHAR(7) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [initiative_statuses_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [initiative_statuses_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [initiative_statuses_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_initiative_statuses_code] UNIQUE NONCLUSTERED ([code]),
    CONSTRAINT [UX_initiative_statuses_normalized_name] UNIQUE NONCLUSTERED ([normalized_name])
);

-- CreateTable
CREATE TABLE [dbo].[task_weights] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [normalized_name] NVARCHAR(100) NOT NULL,
    [weight] DECIMAL(12,2) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [task_weights_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_weights_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [task_weights_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_task_weights_normalized_name] UNIQUE NONCLUSTERED ([normalized_name])
);

-- CreateTable
CREATE TABLE [dbo].[initiative_sizes] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [normalized_name] NVARCHAR(100) NOT NULL,
    [min_score] DECIMAL(12,2) NOT NULL,
    [max_score] DECIMAL(12,2) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [initiative_sizes_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [initiative_sizes_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [initiative_sizes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_initiative_sizes_normalized_name] UNIQUE NONCLUSTERED ([normalized_name])
);

-- CreateTable
CREATE TABLE [dbo].[custom_field_definitions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [entity_type] VARCHAR(16) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [normalized_name] NVARCHAR(200) NOT NULL,
    [field_type] VARCHAR(16) NOT NULL,
    [is_required] BIT NOT NULL CONSTRAINT [custom_field_definitions_is_required_df] DEFAULT 0,
    [show_in_table] BIT NOT NULL CONSTRAINT [custom_field_definitions_show_in_table_df] DEFAULT 0,
    [show_in_cards] BIT NOT NULL CONSTRAINT [custom_field_definitions_show_in_cards_df] DEFAULT 0,
    [is_active] BIT NOT NULL CONSTRAINT [custom_field_definitions_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [custom_field_definitions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [custom_field_definitions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_custom_fields_entity_name] UNIQUE NONCLUSTERED ([entity_type],[normalized_name])
);

-- CreateTable
CREATE TABLE [dbo].[custom_field_options] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [definition_id] UNIQUEIDENTIFIER NOT NULL,
    [value] NVARCHAR(500) NOT NULL,
    [sort_order] INT NOT NULL,
    CONSTRAINT [custom_field_options_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_custom_field_options_value] UNIQUE NONCLUSTERED ([definition_id],[value]),
    CONSTRAINT [UX_custom_field_options_order] UNIQUE NONCLUSTERED ([definition_id],[sort_order])
);

-- CreateTable
CREATE TABLE [dbo].[initiatives] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [kind] VARCHAR(16) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [initiatives_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [initiatives_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[passports] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(300) NOT NULL,
    [strategic_goal] NVARCHAR(max),
    [manager_id] UNIQUEIDENTIFIER,
    [priority_id] UNIQUEIDENTIFIER,
    [notes] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [passports_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [passports_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[passport_departments] (
    [passport_id] UNIQUEIDENTIFIER NOT NULL,
    [department_id] UNIQUEIDENTIFIER NOT NULL,
    [involvement] VARCHAR(32) NOT NULL,
    CONSTRAINT [passport_departments_pkey] PRIMARY KEY CLUSTERED ([passport_id],[department_id],[involvement])
);

-- CreateTable
CREATE TABLE [dbo].[custom_field_values] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [definition_id] UNIQUEIDENTIFIER NOT NULL,
    [passport_id] UNIQUEIDENTIFIER NOT NULL,
    [text_value] NVARCHAR(max),
    [number_value] DECIMAL(32,8),
    [boolean_value] BIT,
    CONSTRAINT [custom_field_values_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_custom_field_values_owner] UNIQUE NONCLUSTERED ([definition_id],[passport_id])
);

-- CreateTable
CREATE TABLE [dbo].[initiative_years] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [initiative_id] UNIQUEIDENTIFIER NOT NULL,
    [year] INT NOT NULL,
    [annual_passport_id] UNIQUEIDENTIFIER NOT NULL,
    [preparation_passport_id] UNIQUEIDENTIFIER NOT NULL,
    [revision] INT NOT NULL CONSTRAINT [initiative_years_revision_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [initiative_years_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [initiative_years_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_initiative_years_annual_passport] UNIQUE NONCLUSTERED ([annual_passport_id]),
    CONSTRAINT [UX_initiative_years_preparation_passport] UNIQUE NONCLUSTERED ([preparation_passport_id]),
    CONSTRAINT [UX_initiative_years_initiative_year] UNIQUE NONCLUSTERED ([initiative_id],[year])
);

-- CreateTable
CREATE TABLE [dbo].[quarter_cards] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [initiative_year_id] UNIQUEIDENTIFIER NOT NULL,
    [passport_id] UNIQUEIDENTIFIER NOT NULL,
    [quarter] CHAR(2) NOT NULL,
    [status_id] UNIQUEIDENTIFIER,
    [size_definition_id] UNIQUEIDENTIFIER,
    [size_snapshot_name] NVARCHAR(100) NOT NULL,
    [size_snapshot_weight] DECIMAL(12,2) NOT NULL,
    [moved_from_year] INT,
    [moved_from_quarter] CHAR(2),
    [revision] INT NOT NULL CONSTRAINT [quarter_cards_revision_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [quarter_cards_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [quarter_cards_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UX_quarter_cards_passport] UNIQUE NONCLUSTERED ([passport_id]),
    CONSTRAINT [UX_quarter_cards_year_quarter] UNIQUE NONCLUSTERED ([initiative_year_id],[quarter])
);

-- CreateTable
CREATE TABLE [dbo].[checklist_items] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [card_id] UNIQUEIDENTIFIER NOT NULL,
    [text] NVARCHAR(1000) NOT NULL,
    [is_completed] BIT NOT NULL CONSTRAINT [checklist_items_is_completed_df] DEFAULT 0,
    [status_id] UNIQUEIDENTIFIER,
    [weight_definition_id] UNIQUEIDENTIFIER,
    [weight_snapshot_name] NVARCHAR(100) NOT NULL,
    [weight_snapshot_value] DECIMAL(12,2) NOT NULL,
    [moved_from_year] INT,
    [moved_from_quarter] CHAR(2),
    [revision] INT NOT NULL CONSTRAINT [checklist_items_revision_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [checklist_items_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [checklist_items_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[checklist_item_departments] (
    [checklist_item_id] UNIQUEIDENTIFIER NOT NULL,
    [department_id] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [checklist_item_departments_pkey] PRIMARY KEY CLUSTERED ([checklist_item_id],[department_id])
);

-- CreateTable
CREATE TABLE [dbo].[checklist_item_assignees] (
    [checklist_item_id] UNIQUEIDENTIFIER NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [checklist_item_assignees_pkey] PRIMARY KEY CLUSTERED ([checklist_item_id],[user_id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_events] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [aggregate_type] VARCHAR(40) NOT NULL,
    [aggregate_id] UNIQUEIDENTIFIER NOT NULL,
    [action_code] VARCHAR(80) NOT NULL,
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
CREATE NONCLUSTERED INDEX [IX_refresh_tokens_user_expiry] ON [dbo].[refresh_tokens]([user_id], [expires_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_passport_departments_department] ON [dbo].[passport_departments]([department_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_initiative_years_year] ON [dbo].[initiative_years]([year]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_quarter_cards_quarter] ON [dbo].[quarter_cards]([quarter]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_checklist_items_card] ON [dbo].[checklist_items]([card_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_checklist_departments_department] ON [dbo].[checklist_item_departments]([department_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_checklist_assignees_user] ON [dbo].[checklist_item_assignees]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_audit_events_aggregate] ON [dbo].[audit_events]([aggregate_type], [aggregate_id], [occurred_at]);

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_department_id_fkey] FOREIGN KEY ([department_id]) REFERENCES [dbo].[departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[refresh_tokens] ADD CONSTRAINT [refresh_tokens_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[managers] ADD CONSTRAINT [managers_department_id_fkey] FOREIGN KEY ([department_id]) REFERENCES [dbo].[departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[custom_field_options] ADD CONSTRAINT [custom_field_options_definition_id_fkey] FOREIGN KEY ([definition_id]) REFERENCES [dbo].[custom_field_definitions]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[passports] ADD CONSTRAINT [passports_manager_id_fkey] FOREIGN KEY ([manager_id]) REFERENCES [dbo].[managers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[passports] ADD CONSTRAINT [passports_priority_id_fkey] FOREIGN KEY ([priority_id]) REFERENCES [dbo].[priorities]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[passport_departments] ADD CONSTRAINT [passport_departments_passport_id_fkey] FOREIGN KEY ([passport_id]) REFERENCES [dbo].[passports]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[passport_departments] ADD CONSTRAINT [passport_departments_department_id_fkey] FOREIGN KEY ([department_id]) REFERENCES [dbo].[departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[custom_field_values] ADD CONSTRAINT [custom_field_values_definition_id_fkey] FOREIGN KEY ([definition_id]) REFERENCES [dbo].[custom_field_definitions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[custom_field_values] ADD CONSTRAINT [custom_field_values_passport_id_fkey] FOREIGN KEY ([passport_id]) REFERENCES [dbo].[passports]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[initiative_years] ADD CONSTRAINT [initiative_years_initiative_id_fkey] FOREIGN KEY ([initiative_id]) REFERENCES [dbo].[initiatives]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[initiative_years] ADD CONSTRAINT [initiative_years_annual_passport_id_fkey] FOREIGN KEY ([annual_passport_id]) REFERENCES [dbo].[passports]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[initiative_years] ADD CONSTRAINT [initiative_years_preparation_passport_id_fkey] FOREIGN KEY ([preparation_passport_id]) REFERENCES [dbo].[passports]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [quarter_cards_initiative_year_id_fkey] FOREIGN KEY ([initiative_year_id]) REFERENCES [dbo].[initiative_years]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [quarter_cards_passport_id_fkey] FOREIGN KEY ([passport_id]) REFERENCES [dbo].[passports]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [quarter_cards_status_id_fkey] FOREIGN KEY ([status_id]) REFERENCES [dbo].[initiative_statuses]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [quarter_cards_size_definition_id_fkey] FOREIGN KEY ([size_definition_id]) REFERENCES [dbo].[initiative_sizes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[checklist_items] ADD CONSTRAINT [checklist_items_card_id_fkey] FOREIGN KEY ([card_id]) REFERENCES [dbo].[quarter_cards]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[checklist_items] ADD CONSTRAINT [checklist_items_status_id_fkey] FOREIGN KEY ([status_id]) REFERENCES [dbo].[initiative_statuses]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[checklist_items] ADD CONSTRAINT [checklist_items_weight_definition_id_fkey] FOREIGN KEY ([weight_definition_id]) REFERENCES [dbo].[task_weights]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[checklist_item_departments] ADD CONSTRAINT [checklist_item_departments_checklist_item_id_fkey] FOREIGN KEY ([checklist_item_id]) REFERENCES [dbo].[checklist_items]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[checklist_item_departments] ADD CONSTRAINT [checklist_item_departments_department_id_fkey] FOREIGN KEY ([department_id]) REFERENCES [dbo].[departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[checklist_item_assignees] ADD CONSTRAINT [checklist_item_assignees_checklist_item_id_fkey] FOREIGN KEY ([checklist_item_id]) REFERENCES [dbo].[checklist_items]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[checklist_item_assignees] ADD CONSTRAINT [checklist_item_assignees_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_events] ADD CONSTRAINT [audit_events_actor_user_id_fkey] FOREIGN KEY ([actor_user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Domain constraints not expressible in Prisma Schema Language.
ALTER TABLE [dbo].[users] ADD CONSTRAINT [CK_users_role] CHECK ([role] IN ('SUPER_ADMIN', 'ADMIN', 'USER'));
ALTER TABLE [dbo].[role_permissions] ADD CONSTRAINT [CK_role_permissions_role] CHECK ([role] IN ('SUPER_ADMIN', 'ADMIN', 'USER'));
ALTER TABLE [dbo].[departments] ADD CONSTRAINT [CK_departments_capacity] CHECK ([capacity_limit_points] >= 0);
ALTER TABLE [dbo].[task_weights] ADD CONSTRAINT [CK_task_weights_value] CHECK ([weight] >= 0);
ALTER TABLE [dbo].[initiative_sizes] ADD CONSTRAINT [CK_initiative_sizes_range] CHECK ([min_score] >= 0 AND [max_score] >= [min_score]);
ALTER TABLE [dbo].[initiatives] ADD CONSTRAINT [CK_initiatives_kind] CHECK ([kind] IN ('PROJECT', 'TASK'));
ALTER TABLE [dbo].[custom_field_definitions] ADD CONSTRAINT [CK_custom_fields_entity] CHECK ([entity_type] IN ('project', 'task'));
ALTER TABLE [dbo].[custom_field_definitions] ADD CONSTRAINT [CK_custom_fields_type] CHECK ([field_type] IN ('TEXT', 'NUMBER', 'SELECT', 'CHECKBOX', 'RICHTEXT'));
ALTER TABLE [dbo].[passport_departments] ADD CONSTRAINT [CK_passport_departments_involvement] CHECK ([involvement] IN ('IMPLEMENTER', 'CROSS_FUNCTIONAL'));
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [CK_quarter_cards_quarter] CHECK ([quarter] IN ('Q1', 'Q2', 'Q3', 'Q4'));
ALTER TABLE [dbo].[quarter_cards] ADD CONSTRAINT [CK_quarter_cards_size_weight] CHECK ([size_snapshot_weight] >= 0);
ALTER TABLE [dbo].[checklist_items] ADD CONSTRAINT [CK_checklist_items_weight] CHECK ([weight_snapshot_value] >= 0);
ALTER TABLE [dbo].[checklist_items] ADD CONSTRAINT [CK_checklist_items_moved_quarter] CHECK ([moved_from_quarter] IS NULL OR [moved_from_quarter] IN ('Q1', 'Q2', 'Q3', 'Q4'));
ALTER TABLE [dbo].[audit_events] ADD CONSTRAINT [CK_audit_events_source_quarter] CHECK ([source_quarter] IS NULL OR [source_quarter] IN ('Q1', 'Q2', 'Q3', 'Q4'));
ALTER TABLE [dbo].[audit_events] ADD CONSTRAINT [CK_audit_events_target_quarter] CHECK ([target_quarter] IS NULL OR [target_quarter] IN ('Q1', 'Q2', 'Q3', 'Q4'));
ALTER TABLE [dbo].[custom_field_values] ADD CONSTRAINT [CK_custom_field_values_single_value] CHECK (
    (CASE WHEN [text_value] IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN [number_value] IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN [boolean_value] IS NULL THEN 0 ELSE 1 END) = 1
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
