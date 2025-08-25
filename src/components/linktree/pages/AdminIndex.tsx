import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import AdminLayout from '../layouts/AdminLayout';
import AddLink from '../components/AddLink';
import LinkBox from '../components/LinkBox';
import DevicePreview from '../components/DevicePreview';
import { useLinktreeStore } from '../context/LinktreeContext';
import { getUserLinktreeLink } from '../../../utils/irysLinktreeStorage';

export default function AdminIndex() {
  const { address } = useAccount();
  const userStore = useLinktreeStore();
  const [shareUrl, setShareUrl] = useState<string>('');
  const [selectedInput, setSelectedInput] = useState({ id: 0, str: '' });
  const [showAddLink, setShowAddLink] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Update share URL based on existing random link or default to placeholder
  useEffect(() => {
    if (address) {
      const existingRandomLink = getUserLinktreeLink(address);
      if (existingRandomLink) {
        setShareUrl(`${window.location.origin}/u/${existingRandomLink}`);
      } else {
        setShareUrl('Generate your Linktree first to get your shareable link');
      }
    } else {
      setShareUrl('Connect wallet to see your link');
    }
  }, [address]);

  // Listen for localStorage changes to update the share URL when SaveShareButton creates a new link
  useEffect(() => {
    const handleStorageChange = () => {
      if (address) {
        const existingRandomLink = getUserLinktreeLink(address);
        if (existingRandomLink) {
          setShareUrl(`${window.location.origin}/u/${existingRandomLink}`);
        }
      }
    };

    // Listen for custom event from SaveShareButton
    window.addEventListener('linktreeUrlUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('linktreeUrlUpdated', handleStorageChange);
    };
  }, [address]);

  const copyShareUrl = async () => {
    // Check if shareUrl is a valid URL
    if (!shareUrl.startsWith('http')) {
      alert('Please generate your Linktree first by clicking "Save & Share"');
      return;
    }

    // Create the beautiful message to copy
    const beautifulMessage = `Visit my beautiful links at ${shareUrl} | Share your beautiful links on https://iryshare.vercel.app | #Iryshare @iryshare`;

    try {
      await navigator.clipboard.writeText(beautifulMessage);
      alert('📋 Beautiful message copied to clipboard!\n\n✨ You can now paste this anywhere you want to share your Linktree!');
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = beautifulMessage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('📋 Beautiful message copied to clipboard!\n\n✨ You can now paste this anywhere you want to share your Linktree!');
    }
  };

  const updatedInput = (e: { id: number; str: string }) => {
    setSelectedInput({ id: e.id, str: e.str });
  };

  const showAddLinkFunc = () => {
    if (userStore.isMobile) {
      userStore.setAddLinkOverlay(true);
    } else {
      setShowAddLink(true);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    // Add a slight delay to allow the drag image to be set
    setTimeout(() => {
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    try {
      await userStore.reorderLinks(draggedIndex, dropIndex);
      await userStore.getAllLinks();
    } catch (error) {
      console.error('Error reordering links:', error);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };



  return (
    <AdminLayout>
      <div id="AdminPage" className="flex min-h-screen pb-4 bg-black">
        <div className="lg:w-[calc(100%-500px)] md:w-[calc(100%-330px)] w-full md:pt-20 pt-14">
          <div className={`ml-8 ${userStore.isMobile ? 'pb-32' : 'pb-24'}`}>
            {/* Share Button */}
            <div className="mb-8 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <h3 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}>
                SHARE YOUR LINKTREE
              </h3>
              <div className="flex items-center space-x-3">
                <input
                  value={shareUrl}
                  readOnly
                  className={`flex-1 px-4 py-3 text-sm border rounded-xl bg-white/5 text-white transition-colors ${
                    shareUrl.startsWith('http') ? 'border-[#67FFD4]' : 'border-white/20'
                  }`}
                  placeholder="Your shareable link will appear here"
                  style={{ fontFamily: 'Irys2' }}
                />
                <button
                  onClick={copyShareUrl}
                  disabled={!shareUrl.startsWith('http')}
                  className={`px-6 py-3 text-sm rounded-xl transition-all font-medium ${
                    shareUrl.startsWith('http')
                      ? 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 hover:from-gray-500 hover:via-gray-600 hover:to-gray-700 shadow-lg hover:shadow-xl text-white border border-white/10 hover:border-white/20 transform hover:scale-105 hover:-translate-y-1'
                      : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/20'
                  }`}
                  style={{ fontFamily: 'Irys2' }}
                >
                  COPY
                </button>
                <button
                  onClick={() => {
                    // Check if we have a valid share URL
                    if (shareUrl.startsWith('http')) {
                      // Open ShareModal directly with current URL (this always works)
                      window.dispatchEvent(new CustomEvent('openShareModal', { 
                        detail: { shareUrl: shareUrl } 
                      }));
                    } else {
                      alert('Please generate your Linktree first by clicking "Save & Share"');
                    }
                  }}
                  disabled={!shareUrl.startsWith('http')}
                  className={`px-6 py-3 text-sm rounded-xl transition-all font-medium ${
                    shareUrl.startsWith('http')
                      ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                      : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/20'
                  }`}
                  style={{ fontFamily: 'Irys2' }}
                >
                  SHARE
                </button>
              </div>
              <p className="text-sm text-white/60 mt-3" style={{ fontFamily: 'Irys2' }}>
                {shareUrl.startsWith('http')
                  ? 'Share this link with others to show your Linktree profile'
                  : 'Click "Save & Share" to generate your unique Linktree link'
                }
              </p>
            </div>

            <button
              onClick={showAddLinkFunc}
              className="flex items-center justify-center w-full py-4 rounded-xl text-white font-semibold bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/20 hover:border-white/40 mb-8"
              style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}
            >
              {!userStore.isMobile && (
                <svg className="mr-3 w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-lg">ADD NEW LINK</span>
            </button>

            {!userStore.isMobile && showAddLink && (
              <AddLink
                onClose={() => setShowAddLink(false)}
                className="mb-8"
                onLinkAdded={() => userStore.getAllLinks()}
              />
            )}

            {userStore.allLinks.map((link, index) => (
              <div 
                key={link.id || index} 
                className={`mb-6 transition-all duration-200 ${
                  dragOverIndex === index ? 'transform scale-105 border-2 border-[#67FFD4] border-dashed' : ''
                } ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
                draggable={!userStore.isMobile}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="relative group">
                  {!userStore.isMobile && (
                    <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <svg className="w-5 h-5 text-white/40" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 13a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                        <circle cx="7" cy="7" r="1"/>
                        <circle cx="7" cy="13" r="1"/>
                        <circle cx="13" cy="7" r="1"/>
                        <circle cx="13" cy="13" r="1"/>
                      </svg>
                    </div>
                  )}
                  <LinkBox
                    link={link}
                    selectedId={selectedInput.id}
                    selectedStr={selectedInput.str}
                    onUpdatedInput={updatedInput}
                    className=""
                    onLinkUpdated={() => userStore.getAllLinks()}
                  />
                </div>
              </div>
            ))}

          </div>
        </div>

        <DevicePreview />

      </div>

    </AdminLayout>
  );
}