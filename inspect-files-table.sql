-- Inspect files table structure
-- Run this first to see what columns exist

-- Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'files' 
ORDER BY ordinal_position;

-- Show sample data
SELECT * FROM files LIMIT 5;

-- Check for size-related columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'files' 
  AND (column_name LIKE '%size%' OR column_name LIKE '%bytes%' OR column_name LIKE '%length%');
