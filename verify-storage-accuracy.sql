-- VERIFY: Check if storage calculation is accurate
-- Run this after populating to verify everything is correct

-- Check 1: Compare user_storage vs actual files for each user
SELECT 
  'STORAGE vs FILES COMPARISON' as check_type,
  us.address,
  us.used_bytes as storage_bytes,
  ROUND(us.used_bytes / 1024.0 / 1024.0, 2) as storage_mb,
  COALESCE(f.total_bytes, 0) as actual_files_bytes,
  ROUND(COALESCE(f.total_bytes, 0) / 1024.0 / 1024.0, 2) as actual_files_mb,
  CASE 
    WHEN us.used_bytes = COALESCE(f.total_bytes, 0) THEN '✅ ACCURATE'
    ELSE '❌ INACCURATE'
  END as accuracy_status
FROM user_storage us
LEFT JOIN (
  SELECT 
    owner_address,
    SUM(file_size_bytes) as total_bytes
  FROM files 
  GROUP BY owner_address
) f ON us.address = f.owner_address
ORDER BY us.used_bytes DESC;

-- Check 2: Show any discrepancies
SELECT 
  'DISCREPANCIES FOUND' as check_type,
  us.address,
  us.used_bytes as storage_bytes,
  COALESCE(f.total_bytes, 0) as actual_files_bytes,
  ABS(us.used_bytes - COALESCE(f.total_bytes, 0)) as difference_bytes,
  ROUND(ABS(us.used_bytes - COALESCE(f.total_bytes, 0)) / 1024.0 / 1024.0, 2) as difference_mb
FROM user_storage us
LEFT JOIN (
  SELECT 
    owner_address,
    SUM(file_size_bytes) as total_bytes
  FROM files 
  GROUP BY owner_address
) f ON us.address = f.owner_address
WHERE us.used_bytes != COALESCE(f.total_bytes, 0);

-- Check 3: Summary statistics
SELECT 
  'SUMMARY' as check_type,
  COUNT(*) as total_users,
  COUNT(CASE WHEN used_bytes > 0 THEN 1 END) as users_with_files,
  COUNT(CASE WHEN used_bytes = 0 THEN 1 END) as users_without_files,
  ROUND(SUM(used_bytes) / 1024.0 / 1024.0, 2) as total_storage_used_mb,
  ROUND(AVG(used_bytes) / 1024.0 / 1024.0, 2) as avg_storage_per_user_mb
FROM user_storage;
