-- ========================================
-- TEST CASE SENSITIVITY FIX
-- This tests if addresses are handled correctly regardless of case
-- ========================================

-- Test 1: Show current data with case information
SELECT 'Current data with case info:' as test;
SELECT 
    'Files:' as table_name,
    owner_address,
    LOWER(TRIM(owner_address)) as normalized_owner
FROM public.files 
LIMIT 3;

SELECT 
    'File shares:' as table_name,
    recipient_address,
    LOWER(TRIM(recipient_address)) as normalized_recipient
FROM public.file_shares 
LIMIT 3;

SELECT 
    'Usernames:' as table_name,
    address,
    LOWER(TRIM(address)) as normalized_address
FROM public.usernames 
LIMIT 3;

-- Test 2: Test get_user_files with different case formats
-- Replace '0x1234...' with an actual address from your data
SELECT 'Testing case sensitivity:' as test;

-- Test with original case (MetaMask format)
SELECT 
    'Original case (MetaMask):' as test_case,
    *
FROM public.get_user_files('0x1234567890123456789012345678901234567890'); -- Replace with actual address

-- Test with lowercase
SELECT 
    'Lowercase:' as test_case,
    *
FROM public.get_user_files('0x1234567890123456789012345678901234567890'); -- Replace with actual address

-- Test with uppercase
SELECT 
    'Uppercase:' as test_case,
    *
FROM public.get_user_files('0X1234567890123456789012345678901234567890'); -- Replace with actual address

-- Test 3: Manual query comparison
SELECT 'Manual query comparison:' as test;
SELECT 
    'Owned files (case insensitive):' as type,
    f.id,
    f.file_name,
    f.owner_address
FROM public.files f
WHERE LOWER(TRIM(f.owner_address)) = LOWER(TRIM('0x1234567890123456789012345678901234567890')) -- Replace with actual address

UNION ALL

SELECT 
    'Shared files (case insensitive):' as type,
    f.id,
    f.file_name,
    f.owner_address
FROM public.files f
JOIN public.file_shares fs ON f.id = fs.file_id
WHERE LOWER(TRIM(fs.recipient_address)) = LOWER(TRIM('0x1234567890123456789012345678901234567890')); -- Replace with actual address

-- Test 4: Test the registration trigger with case sensitivity
SELECT 'Testing registration trigger:' as test;
-- This would be tested when a new user registers
-- The trigger should now work regardless of case

SELECT 'Case sensitivity fix test completed!' as status; 