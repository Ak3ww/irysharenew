-- ========================================
-- TEST SHARED FILES FIX
-- This tests the registration trigger and file sharing
-- ========================================

-- Test 1: Check if trigger exists
SELECT 
    'Trigger check:' as test,
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name = 'trigger_update_file_shares_on_registration';

-- Test 2: Check if function exists
SELECT 
    'Function check:' as test,
    routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name = 'update_file_shares_on_registration';

-- Test 3: Show current file_shares
SELECT 
    'Current file_shares:' as test,
    COUNT(*) as total_shares,
    COUNT(CASE WHEN recipient_username IS NULL THEN 1 END) as without_username,
    COUNT(CASE WHEN recipient_username IS NOT NULL THEN 1 END) as with_username
FROM public.file_shares;

-- Test 4: Show sample file_shares
SELECT 
    'Sample file_shares:' as test,
    file_id,
    recipient_address,
    recipient_username,
    shared_at
FROM public.file_shares 
ORDER BY shared_at DESC 
LIMIT 5;

-- Test 5: Manual test of the function (if you have test data)
-- Uncomment and modify the address below to test manually
/*
SELECT public.update_file_shares_on_registration(
    '0x1234567890123456789012345678901234567890', -- Replace with actual address
    'testuser' -- Replace with actual username
);
*/

SELECT 'Shared files fix test completed!' as status; 