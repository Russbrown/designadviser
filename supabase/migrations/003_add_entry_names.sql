-- Add name column to design_entries table
ALTER TABLE design_entries 
ADD COLUMN name TEXT;

-- Add comment for clarity
COMMENT ON COLUMN design_entries.name IS 'User-provided name for the design entry';