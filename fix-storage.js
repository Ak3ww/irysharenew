// Quick fix for storage issue
// Run: node fix-storage.js

import { createClient } from '@supabase/supabase-js';

// Replace these with your actual values from .env
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStorage() {
  try {
    console.log('🔧 Fixing storage issue...');
    
    // Your wallet address
    const userAddress = '0x4351fd8d9a25c14556ce621ddcce35c2adefe156';
    
    // Reset storage to 0
    const { error } = await supabase
      .from('user_storage')
      .update({
        used_bytes: 0,
        last_updated: new Date().toISOString()
      })
      .eq('address', userAddress);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Storage fixed! used_bytes reset to 0');
    console.log('🎯 Next upload will start counting from 0');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixStorage();
