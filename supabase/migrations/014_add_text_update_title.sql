-- Add title column to text_updates table
ALTER TABLE text_updates ADD COLUMN IF NOT EXISTS title TEXT;

-- Add check constraint to ensure title length is reasonable if provided
ALTER TABLE text_updates ADD CONSTRAINT text_updates_title_length CHECK (title IS NULL OR length(trim(title)) <= 200);