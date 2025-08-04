import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';

interface PlatformStats {
  totalUsers: number;
  totalFiles: number;
  totalUploads: number;
  totalStorage: number;
}

interface AnalyticsDashboardProps {
  refreshTrigger?: number;
}

export function AnalyticsDashboard({ refreshTrigger = 0 }: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalFiles: 0,
    totalUploads: 0,
    totalStorage: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchPlatformStats();
  }, [refreshTrigger]); // Refresh when trigger changes

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard...');
      fetchPlatformStats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchPlatformStats = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching platform stats...');

      // For now, let's use direct Supabase queries instead of API
      // Fetch total users
      const { count: userCount } = await supabase
        .from('usernames')
        .select('*', { count: 'exact', head: true });

      // Fetch total files
      const { count: fileCount } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true });

      // Fetch total storage used
      const { data: storageData } = await supabase
        .from('user_storage')
        .select('used_bytes');

      const totalStorage = storageData?.reduce((sum, item) => sum + (item.used_bytes || 0), 0) || 0;

      console.log('📊 Platform stats:', { userCount, fileCount, totalStorage });

      setStats({
        totalUsers: userCount || 0,
        totalFiles: fileCount || 0,
        totalUploads: fileCount || 0,
        totalStorage: totalStorage
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Error fetching platform stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#18191a] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#67FFD4] mx-auto"></div>
            <p className="text-white/80 mt-4 text-lg">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#18191a] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
            ANALYTICS DASHBOARD
          </h1>
          <p className="text-white/60" style={{ fontFamily: 'Irys2' }}>
            Platform statistics and user activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>Total Users</p>
                <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Irys1' }}>
                  {stats.totalUsers.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          {/* Total Files */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>Total Files</p>
                <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Irys1' }}>
                  {stats.totalFiles.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">📁</div>
            </div>
          </div>

          {/* Total Uploads */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>Total Uploads</p>
                <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Irys1' }}>
                  {stats.totalUploads.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">📤</div>
            </div>
          </div>

          {/* Total Storage */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>Total Storage</p>
                <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Irys1' }}>
                  {formatBytes(stats.totalStorage)}
                </p>
              </div>
              <div className="text-4xl">💾</div>
            </div>
          </div>
        </div>



        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              fetchPlatformStats();
            }}
            className="bg-[#67FFD4] text-black font-bold py-3 px-6 rounded-xl hover:bg-[#8AFFE4] transition-all duration-300"
            style={{ fontFamily: 'Irys2' }}
          >
            🔄 Refresh Data
          </button>
          <p className="text-white/40 text-sm mt-2" style={{ fontFamily: 'Irys2' }}>
            Auto-refreshes every 30 seconds • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
} 