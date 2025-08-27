import { supabase } from './supabase';

export interface UserStorage {
  id: string;
  address: string;
  used_bytes: number;
  total_bytes: number;
  last_updated: string;
  created_at: string;
}

/**
 * Check if user has enough storage for a file upload
 */
export async function hasEnoughStorage(
  userAddress: string,
  fileSizeBytes: number
): Promise<boolean> {
  try {
    // Get existing storage record
    const { data, error } = await supabase
      .from('user_storage')
      .select('used_bytes, total_bytes')
      .eq('address', userAddress)
      .single();

    // If record exists, check storage
    if (data && !error) {
      const remainingBytes = data.total_bytes - data.used_bytes;
      return remainingBytes >= fileSizeBytes;
    }

    // If no record exists, create one with default 12GB
    const { error: insertError } = await supabase
      .from('user_storage')
      .insert({
        address: userAddress,
        used_bytes: 0,
        total_bytes: 12884901888, // 12GB from your schema
        last_updated: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to create storage record:', insertError);
      return false;
    }

    // New users get full 12GB, so they can upload
    return true;
  } catch (error) {
    console.error('Error checking storage:', error);
    return false;
  }
}

/**
 * Update user storage after file upload
 */
export async function updateUserStorage(
  userAddress: string,
  fileSizeBytes: number
): Promise<boolean> {
  try {
    // First get current storage to calculate new total
    const { data: currentStorage, error: fetchError } = await supabase
      .from('user_storage')
      .select('used_bytes')
      .eq('address', userAddress)
      .single();

    let newUsedBytes = fileSizeBytes; // Default for new users
    
    if (currentStorage && !fetchError) {
      // Add to existing storage
      newUsedBytes = currentStorage.used_bytes + fileSizeBytes;
    }

    // Use upsert to either update existing record or create new one
    // This prevents duplicate entries per user
    const { error } = await supabase
      .from('user_storage')
      .upsert({
        address: userAddress,
        used_bytes: newUsedBytes,
        total_bytes: 12884901888, // 12GB from your schema
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'address', // Use address as conflict resolution key
        ignoreDuplicates: false // Update existing record instead of ignoring
      });

    if (error) {
      console.error('Error upserting storage:', error);
      return false;
    }

    console.log(`✅ Storage updated for ${userAddress}: ${currentStorage ? 'added' : 'set'} ${fileSizeBytes} bytes, total: ${newUsedBytes} bytes`);
    return true;
  } catch (error) {
    console.error('Error updating storage:', error);
    return false;
  }
}

/**
 * Get user storage information
 */
export async function getUserStorage(userAddress: string): Promise<UserStorage | null> {
  try {
    const { data, error } = await supabase
      .from('user_storage')
      .select('*')
      .eq('address', userAddress)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    console.error('Error getting user storage:', error);
    return null;
  }
}

/**
 * Reset user storage to 0 and recalculate from actual files
 */
export async function resetUserStorage(userAddress: string): Promise<boolean> {
  try {
    // First, set used_bytes to 0
    const { error: resetError } = await supabase
      .from('user_storage')
      .update({
        used_bytes: 0,
        last_updated: new Date().toISOString()
      })
      .eq('address', userAddress);

    if (resetError) {
      console.error('Error resetting storage:', resetError);
      return false;
    }

    console.log(`✅ Storage reset for ${userAddress}`);
    return true;
  } catch (error) {
    console.error('Error resetting user storage:', error);
    return false;
  }
}

/**
 * Get actual file sizes from database for a user
 */
export async function getActualFileSizes(userAddress: string): Promise<number> {
  try {
    // Query files table to get actual file sizes
    const { data, error } = await supabase
      .from('files')
      .select('file_size_bytes')
      .eq('owner_address', userAddress);

    if (error) {
      console.error('Error getting file sizes:', error);
      return 0;
    }

    const totalSize = data?.reduce((sum, file) => sum + (file.file_size_bytes || 0), 0) || 0;
    return totalSize;
  } catch (error) {
    console.error('Error calculating actual file sizes:', error);
    return 0;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
