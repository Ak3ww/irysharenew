-- ========================================
-- TEMPORARILY DISABLE RLS FOR USERNAMES TABLE
-- ========================================
-- WARNING: This is for development only!

-- Disable RLS on usernames table
ALTER TABLE public.usernames DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'usernames';

-- Show current policies (should be none)
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'usernames'; 