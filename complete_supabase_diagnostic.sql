-- ========================================
-- COMPLETE IRYSHARE SUPABASE SETUP
-- Run this in your new Supabase SQL Editor
-- ========================================

-- ========================================
-- 1. CREATE TABLES
-- ========================================

-- Usernames table
CREATE TABLE public.usernames (
    id BIGSERIAL PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    profile_public BOOLEAN DEFAULT true,
    profile_bio TEXT,
    profile_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files table
CREATE TABLE public.files (
    id BIGSERIAL PRIMARY KEY,
    owner_address TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_type TEXT,
    tags TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    profile_visible BOOLEAN DEFAULT true,
    recipient_address TEXT,
    recipient_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User storage tracking
CREATE TABLE public.user_storage (
    id BIGSERIAL PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    total_used_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Usernames indexes
CREATE INDEX idx_usernames_address ON public.usernames(address);
CREATE INDEX idx_usernames_username ON public.usernames(username);
CREATE INDEX idx_usernames_profile_public ON public.usernames(profile_public);

-- Files indexes
CREATE INDEX idx_files_owner_address ON public.files(owner_address);
CREATE INDEX idx_files_recipient_address ON public.files(recipient_address);
CREATE INDEX idx_files_is_public ON public.files(is_public);
CREATE INDEX idx_files_profile_visible ON public.files(profile_visible);
CREATE INDEX idx_files_created_at ON public.files(created_at DESC);

-- User storage indexes
CREATE INDEX idx_user_storage_address ON public.user_storage(address);

-- ========================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE public.usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. CREATE RLS POLICIES
-- ========================================

-- Usernames policies
CREATE POLICY "Users can view all public profiles" ON public.usernames
    FOR SELECT USING (profile_public = true);

CREATE POLICY "Users can view their own profile" ON public.usernames
    FOR SELECT USING (address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own profile" ON public.usernames
    FOR INSERT WITH CHECK (address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own profile" ON public.usernames
    FOR UPDATE USING (address = current_setting('request.jwt.claims', true)::json->>'sub');

-- Files policies
CREATE POLICY "Users can view public files" ON public.files
    FOR SELECT USING (is_public = true AND profile_visible = true);

CREATE POLICY "Users can view their own files" ON public.files
    FOR SELECT USING (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can view files shared with them" ON public.files
    FOR SELECT USING (recipient_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own files" ON public.files
    FOR INSERT WITH CHECK (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own files" ON public.files
    FOR UPDATE USING (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own files" ON public.files
    FOR DELETE USING (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

-- User storage policies
CREATE POLICY "Users can view their own storage" ON public.user_storage
    FOR SELECT USING (address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own storage" ON public.user_storage
    FOR INSERT WITH CHECK (address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own storage" ON public.user_storage
    FOR UPDATE USING (address = current_setting('request.jwt.claims', true)::json->>'sub');

-- ========================================
-- 5. CREATE UPDATED_AT TRIGGER FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. CREATE TRIGGERS FOR UPDATED_AT
-- ========================================

CREATE TRIGGER handle_usernames_updated_at
    BEFORE UPDATE ON public.usernames
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_storage_updated_at
    BEFORE UPDATE ON public.user_storage
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- 7. SETUP REALTIME
-- ========================================

-- Create realtime publication (drop if exists first)
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- ========================================
-- 8. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to get user profile
CREATE OR REPLACE FUNCTION public.get_user_profile(user_address TEXT)
RETURNS TABLE (
    address TEXT,
    username TEXT,
    profile_public BOOLEAN,
    profile_bio TEXT,
    profile_avatar TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.address,
        u.username,
        u.profile_public,
        u.profile_bio,
        u.profile_avatar,
        u.created_at
    FROM public.usernames u
    WHERE u.address = user_address
    AND (u.profile_public = true OR u.address = current_setting('request.jwt.claims', true)::json->>'sub');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user files
CREATE OR REPLACE FUNCTION public.get_user_files(user_address TEXT)
RETURNS TABLE (
    id BIGINT,
    owner_address TEXT,
    file_name TEXT,
    file_url TEXT,
    file_size_bytes BIGINT,
    is_encrypted BOOLEAN,
    is_public BOOLEAN,
    profile_visible BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.owner_address,
        f.file_name,
        f.file_url,
        f.file_size_bytes,
        f.is_encrypted,
        f.is_public,
        f.profile_visible,
        f.created_at
    FROM public.files f
    WHERE f.owner_address = user_address
    AND (f.is_public = true AND f.profile_visible = true OR f.owner_address = current_setting('request.jwt.claims', true)::json->>'sub')
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 9. CREATE STORAGE BUCKETS
-- ========================================

-- Insert storage bucket for files (delete if exists first)
DELETE FROM storage.buckets WHERE id = 'iryshare-files';
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'iryshare-files',
    'iryshare-files',
    false,
    26214400, -- 25MB limit
    ARRAY['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*', 'application/*']
);

-- ========================================
-- 10. SETUP STORAGE POLICIES
-- ========================================

-- Drop existing storage policies first
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Storage policies for the bucket
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'iryshare-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'iryshare-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'iryshare-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'iryshare-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ========================================
-- 11. VERIFICATION QUERIES
-- ========================================

-- Check tables created
SELECT 'TABLES CREATED:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS enabled
SELECT 'RLS STATUS:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies created
SELECT 'POLICIES CREATED:' as info;
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check realtime setup
SELECT 'REALTIME SETUP:' as info;
SELECT pubname FROM pg_publication WHERE pubname = 'supabase_realtime';

-- Check storage bucket
SELECT 'STORAGE BUCKET:' as info;
SELECT name, public, file_size_limit FROM storage.buckets WHERE name = 'iryshare-files'; 