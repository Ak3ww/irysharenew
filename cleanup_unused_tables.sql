-- ========================================
-- CLEANUP UNUSED TABLES
-- Run this in your Supabase SQL Editor
-- ========================================

-- EXPLANATION:
-- The file_shares table was originally intended for multi-recipient sharing,
-- but we're currently using the files table with recipient_address field.
-- This is simpler and works well for our current needs.

-- Check if file_shares table is empty
SELECT 'CHECKING FILE_SHARES TABLE:' as info;
SELECT COUNT(*) as file_shares_count FROM public.file_shares;

-- If file_shares is empty, we can safely drop it
-- (Only run this if you're sure it's not needed)

-- DROP TABLE IF EXISTS public.file_shares;

-- CURRENT ARCHITECTURE:
-- 1. files table: Contains all files (owned and shared)
--    - owner_address: Who owns the file
--    - recipient_address: Who the file is shared with (NULL for owned files)
--    - This allows us to query "My Files" and "Shared With Me" easily
--
-- 2. user_storage table: Tracks storage usage per user
--    - total_used_bytes: Total storage used
--    - total_files: Number of files owned
--
-- 3. usernames table: User profiles and settings
--    - profile_public: Whether profile is public
--    - profile_bio, profile_avatar: Profile information

-- This architecture is clean and efficient for our current needs! 