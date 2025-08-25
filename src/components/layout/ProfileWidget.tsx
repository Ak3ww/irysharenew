import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useBalance, useAccount, useDisconnect } from 'wagmi';
import { useToast } from '../../hooks/use-toast';
interface ProfileWidgetProps {
  address: string;
  isConnected: boolean;
  usernameSaved: boolean;
}
interface UserStats {
  totalFiles: number;
  usedStorage: number;
  totalStorage: number;
  username: string;
  profileAvatar: string;
}
export function ProfileWidget({ address, isConnected, usernameSaved }: ProfileWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const { toast } = useToast();
  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
        variant: "success",
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };
  // Wagmi hooks for Irys network
  const { address: wagmiAddress } = useAccount();
  const { disconnect } = useDisconnect();
  // Get Irys balance
  const { data: irysBalance, isLoading: balanceLoading } = useBalance({
    address: wagmiAddress as `0x${string}`,
  });
  // Fetch user stats
  const fetchStats = async () => {
    if (!address || !isConnected || !usernameSaved) return;
    try {
      const normalizedAddress = address.toLowerCase().trim();
      // Fetch user profile and storage info
      const [profileResult, filesResult] = await Promise.all([
        supabase
          .from('usernames')
          .select('username, profile_avatar')
          .eq('address', normalizedAddress)
          .single(),
        supabase
          .from('files')
          .select('id', { count: 'exact' })
          .eq('owner_address', normalizedAddress)
      ]);
      const username = profileResult.data?.username || 'Unknown';
      const profileAvatar = profileResult.data?.profile_avatar || '';
      const usedBytes = 0; // Storage tracking temporarily disabled
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

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [address, isConnected, usernameSaved]);

  // Listen for storage changes to refresh avatar
  useEffect(() => {
    const handleStorageChange = () => {
      fetchStats();
    };

    // Listen for custom event when main app avatar is updated (mainavatars)
    window.addEventListener('avatar-updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('avatar-updated', handleStorageChange);
    };
  }, []);
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
  return (
    <div className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full overflow-hidden hover:bg-white/10 transition-all duration-200 group"
      >
                {stats?.profileAvatar ? (
          <img 
            key={stats.profileAvatar}
            src={stats.profileAvatar} 
            alt={stats.username} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white/60 text-2xl">
              {stats?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </button>

      {/* Expanded Profile Panel */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-black border border-white/20 rounded-xl shadow-2xl z-[9999]">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                PROFILE OVERVIEW
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="text-white/60 text-xs mb-1" style={{ fontFamily: 'Irys2' }}>
                  TOTAL FILES
                </div>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Irys1' }}>
                  {stats?.totalFiles || 0}
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="text-white/60 text-xs mb-1" style={{ fontFamily: 'Irys2' }}>
                  STORAGE USED
                </div>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Irys1' }}>
                  {formatBytes(stats?.usedStorage || 0)}
                </div>
              </div>
            </div>

            {/* Storage Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-white/60 mb-2" style={{ fontFamily: 'Irys2' }}>
                <span>STORAGE</span>
                <span>{formatBytes(stats?.usedStorage || 0)} / {formatBytes(stats?.totalStorage || 0)}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#67FFD4] to-[#8AFFE4] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Irys Balance */}
            <div className="bg-white/10 rounded-lg p-4 border border-white/20 mb-6">
              <div className="text-white/60 text-xs mb-1" style={{ fontFamily: 'Irys2' }}>
                IRYS BALANCE
              </div>
              <div className="text-2xl font-bold text-[#67FFD4]" style={{ fontFamily: 'Irys1' }}>
                {balanceLoading ? '...' : formatIrysBalance(irysBalance?.value)}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => copyToClipboard(address)}
                className="w-full flex items-center justify-center gap-3 p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors"
                style={{ fontFamily: 'Irys2' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                COPY ADDRESS
              </button>
              
              <button
                onClick={() => disconnect()}
                className="w-full flex items-center justify-center gap-3 p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-colors"
                style={{ fontFamily: 'Irys2' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                DISCONNECT WALLET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
