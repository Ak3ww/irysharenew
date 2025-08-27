import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TWELVE_GB = 12 * 1024 * 1024 * 1024; // 12GB in bytes

/**
 * Update existing users with 12GB free storage credit
 */
async function updateExistingUsersStorage() {
  try {
    console.log('🔄 Updating existing users with 12GB free storage...');
    
    // Get all existing users from profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('address');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }
    
    console.log(`📊 Found ${profiles.length} existing users`);
    
    let updatedCount = 0;
    let createdCount = 0;
    
    for (const profile of profiles) {
      if (!profile.address) continue;
      
      // Check if user already has storage record
      const { data: existingStorage, error: checkError } = await supabase
        .from('user_storage')
        .select('id, total_bytes')
        .eq('address', profile.address)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`❌ Error checking storage for ${profile.address}:`, checkError);
        continue;
      }
      
      if (existingStorage) {
        // Update existing record to 12GB if it's not already set
        if (existingStorage.total_bytes !== TWELVE_GB) {
          const { error: updateError } = await supabase
            .from('user_storage')
            .update({
              total_bytes: TWELVE_GB,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingStorage.id);
          
          if (updateError) {
            console.error(`❌ Error updating storage for ${profile.address}:`, updateError);
          } else {
            updatedCount++;
            console.log(`✅ Updated storage for ${profile.address}`);
          }
        }
      } else {
        // Create new storage record
        const { error: insertError } = await supabase
          .from('user_storage')
          .insert({
            address: profile.address,
            used_bytes: 0,
            total_bytes: TWELVE_GB,
            last_updated: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Error creating storage for ${profile.address}:`, insertError);
        } else {
          createdCount++;
          console.log(`✅ Created storage for ${profile.address}`);
        }
      }
    }
    
    console.log('\n🎉 Storage update completed!');
    console.log(`📝 Updated: ${updatedCount} users`);
    console.log(`🆕 Created: ${createdCount} users`);
    
  } catch (error) {
    console.error('❌ Error in updateExistingUsersStorage:', error);
  }
}

/**
 * Calculate total storage statistics
 */
async function getStorageStats() {
  try {
    console.log('📊 Getting storage statistics...');
    
    const { data: storageData, error } = await supabase
      .from('user_storage')
      .select('used_bytes, total_bytes');
    
    if (error) {
      console.error('❌ Error fetching storage data:', error);
      return;
    }
    
    const totalUsers = storageData.length;
    const totalUsed = storageData.reduce((sum, user) => sum + (user.used_bytes || 0), 0);
    const totalAllocated = storageData.reduce((sum, user) => sum + (user.total_bytes || 0), 0);
    const averageUsed = totalUsers > 0 ? totalUsed / totalUsers : 0;
    const averageAllocated = totalUsers > 0 ? totalAllocated / totalUsers : 0;
    
    console.log('\n📈 Storage Statistics:');
    console.log(`👥 Total Users: ${totalUsers}`);
    console.log(`💾 Total Used: ${formatBytes(totalUsed)}`);
    console.log(`🎯 Total Allocated: ${formatBytes(totalAllocated)}`);
    console.log(`📊 Average Used per User: ${formatBytes(averageUsed)}`);
    console.log(`🎯 Average Allocated per User: ${formatBytes(averageAllocated)}`);
    console.log(`💯 Utilization: ${((totalUsed / totalAllocated) * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('❌ Error in getStorageStats:', error);
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Iryshare Storage Management Utility\n');
  
  const command = process.argv[2];
  
  switch (command) {
    case 'update':
      await updateExistingUsersStorage();
      break;
    case 'stats':
      await getStorageStats();
      break;
    case 'all':
      await updateExistingUsersStorage();
      console.log('\n' + '='.repeat(50) + '\n');
      await getStorageStats();
      break;
    default:
      console.log('Usage: node storage-utils.js [command]');
      console.log('Commands:');
      console.log('  update  - Update existing users with 12GB storage');
      console.log('  stats   - Show storage statistics');
      console.log('  all     - Run both update and stats');
      console.log('\nExample: node storage-utils.js all');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { updateExistingUsersStorage, getStorageStats, formatBytes };
