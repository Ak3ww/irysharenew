import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../../utils/supabase';

export function Notifications() {
  const { address, isConnected } = useAccount();
  
  // Notification states
  const [hasNewSharedFiles, setHasNewSharedFiles] = useState(false);
  const [lastSharedFilesCount, setLastSharedFilesCount] = useState(0);
  const [newSharedFilesDetails, setNewSharedFilesDetails] = useState<any[]>([]);
  const [hasNewLikes, setHasNewLikes] = useState(false);
  const [hasNewComments, setHasNewComments] = useState(false);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [sharedWithMe, setSharedWithMe] = useState<any[]>([]);

  // Fetch shared files for notifications
  useEffect(() => {
    if (!address) return;
    
    const fetchSharedFiles = async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_shared_files', { 
          user_address: address.toLowerCase().trim() 
        });
        
        if (error) {
          console.error('Error fetching shared files:', error);
          return;
        }
        
        const newFiles = data || [];
        setSharedWithMe(newFiles);
        
        // Check if we have new shared files
        if (newFiles.length > lastSharedFilesCount) {
          setHasNewSharedFiles(true);
          // Store details of new files
          const newFilesDetails = newFiles.slice(0, newFiles.length - lastSharedFilesCount);
          setNewSharedFilesDetails(newFilesDetails);
          console.log('New shared files detected! Notification shown.', newFilesDetails.length, 'new files');
        }
        setLastSharedFilesCount(newFiles.length);
      } catch (error) {
        console.error('Error in shared files fetch:', error);
      }
    };
    
    fetchSharedFiles();
  }, [address, lastSharedFilesCount]);

  // File type helpers
  function isImage(file: any) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return (
      name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp') ||
      contentType.startsWith('image/')
    );
  }

  function isPDF(file: any) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return name.endsWith('.pdf') || name.endsWith('.txt') || name.endsWith('.doc') || name.endsWith('.docx') || 
           contentType === 'application/pdf' || contentType === 'text/plain' || contentType.startsWith('application/vnd.openxmlformats');
  }

  function isVideo(file: any) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return (
      name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.ogg') ||
      contentType.startsWith('video/')
    );
  }

  function isAudio(file: any) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return (
      name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') ||
      contentType.startsWith('audio/')
    );
  }

  function getTagValue(tags: any, tagName: string) {
    if (!Array.isArray(tags)) return '';
    const tag = tags.find((t: any) => t.name === tagName);
    return tag ? tag.value : '';
  }

  const handleNotificationClick = () => {
    // Clear the notification count but keep the notification visible
    setNewSharedFilesDetails([]);
    setTotalNotifications(0);
    console.log('Notification clicked - cleared count');
  };

  return (
    <div className="flex-1 bg-black">
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl text-white" style={{ fontFamily: 'Irys2' }}>NOTIFICATIONS</h1>
        </div>

        {/* Notifications Section */}
        <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-6">
          <h2 className="text-2xl text-white mb-6" style={{ fontFamily: 'Irys2' }}>ALL NOTIFICATIONS</h2>
          
          {/* Notification Status */}
          <div className="mb-6 p-4 bg-[#222] rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium" style={{ fontFamily: 'Irys2' }}>Notification Status</h3>
                <p className="text-[#67FFD4] text-sm">
                  {(hasNewSharedFiles || hasNewLikes || hasNewComments) ? 'You have new notifications!' : 'All caught up!'}
                </p>
              </div>
              {(hasNewSharedFiles || hasNewLikes || hasNewComments) && (
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {hasNewSharedFiles ? newSharedFilesDetails.length : totalNotifications || 1}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Shared Files Notifications */}
          {hasNewSharedFiles && newSharedFilesDetails.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl text-white mb-4" style={{ fontFamily: 'Irys2' }}>
                📁 New Files Shared ({newSharedFilesDetails.length})
              </h3>
              <div className="space-y-3">
                {newSharedFilesDetails.map((file, index) => (
                  <div key={index} className="bg-[#222] rounded-lg p-4 border border-[#333]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#67FFD4] rounded flex items-center justify-center">
                        <span className="text-[#111] text-sm">
                          {isImage(file) ? '🖼️' : isPDF(file) ? '📄' : isVideo(file) ? '🎬' : isAudio(file) ? '🎵' : '📁'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate" style={{ fontFamily: 'Irys2' }}>
                          {file.file_name}
                        </div>
                        <div className="text-[#67FFD4] text-xs">
                          {file.file_size_bytes ? `${(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {new Date(file.created_at).toLocaleString()}
                        </div>
                      </div>
                      {file.is_encrypted && (
                        <span className="text-[#67FFD4] text-sm" title="Encrypted file">🔒</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleNotificationClick}
                className="mt-4 bg-[#67FFD4] text-[#111] font-bold py-2 px-4 rounded-lg hover:bg-[#8AFFE4] transition-colors"
                style={{ fontFamily: 'Irys2' }}
              >
                Mark as Read
              </button>
            </div>
          )}

          {/* Future: Likes Notifications */}
          {hasNewLikes && (
            <div className="mb-6">
              <h3 className="text-xl text-white mb-4" style={{ fontFamily: 'Irys2' }}>
                ❤️ New Likes
              </h3>
              <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#67FFD4] rounded flex items-center justify-center">
                    <span className="text-[#111] text-sm">❤️</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium" style={{ fontFamily: 'Irys2' }}>
                      New likes on your files
                    </div>
                    <div className="text-[#67FFD4] text-xs">
                      Coming soon...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Future: Comments Notifications */}
          {hasNewComments && (
            <div className="mb-6">
              <h3 className="text-xl text-white mb-4" style={{ fontFamily: 'Irys2' }}>
                💬 New Comments
              </h3>
              <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#67FFD4] rounded flex items-center justify-center">
                    <span className="text-[#111] text-sm">💬</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium" style={{ fontFamily: 'Irys2' }}>
                      New comments on your files
                    </div>
                    <div className="text-[#67FFD4] text-xs">
                      Coming soon...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Notifications */}
          {!hasNewSharedFiles && !hasNewLikes && !hasNewComments && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#67FFD4] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#111] text-2xl">🔔</span>
              </div>
              <h3 className="text-white text-xl mb-2" style={{ fontFamily: 'Irys2' }}>
                All Caught Up!
              </h3>
              <p className="text-[#67FFD4] text-sm">
                You're all up to date with your notifications.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 