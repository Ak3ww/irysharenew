-- ========================================
-- CHECK PROFILE STRUCTURE
-- Run this in your Supabase SQL Editor
-- ========================================

-- Check usernames table structure
SELECT 'USERNAMES TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'usernames'
ORDER BY ordinal_position;

-- Check sample data
SELECT 'SAMPLE USERNAMES DATA:' as info;
SELECT * FROM public.usernames LIMIT 3;

-- Check if profile_public column exists and has data
SELECT 'PROFILE_PUBLIC CHECK:' as info;
SELECT 
    username,
    profile_public,
    CASE 
        WHEN profile_public IS NULL THEN 'NULL'
        WHEN profile_public = true THEN 'TRUE'
        WHEN profile_public = false THEN 'FALSE'
        ELSE 'OTHER'
    END as profile_public_status
FROM public.usernames 
LIMIT 5; 