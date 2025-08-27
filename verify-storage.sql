-- Verify Storage Calculation - Run this to check if storage is accurate
-- This will compare what's in user_storage vs actual files table

-- Check your specific user's files and sizes
SELECT 
  file_name,
  file_size_bytes,
  ROUND(file_size_bytes / 1024.0 / 1024.0, 2) as size_mb,
  created_at
FROM files 
WHERE owner_address = '0x4351fd8d9a25c14556ce621ddcce35c2adefe156'
ORDER BY created_at DESC;

-- Sum up your actual file sizes
SELECT 
  owner_address,
  COUNT(*) as file_count,
  SUM(file_size_bytes) as total_bytes,
  ROUND(SUM(file_size_bytes) / 1024.0 / 1024.0, 2) as total_mb
FROM files 
WHERE owner_address = '0x4351fd8d9a25c14556ce621ddcce35c2adefe156'
GROUP BY owner_address;

-- Compare with user_storage table
SELECT 
  us.address,
  us.used_bytes as storage_used,
  ROUND(us.used_bytes / 1024.0 / 1024.0, 2) as storage_mb,
  f.total_bytes as files_total,
  ROUND(f.total_bytes / 1024.0 / 1024.0, 2) as files_mb,
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
WHERE us.address = '0x4351fd8d9a25c14556ce621ddcce35c2adefe156';
