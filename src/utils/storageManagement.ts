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
    // Get current storage
    const { data, error } = await supabase
      .from('user_storage')
      .select('used_bytes')
      .eq('address', userAddress)
      .single();

    if (error || !data) {
      // Create storage record if it doesn't exist
      const { error: insertError } = await supabase
        .from('user_storage')
        .insert({
          address: userAddress,
          used_bytes: fileSizeBytes,
          total_bytes: 12884901888, // 12GB from your schema
          last_updated: new Date().toISOString()
        });

      return !insertError;
    }

    // Update existing storage
    const newUsedBytes = data.used_bytes + fileSizeBytes;
    const { error: updateError } = await supabase
      .from('user_storage')
      .update({
        used_bytes: newUsedBytes,
        last_updated: new Date().toISOString()
      })
      .eq('address', userAddress);

    return !updateError;
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
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
