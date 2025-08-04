-- ========================================
-- CHECK SHARED FILES FUNCTION
-- Run this in your Supabase SQL Editor
-- ========================================

-- Check if the function exists
SELECT 'CHECKING FUNCTION:' as info;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_user_shared_files'
AND routine_schema = 'public';

-- Check if file_recipients table has data
SELECT 'CHECKING FILE_RECIPIENTS:' as info;
SELECT COUNT(*) as total_recipients FROM public.file_recipients;

-- Check if file_shares_new table has data
SELECT 'CHECKING FILE_SHARES_NEW:' as info;
SELECT COUNT(*) as total_shares FROM public.file_shares_new;

-- Test the function with a sample address (replace with actual address)
SELECT 'TESTING FUNCTION:' as info;
-- Replace '0x123...' with an actual address from your usernames table
SELECT * FROM public.usernames LIMIT 1;

-- Test the function manually
SELECT 'MANUAL TEST:' as info;
SELECT 
    fs.id,
    fs.file_name,
    fs.file_url,
    fs.file_size_bytes,
    fs.file_type,
    fs.is_encrypted,
    fs.owner_address,
    fs.created_at
FROM public.file_shares_new fs
JOIN public.file_recipients fr ON fs.id = fr.file_share_id
WHERE fr.recipient_address = '0x4351fd8d9a25c14556ce621ddcce35c2adefe156' -- Replace with actual address
ORDER BY fs.created_at DESC; 