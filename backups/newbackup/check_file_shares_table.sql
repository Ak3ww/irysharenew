-- ========================================
-- CHECK FILE_SHARES TABLE
-- Run this in your Supabase SQL Editor
-- ========================================

-- Check if file_shares table exists and its structure
SELECT 'FILE_SHARES TABLE STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'file_shares' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current data in file_shares
SELECT 'CURRENT FILE_SHARES DATA:' as info;
SELECT * FROM public.file_shares LIMIT 10;

-- Check files table structure for comparison
SELECT 'FILES TABLE STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'files' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check how many files have recipient_address (shared files)
SELECT 'SHARED FILES IN FILES TABLE:' as info;
SELECT 
    COUNT(*) as total_files,
    COUNT(CASE WHEN recipient_address IS NOT NULL THEN 1 END) as shared_files,
    COUNT(CASE WHEN recipient_address IS NULL THEN 1 END) as owned_files
FROM public.files;

-- Check sample shared files
SELECT 'SAMPLE SHARED FILES:' as info;
SELECT 
    id,
    owner_address,
    recipient_address,
    file_name,
    created_at
FROM public.files 
WHERE recipient_address IS NOT NULL 
LIMIT 5; 