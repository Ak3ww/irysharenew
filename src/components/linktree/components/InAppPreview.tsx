import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'react-modal';
import { useLinktreeStore } from '../context/LinktreeContext';
import { detectSocialPlatform, getSocialLogo } from '../../../utils/socialDetection';

interface InAppPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

// Configure Modal for accessibility
Modal.setAppElement('#root');

export default function InAppPreview({ isOpen, onClose }: InAppPreviewProps) {
  const userStore = useLinktreeStore();
  const [isLoading, setIsLoading] = useState(true);

  // Professional device detection with viewport calculations
  const deviceConfig = useMemo(() => {
    const width = window.innerWidth;
    
    // Mobile and Tablet devices - completely disabled
    if (width <= 1024) {
      return {
        type: 'mobile',
        disabled: true
      };
    }
    
    // Desktop devices only - use phone frame preview modal
    return {
      type: 'desktop',
      disabled: false,
      modalStyle: {
        content: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          transform: 'translate(-50%, -50%)',
          border: 'none',
          background: 'white',
          borderRadius: '20px',
          padding: '0',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000
        }
      },
      headerHeight: '80px',
      buttonSize: 'text-lg px-6 py-3',
      textSize: 'text-lg'
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // For mobile/tablet, completely disable linktree
      if (deviceConfig.type === 'mobile' && deviceConfig.disabled) {
        onClose(); // Close the modal
        return;
      }
      
      // For desktop, show modal as usual
      setIsLoading(false);
    }
  }, [isOpen, deviceConfig, onClose]);

  const handleClose = () => {
    setIsLoading(true);
    onClose();
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleSaveAndShare = async () => {
    try {
      setIsLoading(true);
      // Trigger the save and share event that AdminLayout listens to
      window.dispatchEvent(new CustomEvent('triggerSaveAndShare'));
      // Close the preview after triggering save
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Save and share failed:', error);
      setIsLoading(false);
    }
  };

  // Render actual Linktree content for desktop preview
  const renderLinktreeContent = () => {
    const displayName = userStore.name || userStore.username || 'Demo User';
    const displayBio = userStore.bio || 'Welcome to my Linktree on Iryshare!';
    const displayImage = userStore.image || '/default-avatar.png';
    const displayLinks = userStore.allLinks || []; // Use allLinks instead of links
    const currentTheme = userStore.theme;

    return (
      <div className={`min-h-full ${currentTheme?.color || 'bg-gradient-to-b from-sky-100 via-blue-50 to-white'}`}>
        {/* Profile Section */}
        <div className="text-center py-8 px-6">
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-3 overflow-hidden border-2 border-white shadow-lg">
            <img 
              src={displayImage} 
              alt="Profile" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
            {displayName.toUpperCase()}
          </h1>
          {displayBio && (
            <p className="text-base mb-4 max-w-md mx-auto text-gray-600" style={{ fontFamily: 'Irys2' }}>
              {displayBio}
            </p>
          )}
        </div>

        {/* Links Section */}
        <div className="px-6 pb-8">
          <div className="space-y-3 max-w-md mx-auto">
            {displayLinks.length > 0 ? (
              displayLinks.map((link, index) => {
                const platform = detectSocialPlatform(link.url);
                const socialLogo = getSocialLogo(link.url);
                
                return (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-white/95 hover:bg-white border border-white/30 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm"
                  >
                    <div className="flex items-center space-x-3">
                      {socialLogo && (
                        <div className="w-6 h-6 flex-shrink-0">
                          <img 
                            src={socialLogo} 
                            alt={platform.name} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-base text-gray-900" style={{ 
                          fontFamily: 'Irys1',
                          letterSpacing: '0.05em'
                        }}>{link.name.toUpperCase()}</p>
                        {link.url && (
                          <p className="text-sm truncate text-gray-500" style={{ 
                            fontFamily: 'Irys2'
                          }}>
                            {link.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </p>
                        )}
                      </div>
                      <svg className="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                  NO LINKS YET
                </h3>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'Irys2' }}>
                  Add some links to your Linktree
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Only render modal for desktop devices
  if (deviceConfig.type === 'mobile' && deviceConfig.disabled) {
    return null; // Don't render modal for mobile/tablet
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      style={deviceConfig.modalStyle}
      closeTimeoutMS={200}
    >
      <div className="flex flex-col h-full">
        {/* Professional Header */}
        <div 
          className="flex items-center justify-between px-4 border-b border-gray-200 bg-white flex-shrink-0"
          style={{ height: deviceConfig.headerHeight }}
        >
          <div className="flex items-center space-x-3">
            <img 
              src="/iryshare_logo.svg" 
              alt="Iryshare" 
              className="w-6 h-6"
            />
            <div>
              <h3 className={`font-semibold text-gray-900 ${deviceConfig.textSize}`} style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                PREVIEW LINKTREE
              </h3>
              <p className={`text-gray-500 ${deviceConfig.textSize === 'text-sm' ? 'text-xs' : 'text-sm'}`} style={{ fontFamily: 'Irys2' }}>
                See how your page looks to visitors
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${deviceConfig.buttonSize}`}
              title="Refresh Preview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {/* Close Button */}
            <button
              onClick={handleSaveAndShare}
              className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${deviceConfig.buttonSize}`}
              title="Save & Publish"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 bg-gray-50 relative overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#67FFD4] mx-auto mb-4"></div>
                <p className="text-gray-500" style={{ fontFamily: 'Irys2' }}>Loading preview...</p>
              </div>
            </div>
          ) : (
            <div className="h-full w-full bg-white overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 transition-colors">
              <div className="max-w-2xl mx-auto touch-pan-y">
                {renderLinktreeContent()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
