-- Create Missing Storage Records
-- Run this to create storage records for users who don't have them

-- Step 1: Show users missing storage records
SELECT 
  'MISSING STORAGE' as status,
  u.address,
  u.username,
  'No storage record found' as issue
FROM usernames u
LEFT JOIN user_storage us ON u.address = us.address
WHERE us.address IS NULL;

-- Step 2: Create storage records for missing users
INSERT INTO user_storage (address, used_bytes, total_bytes, last_updated, created_at)
SELECT 
  u.address,
  COALESCE(f.total_bytes, 0) as used_bytes, -- 0 if no files
  12884901888 as total_bytes, -- 12GB from your schema
  NOW() as last_updated,
  NOW() as created_at
FROM usernames u
LEFT JOIN (
  SELECT 
    owner_address,
    SUM(file_size_bytes) as total_bytes
  FROM files 
  GROUP BY owner_address
) f ON u.address = f.owner_address
WHERE u.address NOT IN (
  SELECT address FROM user_storage
);

-- Step 3: Verify all users now have storage records
SELECT 
  'VERIFICATION' as status,
  COUNT(*) as total_users,
  COUNT(CASE WHEN us.address IS NOT NULL THEN 1 END) as users_with_storage,
  COUNT(CASE WHEN us.address IS NULL THEN 1 END) as users_missing_storage
FROM usernames u
LEFT JOIN user_storage us ON u.address = us.address;
