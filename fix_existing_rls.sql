-- ========================================
-- FIX RLS POLICIES FOR EXISTING SCHEMA
-- This allows the app to work without Supabase auth
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view public files" ON public.files;
DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
DROP POLICY IF EXISTS "Users can view files shared with them" ON public.files;
DROP POLICY IF EXISTS "Users can insert their own files" ON public.files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;

DROP POLICY IF EXISTS "Users can view shares for their files" ON public.file_shares;
DROP POLICY IF EXISTS "Users can view shares where they are recipient" ON public.file_shares;
DROP POLICY IF EXISTS "Users can insert shares for their files" ON public.file_shares;
DROP POLICY IF EXISTS "Users can delete shares for their files" ON public.file_shares;

DROP POLICY IF EXISTS "Users can view their own storage" ON public.user_storage;
DROP POLICY IF EXISTS "Users can insert their own storage" ON public.user_storage;
DROP POLICY IF EXISTS "Users can update their own storage" ON public.user_storage;

-- Create simple policies that allow all operations
-- This is for development - you can make them more restrictive later

-- Files policies - allow all operations
CREATE POLICY "Allow all files operations" ON public.files
    FOR ALL USING (true) WITH CHECK (true);

-- File shares policies - allow all operations
CREATE POLICY "Allow all file_shares operations" ON public.file_shares
    FOR ALL USING (true) WITH CHECK (true);

-- User storage policies - allow all operations
CREATE POLICY "Allow all user_storage operations" ON public.user_storage
    FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- VERIFICATION
-- ========================================

-- Check that policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('files', 'file_shares', 'user_storage')
ORDER BY tablename, policyname;

-- Test a simple query
SELECT 'RLS policies fixed successfully' as status; 