-- Soft delete: a deleted restaurant keeps its row (deleted_at = when). NULL = not deleted.
-- Payments are never touched, so income stays in Revenue after a delete.
ALTER TABLE restaurants ADD COLUMN deleted_at INTEGER;