-- Fix Storage Issue - Run this in Supabase SQL Editor
-- This will recalculate accurate storage based on actual files
-- Using the correct column name: file_size_bytes

-- Step 1: Clear existing user_storage table
DELETE FROM user_storage;

-- Step 2: Calculate accurate storage per user and insert
INSERT INTO user_storage (address, used_bytes, total_bytes, last_updated, created_at)
SELECT 
  owner_address as address,
  COALESCE(SUM(file_size_bytes), 0) as used_bytes,
  12884901888 as total_bytes, -- 12GB from your schema
  NOW() as last_updated,
  NOW() as created_at
FROM files 
WHERE owner_address IS NOT NULL 
  AND file_size_bytes IS NOT NULL
GROUP BY owner_address;

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
