-- ========================================
-- SIMPLE IRYSHARE SCHEMA
-- Clean and minimal for the new login flow
-- ========================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS file_shares CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS user_storage CASCADE;
DROP TABLE IF EXISTS usernames CASCADE;

-- Create usernames table (for login/registration)
CREATE TABLE usernames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table
CREATE TABLE files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_address TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  is_encrypted BOOLEAN DEFAULT false,
  file_size_bytes BIGINT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  file_type TEXT DEFAULT 'application/octet-stream',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file_shares table
CREATE TABLE file_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  recipient_address TEXT NOT NULL,
  recipient_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_storage table (12GB free per user)
CREATE TABLE user_storage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  total_used_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_usernames_address ON usernames(address);
CREATE INDEX idx_usernames_username ON usernames(username);
CREATE INDEX idx_files_owner ON files(owner_address);
CREATE INDEX idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX idx_file_shares_recipient ON file_shares(recipient_address);
CREATE INDEX idx_user_storage_address ON user_storage(address);

-- Enable Row Level Security
ALTER TABLE usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_storage ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies (allow all operations for now)
CREATE POLICY "Allow all usernames operations" ON usernames
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all files operations" ON files
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all file_shares operations" ON file_shares
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all user_storage operations" ON user_storage
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to get user files (owned and shared)
CREATE OR REPLACE FUNCTION get_user_files(user_address TEXT)
RETURNS TABLE (
  id UUID,
  owner_address TEXT,
  file_url TEXT,
  file_name TEXT,
  is_encrypted BOOLEAN,
  file_size_bytes BIGINT,
  is_public BOOLEAN,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_owned BOOLEAN,
  recipient_address TEXT,
  recipient_username TEXT,
  shared_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  -- Owned files
  SELECT 
    f.id,
    f.owner_address,
    f.file_url,
    f.file_name,
    f.is_encrypted,
    f.file_size_bytes,
    f.is_public,
    f.file_type,
    f.created_at,
    f.updated_at,
    true as is_owned,
    NULL as recipient_address,
    NULL as recipient_username,
    NULL as shared_at
  FROM files f
  WHERE f.owner_address = user_address
  
  UNION ALL
  
  -- Shared files
  SELECT 
    f.id,
    f.owner_address,
    f.file_url,
    f.file_name,
    f.is_encrypted,
    f.file_size_bytes,
    f.is_public,
    f.file_type,
    f.created_at,
    f.updated_at,
    false as is_owned,
    fs.recipient_address,
    fs.recipient_username,
    fs.created_at as shared_at
  FROM files f
  JOIN file_shares fs ON f.id = fs.file_id
  WHERE fs.recipient_address = user_address
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- VERIFICATION
-- ========================================

-- Check that tables were created
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usernames', 'files', 'file_shares', 'user_storage')
ORDER BY table_name;

-- Check that policies were created
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

SELECT 'Simple schema created successfully!' as status; 