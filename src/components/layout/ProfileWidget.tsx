import { useState, useEffect } from 'react';
import { User, X, Coins, LogOut } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useBalance, useAccount, useDisconnect } from 'wagmi';

interface ProfileWidgetProps {
  address: string;
  isConnected: boolean;
  usernameSaved: boolean;
  isMobile?: boolean;
}

interface UserStats {
  totalFiles: number;
  usedStorage: number;
  totalStorage: number;
  username: string;
  profileAvatar: string;
}

export function ProfileWidget({ address, isConnected, usernameSaved, isMobile = false }: ProfileWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);

  // Wagmi hooks for Irys network
  const { address: wagmiAddress } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Get Irys balance
  const { data: irysBalance, isLoading: balanceLoading } = useBalance({
    address: wagmiAddress as `0x${string}`,
  });

  // Fetch user stats
  useEffect(() => {
    if (!address || !isConnected || !usernameSaved) return;

    const fetchStats = async () => {
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

  // Format Irys balance
  const formatIrysBalance = (balance: bigint | undefined) => {
    if (!balance) return '0 IRYS';
    const irysAmount = Number(balance) / 10**18;
    if (irysAmount < 0.001) {
      return `${(irysAmount * 1000).toFixed(2)} mIRYS`;
    }
    return `${irysAmount.toFixed(4)} IRYS`;
  };

  // Positioning based on layout - moved to top navigation bar
  const containerClasses = isMobile 
    ? "fixed top-0 left-0 right-0 z-[9999] bg-black/20 backdrop-blur-sm border-b border-white/5" 
    : "w-full bg-transparent";

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex-1"></div>
        <div className="relative">
          {/* Expanded Stats Panel */}
          {isExpanded && stats && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-top-2 duration-200">
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
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Username</span>
              <span className="text-white font-medium">{stats.username}</span>
            </div>
            
            {/* Irys Balance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={14} className="text-[#67FFD4]" />
                <span className="text-white/60 text-sm">Irys Balance</span>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">
                  {balanceLoading ? (
                    <div className="animate-pulse bg-white/20 h-4 w-16 rounded"></div>
                  ) : (
                    formatIrysBalance(irysBalance?.value)
                  )}
                </div>
                <div className="text-white/40 text-xs">
                  Irys Testnet
                </div>
              </div>
            </div>
            
            {/* Total Files */}
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Total Files</span>
              <span className="text-white font-medium">{stats.totalFiles}</span>
            </div>
            
            {/* Storage Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Storage Used</span>
                <span className="text-white font-medium">{formatBytes(stats.usedStorage)}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-[#67FFD4] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                />
              </div>
              <div className="text-right">
                <span className="text-white/40 text-xs">{formatBytes(stats.totalStorage)} total</span>
              </div>
            </div>
            
            {/* Disconnect Button */}
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  disconnect();
                  setIsExpanded(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-all duration-200"
              >
                <LogOut size={16} />
                <span className="text-sm font-medium">Disconnect Wallet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative w-12 h-12 bg-black/20 backdrop-blur-sm border border-white/10 rounded-full overflow-hidden hover:bg-black/30 transition-all duration-200 group"
      >
        {stats?.profileAvatar ? (
          <img 
            src={stats.profileAvatar} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User size={24} className="text-white/60" />
          </div>
        )}
      </button>
        </div>
      </div>
    </div>
  );
} 