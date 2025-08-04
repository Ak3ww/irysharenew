import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Search, RefreshCw, Bell, Eye, X, Download, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { downloadAndDecryptFromIrys } from '../utils/litIrys';

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
  const [hasNewFiles, setHasNewFiles] = useState(false);
  const [newFilesCount, setNewFilesCount] = useState(0);
  const [viewedFiles, setViewedFiles] = useState<Set<string>>(new Set());
  const [realTimeStatus, setRealTimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  // Preview state
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  
  // Zoom and drag state for preview
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

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
    setHasNewFiles(newFiles.length > 0);
    setNewFilesCount(newFiles.length);
    
    setLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    fetchFiles();
  }, [address, isConnected, usernameSaved, refreshTrigger]);

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
    return name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.flac');
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

  const refreshFiles = async () => {
    await fetchFiles();
  };

  // Preview file function
  const handlePreview = async (file: FileData) => {
    // Mark file as viewed
    setViewedFiles(prev => new Set([...prev, file.id]));
    
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      console.log('🔍 Previewing shared file:', file.file_name);
      
      if (file.is_encrypted) {
        // Decrypt and preview encrypted file
        const { file: decryptedFile } = await downloadAndDecryptFromIrys(file.file_url, address);
        
        if (isImage(file)) {
          // Create blob URL for image preview
          const blob = new Blob([decryptedFile], { type: file.file_type });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else if (isPDF(file)) {
          // Create blob URL for PDF preview
          const blob = new Blob([decryptedFile], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else if (isVideo(file)) {
          // Create blob URL for video preview
          const blob = new Blob([decryptedFile], { type: file.file_type });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else if (isAudio(file)) {
          // Create blob URL for audio preview
          const blob = new Blob([decryptedFile], { type: file.file_type });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else {
          // Text file - convert to string
          const text = new TextDecoder().decode(await decryptedFile.arrayBuffer());
          setPreviewData(text);
        }
      } else {
        // Public file - fetch directly
        const response = await fetch(file.file_url);
        const data = await response.arrayBuffer();
        
        if (isImage(file)) {
          const blob = new Blob([data], { type: file.file_type });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else if (isPDF(file)) {
          const blob = new Blob([data], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else if (isVideo(file)) {
          const blob = new Blob([data], { type: file.file_type });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else if (isAudio(file)) {
          const blob = new Blob([data], { type: file.file_type });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else {
          const text = new TextDecoder().decode(data);
          setPreviewData(text);
        }
      }
      
      console.log('✅ Shared file preview loaded successfully');
    } catch (error) {
      console.error('❌ Preview error:', error);
      setPreviewError(error instanceof Error ? error.message : 'Failed to preview file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewLoading(false);
    setPreviewError(null);
    if (previewData && previewData.startsWith('blob:')) {
      URL.revokeObjectURL(previewData);
    }
    setPreviewData(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Zoom and drag handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isImage(previewFile!) || isPDF(previewFile!)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && (isImage(previewFile!) || isPDF(previewFile!))) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isConnected || !usernameSaved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-white/80 text-lg font-medium">Please connect your wallet and set a username to view shared files.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Shared with Me</h1>
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
              {hasNewFiles && (
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
            {filteredFiles.map(file => {
              const isNew = new Date(file.shared_at || file.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000) && !viewedFiles.has(file.id);
              
              return (
                <div
                  key={file.id}
                  className={`group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105 cursor-pointer relative ${
                    isNew ? 'ring-2 ring-emerald-500 ring-opacity-50' : ''
                  }`}
                  onClick={() => handlePreview(file)}
                >
                  {isNew && (
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                      New
                    </div>
                  )}
                  
                  <div className="mb-4 flex items-center justify-center" style={{ minHeight: 80 }}>
                    {isImage(file) ? (
                      <div className="text-4xl">🖼️</div>
                    ) : isPDF(file) ? (
                      <div className="text-4xl">📄</div>
                    ) : isVideo(file) ? (
                      <div className="text-4xl">🎬</div>
                    ) : isAudio(file) ? (
                      <div className="text-4xl">🎵</div>
                    ) : (
                      <div className="text-4xl">📁</div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold text-sm truncate flex-1">
                        {file.file_name}
                      </h3>
                      {file.is_encrypted && (
                        <span className="text-[#67FFD4] text-lg" title="Encrypted file">🔒</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>Shared: {new Date(file.shared_at || file.created_at).toLocaleDateString()}</span>
                      <span>{formatFileSize(file.file_size_bytes)}</span>
                    </div>
                    
                    <div className="text-xs text-[#67FFD4] font-medium">
                      From: {file.owner_address.slice(0, 6)}...{file.owner_address.slice(-4)}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(file);
                      }}
                      className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                    >
                      <Eye size={14} />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(file.file_url, '_blank');
                      }}
                      className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                    >
                      <Download size={14} />
                      Download
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Enhanced Preview Modal */}
        {previewFile && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={closePreview}
                className="absolute top-4 right-4 z-10 text-white hover:text-[#67FFD4] text-2xl bg-black/50 rounded-full p-2 backdrop-blur-sm transition-colors"
              >
                <X size={24} />
              </button>

              {/* Zoom controls */}
              {(isImage(previewFile) || isPDF(previewFile)) && (
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <button
                    onClick={handleZoomIn}
                    className="bg-black/50 text-white hover:text-[#67FFD4] rounded-full p-2 backdrop-blur-sm transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={20} />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="bg-black/50 text-white hover:text-[#67FFD4] rounded-full p-2 backdrop-blur-sm transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={20} />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="bg-black/50 text-white hover:text-[#67FFD4] rounded-full p-2 backdrop-blur-sm transition-colors"
                    title="Reset Zoom"
                  >
                    <Move size={20} />
                  </button>
                </div>
              )}

              {/* Modal Content */}
              <div className="w-full h-full flex items-center justify-center">
                {previewLoading ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#67FFD4]"></div>
                    <span className="ml-3 text-white text-lg font-medium mt-4">Loading preview...</span>
                  </div>
                ) : previewError ? (
                  <div className="text-red-400 text-center">
                    <p className="text-lg font-medium">Error: {previewError}</p>
                  </div>
                ) : previewData ? (
                  <div 
                    ref={previewRef}
                    className="relative overflow-hidden"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  >
                    {isImage(previewFile) ? (
                      <img 
                        src={previewData} 
                        alt={previewFile.file_name}
                        className="max-w-full max-h-[90vh] object-contain transition-transform duration-200"
                        style={{
                          transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                          transformOrigin: 'center'
                        }}
                        draggable={false}
                      />
                    ) : isPDF(previewFile) ? (
                      <iframe
                        src={previewData}
                        className="w-full h-[90vh] border-0 rounded-lg"
                        title={previewFile.file_name}
                        style={{
                          transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                          transformOrigin: 'center'
                        }}
                      />
                    ) : isVideo(previewFile) ? (
                      <video
                        src={previewData}
                        controls
                        className="max-w-full max-h-[90vh] rounded-lg"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : isAudio(previewFile) ? (
                      <audio
                        src={previewData}
                        controls
                        className="w-full max-w-md"
                      >
                        Your browser does not support the audio tag.
                      </audio>
                    ) : (
                      <pre className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl text-white text-sm overflow-auto max-h-[90vh] whitespace-pre-wrap border border-white/10">
                        {previewData}
                      </pre>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}