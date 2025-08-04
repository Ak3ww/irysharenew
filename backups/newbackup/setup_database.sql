-- ========================================
-- SIMPLE DATABASE SETUP FOR IRYSHARE
-- Run this in Supabase SQL Editor to create required tables
-- ========================================

-- Create files table
CREATE TABLE IF NOT EXISTS public.files (
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

-- Create file_shares table
CREATE TABLE IF NOT EXISTS public.file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    recipient_address TEXT NOT NULL,
    recipient_username TEXT,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_id, recipient_address)
);

-- Create user_storage table
CREATE TABLE IF NOT EXISTS public.user_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL UNIQUE,
    used_bytes BIGINT DEFAULT 0,
    total_bytes BIGINT DEFAULT 12884901888, -- ~12GB default
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_files_owner_address ON public.files(owner_address);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON public.file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_recipient_address ON public.file_shares(recipient_address);
CREATE INDEX IF NOT EXISTS idx_user_storage_address ON public.user_storage(address);

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow all for now)
CREATE POLICY "Allow all operations on files" ON public.files FOR ALL USING (true);
CREATE POLICY "Allow all operations on file_shares" ON public.file_shares FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_storage" ON public.user_storage FOR ALL USING (true);

-- Create helper function
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

-- Insert default storage for existing users
INSERT INTO public.user_storage (address, used_bytes, total_bytes)
SELECT 
    address,
    0 as used_bytes,
    12884901888 as total_bytes
FROM public.usernames
ON CONFLICT (address) DO NOTHING;

-- Verify tables were created
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name; 