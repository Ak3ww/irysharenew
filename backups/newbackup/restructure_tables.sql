-- ========================================
-- RESTRUCTURE TABLES: SEPARATE STORAGE FROM SHARING
-- Run this in your Supabase SQL Editor
-- ========================================

-- STEP 1: Create new file_shares table structure
CREATE TABLE IF NOT EXISTS public.file_shares_new (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_address text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size_bytes bigint,
    file_type text,
    is_encrypted boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (id)
);

-- STEP 2: Create file_recipients table for multi-recipient support
CREATE TABLE IF NOT EXISTS public.file_recipients (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    file_share_id uuid NOT NULL REFERENCES public.file_shares_new(id) ON DELETE CASCADE,
    recipient_address text NOT NULL,
    recipient_username text,
    added_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (id),
    UNIQUE(file_share_id, recipient_address)
);

-- STEP 3: Create updated files table (storage only)
CREATE TABLE IF NOT EXISTS public.files_new (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_address text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size_bytes bigint,
    file_type text,
    is_encrypted boolean DEFAULT false,
    is_public boolean DEFAULT false,
    profile_visible boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (id)
);

-- STEP 4: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_shares_owner ON public.file_shares_new(owner_address);
CREATE INDEX IF NOT EXISTS idx_file_shares_created ON public.file_shares_new(created_at);
CREATE INDEX IF NOT EXISTS idx_file_recipients_recipient ON public.file_recipients(recipient_address);
CREATE INDEX IF NOT EXISTS idx_file_recipients_share ON public.file_recipients(file_share_id);
CREATE INDEX IF NOT EXISTS idx_files_owner ON public.files_new(owner_address);
CREATE INDEX IF NOT EXISTS idx_files_public ON public.files_new(is_public, profile_visible);

-- STEP 5: Add RLS policies
ALTER TABLE public.file_shares_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files_new ENABLE ROW LEVEL SECURITY;

-- Simple policies for wallet auth
CREATE POLICY "Enable all operations on file_shares_new" ON public.file_shares_new
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations on file_recipients" ON public.file_recipients
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations on files_new" ON public.files_new
    FOR ALL USING (true) WITH CHECK (true);

-- STEP 6: Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_file_shares_updated_at BEFORE UPDATE ON public.file_shares_new
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON public.files_new
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- STEP 7: Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.file_shares_new;
ALTER PUBLICATION supabase_realtime ADD TABLE public.file_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.files_new;

-- STEP 8: Helper functions for the new structure
CREATE OR REPLACE FUNCTION get_user_storage_files(user_address text)
RETURNS TABLE (
    id uuid,
    file_name text,
    file_url text,
    file_size_bytes bigint,
    file_type text,
    is_encrypted boolean,
    is_public boolean,
    profile_visible boolean,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.file_name,
        f.file_url,
        f.file_size_bytes,
        f.file_type,
        f.is_encrypted,
        f.is_public,
        f.profile_visible,
        f.created_at
    FROM public.files_new f
    WHERE f.owner_address = user_address
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

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

-- STEP 9: Migration function (optional - for existing data)
CREATE OR REPLACE FUNCTION migrate_existing_files()
RETURNS void AS $$
DECLARE
    file_record RECORD;
BEGIN
    -- Migrate storage files (no recipient_address)
    FOR file_record IN 
        SELECT * FROM public.files 
        WHERE recipient_address IS NULL
    LOOP
        INSERT INTO public.files_new (
            owner_address, file_url, file_name, file_size_bytes, 
            file_type, is_encrypted, is_public, profile_visible, created_at
        ) VALUES (
            file_record.owner_address, file_record.file_url, file_record.file_name,
            file_record.file_size_bytes, file_record.file_type, file_record.is_encrypted,
            file_record.is_public, file_record.profile_visible, file_record.created_at
        );
    END LOOP;
    
    -- Migrate shared files (with recipient_address)
    FOR file_record IN 
        SELECT DISTINCT owner_address, file_url, file_name, file_size_bytes,
               file_type, is_encrypted, created_at
        FROM public.files 
        WHERE recipient_address IS NOT NULL
    LOOP
        -- Insert into file_shares
        INSERT INTO public.file_shares_new (
            owner_address, file_url, file_name, file_size_bytes,
            file_type, is_encrypted, created_at
        ) VALUES (
            file_record.owner_address, file_record.file_url, file_record.file_name,
            file_record.file_size_bytes, file_record.file_type, file_record.is_encrypted,
            file_record.created_at
        );
        
        -- Insert recipients
        INSERT INTO public.file_recipients (
            file_share_id, recipient_address, recipient_username
        )
        SELECT 
            fs.id,
            f.recipient_address,
            f.recipient_username
        FROM public.files f
        CROSS JOIN public.file_shares_new fs
        WHERE f.owner_address = file_record.owner_address
        AND f.file_url = file_record.file_url
        AND f.recipient_address IS NOT NULL;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- STEP 10: Show current structure
SELECT 'NEW STRUCTURE READY!' as info;
SELECT 'files_new: Storage files only' as table_info;
SELECT 'file_shares_new: Shared files only' as table_info;
SELECT 'file_recipients: Multi-recipient support' as table_info;

-- To migrate existing data, run:
-- SELECT migrate_existing_files(); 