-- ========================================
-- ADD MISSING PROFILE FIELDS TO EXISTING SCHEMA
-- ========================================

-- Add missing profile fields to usernames table
ALTER TABLE public.usernames 
ADD COLUMN IF NOT EXISTS profile_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_bio TEXT,
ADD COLUMN IF NOT EXISTS profile_avatar TEXT;

-- Create index for profile_public if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_usernames_profile_public ON public.usernames(profile_public);

-- Update RLS policies to include profile_public
DROP POLICY IF EXISTS "Allow all usernames operations" ON public.usernames;

-- Create new policy that allows reading public profiles and own profile
CREATE POLICY "Allow usernames operations" ON public.usernames
    FOR ALL USING (
        profile_public = true OR 
        address = current_setting('request.jwt.claims', true)::json->>'sub'
    ) WITH CHECK (true);

-- Verify the changes
SELECT 
    'PROFILE FIELDS ADDED:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'usernames' 
AND column_name IN ('profile_public', 'profile_bio', 'profile_avatar')
ORDER BY column_name;

-- Show current usernames with profile data
SELECT 
    username,
    address,
    profile_public,
    profile_bio,
    profile_avatar,
    created_at
FROM public.usernames
LIMIT 5; 