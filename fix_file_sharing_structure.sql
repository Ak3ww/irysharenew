-- ========================================
-- FIX FILE SHARING STRUCTURE
-- This will eliminate duplicates and properly manage file sharing
-- ========================================

-- ========================================
-- 1. CREATE NEW TABLES FOR BETTER STRUCTURE
-- ========================================

-- Files table (only stores file metadata, no recipient info)
CREATE TABLE IF NOT EXISTS public.files_v2 (
    id BIGSERIAL PRIMARY KEY,
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
CREATE TABLE IF NOT EXISTS public.file_shares (
    id BIGSERIAL PRIMARY KEY,
    file_id BIGINT NOT NULL REFERENCES public.files_v2(id) ON DELETE CASCADE,
    recipient_address TEXT NOT NULL,
    recipient_username TEXT,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_id, recipient_address)
);

-- ========================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_files_v2_owner_address ON public.files_v2(owner_address);
CREATE INDEX IF NOT EXISTS idx_files_v2_created_at ON public.files_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON public.file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_recipient_address ON public.file_shares(recipient_address);

-- ========================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.files_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. CREATE RLS POLICIES
-- ========================================

-- Files policies
CREATE POLICY "Users can view public files" ON public.files_v2
    FOR SELECT USING (is_public = true AND profile_visible = true);

CREATE POLICY "Users can view their own files" ON public.files_v2
    FOR SELECT USING (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can view files shared with them" ON public.files_v2
    FOR SELECT USING (
        id IN (
            SELECT file_id FROM public.file_shares 
            WHERE recipient_address = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can insert their own files" ON public.files_v2
    FOR INSERT WITH CHECK (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own files" ON public.files_v2
    FOR UPDATE USING (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own files" ON public.files_v2
    FOR DELETE USING (owner_address = current_setting('request.jwt.claims', true)::json->>'sub');

-- File shares policies
CREATE POLICY "Users can view shares for their files" ON public.file_shares
    FOR SELECT USING (
        file_id IN (
            SELECT id FROM public.files_v2 
            WHERE owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can view shares where they are recipient" ON public.file_shares
    FOR SELECT USING (recipient_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert shares for their files" ON public.file_shares
    FOR INSERT WITH CHECK (
        file_id IN (
            SELECT id FROM public.files_v2 
            WHERE owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can delete shares for their files" ON public.file_shares
    FOR DELETE USING (
        file_id IN (
            SELECT id FROM public.files_v2 
            WHERE owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- ========================================
-- 5. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to get user's files (owned + shared)
CREATE OR REPLACE FUNCTION public.get_user_files_v2(user_address TEXT)
RETURNS TABLE (
    id BIGINT,
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
    recipient_username TEXT
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
        NULL as recipient_username
    FROM public.files_v2 f
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
        fs.recipient_username
    FROM public.files_v2 f
    JOIN public.file_shares fs ON f.id = fs.file_id
    WHERE fs.recipient_address = user_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add recipient to file
CREATE OR REPLACE FUNCTION public.add_file_recipient(
    file_id BIGINT,
    recipient_address TEXT,
    recipient_username TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user owns the file
    IF NOT EXISTS (
        SELECT 1 FROM public.files_v2 
        WHERE id = file_id 
        AND owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Insert or update share
    INSERT INTO public.file_shares (file_id, recipient_address, recipient_username)
    VALUES (file_id, recipient_address, recipient_username)
    ON CONFLICT (file_id, recipient_address) 
    DO UPDATE SET 
        recipient_username = EXCLUDED.recipient_username,
        shared_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. CREATE TRIGGERS
-- ========================================

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at_v2()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_files_v2_updated_at
    BEFORE UPDATE ON public.files_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_v2();

-- ========================================
-- 7. MIGRATION FROM OLD STRUCTURE (OPTIONAL)
-- ========================================

-- This will migrate existing data to the new structure
-- Run this only if you want to migrate existing data

/*
-- Migrate files
INSERT INTO public.files_v2 (
    owner_address, file_url, file_name, file_size_bytes, 
    file_type, tags, is_encrypted, is_public, profile_visible, created_at, updated_at
)
SELECT 
    owner_address, file_url, file_name, file_size_bytes,
    file_type, 
    CASE 
        WHEN tags IS NULL THEN '{}'
        WHEN tags = '' THEN '{}'
        ELSE string_to_array(tags, ',')
    END as tags,
    is_encrypted, is_public, profile_visible, created_at, updated_at
FROM public.files 
WHERE recipient_address IS NULL;

-- Migrate file shares
INSERT INTO public.file_shares (file_id, recipient_address, recipient_username)
SELECT 
    fv.id,
    f.recipient_address,
    f.recipient_username
FROM public.files f
JOIN public.files_v2 fv ON f.file_url = fv.file_url AND f.owner_address = fv.owner_address
WHERE f.recipient_address IS NOT NULL;
*/ 