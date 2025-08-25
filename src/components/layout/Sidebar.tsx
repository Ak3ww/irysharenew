import { useState, useEffect } from 'react';
import { ChevronRight, Home, Folder, Users, Settings, Search, Send, Link } from 'lucide-react';
import { DisconnectButton } from '../ui/disconnect-button';
import { supabase } from '../../utils/supabase';
import { ProfileSearch } from '../ui/profile-search';
interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  notificationCount?: number;
  isNew?: boolean;
}
const SidebarItem = ({ icon, label, isActive = false, onClick, notificationCount, isNew }: SidebarItemProps) => (
  <button 
    className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors relative ${
      isActive ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`}
    onClick={onClick}
  >
    <div className="flex-shrink-0 relative">
      {icon}
      {notificationCount !== undefined && notificationCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {notificationCount > 99 ? '99+' : notificationCount}
        </div>
      )}
    </div>
    <span className="text-sm font-medium flex-1 text-left" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>{label}</span>
    {isNew && (
      <div className="ml-auto bg-gradient-to-r from-[#67FFD4] to-[#00B4D8] text-black text-xs px-2 py-1 rounded-full font-bold animate-pulse">
        NEW
      </div>
    )}
  </button>
);
interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  address?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}
export function Sidebar({ activePage, onPageChange, address, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const [newSharedFilesCount, setNewSharedFilesCount] = useState(0);
  const [showProfileSearch, setShowProfileSearch] = useState(false);
  // Fetch new shared files count
  useEffect(() => {
    if (!address) return;
    const fetchNewSharedFiles = async () => {
      try {
        const { data } = await supabase.rpc('get_user_files', { user_address: address.toLowerCase().trim() });
        const sharedFiles = data?.filter((file: { is_owned: boolean }) => !file.is_owned) || [];
        // Get viewed files from localStorage
        const storedViewedFiles = localStorage.getItem(`viewedFiles_${address.toLowerCase()}`);
        let viewedFiles = new Set<string>();
        if (storedViewedFiles) {
          try {
            const parsedFiles = JSON.parse(storedViewedFiles);
            viewedFiles = new Set(parsedFiles);
          } catch (error) {
            console.error('Error parsing viewed files from localStorage:', error);
          }
        }
        // Count files shared in the last 24 hours that haven't been viewed
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const newFiles = sharedFiles.filter((file: { shared_at?: string; created_at: string; id: string }) => {
          const fileDate = file.shared_at ? new Date(file.shared_at) : new Date(file.created_at);
          return fileDate > oneDayAgo && !viewedFiles.has(file.id);
        });
        setNewSharedFilesCount(newFiles.length);
      } catch (error) {
        console.error('Error fetching new shared files:', error);
      }
    };
    fetchNewSharedFiles();
    // Set up interval to check for localStorage changes (for real-time updates)
    const interval = setInterval(fetchNewSharedFiles, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [address]);
           // Bottom toolbar for collapsed state (PC/tablet and mobile)
    if (isCollapsed) {
      return (
        <>
          <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50">
        <div className="flex items-center justify-around py-3">
          <button
            onClick={() => onPageChange('home')}
            className={`p-3 rounded-md transition-colors touch-manipulation ${
              activePage === 'home' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
            title="Home"
          >
            <Home size={20} />
          </button>
          <button
            onClick={() => onPageChange('myfiles')}
            className={`p-3 rounded-md transition-colors touch-manipulation ${
              activePage === 'myfiles' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
            title="My Files"
          >
            <Folder size={20} />
          </button>
          <button
            onClick={() => onPageChange('shared')}
            className={`p-3 rounded-md transition-colors relative touch-manipulation ${
              activePage === 'shared' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
            title="Shared with Me"
          >
            <Users size={20} />
            {newSharedFilesCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {newSharedFilesCount > 9 ? '9+' : newSharedFilesCount}
              </div>
            )}
          </button>
                      <button
              onClick={() => onPageChange('sendtokens')}
              className="p-3 rounded-md transition-colors text-gray-300 hover:bg-gray-800 hover:text-white touch-manipulation"
              title="Send Tokens"
            >
              <Send size={20} />
            </button>
          <button
            onClick={() => onPageChange('profile')}
            className={`p-3 rounded-md transition-colors touch-manipulation ${
              activePage === 'profile' ? 'bg-[#67FFD4]/20 text-[#67FFD4]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
            title="Profile Settings"
          >
            <Settings size={20} />
          </button>
          {/* Search button */}
          <button
            onClick={() => setShowProfileSearch(true)}
            className="p-3 rounded-md transition-colors text-gray-300 hover:bg-gray-800 hover:text-white touch-manipulation"
            title="Search Profiles"
          >
            <Search size={20} />
          </button>
          {/* Unfold button */}
          <button
            onClick={() => onToggleCollapse?.(false)}
            className="p-3 rounded-md transition-colors text-gray-300 hover:bg-gray-800 hover:text-white bg-gray-800/70 border border-gray-700/50 touch-manipulation"
            title="Expand Sidebar"
          >
            <ChevronRight size={20} className="rotate-90" />
          </button>
          {/* Disconnect button */}
          <DisconnectButton variant="icon-only" />
        </div>
      </div>
      {/* Profile Search Modal */}
      <ProfileSearch 
        isOpen={showProfileSearch}
        onClose={() => setShowProfileSearch(false)}
        currentAddress={address}
      />
    </>
  );
  }
     // Full sidebar
   return (
    <div 
      className="fixed left-0 top-0 w-[280px] bg-black min-h-screen flex flex-col border-r border-gray-800 z-40"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-1">
          <img 
            src="/iryshare_logo.svg" 
            alt="Iryshare Logo" 
            className="h-20 w-auto logo-svg"
          />
          <span className="text-white font-semibold" style={{ fontFamily: 'IrysItalic', letterSpacing: '0.1em' }}>IRYSHARE</span>
        </div>
        <button
          onClick={() => onToggleCollapse?.(true)}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded-md hover:bg-gray-800 bg-gray-800/70 border border-gray-700/50"
          title="Collapse to bottom toolbar"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="py-2 px-3 flex flex-col gap-1 flex-1">
        {/* Search Bar */}
        <div className="mb-4">
          <button
            onClick={() => setShowProfileSearch(true)}
            className="w-full flex items-center gap-3 p-3 rounded-md transition-colors text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-700/50"
          >
            <Search size={18} />
            <span className="text-sm font-medium flex-1 text-left">Search Profiles</span>
          </button>
        </div>
        <SidebarItem 
          icon={<Home size={20} />} 
          label="HOME" 
          isActive={activePage === 'home'}
          onClick={() => onPageChange('home')}
        />
        <SidebarItem 
          icon={<Folder size={20} />} 
          label="FILE LIBRARY" 
          isActive={activePage === 'myfiles'}
          onClick={() => onPageChange('myfiles')}
        />
        <SidebarItem 
          icon={<Users size={20} />} 
          label="INCOMING FILES" 
          isActive={activePage === 'shared'}
          onClick={() => onPageChange('shared')}
          notificationCount={newSharedFilesCount}
        />
                 <SidebarItem
           icon={<Send size={20} />}
           label="SEND TOKENS"
           isActive={false}
           onClick={() => onPageChange('sendtokens')}
         />
        <SidebarItem
          icon={<Link size={20} />}
          label="LINKTREE"
          isActive={activePage === 'linktree'}
          onClick={() => onPageChange('linktree')}
          isNew={true}
        />
                                 <SidebarItem
          icon={<Settings size={20} />}
          label="PROFILE SETTINGS"
          isActive={activePage === 'profile'}
          onClick={() => onPageChange('profile')}
        />
      </div>
      {/* Disconnect Button */}
      <div className="p-4 border-t border-gray-800">
        <div className="px-2">
          <DisconnectButton />
        </div>
      </div>
      {/* Profile Search Modal */}
      <ProfileSearch 
        isOpen={showProfileSearch}
        onClose={() => setShowProfileSearch(false)}
        currentAddress={address}
      />
    </div>
  );
} 
