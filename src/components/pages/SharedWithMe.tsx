import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Search, RefreshCw, Bell } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { FileCard } from '../ui/file-card';
import { FilePreview } from '../ui/file-preview';
import { downloadAndDecryptFromIrys } from '../../utils/aesIrys';

interface FileData {
  id: string;
  owner_address: string;
  file_url: string;
  file_name: string;
  tags: string[];
  is_encrypted: boolean;
  file_size_bytes: number;
  is_public: boolean;
  profile_visible: boolean;
  file_type: string;
  created_at: string;
  updated_at: string;
  is_owned?: boolean;
  recipient_address?: string;
  recipient_username?: string;
  shared_at?: string;
}

interface SharedWithMeProps {
  address: string;
  isConnected: boolean;
  usernameSaved: boolean;
  refreshTrigger?: number;
}

export function SharedWithMe({ address, isConnected, usernameSaved, refreshTrigger = 0 }: SharedWithMeProps) {
  const [sharedFiles, setSharedFiles] = useState<FileData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [newFilesCount, setNewFilesCount] = useState(0);
  const [viewedFiles, setViewedFiles] = useState<Set<string>>(new Set());
  const [realTimeStatus, setRealTimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  // Load viewed files from localStorage on mount
  useEffect(() => {
    if (address) {
      const storedViewedFiles = localStorage.getItem(`viewedFiles_${address.toLowerCase()}`);
      if (storedViewedFiles) {
        try {
          const parsedFiles = JSON.parse(storedViewedFiles);
          setViewedFiles(new Set(parsedFiles));
        } catch (error) {
          console.error('Error parsing viewed files from localStorage:', error);
        }
      }
    }
  }, [address]);

  // Save viewed files to localStorage whenever they change
  useEffect(() => {
    if (address && viewedFiles.size > 0) {
      localStorage.setItem(`viewedFiles_${address.toLowerCase()}`, JSON.stringify([...viewedFiles]));
    }
  }, [viewedFiles, address]);
  
  // Preview state
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  
  // Menu state
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);

  // Fetch shared files
  const fetchFiles = async () => {
    if (!address || !isConnected || !usernameSaved) return;
    
    setLoading(true);
    console.log('🔄 Fetching SharedWithMe for address:', address);
    const normalizedAddress = address.toLowerCase().trim();
    
    const { data, error } = await supabase.rpc('get_user_files', { user_address: normalizedAddress });
    
    if (error) {
      console.error('❌ Error fetching shared files:', error);
      setLoading(false);
      return;
    }
    
    const sharedFiles = data?.filter((file: FileData) => !file.is_owned) || [];
    // Sort by newest first (using shared_at if available, otherwise created_at)
    sharedFiles.sort((a: FileData, b: FileData) => {
      const dateA = a.shared_at ? new Date(a.shared_at) : new Date(a.created_at);
      const dateB = b.shared_at ? new Date(b.shared_at) : new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
    console.log('📁 Found', sharedFiles.length, 'shared files');
    setSharedFiles(sharedFiles);
    
    // Check for new files (shared in the last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const newFiles = sharedFiles.filter((file: FileData) => {
      const fileDate = file.shared_at ? new Date(file.shared_at) : new Date(file.created_at);
      return fileDate > oneDayAgo && !viewedFiles.has(file.id);
    });
    setNewFilesCount(newFiles.length);
    
    console.log('📊 New files count:', newFiles.length, 'Total viewed files:', viewedFiles.size);
    
    setLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    fetchFiles();
  }, [address, isConnected, usernameSaved, refreshTrigger, viewedFiles]);

  // Real-time subscription for shared files
  useEffect(() => {
    if (!address || !isConnected || !usernameSaved) return;

    console.log('🔔 Setting up real-time subscription for SharedWithMe');
    setRealTimeStatus('connecting');
    const normalizedAddress = address.toLowerCase().trim();

    // Subscribe to changes in the file_shares table for this user
    const sharesSubscription = supabase
      .channel('shared-files-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'file_shares',
          filter: `recipient_address=eq.${normalizedAddress}`
        },
        (payload) => {
          console.log('📡 Real-time update received for shared files:', payload);
          // Refetch files when there's a change
          fetchFiles();
        }
      )
      .subscribe((status) => {
        console.log('📡 Shares subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealTimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealTimeStatus('disconnected');
        }
      });

    // Also subscribe to changes in the files table (in case files are updated)
    const filesSubscription = supabase
      .channel('shared-files-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files'
        },
        (payload) => {
          console.log('📡 Real-time update received for files table:', payload);
          // Refetch files when there's a change
          fetchFiles();
        }
      )
      .subscribe((status) => {
        console.log('📡 Files subscription status:', status);
      });

    return () => {
      console.log('🔕 Cleaning up real-time subscriptions for SharedWithMe');
      setRealTimeStatus('disconnected');
      supabase.removeChannel(sharesSubscription);
      supabase.removeChannel(filesSubscription);
    };
  }, [address, isConnected, usernameSaved]);

  // File type helpers
  const isImage = (file: FileData) => {
    const name = file?.file_name?.toLowerCase() || '';
    return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || 
           name.endsWith('.gif') || name.endsWith('.bmp') || name.endsWith('.webp');
  };

  const isPDF = (file: FileData) => {
    const name = file?.file_name?.toLowerCase() || '';
    return name.endsWith('.pdf');
  };

  const isVideo = (file: FileData) => {
    const name = file?.file_name?.toLowerCase() || '';
    return name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov') || name.endsWith('.avi');
  };

  const isAudio = (file: FileData) => {
    const name = file?.file_name?.toLowerCase() || '';
    const type = file?.file_type?.toLowerCase() || '';
    return name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.flac') || 
           name.endsWith('.m4a') || name.endsWith('.aac') || name.endsWith('.webm') || name.endsWith('.opus') ||
           type.startsWith('audio/');
  };

  // Filter files
  const filteredFiles = sharedFiles.filter((file: FileData) => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = fileTypeFilter === 'all' || 
      (fileTypeFilter === 'images' && isImage(file)) ||
      (fileTypeFilter === 'documents' && isPDF(file)) ||
      (fileTypeFilter === 'videos' && isVideo(file)) ||
      (fileTypeFilter === 'audio' && isAudio(file)) ||
      (fileTypeFilter === 'encrypted' && file.is_encrypted);
    
    return matchesSearch && matchesType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fileTypeFilter, itemsPerPage]);

  const refreshFiles = async () => {
    await fetchFiles();
  };

  // Preview file function
  const handlePreview = (file: FileData) => {
    // Mark file as viewed and update notification count immediately
    const newViewedFiles = new Set([...viewedFiles, file.id]);
    setViewedFiles(newViewedFiles);
    
    // Update notification count immediately
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const newFiles = sharedFiles.filter((file: FileData) => {
      const fileDate = file.shared_at ? new Date(file.shared_at) : new Date(file.created_at);
      return fileDate > oneDayAgo && !newViewedFiles.has(file.id);
    });
    setNewFilesCount(newFiles.length);
    
    setPreviewFile(file);
  };

  const closePreview = () => {
    setPreviewFile(null);
    setShowShareMenu(false);
    setSelectedFile(null);
  };

  // Menu functions
  const handleMenuClick = (e: React.MouseEvent, file: FileData) => {
    e.stopPropagation();
    setSelectedFile(file);
    setShowShareMenu(!showShareMenu);
  };

  const handleMenuAction = (action: string, file: FileData) => {
    setShowShareMenu(false);
    setSelectedFile(null);
    
    switch (action) {
      case 'download':
        // Direct download without preview
        handleDirectDownload(file);
        break;
      case 'share':
        // For shared files, do nothing (button is disabled)
        break;
    }
  };

  // Direct download function
  const handleDirectDownload = async (file: FileData) => {
    try {
      console.log('📥 Starting direct download for:', file.file_name);
      
      let fileData: ArrayBuffer;
      const fileName = file.file_name;
      const fileType = file.file_type || 'application/octet-stream';
      
      if (file.is_encrypted) {
        // Decrypt and download encrypted file
        const decryptedData = await downloadAndDecryptFromIrys(file.file_url, address);
        fileData = decryptedData;
      } else {
        // Download public file directly
        const response = await fetch(file.file_url);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
        fileData = await response.arrayBuffer();
      }
      
      // Create blob and download
      const blob = new Blob([fileData], { type: fileType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      console.log('✅ Direct download completed:', fileName);
    } catch (error) {
      console.error('❌ Direct download error:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };



  // ESC key handler for closing preview
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePreview();
      }
    };

    if (previewFile) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [previewFile]);

  // Click outside handler for closing menu
  useEffect(() => {
    const handleClickOutside = () => {
      if (showShareMenu) {
        setShowShareMenu(false);
        setSelectedFile(null);
      }
    };

    if (showShareMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showShareMenu]);

  if (!isConnected || !usernameSaved) {
    return (
      <div className="min-h-screen bg-[#18191a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-white/80 text-lg font-medium">Please connect your wallet and set a username to view shared files.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#18191a] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em'}}>INCOMING FILES</h1>
                <p className="text-white/60 text-sm">Files shared with you by other users</p>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    realTimeStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 
                    realTimeStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                  }`}
                />
                <span className={`text-xs font-medium ${
                  realTimeStatus === 'connected' ? 'text-emerald-400' : 
                  realTimeStatus === 'connecting' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {realTimeStatus === 'connected' ? 'Live' : 
                   realTimeStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                </span>
              </div>
              {newFilesCount > 0 && (
                <div className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  <Bell size={12} />
                  <span>{newFilesCount} New Files</span>
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshFiles}
              disabled={loading}
              className="flex items-center gap-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
              <input
                type="text"
                placeholder="Search shared files by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all"
              />
            </div>
            <div className="flex-shrink-0">
              <select
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
                className="px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="all" className="bg-[#1a1a1a] text-white">All Types</option>
                <option value="images" className="bg-[#1a1a1a] text-white">Images</option>
                <option value="documents" className="bg-[#1a1a1a] text-white">Documents</option>
                <option value="videos" className="bg-[#1a1a1a] text-white">Videos</option>
                <option value="audio" className="bg-[#1a1a1a] text-white">Audio</option>
                <option value="encrypted" className="bg-[#1a1a1a] text-white">Encrypted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {filteredFiles.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <span className="text-white/60 text-sm">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredFiles.length)} of {filteredFiles.length} files
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-sm">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-3 py-1 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all appearance-none cursor-pointer text-sm"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2rem'
                    }}
                  >
                    <option value={5} className="bg-[#1a1a1a] text-white">5</option>
                    <option value={10} className="bg-[#1a1a1a] text-white">10</option>
                    <option value={15} className="bg-[#1a1a1a] text-white">15</option>
                    <option value={20} className="bg-[#1a1a1a] text-white">20</option>
                  </select>
                  <span className="text-white/60 text-sm">per page</span>
                </div>
              </div>
              
              {/* Page Navigation */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`${
                            currentPage === pageNum 
                              ? 'bg-[#67FFD4] text-black hover:bg-[#8AFFE4]' 
                              : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                          } min-w-[40px]`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Files Grid */}
        {loading ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#67FFD4] mx-auto"></div>
            <p className="text-white/80 mt-4 text-lg font-medium">Loading shared files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-white/80 text-lg font-medium">
              {sharedFiles.length === 0 ? 'No files shared with you yet.' : 'No files match your search.'}
            </p>
            <p className="text-white/40 text-sm mt-2">
              {sharedFiles.length === 0 ? 'Files shared with you will appear here!' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedFiles.map(file => {
              const isNew = new Date(file.shared_at || file.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000) && !viewedFiles.has(file.id);
              
              return (
                <FileCard
                  key={file.id}
                  file={file}
                  isNew={isNew}
                  onPreview={handlePreview}
                  onMenuAction={handleMenuAction}
                />
              );
            })}
          </div>
        )}



        {/* Unified File Preview */}
        <FilePreview
          file={previewFile}
          address={address}
          onClose={closePreview}
          onFileViewed={(fileId) => {
            // Mark file as viewed
            const newViewedFiles = new Set(viewedFiles);
            newViewedFiles.add(fileId);
            setViewedFiles(newViewedFiles);
            
            // Update localStorage
            localStorage.setItem(`viewedFiles_${address.toLowerCase()}`, JSON.stringify(Array.from(newViewedFiles)));
          }}
        />
      </div>
    </div>
  );
}