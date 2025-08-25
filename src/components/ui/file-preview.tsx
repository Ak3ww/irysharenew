import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Share, UserPlus, Check, AlertCircle, Info, Heart, MessageCircle, Send } from 'lucide-react';
import { downloadAndDecryptFromIrys, updateFileAccessControl } from '../../utils/aesIrys';
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
  like_count?: number;
  comment_count?: number;
}
interface FilePreviewProps {
  file: FileData | null;
  address: string;
  onClose: () => void;
  onFileViewed?: (fileId: string) => void;
  showSharePanelOnOpen?: boolean;
  onFileUpdated?: (fileId: string, updates: Partial<FileData>) => void;
}
export function FilePreview({ file, address, onClose, onFileViewed, showSharePanelOnOpen = false, onFileUpdated }: FilePreviewProps) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy File URL');
  // Like and comment state
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(file?.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Array<{
    id: string;
    text: string;
    user_address: string;
    username?: string;
    profile_avatar?: string | null;
    created_at: string;
  }>>([]);
  const [commentCount, setCommentCount] = useState(file?.comment_count || 0);
  // Enhanced zoom and drag state for preview
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  // Menu state
  const [showShareMenu, setShowShareMenu] = useState(false);
  // Share and recipients state
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [newRecipientInput, setNewRecipientInput] = useState('');
  const [newRecipientValid, setNewRecipientValid] = useState(false);
  const [newRecipientError, setNewRecipientError] = useState('');
  const [newRecipientLoading, setNewRecipientLoading] = useState(false);
  const [resolvedNewRecipients, setResolvedNewRecipients] = useState<Array<{ address: string, username?: string }>>([]);
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
      // CRITICAL SECURITY CHECK: Verify user has permission to download this file
      // Allow access if: file is public, user owns it, OR user is a recipient (shared file)
      if (!file.is_public && !file.is_owned && !file.recipient_address) {
        alert('Access denied: You do not have permission to download this file');
        return;
      }
      // ADDITIONAL SECURITY: For encrypted files, only owner or recipients can download
      if (file.is_encrypted && !file.is_owned && !file.recipient_address) {
        alert('Access denied: Only the file owner or recipients can download encrypted files');
        return;
      }
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
    } catch (error) {
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  // Validate multiple recipients input
  useEffect(() => {
    const inputValue = newRecipientInput.trim();
    let cancelled = false;
    async function validateRecipients() {
      if (!inputValue) {
        setNewRecipientValid(false);
        setNewRecipientError('');
        setResolvedNewRecipients([]);
        return;
      }
      setNewRecipientLoading(true);
      // Get existing recipients for this file to prevent duplicates
      let existingRecipients: string[] = [];
      if (file) {
        try {
          const { data: existingShares } = await supabase
            .from('file_shares')
            .select('recipient_address')
            .eq('file_id', file.id);
          existingRecipients = existingShares?.map(share => share.recipient_address.toLowerCase()) || [];
        } catch (error) {
          // Silent error handling for production
        }
      }
      const recipientList = inputValue.split(',').map(r => r.trim()).filter(r => r);
      const validRecipients: Array<{address: string, username?: string}> = [];
      const errors: string[] = [];
      const seenAddresses = new Set<string>(); // Track duplicates within input
      for (const recipient of recipientList) {
        if (recipient.startsWith('@')) {
          // Username lookup - case insensitive
          const username = recipient.slice(1);
          if (!username) {
            errors.push('Enter a username after @');
            continue;
          }
          try {
            const { data } = await supabase
              .from('usernames')
              .select('*')
              .ilike('username', username)
              .single();
            if (data) {
              const addressLower = data.address.toLowerCase();
              // Check if trying to share with self
              if (address && addressLower === address.toLowerCase()) {
                errors.push(`Cannot share with yourself (@${username})`);
                continue;
              }
              // Check if already shared with this user
              if (existingRecipients.includes(addressLower)) {
                errors.push(`Already shared with @${username}`);
                continue;
              }
              // Check for duplicates in current input
              if (seenAddresses.has(addressLower)) {
                errors.push(`Duplicate recipient: @${username}`);
                continue;
              }
              seenAddresses.add(addressLower);
              validRecipients.push({ address: addressLower, username });
            } else {
              errors.push(`User @${username} not found`);
            }
          } catch {
            errors.push(`User @${username} not found`);
          }
        } else if (/^0x[a-f0-9]{40}$/.test(recipient.toLowerCase())) {
          // Direct address - validate format and check for username
          const addressLower = recipient.toLowerCase();
          // Check if trying to share with self
          if (address && addressLower === address.toLowerCase()) {
            errors.push(`Cannot share with yourself (${addressLower.slice(0, 6)}...${addressLower.slice(-4)})`);
            continue;
          }
          // Check if already shared with this address
          if (existingRecipients.includes(addressLower)) {
            errors.push(`Already shared with ${addressLower.slice(0, 6)}...${addressLower.slice(-4)}`);
            continue;
          }
          // Check for duplicates in current input
          if (seenAddresses.has(addressLower)) {
            errors.push(`Duplicate recipient: ${addressLower.slice(0, 6)}...${addressLower.slice(-4)}`);
            continue;
          }
          seenAddresses.add(addressLower);
          // Optionally look up username for display
          try {
            const { data } = await supabase
              .from('usernames')
              .select('*')
              .ilike('address', addressLower)
              .single();
            if (data && data.username) {
              validRecipients.push({ address: addressLower, username: data.username });
            } else {
              validRecipients.push({ address: addressLower });
            }
          } catch {
            // If no username found, still allow the address
            validRecipients.push({ address: addressLower });
          }
        } else {
          errors.push(`Invalid recipient: ${recipient} (use @username or 0x address)`);
        }
      }
      if (cancelled) return;
      setResolvedNewRecipients(validRecipients);
      setNewRecipientValid(validRecipients.length > 0 && errors.length === 0);
      setNewRecipientError(errors.join(', '));
      setNewRecipientLoading(false);
    }
    validateRecipients();
    return () => { cancelled = true; };
  }, [newRecipientInput, file, address]);
  // Handle adding new recipients
  const handleAddRecipients = async () => {
    if (!file || !resolvedNewRecipients.length || !address) return;
    try {
      setAddingRecipients(true);
      setAddingRecipientsProgress(0);
      setAddingRecipientsStage(`Preparing to add ${resolvedNewRecipients.length} recipient(s)...`);
      // Get current recipients for this file
      const { data: existingShares, error: sharesError } = await supabase
        .from('file_shares')
        .select('recipient_address')
        .eq('file_id', file.id);
      if (sharesError) {
        throw new Error('Failed to fetch existing file shares');
      }
      const currentRecipients = existingShares?.map(share => share.recipient_address) || [];
      const newRecipientAddresses = resolvedNewRecipients.map(r => r.address.toLowerCase());
      const allRecipients = [...new Set([...currentRecipients, ...newRecipientAddresses])];
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
        throw new Error('Failed to update file URL in database');
      }
      // Add all new recipients to file_shares table
      const shareInserts = resolvedNewRecipients.map(recipient => ({
        file_id: file.id,
        recipient_address: recipient.address.toLowerCase(),
        recipient_username: recipient.username
      }));
      const { error: insertError } = await supabase
        .from('file_shares')
        .insert(shareInserts);
      if (insertError) {
        throw new Error('Failed to add recipients to file shares');
      }
      setAddingRecipientsProgress(100);
      setAddingRecipientsStage(`${resolvedNewRecipients.length} recipient(s) added successfully!`);
      // Reset form
      setTimeout(() => {
        setNewRecipientInput('');
        setResolvedNewRecipients([]);
        setNewRecipientValid(false);
        setNewRecipientError('');
        setAddingRecipients(false);
        setAddingRecipientsProgress(0);
        setAddingRecipientsStage('');
      }, 2000);
    } catch (error) {
      alert(`Failed to add recipients: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAddingRecipients(false);
      setAddingRecipientsProgress(0);
      setAddingRecipientsStage('');
    }
  };
  // Preview file function
  const handlePreview = async (file: FileData) => {
    // Security check: Verify user has permission to view this file
    // Allow access if: file is public, user owns it, OR user is a recipient (shared file)
    if (!file.is_public && !file.is_owned && !file.recipient_address) {
      setPreviewError('Access denied: You do not have permission to view this file');
      setPreviewLoading(false);
      return;
    }
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
      if (file.is_encrypted) {
        // Additional security check for encrypted files
        // Allow access if: user owns it OR user is a recipient (shared file)
        if (!file.is_owned && !file.recipient_address) {
          // For encrypted files, only the owner or recipients should be able to decrypt
          setPreviewError('Access denied: Only the file owner or recipients can view encrypted files');
          return;
        }
        // Decrypt and preview encrypted file
        const decryptedData = await downloadAndDecryptFromIrys(file.file_url, address);
        if (isImage(file)) {
          // Create blob URL for image preview
          const blob = new Blob([decryptedData], { type: file.file_type });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else if (isPDF(file)) {
          // Create blob URL for PDF preview
          const blob = new Blob([decryptedData], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else if (isVideo(file)) {
          // Create blob URL for video preview
          const blob = new Blob([decryptedData], { type: file.file_type });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else if (isAudio(file)) {
          // Create blob URL for audio preview
          const blob = new Blob([decryptedData], { type: file.file_type || 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else {
          // Text file - convert to string
          const text = new TextDecoder().decode(decryptedData);
          setPreviewData(text);
        }
      } else {
        // Public file - fetch directly
        const response = await fetch(file.file_url);
        // CRITICAL FIX: Check if response is valid before processing
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        // CRITICAL FIX: Check content type to prevent JSON parsing errors
        const contentType = response.headers.get('content-type');
        // For images, videos, audio - use blob directly
        if (isImage(file) || isVideo(file) || isAudio(file)) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else if (isPDF(file)) {
          // PDF files
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPreviewData(url);
        } else {
          // Text files - check if it's actually text
          if (contentType && contentType.startsWith('text/')) {
            const text = await response.text();
            setPreviewData(text);
          } else {
            // For unknown types, try to read as text but handle errors
            try {
              const text = await response.text();
              setPreviewData(text);
            } catch {
              // Fallback to blob for unknown types
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              setPreviewData(url);
            }
          }
        }
      }
    } catch (error) {
      console.error('Preview error:', error);
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
    setNewRecipientInput('');
    setResolvedNewRecipients([]);
    setNewRecipientValid(false);
    setNewRecipientError('');
    onClose();
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

  // Social sharing function
  const handleSocialShare = (platform: 'twitter' | 'facebook' | 'copy') => {
    if (!file) return;
    
    const publicUrl = `${window.location.origin}/file/${file.id}`;
    const fileName = file.file_name;
    
    switch (platform) {
      case 'twitter': {
        const twitterUrl = `https://twitter.com/intent/tweet?text=Check out this file: ${fileName}&url=${encodeURIComponent(publicUrl)}&via=iryshare`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
        break;
      }
      case 'facebook': {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
        break;
      }

      case 'copy': {
        // Change button text to show copied
        setCopyButtonText('Copied!');
        
        navigator.clipboard.writeText(publicUrl).then(() => {
          // Reset button text after 2 seconds
          setTimeout(() => {
            setCopyButtonText('Copy File URL');
          }, 2000);
        }).catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = publicUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          
          // Reset button text after 2 seconds
          setTimeout(() => {
            setCopyButtonText('Copy File URL');
          }, 2000);
        });
        break;
      }
    }
  };

  // Like function
  const handleLike = async () => {
    console.log('handleLike called with:', { file: file?.id, address, currentLikeState: isLiked });
    
    if (!file || !address) {
      console.log('Validation failed:', { hasFile: !!file, hasAddress: !!address });
      return;
    }
    
    try {
      const newLikeState = !isLiked;
      console.log('Attempting to', newLikeState ? 'add' : 'remove', 'like...');
      
      if (newLikeState) {
        // Add like
        const { error } = await supabase
          .from('file_likes')
          .insert({
            file_id: file.id,
            user_address: address.toLowerCase()
          });
        
        if (error) {
          console.error('Database error adding like:', error);
          throw error;
        }
        
        console.log('Like added successfully');
        setIsLiked(true);
        const newLikeCount = likeCount + 1;
        setLikeCount(newLikeCount);
        
        // Notify parent component of the update
        if (onFileUpdated) {
          console.log('Calling onFileUpdated with like (add):', { fileId: file.id, updates: { like_count: newLikeCount } });
          onFileUpdated(file.id, { like_count: newLikeCount });
        }
      } else {
        // Remove like
        const { error } = await supabase
          .from('file_likes')
          .delete()
          .eq('file_id', file.id)
          .eq('user_address', address.toLowerCase());
        
        if (error) {
          console.error('Database error removing like:', error);
          throw error;
        }
        
        console.log('Like removed successfully');
        setIsLiked(false);
        const newLikeCount = Math.max(0, likeCount - 1);
        setLikeCount(newLikeCount);
        
        // Notify parent component of the update
        if (onFileUpdated) {
          console.log('Calling onFileUpdated with like (remove):', { fileId: file.id, updates: { like_count: newLikeCount } });
          onFileUpdated(file.id, { like_count: newLikeCount });
        }
      }
    } catch (error) {
      console.error('Error handling like:', error);
      // Revert state on error
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
    }
  };

  // Comment functions
  const handleAddComment = async () => {
    console.log('handleAddComment called with:', { file: file?.id, address, commentText });
    
    if (!file || !address || !commentText.trim()) {
      console.log('Validation failed:', { hasFile: !!file, hasAddress: !!address, hasText: !!commentText.trim() });
      return;
    }
    
    try {
      console.log('Attempting to save comment to database...');
      
      // Save comment to database (convert address to lowercase to match database format)
      const { data, error } = await supabase
        .from('file_comments')
        .insert({
          file_id: file.id,
          user_address: address.toLowerCase(),
          text: commentText.trim()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Comment saved successfully:', data);
      
      // Get username from usernames table (convert address to lowercase to match database)
      const { data: userData, error: usernameError } = await supabase
        .from('usernames')
        .select('*')
        .eq('address', address.toLowerCase())
        .single();
      
      console.log('Username fetch result:', { userData, usernameError, address });
      
      const newComment = {
        id: data.id,
        text: data.text,
        user_address: data.user_address,
        username: userData?.username || 'Anonymous',
        profile_avatar: userData?.profile_avatar || null,
        created_at: data.created_at
      };
      
      console.log('New comment object:', newComment);
      
      // Add comment to local state
      setComments(prev => [newComment, ...prev]);
      const newCommentCount = commentCount + 1;
      setCommentCount(newCommentCount);
      setCommentText('');
      
      // Notify parent component of the update
      if (onFileUpdated) {
        console.log('Calling onFileUpdated with:', { fileId: file.id, updates: { comment_count: newCommentCount } });
        onFileUpdated(file.id, { comment_count: newCommentCount });
      }
      
      console.log('Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Load preview when file changes
  useEffect(() => {
    if (file) {
      handlePreview(file);
      // Show share panel if requested
      if (showSharePanelOnOpen && file.is_encrypted && file.is_owned) {
        setShowSharePanel(true);
      }
      
      // Load likes and comments for public files
      if (file.is_public && !file.is_encrypted) {
        loadFileLikes();
        loadFileComments();
      }
    }
  }, [file, showSharePanelOnOpen]);

  // Load file likes
  const loadFileLikes = async () => {
    if (!file || !address) return;
    
    try {
      // Check if current user has liked this file
      const { data: userLike } = await supabase
        .from('file_likes')
        .select('id')
        .eq('file_id', file.id)
        .eq('user_address', address.toLowerCase())
        .single();
      
      setIsLiked(!!userLike);
      
      // Get total like count
      const { count } = await supabase
        .from('file_likes')
        .select('*', { count: 'exact', head: true })
        .eq('file_id', file.id);
      
      setLikeCount(count || 0);
    } catch (error) {
      console.error('Error loading likes:', error);
    }
  };

  // Load file comments
  const loadFileComments = async () => {
    if (!file) return;
    
    try {
      const { data: commentsData, error } = await supabase
        .from('file_comments')
        .select(`
          id,
          text,
          user_address,
          created_at
        `)
        .eq('file_id', file.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get usernames and profile avatars for all comment authors (fetch each one individually to avoid confusion)
      const formattedComments = await Promise.all(
        commentsData.map(async (comment) => {
          const { data: userData } = await supabase
            .from('usernames')
            .select('username, profile_avatar')
            .eq('address', comment.user_address.toLowerCase())
            .single();
          
          return {
            id: comment.id,
            text: comment.text,
            user_address: comment.user_address,
            username: userData?.username || 'Anonymous',
            profile_avatar: userData?.profile_avatar || null,
            created_at: comment.created_at
          };
        })
      );
      
      setComments(formattedComments);
      setCommentCount(formattedComments.length);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };
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
        // setSelectedFile(null); // This line was removed
      }
    };
    if (showShareMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showShareMenu]);
  // Click outside handler for closing modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closePreview();
    }
  };
  if (!file) return null;
  if (!file) return null;
  return createPortal(
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 overflow-hidden"
      onClick={handleBackdropClick}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 99999,
        width: '100vw',
        height: '100vh'
      }}
    >
      <div 
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          width: '100vw', 
          height: '100vh',
          position: 'relative',
          zIndex: 1
        }}
      >
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
          <div className="relative">
            <button
              onClick={() => {
                if (file.is_public && !file.is_encrypted) {
                  // For public files, show social sharing options
                  setShowShareMenu(!showShareMenu);
                } else if (file.is_encrypted && file.is_owned) {
                  // For encrypted files, show share panel
                  setShowSharePanel(!showSharePanel);
                }
              }}
              disabled={!file.is_public && (!file.is_encrypted || !file.is_owned)}
              className={`rounded-full p-2 backdrop-blur-sm transition-colors ${
                (file.is_public && !file.is_encrypted) || (file.is_encrypted && file.is_owned)
                  ? 'bg-black/50 text-white hover:text-[#67FFD4]'
                  : 'bg-black/30 text-white/40 cursor-not-allowed'
              }`}
              title={
                file.is_public && !file.is_encrypted 
                  ? 'Share File' 
                  : file.is_encrypted && file.is_owned 
                    ? 'Share Encrypted File' 
                    : 'No sharing available'
              }
            >
              <Share size={20} />
            </button>
            
            {/* Social Sharing Dropdown for Public Files */}
            {showShareMenu && file.is_public && !file.is_encrypted && (
              <div className="absolute top-12 left-0 bg-black/90 border border-white/20 rounded-lg shadow-lg z-30 min-w-[200px] p-2">
                <div className="text-white/60 text-xs px-3 py-2 border-b border-white/10 mb-2">
                  Share File
                </div>
                               <button
                 onClick={() => handleSocialShare('twitter')}
                 className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 text-sm rounded-md transition-colors"
               >
                 <img 
                   src="/social-icons/icons8-x-white.svg" 
                   alt="Twitter/X" 
                   className="w-4 h-4"
                 />
                 Share on X (Twitter)
               </button>
                               <button
                 onClick={() => handleSocialShare('facebook')}
                 className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 text-sm rounded-md transition-colors"
               >
                 <img 
                   src="/social-icons/icons8-facebook.svg" 
                   alt="Facebook" 
                   className="w-4 h-4"
                 />
                 Share on Facebook
               </button>
                               <button
                 onClick={() => handleSocialShare('copy')}
                 className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 text-sm rounded-md transition-colors"
               >
                 <svg className="w-4 h-4 text-[#67FFD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                 </svg>
                 {copyButtonText}
               </button>
              </div>
            )}
          </div>
        </div>

        {/* Like and Comment Buttons - Only for Public Files */}
        {file.is_public && !file.is_encrypted && (
          <div className="absolute bottom-4 left-4 z-10 flex gap-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm transition-colors ${
                isLiked 
                  ? 'bg-red-500/80 text-white' 
                  : 'bg-black/50 text-white hover:text-red-400'
              }`}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart size={16} className={isLiked ? 'fill-current' : ''} />
              <span className="text-sm font-medium">{likeCount}</span>
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 text-white hover:text-blue-400 backdrop-blur-sm transition-colors"
              title={showComments ? 'Hide Comments' : 'Show Comments'}
            >
              <MessageCircle size={16} />
              <span className="text-sm font-medium">{commentCount}</span>
            </button>
          </div>
        )}

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
                        console.error('Audio playback error:', e);
                      }}
                      onLoadStart={() => {
                        // Audio loading started
                      }}
                      onCanPlay={() => {
                        // Audio can play
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

          {/* Comments Section - Only for Public Files */}
          {file.is_public && !file.is_encrypted && showComments && (
            <div className="absolute right-4 top-16 bottom-4 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-y-auto">
              <h3 className="text-[#67FFD4] font-bold text-lg mb-4">Comments ({commentCount})</h3>
              
              {/* Add Comment */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="px-4 py-2 bg-[#67FFD4] text-black font-medium rounded-lg hover:bg-[#67FFD4]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center text-white/40 py-8">
                    <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No comments yet</p>
                    <p className="text-sm">Be the first to comment!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {/* Profile Picture */}
                        {comment.profile_avatar ? (
                          <img 
                            src={comment.profile_avatar} 
                            alt={`${comment.username || 'User'}'s avatar`}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-[#67FFD4]/20 rounded-full flex items-center justify-center">
                            <span className="text-[#67FFD4] text-xs font-bold">
                              {comment.username ? comment.username[0].toUpperCase() : 'A'}
                            </span>
                          </div>
                        )}
                        
                        {/* Username - Clickable if not current user */}
                        {comment.user_address.toLowerCase() === address?.toLowerCase() ? (
                          <span className="text-white font-medium text-sm">
                            {comment.username || 'Anonymous'}
                          </span>
                        ) : (
                          <button 
                            onClick={() => window.location.href = `/profile/${comment.username}`}
                            className="text-white font-medium text-sm hover:text-[#67FFD4] transition-colors cursor-pointer"
                          >
                            {comment.username || 'Anonymous'}
                          </button>
                        )}
                        
                        <span className="text-white/40 text-xs">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-white/80 text-sm">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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
                <label className="text-sm font-medium text-white">Recipient Addresses or Usernames</label>
                <div className="relative">
                  <textarea
                    value={newRecipientInput}
                    onChange={(e) => setNewRecipientInput(e.target.value)}
                    placeholder="@username or 0x address (separate multiple with commas)"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all h-20 resize-none"
                  />
                  {newRecipientLoading && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#67FFD4]"></div>
                    </div>
                  )}
                  {newRecipientValid && resolvedNewRecipients.length > 0 && (
                    <div className="absolute right-3 top-3">
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
                {resolvedNewRecipients.length > 0 && (
                  <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3">
                    <div className="text-emerald-400 text-sm mb-2">
                      <UserPlus size={14} className="inline mr-2" />
                      Valid Recipients ({resolvedNewRecipients.length}):
                    </div>
                    <div className="space-y-1">
                      {resolvedNewRecipients.map((recipient, index) => (
                        <div key={index} className="text-sm text-emerald-300">
                          {recipient.username ? (
                            <>@{recipient.username} ({recipient.address.slice(0, 6)}...{recipient.address.slice(-4)})</>
                          ) : (
                            <>{recipient.address.slice(0, 6)}...{recipient.address.slice(-4)}</>
                          )}
                        </div>
                      ))}
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
                    Add Recipients ({resolvedNewRecipients.length})
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

                {!file.is_owned && file.owner_address && (
                  <div>
                    <span className="text-gray-300 text-sm">Shared by:</span>
                    <p className="text-white font-mono text-sm">
                      {file.owner_address.slice(0, 6)}...{file.owner_address.slice(-4)}
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
    </div>,
    document.body
  );
} 
