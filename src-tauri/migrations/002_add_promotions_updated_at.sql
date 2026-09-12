-- Add missing updated_at column to promotions table
ALTER TABLE promotions ADD COLUMN updated_at TEXT DEFAULT (datetime('now','localtime'));
