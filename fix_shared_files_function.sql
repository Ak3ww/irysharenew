-- ========================================
-- FIX SHARED FILES FUNCTION
-- Run this in your Supabase SQL Editor
-- ========================================

-- Drop the function if it exists to recreate it
DROP FUNCTION IF EXISTS get_user_shared_files(text);

-- Create the function properly
CREATE OR REPLACE FUNCTION get_user_shared_files(user_address text)
RETURNS TABLE (
    id uuid,
    file_name text,
    file_url text,
    file_size_bytes bigint,
    file_type text,
    is_encrypted boolean,
    owner_address text,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
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
    WHERE fr.recipient_address = user_address
    ORDER BY fs.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'TESTING FUNCTION:' as info;
SELECT * FROM get_user_shared_files('0x4351fd8d9a25c14556ce621ddcce35c2adefe156') LIMIT 5;

-- Check if we have any data in the tables
SELECT 'CHECKING DATA:' as info;
SELECT 
    'file_shares_new' as table_name,
    COUNT(*) as count
FROM public.file_shares_new
UNION ALL
SELECT 
    'file_recipients' as table_name,
    COUNT(*) as count
FROM public.file_recipients;

-- Show sample data
SELECT 'SAMPLE FILE_SHARES_NEW:' as info;
SELECT * FROM public.file_shares_new LIMIT 3;

SELECT 'SAMPLE FILE_RECIPIENTS:' as info;
SELECT * FROM public.file_recipients LIMIT 3;

-- Ensure realtime is enabled for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.file_shares_new;
ALTER PUBLICATION supabase_realtime ADD TABLE public.file_recipients;

-- Check realtime status
SELECT 'REALTIME STATUS:' as info;
SELECT 
    schemaname,
    tablename,
    relname,
    reloptions
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relname IN ('file_shares_new', 'file_recipients'); 