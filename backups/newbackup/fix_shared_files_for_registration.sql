-- ========================================
-- FIX SHARED FILES FOR REGISTRATION
-- This updates file_shares when users register
-- ========================================

-- Function to update file_shares when a user registers
CREATE OR REPLACE FUNCTION public.update_file_shares_on_registration(
    user_address TEXT,
    username TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update all file_shares entries for this address
    -- Set the recipient_username when someone registers
    UPDATE public.file_shares 
    SET recipient_username = update_file_shares_on_registration.username
    WHERE recipient_address = update_file_shares_on_registration.user_address
    AND recipient_username IS NULL;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update file_shares when someone registers
CREATE OR REPLACE FUNCTION public.handle_user_registration()
RETURNS TRIGGER AS $$
BEGIN
    -- Update file_shares when a new user registers
    PERFORM public.update_file_shares_on_registration(
        NEW.address,
        NEW.username
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on usernames table
DROP TRIGGER IF EXISTS trigger_update_file_shares_on_registration ON public.usernames;
CREATE TRIGGER trigger_update_file_shares_on_registration
    AFTER INSERT ON public.usernames
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_registration();

-- ========================================
-- FIX EXISTING DATA
-- ========================================

-- Update existing file_shares with usernames for registered users
UPDATE public.file_shares fs
SET recipient_username = u.username
FROM public.usernames u
WHERE fs.recipient_address = u.address
AND fs.recipient_username IS NULL;

-- ========================================
-- VERIFICATION
-- ========================================

-- Check file_shares that have addresses but no usernames
SELECT 
    'File shares without usernames:' as info,
    COUNT(*) as count
FROM public.file_shares 
WHERE recipient_username IS NULL;

-- Check file_shares that have both address and username
SELECT 
    'File shares with usernames:' as info,
    COUNT(*) as count
FROM public.file_shares 
WHERE recipient_username IS NOT NULL;

-- Show sample of file_shares
SELECT 
    file_id,
    recipient_address,
    recipient_username,
    shared_at
FROM public.file_shares 
ORDER BY shared_at DESC 
LIMIT 10;

SELECT 'Shared files registration fix applied successfully!' as status; 