import { useState, useEffect, useCallback } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { supabase } from '../utils/supabase';
import { getIrysUploader, uploadFile } from '../utils/irys';
import { uploadEncryptedToIrys, downloadAndDecryptFromIrys, updateFileAccessControl } from '../utils/litIrys';

// Define types for better type safety
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
  // For shared files (when fetched via get_user_files function)
  is_owned?: boolean;
  recipient_address?: string;
  recipient_username?: string;
  shared_at?: string;
}

interface HomeProps {
  onLogout: () => void;
}

export function Home({ onLogout }: HomeProps) {
  const { address, isConnected } = useAccount();

  // Username state
  const [username, setUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [supabase406, setSupabase406] = useState(false);
  // File upload state
  const [selectedAction, setSelectedAction] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');

  const [myFiles, setMyFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileData|null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [imageZoomed, setImageZoomed] = useState(false);

  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewStage, setPreviewStage] = useState('');
  const [previewCache, setPreviewCache] = useState<Map<string, string>>(new Map()); // Temporarily disabled

  // Add state for multiple recipients
  const [shareRecipients, setShareRecipients] = useState<string>('');
  const [resolvedRecipients, setResolvedRecipients] = useState<{ address: string, username?: string }[]>([]);
  const [shareRecipientsValid, setShareRecipientsValid] = useState(false);
  const [shareRecipientsError, setShareRecipientsError] = useState('');
  const [shareRecipientsLoading, setShareRecipientsLoading] = useState(false);
  
  // Shared files state (files shared with current user)
  const [sharedWithMe, setSharedWithMe] = useState<FileData[]>([]);
  // Add state for store privacy (simplified: public by default, or private)
  const [storePrivate, setStorePrivate] = useState(false);
  
  // Add state for search
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const [profileSearchResults, setProfileSearchResults] = useState<{ username: string; profile_public: boolean }[]>([]);
  const [showProfileSearch, setShowProfileSearch] = useState(false);
  
  // Add state for recipient management
  const [showRecipientManager, setShowRecipientManager] = useState(false);
  const [newRecipientInput, setNewRecipientInput] = useState('');
  const [newRecipientValid, setNewRecipientValid] = useState(false);
  const [newRecipientError, setNewRecipientError] = useState('');
  const [resolvedNewRecipient, setResolvedNewRecipient] = useState<{ address: string, username?: string } | null>(null);
  const [addingRecipients, setAddingRecipients] = useState(false);
  const [addingRecipientsProgress, setAddingRecipientsProgress] = useState(0);
  const [addingRecipientsStage, setAddingRecipientsStage] = useState('');

  // Add state for profile settings
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profilePublic, setProfilePublic] = useState(true);
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  
  // Add state to prevent username popup flash
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Validate multiple recipients on change (with debounce)
  useEffect(() => {
    const inputValue = shareRecipients.trim();
    let cancelled = false;
    
    // Debounce the validation to reduce API calls
    const timeoutId = setTimeout(async () => {
      if (!inputValue) {
        setShareRecipientsValid(false);
        setShareRecipientsError('');
        setResolvedRecipients([]);
        setShareRecipientsLoading(false);
        return;
      }
      
      setShareRecipientsLoading(true);
      
      // Split by commas, semicolons, or newlines
      const recipientInputs = inputValue
        .split(/[,;\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      if (recipientInputs.length === 0) {
        setShareRecipientsValid(false);
        setShareRecipientsError('Enter at least one recipient');
        setResolvedRecipients([]);
        setShareRecipientsLoading(false);
        return;
      }
      
      if (recipientInputs.length > 10) {
        setShareRecipientsValid(false);
        setShareRecipientsError('Maximum 10 recipients allowed');
        setResolvedRecipients([]);
        setShareRecipientsLoading(false);
        return;
      }
      
      const resolved: { address: string, username?: string }[] = [];
      const errors: string[] = [];
      
      for (const input of recipientInputs) {
        if (cancelled) return;
        
        const inputLower = input.toLowerCase();
        
        // Username flow (@username)
        if (input.startsWith('@')) {
          const username = input.slice(1);
          if (!username) {
            errors.push(`Invalid username: ${input}`);
            continue;
          }
          
          const { data } = await supabase
            .from('usernames')
            .select('address')
            .eq('username', username)
            .single();
          
          if (!data) {
            errors.push(`Username not found: @${username}`);
          } else {
            resolved.push({ address: data.address.toLowerCase(), username });
          }
        } else {
          // Address flow (0x...)
          const isAddress = /^0x[a-f0-9]{40}$/.test(inputLower);
          if (!isAddress) {
            errors.push(`Invalid format: ${input} (use @username or 0x address)`);
            continue;
          }
          
          // Check if address is registered and get username
          const { data } = await supabase
            .from('usernames')
            .select('username')
            .eq('address', inputLower)
            .single();
          
          if (data && data.username) {
            // Address is registered - include username
            resolved.push({ address: inputLower, username: data.username });
          } else {
            // Address is not registered yet - still allow sharing
            resolved.push({ address: inputLower });
          }
        }
      }
      
      if (cancelled) return;
      
      // Check for duplicates
      const addresses = resolved.map(r => r.address);
      const uniqueAddresses = [...new Set(addresses)];
      if (addresses.length !== uniqueAddresses.length) {
        errors.push('Duplicate recipients found');
      }
      
      if (errors.length > 0) {
        setShareRecipientsValid(false);
        setShareRecipientsError(errors.join(', '));
        setResolvedRecipients([]);
      } else {
        setShareRecipientsValid(true);
        setShareRecipientsError('');
        setResolvedRecipients(resolved);
      }
      
      setShareRecipientsLoading(false);
    }, 500); // 500ms debounce
    
    return () => { 
      cancelled = true; 
      clearTimeout(timeoutId);
    };
  }, [shareRecipients]);



  // Validate new recipient input for adding recipients
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
      // Username flow
      if (inputValue.startsWith('@')) {
        const username = inputValue.slice(1);
        if (!username) {
          setNewRecipientValid(false);
          setNewRecipientError('Enter a username after @');
          setResolvedNewRecipient(null);
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
        return;
      }
      // Address flow (0x...)
      const isAddress = /^0x[a-f0-9]{40}$/.test(inputLower);
      if (!isAddress) {
        setNewRecipientValid(false);
        setNewRecipientError('Enter a valid @username or 0x address');
        setResolvedNewRecipient(null);
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
    }
    doNewRecipientLookup();
    return () => { cancelled = true; };
  }, [newRecipientInput]);



  // Fetch username from Supabase after wallet connect
  useEffect(() => {
    const fetchUsername = async () => {
      if (!address) return;
      const normalizedAddress = address.toLowerCase().trim();
      console.log('Original MetaMask address:', address);
      console.log('Normalized address for database:', normalizedAddress);
      setUsernameLoading(true);
      setUsernameError('');
      setUsernameSaved(false);
      setSupabase406(false);
      const { data, error } = await supabase
        .from('usernames')
        .select('username')
        .eq('address', normalizedAddress)
        .single();
      if (error) {
        if (error.code === '406') setSupabase406(true);
        setUsernameError('Error fetching username');
      } else if (data && data.username) {
        setUsername(data.username);
        setUsernameSaved(true);
      } else {
        setUsername('');
        setUsernameSaved(false);
      }
      setUsernameLoading(false);
      setInitialLoadComplete(true);
    };
    fetchUsername();
  }, [address]);

  // Query My Files and Shared Files using RPC function
  useEffect(() => {
    if (!address) return;
    
    const normalizedAddress = address.toLowerCase().trim();
    console.log('Fetching files for address:', normalizedAddress);
    
    supabase.rpc('get_user_files', { user_address: normalizedAddress })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching files:', error);
          return;
        }
        
        console.log('Raw data from get_user_files:', data);
        console.log('Raw data length:', data?.length || 0);
        
        // Separate owned files from shared files
        const ownedFiles = data?.filter((file: FileData) => file.is_owned) || [];
        const sharedFiles = data?.filter((file: FileData) => !file.is_owned) || [];
        
        console.log('Owned files count:', ownedFiles.length);
        console.log('Shared files count:', sharedFiles.length);
        console.log('Owned files:', ownedFiles);
        console.log('Shared files:', sharedFiles);
        
        // Debug: Check if any files have is_owned property
        if (data && data.length > 0) {
          console.log('Sample file data:', data[0]);
          console.log('is_owned property exists:', 'is_owned' in data[0]);
          console.log('is_owned value:', data[0].is_owned);
        }
        
        setMyFiles(ownedFiles);
        setSharedWithMe(sharedFiles);
      });
  }, [address, uploading]);



  // Add separate preview functions for different file types
  const previewEncryptedFile = useCallback(async (file: FileData, _cacheKey: string, onProgress: (progress: number, stage: string) => void) => {
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
    
    // TEMPORARILY DISABLED: Cache the result
    // setPreviewCache(prev => new Map(prev).set(cacheKey, blobUrl));
    
    onProgress(100, 'Complete!');
    return blobUrl;
  }, [address]);

  const previewPublicFile = async (file: FileData, cacheKey: string, onProgress: (progress: number, stage: string) => void) => {
    console.log('Loading public file...');
    onProgress(25, 'Loading file...');
    
    // Extract transaction ID from file_url
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
    
    // Cache the result
    setPreviewCache(prev => new Map(prev).set(cacheKey, blobUrl));
    
    onProgress(100, 'Complete!');
    return blobUrl;
  };

  // Automatically fetch the latest file from Irys Gateway when popup opens
  useEffect(() => {
    if (!selectedFile) {
      setPreviewBlobUrl(null);
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
    setPreviewBlobUrl(null);
    setPreviewProgress(0);
    setPreviewStage('');
    
    const loadFile = async () => {
      try {
        // Check cache first
        const cacheKey = selectedFile.file_url;
        if (previewCache.has(cacheKey)) {
          console.log('Using cached preview for:', cacheKey);
          setPreviewBlobUrl(previewCache.get(cacheKey)!);
          setPreviewLoading(false);
          setPreviewProgress(100);
          setPreviewStage('Complete! (Cached)');
          return;
        }

        if (selectedFile.is_encrypted) {
          // Handle encrypted files
          console.log('Loading encrypted file...');
          setPreviewStage('Decrypting file...');
          setPreviewProgress(10);
                      try {
              const blobUrl = await previewEncryptedFile(selectedFile, selectedFile.file_url, (progress, stage) => {
                if (!cancelled) {
                  setPreviewProgress(progress);
                  setPreviewStage(stage);
                }
              });
              if (cancelled) return;
              setPreviewBlobUrl(blobUrl);
              
              // Cache the decrypted file
              previewCache.set(selectedFile.file_url, blobUrl);
              
              setPreviewLoading(false);
              setPreviewProgress(100);
              setPreviewStage('Complete!');
            } catch (decryptError) {
            console.error('Decryption error details:', decryptError);
            
            // Provide more specific error messages
            let errorMessage = 'Decryption failed';
            if (decryptError instanceof Error) {
              if (decryptError.message.includes('timeout')) {
                errorMessage = 'Decryption timed out - file may be too large or corrupted';
              } else if (decryptError.message.includes('atob') || decryptError.message.includes('base64')) {
                errorMessage = 'File appears to be corrupted - encryption data is invalid';
              } else if (decryptError.message.includes('permission') || decryptError.message.includes('access')) {
                errorMessage = 'Access denied - you may not have permission to decrypt this file';
              } else {
                errorMessage = `Decryption failed: ${decryptError.message}`;
              }
            }
            
            throw new Error(errorMessage);
          }
        } else {
          // Handle regular files
          const blobUrl = await previewPublicFile(selectedFile, selectedFile.file_url, (progress, stage) => {
            if (!cancelled) {
              setPreviewProgress(progress);
              setPreviewStage(stage);
            }
          });
          if (cancelled) return;
          setPreviewBlobUrl(blobUrl);
          
          // Cache the public file
          previewCache.set(selectedFile.file_url, blobUrl);
          
          setPreviewLoading(false);
          setPreviewProgress(100);
          setPreviewStage('Complete!');
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading file:', error);
        setPreviewError(selectedFile.is_encrypted ? 
          'Error decrypting file. Make sure you have the right permissions.' : 
          'Error fetching file from Irys Gateway.');
        setPreviewLoading(false);
        setPreviewProgress(0);
        setPreviewStage('');
      }
    };
    
    loadFile();
    
    return () => {
      cancelled = true;
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [selectedFile, previewCache, previewEncryptedFile, previewBlobUrl]);

  // Add ESC key handler for closing preview popup
  useEffect(() => {
    if (!selectedFile) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedFile(null);
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedFile]);

  // Add missing fetch functions


  // Save username to Supabase and auto-approve
  const handleSaveUsername = async () => {
    if (!username) {
      setUsernameError('Username is required');
      return;
    }
    if (!address) {
      setUsernameError('Wallet address is required');
      return;
    }
    
    const normalizedAddress = address.toLowerCase().trim();
    setUsernameLoading(true);
    setUsernameError('');
    setUsernameSaved(false);
    setSupabase406(false);
    
    try {
      // No signature needed for database writes with proper RLS
      
      // Check if username is taken
      const { data: existing, error: checkError } = await supabase
        .from('usernames')
        .select('id')
        .eq('username', username)
        .single();
        
      if (checkError && checkError.code === '406') {
        setSupabase406(true);
        setUsernameError('Supabase 406 error. Check your table RLS policies.');
        setUsernameLoading(false);
        return;
      }
      
      if (existing) {
        setUsernameError('Username is already taken');
        setUsernameLoading(false);
        return;
      }
      
      // Insert or update username (always save address in lowercase)
      const { error } = await supabase
        .from('usernames')
        .upsert([{ address: normalizedAddress, username }], { onConflict: 'address' });
        
      if (error) {
        if (error.code === '406') setSupabase406(true);
        setUsernameError('Error saving username');
        setUsernameSaved(false);
      } else {
        console.log('Username saved successfully');
        setUsernameError('');
        setUsernameSaved(true);
        // Automatically approve user after successful registration
        try {
          await fetch('http://localhost:3001/api/approve-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress: normalizedAddress })
          });
          console.log('Approval request sent for', normalizedAddress);
        } catch (e) {
          console.error('Failed to auto-approve user:', e);
        }
      }
    } catch (error) {
      console.error('Username save exception:', error);
      if (error instanceof Error && error.message?.includes('User rejected')) {
        setUsernameError('Username registration cancelled - signature rejected');
      } else {
        setUsernameError('Error saving username');
      }
      setUsernameSaved(false);
    } finally {
      setUsernameLoading(false);
    }
  };

  // File upload logic
  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }
    
    // Check file size limit (25MB for all files)
    const maxFileSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxFileSize) {
      alert(`File too large. Maximum size is 25MB. Current file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }
    
    // Check storage limit (12GB free per user) - make this optional to prevent upload failures
    try {
      const maxStorageBytes = 12 * 1024 * 1024 * 1024; // 12GB
      const { data: storageData, error: storageError } = await supabase
        .from('user_storage')
        .select('total_used_bytes')
        .eq('address', address!.toLowerCase().trim())
        .single();
      
      if (storageError && storageError.code === '406') {
        console.warn('Supabase 406 error on storage check, continuing without storage limit');
      } else if (storageError) {
        console.warn('Storage check failed, continuing without storage limit:', storageError);
      } else {
        const currentUsed = storageData?.total_used_bytes || 0;
        const newTotal = currentUsed + file.size;
        
        if (newTotal > maxStorageBytes) {
          const usedGB = (currentUsed / 1024 / 1024 / 1024).toFixed(2);
          const fileGB = (file.size / 1024 / 1024 / 1024).toFixed(2);
          alert(`Storage limit exceeded. You have used ${usedGB}GB of 12GB. This file (${fileGB}GB) would exceed your limit.`);
          return;
        }
      }
    } catch (error) {
      console.warn('Storage check failed, continuing without storage limit:', error);
    }
    
    if (selectedAction === 'share' && resolvedRecipients.length === 0) {
      alert("Please enter at least one valid @username or address to share with.");
      return;
    }
    if (!address) {
      alert("Wallet address is required.");
      return;
    }
    
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    setUploadStage('');
    
    try {
      let result;
      
      if (selectedAction === 'share' || (selectedAction === 'store' && storePrivate)) {
        // Use Lit Protocol for encryption (both sharing and private storage)
        setUploadStage('Encrypting file with Lit Protocol...');
        console.log('Starting Lit Protocol encryption for file:', file.name, 'Size:', file.size);
        
        try {
          // Convert file to ArrayBuffer
          const fileBuffer = await file.arrayBuffer();
          
          if (selectedAction === 'share' && resolvedRecipients.length > 0) {
            // Share with multiple recipients
            const recipientAddresses = resolvedRecipients.map(r => r.address);
            console.log('Sharing with recipients:', recipientAddresses);
            
            result = await uploadEncryptedToIrys(
              fileBuffer,
              file.name,
              file.type,
              address!,
              recipientAddresses,
              (progress) => {
                setUploadProgress(progress);
                setUploadStage(`Encrypting and uploading file for ${resolvedRecipients.length} recipient(s)... ${Math.round(progress)}%`);
              }
            );
            console.log('Lit Protocol encryption and upload completed successfully for sharing with', resolvedRecipients.length, 'recipients');
          } else {
            // Private store - encrypt for owner only
            result = await uploadEncryptedToIrys(
              fileBuffer,
              file.name,
              file.type,
              address!,
              [], // No recipients = private file
              (progress) => {
                setUploadProgress(progress);
                setUploadStage(`Encrypting and uploading private file... ${Math.round(progress)}%`);
              }
            );
            console.log('Lit Protocol encryption and upload completed successfully for private store');
          }
        } catch (encryptError) {
          console.error('Lit Protocol encryption/upload error:', encryptError);
          throw new Error(`Encryption failed: ${encryptError instanceof Error ? encryptError.message : 'Unknown error'}`);
        }
      } else {
        // Store file normally (public, no encryption)
        setUploadStage('Uploading public file...');
        setUploadProgress(25);
        
      const irysUploader = await getIrysUploader();
      const tags = [
          { name: "Content-Type", value: file.type || "application/octet-stream" },
        { name: "App-Name", value: "IryShare" },
        { name: "File-Name", value: file.name },
      ];
        
        result = await uploadFile(irysUploader, file, tags);
      }
      
      setUploadStage('Saving metadata...');
      setUploadProgress(75);
      
      // Save file metadata to Supabase using new schema
      const fileMeta = {
        owner_address: address.toLowerCase().trim(),
        file_url: result,
        file_name: file.name,
        tags: selectedAction === 'share' ? resolvedRecipients.map(r => r.username || r.address) : [],
        is_encrypted: selectedAction === 'share' || (selectedAction === 'store' && storePrivate),
        file_size_bytes: file.size,
        is_public: selectedAction === 'store' && !storePrivate,
        profile_visible: true,
        file_type: file.type || 'application/octet-stream'
      };
      
      // Insert the file record
      const { data: fileData, error: insertError } = await supabase
        .from('files')
        .insert([fileMeta])
        .select()
        .single();
        
      if (insertError) {
        console.error('Error saving file metadata:', insertError);
        throw new Error('Failed to save file metadata to database');
      }
      
      console.log('File metadata saved successfully');
      
      // If sharing, create file share records for each recipient
      if (selectedAction === 'share' && resolvedRecipients.length > 0 && fileData) {
        const shareRecords = resolvedRecipients.map(recipient => ({
          file_id: fileData.id,
          recipient_address: recipient.address.toLowerCase().trim(),
            recipient_username: recipient.username || null
          }));
          
        const { error: shareError } = await supabase
          .from('file_shares')
          .insert(shareRecords);
          
        if (shareError) {
          console.error('Error saving file shares:', shareError);
          throw new Error('Failed to save file share records');
        }
        
        console.log('File shares saved for', resolvedRecipients.length, 'recipients');
      }
      
      setUploadProgress(100);
      setUploadStage('Upload complete!');
      
      // Reset form
      setFile(null);
      setSelectedAction('');
      setShareRecipients('');
      setResolvedRecipients([]);
      setStorePrivate(false);
      
      // Refresh file lists - handled by useEffect
      
      console.log('Upload completed successfully:', result);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
      setUploadStage('');
    } finally {
      setUploading(false);
    }
  };

  // Handle adding new recipients to a shared file
  const handleAddRecipients = async () => {
    if (!selectedFile || !resolvedNewRecipient || !address) {
      alert('Please select a file and enter a valid recipient.');
      return;
    }
    
    setAddingRecipients(true);
    setAddingRecipientsProgress(0);
    setAddingRecipientsStage('Preparing to add recipient...');
    
    try {
      // Get current recipients for this file using the new schema
      const { data: existingShares, error: sharesError } = await supabase
        .from('file_shares')
        .select('recipient_address')
        .eq('file_id', selectedFile.id);

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
        selectedFile.file_url,
        allRecipients,
        selectedFile.owner_address
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
        .eq('id', selectedFile.id);

      if (updateFileError) {
        console.error('Error updating file URL:', updateFileError);
        throw new Error('Failed to update file URL in database');
      }

      // Add the new recipient to file_shares table
      const { error: addShareError } = await supabase
        .from('file_shares')
        .insert({
          file_id: selectedFile.id,
          recipient_address: resolvedNewRecipient.address.toLowerCase(),
          recipient_username: resolvedNewRecipient.username || null
        });

      if (addShareError) {
        console.error('Error adding file share:', addShareError);
        throw new Error('Failed to add recipient to file shares');
      }

            console.log('Successfully added recipient:', resolvedNewRecipient.address);
      
      // Clear preview cache for this file
      if (selectedFile) {
        previewCache.delete(selectedFile.file_url);
      }
      
      // Refresh the files list - handled by useEffect
      
      setAddingRecipientsProgress(100);
      setAddingRecipientsStage('Recipient added successfully!');
      
      // Reset form
      setNewRecipientInput('');
      setResolvedNewRecipient(null);
      setNewRecipientValid(false);
      setNewRecipientError('');
      setShowRecipientManager(false);
      
    } catch (error) {
      console.error('Error adding recipient:', error);
      alert(`Failed to add recipient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAddingRecipients(false);
      setAddingRecipientsProgress(0);
      setAddingRecipientsStage('');
    }
  };

  // File preview helpers
  function isImage(file: FileData) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return (
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.gif') ||
      name.endsWith('.bmp') ||
      name.endsWith('.webp') ||
      (contentType && contentType.startsWith('image/'))
    );
  }
  function isPDF(file: FileData) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return name.endsWith('.pdf') || (contentType && contentType === 'application/pdf');
  }
  function isVideo(file: FileData) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return (
      name.endsWith('.mp4') ||
      name.endsWith('.webm') ||
      name.endsWith('.mov') ||
      name.endsWith('.avi') ||
      (contentType && contentType.startsWith('video/'))
    );
  }
  function isAudio(file: FileData) {
    const name = file?.file_name?.toLowerCase() || '';
    const contentType = getTagValue(Array.isArray(file.tags) ? file.tags : [], 'Content-Type');
    return (
      name.endsWith('.mp3') ||
      name.endsWith('.wav') ||
      name.endsWith('.ogg') ||
      name.endsWith('.flac') ||
      (contentType && contentType.startsWith('audio/'))
    );
  }

  // Helper to get file extension from tags
  function getTagValue(tags: string[] | string, tagName: string): string | undefined {
    if (Array.isArray(tags)) {
      const tag = tags.find((t) => t && typeof t === 'string' && t.startsWith(`${tagName}:`));
      return tag ? tag.split(':').slice(1).join(':').trim() : undefined;
  }
    if (typeof tags === 'string') {
      if (tags.startsWith(`${tagName}:`)) {
        return tags.split(':').slice(1).join(':').trim();
      }
    }
    return undefined;
  }

  // Helper to get all recipients from tags
  function getAllRecipientsFromTags(tags: string[] | string): Array<{address: string, username?: string}> {
    const recipients: Array<{address: string, username?: string}> = [];
    
    if (Array.isArray(tags)) {
      tags.forEach(tag => {
        if (tag && typeof tag === 'string' && tag.startsWith('Recipient:')) {
          const parts = tag.split(':');
          if (parts.length >= 2) {
            const address = parts[1];
            const username = parts.length >= 3 ? parts[2] : undefined;
            recipients.push({ address, username });
          }
        }
      });
    } else if (typeof tags === 'string' && tags.startsWith('Recipient:')) {
      const parts = tags.split(':');
      if (parts.length >= 2) {
        const address = parts[1];
        const username = parts.length >= 3 ? parts[2] : undefined;
        recipients.push({ address, username });
      }
    }
    
    return recipients;
  }

  // Show username popup if user is connected, initial load is complete, and username is not saved
  const showUsernamePopup = isConnected && address && initialLoadComplete && !usernameSaved;

  // Load profile settings
  useEffect(() => {
    // Profile settings functionality removed - columns don't exist in current schema
    // loadProfileSettings();
  }, [address]);

  // Profile settings functionality removed - columns don't exist in current schema
  // const handleSaveProfileSettings = async () => { ... };

  // Reset store privacy when action changes
  useEffect(() => {
    setStorePrivate(false);
  }, [selectedAction]);

  // Clean real-time listeners for profile and file changes
  useEffect(() => {
    if (!address) return;

    // Listen only for our own profile changes
    const profileSubscription = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'usernames',
          filter: `address=eq.${address.toLowerCase().trim()}`
        },
        (payload) => {
          if (payload.new) {
            const newData = payload.new as Record<string, unknown>;
            setProfilePublic((newData.profile_public as boolean) ?? true);
            setProfileBio((newData.profile_bio as string) ?? '');
            setProfileAvatar((newData.profile_avatar as string) ?? '');
          }
        }
      )
      .subscribe();

    // Listen only for our own file changes
    const filesSubscription = supabase
      .channel('files_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `owner_address=eq.${address.toLowerCase().trim()}`
        },
        () => {
          // Refresh files list - handled by useEffect
        }
      )
      .subscribe();

    // Listen for files shared with us
    const sharedFilesSubscription = supabase
      .channel('shared_files_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'file_shares',
          filter: `recipient_address=eq.${address.toLowerCase().trim()}`
        },
        () => {
          // Refresh shared files list - handled by useEffect
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      profileSubscription.unsubscribe();
      filesSubscription.unsubscribe();
      sharedFilesSubscription.unsubscribe();
    };
  }, [address]);

  // Profile search function removed - profile_public column doesn't exist
  // const searchProfiles = async (query: string) => { ... };

  // Filter files by search query and type
  const filteredMyFiles = myFiles.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = fileTypeFilter === 'all' || 
      (fileTypeFilter === 'images' && isImage(file)) ||
      (fileTypeFilter === 'documents' && isPDF(file)) ||
      (fileTypeFilter === 'videos' && isVideo(file)) ||
      (fileTypeFilter === 'audio' && isAudio(file)) ||
      (fileTypeFilter === 'encrypted' && file.is_encrypted);
    
    return matchesSearch && matchesType;
  });

  const filteredSharedFiles = sharedWithMe.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = fileTypeFilter === 'all' || 
      (fileTypeFilter === 'images' && isImage(file)) ||
      (fileTypeFilter === 'documents' && isPDF(file)) ||
      (fileTypeFilter === 'videos' && isVideo(file)) ||
      (fileTypeFilter === 'audio' && isAudio(file)) ||
      (fileTypeFilter === 'encrypted' && file.is_encrypted);
    
    return matchesSearch && matchesType;
  });

  // --- UI Rendering ---
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl text-white" style={{ fontFamily: 'Irys' }}>IRYSHARE</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={onLogout}
              className="text-[#67FFD4] hover:text-[#8AFFE4] transition-colors"
              style={{ fontFamily: 'Irys2' }}
            >
              Logout
            </button>


            {isConnected && address && usernameSaved && (
              <>
                <button
                  onClick={() => setShowProfileSearch(true)}
                  className="text-[#67FFD4] hover:text-[#8AFFE4] transition-colors"
                  title="Search Profiles"
                  style={{ fontFamily: 'Irys2' }}
                >
                  🔍 Search
                </button>
                <button
                  onClick={() => setShowProfileSettings(true)}
                  className="text-[#67FFD4] hover:text-[#8AFFE4] transition-colors"
                  title="Profile Settings"
                  style={{ fontFamily: 'Irys2' }}
                >
                  ⚙️ Profile
                </button>
              </>
            )}
          <ConnectButton />
          </div>
        </div>

        {/* Username Popup (blocks app until username is set) */}
        {showUsernamePopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              background: '#111',
              border: '2px solid #67FFD4',
              borderRadius: 16,
              padding: 32,
              minWidth: 320,
              maxWidth: 400,
              boxShadow: '0 0 24px #67FFD4',
              textAlign: 'center',
            }}>
              <h2 style={{ color: '#67FFD4', fontFamily: 'Irys2', marginBottom: 16 }}>Set Your Username</h2>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameSaved(false);
                }}
                placeholder="Enter your username"
                className="bg-[#222] border border-[#67FFD4] text-white p-2 rounded-lg w-full mt-2 mb-4"
                disabled={usernameLoading}
                autoFocus
              />
              <button
                className="btn-irys mt-2 w-full"
                onClick={handleSaveUsername}
                disabled={usernameLoading}
                style={{ background: '#67FFD4', color: '#111', fontWeight: 'bold', borderRadius: 8, padding: '10px 0', fontFamily: 'Irys2' }}
              >
                {usernameLoading ? 'Saving...' : 'Save'}
              </button>
              {usernameError && (
                <div className="text-red-400 mt-2" style={{ color: '#FF5555', marginTop: 12 }}>{usernameError}</div>
              )}
              {supabase406 && (
                <div className="text-red-400 mt-2" style={{ color: '#FF5555', marginTop: 12 }}>
                  Supabase 406 error. Please check your table RLS policies.<br />
                  <a href="https://supabase.com/docs/guides/auth/row-level-security" target="_blank" rel="noopener noreferrer" style={{ color: '#67FFD4', textDecoration: 'underline' }}>How to fix</a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Only show file features if username is set and connected */}
        {isConnected && address && usernameSaved && (
          <>
            <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-6 mb-6">
              <h2 className="text-2xl mb-4 text-white" style={{ fontFamily: 'Irys2' }}>UPLOAD FILES</h2>
              <div className="mb-6">
                <label className="text-white block mb-2" style={{ fontFamily: 'Irys2' }}>SELECT ACTION</label>
                <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)} className="bg-[#222] border border-[#67FFD4] text-white p-2 rounded-lg w-full" style={{ fontFamily: 'Irys2' }}>
                  <option value="">Choose what you want to do...</option>
                  <option value="share">Share Files with Others</option>
                  <option value="store">Store Files in My Storage</option>
                </select>
              </div>
              {selectedAction && (
                <div>
                  {selectedAction === 'share' && (
                    <div className="mb-6">
                      <label className="text-white block mb-2" style={{ fontFamily: 'Irys2' }}>SHARE WITH MULTIPLE RECIPIENTS</label>
                      <textarea
                        value={shareRecipients}
                        onChange={e => setShareRecipients(e.target.value)}
                        placeholder="Enter @username or 0x...address (separate with commas, semicolons, or newlines)&#10;Examples:&#10;@user1, @user2&#10;0x1234...5678, 0xabcd...efgh&#10;@user1, 0x1234...5678 (mix usernames and addresses)"
                        className="bg-[#222] border border-[#67FFD4] text-white p-2 rounded-lg w-full mb-2"
                        rows={4}
                        autoFocus
                        style={{ fontFamily: 'Irys2', fontSize: 14 }}
                      />
                      {shareRecipientsLoading && (
                        <div className="text-[#67FFD4] text-sm mb-1">Validating recipients...</div>
                      )}
                      {shareRecipientsError && (
                        <div className="text-red-400 mt-1" style={{ color: '#FF5555' }}>{shareRecipientsError}</div>
                      )}
                      {resolvedRecipients.length > 0 && (
                        <div className="text-[#67FFD4] text-sm mb-1">
                          <strong>Validated Recipients ({resolvedRecipients.length}):</strong>
                          <div className="mt-1">
                            {resolvedRecipients.map((recipient, index) => (
                              <div key={index} className="ml-2">
                                • {recipient.username ? `@${recipient.username}` : recipient.address}
                                {!recipient.username && (
                                  <span className="text-gray-400 ml-1">(address - will receive when registered)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-sm text-[#67FFD4]" style={{ fontFamily: 'IrysItalic' }}>
                        Files will be encrypted and shared privately with all recipients. Maximum 10 recipients. Unregistered addresses will receive files once they register.
                      </p>
                    </div>
                  )}
                  
                  {selectedAction === 'store' && (
                    <div className="mb-6">
                      <label className="text-white block mb-2" style={{ fontFamily: 'Irys2' }}>STORE PRIVACY</label>
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id="storePrivate"
                          checked={storePrivate}
                          onChange={(e) => setStorePrivate(e.target.checked)}
                          className="mr-3 w-4 h-4 text-[#67FFD4] bg-[#222] border-[#67FFD4] rounded focus:ring-[#67FFD4] focus:ring-2"
                        />
                        <label htmlFor="storePrivate" className="text-white text-sm" style={{ fontFamily: 'Irys2' }}>
                          Store as private (encrypted with Lit Protocol)
                        </label>
                  </div>
                      <p className="text-sm text-[#67FFD4]" style={{ fontFamily: 'IrysItalic' }}>
                        {storePrivate ? 
                          'File will be encrypted and only you can decrypt it' : 
                          'File will be stored publicly and accessible to anyone'
                        }
                      </p>
                      
                      {/* Public file info */}
                      {!storePrivate && (
                        <div className="mt-4 p-3 bg-[#222] rounded-lg border border-[#67FFD4]">
                          <p className="text-sm text-[#67FFD4]" style={{ fontFamily: 'IrysItalic' }}>
                            ✅ File will be public and visible on your profile
                          </p>
                    </div>
                  )}
                    </div>
                  )}
                  {/* No recipient UI for store-public or store-private */}
                  <div className="mb-6">
                    <label className="text-white block mb-2" style={{ fontFamily: 'Irys2' }}>SELECT FILE</label>
                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-white" />
                  {file && (
                      <div className="mt-2 p-3 bg-[#222] rounded-lg border border-[#67FFD4]">
                        <p className="text-sm text-white mb-1">
                          <strong>File:</strong> {file.name}
                        </p>
                        <p className="text-sm text-white mb-1">
                          <strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)}MB
                        </p>
                                                  {(selectedAction === 'share' || (selectedAction === 'store' && storePrivate)) && (
                            <p className="text-sm text-[#67FFD4] mb-1">
                              <strong>Encrypted size:</strong> ~{((file.size * 1.05) / 1024 / 1024).toFixed(2)}MB
                            </p>
                          )}
                                              <p className="text-xs text-gray-400">
                      Will use regular upload for speed
                    </p>
                      </div>
                    )}
                    <p className="text-sm text-[#67FFD4] mt-2" style={{ fontFamily: 'IrysItalic' }}>
                      ⚠️ Maximum file size: 25MB
                    </p>
                    <p className="text-sm text-[#67FFD4] mt-1" style={{ fontFamily: 'IrysItalic' }}>
                      💡 Regular upload for maximum speed and reliability
                    </p>
                    <p className="text-sm text-[#67FFD4] mt-1" style={{ fontFamily: 'IrysItalic' }}>
                      🔒 Encrypted files use Lit Protocol (decentralized access control)
                    </p>
                    <p className="text-sm text-[#67FFD4] mt-1" style={{ fontFamily: 'IrysItalic' }}>
                      ⚡ Dynamic access control without re-uploading files
                    </p>
                    <p className="text-sm text-[#67FFD4] mt-1" style={{ fontFamily: 'IrysItalic' }}>
                      📊 Simple and fast: All files use regular upload
                    </p>
                    <p className="text-sm text-[#67FFD4] mt-1" style={{ fontFamily: 'IrysItalic' }}>
                      ⚡ No chunking overhead - direct upload like CLI
                    </p>
                  </div>
                  <button
                    className="btn-irys"
                    onClick={handleUpload}
                    disabled={uploading || !file || (selectedAction === 'share' && !shareRecipientsValid)}
                  >
                                          {uploading ? (
                        selectedAction === 'share' || (selectedAction === 'store' && storePrivate) ? 'Encrypting & Uploading...' : 'Uploading...'
                      ) : 'Upload'}
                      </button>
                  
                  {/* Progress Bar */}
                  {uploading && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-[#67FFD4] mb-2">
                        <span>{uploadStage}</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-[#222] rounded-full h-2 border border-[#67FFD4]">
                        <div 
                          className="bg-[#67FFD4] h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {uploadError && (
                    <div className="text-red-400 mt-2">{uploadError}</div>
                  )}
                </div>
              )}
            </div>

            {/* My Files Section */}
            <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl text-white" style={{ fontFamily: 'Irys2' }}>MY FILES</h2>
                <button
                  className="btn-irys"
                  style={{ background: '#67FFD4', color: '#111', fontWeight: 'bold', borderRadius: 8, padding: '6px 18px', fontFamily: 'Irys2', fontSize: 16 }}
                  onClick={() => {
                    if (!address) return;
                    const normalizedAddress = address.toLowerCase().trim();
                    supabase.rpc('get_user_files', { user_address: normalizedAddress })
                      .then(({ data, error }) => {
                        if (error) {
                          console.error('Error refreshing files:', error);
                          return;
                        }
                        const ownedFiles = data?.filter((file: FileData) => file.is_owned) || [];
                        const sharedFiles = data?.filter((file: FileData) => !file.is_owned) || [];
                        setMyFiles(ownedFiles);
                        setSharedWithMe(sharedFiles);
                      });
                  }}
                >
                  Refresh
                </button>
            </div>
              
              {/* Search and Filter */}
              <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search files by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#222] border border-[#67FFD4] text-white p-2 rounded-lg w-full"
                    style={{ fontFamily: 'Irys2' }}
                  />
                </div>
                <div className="flex-shrink-0">
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => setFileTypeFilter(e.target.value)}
                    className="bg-[#222] border border-[#67FFD4] text-white p-2 rounded-lg"
                    style={{ fontFamily: 'Irys2' }}
                  >
                    <option value="all">All Types</option>
                    <option value="images">Images</option>
                    <option value="documents">Documents</option>
                    <option value="videos">Videos</option>
                    <option value="audio">Audio</option>
                    <option value="encrypted">Encrypted</option>
                  </select>
                </div>
              </div>
              
              {filteredMyFiles.length === 0 && (
                <p className="text-[#67FFD4] text-center py-8">
                  {myFiles.length === 0 ? 'No files uploaded yet.' : 'No files match your search.'}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMyFiles.map(file => (
                  <div
                    key={file.id}
                    className="bg-[#222] rounded-lg p-4 cursor-pointer hover:border-[#67FFD4] border-2 border-transparent transition"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedFile({
                      ...file,
                      tags: Array.isArray(file.tags) ? file.tags : [],
                    })}
                  >
                    <div className="mb-2 flex items-center justify-center" style={{ minHeight: 60 }}>
                      {isImage(file) ? (
                        <span className="text-[#67FFD4] text-2xl">🖼️</span>
                      ) : isPDF(file) ? (
                        <span className="text-[#67FFD4] text-2xl">📄</span>
                      ) : isVideo(file) ? (
                        <span className="text-[#67FFD4] text-2xl">🎬</span>
                      ) : isAudio(file) ? (
                        <span className="text-[#67FFD4] text-2xl">🎵</span>
                      ) : (
                        <span className="text-[#67FFD4] text-2xl">📁</span>
                      )}
                    </div>
                    <div className="text-white text-sm truncate">
                      {file.file_name}
                      {file.is_encrypted && (
                        <span className="ml-2 text-[#67FFD4]" title="Encrypted file">🔒</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(file.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shared With Me Section */}
            <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl text-white" style={{ fontFamily: 'Irys2' }}>SHARED WITH ME</h2>
                <button
                  className="btn-irys"
                  style={{ background: '#67FFD4', color: '#111', fontWeight: 'bold', borderRadius: 8, padding: '6px 18px', fontFamily: 'Irys2', fontSize: 16 }}
                  onClick={() => {
                    if (!address) return;
                    const normalizedAddress = address.toLowerCase().trim();
                    supabase.rpc('get_user_files', { user_address: normalizedAddress })
                      .then(({ data, error }) => {
                        if (error) {
                          console.error('Error refreshing files:', error);
                          return;
                        }
                        const ownedFiles = data?.filter((file: FileData) => file.is_owned) || [];
                        const sharedFiles = data?.filter((file: FileData) => !file.is_owned) || [];
                        setMyFiles(ownedFiles);
                        setSharedWithMe(sharedFiles);
                      });
                  }}
                >
                  Refresh
                </button>
              </div>
              
              {/* Search and Filter for Shared Files */}
              <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search shared files by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#222] border border-[#67FFD4] text-white p-2 rounded-lg w-full"
                    style={{ fontFamily: 'Irys2' }}
                  />
                </div>
                <div className="flex-shrink-0">
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => setFileTypeFilter(e.target.value)}
                    className="bg-[#222] border border-[#67FFD4] text-white p-2 rounded-lg"
                    style={{ fontFamily: 'Irys2' }}
                  >
                    <option value="all">All Types</option>
                    <option value="images">Images</option>
                    <option value="documents">Documents</option>
                    <option value="videos">Videos</option>
                    <option value="audio">Audio</option>
                    <option value="encrypted">Encrypted</option>
                  </select>
                </div>
              </div>
              
              {filteredSharedFiles.length === 0 && (
                <p className="text-[#67FFD4] text-center py-8">
                  {sharedWithMe.length === 0 ? 'No files shared with you yet.' : 'No files match your search.'}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSharedFiles.map(file => (
                  <div
                    key={file.id}
                    className="bg-[#222] rounded-lg p-4 cursor-pointer hover:border-[#67FFD4] border-2 border-transparent transition"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedFile({
                      ...file,
                      tags: Array.isArray(file.tags) ? file.tags : [],
                    })}
                  >
                    <div className="mb-2 flex items-center justify-center" style={{ minHeight: 60 }}>
                      {/* Use the same icon logic as My Files */}
                      {isImage(file) ? (
                        <span className="text-[#67FFD4] text-2xl">🖼️</span>
                      ) : isPDF(file) ? (
                        <span className="text-[#67FFD4] text-2xl">📄</span>
                      ) : isVideo(file) ? (
                        <span className="text-[#67FFD4] text-2xl">🎬</span>
                      ) : isAudio(file) ? (
                        <span className="text-[#67FFD4] text-2xl">🎵</span>
                      ) : (
                        <span className="text-[#67FFD4] text-2xl">📁</span>
                      )}
                    </div>
                    <div className="text-white text-sm truncate">
                      {file.file_name}
                      {file.is_encrypted && (
                        <span className="ml-2 text-[#67FFD4]" title="Encrypted file">🔒</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(file.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* File Preview Popup */}
            {selectedFile && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.7)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}>
                  {/* Left: Large Preview */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100vw',
                    height: '100vh',
                    pointerEvents: 'auto',
                  }}>
                    {previewLoading ? (
                      <div style={{ textAlign: 'center' }}>
                        <span className="text-[#67FFD4] text-xl mb-4 block">{previewStage}</span>
                        {/* Progress Bar for Preview */}
                        <div className="w-96 mx-auto mb-4">
                          <div className="flex justify-between text-sm text-[#67FFD4] mb-2">
                            <span>{previewStage}</span>
                            <span>{Math.round(previewProgress)}%</span>
                          </div>
                          <div className="w-full bg-[#222] rounded-full h-2 border border-[#67FFD4]">
                            <div 
                              className="bg-[#67FFD4] h-2 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${previewProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ) : previewError ? (
                      <span className="text-[#FF5555] text-xl">{previewError}</span>
                    ) : isImage(selectedFile) ? (
                      <img
                        src={previewBlobUrl || selectedFile.file_url}
                        alt={selectedFile.file_name}
                        onClick={() => setImageZoomed(!imageZoomed)}
                        style={{
                          maxWidth: imageZoomed ? '95vw' : '70vw',
                          maxHeight: imageZoomed ? '95vh' : '70vh',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          display: 'block',
                          margin: 'auto',
                          borderRadius: 16,
                          boxShadow: '0 0 32px #000a',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                        }}
                        title="Click to zoom in/out"
                      />
                    ) : isPDF(selectedFile) ? (
                      <iframe
                        src={previewBlobUrl || selectedFile.file_url}
                        title="PDF Preview"
                        style={{ width: 450, height: 600, border: 'none', background: '#fff', borderRadius: 16, maxWidth: '70vw', maxHeight: '70vh', boxShadow: '0 0 32px #000a' }}
                      />
                    ) : isVideo(selectedFile) ? (
                      <video
                        controls
                        src={previewBlobUrl || selectedFile.file_url}
                        style={{
                          maxWidth: '70vw',
                          maxHeight: '70vh',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          display: 'block',
                          margin: 'auto',
                          borderRadius: 16,
                          boxShadow: '0 0 32px #000a',
                        }}
                      />
                    ) : isAudio(selectedFile) ? (
                      <audio
                        controls
                        src={previewBlobUrl || selectedFile.file_url}
                        style={{
                          width: '100%',
                          maxWidth: 400,
                          margin: '0 auto',
                          display: 'block',
                          boxShadow: '0 0 32px #000a',
                        }}
                      />
                    ) : selectedFile.file_name?.match(/\.(docx?|pptx?|xlsx?|txt|md|json|xml|csv|log)$/i) ? (
                      <div style={{ textAlign: 'center' }}>
                        <p className="text-[#67FFD4] text-xl mb-4">
                          {selectedFile.is_encrypted ? 
                            'Text/Office docs are encrypted. Please download to view.' : 
                            'Preview not supported for this file type.'
                          }
                        </p>
                        {!selectedFile.is_encrypted && (
                          <>
                            <a
                              href={`https://docs.google.com/gview?url=${encodeURIComponent(selectedFile.file_url)}&embedded=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#67FFD4', textDecoration: 'underline', fontSize: 18, marginRight: 16 }}
                            >
                              Open in Google Docs Viewer
                            </a>
                            <a
                              href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(selectedFile.file_url)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#67FFD4', textDecoration: 'underline', fontSize: 18 }}
                            >
                              Open in Office Online
                            </a>
                          </>
                        )}
                      </div>
                    ) : selectedFile.file_size_bytes && selectedFile.file_size_bytes > 10 * 1024 * 1024 ? (
                      <div style={{ textAlign: 'center' }}>
                        <p className="text-[#67FFD4] text-xl mb-4">
                          Large file ({Math.round(selectedFile.file_size_bytes / 1024 / 1024)}MB). Please download to view.
                        </p>
                        <p className="text-[#67FFD4] text-sm mb-4">
                          Large encrypted files may take time to decrypt. If preview fails, use the download button.
                        </p>
                      </div>
                    ) : previewBlobUrl ? (
                      <span className="text-[#67FFD4] text-2xl">Preview not supported, but file fetched.</span>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <span className="text-[#67FFD4] text-2xl">No Preview</span>
                        <a
                          href={selectedFile.file_url}
                          download={selectedFile.file_name}
                          style={{
                            display: 'block',
                            marginTop: 24,
                            background: '#67FFD4',
                            color: '#111',
                            fontWeight: 'bold',
                            borderRadius: 10,
                            padding: '16px 0',
                            fontFamily: 'Irys2',
                            width: 200,
                            textAlign: 'center',
                            textDecoration: 'none',
                            fontSize: 18,
                            boxShadow: '0 0 12px #67FFD4',
                            marginLeft: 'auto',
                            marginRight: 'auto',
                          }}
                        >
                          Download
                        </a>
          </div>
                    )}
                  </div>
                  {/* Right: Details */}
                  <div style={{
                    flex: 1,
                    padding: 48,
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    background: 'rgba(17,17,17,0.8)',
                    pointerEvents: 'auto',
                  }}>
                    <h3 style={{ color: '#67FFD4', fontFamily: 'Irys2', fontSize: 28, marginBottom: 18 }}>{selectedFile.file_name}</h3>
                    <div style={{ fontSize: 18, marginBottom: 12 }}>
                      <b>Owner:</b> 
                      <span 
                        style={{ 
                          color: '#67FFD4', 
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          marginLeft: 8
                        }}
                        onClick={async () => {
                          try {
                            // Try to find username for this address
                            const { data } = await supabase
                              .from('usernames')
                              .select('username, profile_public')
                              .eq('address', selectedFile.owner_address)
                              .single();
                            
                            if (data) {
                                      // Profile navigation removed - simplified app
        console.log('Profile navigation removed');
                            } else {
                              // Copy address if no username found
                              await navigator.clipboard.writeText(selectedFile.owner_address);
                              alert('Address copied to clipboard!');
                            }
                          } catch {
                            // Copy address if error
                            await navigator.clipboard.writeText(selectedFile.owner_address);
                            alert('Address copied to clipboard!');
                          }
                        }}
                        title="Click to view profile or copy address"
                      >
                        {selectedFile.owner_address}
                      </span>
                    </div>
                    {/* Show all recipients from tags for owner's files */}
                    {selectedFile.owner_address === address?.toLowerCase() && (
                      (() => {
                        const allRecipients = getAllRecipientsFromTags(selectedFile.tags);
                        if (allRecipients.length > 0) {
                          return (
                            <div style={{ fontSize: 18, marginBottom: 12 }}>
                              <b>Shared with ({allRecipients.length}):</b>
                              <div style={{ marginLeft: 8, marginTop: 4 }}>
                                {allRecipients.map((recipient, index) => (
                                  <div key={index} style={{ marginBottom: 4 }}>
                                    <span 
                                      style={{ 
                                        color: '#67FFD4', 
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                      }}
                                      onClick={() => {
                                        navigator.clipboard.writeText(recipient.address);
                                        alert('Address copied to clipboard!');
                                      }}
                                      title="Click to copy address"
                                    >
                                      {recipient.username ? `@${recipient.username}` : recipient.address}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()
                    )}
                    
                    {/* Show single recipient for recipient's view */}
                    {selectedFile.recipient_address && selectedFile.owner_address !== address?.toLowerCase() && (
                      <div style={{ fontSize: 18, marginBottom: 12 }}>
                        <b>Shared with:</b> 
                        <span 
                          style={{ 
                            color: '#67FFD4', 
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            marginLeft: 8
                          }}
                          onClick={() => {
                            if (selectedFile.recipient_address) {
                            navigator.clipboard.writeText(selectedFile.recipient_address);
                            alert('Address copied to clipboard!');
                            }
                          }}
                          title="Click to copy address"
                        >
                          {selectedFile.recipient_address}
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: 18, marginBottom: 12 }}><b>Uploaded:</b> {new Date(selectedFile.created_at).toLocaleString()}</div>
                    <div style={{ fontSize: 18, marginBottom: 12 }}><b>Tags:</b> {selectedFile.tags}</div>
                    {selectedFile.is_encrypted && (
                      <div style={{ fontSize: 18, marginBottom: 12, color: '#67FFD4' }}>
                        <b>🔒 Encrypted File</b> - Decrypted for viewing
                      </div>
                    )}
                    
                    {/* Add Recipients Button - Only show for encrypted files owned by current user */}
                    {selectedFile.is_encrypted && selectedFile.owner_address === address?.toLowerCase() && (
                      <button
                        onClick={() => setShowRecipientManager(true)}
                        style={{
                          marginTop: 16,
                          background: '#222',
                          color: '#67FFD4',
                          border: '2px solid #67FFD4',
                          fontWeight: 'bold',
                          borderRadius: 10,
                          padding: '12px 20px',
                          fontFamily: 'Irys2',
                          fontSize: 16,
                          alignSelf: 'flex-end',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = '#67FFD4';
                          (e.currentTarget as HTMLElement).style.color = '#111';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = '#222';
                          (e.currentTarget as HTMLElement).style.color = '#67FFD4';
                        }}
                      >
                        ➕ Add Recipients
                      </button>
                    )}
                    
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
                      style={{
                        marginTop: 24,
                        background: '#67FFD4',
                        color: '#111',
                        fontWeight: 'bold',
                        borderRadius: 10,
                        padding: '16px 0',
                        fontFamily: 'Irys2',
                        width: 200,
                        alignSelf: 'flex-end',
                        textAlign: 'center',
                        textDecoration: 'none',
                        fontSize: 18,
                        boxShadow: '0 0 12px #67FFD4',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = '#8AFFE4';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px #8AFFE4';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = '#67FFD4';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px #67FFD4';
                      }}
                    >
                      Download {selectedFile.is_encrypted ? '(Decrypted)' : ''}
                    </button>
                    <button
                      onClick={() => setSelectedFile(null)}
                      style={{
                        marginTop: 16,
                        background: 'transparent',
                        color: '#67FFD4',
                        fontWeight: 'bold',
                        border: 'none',
                        fontFamily: 'Irys2',
                        fontSize: 22,
                        alignSelf: 'flex-end',
                        cursor: 'pointer',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = '#8AFFE4'}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = '#67FFD4'}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recipient Manager Popup */}
            {showRecipientManager && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.85)',
                zIndex: 3000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  background: '#111',
                  border: '2px solid #67FFD4',
                  borderRadius: 16,
                  padding: 32,
                  minWidth: 400,
                  maxWidth: 500,
                  boxShadow: '0 0 24px #67FFD4',
                }}>
                  <h2 style={{ color: '#67FFD4', fontFamily: 'Irys2', marginBottom: 24, textAlign: 'center' }}>
                    Add New Recipients
                  </h2>
                  
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: '#67FFD4', fontFamily: 'Irys2', display: 'block', marginBottom: 8 }}>
                      NEW RECIPIENT (@username or 0x...address)
                    </label>
                    <input
                      type="text"
                      value={newRecipientInput}
                      onChange={e => setNewRecipientInput(e.target.value)}
                      placeholder="Enter @username or 0x...address"
                      style={{
                        background: '#222',
                        border: '1px solid #67FFD4',
                        color: '#fff',
                        padding: '12px',
                        borderRadius: 8,
                        width: '100%',
                        fontFamily: 'Irys2',
                        fontSize: 14
                      }}
                      autoFocus
                    />
                    {newRecipientError && (
                      <div style={{ color: '#FF5555', fontSize: 14, marginTop: 4 }}>{newRecipientError}</div>
                    )}
                    {resolvedNewRecipient && resolvedNewRecipient.username && (
                      <div style={{ color: '#67FFD4', fontSize: 14, marginTop: 4 }}>
                        This address is registered as <b>@{resolvedNewRecipient.username}</b>
                      </div>
                    )}
                  </div>
                  
                  {addingRecipients && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ color: '#67FFD4', fontSize: 14, marginBottom: 8 }}>{addingRecipientsStage}</div>
                      <div style={{ background: '#222', borderRadius: 8, height: 8, border: '1px solid #67FFD4' }}>
                        <div 
                          style={{ 
                            background: '#67FFD4', 
                            height: '100%', 
                            borderRadius: 8, 
                            width: `${addingRecipientsProgress}%`,
                            transition: 'width 0.3s ease'
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button
                      onClick={handleAddRecipients}
                      disabled={addingRecipients || !newRecipientValid}
                      style={{
                        background: newRecipientValid ? '#67FFD4' : '#444',
                        color: newRecipientValid ? '#111' : '#666',
                        fontWeight: 'bold',
                        borderRadius: 8,
                        padding: '12px 24px',
                        fontFamily: 'Irys2',
                        fontSize: 16,
                        cursor: newRecipientValid ? 'pointer' : 'not-allowed',
                        border: 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      {addingRecipients ? 'Adding...' : 'Add Recipient'}
                    </button>
                    <button
                      onClick={() => {
                        setShowRecipientManager(false);
                        setNewRecipientInput('');
                        setResolvedNewRecipient(null);
                      }}
                      style={{
                        background: 'transparent',
                        color: '#67FFD4',
                        fontWeight: 'bold',
                        borderRadius: 8,
                        padding: '12px 24px',
                        fontFamily: 'Irys2',
                        fontSize: 16,
                        cursor: 'pointer',
                        border: '2px solid #67FFD4',
                        transition: 'all 0.2s'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Search Popup */}
            {showProfileSearch && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.85)',
                zIndex: 3000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  background: '#111',
                  border: '2px solid #67FFD4',
                  borderRadius: 16,
                  padding: 32,
                  minWidth: 500,
                  maxWidth: 600,
                  maxHeight: '90vh',
                  overflow: 'auto',
                  boxShadow: '0 0 24px #67FFD4',
                }}>
                  <h2 style={{ color: '#67FFD4', fontFamily: 'Irys2', marginBottom: 24, textAlign: 'center' }}>
                    Search Public Profiles
                  </h2>
                  
                  <div style={{ marginBottom: 20 }}>
                    <input
                      type="text"
                      value={profileSearchQuery}
                      onChange={(e) => {
                        setProfileSearchQuery(e.target.value);
                        searchProfiles(e.target.value);
                      }}
                      placeholder="Enter username to search..."
                      style={{
                        background: '#222',
                        border: '1px solid #67FFD4',
                        color: '#fff',
                        padding: '12px',
                        borderRadius: 8,
                        width: '100%',
                        fontFamily: 'Irys2',
                        fontSize: 16
                      }}
                      autoFocus
                    />
                  </div>
                  
                  {profileSearchResults.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ color: '#67FFD4', fontFamily: 'Irys2', marginBottom: 12 }}>
                        Found Profiles:
                      </h3>
                      <div style={{ maxHeight: 300, overflow: 'auto' }}>
                        {profileSearchResults.map((profile, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              console.log('Profile navigation removed');
                            }}
                            style={{
                              background: '#222',
                              border: '1px solid #67FFD4',
                              borderRadius: 8,
                              padding: '12px',
                              marginBottom: 8,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#333';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#222';
                            }}
                          >
                                                       <div style={{ color: '#67FFD4', fontFamily: 'Irys2', fontSize: 16 }}>
                             @{profile.username}
                             {!profile.profile_public && (
                               <span style={{ color: '#FF5555', marginLeft: 8 }}>🔒</span>
                             )}
                           </div>
                           <div style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>
                             {profile.profile_public ? 'Click to view profile' : 'Private profile - files hidden'}
                           </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {profileSearchQuery && profileSearchResults.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#67FFD4', fontFamily: 'Irys2' }}>
                      No public profiles found matching "{profileSearchQuery}"
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        setShowProfileSearch(false);
                        setProfileSearchQuery('');
                        setProfileSearchResults([]);
                      }}
                      style={{
                        background: 'transparent',
                        color: '#67FFD4',
                        fontWeight: 'bold',
                        borderRadius: 8,
                        padding: '12px 24px',
                        fontFamily: 'Irys2',
                        fontSize: 16,
                        cursor: 'pointer',
                        border: '2px solid #67FFD4',
                        transition: 'all 0.2s'
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Settings Popup */}
            {showProfileSettings && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.85)',
                zIndex: 3000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  background: '#111',
                  border: '2px solid #67FFD4',
                  borderRadius: 16,
                  padding: 32,
                  minWidth: 500,
                  maxWidth: 600,
                  maxHeight: '90vh',
                  overflow: 'auto',
                  boxShadow: '0 0 24px #67FFD4',
                }}>
                  <h2 style={{ color: '#67FFD4', fontFamily: 'Irys2', marginBottom: 24, textAlign: 'center' }}>
                    Profile Settings
                  </h2>
                  
                  {/* Profile Settings Notice */}
                  <div style={{ 
                    background: '#1a1a3a', 
                    border: '1px solid #67FFD4', 
                    borderRadius: 8, 
                    padding: 12, 
                    marginBottom: 20,
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#67FFD4', fontFamily: 'Irys2', fontSize: 14 }}>
                      ⚙️ Profile Settings
                    </div>
                    <div style={{ color: '#fff', fontFamily: 'IrysItalic', fontSize: 12, marginTop: 4 }}>
                      Changes are saved instantly and visible to all users
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: '#67FFD4', fontFamily: 'Irys2', display: 'block', marginBottom: 8 }}>
                      PROFILE VISIBILITY
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        id="profilePublic"
                        checked={profilePublic}
                        onChange={(e) => setProfilePublic(e.target.checked)}
                        style={{
                          marginRight: 12,
                          width: 16,
                          height: 16,
                          accentColor: '#67FFD4'
                        }}
                      />
                      <label htmlFor="profilePublic" style={{ color: '#fff', fontFamily: 'Irys2' }}>
                        Make my profile public
                      </label>
                    </div>
                    <p style={{ color: '#67FFD4', fontSize: 14, fontFamily: 'IrysItalic' }}>
                      {profilePublic ? 
                        'Your profile will be visible at: ' + window.location.origin + '/profile/@' + username :
                        'Your profile will be private and not accessible to others'
                      }
                    </p>
                  </div>
                  
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: '#67FFD4', fontFamily: 'Irys2', display: 'block', marginBottom: 8 }}>
                      PROFILE BIO
                    </label>
                    <textarea
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder="Tell people about yourself..."
                      style={{
                        background: '#222',
                        border: '1px solid #67FFD4',
                        color: '#fff',
                        padding: '12px',
                        borderRadius: 8,
                        width: '100%',
                        minHeight: 80,
                        fontFamily: 'Irys2',
                        fontSize: 14,
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: '#67FFD4', fontFamily: 'Irys2', display: 'block', marginBottom: 8 }}>
                      PROFILE AVATAR URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={profileAvatar}
                      onChange={(e) => setProfileAvatar(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      style={{
                        background: '#222',
                        border: '1px solid #67FFD4',
                        color: '#fff',
                        padding: '12px',
                        borderRadius: 8,
                        width: '100%',
                        fontFamily: 'Irys2',
                        fontSize: 14
                      }}
                    />
                    <p style={{ color: '#67FFD4', fontSize: 12, marginTop: 4, fontFamily: 'IrysItalic' }}>
                      Enter a URL to an image for your profile avatar
                    </p>
                  </div>
                  
                  {profileError && (
                    <div style={{ color: '#FF5555', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
                      {profileError}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button
                      onClick={handleSaveProfileSettings}
                      disabled={profileLoading}
                      style={{
                        background: '#67FFD4',
                        color: '#111',
                        fontWeight: 'bold',
                        borderRadius: 8,
                        padding: '12px 24px',
                        fontFamily: 'Irys2',
                        fontSize: 16,
                        cursor: 'pointer',
                        border: 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      {profileLoading ? 'Saving...' : 'Save Settings'}
                    </button>
                    <button
                      onClick={() => setShowProfileSettings(false)}
                      style={{
                        background: 'transparent',
                        color: '#67FFD4',
                        fontWeight: 'bold',
                        borderRadius: 8,
                        padding: '12px 24px',
                        fontFamily: 'Irys2',
                        fontSize: 16,
                        cursor: 'pointer',
                        border: '2px solid #67FFD4',
                        transition: 'all 0.2s'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}