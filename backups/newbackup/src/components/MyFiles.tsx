import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Search, RefreshCw, Eye, X, Download, Info, Plus } from 'lucide-react';
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
  
  // Preview state
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddRecipients, setShowAddRecipients] = useState(false);
  
  // Zoom and drag state for preview
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

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
    return name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.flac');
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

  const refreshFiles = async () => {
    await fetchFiles();
  };

  // Preview file function
  const handlePreview = async (file: FileData) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setShowDetails(false);

    try {
      console.log('🔍 Previewing file:', file.file_name);
      
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
      
      console.log('✅ File preview loaded successfully');
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
    setShowDetails(false);
    setShowAddRecipients(false);
  };

  // Enhanced zoom and drag handlers with cursor zoom
  const handleMouseWheel = (e: React.WheelEvent) => {
    if (isImage(previewFile!) || isPDF(previewFile!)) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isImage(previewFile!) || isPDF(previewFile!)) {
      if (e.button === 0) { // Left click - start dragging
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      } else if (e.button === 2) { // Right click - reset zoom
        e.preventDefault();
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      }
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default context menu
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  if (!isConnected || !usernameSaved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-white/80 text-lg font-medium">Please connect your wallet and set a username to view your files.</p>
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
                <h1 className="text-3xl font-bold text-white mb-1">My Files</h1>
                <p className="text-white/60 text-sm">Manage and preview your uploaded files</p>
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
            {filteredFiles.map(file => (
              <div
                key={file.id}
                className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105 cursor-pointer"
                onClick={() => handlePreview(file)}
              >
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
                    <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    <span>{formatFileSize(file.file_size_bytes)}</span>
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
            ))}
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

              {/* Action buttons */}
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="bg-black/50 text-white hover:text-[#67FFD4] rounded-full p-2 backdrop-blur-sm transition-colors"
                  title="File Details"
                >
                  <Info size={20} />
                </button>
                {previewFile.is_encrypted && (
                  <button
                    onClick={() => setShowAddRecipients(!showAddRecipients)}
                    className="bg-black/50 text-white hover:text-[#67FFD4] rounded-full p-2 backdrop-blur-sm transition-colors"
                    title="Add Recipients"
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>

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
                    onWheel={handleMouseWheel}
                    onContextMenu={handleContextMenu}
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

              {/* Details Panel */}
              {showDetails && (
                <div className="absolute right-4 top-16 bottom-4 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-y-auto">
                  <h3 className="text-[#67FFD4] font-bold text-lg mb-4">File Details</h3>
                  <div className="space-y-3 text-white">
                    <div>
                      <span className="text-gray-400">Name:</span>
                      <p className="font-medium">{previewFile.file_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Size:</span>
                      <p className="font-medium">{formatFileSize(previewFile.file_size_bytes)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Type:</span>
                      <p className="font-medium">{previewFile.file_type || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Created:</span>
                      <p className="font-medium">{new Date(previewFile.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Updated:</span>
                      <p className="font-medium">{new Date(previewFile.updated_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Encrypted:</span>
                      <p className="font-medium">{previewFile.is_encrypted ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Public:</span>
                      <p className="font-medium">{previewFile.is_public ? 'Yes' : 'No'}</p>
                    </div>
                    {previewFile.tags && previewFile.tags.length > 0 && (
                      <div>
                        <span className="text-gray-400">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {previewFile.tags.map((tag, index) => (
                            <span key={index} className="bg-[#67FFD4]/20 text-[#67FFD4] px-2 py-1 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add Recipients Panel */}
              {showAddRecipients && (
                <div className="absolute right-4 top-16 bottom-4 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h3 className="text-[#67FFD4] font-bold text-lg mb-4">Add Recipients</h3>
                  <p className="text-white/80 text-sm mb-4">
                    Add new recipients to this encrypted file. They will be able to decrypt and access the file.
                  </p>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Enter @username or 0x address"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4]"
                    />
                    <Button className="w-full bg-[#67FFD4] text-black hover:bg-[#8AFFE4]">
                      Add Recipient
                    </Button>
                  </div>
                </div>
              )}

              {/* Zoom Instructions */}
              {(isImage(previewFile) || isPDF(previewFile)) && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg">
                  <p>Scroll to zoom • Left click + drag to pan • Right click to reset</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 