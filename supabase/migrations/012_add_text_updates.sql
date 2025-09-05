-- Create text_updates table for timeline text updates (if it doesn't exist)
CREATE TABLE IF NOT EXISTS text_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Indexes for performance
  CONSTRAINT text_updates_content_length CHECK (length(content) <= 10000)
);

-- Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_text_updates_created_at ON text_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_text_updates_user_id ON text_updates(user_id);

-- Enable RLS
ALTER TABLE text_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can read their own text updates and anonymous ones" ON text_updates;
DROP POLICY IF EXISTS "Authenticated users can create text updates" ON text_updates;
DROP POLICY IF EXISTS "Users can update their own text updates" ON text_updates;
DROP POLICY IF EXISTS "Users can delete their own text updates" ON text_updates;

-- Allow users to read their own text updates and anonymous ones
CREATE POLICY "Users can read their own text updates and anonymous ones" ON text_updates
  FOR SELECT USING (
    user_id IS NULL OR user_id = auth.uid()
  );

-- Allow authenticated users to create text updates
CREATE POLICY "Authenticated users can create text updates" ON text_updates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own text updates
CREATE POLICY "Users can update their own text updates" ON text_updates
  FOR UPDATE USING (user_id = auth.uid());

-- Allow users to delete their own text updates
CREATE POLICY "Users can delete their own text updates" ON text_updates
  FOR DELETE USING (user_id = auth.uid());