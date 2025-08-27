-- Fix Storage Mismatch - Run this to fix file size discrepancies
-- This will recalculate storage based on actual files and fix any mismatches

-- Step 1: Show current mismatches
SELECT 
  'CURRENT MISMATCHES' as status,
  us.address,
  us.used_bytes as storage_used,
  ROUND(us.used_bytes / 1024.0 / 1024.0, 2) as storage_mb,
  f.total_bytes as files_total,
  ROUND(f.total_bytes / 1024.0 / 1024.0, 2) as files_mb,
  CASE 
    WHEN us.used_bytes != f.total_bytes THEN '❌ MISMATCH'
    ELSE '✅ MATCH'
  END as status_check
FROM user_storage us
LEFT JOIN (
  SELECT 
    owner_address,
    SUM(file_size_bytes) as total_bytes
  FROM files 
  GROUP BY owner_address
) f ON us.address = f.owner_address
WHERE us.used_bytes != COALESCE(f.total_bytes, 0)
ORDER BY ABS(us.used_bytes - COALESCE(f.total_bytes, 0)) DESC;

-- Step 2: Fix the mismatches by updating user_storage
UPDATE user_storage 
SET 
  used_bytes = COALESCE(
    (SELECT SUM(file_size_bytes) FROM files WHERE owner_address = user_storage.address), 
    0
  ),
  last_updated = NOW()
WHERE address IN (
  SELECT us.address
  FROM user_storage us
  LEFT JOIN (
    SELECT 
      owner_address,
      SUM(file_size_bytes) as total_bytes
    FROM files 
    GROUP BY owner_address
  ) f ON us.address = f.owner_address
  WHERE us.used_bytes != COALESCE(f.total_bytes, 0)
);

-- Step 3: Show results after fix
SELECT 
  'AFTER FIX' as status,
  address,
  used_bytes,
  ROUND(used_bytes / 1024.0 / 1024.0, 2) as used_mb,
  total_bytes,
  ROUND(total_bytes / 1024.0 / 1024.0 / 1024.0, 2) as total_gb,
  last_updated
FROM user_storage 
ORDER BY used_bytes DESC;

-- Step 4: Verify all users have storage records
SELECT 
  'MISSING STORAGE RECORDS' as status,
  u.address,
  u.username
FROM usernames u
LEFT JOIN user_storage us ON u.address = us.address
WHERE us.address IS NULL;
