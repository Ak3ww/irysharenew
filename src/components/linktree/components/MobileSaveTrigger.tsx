import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useLinktreeStore } from '../context/LinktreeContext';
import { uploadLinktreeToIrys } from '../../../utils/irysLinktreeStorage';

interface MobileSaveTriggerProps {
  onSaveComplete?: () => void;
  autoSave?: boolean;
}

export default function MobileSaveTrigger({ onSaveComplete, autoSave = false }: MobileSaveTriggerProps) {
  const { address } = useAccount();
  const userStore = useLinktreeStore();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Auto-save functionality (disabled by default since buttons are in header)
  useEffect(() => {
    if (!autoSave) return;

    const autoSaveInterval = setInterval(() => {
      if (userStore.allLinks.length > 0 || userStore.name || userStore.bio) {
        handleQuickSave();
      }
    }, 30000); // Auto-save every 30 seconds if there are changes

    return () => clearInterval(autoSaveInterval);
  }, [userStore.allLinks, userStore.name, userStore.bio, autoSave]);

  const handleQuickSave = async () => {
    if (isSaving || !address) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
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

      // Save to localStorage first for immediate feedback
      localStorage.setItem('iryshare_linktree_data', JSON.stringify(currentData));
      
      // Upload to Irys Network
      const result = await uploadLinktreeToIrys(address, currentData);
      
      if (result) {
        setSaveStatus('success');
        setLastSaved(new Date());
        
        // Show success feedback
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
        
        onSaveComplete?.();
      } else {
        setSaveStatus('error');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Quick save failed:', error);
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndShare = async () => {
    if (isSaving || !address) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
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
        setSaveStatus('success');
        setLastSaved(new Date());
        
        // Trigger share modal or navigation
        window.dispatchEvent(new CustomEvent('triggerSaveAndShare'));
        
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
        
        onSaveComplete?.();
      } else {
        setSaveStatus('error');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Save and share failed:', error);
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      {/* Status Indicator */}
      {saveStatus !== 'idle' && (
        <div className={`text-center py-2 px-3 rounded-lg text-sm font-medium ${
          saveStatus === 'saving' ? 'bg-blue-100 text-blue-800' :
          saveStatus === 'success' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {saveStatus === 'saving' && (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Saving...</span>
            </div>
          )}
          {saveStatus === 'success' && (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Saved successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>Save failed. Please try again.</span>
            </div>
          )}
        </div>
      )}

      {/* Last Saved Indicator */}
      {lastSaved && saveStatus === 'idle' && (
        <div className="text-center text-xs text-gray-500">
          Last saved: {lastSaved.toLocaleTimeString()}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={handleQuickSave}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
        >
          {isSaving ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Quick Save
            </>
          )}
        </button>

        <button
          onClick={handleSaveAndShare}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-[#67FFD4] hover:bg-[#5AFFB8] disabled:bg-gray-300 text-black font-semibold rounded-lg transition-colors"
        >
          {isSaving ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Save & Share
            </>
          )}
        </button>
      </div>
    </div>
  );
}
