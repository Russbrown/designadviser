-- Add GPT-5 advice column to design entries
ALTER TABLE design_entries ADD COLUMN gpt5_advice TEXT;

-- Add GPT-5 advice column to design versions
ALTER TABLE design_versions ADD COLUMN gpt5_advice TEXT;

-- Add comment for documentation
COMMENT ON COLUMN design_entries.gpt5_advice IS 'GPT-5 product design advice for this entry';
COMMENT ON COLUMN design_versions.gpt5_advice IS 'GPT-5 product design advice for this version';