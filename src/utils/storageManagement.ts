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
    console.log(`🔍 Checking storage for user: ${userAddress}, file size: ${fileSizeBytes} bytes`);
    
    const { data, error } = await supabase
      .from('user_storage')
      .select('used_bytes, total_bytes')
      .eq('address', userAddress)
      .single();

    if (error) {
      console.error('Error checking storage:', error);
      
      // If it's a "not found" error, create storage record
      if (error.code === 'PGRST116') {
        console.log('No storage record found for user, creating one...');
        const created = await createUserStorage(userAddress, 0);
        if (created) {
          console.log('✅ Storage record created successfully');
          return true; // New users get full 12GB
        } else {
          console.error('❌ Failed to create storage record');
          return false;
        }
      }
      
      return false;
    }

    if (!data) {
      console.log('No storage record found for user, creating one...');
      const created = await createUserStorage(userAddress, 0);
      if (created) {
        console.log('✅ Storage record created successfully');
        return true; // New users get full 12GB
      } else {
        console.error('❌ Failed to create storage record');
        return false;
      }
    }

    const remainingBytes = data.total_bytes - data.used_bytes;
    const hasEnough = remainingBytes >= fileSizeBytes;
    
    console.log(`📊 Storage check: ${data.used_bytes} used, ${data.total_bytes} total, ${remainingBytes} remaining, need ${fileSizeBytes}, has enough: ${hasEnough}`);
    
    return hasEnough;
  } catch (error) {
    console.error('Error in hasEnoughStorage:', error);
    
    // For any unexpected errors, try to create storage record as fallback
    try {
      console.log('🔄 Attempting to create storage record as fallback...');
      const created = await createUserStorage(userAddress, 0);
      if (created) {
        console.log('✅ Storage record created as fallback');
        return true;
      }
    } catch (fallbackError) {
      console.error('❌ Fallback storage creation also failed:', fallbackError);
    }
    
    return false;
  }
}

/**
 * Create new user storage record with 12GB free credit
 */
export async function createUserStorage(
  userAddress: string, 
  initialFileSize: number = 0
): Promise<boolean> {
  try {
    const TWELVE_GB = 12 * 1024 * 1024 * 1024; // 12GB in bytes
    
    const { error } = await supabase
      .from('user_storage')
      .insert({
        address: userAddress,
        used_bytes: initialFileSize,
        total_bytes: TWELVE_GB,
        last_updated: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating user storage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createUserStorage:', error);
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
    const { data, error } = await supabase
      .from('user_storage')
      .select('used_bytes')
      .eq('address', userAddress)
      .single();

    if (error) {
      console.error('Error fetching current storage:', error);
      return false;
    }

    const newUsedBytes = (data?.used_bytes || 0) + fileSizeBytes;

    const { error: updateError } = await supabase
      .from('user_storage')
      .update({
        used_bytes: newUsedBytes,
        last_updated: new Date().toISOString()
      })
      .eq('address', userAddress);

    if (updateError) {
      console.error('Error updating user storage:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateUserStorage:', error);
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

    if (error) {
      console.error('Error fetching user storage:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserStorage:', error);
    return null;
  }
}

/**
 * Get storage usage percentage
 */
export function getStorageUsagePercentage(usedBytes: number, totalBytes: number): number {
  if (totalBytes === 0) return 0;
  return Math.round((usedBytes / totalBytes) * 100);
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
