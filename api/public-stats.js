import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }

  try {
    console.log('🌐 Public API called');

    // Fetch basic platform stats
    const [userCount, fileCount, storageData] = await Promise.all([
      supabase.from('usernames').select('*', { count: 'exact', head: true }),
      supabase.from('files').select('*', { count: 'exact', head: true }),
      supabase.from('user_storage').select('used_bytes')
    ]);

    const totalStorage = storageData.data?.reduce((sum, item) => sum + (item.used_bytes || 0), 0) || 0;

    // Format storage in human readable format
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const stats = {
      platform: 'Iryshare',
      description: 'Decentralized file sharing and token distribution on Irys Network',
      stats: {
        totalUsers: userCount.count || 0,
        totalFiles: fileCount.count || 0,
        totalUploads: fileCount.count || 0,
        totalStorage: formatBytes(totalStorage),
        totalStorageBytes: totalStorage
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      network: 'Irys Testnet'
    };

    console.log('📊 API Response:', stats);

    res.status(200).json(stats);

  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch platform statistics',
      timestamp: new Date().toISOString()
    });
  }
} 