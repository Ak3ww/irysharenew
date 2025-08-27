-- CORRECT: Populate user_storage for ALL users
-- This is the simple, correct way to populate your database

-- Step 1: Clear existing user_storage table completely
TRUNCATE TABLE user_storage;

-- Step 2: Create storage records for ALL users from usernames table
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

-- Step 3: Show the results
SELECT 
  address,
  used_bytes,
  ROUND(used_bytes / 1024.0 / 1024.0, 2) as used_mb,
  total_bytes,
  ROUND(total_bytes / 1024.0 / 1024.0 / 1024.0, 2) as total_gb,
  last_updated
FROM user_storage 
ORDER BY used_bytes DESC;

-- Step 4: Verify the counts match
SELECT 
  'VERIFICATION' as status,
  (SELECT COUNT(*) FROM usernames) as total_users,
  (SELECT COUNT(*) FROM user_storage) as total_storage_records,
  CASE 
    WHEN (SELECT COUNT(*) FROM usernames) = (SELECT COUNT(*) FROM user_storage) 
    THEN '✅ MATCH' 
    ELSE '❌ MISMATCH' 
  END as user_count_check;
