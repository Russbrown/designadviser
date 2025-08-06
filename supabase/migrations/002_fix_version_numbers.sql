-- Fix existing version numbers that might be starting from 1
-- Update any existing versions with version_number = 1 to start from 2

-- First, let's see if there are any design_versions with version_number = 1
-- These should be updated to version_number = 2, and subsequent ones shifted up

-- For each entry_id, update version numbers to start from 2
UPDATE design_versions 
SET version_number = version_number + 1
WHERE version_number >= 1;

-- Add a comment for clarity
COMMENT ON COLUMN design_versions.version_number IS 'Version numbers start from 2 (original entry is version 1)';