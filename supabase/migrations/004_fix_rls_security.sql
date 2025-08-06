-- Fix RLS policies to prevent logged-out users from seeing other users' entries

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view design entries" ON design_entries;
DROP POLICY IF EXISTS "Users can insert design entries" ON design_entries;
DROP POLICY IF EXISTS "Users can update their own design entries" ON design_entries;
DROP POLICY IF EXISTS "Users can delete their own design entries" ON design_entries;
DROP POLICY IF EXISTS "Users can view design versions" ON design_versions;
DROP POLICY IF EXISTS "Users can insert design versions" ON design_versions;
DROP POLICY IF EXISTS "Users can update design versions" ON design_versions;
DROP POLICY IF EXISTS "Users can delete design versions" ON design_versions;

-- New secure RLS Policies for design_entries
-- Allow users to view only their own entries, or anonymous entries when logged out
CREATE POLICY "Users can view their own entries or anonymous entries" ON design_entries
    FOR SELECT USING (
        CASE 
            WHEN auth.uid() IS NULL THEN user_id IS NULL  -- Logged out users see only anonymous entries
            ELSE auth.uid() = user_id OR user_id IS NULL   -- Logged in users see their own entries + anonymous entries
        END
    );

-- Allow users to insert entries (with proper user_id assignment)
CREATE POLICY "Users can insert design entries" ON design_entries
    FOR INSERT WITH CHECK (
        CASE 
            WHEN auth.uid() IS NULL THEN user_id IS NULL  -- Anonymous users can only create anonymous entries
            ELSE auth.uid() = user_id OR user_id IS NULL   -- Logged in users can create entries assigned to them or anonymous
        END
    );

-- Allow users to update only their own entries
CREATE POLICY "Users can update their own design entries" ON design_entries
    FOR UPDATE USING (
        CASE 
            WHEN auth.uid() IS NULL THEN user_id IS NULL  -- Anonymous users can only update anonymous entries
            ELSE auth.uid() = user_id                      -- Logged in users can only update their own entries
        END
    );

-- Allow users to delete only their own entries
CREATE POLICY "Users can delete their own design entries" ON design_entries
    FOR DELETE USING (
        CASE 
            WHEN auth.uid() IS NULL THEN user_id IS NULL  -- Anonymous users can only delete anonymous entries
            ELSE auth.uid() = user_id                      -- Logged in users can only delete their own entries
        END
    );

-- New secure RLS Policies for design_versions
-- Allow users to view versions of their entries or anonymous entries
CREATE POLICY "Users can view design versions" ON design_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (
                CASE 
                    WHEN auth.uid() IS NULL THEN design_entries.user_id IS NULL
                    ELSE auth.uid() = design_entries.user_id OR design_entries.user_id IS NULL
                END
            )
        )
    );

-- Allow users to insert versions for their entries
CREATE POLICY "Users can insert design versions" ON design_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (
                CASE 
                    WHEN auth.uid() IS NULL THEN design_entries.user_id IS NULL
                    ELSE auth.uid() = design_entries.user_id OR design_entries.user_id IS NULL
                END
            )
        )
    );

-- Allow users to update versions of their entries
CREATE POLICY "Users can update design versions" ON design_versions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (
                CASE 
                    WHEN auth.uid() IS NULL THEN design_entries.user_id IS NULL
                    ELSE auth.uid() = design_entries.user_id
                END
            )
        )
    );

-- Allow users to delete versions of their entries  
CREATE POLICY "Users can delete design versions" ON design_versions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM design_entries 
            WHERE design_entries.id = design_versions.entry_id 
            AND (
                CASE 
                    WHEN auth.uid() IS NULL THEN design_entries.user_id IS NULL
                    ELSE auth.uid() = design_entries.user_id
                END
            )
        )
    );