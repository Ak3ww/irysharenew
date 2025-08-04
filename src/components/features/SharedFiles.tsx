import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../../utils/supabase';
import { downloadAndDecryptFromIrys } from '../../utils/litIrys';


export function SharedFiles() {
  const { address, isConnected } = useAccount();

  
  // File management state
  const [sharedWithMe, setSharedWithMe] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any|null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewStage, setPreviewStage] = useState('');
  const [previewCache, setPreviewCache] = useState<Map<string, string>>(new Map());
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');

  // Fetch shared files
  useEffect(() => {
    const fetchSharedFiles = async () => {
      if (!address) return;
      
      try {
        // Use the new get_user_files function to get shared files only
        const { data, error } = await supabase
          .rpc('get_user_files', { user_address: address.toLowerCase().trim() });
        
        if (error) {
          console.error('Error fetching shared files:', error);
        } else {
          // Filter to only shared files (not owned)
          const sharedFiles = data?.filter((file: any) => !file.is_owned) || [];
          setSharedWithMe(sharedFiles);
        }
      } catch (error) {
        console.error('Error in shared files fetch:', error);
        setSharedWithMe([]);
      }
    };
    
    fetchSharedFiles();
  }, [address]);

  // File type helpers
  function isImage(file: any) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return (
      name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp') ||
      contentType?.startsWith('image/')
    );
  }

  function isPDF(file: any) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return name.endsWith('.pdf') || name.endsWith('.txt') || name.endsWith('.doc') || name.endsWith('.docx') || 
           contentType === 'application/pdf' || contentType === 'text/plain' || contentType?.startsWith('application/vnd.openxmlformats');
  }

  function isVideo(file: any) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return (
      name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.ogg') ||
      contentType?.startsWith('video/')
    );
  }

  function isAudio(file: any) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return (
      name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') ||
      contentType?.startsWith('audio/')
    );
  }

  function getTagValue(tags: any, tagName: string) {
    if (!Array.isArray(tags)) return null;
    const tag = tags.find((t: any) => t.name === tagName);
    return tag ? tag.value : null;
  }

  // Preview functions
  const previewEncryptedFile = async (file: any, cacheKey: string, onProgress: (progress: number, stage: string) => void) => {
    console.log('Loading encrypted file...');
    onProgress(10, 'Decrypting file...');
    const { file: decryptedFile } = await downloadAndDecryptFromIrys(
      file.file_url,
      address!,
      (progress) => {
        onProgress(10 + (progress * 0.8), `Decrypting file... ${Math.round(progress)}%`);
      }
    );
    console.log('Decrypted file:', decryptedFile.name, decryptedFile.type, decryptedFile.size);
    onProgress(90, 'Creating preview...');
    const blobUrl = URL.createObjectURL(decryptedFile);
    setPreviewCache(prev => new Map(prev).set(cacheKey, blobUrl));
    onProgress(100, 'Complete!');
    return blobUrl;
  };

  const previewPublicFile = async (file: any, cacheKey: string, onProgress: (progress: number, stage: string) => void) => {
    console.log('Loading public file...');
    onProgress(25, 'Loading file...');
    let txId = file.file_url;
    try {
      if (typeof txId !== 'string') {
        txId = JSON.stringify(txId);
      }
      if (typeof txId === 'string' && txId.includes('{')) {
        const parsed = JSON.parse(txId);
        txId = parsed.url || parsed.id || txId;
      }
    } catch (e) {
      console.log('JSON parsing failed, using original:', e);
    }
    if (typeof txId === 'string' && txId.startsWith('https://gateway.irys.xyz/')) {
      txId = txId.replace('https://gateway.irys.xyz/', '');
    }
    console.log('Fetching from gateway with txId:', txId);
    const res = await fetch(`https://gateway.irys.xyz/${txId}`);
    if (!res.ok) throw new Error(`Failed to fetch from Irys: ${res.status} ${res.statusText}`);
    const blob = await res.blob();
    onProgress(75, 'Creating preview...');
    const blobUrl = URL.createObjectURL(blob);
    setPreviewCache(prev => new Map(prev).set(cacheKey, blobUrl));
    onProgress(100, 'Complete!');
    return blobUrl;
  };

  const handleFilePreview = async (file: any) => {
    setSelectedFile(file);
  };

  // Auto-load preview when file is selected
  useEffect(() => {
    if (!selectedFile) {
      setPreviewBlobUrl('');
      setPreviewError('');
      setPreviewLoading(false);
      setImageZoomed(false);
      setPreviewProgress(0);
      setPreviewStage('');
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewBlobUrl('');
    setPreviewProgress(0);
    setPreviewStage('');
    
    const loadFile = async () => {
      try {
        const cacheKey = `${selectedFile.id}-${selectedFile.updated_at || selectedFile.created_at}`;
        
        // Check cache first
        const cachedUrl = previewCache.get(cacheKey);
        if (cachedUrl) {
          console.log('Using cached preview');
          setPreviewBlobUrl(cachedUrl);
          setPreviewLoading(false);
          return;
        }
        
        let blobUrl: string;
        if (selectedFile.is_encrypted) {
          blobUrl = await previewEncryptedFile(selectedFile, cacheKey, (progress, stage) => {
            if (!cancelled) {
              setPreviewProgress(progress);
              setPreviewStage(stage);
            }
          });
        } else {
          blobUrl = await previewPublicFile(selectedFile, cacheKey, (progress, stage) => {
            if (!cancelled) {
              setPreviewProgress(progress);
              setPreviewStage(stage);
            }
          });
        }
        
        if (!cancelled) {
          setPreviewBlobUrl(blobUrl);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading file:', error);
          setPreviewError(error instanceof Error ? error.message : 'Failed to load file');
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };
    
    loadFile();
    
    return () => {
      cancelled = true;
    };
  }, [selectedFile, previewCache]);

  // Filter files based on search and type
  const filteredFiles = sharedWithMe.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = fileTypeFilter === 'all' || 
      (fileTypeFilter === 'images' && isImage(file)) ||
      (fileTypeFilter === 'documents' && isPDF(file)) ||
      (fileTypeFilter === 'videos' && isVideo(file)) ||
      (fileTypeFilter === 'audio' && isAudio(file));
    return matchesSearch && matchesType;
  });

  // Get file icon
  const getFileIcon = (file: any) => {
    if (isImage(file)) return '🖼️';
    if (isPDF(file)) return '📄';
    if (isVideo(file)) return '🎥';
    if (isAudio(file)) return '🎵';
    return '📁';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#67FFD4] mb-2" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
              INCOMING FILES
            </h1>
            <p className="text-gray-400" style={{ fontFamily: 'Irys2' }}>
              Files shared with you by other users
            </p>
          </div>
          
          {/* Stats */}
          <div className="bg-[#1A1A1A] border border-[#67FFD4] rounded-xl p-4">
            <div className="text-[#67FFD4] font-bold mb-2" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
              SHARED FILES
            </div>
            <div className="text-2xl font-bold text-white">
              {sharedWithMe.length}
            </div>
            <div className="text-sm text-gray-400">
              Total files shared
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-[#1A1A1A] border border-gray-700 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="text-[#67FFD4] font-bold block mb-2" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                SEARCH FILES
              </label>
              <input
                type="text"
                placeholder="Search by filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#222] border border-gray-700 text-white p-3 rounded-lg focus:border-[#67FFD4] focus:outline-none transition-colors"
                style={{ fontFamily: 'Irys2' }}
              />
            </div>
            
            {/* File Type Filter */}
            <div className="md:w-48">
              <label className="text-[#67FFD4] font-bold block mb-2" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                FILE TYPE
              </label>
              <select
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
                className="w-full bg-[#222] border border-gray-700 text-white p-3 rounded-lg focus:border-[#67FFD4] focus:outline-none transition-colors"
                style={{ fontFamily: 'Irys2' }}
              >
                <option value="all">All Files</option>
                <option value="images">Images</option>
                <option value="documents">Documents</option>
                <option value="videos">Videos</option>
                <option value="audio">Audio</option>
              </select>
            </div>
          </div>
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => handleFilePreview(file)}
              className="bg-[#1A1A1A] border border-gray-700 rounded-xl p-6 cursor-pointer transition-all hover:border-[#67FFD4] hover:shadow-lg hover:shadow-[#67FFD4]/20 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">{getFileIcon(file)}</div>
                {file.is_encrypted && (
                  <span className="text-[#67FFD4] text-sm" title="Encrypted file">🔒</span>
                )}
              </div>
              
              <h3 className="text-white font-bold mb-2 truncate" style={{ fontFamily: 'Irys2' }}>
                {file.file_name}
              </h3>
              
              <div className="text-sm text-gray-400 space-y-1">
                <div>{(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB</div>
                <div>{new Date(file.created_at).toLocaleDateString()}</div>
                <div className="text-[#67FFD4]">
                  {file.is_encrypted ? '🔒 Encrypted' : '🌐 Public'}
                </div>
                <div className="text-[#8AFFE4]">
                  Shared by: {file.owner_address?.slice(0, 8)}...{file.owner_address?.slice(-6)}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-500">
                  Click to preview
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredFiles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📤</div>
            <h3 className="text-2xl text-[#67FFD4] font-bold mb-2" style={{ fontFamily: 'Irys2' }}>
              {searchQuery ? 'No shared files found' : 'No files shared with you yet'}
            </h3>
            <p className="text-gray-400 mb-6" style={{ fontFamily: 'IrysItalic' }}>
              {searchQuery ? 'Try adjusting your search or filters' : 'Files shared with you will appear here'}
            </p>
            {!searchQuery && (
              <div className="text-sm text-gray-500">
                Ask other users to share files with your address: {address?.slice(0, 8)}...{address?.slice(-6)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Preview Modal - Full Screen Transparent */}
      {selectedFile && (
        <div 
          className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-[9999]"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 bg-[#1A1A1A]/80 backdrop-blur-sm">
              <h2 className="text-2xl text-[#67FFD4] font-bold" style={{ fontFamily: 'Irys2' }}>
                {selectedFile.file_name}
              </h2>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-[#67FFD4] hover:text-[#8AFFE4] text-3xl font-bold transition-colors"
              >
                ×
              </button>
            </div>
            
            {/* Preview Area - Centered */}
            <div className="flex-1 flex items-center justify-center p-6">
                {previewLoading ? (
                  <div className="text-center">
                    <div className="text-[#67FFD4] text-xl mb-4 font-bold" style={{ fontFamily: 'Irys2' }}>
                      {previewStage}
                    </div>
                    <div className="w-80 mx-auto mb-4">
                      <div className="flex justify-between text-sm text-[#67FFD4] mb-2">
                        <span>{previewStage}</span>
                        <span>{Math.round(previewProgress)}%</span>
                      </div>
                      <div className="w-full bg-[#333] rounded-full h-3 border border-[#67FFD4] overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-[#67FFD4] to-[#8AFFE4] h-3 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${previewProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : previewError ? (
                  <div className="text-center">
                    <div className="text-red-400 text-xl mb-4 font-bold" style={{ fontFamily: 'Irys2' }}>
                      Preview Error
                    </div>
                    <div className="text-red-400 text-sm mb-4">{previewError}</div>
                    <button
                      onClick={() => handleFilePreview(selectedFile)}
                      className="bg-[#67FFD4] text-[#111] font-bold rounded-lg px-6 py-3 transition-all hover:bg-[#8AFFE4]"
                      style={{ fontFamily: 'Irys2' }}
                    >
                      Retry
                    </button>
                  </div>
                ) : isImage(selectedFile) ? (
                  <div className="text-center w-full h-full flex items-center justify-center">
                    <div className="relative max-w-4xl max-h-[70vh] overflow-hidden rounded-lg">
                      <img
                        src={previewBlobUrl || selectedFile.file_url}
                        alt={selectedFile.file_name}
                        className={`w-full h-full object-contain transition-all duration-300 ${
                          imageZoomed ? 'scale-150' : 'scale-100'
                        }`}
                        style={{ 
                          cursor: imageZoomed ? 'zoom-out' : 'zoom-in',
                          maxHeight: '70vh',
                          maxWidth: '100%'
                        }}
                        onClick={() => setImageZoomed(!imageZoomed)}
                        title={imageZoomed ? 'Click to zoom out' : 'Click to zoom in'}
                      />
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#1A1A1A]/80 backdrop-blur-sm rounded-lg px-4 py-2">
                        <p className="text-[#67FFD4] text-sm" style={{ fontFamily: 'IrysItalic' }}>
                          Click to {imageZoomed ? 'shrink' : 'zoom'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isVideo(selectedFile) ? (
                  <div className="text-center w-full h-full flex items-center justify-center">
                    <div className="max-w-4xl max-h-[70vh]">
                      <video
                        controls
                        className="w-full h-full object-contain rounded-lg"
                        style={{ maxHeight: '70vh', maxWidth: '100%' }}
                      >
                        <source src={previewBlobUrl || selectedFile.file_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </div>
                ) : isAudio(selectedFile) ? (
                  <div className="text-center w-full">
                    <div className="bg-[#222]/80 backdrop-blur-sm rounded-xl p-8 max-w-md mx-auto">
                      <div className="text-4xl mb-4">🎵</div>
                      <h3 className="text-[#67FFD4] text-xl font-bold mb-4" style={{ fontFamily: 'Irys2' }}>
                        Audio Player
                      </h3>
                      <audio 
                        controls 
                        className="w-full mb-4"
                        style={{ 
                          filter: 'invert(1) hue-rotate(180deg)',
                          background: 'transparent'
                        }}
                      >
                        <source src={previewBlobUrl || selectedFile.file_url} type="audio/mpeg" />
                        <source src={previewBlobUrl || selectedFile.file_url} type="audio/wav" />
                        <source src={previewBlobUrl || selectedFile.file_url} type="audio/ogg" />
                        Your browser does not support the audio tag.
                      </audio>
                      <div className="text-sm text-gray-400">
                        {selectedFile.is_encrypted ? '🔒 Decrypted Audio' : '🌐 Public Audio'}
                      </div>
                    </div>
                  </div>
                ) : isPDF(selectedFile) ? (
                  <div className="text-center w-full h-full">
                    <div className="relative max-w-4xl max-h-[70vh]">
                      <iframe
                        src={previewBlobUrl || selectedFile.file_url}
                        className="w-full h-[70vh] rounded-lg"
                        title={selectedFile.file_name}
                        style={{ background: 'white' }}
                      />
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={() => setImageZoomed(!imageZoomed)}
                          className="bg-[#67FFD4] text-[#111] font-bold rounded-lg px-4 py-2 transition-all hover:bg-[#8AFFE4]"
                          style={{ fontFamily: 'Irys2' }}
                        >
                          {imageZoomed ? '🔍 Zoom Out' : '🔍 Zoom In'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : selectedFile.file_name?.match(/\.(docx?|pptx?|xlsx?|txt|md|json|xml|csv|log)$/i) ? (
                  <div className="text-center w-full h-full flex items-center justify-center">
                    <div className="max-w-4xl max-h-[70vh] w-full">
                      {!selectedFile.is_encrypted ? (
                        <div className="bg-[#222]/80 backdrop-blur-sm rounded-xl p-6">
                          <div className="text-4xl mb-4">📄</div>
                          <div className="text-[#67FFD4] text-xl mb-4 font-bold" style={{ fontFamily: 'Irys2' }}>
                            📄 Document Preview
                          </div>
                          <div className="text-[#67FFD4] text-lg mb-6">
                            This file is a document and cannot be previewed directly. Use external viewers or download to view.
                          </div>
                          <div className="space-y-3">
                            <a
                              href={`https://docs.google.com/gview?url=${encodeURIComponent(selectedFile.file_url)}&embedded=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#67FFD4] text-[#111] font-bold rounded-lg px-6 py-3 inline-block transition-all hover:bg-[#8AFFE4]"
                              style={{ fontFamily: 'Irys2' }}
                            >
                              📖 Open in Google Docs
                            </a>
                            <br />
                            <a
                              href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(selectedFile.file_url)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#222] text-[#67FFD4] border-2 border-[#67FFD4] font-bold rounded-lg px-6 py-3 inline-block transition-all hover:bg-[#67FFD4] hover:text-[#111]"
                              style={{ fontFamily: 'Irys2' }}
                            >
                              📊 Open in Office Online
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#222]/80 backdrop-blur-sm rounded-xl p-6">
                          <div className="text-4xl mb-4">🔒</div>
                          <div className="text-[#67FFD4] text-xl mb-4 font-bold" style={{ fontFamily: 'Irys2' }}>
                            🔒 Encrypted Document
                          </div>
                          <div className="text-[#67FFD4] text-lg mb-6">
                            Document preview not available for encrypted files. Please download to view.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedFile.file_size_bytes && selectedFile.file_size_bytes > 10 * 1024 * 1024 ? (
                  <div className="text-center">
                    <div className="bg-[#222]/80 backdrop-blur-sm rounded-xl p-8 max-w-lg mx-auto">
                      <div className="text-4xl mb-4">📦</div>
                      <div className="text-[#67FFD4] text-xl mb-4 font-bold" style={{ fontFamily: 'Irys2' }}>
                        📦 Large File
                      </div>
                      <div className="text-[#67FFD4] text-lg">
                        Large file ({Math.round(selectedFile.file_size_bytes / 1024 / 1024)}MB). Please download to view.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="bg-[#222]/80 backdrop-blur-sm rounded-xl p-8 max-w-lg mx-auto">
                      <div className="text-4xl mb-4">📁</div>
                      <div className="text-[#67FFD4] text-xl mb-4 font-bold" style={{ fontFamily: 'Irys2' }}>
                        📁 File Preview
                      </div>
                      <div className="text-[#67FFD4] text-lg mb-6">
                        Preview not available for this file type.
                      </div>
                      <a
                        href={selectedFile.file_url}
                        download={selectedFile.file_name}
                        className="bg-[#67FFD4] text-[#111] font-bold rounded-lg px-6 py-3 inline-block transition-all hover:bg-[#8AFFE4]"
                        style={{ fontFamily: 'Irys2' }}
                      >
                        📥 Download File
                      </a>
                    </div>
                  </div>
                )}
              </div>

                {/* File Info Panel - Below Preview */}
                <div className="bg-[#1A1A1A]/80 backdrop-blur-sm p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-[#67FFD4] font-bold">Owner:</span>
                        <button
                          onClick={async () => {
                            try {
                              const { data } = await supabase
                                .from('usernames')
                                .select('username')
                                .eq('address', selectedFile.owner_address)
                                .single();
                              if (data?.username) {
                                await navigator.clipboard.writeText('@' + data.username);
                                alert('Username copied to clipboard: @' + data.username);
                              } else {
                                await navigator.clipboard.writeText(selectedFile.owner_address);
                                alert('Address copied to clipboard');
                              }
                            } catch (error) {
                              await navigator.clipboard.writeText(selectedFile.owner_address);
                              alert('Address copied to clipboard');
                            }
                          }}
                          className="ml-2 text-[#67FFD4] underline cursor-pointer hover:text-[#8AFFE4]"
                        >
                          {selectedFile.owner_address}
                        </button>
                      </div>
                      
                      <div>
                        <span className="text-[#67FFD4] font-bold">Recipient:</span>
                        <span className="ml-2 text-white">
                          {selectedFile.recipient_address}
                        </span>
                      </div>
                      
                      <div><span className="text-[#67FFD4] font-bold">Shared:</span> <span className="text-white">{new Date(selectedFile.created_at).toLocaleString()}</span></div>
                      <div><span className="text-[#67FFD4] font-bold">Size:</span> <span className="text-white">{(selectedFile.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span></div>
                      <div><span className="text-[#67FFD4] font-bold">Type:</span> <span className="text-white">{selectedFile.is_encrypted ? '🔒 Encrypted' : '🌐 Public'}</span></div>
                      
                      {selectedFile.is_encrypted && (
                        <div className="text-[#67FFD4] font-bold">
                          🔒 Encrypted File - Decrypted for viewing
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 justify-center mt-6">
                      <button
                        onClick={async () => {
                          try {
                            if (selectedFile.is_encrypted) {
                              // Download decrypted file
                              const { file: decryptedFile } = await downloadAndDecryptFromIrys(selectedFile.file_url, address!);
                              const url = URL.createObjectURL(decryptedFile);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = selectedFile.file_name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } else {
                              // Download regular file
                              const a = document.createElement('a');
                              a.href = selectedFile.file_url;
                              a.download = selectedFile.file_name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }
                          } catch (error) {
                            console.error('Download failed:', error);
                            alert('Download failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
                          }
                        }}
                        className="bg-[#67FFD4] text-[#111] font-bold rounded-lg p-3 transition-all hover:bg-[#8AFFE4]"
                        style={{ fontFamily: 'Irys2' }}
                      >
                        📥 Download {selectedFile.is_encrypted ? '(Decrypted)' : ''}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  );
} 