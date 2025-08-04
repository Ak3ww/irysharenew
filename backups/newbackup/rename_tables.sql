-- ========================================
-- RENAME NEW TABLES TO REPLACE OLD ONES
-- ONLY RUN THIS AFTER TESTING THE NEW STRUCTURE!
-- ========================================

-- STEP 1: Backup old tables (optional)
-- CREATE TABLE files_backup AS SELECT * FROM files;
-- CREATE TABLE file_shares_backup AS SELECT * FROM file_shares;

-- STEP 2: Drop old tables (only if you're sure!)
-- DROP TABLE IF EXISTS public.files CASCADE;
-- DROP TABLE IF EXISTS public.file_shares CASCADE;

-- STEP 3: Rename new tables to original names
ALTER TABLE public.files_new RENAME TO files;
ALTER TABLE public.file_shares_new RENAME TO file_shares;

-- STEP 4: Update indexes to match new names
ALTER INDEX idx_files_owner RENAME TO idx_files_owner_old;
ALTER INDEX idx_files_public RENAME TO idx_files_public_old;
ALTER INDEX idx_file_shares_owner RENAME TO idx_file_shares_owner_old;
ALTER INDEX idx_file_shares_created RENAME TO idx_file_shares_created_old;

-- STEP 5: Update RLS policies
DROP POLICY IF EXISTS "Enable all operations on files_new" ON public.files;
DROP POLICY IF EXISTS "Enable all operations on file_shares_new" ON public.file_shares;

CREATE POLICY "Enable all operations on files" ON public.files
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations on file_shares" ON public.file_shares
    FOR ALL USING (true) WITH CHECK (true);

-- STEP 6: Update triggers
DROP TRIGGER IF EXISTS update_files_updated_at ON public.files;
DROP TRIGGER IF EXISTS update_file_shares_updated_at ON public.file_shares;

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON public.files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_shares_updated_at BEFORE UPDATE ON public.file_shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- STEP 7: Update realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.files_new;
ALTER PUBLICATION supabase_realtime DROP TABLE public.file_shares_new;
ALTER PUBLICATION supabase_realtime ADD TABLE public.files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.file_shares;

-- STEP 8: Update helper functions to use new table names
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
    FROM public.files f
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
    FROM public.file_shares fs
    JOIN public.file_recipients fr ON fs.id = fr.file_share_id
    WHERE fr.recipient_address = user_address
    ORDER BY fs.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- STEP 9: Verify the structure
SELECT 'MIGRATION COMPLETE!' as info;
SELECT 'files: Storage files only' as table_info;
SELECT 'file_shares: Shared files only' as table_info;
SELECT 'file_recipients: Multi-recipient support' as table_info; 