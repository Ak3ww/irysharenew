import { useState, useEffect } from 'react';
import { ChevronRight, Home, Folder, Users, Settings, HardDrive, Bell } from 'lucide-react';
import { DisconnectButton } from './ui/disconnect-button';
import { CircleProgress } from './ui/circle-progress';
import { supabase } from '../utils/supabase';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  notificationCount?: number;
}

const SidebarItem = ({ icon, label, isActive = false, onClick, notificationCount }: SidebarItemProps) => (
  <button 
    className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors relative ${
      isActive ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`}
    onClick={onClick}
  >
    <div className="flex-shrink-0 relative">
      {icon}
      {notificationCount && notificationCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {notificationCount > 99 ? '99+' : notificationCount}
        </div>
      )}
    </div>
    <span className="text-sm font-medium flex-1 text-left">{label}</span>
  </button>
);

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  address?: string;
}

export function Sidebar({ activePage, onPageChange, address }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; total: number } | null>(null);
  const [newSharedFilesCount, setNewSharedFilesCount] = useState(0);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch storage info
  useEffect(() => {
    if (!address) return;
    
    const fetchStorageInfo = async () => {
      try {
        const { data } = await supabase
          .from('user_storage')
          .select('used_bytes')
          .eq('address', address.toLowerCase().trim())
          .single();
        
        if (data) {
          setStorageInfo({
            used: data.used_bytes,
            total: 12 * 1024 * 1024 * 1024 // 12GB
          });
        } else {
          setStorageInfo({ used: 0, total: 12 * 1024 * 1024 * 1024 });
        }
      } catch (error) {
        console.error('Error fetching storage info:', error);
        setStorageInfo({ used: 0, total: 12 * 1024 * 1024 * 1024 });
      }
    };

    fetchStorageInfo();
  }, [address]);

  // Fetch new shared files count
  useEffect(() => {
    if (!address) return;
    
    const fetchNewSharedFiles = async () => {
      try {
        const { data } = await supabase.rpc('get_user_files', { user_address: address.toLowerCase().trim() });
        const sharedFiles = data?.filter((file: any) => !file.is_owned) || [];
        
        // Count files shared in the last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const newFiles = sharedFiles.filter((file: any) => {
          const fileDate = file.shared_at ? new Date(file.shared_at) : new Date(file.created_at);
          return fileDate > oneDayAgo;
        });
        
        setNewSharedFilesCount(newFiles.length);
      } catch (error) {
        console.error('Error fetching new shared files:', error);
      }
    };

    fetchNewSharedFiles();
  }, [address]);

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const storagePercentage = storageInfo ? (storageInfo.used / storageInfo.total) * 100 : 0;

  // Mobile toolbar at bottom
  if (isMobile && isCollapsed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-gray-800 z-50">
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => onPageChange('home')}
            className={`p-2 rounded-md transition-colors ${
              activePage === 'home' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Home size={20} />
          </button>
          
          <button
            onClick={() => onPageChange('myfiles')}
            className={`p-2 rounded-md transition-colors ${
              activePage === 'myfiles' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Folder size={20} />
          </button>
          
          <button
            onClick={() => onPageChange('shared')}
            className={`p-2 rounded-md transition-colors relative ${
              activePage === 'shared' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Users size={20} />
            {newSharedFilesCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {newSharedFilesCount > 9 ? '9+' : newSharedFilesCount}
              </div>
            )}
          </button>
          
          <button
            onClick={() => onPageChange('profile')}
            className={`p-2 rounded-md transition-colors ${
              activePage === 'profile' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Collapsed sidebar
  if (isCollapsed) {
    return (
      <div className="fixed left-0 top-0 w-16 bg-[#1A1A1A] min-h-screen flex flex-col items-center py-4 border-r border-gray-800 z-40">
        <div className="mb-8">
          <div className="w-8 h-8 bg-[#67FFD4] rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">I</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onPageChange('home')}
            className={`p-2 rounded-md transition-colors ${
              activePage === 'home' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Home size={20} />
          </button>
          
          <button
            onClick={() => onPageChange('myfiles')}
            className={`p-2 rounded-md transition-colors ${
              activePage === 'myfiles' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Folder size={20} />
          </button>
          
          <button
            onClick={() => onPageChange('shared')}
            className={`p-2 rounded-md transition-colors relative ${
              activePage === 'shared' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Users size={20} />
            {newSharedFilesCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {newSharedFilesCount > 9 ? '9+' : newSharedFilesCount}
              </div>
            )}
          </button>
          
          <button
            onClick={() => onPageChange('profile')}
            className={`p-2 rounded-md transition-colors ${
              activePage === 'profile' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Settings size={20} />
          </button>
        </div>
        
        <div className="mt-auto">
          <DisconnectButton variant="minimal" />
        </div>
        
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-800 rounded-full p-1 text-white hover:bg-gray-700 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  // Full sidebar
  return (
    <div className="fixed left-0 top-0 w-[280px] bg-[#1A1A1A] min-h-screen flex flex-col border-r border-gray-800 z-40">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#67FFD4] rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">I</span>
          </div>
          <span className="text-white font-semibold">IRYSHARE</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-800"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="py-2 px-3 flex flex-col gap-1 flex-1">
        <SidebarItem 
          icon={<Home size={20} />} 
          label="Home" 
          isActive={activePage === 'home'}
          onClick={() => onPageChange('home')}
        />
        <SidebarItem 
          icon={<Folder size={20} />} 
          label="My Files" 
          isActive={activePage === 'myfiles'}
          onClick={() => onPageChange('myfiles')}
        />
        <SidebarItem 
          icon={<Users size={20} />} 
          label="Shared with Me" 
          isActive={activePage === 'shared'}
          onClick={() => onPageChange('shared')}
          notificationCount={newSharedFilesCount}
        />
        <SidebarItem 
          icon={<Settings size={20} />} 
          label="Profile Settings" 
          isActive={activePage === 'profile'}
          onClick={() => onPageChange('profile')}
        />
      </div>

      {/* Storage Information with Circle Progress */}
      {storageInfo && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={16} className="text-[#67FFD4]" />
            <span className="text-sm font-medium text-gray-300">Storage Usage</span>
          </div>
          <div className="flex items-center justify-center mb-3">
            <CircleProgress percentage={storagePercentage} size={80} strokeWidth={6}>
              <div className="text-center">
                <div className="text-[#67FFD4] text-sm font-bold">
                  {storagePercentage.toFixed(1)}%
                </div>
              </div>
            </CircleProgress>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">
              {formatStorage(storageInfo.used)} / 12 GB
            </div>
            <div className="text-xs text-gray-500">
              {((storageInfo.total - storageInfo.used) / (1024 * 1024 * 1024)).toFixed(2)} GB available
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Button */}
      <div className="p-4 border-t border-gray-800">
        <DisconnectButton />
      </div>
    </div>
  );
} 