-- Create advice_votes table to track which advice type users prefer

CREATE TABLE advice_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- User who voted
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What they're voting on (either an entry or a version)
  entry_id UUID REFERENCES design_entries(id) ON DELETE CASCADE,
  version_id UUID REFERENCES design_versions(id) ON DELETE CASCADE,
  
  -- Which advice type they preferred (1=General, 2=Senior, 3=Pre-processed)
  preferred_advice_type INTEGER NOT NULL CHECK (preferred_advice_type IN (1, 2, 3)),
  
  -- Optional feedback about why they preferred this advice
  feedback TEXT,
  
  -- Ensure a user can only vote once per entry/version
  CONSTRAINT unique_vote_per_user_entry UNIQUE (user_id, entry_id),
  CONSTRAINT unique_vote_per_user_version UNIQUE (user_id, version_id),
  
  -- Ensure vote is for either an entry OR a version, not both
  CONSTRAINT vote_entry_or_version CHECK (
    (entry_id IS NOT NULL AND version_id IS NULL) OR 
    (entry_id IS NULL AND version_id IS NOT NULL)
  )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_advice_votes_updated_at 
  BEFORE UPDATE ON advice_votes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE advice_votes ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own votes
CREATE POLICY "Users can view their own votes" ON advice_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own votes" ON advice_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON advice_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON advice_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_advice_votes_user_id ON advice_votes(user_id);
CREATE INDEX idx_advice_votes_entry_id ON advice_votes(entry_id);
CREATE INDEX idx_advice_votes_version_id ON advice_votes(version_id);
CREATE INDEX idx_advice_votes_preferred_type ON advice_votes(preferred_advice_type);