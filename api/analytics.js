import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type } = req.query;

    switch (type) {
      case 'platform':
        // Get platform statistics
        const [userCount, fileCount, storageData] = await Promise.all([
          supabase.from('usernames').select('*', { count: 'exact', head: true }),
          supabase.from('files').select('*', { count: 'exact', head: true }),
          supabase.from('user_storage').select('used_bytes')
        ]);

        const totalStorage = storageData.data?.reduce((sum, item) => sum + (item.used_bytes || 0), 0) || 0;

        res.status(200).json({
          totalUsers: userCount.count || 0,
          totalFiles: fileCount.count || 0,
          totalUploads: fileCount.count || 0,
          totalStorage: totalStorage,
          timestamp: new Date().toISOString()
        });
        break;

      case 'users':
        // Get user data
        const { username } = req.query;
        if (!username) {
          return res.status(400).json({ error: 'Username is required' });
        }

        const { data: userData, error: userError } = await supabase
          .from('usernames')
          .select('*')
          .eq('username', username)
          .single();

        if (userError) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Get user's files
        const { data: userFiles } = await supabase
          .from('files')
          .select('*')
          .eq('owner_address', userData.address)
          .order('created_at', { ascending: false });

        res.status(200).json({
          user: userData,
          files: userFiles || [],
          fileCount: userFiles?.length || 0,
          timestamp: new Date().toISOString()
        });
        break;

      case 'files':
        // Get file data
        const { fileId } = req.query;
        if (!fileId) {
          return res.status(400).json({ error: 'File ID is required' });
        }

        const { data: fileData, error: fileError } = await supabase
          .from('files')
          .select(`
            *,
            usernames!inner(username)
          `)
          .eq('id', fileId)
          .single();

        if (fileError) {
          return res.status(404).json({ error: 'File not found' });
        }

        res.status(200).json({
          file: fileData,
          timestamp: new Date().toISOString()
        });
        break;

      case 'activity':
        // Get recent activity
        const { limit = 10 } = req.query;

        const { data: recentFiles } = await supabase
          .from('files')
          .select(`
            id,
            file_name,
            created_at,
            owner_address,
            usernames!inner(username)
          `)
          .order('created_at', { ascending: false })
          .limit(parseInt(limit));

        const activity = recentFiles?.map(file => ({
          id: file.id,
          action: 'File Upload',
          timestamp: file.created_at,
          user: file.usernames?.username || file.owner_address.slice(0, 6) + '...',
          fileName: file.file_name
        })) || [];

        res.status(200).json({
          activity,
          timestamp: new Date().toISOString()
        });
        break;

      default:
        res.status(400).json({ error: 'Invalid analytics type' });
    }
  } catch (error) {
    console.error('Analytics API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
} 