import { useState, useEffect, useRef } from 'react';
import { X, Download, Share, UserPlus, Check, AlertCircle, Info } from 'lucide-react';
import { downloadAndDecryptFromIrys, updateFileAccessControl } from '../../utils/litIrys';
import { supabase } from '../../utils/supabase';

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

interface FilePreviewProps {
  file: FileData | null;
  address: string;
  onClose: () => void;
  onFileViewed?: (fileId: string) => void;
  showSharePanelOnOpen?: boolean;
}

export function FilePreview({ file, address, onClose, onFileViewed, showSharePanelOnOpen = false }: FilePreviewProps) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  
  // Enhanced zoom and drag state for preview
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Menu state
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  
  // Share and recipients state
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [newRecipientInput, setNewRecipientInput] = useState('');
  const [newRecipientValid, setNewRecipientValid] = useState(false);
  const [newRecipientError, setNewRecipientError] = useState('');
  const [newRecipientLoading, setNewRecipientLoading] = useState(false);
  const [resolvedNewRecipient, setResolvedNewRecipient] = useState<{ address: string, username?: string } | null>(null);
  const [addingRecipients, setAddingRecipients] = useState(false);
  const [addingRecipientsProgress, setAddingRecipientsProgress] = useState(0);
  const [addingRecipientsStage, setAddingRecipientsStage] = useState('');

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

  // Automatic download function
  const handleDownload = async (file: FileData) => {
    try {
      console.log('📥 Starting download for:', file.file_name);
      
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
      console.log('✅ Download completed:', fileName);
    } catch (error) {
      console.error('❌ Download error:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Validate new recipient input
  useEffect(() => {
    const inputValue = newRecipientInput.trim();
    const inputLower = inputValue.toLowerCase();
    let cancelled = false;
    
    async function doNewRecipientLookup() {
      if (!inputValue) {
        setNewRecipientValid(false);
        setNewRecipientError('');
        setResolvedNewRecipient(null);
        return;
      }
      
      setNewRecipientLoading(true);
      
      // Username flow (@username)
      if (inputValue.startsWith('@')) {
        const username = inputValue.slice(1);
        if (!username) {
          setNewRecipientValid(false);
          setNewRecipientError('Enter a username after @');
          setResolvedNewRecipient(null);
          setNewRecipientLoading(false);
          return;
        }
        
        const { data } = await supabase
          .from('usernames')
          .select('address')
          .eq('username', username)
          .single();
          
        if (cancelled) return;
        
        if (!data) {
          setNewRecipientValid(false);
          setNewRecipientError('Username not found');
          setResolvedNewRecipient(null);
        } else {
          setNewRecipientValid(true);
          setNewRecipientError('');
          setResolvedNewRecipient({ address: data.address.toLowerCase(), username });
        }
        setNewRecipientLoading(false);
        return;
      }
      
      // Address flow (0x...)
      const isAddress = /^0x[a-f0-9]{40}$/.test(inputLower);
      if (!isAddress) {
        setNewRecipientValid(false);
        setNewRecipientError('Enter a valid @username or 0x address');
        setResolvedNewRecipient(null);
        setNewRecipientLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from('usernames')
        .select('username')
        .eq('address', inputLower)
        .single();
        
      if (cancelled) return;
      
      if (data && data.username) {
        setNewRecipientValid(true);
        setNewRecipientError('');
        setResolvedNewRecipient({ address: inputLower, username: data.username });
      } else {
        setNewRecipientValid(true);
        setNewRecipientError('');
        setResolvedNewRecipient({ address: inputLower });
      }
      setNewRecipientLoading(false);
    }
    
    doNewRecipientLookup();
    return () => { cancelled = true; };
  }, [newRecipientInput]);

  // Handle adding new recipients
  const handleAddRecipients = async () => {
    if (!file || !resolvedNewRecipient || !address) return;
    
    try {
      setAddingRecipients(true);
      setAddingRecipientsProgress(0);
      setAddingRecipientsStage('Preparing to add recipient...');
      
      // Get current recipients for this file
      const { data: existingShares, error: sharesError } = await supabase
        .from('file_shares')
        .select('recipient_address')
        .eq('file_id', file.id);

      if (sharesError) {
        console.error('Error fetching existing shares:', sharesError);
        throw new Error('Failed to fetch existing file shares');
      }

      const currentRecipients = existingShares?.map(share => share.recipient_address) || [];
      const allRecipients = [...new Set([...currentRecipients, resolvedNewRecipient.address.toLowerCase()])];

      console.log('Current recipients:', currentRecipients);
      console.log('All recipients after adding:', allRecipients);

      setAddingRecipientsProgress(25);
      setAddingRecipientsStage('Preparing access control update...');

      setAddingRecipientsProgress(55);
      setAddingRecipientsStage('Updating access control conditions...');

      // Update access control conditions without re-uploading the file
      const newFileUrl = await updateFileAccessControl(
        file.file_url,
        allRecipients,
        file.owner_address
      );

      console.log('Access control updated, new URL:', newFileUrl);
      
      setAddingRecipientsProgress(85);
      setAddingRecipientsStage('Updating database...');
      
      // Update the file URL in the files table
      const { error: updateFileError } = await supabase
        .from('files')
        .update({ 
          file_url: newFileUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', file.id);

      if (updateFileError) {
        console.error('Error updating file URL:', updateFileError);
        throw new Error('Failed to update file URL in database');
      }

      // Add the new recipient to file_shares table
      const { error: insertError } = await supabase
        .from('file_shares')
        .insert({
          file_id: file.id,
          recipient_address: resolvedNewRecipient.address.toLowerCase(),
          recipient_username: resolvedNewRecipient.username
        });
      
      if (insertError) {
        throw new Error('Failed to add recipient to file shares');
      }
      
      console.log('Successfully added recipient:', resolvedNewRecipient.address);
      
      setAddingRecipientsProgress(100);
      setAddingRecipientsStage('Recipient added successfully!');
      
      // Reset form
      setTimeout(() => {
        setNewRecipientInput('');
        setResolvedNewRecipient(null);
        setNewRecipientValid(false);
        setNewRecipientError('');
        setAddingRecipients(false);
        setAddingRecipientsProgress(0);
        setAddingRecipientsStage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error adding recipient:', error);
      alert(`Failed to add recipient: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAddingRecipients(false);
      setAddingRecipientsProgress(0);
      setAddingRecipientsStage('');
    }
  };

  // Preview file function
  const handlePreview = async (file: FileData) => {
    // Mark file as viewed
    if (onFileViewed) {
      onFileViewed(file.id);
    }
    
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setShowSharePanel(false);

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
          console.log('🎵 Creating audio preview for:', file.file_name, 'Type:', file.file_type);
          const blob = new Blob([decryptedFile], { type: file.file_type || 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          console.log('🎵 Audio blob URL created:', url);
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
          console.log('🎵 Creating public audio preview for:', file.file_name, 'Type:', file.file_type);
          const blob = new Blob([data], { type: file.file_type || 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          console.log('🎵 Public audio blob URL created:', url);
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
    if (previewData && previewData.startsWith('blob:')) {
      URL.revokeObjectURL(previewData);
    }
    setPreviewData(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setShowSharePanel(false);
    setShowDetails(false);
    setShowShareMenu(false);
    setSelectedFile(null);
    setNewRecipientInput('');
    setResolvedNewRecipient(null);
    setNewRecipientValid(false);
    setNewRecipientError('');
    onClose();
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
        handleDownload(file);
        break;
      case 'share':
        if (file.is_encrypted && file.is_owned) {
          // For encrypted files owned by current user, show share panel
          setShowSharePanel(true);
        } else {
          // For public files or shared files, just download
          handleDownload(file);
        }
        break;
    }
  };

  // Enhanced zoom and drag handlers with cursor zoom
  const handleMouseWheel = (e: React.WheelEvent) => {
    if (file && (isImage(file) || isPDF(file))) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (file && (isImage(file) || isPDF(file))) {
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
    if (isDragging && file && (isImage(file) || isPDF(file))) {
      // Use requestAnimationFrame for smoother dragging
      requestAnimationFrame(() => {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default context menu
  };



  // Load preview when file changes
  useEffect(() => {
    if (file) {
      handlePreview(file);
      // Show share panel if requested
      if (showSharePanelOnOpen && file.is_encrypted && file.is_owned) {
        setShowSharePanel(true);
      }
    }
  }, [file, showSharePanelOnOpen]);

  // ESC key handler for closing preview
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePreview();
      }
    };

    if (file) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [file]);

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

  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Close button */}
        <button
          onClick={closePreview}
          className="absolute top-4 right-4 z-10 text-white hover:text-[#67FFD4] text-2xl bg-black/50 rounded-full p-2 backdrop-blur-sm transition-colors"
          title="Close Preview"
        >
          <X size={24} />
        </button>

        {/* Action buttons */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={() => handleDownload(file)}
            className="bg-black/50 text-white hover:text-[#67FFD4] rounded-full p-2 backdrop-blur-sm transition-colors"
            title="Download File"
          >
            <Download size={20} />
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="bg-black/50 text-white hover:text-[#67FFD4] rounded-full p-2 backdrop-blur-sm transition-colors"
            title="File Details"
          >
            <Info size={20} />
          </button>
          <button
            onClick={() => {
              if (file.is_encrypted && file.is_owned) {
                setShowSharePanel(!showSharePanel);
              }
            }}
            disabled={!file.is_encrypted || !file.is_owned}
            className={`rounded-full p-2 backdrop-blur-sm transition-colors ${
              file.is_encrypted && file.is_owned
                ? 'bg-black/50 text-white hover:text-[#67FFD4]'
                : 'bg-black/30 text-white/40 cursor-not-allowed'
            }`}
            title={file.is_encrypted && file.is_owned ? 'Share File' : 'Only file owners can share encrypted files'}
          >
            <Share size={20} />
          </button>
        </div>

        {/* Scroll Tooltips */}
        {(isImage(file) || isPDF(file)) && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-black/70 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-white/80 text-sm">
              <div className="flex items-center gap-4">
                <span>🖱️ Scroll to zoom</span>
                <span>🖱️ Drag to pan</span>
                <span>🖱️ Right-click to reset</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Content */}
        <div 
          className="w-full h-full flex items-center justify-center"
          onWheel={handleMouseWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
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
            <div>
              {isImage(file) ? (
                <img 
                  src={previewData} 
                  alt={file.file_name}
                  className="max-w-full max-h-[90vh] object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                    transformOrigin: 'center',
                    willChange: 'transform',
                    backfaceVisibility: 'hidden'
                  }}
                  draggable={false}
                />
              ) : isPDF(file) ? (
                <iframe
                  src={previewData}
                  className="w-full h-[90vh] border-0 rounded-lg"
                  title={file.file_name}
                  style={{
                    transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                    transformOrigin: 'center',
                    willChange: 'transform',
                    backfaceVisibility: 'hidden'
                  }}
                />
              ) : isVideo(file) ? (
                <video
                  src={previewData}
                  controls
                  className="max-w-full max-h-[90vh] rounded-lg"
                >
                  Your browser does not support the video tag.
                </video>
              ) : isAudio(file) ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="text-center">
                    <h3 className="text-[#67FFD4] font-bold text-lg mb-2">
                      {file.is_encrypted ? '🔒 Decrypted Audio' : '🌐 Public Audio'}
                    </h3>
                    <p className="text-white/60 text-sm">{file.file_name}</p>
                  </div>
                  {previewData ? (
                    <audio
                      src={previewData}
                      controls
                      preload="metadata"
                      onError={(e) => {
                        console.error('🎵 Audio playback error:', e);
                      }}
                      onLoadStart={() => {
                        console.log('🎵 Audio loading started');
                      }}
                      onCanPlay={() => {
                        console.log('🎵 Audio can play');
                      }}
                    >
                      Your browser does not support the audio tag.
                    </audio>
                  ) : (
                    <div className="text-center text-red-400">
                      <p>Failed to load audio preview</p>
                      <p className="text-sm">Please try downloading the file instead</p>
                    </div>
                  )}
                  <div className="text-center text-white/40 text-xs">
                    {file.file_size_bytes && (
                      <p>Size: {Math.round(file.file_size_bytes / 1024 / 1024 * 100) / 100} MB</p>
                    )}
                    <p>Type: {file.file_type || 'audio'}</p>
                  </div>
                </div>
              ) : (
                <pre className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl text-white text-sm overflow-auto max-h-[90vh] whitespace-pre-wrap border border-white/10">
                  {previewData}
                </pre>
              )}
            </div>
          ) : null}
        </div>

        {/* Share Panel */}
        {showSharePanel && (
          <div className="absolute right-4 top-16 bottom-4 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-y-auto">
            <h3 className="text-[#67FFD4] font-bold text-lg mb-4">Share File</h3>
            <div className="space-y-4 text-white">
              <p className="text-sm text-gray-300">
                Add new recipients to share this encrypted file with.
              </p>
              
              {/* Recipient Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Recipient Address or Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newRecipientInput}
                    onChange={(e) => setNewRecipientInput(e.target.value)}
                    placeholder="@username or 0x address"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all"
                  />
                  {newRecipientLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#67FFD4]"></div>
                    </div>
                  )}
                  {newRecipientValid && resolvedNewRecipient && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Check className="text-emerald-400" size={16} />
                    </div>
                  )}
                </div>
                
                {/* Validation Messages */}
                {newRecipientError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={14} />
                    {newRecipientError}
                  </div>
                )}
                
                {resolvedNewRecipient && (
                  <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <UserPlus size={14} />
                      {resolvedNewRecipient.username ? (
                        <>This address is registered as <b>@{resolvedNewRecipient.username}</b></>
                      ) : (
                        <>Address: {resolvedNewRecipient.address.slice(0, 6)}...{resolvedNewRecipient.address.slice(-4)}</>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Progress Bar */}
              {addingRecipients && (
                <div className="space-y-2">
                  <div className="text-[#67FFD4] text-sm">{addingRecipientsStage}</div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-[#67FFD4] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${addingRecipientsProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Add Button */}
              <button
                onClick={handleAddRecipients}
                disabled={addingRecipients || !newRecipientValid}
                className="w-full px-4 py-2 bg-[#67FFD4] text-black font-medium rounded-lg hover:bg-[#67FFD4]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {addingRecipients ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Add Recipient
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Details Panel */}
        {showDetails && (
          <div className="absolute left-4 top-16 bottom-4 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-y-auto">
            <h3 className="text-[#67FFD4] font-bold text-lg mb-4">File Details</h3>
            <div className="space-y-4 text-white">
              <div className="space-y-3">
                <div>
                  <span className="text-gray-300 text-sm">Name:</span>
                  <p className="text-white font-medium">{file.file_name}</p>
                </div>
                
                <div>
                  <span className="text-gray-300 text-sm">Type:</span>
                  <p className="text-white">{file.file_type || 'Unknown'}</p>
                </div>
                
                <div>
                  <span className="text-gray-300 text-sm">Size:</span>
                  <p className="text-white">
                    {file.file_size_bytes ? 
                      `${Math.round(file.file_size_bytes / 1024 / 1024 * 100) / 100} MB` : 
                      'Unknown'
                    }
                  </p>
                </div>
                
                <div>
                  <span className="text-gray-300 text-sm">Status:</span>
                  <p className="text-white">
                    {file.is_encrypted ? '🔒 Encrypted' : '🌐 Public'}
                  </p>
                </div>
                
                <div>
                  <span className="text-gray-300 text-sm">Owner:</span>
                  <p className="text-white font-mono text-sm">
                    {file.owner_address.slice(0, 6)}...{file.owner_address.slice(-4)}
                  </p>
                </div>
                
                {file.is_owned !== undefined && (
                  <div>
                    <span className="text-gray-300 text-sm">Access:</span>
                    <p className="text-white">
                      {file.is_owned ? '👤 You own this file' : '📤 Shared with you'}
                    </p>
                  </div>
                )}
                
                {file.recipient_address && (
                  <div>
                    <span className="text-gray-300 text-sm">Shared by:</span>
                    <p className="text-white font-mono text-sm">
                      {file.recipient_address.slice(0, 6)}...{file.recipient_address.slice(-4)}
                    </p>
                  </div>
                )}
                
                <div>
                  <span className="text-gray-300 text-sm">Created:</span>
                  <p className="text-white">
                    {new Date(file.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <span className="text-gray-300 text-sm">Updated:</span>
                  <p className="text-white">
                    {new Date(file.updated_at).toLocaleString()}
                  </p>
                </div>
                
                {file.shared_at && (
                  <div>
                    <span className="text-gray-300 text-sm">Shared:</span>
                    <p className="text-white">
                      {new Date(file.shared_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 