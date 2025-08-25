import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../../../utils/supabase';

// Enhanced theme colors with modern designs
const COLORS = [
  { id: 1, color: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100', text: 'text-slate-800', name: 'Ocean Breeze' },
  { id: 2, color: 'bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900', text: 'text-white', name: 'Midnight Elegance' },
  { id: 3, color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500', text: 'text-white', name: 'Sunset Glow' },
  { id: 4, color: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500', text: 'text-white', name: 'Emerald Forest' },
  { id: 5, color: 'bg-gradient-to-br from-orange-400 via-red-500 to-pink-500', text: 'text-white', name: 'Fire Sunset' },
  { id: 6, color: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600', text: 'text-white', name: 'Royal Blue' },
  { id: 7, color: 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500', text: 'text-white', name: 'Golden Hour' },
  { id: 8, color: 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500', text: 'text-white', name: 'Nature Fresh' },
  { id: 9, color: 'bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500', text: 'text-white', name: 'Lavender Dream' },
  { id: 10, color: 'bg-gradient-to-br from-gray-100 via-slate-200 to-gray-300', text: 'text-slate-800', name: 'Minimalist' },
];

export interface Link {
  id: number;
  name: string;
  url: string;
  image?: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
}

interface LinktreeContextType {
  // State (exact match to original Vue store)
  id: string;
  theme_id: number;
  name: string;
  email: string;
  image: string;
  bio: string;
  username: string; // Main app username for @username display
  theme: typeof COLORS[0] | null;
  colors: typeof COLORS;
  allLinks: Link[];
  isMobile: boolean;
  updatedLinkId: number;
  addLinkOverlay: boolean;
  isPreviewOverlay: boolean;
  isLoading: boolean;

  // Actions (exact match to original Vue store)
  hidePageOverflow: (val: boolean, id?: string) => void;
  allLowerCaseNoCaps: (str: string) => string;
  getUser: () => Promise<void>;
  updateUserImage: (data: string) => Promise<void>;
  updateLinkImage: (data: string, linkId: number) => Promise<void>;
  deleteLink: (id: number) => Promise<void>;
  getUserTheme: () => void;
  updateUserDetails: (name: string, bio: string) => Promise<void>;
  updateTheme: (themeId: number) => Promise<void>;
  getAllLinks: () => Promise<void>;
  addLink: (name: string, url: string) => Promise<void>;
  updateLink: (id: number, name: string, url: string) => Promise<void>;
  reorderLinks: (fromIndex: number, toIndex: number) => Promise<void>;
  moveLink: (linkId: number, direction: 'up' | 'down') => Promise<void>;
  syncFromMainApp: () => Promise<void>;
  updateLinktreeProfile: (name: string, bio: string, image?: string) => Promise<void>;
  saveLinktreeProfile: () => Promise<void>;
  saveLinktreeData: () => void;
  forceUsernameSync: () => Promise<void>;
  debugDatabaseCheck: () => Promise<void>;
  
  // Setters
  setUpdatedLinkId: (id: number) => void;
  setAddLinkOverlay: (val: boolean) => void;
  setIsPreviewOverlay: (val: boolean) => void;
  setIsMobile: (val: boolean) => void;

  // New Linktree-specific fields
  linktree_username: string;
  linktree_bio: string;
  linktree_avatar: string;
  hasUnsavedChanges: boolean;
  changeAvatar: (newAvatarFile: File) => Promise<string>;
  
  // Linktree setters
  setLinktreeUsername: (username: string) => void;
  setLinktreeBio: (bio: string) => void;
  setLinktreeAvatar: (avatar: string) => void;
}

const LinktreeContext = createContext<LinktreeContextType | undefined>(undefined);

// LocalStorage keys
const STORAGE_KEYS = {
  USER_DATA: 'iryshare_linktree_user',
  LINKS_DATA: 'iryshare_linktree_links',
};

export function LinktreeProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();

  // State (exact match to original Vue store)
  const [id, setId] = useState('1'); // Auto-set like original
  const [theme_id, setThemeId] = useState(1);
  const [name, setName] = useState(''); // Start empty, will be populated from main app
  const [email, setEmail] = useState('demo@iryshare.com');
  const [image, setImage] = useState('');
  const [bio, setBio] = useState('Welcome to my Linktree on Iryshare!');
  const [username, setUsername] = useState('demouser'); // Main app username
  const [theme, setTheme] = useState<typeof COLORS[0] | null>(COLORS[0]);
  const [allLinks, setAllLinks] = useState<Link[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Linktree-specific state variables (separate from main app)
  const [linktree_username, setLinktreeUsername] = useState('My Linktree');
  const [linktree_bio, setLinktreeBio] = useState('Welcome to my Linktree!');
  const [linktree_avatar, setLinktreeAvatar] = useState('');
  const [updatedLinkId, setUpdatedLinkId] = useState(0);
  const [addLinkOverlay, setAddLinkOverlay] = useState(false);
  const [isPreviewOverlay, setIsPreviewOverlay] = useState(false);

  // Initialize like original Vue app
  useEffect(() => {
    // Set mobile detection like original
    if ('ontouchstart' in window) {
      setIsMobile(true);
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ensure theme is always set
  useEffect(() => {
    if (!theme && theme_id) {
      const selectedTheme = COLORS.find(color => color.id === theme_id) || COLORS[0];
      setTheme(selectedTheme);
    }
  }, [theme, theme_id]);

  // Auto-initialize (like original auto-login)
  useEffect(() => {
    initializeUser();
  }, [address]);

  // State changes handled silently

  const initializeUser = async () => {
    try {
      setId('1'); // Auto-set like original
      await getUser();
      await getAllLinks();
    } catch {
      // Error handled silently
    }
  };

  // Load user data from database (missing function!)
  const getUser = async () => {
    try {
      // Loading user data from database...
      
      // Load saved Linktree data from localStorage first (for immediate UI)
      const savedData = localStorage.getItem('iryshare_linktree_data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          // Found saved Linktree data in localStorage
          
          // Restore basic data immediately
          if (parsed.name) setName(parsed.name);
          if (parsed.bio) setBio(parsed.bio);
          if (parsed.image) setImage(parsed.image);
          if (parsed.theme) setTheme(parsed.theme);
          if (parsed.theme_id) setThemeId(parsed.theme_id);
          if (parsed.username) setUsername(parsed.username);
        } catch {
          // Error parsing saved data
        }
      }
      
      // Then load from database (this will override localStorage with latest data)
      await syncFromMainApp();
      
      // User data loaded successfully
    } catch {
      // Error loading user data
    }
  };

  // Fetch main app profile data - using exact same pattern as ProfileSettings.tsx
  const fetchMainAppProfile = async () => {
    if (!address) {
      // No address provided for profile fetch
      return null;
    }
    
    try {
      const normalizedAddress = address.toLowerCase().trim();
      // Fetching main app profile for address
      
      // Use the EXACT same pattern as ProfileSettings.tsx
      const { data: usernameData, error: usernameError } = await supabase
        .from('usernames')
        .select('username, profile_bio, profile_avatar, linktree_avatar, linktree_username, linktree_bio')
        .eq('address', normalizedAddress)
        .single();

      if (usernameError) {
        return null;
      }

      if (!usernameData) {
        return null;
      }

      // Username data found
      return {
        name: usernameData.username || '',
        bio: usernameData.profile_bio || 'Welcome to my Linktree on Iryshare!',
        image: usernameData.profile_avatar || '',
        linktree_avatar: usernameData.linktree_avatar || '',
        username: usernameData.username || 'demouser',
        linktree_theme_id: 1,
        linktree_username: usernameData.linktree_username || '',
        linktree_bio: usernameData.linktree_bio || ''
      };
    } catch {
      return null;
    }
  };

  // Load user data from localStorage, auto-populate from main app if empty
  // Returns true if saved data was loaded, false otherwise
  const loadUserData = async (): Promise<boolean> => {
    // First try to load from the saved Linktree data
    const savedLinktreeData = localStorage.getItem('iryshare_linktree_data');
    // Checking for saved Linktree data
    
    if (savedLinktreeData) {
      try {
        const linktreeData = JSON.parse(savedLinktreeData);
        // Loading saved Linktree data
        
        // Load all saved data first
        setId(linktreeData.id || '1');
        setName(linktreeData.name || '');
        setEmail('demo@iryshare.com');
        setBio(linktreeData.bio || 'Welcome to my Linktree on Iryshare!');
        setImage(linktreeData.image || '');
        setLinktreeAvatar(linktreeData.linktree_avatar || '');
        setLinktreeUsername(linktreeData.linktree_username || '');
        setLinktreeBio(linktreeData.linktree_bio || '');
        setThemeId(linktreeData.theme_id || 1);
        
        // Load saved theme - this takes priority
        if (linktreeData.theme) {
          // Setting theme from saved data
          setTheme(linktreeData.theme);
        } else {
          const selectedTheme = COLORS.find(color => color.id === linktreeData.theme_id) || COLORS[0];
          // Setting theme from theme_id
          setTheme(selectedTheme);
        }
        
        // Load saved links
        if (linktreeData.links && linktreeData.links.length > 0) {
          // Setting links from saved data
          setAllLinks(linktreeData.links);
        }
        
        // ALWAYS fetch main app profile to get current username and linktree_avatar
        if (address) {
        const mainProfile = await fetchMainAppProfile();
        if (mainProfile) {
            // Username from main app ALWAYS takes priority
            console.log('Setting username from main app:', mainProfile.username);
            setUsername(mainProfile.username || 'demouser');
            
            // Set the Profile Title to username from main app (like ProfileSettings.tsx does)
            if (!linktreeData.name || linktreeData.name === '') {
              console.log('Setting Profile Title to username from main app:', mainProfile.username);
              setName(mainProfile.username || '');
            }
            
            // Prioritize linktree_avatar from database over saved image
            if (mainProfile.linktree_avatar) {
              console.log('Setting linktree avatar from database:', mainProfile.linktree_avatar);
              setLinktreeAvatar(mainProfile.linktree_avatar);
            } else if (mainProfile.image && !linktreeData.image) {
              // Fallback to main app avatar only if no saved linktree avatar
              console.log('Setting main app avatar as fallback:', mainProfile.image);
              setImage(mainProfile.image);
            }
          }
        }
        
        console.log('Successfully loaded saved Linktree data');
        return true;
      } catch (error) {
        console.error('Error loading saved Linktree data:', error);
      }
    }
    
    // If no saved data or error, fetch from main app
    if (address) {
      const mainProfile = await fetchMainAppProfile();
      if (mainProfile) {
        setId('1');
        // Set Profile Title to username from main app (like ProfileSettings.tsx does)
        setName(mainProfile.username || '');
        setUsername(mainProfile.username || 'demouser');
        setEmail('demo@iryshare.com');
        setBio(mainProfile.bio || 'Welcome to my Linktree on Iryshare!');
        
        if (mainProfile.linktree_avatar) {
          setLinktreeAvatar(mainProfile.linktree_avatar);
        } else {
          setImage(mainProfile.image || '');
        }
        
        setThemeId(1);
        setTheme(COLORS[0]);
      } else {
        // Fallback to defaults
        setId('1');
        setName('');
        setUsername('demouser');
        setEmail('demo@iryshare.com');
        setBio('Welcome to my Linktree on Iryshare!');
        setImage('');
        setThemeId(1);
        setTheme(COLORS[0]);
      }
    }
    
    return false;
  };

  // Save links to localStorage
  const saveLinksData = (links: Link[]) => {
    localStorage.setItem(STORAGE_KEYS.LINKS_DATA, JSON.stringify(links));
  };

  // Load links from localStorage
  const loadLinksData = (): Link[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.LINKS_DATA);
    if (stored) {
      return JSON.parse(stored);
    }
    // Return default links like original
    return [
      { id: 1, name: 'My Website', url: 'https://iryshare.com', image: '/link-placeholder.png' },
      { id: 2, name: 'Instagram', url: 'https://instagram.com/iryshare', image: '/link-placeholder.png' },
      { id: 3, name: 'YouTube', url: 'https://youtube.com/@iryshare', image: '/link-placeholder.png' },
      { id: 4, name: 'Twitter', url: 'https://twitter.com/iryshare', image: '/link-placeholder.png' }
    ];
  };

  // Actions (exact match to original Vue store functions)
  const hidePageOverflow = (val: boolean, elementId?: string) => {
    if (val) {
      document.body.style.overflow = 'hidden';
      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) element.style.overflow = 'hidden';
      }
      return;
    }
    document.body.style.overflow = 'visible';
    if (elementId) {
      const element = document.getElementById(elementId);
      if (element) element.style.overflow = 'visible';
    }
  };

  const allLowerCaseNoCaps = (str: string) => {
    return str.split(' ').join('').toLowerCase();
  };



  const updateUserImage = async (data: string) => {
    try {
      setImage(data);
      // Don't auto-save to prevent infinite loops
    } catch (error) {
      console.error('Error updating user image:', error);
      throw error;
    }
  };

  const updateLinkImage = async (data: string, linkId: number) => {
    try {
      const updatedLinks = allLinks.map(link => 
        link.id === linkId ? { ...link, image: data } : link
      );
      setAllLinks(updatedLinks);
      saveLinksData(updatedLinks);
    } catch (error) {
      console.error('Error updating link image:', error);
      throw error;
    }
  };

  const deleteLink = async (linkId: number) => {
    try {
      const updatedLinks = allLinks.filter(link => link.id !== linkId);
      setAllLinks(updatedLinks);
      saveLinksData(updatedLinks);
    } catch (error) {
      console.error('Error deleting link:', error);
      throw error;
    }
  };

  const getUserTheme = () => {
    const selectedTheme = COLORS.find(color => color.id === theme_id) || COLORS[0];
    setTheme(selectedTheme);
  };

  const updateUserDetails = async (newName: string, newBio: string) => {
    try {
      setName(newName);
      setBio(newBio);
      // Don't auto-save to prevent infinite loops
    } catch (error) {
      console.error('Error updating user details:', error);
      throw error;
    }
  };

  const updateTheme = async (newThemeId: number) => {
    try {
      setThemeId(newThemeId);
      const selectedTheme = COLORS.find(color => color.id === newThemeId) || COLORS[0];
      setTheme(selectedTheme);
      
      // Save theme to localStorage instead of database since column doesn't exist
      const currentData = {
        id,
        name,
        bio,
        image,
        theme: selectedTheme,
        theme_id: newThemeId,
        links: allLinks,
        username
      };
      
      localStorage.setItem('iryshare_linktree_data', JSON.stringify(currentData));
              // Theme saved to localStorage
      
      // Don't auto-save to prevent infinite loops
    } catch (error) {
      console.error('Error updating theme:', error);
      throw error;
    }
  };

  const getAllLinks = async () => {
    try {
      const links = loadLinksData();
      setAllLinks(links);
    } catch (error) {
      console.error('Error loading links:', error);
    }
  };

  const addLink = async (linkName: string, url: string) => {
    try {
      const newLink: Link = {
        id: Date.now(), // Use timestamp as ID
        name: linkName,
        url: url,
        image: '/link-placeholder.png',
        created_at: new Date().toISOString()
      };
      const updatedLinks = [...allLinks, newLink];
      setAllLinks(updatedLinks);
      saveLinksData(updatedLinks);
    } catch (error) {
      console.error('Error adding link:', error);
      throw error;
    }
  };

  const updateLink = async (linkId: number, linkName: string, url: string) => {
    try {
      const updatedLinks = allLinks.map(link =>
        link.id === linkId ? { ...link, name: linkName, url: url, updated_at: new Date().toISOString() } : link
      );
      setAllLinks(updatedLinks);
      saveLinksData(updatedLinks);
    } catch (error) {
      console.error('Error updating link:', error);
      throw error;
    }
  };

  const reorderLinks = async (fromIndex: number, toIndex: number) => {
    try {
      const updatedLinks = [...allLinks];
      const [reorderedItem] = updatedLinks.splice(fromIndex, 1);
      updatedLinks.splice(toIndex, 0, reorderedItem);
      
      setAllLinks(updatedLinks);
      saveLinksData(updatedLinks);
    } catch (error) {
      console.error('Error reordering links:', error);
      throw error;
    }
  };

  const moveLink = async (linkId: number, direction: 'up' | 'down') => {
    try {
      const currentIndex = allLinks.findIndex(link => link.id === linkId);
      if (currentIndex === -1) return;

      let newIndex: number;
      if (direction === 'up') {
        newIndex = Math.max(0, currentIndex - 1);
      } else {
        newIndex = Math.min(allLinks.length - 1, currentIndex + 1);
      }

      if (currentIndex === newIndex) return; // No movement needed

      await reorderLinks(currentIndex, newIndex);
    } catch (error) {
      console.error('Error moving link:', error);
      throw error;
    }
  };

  // Sync profile data from main app (overwrite linktree profile)
  const syncFromMainApp = async () => {
    try {
      const mainProfile = await fetchMainAppProfile();
      if (mainProfile) {
        // If Profile Title is still default or empty, use username
        if (!name || name === 'Demo User' || name === username) {
          setName(mainProfile.username || mainProfile.name || 'Demo User');
        }
        setBio(mainProfile.bio || 'Welcome to my Linktree on Iryshare!');
        
        // Username from main app ALWAYS takes absolute priority
        setUsername(mainProfile.username || 'demouser');
        
        // Handle avatar syncing with new database structure
        let avatarToSync = '';
        
        // Priority: existing linktree avatar > main app avatar
        if (mainProfile.linktree_avatar) {
          avatarToSync = mainProfile.linktree_avatar;
          // Using existing linktree avatar
          setImage(avatarToSync);
        } else if (mainProfile.image) {
          // Syncing avatar from main app
          
          // Check if it's already a linktree avatar (avoid duplicate copying)
          if (mainProfile.image.includes('linktree_avatars/')) {
            avatarToSync = mainProfile.image;
            setImage(avatarToSync);
          } else {
            // Copy main app avatar (from mainavatars or other source) to linktree_avatars folder
            try {
              const response = await fetch(mainProfile.image);
              const blob = await response.blob();
              const file = new File([blob], 'synced-avatar.jpg', { type: blob.type });
              
                             // Upload to linktreeavatars folder (no underscore in storage)
               const fileExt = file.name.split('.').pop();
               const fileName = `linktreeavatars/synced_${address}.${fileExt}`;
              
              const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                  cacheControl: '3600',
                  upsert: true
                });
              
              if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                  .from('avatars')
                  .getPublicUrl(fileName);
                
                console.log('Successfully copied avatar to linktree folder:', publicUrl);
                avatarToSync = publicUrl;
                setImage(publicUrl);
              } else {
                console.log('Failed to copy avatar, using original:', uploadError);
                avatarToSync = mainProfile.image;
                setImage(mainProfile.image);
              }
            } catch (copyError) {
              console.log('Error copying avatar, using original:', copyError);
              avatarToSync = mainProfile.image;
              setImage(mainProfile.image);
            }
          }
        } else {
          setImage('');
        }
        
        // Update the linktree_avatar in database if we have a new avatar
        if (avatarToSync && address) {
          try {
            // First check if user exists, if not create them
            const { data: existingUser, error: checkError } = await supabase
              .from('usernames')
              .select('id')
              .eq('address', address.toLowerCase().trim())
              .maybeSingle();
              
            if (checkError) {
              console.error('Error checking user existence:', checkError);
              // Continue without database save
            } else if (!existingUser) {
              console.log('User not found in usernames table, creating new entry');
              // Create new user entry
              const { error: insertError } = await supabase
                .from('usernames')
                .insert({
                  address: address.toLowerCase().trim(),
                  username: mainProfile.username || 'demouser', // Use main app username
                  linktree_avatar: avatarToSync,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                
              if (insertError) {
                console.error('Error creating user:', insertError);
                // Continue without database save
              } else {
                console.log('New user created with avatar and username:', mainProfile.username);
              }
            } else {
              // Update existing user
              const { error } = await supabase
                .from('usernames')
                .update({ 
                  linktree_avatar: avatarToSync,
                  username: mainProfile.username || 'demouser' // Always update username
                })
                .eq('address', address.toLowerCase().trim());
                
              if (error) {
                // Error saving avatar to database
                // Don't throw error, just continue
              } else {
                // Avatar and username saved to database successfully
              }
            }
          } catch {
            // Database operation failed
            // Continue without database save
          }
        }
        
        // Load Linktree-specific fields from database
        if (mainProfile) {
          // Load saved Linktree data from database (preserve defaults if database values are null/empty)
          setLinktreeUsername(mainProfile.linktree_username || linktree_username);
          setLinktreeBio(mainProfile.linktree_bio || linktree_bio);
          setLinktreeAvatar(mainProfile.linktree_avatar || linktree_avatar);
          
          // Linktree data loaded from database
        }
        
        // Don't auto-save to prevent infinite loops
      }
    } catch {
      // Error syncing from main app
      throw new Error('Failed to sync from main app');
    }
  };

  // Update Linktree profile with new fields
  const updateLinktreeProfile = async (newUsername: string, newBio: string, newAvatar?: string) => {
    try {
      // Update local state only
      setLinktreeUsername(newUsername);
      setLinktreeBio(newBio);
      
      if (newAvatar) {
        setLinktreeAvatar(newAvatar);
      }
      
      // Don't save to database here - only update local state
      // Database will be updated when user clicks "Quick Save" or "Save & Share"
    } catch (error) {
      console.error('Error updating Linktree profile:', error);
    }
  };

  // Save Linktree profile to database
  const saveLinktreeProfile = async () => {
    try {
      if (!address) {
        // No address available, skipping save
        return;
      }
      
      // Attempting to save with data
      
      // Use UPDATE instead of UPSERT to avoid conflicts
      const { error } = await supabase
        .from('usernames')
        .update({
          linktree_username: linktree_username,
          linktree_bio: linktree_bio,
          linktree_avatar: linktree_avatar,
          updated_at: new Date().toISOString()
        })
        .eq('address', address.toLowerCase().trim());
      
      if (error) {
        throw error;
      } else {
        // Linktree profile saved to database successfully
      }
    } catch (error) {
      throw error;
    }
  };

  // Handle avatar change with storage cleanup
  const changeAvatar = async (newAvatarFile: File): Promise<string> => {
    try {
      console.log('🔄 DEBUG: Starting avatar change process...');
      console.log('🔄 DEBUG: Address:', address);
      console.log('🔄 DEBUG: File details:', {
        name: newAvatarFile.name,
        size: newAvatarFile.size,
        type: newAvatarFile.type
      });
      
      if (!address) throw new Error('No address available');
      
      // Delete old avatar from storage if it exists
      if (linktree_avatar) {
        console.log('🔄 DEBUG: Current linktree avatar:', linktree_avatar);
        try {
          // Extract the actual file path from the URL
          // Supabase URLs look like: https://xxx.supabase.co/storage/v1/object/public/avatars/linktreeavatars/filename.jpg
          // or https://xxx.supabase.co/storage/v1/object/public/avatars/mainavatars/filename.jpg (fallback)
          const urlParts = linktree_avatar.split('/');
          let oldAvatarPath = '';
          
          // Check for linktreeavatars first, then mainavatars as fallback
          const linktreeIndex = urlParts.indexOf('linktreeavatars');
          const mainavatarsIndex = urlParts.indexOf('mainavatars');
          
          if (linktreeIndex > 0) {
            const oldFileName = urlParts[linktreeIndex + 1];
            oldAvatarPath = `linktreeavatars/${oldFileName}`;
          } else if (mainavatarsIndex > 0) {
            const oldFileName = urlParts[mainavatarsIndex + 1];
            oldAvatarPath = `mainavatars/${oldFileName}`;
          }
          
          if (oldAvatarPath) {
            console.log('🔄 DEBUG: Attempting to delete old avatar:', oldAvatarPath);
            const { error: deleteError } = await supabase.storage
              .from('avatars')
              .remove([oldAvatarPath]);
            
            if (deleteError) {
              console.log('❌ DEBUG: Error deleting old avatar:', deleteError);
            } else {
              console.log('✅ DEBUG: Old avatar removed from storage successfully');
            }
          } else {
            console.log('⚠️ DEBUG: Could not parse old avatar URL path');
          }
        } catch (deleteError) {
          console.log('⚠️ DEBUG: Error deleting old avatar (may not exist):', deleteError);
        }
      } else {
        console.log('🔄 DEBUG: No existing linktree avatar to delete');
      }
      
      // Upload new avatar with auto-replace (same filename = auto-replace)
      // Use linktreeavatars folder for Linktree avatars (no underscore in storage)
      const fileExt = newAvatarFile.name.split('.').pop() || 'jpg';
      let fileName = `linktreeavatars/${address.toLowerCase()}.${fileExt}`;
      
      console.log('🔄 DEBUG: Uploading new avatar to:', fileName);
      
      // Try to upload to linktreeavatars folder first
      let uploadError = null;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, newAvatarFile, {
          cacheControl: '3600',
          upsert: true // This will automatically replace existing files
        });
      
      uploadError = error;
      
      // If linktree_avatars folder doesn't exist, try mainavatars as fallback
      if (uploadError && uploadError.message.includes('not found')) {
        console.log('🔄 DEBUG: linktree_avatars folder not found, trying mainavatars as fallback...');
        fileName = `mainavatars/${address.toLowerCase()}.${fileExt}`;
        
        const { error: fallbackError } = await supabase.storage
          .from('avatars')
          .upload(fileName, newAvatarFile, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (fallbackError) {
          console.error('❌ DEBUG: Fallback upload also failed:', fallbackError);
          throw fallbackError;
        }
        
        console.log('✅ DEBUG: File uploaded successfully to fallback path:', fileName);
      } else if (uploadError) {
        console.error('❌ DEBUG: Upload error:', uploadError);
        throw uploadError;
      } else {
        console.log('✅ DEBUG: File uploaded successfully to:', fileName);
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      console.log('🔄 DEBUG: Public URL generated:', publicUrl);
      
      // Update state and database
      console.log('🔄 DEBUG: Updating local state...');
      setLinktreeAvatar(publicUrl);
      
      // Force a re-render by updating the main image state as well
      setImage(publicUrl);
      
      console.log('🔄 DEBUG: Calling updateLinktreeProfile...');
      await updateLinktreeProfile(linktree_username, linktree_bio, publicUrl);
      
      // Immediately save to database to persist the avatar
      console.log('🔄 DEBUG: Saving to database...');
      try {
        const { error } = await supabase
          .from('usernames')
          .update({
            linktree_avatar: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('address', address.toLowerCase().trim());
        
        if (error) {
          console.error('❌ DEBUG: Error saving avatar to database:', error);
        } else {
          console.log('✅ DEBUG: Avatar saved to database successfully');
          
          // Force refresh profile data from database to ensure consistency
          console.log('🔄 DEBUG: Refreshing profile data from database...');
          try {
            const mainProfile = await fetchMainAppProfile();
            if (mainProfile && mainProfile.linktree_avatar) {
              console.log('✅ DEBUG: Refreshing profile data from database:', mainProfile.linktree_avatar);
              setLinktreeAvatar(mainProfile.linktree_avatar);
            } else {
              console.log('⚠️ DEBUG: No profile data returned from fetchMainAppProfile');
            }
          } catch (refreshError) {
            console.error('❌ DEBUG: Error refreshing profile data:', refreshError);
          }
        }
      } catch (dbError) {
        console.error('❌ DEBUG: Error saving avatar to database:', dbError);
      }
      
             console.log('🎉 DEBUG: Avatar changed successfully:', publicUrl);
       
       // Dispatch custom event to notify other components about Linktree avatar update
       window.dispatchEvent(new CustomEvent('linktree-avatar-updated'));
       
       // Force a final state update to ensure UI re-renders
       setTimeout(() => {
         setLinktreeAvatar(publicUrl);
         setImage(publicUrl);
         console.log('🔄 DEBUG: Final state update triggered for UI refresh');
       }, 100);
      
      return publicUrl;
    } catch (error) {
      console.error('❌ DEBUG: Error changing avatar:', error);
      console.error('❌ DEBUG: Error type:', typeof error);
      console.error('❌ DEBUG: Error message:', error && typeof error === 'object' && 'message' in error ? (error as Error).message : 'No message available');
      throw error;
    }
  };

  // Manual save function for user control
  const saveLinktreeData = () => {
    const currentData = {
      id,
      name,
      username,
      bio,
      image,
      linktree_avatar,
      linktree_username,
      linktree_bio,
      links: allLinks,
      theme,
      theme_id,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem('iryshare_linktree_data', JSON.stringify(currentData));
    console.log('Linktree data saved manually');
  };

  // Auto-save is handled manually to prevent infinite loops
  // useEffect(() => {
  //   saveUserData();
  // }, [name, bio, image, theme_id]);

  // Force sync username from main app (useful for debugging)
  const forceUsernameSync = async () => {
    if (!address) {
      console.log('No address available for username sync');
      return;
    }
    
    try {
      console.log('Force syncing username from main app...');
      const mainProfile = await fetchMainAppProfile();
      if (mainProfile && mainProfile.username) {
        console.log('Force updating username from main app:', mainProfile.username);
        setUsername(mainProfile.username);
        
        // Also update localStorage to persist the change
        const currentData = {
          id,
          name,
          bio,
          image,
          linktree_avatar,
          linktree_username,
          linktree_bio,
          theme,
          theme_id,
          links: allLinks,
          username: mainProfile.username
        };
        
        localStorage.setItem('iryshare_linktree_data', JSON.stringify(currentData));
        console.log('Username force sync completed:', mainProfile.username);
      } else {
        console.log('No username found in main app profile');
      }
    } catch (error) {
      console.error('Error force syncing username:', error);
    }
  };

  // Computed property for unsaved changes
  const hasUnsavedChanges = linktree_username !== '' || linktree_bio !== '' || linktree_avatar !== '';

  // Debug function to check database directly
  const debugDatabaseCheck = async () => {
    if (!address) {
      console.log('❌ No address available for database check');
      return;
    }
    
    try {
      console.log('🔍 Debug: Checking database directly...');
      console.log('🔍 Address being checked:', address);
      console.log('🔍 Address (lowercase):', address.toLowerCase().trim());
      
      // Check what's in the usernames table
      const { data: allUsers, error: allUsersError } = await supabase
        .from('usernames')
        .select('*')
        .limit(10);
      
      if (allUsersError) {
        console.log('❌ Error fetching all users:', allUsersError);
      } else {
        console.log('🔍 All users in usernames table:', allUsers);
      }
      
      // Check specific user
      const { data: specificUser, error: specificError } = await supabase
        .from('usernames')
        .select('*')
        .eq('address', address.toLowerCase().trim());
      
      if (specificError) {
        console.log('❌ Error fetching specific user:', specificError);
      } else {
        console.log('🔍 Specific user data:', specificUser);
      }
      
      // Check if user exists in usernames table
      await supabase
        .from('usernames')
        .select('id')
        .eq('address', address.toLowerCase().trim())
        .maybeSingle();
      
    } catch (error) {
      console.error('❌ Error in debug database check:', error);
    }
  };

  const contextValue: LinktreeContextType = {
    // State
    id,
    theme_id,
    name,
    email,
    image,
    bio,
    username,
    theme,
    colors: COLORS,
    allLinks,
    isMobile,
    updatedLinkId,
    addLinkOverlay,
    isPreviewOverlay,
    isLoading: false, // isLoading state was removed, so it's always false
    
    // New Linktree-specific fields
    linktree_username,
    linktree_bio,
    linktree_avatar,
    hasUnsavedChanges,

    // Actions
    hidePageOverflow,
    allLowerCaseNoCaps,
    getUser,
    updateUserImage,
    updateLinkImage,
    deleteLink,
    getUserTheme,
    updateUserDetails,
    updateTheme,
    getAllLinks,
    addLink,
    updateLink,
    reorderLinks,
    moveLink,
    syncFromMainApp,
    updateLinktreeProfile,
    saveLinktreeProfile,
    changeAvatar,
    saveLinktreeData,
    forceUsernameSync,
    debugDatabaseCheck,

    // Setters
    setUpdatedLinkId,
    setAddLinkOverlay,
    setIsPreviewOverlay,
    setIsMobile,

    // Linktree setters
    setLinktreeUsername,
    setLinktreeBio,
    setLinktreeAvatar
  };

  return (
    <LinktreeContext.Provider value={contextValue}>
      {children}
    </LinktreeContext.Provider>
  );
}

export function useLinktreeStore() {
  const context = useContext(LinktreeContext);
  if (context === undefined) {
    throw new Error('useLinktreeStore must be used within a LinktreeProvider');
  }
  return context;
}