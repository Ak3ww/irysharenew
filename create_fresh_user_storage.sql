-- Create Fresh User Storage System
-- This creates a clean user_storage table with proper structure

-- 1. Drop existing table if exists (clean slate)
DROP TABLE IF EXISTS user_storage CASCADE;

-- 2. Create fresh user_storage table
CREATE TABLE user_storage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL UNIQUE,
  used_bytes BIGINT DEFAULT 0,
  total_bytes BIGINT DEFAULT 12884901888, -- 12GB in bytes
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create function to update user storage when files are added
CREATE OR REPLACE FUNCTION update_user_storage_on_file_add()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user storage record
  INSERT INTO user_storage (user_address, used_bytes, last_updated)
  VALUES (NEW.owner_address, NEW.file_size_bytes, NOW())
  ON CONFLICT (user_address)
  DO UPDATE SET
    used_bytes = user_storage.used_bytes + NEW.file_size_bytes,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to update user storage when files are deleted
CREATE OR REPLACE FUNCTION update_user_storage_on_file_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user storage record
  UPDATE user_storage
  SET 
    used_bytes = GREATEST(0, used_bytes - OLD.file_size_bytes),
    last_updated = NOW()
  WHERE user_address = OLD.owner_address;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to get user storage info
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
  WHERE us.user_address = user_addr;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to initialize user storage if not exists
CREATE OR REPLACE FUNCTION initialize_user_storage(user_addr TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_storage (user_address, used_bytes, total_bytes)
  VALUES (user_addr, 0, 12884901888)
  ON CONFLICT (user_address) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers for automatic storage tracking
CREATE TRIGGER trigger_update_storage_on_file_add
  AFTER INSERT ON files_new
  FOR EACH ROW
  EXECUTE FUNCTION update_user_storage_on_file_add();

CREATE TRIGGER trigger_update_storage_on_file_delete
  AFTER DELETE ON files_new
  FOR EACH ROW
  EXECUTE FUNCTION update_user_storage_on_file_delete();

-- 8. Create function to recalculate all user storage (for migration)
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
    WHERE user_address = user_record.owner_address;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. Create index for better performance
CREATE INDEX idx_user_storage_address ON user_storage(user_address);

-- 10. Grant necessary permissions
GRANT ALL ON user_storage TO anon;
GRANT ALL ON user_storage TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 11. Run initial migration to populate storage data
SELECT recalculate_all_user_storage();

-- 12. Show results
SELECT 'Storage system created successfully!' as status;
SELECT COUNT(*) as total_users_with_storage FROM user_storage; 