import { useState, useEffect } from 'react';
import { User, HardDrive, FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface ProfileWidgetProps {
  address: string;
  isConnected: boolean;
  usernameSaved: boolean;
  onPageChange?: (page: string) => void;
}

interface UserStats {
  totalFiles: number;
  usedStorage: number;
  totalStorage: number;
  username: string;
  profileAvatar: string;
}

export function ProfileWidget({ address, isConnected, usernameSaved, onPageChange }: ProfileWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch user stats
  useEffect(() => {
    if (!address || !isConnected || !usernameSaved) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const normalizedAddress = address.toLowerCase().trim();

        // Fetch user profile and storage info
        const [profileResult, storageResult, filesResult] = await Promise.all([
          supabase
            .from('usernames')
            .select('username, profile_avatar')
            .eq('address', normalizedAddress)
            .single(),
          supabase
            .from('user_storage')
            .select('used_bytes')
            .eq('address', normalizedAddress)
            .single(),
          supabase
            .from('files')
            .select('id', { count: 'exact' })
            .eq('owner_address', normalizedAddress)
        ]);

        const username = profileResult.data?.username || 'Unknown';
        const profileAvatar = profileResult.data?.profile_avatar || '';
        const usedBytes = storageResult.data?.used_bytes || 0;
        const totalFiles = filesResult.count || 0;
        const totalStorage = 12 * 1024 * 1024 * 1024; // 12GB

        setStats({
          username,
          profileAvatar,
          totalFiles,
          usedStorage: usedBytes,
          totalStorage
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [address, isConnected, usernameSaved]);

  // Don't render if not connected or no username
  if (!isConnected || !usernameSaved) {
    return null;
  }

  const storagePercentage = stats ? (stats.usedStorage / stats.totalStorage) * 100 : 0;
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      {/* Expanded Stats Panel */}
      {isExpanded && stats && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">Profile Stats</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Username */}
            <div className="flex items-center gap-3">
              <User size={16} className="text-[#67FFD4]" />
              <button
                onClick={() => {
                  if (onPageChange) {
                    onPageChange('profile');
                    setIsExpanded(false);
                  }
                }}
                className="text-white hover:text-[#67FFD4] transition-colors cursor-pointer"
              >
                @{stats.username}
              </button>
            </div>
            
            {/* Total Files */}
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-[#67FFD4]" />
              <button
                onClick={() => {
                  if (onPageChange) {
                    onPageChange('myfiles');
                    setIsExpanded(false);
                  }
                }}
                className="text-white hover:text-[#67FFD4] transition-colors cursor-pointer"
              >
                {stats.totalFiles} files
              </button>
            </div>
            
            {/* Storage Usage */}
            <div className="flex items-center gap-3">
              <HardDrive size={16} className="text-[#67FFD4]" />
              <div className="flex-1">
                <div className="flex justify-between text-white text-sm mb-1">
                  <span>Storage</span>
                  <span>{formatBytes(stats.usedStorage)} / {formatBytes(stats.totalStorage)}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-[#67FFD4] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                  />
                </div>
                <div className="text-white/60 text-xs mt-1">
                  {storagePercentage.toFixed(1)}% used
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Profile Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-14 h-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center group hover:scale-110 hover:shadow-xl bg-black/20 backdrop-blur-sm border border-white/10"
      >
        {loading || !stats ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/80" />
        ) : stats.profileAvatar ? (
          <img 
            src={stats.profileAvatar} 
            alt="Profile" 
            className="w-14 h-14 rounded-full object-cover"
          />
                 ) : (
           <User size={24} className="text-white/80" />
         )}
        
                 {/* Expand/Collapse Indicator */}
         <div className="absolute -top-1 -right-1 w-4 h-4 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-transform duration-200 border border-white/20">
           {isExpanded ? (
             <ChevronUp size={12} className="text-black transition-transform duration-200" />
           ) : (
             <ChevronDown size={12} className="text-black transition-transform duration-200" />
           )}
         </div>
      </button>

      {/* Mobile Overlay */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-[9998] md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
} 