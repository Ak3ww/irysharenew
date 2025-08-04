-- Add recipient_metadata_url column to files table for cost-effective recipient management
-- This allows us to store recipient information separately without re-uploading files

-- Add the new column
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS recipient_metadata_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_files_recipient_metadata_url ON files(recipient_metadata_url);
CREATE INDEX IF NOT EXISTS idx_files_updated_at ON files(updated_at);

-- Update existing files to have updated_at timestamp
UPDATE files 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN files.recipient_metadata_url IS 'URL to external recipient metadata file (cost-effective approach)';
COMMENT ON COLUMN files.updated_at IS 'Timestamp when file metadata was last updated'; 