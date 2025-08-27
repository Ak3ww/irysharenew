// Calculate accurate storage based on actual files
// Run: node calculate-storage.js

import { createClient } from '@supabase/supabase-js';

// Replace these with your actual values from .env
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function calculateAccurateStorage() {
  try {
    console.log('🔍 Calculating accurate storage from files table...');
    
    // Step 1: Get all files with sizes and owners
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('file_size, owner_address')
      .not('file_size', 'is', null);

    if (filesError) {
      console.error('❌ Error getting files:', filesError);
      return;
    }

    console.log(`📁 Found ${files.length} files to process`);

    // Step 2: Calculate total storage per user
    const userStorage = {};
    
    files.forEach(file => {
      const address = file.owner_address;
      if (address) {
        if (!userStorage[address]) {
          userStorage[address] = 0;
        }
        userStorage[address] += file.file_size || 0;
      }
    });

    console.log(`👥 Found ${Object.keys(userStorage).length} unique users`);

    // Step 3: Clear existing user_storage table
    console.log('🧹 Clearing existing user_storage table...');
    const { error: clearError } = await supabase
      .from('user_storage')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (clearError) {
      console.error('❌ Error clearing table:', clearError);
      return;
    }

    // Step 4: Insert accurate storage data
    console.log('💾 Inserting accurate storage data...');
    
    const storageRecords = Object.entries(userStorage).map(([address, usedBytes]) => ({
      address,
      used_bytes: usedBytes,
      total_bytes: 12884901888, // 12GB from your schema
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('user_storage')
      .insert(storageRecords);

    if (insertError) {
      console.error('❌ Error inserting storage data:', insertError);
      return;
    }

    // Step 5: Show results
    console.log('\n✅ Storage calculation complete!');
    console.log('\n📊 Results:');
    
    Object.entries(userStorage).forEach(([address, bytes]) => {
      const mb = (bytes / 1024 / 1024).toFixed(2);
      console.log(`👤 ${address}: ${mb} MB`);
    });

    console.log('\n🎯 Your user_storage table now has accurate data!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

calculateAccurateStorage();
