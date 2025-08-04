-- ========================================
-- STEP-BY-STEP DEBUGGING
-- Let's find exactly where the issue is
-- ========================================

-- Step 1: Check if the trigger exists and is working
SELECT 'Step 1: Check triggers' as step;
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%registration%';

-- Step 2: Check if the function exists
SELECT 'Step 2: Check functions' as step;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_files', 'update_file_shares_on_registration', 'handle_user_registration');

-- Step 3: Show all current data
SELECT 'Step 3: Current data' as step;

-- Show all files
SELECT 
    'Files table:' as table_name,
    COUNT(*) as count
FROM public.files;

-- Show all file_shares
SELECT 
    'File_shares table:' as table_name,
    COUNT(*) as count,
    COUNT(CASE WHEN recipient_username IS NULL THEN 1 END) as without_username,
    COUNT(CASE WHEN recipient_username IS NOT NULL THEN 1 END) as with_username
FROM public.file_shares;

-- Show all usernames
SELECT 
    'Usernames table:' as table_name,
    COUNT(*) as count
FROM public.usernames;

-- Step 4: Show detailed file_shares data
SELECT 'Step 4: File_shares details' as step;
SELECT 
    file_id,
    recipient_address,
    recipient_username,
    shared_at,
    LENGTH(recipient_address) as address_length
FROM public.file_shares 
ORDER BY shared_at DESC;

-- Step 5: Show detailed usernames data
SELECT 'Step 5: Usernames details' as step;
SELECT 
    address,
    username,
    created_at,
    LENGTH(address) as address_length
FROM public.usernames 
ORDER BY created_at DESC;

-- Step 6: Test the get_user_files function with a real address
-- Replace '0x1234...' with an actual address from your usernames table
SELECT 'Step 6: Test get_user_files function' as step;
SELECT 
    'Testing with address:' as test,
    *
FROM public.get_user_files('0x765b19f548ad6442387b585c8ffe5b18eea4a819'); -- Replace with actual address

-- Step 7: Manual query to see what should be returned
-- Replace '0x1234...' with an actual address from your file_shares table
SELECT 'Step 7: Manual query test' as step;
SELECT 
    'Manual query for shared files:' as test,
    f.id,
    f.file_name,
    f.owner_address,
    fs.recipient_address,
    fs.recipient_username,
    fs.shared_at,
    LOWER(TRIM(fs.recipient_address)) as normalized_recipient
FROM public.files f
JOIN public.file_shares fs ON f.id = fs.file_id
WHERE LOWER(TRIM(fs.recipient_address)) = LOWER(TRIM('0x765b19f548ad6442387b585c8ffe5b18eea4a819')); -- Replace with actual address

-- Step 8: Test the registration function manually
-- Replace with actual address and username
SELECT 'Step 8: Test registration function' as step;
-- Uncomment and modify the line below to test manually:
-- SELECT public.update_file_shares_on_registration('0x1234567890123456789012345678901234567890', 'testuser');

-- Step 9: Check for any case mismatches
SELECT 'Step 9: Case sensitivity check' as step;
SELECT 
    'Address format comparison:' as test,
    recipient_address,
    LOWER(TRIM(recipient_address)) as normalized,
    CASE 
        WHEN recipient_address = LOWER(TRIM(recipient_address)) THEN 'Already lowercase'
        ELSE 'Mixed case detected'
    END as case_status
FROM public.file_shares 
LIMIT 5;

SELECT 'Debug completed! Check the results above.' as status; 