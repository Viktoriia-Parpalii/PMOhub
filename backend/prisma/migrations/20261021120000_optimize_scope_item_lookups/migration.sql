CREATE NONCLUSTERED INDEX [IX_scope_items_copied_from_item_id]
ON [dbo].[scope_items]([copied_from_item_id]);

CREATE NONCLUSTERED INDEX [IX_scope_items_moved_from_card_id]
ON [dbo].[scope_items]([moved_from_card_id]);
