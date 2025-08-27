-- Create storage record for the new user you just registered
-- Run this to manually create storage for the new user

-- Step 1: Show the new user that was just created
SELECT 
  'NEW USER' as status,
  address,
  username,
  created_at
FROM usernames 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Step 2: Check if they already have storage
SELECT 
  'STORAGE CHECK' as status,
  u.address,
  u.username,
  CASE 
    WHEN us.address IS NOT NULL THEN '✅ Has Storage'
    ELSE '❌ Missing Storage'
  END as storage_status
FROM usernames u
LEFT JOIN user_storage us ON u.address = us.address
WHERE u.created_at >= NOW() - INTERVAL '1 hour';

-- Step 3: Create storage for any missing users
INSERT INTO user_storage (address, used_bytes, total_bytes, last_updated, created_at)
SELECT 
  u.address,
  0 as used_bytes, -- New users start with 0
  12884901888 as total_bytes, -- 12GB
  NOW() as last_updated,
  NOW() as created_at
FROM usernames u
LEFT JOIN user_storage us ON u.address = us.address
WHERE us.address IS NULL
  AND u.created_at >= NOW() - INTERVAL '1 hour';

-- Step 4: Verify storage was created
SELECT 
  'VERIFICATION' as status,
  address,
  used_bytes,
  ROUND(used_bytes / 1024.0 / 1024.0, 2) as used_mb,
  total_bytes,
  ROUND(total_bytes / 1024.0 / 1024.0 / 1024.0, 2) as total_gb
FROM user_storage 
WHERE address IN (
  SELECT address FROM usernames 
  WHERE created_at >= NOW() - INTERVAL '1 hour'
);
