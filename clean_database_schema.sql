-- ========================================
-- CLEAN IRYSHARE DATABASE SCHEMA
-- Fresh start with proper function cleanup
-- ========================================

-- ========================================
-- 1. DROP EXISTING FUNCTIONS FIRST
-- ========================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_user_files(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_file_recipient(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.remove_file_recipient(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_file_recipients(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_storage(TEXT, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

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

-- ========================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. CREATE RLS POLICIES
-- ========================================

-- Files policies
CREATE POLICY "Users can view public files" ON public.files
    FOR SELECT USING (is_public = true AND profile_visible = true);

CREATE POLICY "Users can view their own files" ON public.files
    FOR SELECT USING (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can view files shared with them" ON public.files
    FOR SELECT USING (
        id IN (
            SELECT file_id FROM public.file_shares 
            WHERE recipient_address = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can insert their own files" ON public.files
    FOR INSERT WITH CHECK (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own files" ON public.files
    FOR UPDATE USING (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own files" ON public.files
    FOR DELETE USING (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

-- File shares policies
CREATE POLICY "Users can view shares for their files" ON public.file_shares
    FOR SELECT USING (
        file_id IN (
            SELECT id FROM public.files 
            WHERE owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can view shares where they are recipient" ON public.file_shares
    FOR SELECT USING (recipient_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert shares for their files" ON public.file_shares
    FOR INSERT WITH CHECK (
        file_id IN (
            SELECT id FROM public.files 
            WHERE owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can delete shares for their files" ON public.file_shares
    FOR DELETE USING (
        file_id IN (
            SELECT id FROM public.files 
            WHERE owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- User storage policies
CREATE POLICY "Users can view their own storage" ON public.user_storage
    FOR SELECT USING (address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own storage" ON public.user_storage
    FOR INSERT WITH CHECK (address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own storage" ON public.user_storage
    FOR UPDATE USING (address = current_setting('request.jwt.claims', true)::json->>'sub');

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
BEGIN
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
    WHERE f.owner_address = user_address
    
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
    WHERE fs.recipient_address = user_address;
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
SELECT 'Tables created successfully' as status;

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name; 