import { Home, Folder, Users, Settings, Search, Send } from 'lucide-react';
import { ProfileSearch } from '../ui/profile-search';
import { useState } from 'react';
interface MobileNavProps {
  activePage: string;
  onPageChange: (page: string) => void;
  address?: string;
}
export function MobileNav({ activePage, onPageChange, address }: MobileNavProps) {
  const [showProfileSearch, setShowProfileSearch] = useState(false);
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'myfiles', label: 'Files', icon: Folder, path: '/myfiles' },
    { id: 'shared', label: 'Shared', icon: Users, path: '/shared' },
    { id: 'sendtokens', label: 'Send', icon: Send, path: '/sendtokens' },
    { id: 'profile', label: 'Profile', icon: Settings, path: '/profile' },
  ];
  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="flex items-center justify-around px-4 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'text-[#67FFD4] bg-[#67FFD4]/10' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
          {/* Search Button */}
          <button
            onClick={() => setShowProfileSearch(true)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 text-white/60 hover:text-white hover:bg-white/5"
          >
            <Search size={20} />
            <span className="text-xs font-medium">Search</span>
          </button>
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
