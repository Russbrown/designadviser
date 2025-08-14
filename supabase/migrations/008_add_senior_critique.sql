-- Add senior_critique columns to design_entries and design_versions tables

-- Add senior_critique to design_entries table
ALTER TABLE design_entries 
ADD COLUMN senior_critique TEXT;

-- Add senior_critique to design_versions table  
ALTER TABLE design_versions 
ADD COLUMN senior_critique TEXT;

-- Update the trigger function for design_entries to handle senior_critique
-- (This ensures proper RLS and validation if needed)