-- Create advice_ratings table
CREATE TABLE advice_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    user_id UUID REFERENCES auth.users(id),
    entry_id UUID REFERENCES design_entries(id) ON DELETE CASCADE,
    version_id UUID REFERENCES design_versions(id) ON DELETE CASCADE,
    
    -- Ensure only one rating per user per advice (either entry or version)
    UNIQUE(user_id, entry_id),
    UNIQUE(user_id, version_id),
    
    -- Ensure exactly one of entry_id or version_id is set
    CONSTRAINT check_entry_or_version CHECK (
        (entry_id IS NOT NULL AND version_id IS NULL) OR
        (entry_id IS NULL AND version_id IS NOT NULL)
    )
);

-- Create indexes for better performance
CREATE INDEX idx_advice_ratings_entry_id ON advice_ratings(entry_id);
CREATE INDEX idx_advice_ratings_version_id ON advice_ratings(version_id);
CREATE INDEX idx_advice_ratings_user_id ON advice_ratings(user_id);
CREATE INDEX idx_advice_ratings_rating ON advice_ratings(rating);
CREATE INDEX idx_advice_ratings_created_at ON advice_ratings(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE advice_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advice_ratings
-- Allow users to view ratings for entries they can access
CREATE POLICY "Users can view advice ratings" ON advice_ratings
    FOR SELECT USING (
        -- For entry ratings
        (entry_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = advice_ratings.entry_id 
            AND (design_entries.user_id IS NULL OR auth.uid() = design_entries.user_id OR auth.uid() IS NULL)
        )) OR
        -- For version ratings
        (version_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM design_versions 
            JOIN design_entries ON design_entries.id = design_versions.entry_id
            WHERE design_versions.id = advice_ratings.version_id 
            AND (design_entries.user_id IS NULL OR auth.uid() = design_entries.user_id OR auth.uid() IS NULL)
        ))
    );

-- Allow users to insert ratings for entries they can access
CREATE POLICY "Users can insert advice ratings" ON advice_ratings
    FOR INSERT WITH CHECK (
        -- For entry ratings
        (entry_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = advice_ratings.entry_id 
            AND (design_entries.user_id IS NULL OR auth.uid() = design_entries.user_id OR auth.uid() IS NULL)
        )) OR
        -- For version ratings
        (version_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM design_versions 
            JOIN design_entries ON design_entries.id = design_versions.entry_id
            WHERE design_versions.id = advice_ratings.version_id 
            AND (design_entries.user_id IS NULL OR auth.uid() = design_entries.user_id OR auth.uid() IS NULL)
        ))
    );

-- Allow users to update their own ratings
CREATE POLICY "Users can update their own advice ratings" ON advice_ratings
    FOR UPDATE USING (
        auth.uid() = user_id OR auth.uid() IS NULL
    );

-- Allow users to delete their own ratings
CREATE POLICY "Users can delete their own advice ratings" ON advice_ratings
    FOR DELETE USING (
        auth.uid() = user_id OR auth.uid() IS NULL
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_advice_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_advice_ratings_updated_at
    BEFORE UPDATE ON advice_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_advice_ratings_updated_at();