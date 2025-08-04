-- ========================================
-- ADD USERNAMES TABLE TO EXISTING SCHEMA
-- This adds the missing usernames table for the login flow
-- ========================================

-- Create usernames table (for login/registration)
CREATE TABLE IF NOT EXISTS public.usernames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usernames_address ON public.usernames(address);
CREATE INDEX IF NOT EXISTS idx_usernames_username ON public.usernames(username);

-- Enable Row Level Security
ALTER TABLE public.usernames ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies (allow all operations for now)
DROP POLICY IF EXISTS "Allow all usernames operations" ON public.usernames;
CREATE POLICY "Allow all usernames operations" ON public.usernames
  FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- VERIFICATION
-- ========================================

-- Check that usernames table was created
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'usernames';

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
AND tablename = 'usernames'
ORDER BY tablename, policyname;

SELECT 'Usernames table added successfully!' as status; 