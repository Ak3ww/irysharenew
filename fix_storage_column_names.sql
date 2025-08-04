-- Fix Storage Column Names
-- Update functions to use 'address' instead of 'user_address' to match existing table

-- 1. Update function to update user storage when files are added
CREATE OR REPLACE FUNCTION update_user_storage_on_file_add()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user storage record
  INSERT INTO user_storage (address, used_bytes, last_updated)
  VALUES (NEW.owner_address, NEW.file_size_bytes, NOW())
  ON CONFLICT (address)
  DO UPDATE SET
    used_bytes = user_storage.used_bytes + NEW.file_size_bytes,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update function to update user storage when files are deleted
CREATE OR REPLACE FUNCTION update_user_storage_on_file_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user storage record
  UPDATE user_storage
  SET 
    used_bytes = GREATEST(0, used_bytes - OLD.file_size_bytes),
    last_updated = NOW()
  WHERE address = OLD.owner_address;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. Update function to get user storage info
CREATE OR REPLACE FUNCTION get_user_storage(user_addr TEXT)
RETURNS TABLE(
  used_bytes BIGINT,
  total_bytes BIGINT,
  used_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(us.used_bytes, 0) as used_bytes,
    COALESCE(us.total_bytes, 12884901888) as total_bytes,
    CASE 
      WHEN us.total_bytes > 0 THEN 
        ROUND((COALESCE(us.used_bytes, 0)::NUMERIC / us.total_bytes::NUMERIC) * 100, 2)
      ELSE 0
    END as used_percentage
  FROM user_storage us
  WHERE us.address = user_addr;
END;
$$ LANGUAGE plpgsql;

-- 4. Update function to initialize user storage if not exists
CREATE OR REPLACE FUNCTION initialize_user_storage(user_addr TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_storage (address, used_bytes, total_bytes)
  VALUES (user_addr, 0, 12884901888)
  ON CONFLICT (address) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 5. Update function to recalculate all user storage
CREATE OR REPLACE FUNCTION recalculate_all_user_storage()
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all unique users in files_new
  FOR user_record IN 
    SELECT DISTINCT owner_address 
    FROM files_new 
    WHERE owner_address IS NOT NULL
  LOOP
    -- Initialize storage for this user
    PERFORM initialize_user_storage(user_record.owner_address);
    
    -- Update used_bytes based on actual file sizes
    UPDATE user_storage
    SET used_bytes = (
      SELECT COALESCE(SUM(file_size_bytes), 0)
      FROM files_new
      WHERE owner_address = user_record.owner_address
    ),
    last_updated = NOW()
    WHERE address = user_record.owner_address;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. Update index for better performance
DROP INDEX IF EXISTS idx_user_storage_address;
CREATE INDEX IF NOT EXISTS idx_user_storage_address ON user_storage(address);

-- 7. Run initial migration to populate storage data
SELECT recalculate_all_user_storage(); 