-- ========================================
-- FIX PROFILE RLS POLICY FOR USERNAME UPDATES
-- ========================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow usernames operations" ON public.usernames;

-- Create a completely permissive policy for development
-- This allows all operations on the usernames table
CREATE POLICY "Allow usernames operations" ON public.usernames
    FOR ALL USING (true) WITH CHECK (true);

-- Verify the policy was created
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
AND tablename = 'usernames'
ORDER BY policyname;

-- Also check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'usernames'; 