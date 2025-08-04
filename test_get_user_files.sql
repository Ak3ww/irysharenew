-- ========================================
-- TEST GET_USER_FILES FUNCTION
-- This tests if the function returns shared files correctly
-- ========================================

-- Step 1: Show current data
SELECT 'Current data:' as step;
SELECT 
    'Files:' as table_name,
    COUNT(*) as count
FROM public.files;

SELECT 
    'File shares:' as table_name,
    COUNT(*) as count
FROM public.file_shares;

SELECT 
    'Usernames:' as table_name,
    COUNT(*) as count
FROM public.usernames;

-- Step 2: Show sample data
SELECT 'Sample data:' as step;
SELECT 
    'Files:' as table_name,
    id,
    file_name,
    owner_address
FROM public.files 
LIMIT 3;

SELECT 
    'File shares:' as table_name,
    file_id,
    recipient_address,
    recipient_username
FROM public.file_shares 
LIMIT 3;

SELECT 
    'Usernames:' as table_name,
    address,
    username
FROM public.usernames 
LIMIT 3;

-- Step 3: Test the function with a real address
-- Replace '0x1234...' with an actual address from your usernames table
SELECT 'Testing function:' as step;
SELECT 
    'get_user_files result:' as test,
    *
FROM public.get_user_files('0x1234567890123456789012345678901234567890'); -- Replace with actual address

-- Step 4: Manual query to compare
SELECT 'Manual query comparison:' as step;
SELECT 
    'Owned files:' as type,
    f.id,
    f.file_name,
    f.owner_address,
    'true' as is_owned
FROM public.files f
WHERE f.owner_address = '0x1234567890123456789012345678901234567890' -- Replace with actual address

UNION ALL

SELECT 
    'Shared files:' as type,
    f.id,
    f.file_name,
    f.owner_address,
    'false' as is_owned
FROM public.files f
JOIN public.file_shares fs ON f.id = fs.file_id
WHERE fs.recipient_address = '0x1234567890123456789012345678901234567890'; -- Replace with actual address

SELECT 'Test completed! Check the results above.' as status; 