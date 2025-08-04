-- ========================================
-- QUICK DEBUG - ESSENTIAL INFO ONLY
-- ========================================

-- 1. Check if we have any data at all
SELECT '=== DATA COUNTS ===' as section;
SELECT 'Files' as table_name, COUNT(*) as count FROM public.files
UNION ALL
SELECT 'File_shares' as table_name, COUNT(*) as count FROM public.file_shares
UNION ALL
SELECT 'Usernames' as table_name, COUNT(*) as count FROM public.usernames;

-- 2. Show all file_shares with details
SELECT '=== FILE_SHARES DETAILS ===' as section;
SELECT 
    file_id,
    recipient_address,
    recipient_username,
    shared_at
FROM public.file_shares 
ORDER BY shared_at DESC;

-- 3. Show all usernames
SELECT '=== USERNAMES DETAILS ===' as section;
SELECT 
    address,
    username,
    created_at
FROM public.usernames 
ORDER BY created_at DESC;

-- 4. Test get_user_files with the address you provided
SELECT '=== TESTING get_user_files ===' as section;
SELECT 
    'Testing with: 0x765b19f548ad6442387b585c8ffe5b18eea4a819' as test_address,
    COUNT(*) as result_count
FROM public.get_user_files('0x765b19f548ad6442387b585c8ffe5b18eea4a819');

-- 5. Show the actual results
SELECT '=== ACTUAL RESULTS ===' as section;
SELECT * FROM public.get_user_files('0x765b19f548ad6442387b585c8ffe5b18eea4a819');

-- 6. Manual query to compare
SELECT '=== MANUAL QUERY COMPARISON ===' as section;

-- Check owned files
SELECT 
    f.id,
    f.file_name,
    f.owner_address,
    NULL as recipient_address,
    NULL as recipient_username,
    'OWNED' as type
FROM public.files f
WHERE LOWER(TRIM(f.owner_address)) = LOWER(TRIM('0x765b19f548ad6442387b585c8ffe5b18eea4a819'))

UNION ALL

-- Check shared files
SELECT 
    f.id,
    f.file_name,
    f.owner_address,
    fs.recipient_address,
    fs.recipient_username,
    'SHARED' as type
FROM public.files f
JOIN public.file_shares fs ON f.id = fs.file_id
WHERE LOWER(TRIM(fs.recipient_address)) = LOWER(TRIM('0x765b19f548ad6442387b585c8ffe5b18eea4a819')); 