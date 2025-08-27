-- COMPLETE STORAGE SYSTEM REBUILD
-- This will create a fresh, working storage system from scratch

-- Step 1: Drop existing user_storage table completely
DROP TABLE IF EXISTS user_storage;

-- Step 2: Create new user_storage table with proper structure
CREATE TABLE public.user_storage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  address text NOT NULL,
  used_bytes bigint NOT NULL DEFAULT 0,
  total_bytes bigint NOT NULL DEFAULT 12884901888, -- 12GB in bytes
  last_updated timestamp with time zone NOT NULL DEFAULT NOW(),
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  CONSTRAINT user_storage_pkey PRIMARY KEY (id),
  CONSTRAINT user_storage_address_key UNIQUE (address)
);

-- Step 3: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_storage_address ON public.user_storage USING btree (address);

-- Step 4: Populate with ALL existing users from usernames table
-- Users with files get their actual file sizes, users without files get 0
INSERT INTO user_storage (address, used_bytes, total_bytes, last_updated, created_at)
SELECT 
  u.address,
  COALESCE(
    (SELECT SUM(file_size_bytes) FROM files WHERE owner_address = u.address), 
    0
  ) as used_bytes,
  12884901888 as total_bytes, -- 12GB from your schema
  NOW() as last_updated,
  NOW() as created_at
FROM usernames u;

-- Step 5: Show the results
SELECT 
  'STORAGE REBUILD RESULTS' as status,
  address,
  used_bytes,
  ROUND(used_bytes / 1024.0 / 1024.0, 2) as used_mb,
  total_bytes,
  ROUND(total_bytes / 1024.0 / 1024.0 / 1024.0, 2) as total_gb,
  last_updated
FROM user_storage 
ORDER BY used_bytes DESC;

-- Step 6: Verify everything is correct
SELECT 
  'VERIFICATION' as status,
  (SELECT COUNT(*) FROM usernames) as total_users,
  (SELECT COUNT(*) FROM user_storage) as total_storage_records,
  CASE 
    WHEN (SELECT COUNT(*) FROM usernames) = (SELECT COUNT(*) FROM user_storage) 
    THEN '✅ PERFECT MATCH' 
    ELSE '❌ COUNT MISMATCH' 
  END as user_count_check;

-- Step 7: Show summary statistics
SELECT 
  'SUMMARY STATISTICS' as status,
  COUNT(*) as total_users_with_storage,
  COUNT(CASE WHEN used_bytes > 0 THEN 1 END) as users_with_files,
  COUNT(CASE WHEN used_bytes = 0 THEN 1 END) as users_without_files,
  ROUND(SUM(used_bytes) / 1024.0 / 1024.0, 2) as total_storage_used_mb,
  ROUND(AVG(used_bytes) / 1024.0 / 1024.0, 2) as avg_storage_per_user_mb
FROM user_storage;
