-- Per-user UI preferences (table column widths, etc.). Account-scoped only.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "ui_preferences" JSONB NOT NULL DEFAULT '{}'::jsonb;
