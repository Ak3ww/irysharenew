-- Verify ALL Users Storage - Run this to check if ALL storage calculations are accurate

-- Compare user_storage vs actual files for ALL users
SELECT 
  us.address,
  us.used_bytes as storage_used,
  ROUND(us.used_bytes / 1024.0 / 1024.0, 2) as storage_mb,
  f.total_bytes as files_total,
  ROUND(f.total_bytes / 1024.0 / 1024.0, 2) as files_mb,
  f.file_count,
  CASE 
    WHEN us.used_bytes = f.total_bytes THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status,
  CASE 
    WHEN us.used_bytes > f.total_bytes THEN 
      ROUND((us.used_bytes - f.total_bytes) / 1024.0 / 1024.0, 2) || ' MB OVER'
    WHEN us.used_bytes < f.total_bytes THEN 
      ROUND((f.total_bytes - us.used_bytes) / 1024.0 / 1024.0, 2) || ' MB UNDER'
    ELSE '0 MB DIFFERENCE'
  END as difference
FROM user_storage us
LEFT JOIN (
  SELECT 
    owner_address,
    COUNT(*) as file_count,
    SUM(file_size_bytes) as total_bytes
  FROM files 
  GROUP BY owner_address
) f ON us.address = f.owner_address
ORDER BY 
  CASE WHEN us.used_bytes != f.total_bytes THEN 0 ELSE 1 END,
  ABS(us.used_bytes - COALESCE(f.total_bytes, 0)) DESC;

-- Show summary of verification
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN status = '✅ MATCH' THEN 1 END) as matching_users,
  COUNT(CASE WHEN status = '❌ MISMATCH' THEN 1 END) as mismatched_users,
  ROUND(
    COUNT(CASE WHEN status = '✅ MATCH' THEN 1 END) * 100.0 / COUNT(*), 2
  ) as accuracy_percentage
FROM (
  SELECT 
    us.address,
    CASE 
      WHEN us.used_bytes = f.total_bytes THEN '✅ MATCH'
      ELSE '❌ MISMATCH'
    END as status
  FROM user_storage us
  LEFT JOIN (
    SELECT 
      owner_address,
      SUM(file_size_bytes) as total_bytes
    FROM files 
    GROUP BY owner_address
  ) f ON us.address = f.owner_address
) verification;
