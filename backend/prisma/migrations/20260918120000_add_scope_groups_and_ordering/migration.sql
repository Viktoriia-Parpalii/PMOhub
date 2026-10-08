SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @scope_item_count_before BIGINT = (SELECT COUNT_BIG(*) FROM [dbo].[scope_items]);
    DECLARE @executor_count_before BIGINT = (SELECT COUNT_BIG(*) FROM [dbo].[scope_item_executors]);

    SELECT [id] INTO #scope_item_ids_before FROM [dbo].[scope_items];

    CREATE TABLE [dbo].[scope_groups] (
        [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [scope_groups_id_df] DEFAULT NEWID(),
        [quarter_card_id] UNIQUEIDENTIFIER NOT NULL,
        [lineage_id] UNIQUEIDENTIFIER NOT NULL,
        [title] NVARCHAR(200) NOT NULL,
        [created_at] DATETIME2 NOT NULL CONSTRAINT [scope_groups_created_at_df] DEFAULT CURRENT_TIMESTAMP,
        [updated_at] DATETIME2 NOT NULL,
        CONSTRAINT [scope_groups_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [UX_scope_groups_card_lineage] UNIQUE NONCLUSTERED ([quarter_card_id], [lineage_id]),
        CONSTRAINT [UX_scope_groups_card_title] UNIQUE NONCLUSTERED ([quarter_card_id], [title]),
        CONSTRAINT [CK_scope_groups_title] CHECK (LEN(LTRIM(RTRIM([title]))) > 0)
    );

    ALTER TABLE [dbo].[scope_items] ADD [scope_group_id] UNIQUEIDENTIFIER NULL;
    ALTER TABLE [dbo].[scope_items] ADD [sort_order] INT NULL;

    -- SQL Server compiles a batch before executing ALTER TABLE. Keep every
    -- reference to the newly added columns in a separately compiled batch.
    EXEC sys.sp_executesql N'
        ;WITH ordered_scope AS (
            SELECT
                [id],
                ROW_NUMBER() OVER (
                    PARTITION BY [quarter_card_id]
                    ORDER BY [created_at] ASC, [id] ASC
                ) - 1 AS [position]
            FROM [dbo].[scope_items]
        )
        UPDATE scope_item
        SET [sort_order] = ordered_scope.[position]
        FROM [dbo].[scope_items] scope_item
        INNER JOIN ordered_scope ON ordered_scope.[id] = scope_item.[id];

        IF EXISTS (SELECT 1 FROM [dbo].[scope_items] WHERE [sort_order] IS NULL)
            THROW 51000, ''Scope ordering backfill failed.'', 1;
    ';

    EXEC sys.sp_executesql N'
        ALTER TABLE [dbo].[scope_items] ALTER COLUMN [sort_order] INT NOT NULL;
        ALTER TABLE [dbo].[scope_items] ADD CONSTRAINT [CK_scope_items_sort_order]
            CHECK ([sort_order] >= 0);

        CREATE NONCLUSTERED INDEX [IX_scope_items_card_sort_order]
            ON [dbo].[scope_items]([quarter_card_id], [sort_order]);
        CREATE NONCLUSTERED INDEX [IX_scope_items_scope_group_id]
            ON [dbo].[scope_items]([scope_group_id]);
    ';

    ALTER TABLE [dbo].[scope_groups] ADD CONSTRAINT [scope_groups_quarter_card_id_fkey]
        FOREIGN KEY ([quarter_card_id]) REFERENCES [dbo].[quarter_cards]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
    EXEC sys.sp_executesql N'
        ALTER TABLE [dbo].[scope_items] ADD CONSTRAINT [scope_items_scope_group_id_fkey]
            FOREIGN KEY ([scope_group_id]) REFERENCES [dbo].[scope_groups]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ';

    IF (SELECT COUNT_BIG(*) FROM [dbo].[scope_items]) <> @scope_item_count_before
        THROW 51001, 'Scope item count changed during migration.', 1;
    IF EXISTS (
        SELECT 1
        FROM #scope_item_ids_before old_item
        LEFT JOIN [dbo].[scope_items] current_item ON current_item.[id] = old_item.[id]
        WHERE current_item.[id] IS NULL
    )
        THROW 51002, 'An existing scope item was lost during migration.', 1;
    IF (SELECT COUNT_BIG(*) FROM [dbo].[scope_item_executors]) <> @executor_count_before
        THROW 51003, 'Scope executor links changed during migration.', 1;
    EXEC sys.sp_executesql N'
        IF EXISTS (SELECT 1 FROM [dbo].[scope_items] WHERE [scope_group_id] IS NOT NULL)
            THROW 51004, ''Existing scope items must remain ungrouped.'', 1;
    ';

    DROP TABLE #scope_item_ids_before;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

