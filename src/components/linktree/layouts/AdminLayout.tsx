import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useLinktreeStore } from '../context/LinktreeContext';
import InAppPreview from '../components/InAppPreview';
import { uploadLinktreeToIrys } from '../../../utils/irysLinktreeStorage';
import { ProfileWidget } from '../../layout/ProfileWidget';
import { supabase } from '../../../utils/supabase';
import { BackToTop } from '../../ui/back-to-top';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { address } = useAccount();
  const userStore = useLinktreeStore();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check connection and username status
  useEffect(() => {
    if (address) {
      setIsConnected(true);
      // Check if user has a username
      const checkUsername = async () => {
        try {
          const { data } = await supabase
            .from('usernames')
            .select('username')
            .eq('address', address.toLowerCase())
            .single();
          setUsernameSaved(!!data?.username);
        } catch {
          setUsernameSaved(false);
        }
      };
      checkUsername();
    } else {
      setIsConnected(false);
      setUsernameSaved(false);
    }
  }, [address]);

  // Profile picture feedback state
  const [profileUpdateStatus, setProfileUpdateStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');
  const [profileUpdateMessage, setProfileUpdateMessage] = useState('');

  // Profile update functions to expose to children
  const updateProfileStatus = (status: 'idle' | 'updating' | 'success' | 'error', message: string) => {
    setProfileUpdateStatus(status);
    setProfileUpdateMessage(message);
    
    // Auto-hide success/error messages after 3 seconds
    if (status === 'success' || status === 'error') {
      setTimeout(() => {
        setProfileUpdateStatus('idle');
        setProfileUpdateMessage('');
      }, 3000);
    }
  };

  // Expose functions to children via window events
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      const { status, message } = event.detail;
      updateProfileStatus(status, message);
    };

    const handleQuickSave = async () => {
      console.log('Quick Save triggered from header');
      try {
        updateProfileStatus('updating', 'Saving changes locally...');
        
        const currentData = {
          id: userStore.id,
          name: userStore.name || userStore.username || '',
          bio: userStore.bio || 'Welcome to my Linktree on Iryshare!',
          image: userStore.image || '',
          theme: userStore.theme || { id: 1, color: 'bg-gradient-to-b from-sky-100 via-blue-50 to-white', text: 'text-gray-800', name: 'Air Blue' },
          links: userStore.allLinks || [],
          username: userStore.username || '',
          theme_id: userStore.theme_id || 1
        };

        // Save to localStorage only (no MetaMask, no Irys)
        localStorage.setItem('iryshare_linktree_data', JSON.stringify(currentData));
        
        // Update profile status to success
        updateProfileStatus('success', 'Changes saved locally! Use Save & Publish to publish to Irys.');
        
        console.log('Quick save completed - data saved to localStorage');
      } catch (error) {
        console.error('Quick save failed:', error);
        updateProfileStatus('error', 'Quick save failed. Please try again.');
      }
    };

    const handleSaveAndPublish = async () => {
              console.log('Save & Publish triggered from header');
      try {
        updateProfileStatus('updating', 'Saving and preparing share link...');
        
        if (!address) {
          updateProfileStatus('error', 'Please connect your wallet to save');
          return;
        }

        const currentData = {
          id: userStore.id,
          name: userStore.name || userStore.username || '',
          bio: userStore.bio || 'Welcome to my Linktree on Iryshare!',
          image: userStore.image || '',
          theme: userStore.theme || { id: 1, color: 'bg-gradient-to-b from-sky-100 via-blue-50 to-white', text: 'text-gray-800', name: 'Air Blue' },
          links: userStore.allLinks || [],
          username: userStore.username || '',
          theme_id: userStore.theme_id || 1
        };

        // Save to localStorage first
        localStorage.setItem('iryshare_linktree_data', JSON.stringify(currentData));
        
        // Upload to Irys Network
        const result = await uploadLinktreeToIrys(address, currentData);
        
        if (result) {
          updateProfileStatus('success', 'Linktree published successfully!');
        } else {
          updateProfileStatus('error', 'Failed to publish. Please try again.');
        }
      } catch (error) {
        console.error('Save & Publish failed:', error);
        updateProfileStatus('error', 'Save & Publish failed. Please try again.');
      }
    };

    // Add event listeners
    window.addEventListener('profile-update', handleProfileUpdate as EventListener);
    window.addEventListener('quick-save', handleQuickSave);
    window.addEventListener('save-and-share', handleSaveAndPublish);

    // Cleanup
    return () => {
      window.removeEventListener('profile-update', handleProfileUpdate as EventListener);
      window.removeEventListener('quick-save', handleQuickSave);
      window.removeEventListener('save-and-share', handleSaveAndPublish);
    };
  }, [userStore, address]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 -ml-20">
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-white hover:bg-white/10 transition-all duration-200 hover:scale-105 group"
              >
                <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-[#67FFD4]/20 transition-colors">
                  <svg className="w-5 h-5 group-hover:text-[#67FFD4] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs text-white/60 uppercase tracking-wide" style={{ fontFamily: 'Irys1' }}>
                    Back to
                  </span>
                  <span className="text-lg font-bold text-white group-hover:text-[#67FFD4] transition-colors" style={{ fontFamily: 'IrysItalic', letterSpacing: '0.1em' }}>
                    IRYSHARE
                  </span>
                </div>
              </button>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
                  <NavLink 
                to="/linktree/admin"
                end
                    className={({ isActive }) => 
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#67FFD4] text-black'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`
                }
                style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}
              >
                DASHBOARD
                  </NavLink>
              <NavLink
                to="/linktree/admin/apperance"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#67FFD4] text-black'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`
                }
                style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}
              >
                APPEARANCE
              </NavLink>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('triggerSaveAndShare'))}
                className="px-4 py-2 bg-[#67FFD4] hover:bg-[#67FFD4]/80 text-black rounded-lg transition-colors font-medium text-sm"
                style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}
              >
                SAVE & PUBLISH
              </button>

              {/* Profile Widget */}
              <ProfileWidget
                address={address || ''}
                isConnected={isConnected}
                usernameSaved={usernameSaved}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Status Messages */}
      {profileUpdateStatus !== 'idle' && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`px-6 py-3 rounded-lg shadow-lg ${
            profileUpdateStatus === 'success' 
              ? 'bg-[#67FFD4] text-black' 
              : profileUpdateStatus === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-white/20 text-white backdrop-blur-xl'
          }`}>
            <p className="text-sm font-medium" style={{ fontFamily: 'Irys2' }}>
              {profileUpdateMessage}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Preview Modal */}
      <InAppPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}