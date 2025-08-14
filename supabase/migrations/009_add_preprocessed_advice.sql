-- Add preprocessed_advice columns to design_entries and design_versions tables

-- Add preprocessed_advice to design_entries table
ALTER TABLE design_entries 
ADD COLUMN preprocessed_advice TEXT;

-- Add preprocessed_advice to design_versions table  
ALTER TABLE design_versions 
ADD COLUMN preprocessed_advice TEXT;

-- Update the trigger function for design_entries to handle preprocessed_advice
-- (This ensures proper RLS and validation if needed)