-- Create design_entries table
CREATE TABLE design_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    image_url TEXT,
    image_path TEXT,
    context TEXT,
    inquiries TEXT,
    advice TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id)
);

-- Create design_versions table
CREATE TABLE design_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    version_number INTEGER NOT NULL,
    image_url TEXT,
    image_path TEXT,
    advice TEXT NOT NULL,
    entry_id UUID REFERENCES design_entries(id) ON DELETE CASCADE NOT NULL,
    notes TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_design_entries_created_at ON design_entries(created_at DESC);
CREATE INDEX idx_design_entries_user_id ON design_entries(user_id);
CREATE INDEX idx_design_versions_entry_id ON design_versions(entry_id);
CREATE INDEX idx_design_versions_created_at ON design_versions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE design_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for design_entries
-- Allow users to read their own entries (or all entries if no auth)
CREATE POLICY "Users can view design entries" ON design_entries
    FOR SELECT USING (
        user_id IS NULL OR 
        auth.uid() = user_id OR 
        auth.uid() IS NULL
    );

-- Allow users to insert their own entries
CREATE POLICY "Users can insert design entries" ON design_entries
    FOR INSERT WITH CHECK (
        user_id IS NULL OR 
        auth.uid() = user_id OR 
        auth.uid() IS NULL
    );

-- Allow users to update their own entries
CREATE POLICY "Users can update their own design entries" ON design_entries
    FOR UPDATE USING (
        user_id IS NULL OR 
        auth.uid() = user_id OR 
        auth.uid() IS NULL
    );

-- Allow users to delete their own entries
CREATE POLICY "Users can delete their own design entries" ON design_entries
    FOR DELETE USING (
        user_id IS NULL OR 
        auth.uid() = user_id OR 
        auth.uid() IS NULL
    );

-- RLS Policies for design_versions
-- Allow users to view versions of their entries
CREATE POLICY "Users can view design versions" ON design_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (design_entries.user_id IS NULL OR auth.uid() = design_entries.user_id OR auth.uid() IS NULL)
        )
    );

-- Allow users to insert versions for their entries
CREATE POLICY "Users can insert design versions" ON design_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (design_entries.user_id IS NULL OR auth.uid() = design_entries.user_id OR auth.uid() IS NULL)
        )
    );

-- Allow users to update versions of their entries
CREATE POLICY "Users can update design versions" ON design_versions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (design_entries.user_id IS NULL OR auth.uid() = design_entries.user_id OR auth.uid() IS NULL)
        )
    );

-- Allow users to delete versions of their entries
CREATE POLICY "Users can delete design versions" ON design_versions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (design_entries.user_id IS NULL OR auth.uid() = design_entries.user_id OR auth.uid() IS NULL)
        )
    );