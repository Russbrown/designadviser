-- Simplify RLS policies to allow anonymous usage while protecting user data

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own entries or anonymous entries" ON design_entries;
DROP POLICY IF EXISTS "Users can insert design entries" ON design_entries;
DROP POLICY IF EXISTS "Users can update their own design entries" ON design_entries;
DROP POLICY IF EXISTS "Users can delete their own design entries" ON design_entries;
DROP POLICY IF EXISTS "Users can view design versions" ON design_versions;
DROP POLICY IF EXISTS "Users can insert design versions" ON design_versions;
DROP POLICY IF EXISTS "Users can update design versions" ON design_versions;
DROP POLICY IF EXISTS "Users can delete design versions" ON design_versions;

-- Simplified RLS Policies for design_entries
-- Allow viewing entries that are either anonymous or belong to the current user
CREATE POLICY "View entries policy" ON design_entries
    FOR SELECT USING (
        user_id IS NULL OR user_id = auth.uid()
    );

-- Allow inserting entries with proper user assignment
CREATE POLICY "Insert entries policy" ON design_entries
    FOR INSERT WITH CHECK (
        user_id IS NULL OR user_id = auth.uid()
    );

-- Allow updating own entries or anonymous entries when not authenticated
CREATE POLICY "Update entries policy" ON design_entries
    FOR UPDATE USING (
        user_id IS NULL OR user_id = auth.uid()
    );

-- Allow deleting own entries or anonymous entries when not authenticated  
CREATE POLICY "Delete entries policy" ON design_entries
    FOR DELETE USING (
        user_id IS NULL OR user_id = auth.uid()
    );

-- Simplified RLS Policies for design_versions
-- Allow viewing versions of accessible entries
CREATE POLICY "View versions policy" ON design_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (design_entries.user_id IS NULL OR design_entries.user_id = auth.uid())
        )
    );

-- Allow inserting versions for accessible entries
CREATE POLICY "Insert versions policy" ON design_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (design_entries.user_id IS NULL OR design_entries.user_id = auth.uid())
        )
    );

-- Allow updating versions of accessible entries
CREATE POLICY "Update versions policy" ON design_versions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (design_entries.user_id IS NULL OR design_entries.user_id = auth.uid())
        )
    );

-- Allow deleting versions of accessible entries
CREATE POLICY "Delete versions policy" ON design_versions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (design_entries.user_id IS NULL OR design_entries.user_id = auth.uid())
        )
    );