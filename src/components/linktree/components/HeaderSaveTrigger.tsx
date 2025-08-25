import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useLinktreeStore } from '../context/LinktreeContext';
import { uploadLinktreeToIrys } from '../../../utils/irysLinktreeStorage';
import { handleSaveSuccess } from '../../../utils/autoShare';
import ShareModal from './ShareModal';

export default function HeaderSaveTrigger() {
  const { address, isConnected } = useAccount();
  const userStore = useLinktreeStore();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');


  // Quick save function - saves to localStorage and database
  const handleQuickSave = async () => {
    try {
      console.log('Quick save triggered');
      
      // First save Linktree profile to database if there are changes
      if (userStore.linktree_username || userStore.linktree_bio || userStore.linktree_avatar) {
        await userStore.saveLinktreeProfile();
        console.log('Linktree profile saved to database');
      }
      
      // Save current Linktree data to localStorage for persistence
      const currentData = {
        id: userStore.id || '1',
        name: userStore.linktree_username || userStore.name || userStore.username,
        username: userStore.username,
        bio: userStore.linktree_bio || userStore.bio,
        image: userStore.linktree_avatar || userStore.image,
        links: userStore.allLinks || [],
        theme: userStore.theme || { id: 1, color: 'bg-gradient-to-b from-sky-100 via-blue-50 to-white', text: 'text-gray-800', name: 'Air Blue' },
        theme_id: userStore.theme_id || 1,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('iryshare_linktree_data', JSON.stringify(currentData));
      
      console.log('Quick save completed:', currentData);
      alert('Linktree profile saved successfully!');
    } catch (error) {
      console.error('Error in quick save:', error);
      alert('Error saving data. Please try again.');
    }
  };

  useEffect(() => {
    const handleSaveTrigger = async () => {
      try {
        console.log('Header Save & Publish triggered');
        
        // Check if address is available
        if (!address || !isConnected) {
          alert('Wallet not connected. Please connect your wallet first.');
          return;
        }
        
        // Get current Linktree data
        const linktreeData = {
          id: userStore.id || '1',
          name: userStore.linktree_username || userStore.name || userStore.username,
          username: userStore.username,
          bio: userStore.linktree_bio || userStore.bio,
          image: userStore.linktree_avatar || userStore.image,
          links: userStore.allLinks || [],
          theme: userStore.theme || { id: 1, color: 'bg-gradient-to-b from-sky-100 via-blue-50 to-white', text: 'text-gray-800', name: 'Air Blue' },
          theme_id: userStore.theme_id || 1
        };

        // Upload to Irys
        const result = await uploadLinktreeToIrys(address, linktreeData);
        
        if (result && result.randomLink) {
          // Store in localStorage for the Preview button
          localStorage.setItem('iryshare_linktree_link', result.shareUrl);
          
          // Save current Linktree data to localStorage for persistence
          const currentData = {
            id: userStore.id || '1',
            name: userStore.linktree_username || userStore.name || userStore.username,
            username: userStore.username,
            bio: userStore.linktree_bio || userStore.bio,
            image: userStore.linktree_avatar || userStore.image,
            links: userStore.allLinks || [],
            theme: userStore.theme || { id: 1, color: 'bg-gradient-to-b from-sky-100 via-blue-50 to-white', text: 'text-gray-800', name: 'Air Blue' },
            theme_id: userStore.theme_id || 1,
            lastSaved: new Date().toISOString()
          };
          localStorage.setItem('iryshare_linktree_data', JSON.stringify(currentData));
          
          // Show success toast instead of modal
          handleSaveSuccess(result.shareUrl);
          
          // Store share URL for dashboard share button
          setShareUrl(result.shareUrl);
          
          // Dispatch event to update dashboard
          window.dispatchEvent(new CustomEvent('linktreeUrlUpdated', { 
            detail: { link: result.shareUrl } 
          }));
        } else {
          alert('Failed to save Linktree. Please try again.');
        }
      } catch (error) {
        console.error('Error saving Linktree:', error);
        alert('Error saving Linktree. Please try again.');
      }
    };

    // Listen for the custom events from header
    window.addEventListener('triggerSaveAndShare', handleSaveTrigger);
    window.addEventListener('triggerQuickSave', handleQuickSave);
    
    return () => {
      window.removeEventListener('triggerSaveAndShare', handleSaveTrigger);
      window.removeEventListener('triggerQuickSave', handleQuickSave);
    };
  }, [userStore, address, isConnected]);

  // Function to open ShareModal for dashboard share button
  const openShareModal = () => {
    if (shareUrl) {
      setIsShareModalOpen(true);
    }
  };

  // Expose the openShareModal function globally for dashboard share button
  useEffect(() => {
    const globalWindow = window as typeof window & { openLinktreeShareModal?: () => void };
    globalWindow.openLinktreeShareModal = openShareModal;
    return () => {
      delete globalWindow.openLinktreeShareModal;
    };
  }, [shareUrl]);

  return (
    <>
      {/* This component doesn't render anything visible */}
      
      {/* Share Modal for Dashboard Share Button */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
      />
    </>
  );
}
