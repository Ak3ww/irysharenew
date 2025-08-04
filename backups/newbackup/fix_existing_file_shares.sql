-- ========================================
-- FIX EXISTING FILE SHARES STRUCTURE
-- Modify your existing file_shares_new table to eliminate duplicates
-- ========================================

-- ========================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLE
-- ========================================

-- Add recipient_address column to track who the file is shared with
ALTER TABLE public.file_shares_new 
ADD COLUMN IF NOT EXISTS recipient_address TEXT;

-- Add recipient_username column for better UX
ALTER TABLE public.file_shares_new 
ADD COLUMN IF NOT EXISTS recipient_username TEXT;

-- Add tags column for storing additional metadata
ALTER TABLE public.file_shares_new 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add is_public and profile_visible columns
ALTER TABLE public.file_shares_new 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

ALTER TABLE public.file_shares_new 
ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN DEFAULT true;

-- ========================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Index for owner queries
CREATE INDEX IF NOT EXISTS idx_file_shares_owner_address 
ON public.file_shares_new(owner_address);

-- Index for recipient queries
CREATE INDEX IF NOT EXISTS idx_file_shares_recipient_address 
ON public.file_shares_new(recipient_address);

-- Index for file URL queries
CREATE INDEX IF NOT EXISTS idx_file_shares_file_url 
ON public.file_shares_new(file_url);

-- ========================================
-- 3. ADD CONSTRAINTS TO PREVENT DUPLICATES
-- ========================================

-- Add unique constraint to prevent duplicate owner files
-- (one file per owner, no recipient = owner's file)
ALTER TABLE public.file_shares_new 
ADD CONSTRAINT unique_owner_file 
UNIQUE (owner_address, file_url, recipient_address);

-- ========================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.file_shares_new ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. CREATE RLS POLICIES
-- ========================================

-- Users can view their own files
CREATE POLICY "Users can view their own files" ON public.file_shares_new
    FOR SELECT USING (
        owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
        AND recipient_address IS NULL
    );

-- Users can view files shared with them
CREATE POLICY "Users can view files shared with them" ON public.file_shares_new
    FOR SELECT USING (
        recipient_address = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Users can view public files
CREATE POLICY "Users can view public files" ON public.file_shares_new
    FOR SELECT USING (
        is_public = true 
        AND profile_visible = true 
        AND recipient_address IS NULL
    );

-- Users can insert their own files
CREATE POLICY "Users can insert their own files" ON public.file_shares_new
    FOR INSERT WITH CHECK (
        owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
        AND recipient_address IS NULL
    );

-- Users can insert shares for their files
CREATE POLICY "Users can insert shares for their files" ON public.file_shares_new
    FOR INSERT WITH CHECK (
        owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
        AND recipient_address IS NOT NULL
    );

-- Users can update their own files
CREATE POLICY "Users can update their own files" ON public.file_shares_new
    FOR UPDATE USING (
        owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Users can delete their own files and shares
CREATE POLICY "Users can delete their own files and shares" ON public.file_shares_new
    FOR DELETE USING (
        owner_address = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- ========================================
-- 6. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to get user's files (owned + shared)
CREATE OR REPLACE FUNCTION public.get_user_files_new(user_address TEXT)
RETURNS TABLE (
    id UUID,
    owner_address TEXT,
    file_url TEXT,
    file_name TEXT,
    file_size_bytes BIGINT,
    file_type TEXT,
    is_encrypted BOOLEAN,
    tags TEXT[],
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
    -- Owned files (recipient_address IS NULL)
    SELECT 
        fs.id,
        fs.owner_address,
        fs.file_url,
        fs.file_name,
        fs.file_size_bytes,
        fs.file_type,
        fs.is_encrypted,
        fs.tags,
        fs.is_public,
        fs.profile_visible,
        fs.created_at,
        fs.updated_at,
        true as is_owned,
        NULL as recipient_address,
        NULL as recipient_username
    FROM public.file_shares_new fs
    WHERE fs.owner_address = user_address
    AND fs.recipient_address IS NULL
    
    UNION ALL
    
    -- Shared files (recipient_address IS NOT NULL)
    SELECT 
        fs.id,
        fs.owner_address,
        fs.file_url,
        fs.file_name,
        fs.file_size_bytes,
        fs.file_type,
        fs.is_encrypted,
        fs.tags,
        fs.is_public,
        fs.profile_visible,
        fs.created_at,
        fs.updated_at,
        false as is_owned,
        fs.recipient_address,
        fs.recipient_username
    FROM public.file_shares_new fs
    WHERE fs.recipient_address = user_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add recipient to file
CREATE OR REPLACE FUNCTION public.add_file_recipient_new(
    file_url TEXT,
    owner_address TEXT,
    recipient_address TEXT,
    recipient_username TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user owns the file
    IF NOT EXISTS (
        SELECT 1 FROM public.file_shares_new 
        WHERE file_url = add_file_recipient_new.file_url 
        AND owner_address = add_file_recipient_new.owner_address
        AND recipient_address IS NULL
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Insert share (will fail if already exists due to unique constraint)
    INSERT INTO public.file_shares_new (
        owner_address, file_url, file_name, file_size_bytes, 
        file_type, is_encrypted, tags, is_public, profile_visible,
        recipient_address, recipient_username
    )
    SELECT 
        owner_address, file_url, file_name, file_size_bytes,
        file_type, is_encrypted, tags, is_public, profile_visible,
        add_file_recipient_new.recipient_address,
        add_file_recipient_new.recipient_username
    FROM public.file_shares_new
    WHERE file_url = add_file_recipient_new.file_url 
    AND owner_address = add_file_recipient_new.owner_address
    AND recipient_address IS NULL;
    
    RETURN TRUE;
EXCEPTION
    WHEN unique_violation THEN
        -- Share already exists, update username if provided
        IF recipient_username IS NOT NULL THEN
            UPDATE public.file_shares_new 
            SET recipient_username = add_file_recipient_new.recipient_username,
                updated_at = NOW()
            WHERE file_url = add_file_recipient_new.file_url 
            AND owner_address = add_file_recipient_new.owner_address
            AND recipient_address = add_file_recipient_new.recipient_address;
        END IF;
        RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. MIGRATION FROM OLD FILES TABLE (OPTIONAL)
-- ========================================

-- This will migrate data from your old 'files' table to 'file_shares_new'
-- Run this only if you want to migrate existing data

/*
-- Migrate owned files (recipient_address IS NULL)
INSERT INTO public.file_shares_new (
    owner_address, file_url, file_name, file_size_bytes, 
    file_type, is_encrypted, is_public, profile_visible, created_at, updated_at
)
SELECT 
    owner_address, file_url, file_name, file_size_bytes,
    file_type, is_encrypted, is_public, profile_visible, created_at, updated_at
FROM public.files 
WHERE recipient_address IS NULL
ON CONFLICT (owner_address, file_url) WHERE recipient_address IS NULL DO NOTHING;

-- Migrate shared files (recipient_address IS NOT NULL)
INSERT INTO public.file_shares_new (
    owner_address, file_url, file_name, file_size_bytes, 
    file_type, is_encrypted, is_public, profile_visible,
    recipient_address, recipient_username, created_at, updated_at
)
SELECT 
    owner_address, file_url, file_name, file_size_bytes,
    file_type, is_encrypted, is_public, profile_visible,
    recipient_address, recipient_username, created_at, updated_at
FROM public.files 
WHERE recipient_address IS NOT NULL
ON CONFLICT (owner_address, file_url, recipient_address) WHERE recipient_address IS NOT NULL DO NOTHING;
*/ 