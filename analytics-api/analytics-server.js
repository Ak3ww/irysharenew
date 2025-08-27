import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import authRouter from './auth-endpoints.js';
import { authenticateWallet } from './auth-middleware.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Iryshare Analytics API'
  });
});

// Public platform statistics endpoint
app.get('/api/analytics/platform-stats', async (req, res) => {
  try {
    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('Error fetching user count:', usersError);
      return res.status(500).json({ error: 'Failed to fetch user count' });
    }

    // Get total files
    const { count: totalFiles, error: filesError } = await supabase
      .from('files')
      .select('*', { count: 'exact', head: true });

    if (filesError) {
      console.error('Error fetching file count:', filesError);
      return res.status(500).json({ error: 'Failed to fetch file count' });
    }

    // Get total storage allocated
    const { data: storageData, error: storageError } = await supabase
      .from('user_storage')
      .select('total_bytes');

    if (storageError) {
      console.error('Error fetching storage data:', storageError);
      return res.status(500).json({ error: 'Failed to fetch storage data' });
    }

    const totalAllocated = storageData?.reduce((sum, user) => sum + (user.total_bytes || 0), 0) || 0;

    // Get total storage used
    const { data: usedStorageData, error: usedStorageError } = await supabase
      .from('user_storage')
      .select('used_bytes');

    if (usedStorageError) {
      console.error('Error fetching used storage data:', usedStorageError);
      return res.status(500).json({ error: 'Failed to fetch used storage data' });
    }

    const totalStorage = usedStorageData?.reduce((sum, user) => sum + (user.used_bytes || 0), 0) || 0;

    const stats = {
      totalUsers: totalUsers || 0,
      totalFiles: totalFiles || 0,
      totalUploads: totalFiles || 0, // Same as total files for now
      totalStorage: totalStorage,
      totalAllocated: totalAllocated,
      timestamp: new Date().toISOString()
    };

    res.json(stats);
  } catch (error) {
    console.error('Error in platform stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recent activity endpoint
app.get('/api/analytics/recent-activity', async (req, res) => {
  try {
    const { data: recentFiles, error } = await supabase
      .from('files')
      .select(`
        id,
        filename,
        size,
        created_at,
        profiles!inner(username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching recent activity:', error);
      return res.status(500).json({ error: 'Failed to fetch recent activity' });
    }

    const activity = recentFiles?.map(file => ({
      id: file.id,
      filename: file.filename,
      size: file.size,
      uploadedBy: file.profiles?.username || 'Unknown',
      avatarUrl: file.profiles?.avatar_url,
      timestamp: file.created_at
    })) || [];

    res.json({ activity });
  } catch (error) {
    console.error('Error in recent activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authenticated analytics endpoints
app.use('/api/auth', authRouter);

// Hidden admin dashboard route
app.get('/admin/api-dashboard', (req, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePath = path.join(__dirname, 'admin-dashboard.html');
  res.sendFile(filePath);
});

// Platform test page for external developers
app.get('/platform-test', (req, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePath = path.join(__dirname, 'platform-test.html');
  res.sendFile(filePath);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Analytics server running on http://localhost:${PORT}`);
  console.log(`📊 Hidden analytics dashboard: http://localhost:${PORT}/admin/api-dashboard`);
  console.log(`🔐 Hidden admin dashboard: http://localhost:${PORT}/admin/api-dashboard`);
  console.log(`🔗 Platform test page: http://localhost:${PORT}/platform-test`);
  console.log(`🔗 API endpoints: http://localhost:${PORT}/api/analytics`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
