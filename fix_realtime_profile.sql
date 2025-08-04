-- ========================================
-- FIX REALTIME PROFILE UPDATES
-- Run this in your Supabase SQL Editor
-- ========================================

-- Check current RLS policies on usernames table
SELECT 'CURRENT RLS POLICIES:' as info;
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
WHERE tablename = 'usernames';

-- Check if realtime is enabled
SELECT 'REALTIME STATUS:' as info;
SELECT 
    schemaname,
    tablename,
    relname,
    reloptions
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relname = 'usernames';

-- Drop existing policies and recreate them to ensure realtime works
DROP POLICY IF EXISTS "Enable all operations on usernames" ON public.usernames;

-- Create a simple policy that allows all operations (for realtime compatibility)
CREATE POLICY "Enable all operations on usernames" ON public.usernames
    FOR ALL USING (true) WITH CHECK (true);

-- Ensure realtime is enabled for the usernames table
ALTER PUBLICATION supabase_realtime ADD TABLE public.usernames;

-- Test if we can update a profile
SELECT 'TESTING PROFILE UPDATE:' as info;
UPDATE public.usernames 
SET profile_public = false 
WHERE username = 'rolf'
RETURNING username, profile_public;

-- Revert the test
UPDATE public.usernames 
SET profile_public = true 
WHERE username = 'rolf'
RETURNING username, profile_public; 