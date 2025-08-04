-- ========================================
-- DEBUG SHARED FILES ISSUE
-- This helps debug why shared files aren't showing up
-- ========================================

-- Test 1: Check if the function exists and works
SELECT 
    'Function exists:' as test,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_user_files';

-- Test 2: Show all file_shares
SELECT 
    'All file_shares:' as test,
    file_id,
    recipient_address,
    recipient_username,
    shared_at
FROM public.file_shares 
ORDER BY shared_at DESC;

-- Test 3: Show all usernames
SELECT 
    'All usernames:' as test,
    address,
    username,
    created_at
FROM public.usernames 
ORDER BY created_at DESC;

-- Test 4: Test get_user_files function with a specific address
-- Replace '0x1234...' with an actual address from your usernames table
SELECT 
    'Testing get_user_files function:' as test,
    *
FROM public.get_user_files('0x1234567890123456789012345678901234567890'); -- Replace with actual address

-- Test 5: Manual query to see what should be returned
-- Replace '0x1234...' with an actual address from your file_shares table
SELECT 
    'Manual query for shared files:' as test,
    f.id,
    f.file_name,
    f.owner_address,
    fs.recipient_address,
    fs.recipient_username,
    fs.shared_at
FROM public.files f
JOIN public.file_shares fs ON f.id = fs.file_id
WHERE fs.recipient_address = '0x1234567890123456789012345678901234567890'; -- Replace with actual address

-- Test 6: Check case sensitivity
SELECT 
    'Case sensitivity test:' as test,
    'Original address' as type,
    recipient_address,
    LENGTH(recipient_address) as length
FROM public.file_shares 
LIMIT 1;

-- Test 7: Show the exact format of addresses
SELECT 
    'Address format check:' as test,
    recipient_address,
    LOWER(recipient_address) as lower_address,
    TRIM(recipient_address) as trimmed_address,
    LOWER(TRIM(recipient_address)) as final_address
FROM public.file_shares 
LIMIT 3;

SELECT 'Debug completed! Check the results above.' as status; 