import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { FileCard } from '../ui/file-card';
import { FilePreview } from '../ui/file-preview';
import { ShareModal } from '../ui/share-modal';
import { downloadAndDecryptFromIrys } from '../../utils/litIrys';

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

interface MyFilesProps {
  address: string;
  isConnected: boolean;
  usernameSaved: boolean;
  refreshTrigger?: number;
}

export function MyFiles({ address, isConnected, usernameSaved, refreshTrigger = 0 }: MyFilesProps) {
  const [myFiles, setMyFiles] = useState<FileData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [realTimeStatus, setRealTimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  // Preview state
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [showSharePanelOnOpen, setShowSharePanelOnOpen] = useState(false);
  const [shareModalFile, setShareModalFile] = useState<FileData | null>(null);

  // Fetch my files
  const fetchFiles = async () => {
    if (!address || !isConnected || !usernameSaved) return;
    
    setLoading(true);
    console.log('🔄 Fetching MyFiles for address:', address);
    const normalizedAddress = address.toLowerCase().trim();
    
    const { data, error } = await supabase.rpc('get_user_files', { user_address: normalizedAddress });
      
    if (error) {
      console.error('❌ Error fetching files:', error);
      setLoading(false);
      return;
    }
    
    const ownedFiles = data?.filter((file: FileData) => file.is_owned) || [];
    // Sort by newest first
    ownedFiles.sort((a: FileData, b: FileData) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    console.log('📁 Found', ownedFiles.length, 'owned files');
    setMyFiles(ownedFiles);
    setLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    fetchFiles();
  }, [address, isConnected, usernameSaved, refreshTrigger]);

  // Real-time subscription for new files
  useEffect(() => {
    if (!address || !isConnected || !usernameSaved) return;

    console.log('🔔 Setting up real-time subscription for MyFiles');
    setRealTimeStatus('connecting');
    const normalizedAddress = address.toLowerCase().trim();

    // Subscribe to changes in the files table for this user's files
    const filesSubscription = supabase
      .channel('my-files-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `owner_address=eq.${normalizedAddress}`
        },
        (payload) => {
          console.log('📡 Real-time update received for MyFiles:', payload);
          // Refetch files when there's a change
          fetchFiles();
        }
      )
      .subscribe((status) => {
        console.log('📡 Files subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealTimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealTimeStatus('disconnected');
        }
      });

    // Subscribe to changes in file_shares table (in case files are shared with this user)
    const sharesSubscription = supabase
      .channel('my-shares-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'file_shares',
          filter: `recipient_address=eq.${normalizedAddress}`
        },
        (payload) => {
          console.log('📡 Real-time update received for file shares:', payload);
          // Refetch files when there's a change
          fetchFiles();
        }
      )
      .subscribe((status) => {
        console.log('📡 Shares subscription status:', status);
      });

    return () => {
      console.log('🔕 Cleaning up real-time subscriptions for MyFiles');
      setRealTimeStatus('disconnected');
      supabase.removeChannel(filesSubscription);
      supabase.removeChannel(sharesSubscription);
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
  const filteredFiles = myFiles.filter(file => {
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
    setPreviewFile(file);
    setShowSharePanelOnOpen(false);
  };

  const closePreview = () => {
    setPreviewFile(null);
    setShowSharePanelOnOpen(false);
  };

  // Menu action handler
  const handleMenuAction = (action: string, file: FileData) => {
    switch (action) {
      case 'download':
        // Direct download without preview
        handleDirectDownload(file);
        break;
      case 'share':
        if (file.is_encrypted && file.is_owned) {
          // For encrypted files owned by current user, open share modal directly
          setShareModalFile(file);
        }
        // For public files or shared files, do nothing (button is disabled)
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
        const { file: decryptedFile } = await downloadAndDecryptFromIrys(file.file_url, address);
        fileData = await decryptedFile.arrayBuffer();
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

  if (!isConnected || !usernameSaved) {
    return (
      <div className="min-h-screen bg-[#18191a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-white/80 text-lg font-medium">Please connect your wallet and set a username to view your files.</p>
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
                <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>FILE LIBRARY</h1>
                <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>Manage and preview your uploaded files</p>
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
                placeholder="Search files by name..."
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
            <p className="text-white/80 mt-4 text-lg font-medium">Loading your files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-white/80 text-lg font-medium">
              {myFiles.length === 0 ? 'No files uploaded yet.' : 'No files match your search.'}
            </p>
            <p className="text-white/40 text-sm mt-2">
              {myFiles.length === 0 ? 'Start by uploading your first file!' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedFiles.map(file => (
              <FileCard
                key={file.id}
                file={file}
                onPreview={handlePreview}
                onMenuAction={handleMenuAction}
              />
            ))}
          </div>
        )}



        {/* Unified File Preview */}
        <FilePreview
          file={previewFile}
          address={address}
          onClose={closePreview}
          showSharePanelOnOpen={showSharePanelOnOpen}
        />

        {/* Share Modal */}
        <ShareModal
          file={shareModalFile}
          address={address}
          onClose={() => setShareModalFile(null)}
          onRecipientAdded={() => {
            // Refresh files after adding recipient
            fetchFiles();
          }}
        />
      </div>
    </div>
  );
} 