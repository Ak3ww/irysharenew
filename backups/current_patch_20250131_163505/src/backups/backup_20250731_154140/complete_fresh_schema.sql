-- ========================================
-- COMPLETE FRESH IRYSHARE DATABASE SCHEMA
-- Drops existing tables and creates full production schema
-- ========================================

-- ========================================
-- 1. DROP EXISTING TABLES AND FUNCTIONS
-- ========================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_user_files(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_file_recipient(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.remove_file_recipient(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_file_recipients(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_storage(TEXT, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- Drop existing tables (CASCADE will handle dependencies)
DROP TABLE IF EXISTS public.file_shares CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.user_storage CASCADE;
DROP TABLE IF EXISTS public.usernames CASCADE;

-- ========================================
-- 2. CREATE CLEAN TABLES
-- ========================================

-- Files table (stores file metadata only)
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_address TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_type TEXT,
    tags TEXT[] DEFAULT '{}',
    is_encrypted BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    profile_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File shares table (manages who has access to files)
CREATE TABLE public.file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    recipient_address TEXT NOT NULL,
    recipient_username TEXT,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_id, recipient_address)
);

-- User storage tracking (updated structure)
CREATE TABLE public.user_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL UNIQUE,
    used_bytes BIGINT DEFAULT 0,
    total_bytes BIGINT DEFAULT 12884901888, -- ~12GB default
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usernames table (for login/registration)
CREATE TABLE public.usernames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    registration_signature TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Files indexes
CREATE INDEX idx_files_owner_address ON public.files(owner_address);
CREATE INDEX idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX idx_files_is_public ON public.files(is_public);
CREATE INDEX idx_files_profile_visible ON public.files(profile_visible);

-- File shares indexes
CREATE INDEX idx_file_shares_file_id ON public.file_shares(file_id);
CREATE INDEX idx_file_shares_recipient_address ON public.file_shares(recipient_address);
CREATE INDEX idx_file_shares_shared_at ON public.file_shares(shared_at DESC);

-- User storage indexes
CREATE INDEX idx_user_storage_address ON public.user_storage(address);

-- Usernames indexes
CREATE INDEX idx_usernames_address ON public.usernames(address);
CREATE INDEX idx_usernames_username ON public.usernames(username);

-- ========================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usernames ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. CREATE RLS POLICIES (SIMPLE - ALLOW ALL OPERATIONS)
-- ========================================

-- Simple policies that allow all operations (for development)
-- You can make these more restrictive later if needed

-- Files policies - allow all operations
CREATE POLICY "Allow all files operations" ON public.files
    FOR ALL USING (true) WITH CHECK (true);

-- File shares policies - allow all operations
CREATE POLICY "Allow all file_shares operations" ON public.file_shares
    FOR ALL USING (true) WITH CHECK (true);

-- User storage policies - allow all operations
CREATE POLICY "Allow all user_storage operations" ON public.user_storage
    FOR ALL USING (true) WITH CHECK (true);

-- Usernames policies - allow all operations
CREATE POLICY "Allow all usernames operations" ON public.usernames
    FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- 6. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to get user's files (owned + shared)
CREATE OR REPLACE FUNCTION public.get_user_files(user_address TEXT)
RETURNS TABLE (
    id UUID,
    owner_address TEXT,
    file_url TEXT,
    file_name TEXT,
    file_size_bytes BIGINT,
    file_type TEXT,
    tags TEXT[],
    is_encrypted BOOLEAN,
    is_public BOOLEAN,
    profile_visible BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_owned BOOLEAN,
    recipient_address TEXT,
    recipient_username TEXT,
    shared_at TIMESTAMPTZ
) AS $$
DECLARE
    normalized_address TEXT;
BEGIN
    -- Normalize the input address to lowercase to ensure consistent matching
    normalized_address := LOWER(TRIM(user_address));
    
    RETURN QUERY
    -- Owned files
    SELECT 
        f.id,
        f.owner_address,
        f.file_url,
        f.file_name,
        f.file_size_bytes,
        f.file_type,
        f.tags,
        f.is_encrypted,
        f.is_public,
        f.profile_visible,
        f.created_at,
        f.updated_at,
        true as is_owned,
        NULL as recipient_address,
        NULL as recipient_username,
        NULL as shared_at
    FROM public.files f
    WHERE LOWER(TRIM(f.owner_address)) = normalized_address
    
    UNION ALL
    
    -- Shared files
    SELECT 
        f.id,
        f.owner_address,
        f.file_url,
        f.file_name,
        f.file_size_bytes,
        f.file_type,
        f.tags,
        f.is_encrypted,
        f.is_public,
        f.profile_visible,
        f.created_at,
        f.updated_at,
        false as is_owned,
        fs.recipient_address,
        fs.recipient_username,
        fs.shared_at
    FROM public.files f
    JOIN public.file_shares fs ON f.id = fs.file_id
    WHERE LOWER(TRIM(fs.recipient_address)) = normalized_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add recipient to file
CREATE OR REPLACE FUNCTION public.add_file_recipient(
    file_id UUID,
    recipient_address TEXT,
    recipient_username TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user owns the file
    IF NOT EXISTS (
        SELECT 1 FROM public.files 
        WHERE id = add_file_recipient.file_id 
        AND owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Insert or update share
    INSERT INTO public.file_shares (file_id, recipient_address, recipient_username)
    VALUES (add_file_recipient.file_id, recipient_address, recipient_username)
    ON CONFLICT (file_id, recipient_address) 
    DO UPDATE SET 
        recipient_username = EXCLUDED.recipient_username,
        shared_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove recipient from file
CREATE OR REPLACE FUNCTION public.remove_file_recipient(
    file_id UUID,
    recipient_address TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user owns the file
    IF NOT EXISTS (
        SELECT 1 FROM public.files 
        WHERE id = remove_file_recipient.file_id 
        AND owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Delete the share
    DELETE FROM public.file_shares 
    WHERE file_id = remove_file_recipient.file_id 
    AND recipient_address = remove_file_recipient.recipient_address;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get file recipients
CREATE OR REPLACE FUNCTION public.get_file_recipients(file_id UUID)
RETURNS TABLE (
    recipient_address TEXT,
    recipient_username TEXT,
    shared_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Check if user owns the file
    IF NOT EXISTS (
        SELECT 1 FROM public.files 
        WHERE id = get_file_recipients.file_id 
        AND owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
    ) THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        fs.recipient_address,
        fs.recipient_username,
        fs.shared_at
    FROM public.file_shares fs
    WHERE fs.file_id = get_file_recipients.file_id
    ORDER BY fs.shared_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user storage
CREATE OR REPLACE FUNCTION public.update_user_storage(
    user_address TEXT,
    used_bytes BIGINT
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_storage (address, used_bytes)
    VALUES (user_address, used_bytes)
    ON CONFLICT (address) 
    DO UPDATE SET 
        used_bytes = update_user_storage.used_bytes,
        last_updated = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. CREATE TRIGGERS
-- ========================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated timestamp trigger to files table
CREATE TRIGGER handle_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- 9. CREATE REGISTRATION TRIGGER
-- ========================================

-- Function to update file_shares when a user registers
CREATE OR REPLACE FUNCTION public.update_file_shares_on_registration(
    user_address TEXT,
    username TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    normalized_address TEXT;
BEGIN
    -- Normalize the address to lowercase for consistent matching
    normalized_address := LOWER(TRIM(user_address));
    
    -- Update all file_shares entries for this address
    -- Set the recipient_username when someone registers
    UPDATE public.file_shares 
    SET recipient_username = update_file_shares_on_registration.username
    WHERE LOWER(TRIM(recipient_address)) = normalized_address
    AND recipient_username IS NULL;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update file_shares when someone registers
CREATE OR REPLACE FUNCTION public.handle_user_registration()
RETURNS TRIGGER AS $$
BEGIN
    -- Update file_shares when a new user registers
    PERFORM public.update_file_shares_on_registration(
        NEW.address,
        NEW.username
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on usernames table
CREATE TRIGGER trigger_update_file_shares_on_registration
    AFTER INSERT ON public.usernames
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_registration();

-- ========================================
-- 8. INSERT DEFAULT STORAGE DATA
-- ========================================

-- Insert default storage for existing users (if any)
INSERT INTO public.user_storage (address, used_bytes, total_bytes)
SELECT 
    address,
    0 as used_bytes,
    12884901888 as total_bytes
FROM public.usernames
ON CONFLICT (address) DO NOTHING;

-- ========================================
-- 9. VERIFICATION QUERIES
-- ========================================

-- Check tables were created
SELECT 'Complete schema created successfully!' as status;

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN ('usernames', 'files', 'file_shares', 'user_storage')
ORDER BY table_name;

-- List all functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- List all triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('usernames', 'files', 'file_shares', 'user_storage')
ORDER BY tablename, policyname; 