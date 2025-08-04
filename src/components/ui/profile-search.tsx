import { useState, useEffect, useRef } from 'react';
import { Search, User, Users, Eye, EyeOff, FileText, Calendar, X } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useNavigate } from 'react-router-dom';

interface ProfileData {
  username: string;
  address: string;
  profile_bio?: string | null;
  profile_avatar?: string | null;
  profile_public?: boolean | null;
  created_at: string;
  updated_at?: string;
  public_file_count?: number;
}

interface ProfileSearchProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress?: string;
}

export function ProfileSearch({ isOpen, onClose, currentAddress }: ProfileSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentProfileSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (username: string) => {
    const updated = [username, ...recentSearches.filter(s => s !== username)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentProfileSearches', JSON.stringify(updated));
  };

  // Search profiles with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const query = searchQuery.trim().toLowerCase();
        
        // Search by username (partial match)
        const { data, error } = await supabase
          .from('usernames')
          .select('*')
          .ilike('username', `%${query}%`)
          .limit(10);

        if (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } else {
          // Filter out current user and sort by relevance
          const filtered = (data || [])
            .filter(profile => profile.address.toLowerCase() !== currentAddress?.toLowerCase())
            .sort((a, b) => {
              // Exact matches first
              if (a.username.toLowerCase() === query) return -1;
              if (b.username.toLowerCase() === query) return 1;
              // Then by username length (shorter = more relevant)
              return a.username.length - b.username.length;
            });
          
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, currentAddress]);

  // Handle profile click
  const handleProfileClick = (username: string) => {
    saveRecentSearch(username);
    navigate(`/profile/${username}`);
    onClose();
    setSearchQuery('');
  };

  // Handle recent search click
  const handleRecentSearchClick = (username: string) => {
    setSearchQuery(username);
  };

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  // Click outside handler
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[#67FFD4] font-bold text-lg">Search Profiles</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-[#67FFD4] transition-colors p-2 rounded-md hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username..."
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all"
            autoFocus
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#67FFD4]"></div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchQuery.trim() && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((profile) => (
                <div
                  key={profile.username}
                  onClick={() => handleProfileClick(profile.username)}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-[#67FFD4] to-[#00B4D8] rounded-full flex items-center justify-center text-black font-bold text-lg">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Profile Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-medium">@{profile.username}</h4>
                      {profile.profile_public === false ? (
                        <EyeOff size={14} className="text-amber-400" />
                      ) : (
                        <Eye size={14} className="text-emerald-400" />
                      )}
                    </div>
                    
                    {profile.profile_bio && (
                      <p className="text-white/60 text-sm truncate">{profile.profile_bio}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-white/40 text-xs">
                      <div className="flex items-center gap-1">
                        <FileText size={12} />
                        <span>{profile.public_file_count || 0} files</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action */}
                  <div className="text-white/40 hover:text-[#67FFD4] transition-colors">
                    <Users size={16} />
                  </div>
                </div>
              ))
            ) : isSearching ? (
              <div className="text-center text-white/60 py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#67FFD4] mx-auto mb-4"></div>
                <p>Searching...</p>
              </div>
            ) : (
              <div className="text-center text-white/60 py-8">
                <User size={48} className="mx-auto mb-4 opacity-50" />
                <p>No profiles found</p>
                <p className="text-sm">Try a different username</p>
              </div>
            )}
          </div>
        )}

        {/* Recent Searches */}
        {!searchQuery.trim() && recentSearches.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-white/60 text-sm font-medium mb-3">Recent Searches</h4>
            {recentSearches.map((username) => (
              <div
                key={username}
                onClick={() => handleRecentSearchClick(username)}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <User size={16} className="text-white/40" />
                <span className="text-white">@{username}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!searchQuery.trim() && recentSearches.length === 0 && (
          <div className="text-center text-white/60 py-8">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <p>Search for profiles to discover public galleries</p>
            <p className="text-sm">Type a username to get started</p>
          </div>
        )}
      </div>
    </div>
  );
} 