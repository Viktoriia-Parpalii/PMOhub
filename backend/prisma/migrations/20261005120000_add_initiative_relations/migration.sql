CREATE TABLE [initiative_relations] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_initiative_relations_id] DEFAULT NEWID(),
    [relation_type] VARCHAR(32) NOT NULL,
    [left_initiative_id] UNIQUEIDENTIFIER NOT NULL,
    [right_initiative_id] UNIQUEIDENTIFIER NOT NULL,
    [revision] INT NOT NULL CONSTRAINT [DF_initiative_relations_revision] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_initiative_relations_created_at] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [PK_initiative_relations] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CK_initiative_relations_distinct] CHECK ([left_initiative_id] <> [right_initiative_id]),
    CONSTRAINT [FK_initiative_relations_left] FOREIGN KEY ([left_initiative_id]) REFERENCES [initiatives]([id]),
    CONSTRAINT [FK_initiative_relations_right] FOREIGN KEY ([right_initiative_id]) REFERENCES [initiatives]([id])
);

CREATE UNIQUE INDEX [UX_initiative_relations_type_pair]
ON [initiative_relations]([relation_type], [left_initiative_id], [right_initiative_id]);

CREATE INDEX [IX_initiative_relations_left]
ON [initiative_relations]([left_initiative_id]);

CREATE INDEX [IX_initiative_relations_right]
ON [initiative_relations]([right_initiative_id]);
