-- ========================================
-- FIX EXISTING REGISTRATIONS
-- This manually updates file_shares for users who registered
-- but the trigger didn't work properly
-- ========================================

-- Step 1: Show what needs to be fixed
SELECT 'Step 1: Check what needs fixing' as step;
SELECT 
    'File shares without usernames:' as info,
    COUNT(*) as count
FROM public.file_shares 
WHERE recipient_username IS NULL;

SELECT 
    'File shares with usernames:' as info,
    COUNT(*) as count
FROM public.file_shares 
WHERE recipient_username IS NOT NULL;

-- Step 2: Show which addresses have registrations but no username in file_shares
SELECT 'Step 2: Find addresses that need fixing' as step;
SELECT 
    fs.recipient_address,
    u.username,
    COUNT(fs.id) as file_shares_count
FROM public.file_shares fs
JOIN public.usernames u ON LOWER(TRIM(fs.recipient_address)) = LOWER(TRIM(u.address))
WHERE fs.recipient_username IS NULL
GROUP BY fs.recipient_address, u.username;

-- Step 3: Fix the file_shares by updating recipient_username
SELECT 'Step 3: Fixing file_shares' as step;
UPDATE public.file_shares fs
SET recipient_username = u.username
FROM public.usernames u
WHERE LOWER(TRIM(fs.recipient_address)) = LOWER(TRIM(u.address))
AND fs.recipient_username IS NULL;

-- Step 4: Verify the fix
SELECT 'Step 4: Verify the fix' as step;
SELECT 
    'After fix - file shares without usernames:' as info,
    COUNT(*) as count
FROM public.file_shares 
WHERE recipient_username IS NULL;

SELECT 
    'After fix - file shares with usernames:' as info,
    COUNT(*) as count
FROM public.file_shares 
WHERE recipient_username IS NOT NULL;

-- Step 5: Show the fixed data
SELECT 'Step 5: Show fixed data' as step;
SELECT 
    file_id,
    recipient_address,
    recipient_username,
    shared_at
FROM public.file_shares 
ORDER BY shared_at DESC;

-- Step 6: Test the get_user_files function for a specific address
-- Replace '0x1234...' with an actual address that should have shared files
SELECT 'Step 6: Test function after fix' as step;
-- Uncomment and modify the line below to test:
-- SELECT * FROM public.get_user_files('0x1234567890123456789012345678901234567890');

SELECT 'Fix completed! Check the results above.' as status; 