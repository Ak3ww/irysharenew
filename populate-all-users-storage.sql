-- Populate user_storage for ALL users (including those with no uploads)
-- Run this in Supabase SQL Editor to ensure every user has a storage record

-- Step 1: Clear existing user_storage table
DELETE FROM user_storage;

-- Step 2: Get all unique users from usernames table
-- This ensures every registered user gets a storage record
INSERT INTO user_storage (address, used_bytes, total_bytes, last_updated, created_at)
SELECT 
  u.address,
  COALESCE(f.total_bytes, 0) as used_bytes, -- 0 if no files
  12884901888 as total_bytes, -- 12GB from your schema
  NOW() as last_updated,
  NOW() as created_at
FROM usernames u
LEFT JOIN (
  -- Calculate total file sizes for users who have uploaded files
  SELECT 
    owner_address,
    SUM(file_size_bytes) as total_bytes
  FROM files 
  GROUP BY owner_address
) f ON u.address = f.owner_address;

-- Step 3: Show results
SELECT 
  address,
  used_bytes,
  ROUND(used_bytes / 1024.0 / 1024.0, 2) as used_mb,
  total_bytes,
  ROUND(total_bytes / 1024.0 / 1024.0 / 1024.0, 2) as total_gb,
  last_updated
FROM user_storage 
ORDER BY used_bytes DESC;

-- Step 4: Show summary
SELECT 
  COUNT(*) as total_users_with_storage,
  COUNT(CASE WHEN used_bytes > 0 THEN 1 END) as users_with_files,
  COUNT(CASE WHEN used_bytes = 0 THEN 1 END) as users_without_files,
  ROUND(AVG(used_bytes / 1024.0 / 1024.0), 2) as avg_storage_mb
FROM user_storage;
