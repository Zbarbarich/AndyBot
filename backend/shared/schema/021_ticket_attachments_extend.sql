-- Extend ticket_images for any attachment type: mime_type and filename
ALTER TABLE ticket_images
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS original_filename VARCHAR(500);

-- Backfill existing rows
UPDATE ticket_images SET mime_type = 'image/png' WHERE mime_type IS NULL;

-- Allow up to 10 attachments per ticket (position 1-10)
ALTER TABLE ticket_images DROP CONSTRAINT IF EXISTS ticket_images_position_check;
ALTER TABLE ticket_images ADD CONSTRAINT ticket_images_position_check CHECK (position >= 1 AND position <= 10);
