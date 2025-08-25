import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { X, Lock, Globe } from 'lucide-react';
import { MyFiles } from './MyFiles';
import { FileInput } from '../ui/file-input';
import { supabase } from '../../utils/supabase';
import { uploadFile } from '../../utils/irys';
import { uploadEncryptedToIrys } from '../../utils/aesIrys';
import { getIrysUploader } from '../../utils/irys';
import { useToast } from '../../hooks/use-toast';
import { trackFileUpload, trackError, trackPageView } from '../../utils/analytics';
interface HomepageProps {
  address: string;
  isConnected: boolean;
  usernameSaved: boolean;
  onFileUpload?: () => void;
  refreshTrigger?: number;
  onPageChange?: (page: string) => void;
}
export function Homepage({ address, isConnected, usernameSaved, onFileUpload, refreshTrigger = 0, onPageChange }: HomepageProps) {
  const { toast } = useToast();
  // Upload state
  const [selectedAction, setSelectedAction] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  // Share state
  const [shareRecipients, setShareRecipients] = useState('');
  const [shareRecipientsValid, setShareRecipientsValid] = useState<Array<{address: string, username?: string}>>([]);
  const [shareRecipientsError, setShareRecipientsError] = useState('');
  const [storePrivate, setStorePrivate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ESC key handler for closing modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedAction) {
        setSelectedAction('');
        setFile(null);
        setShareRecipients('');
        setShareRecipientsValid([]);
        setUploadError(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [selectedAction]);
  // Track page view
  useEffect(() => {
    trackPageView('homepage');
  }, []);
  const handleFileSelect = (file: File | null) => {
    if (file) {
      setFile(file);
      setUploadError(null);
    } else {
      setFile(null);
    }
  };
  const validateRecipients = async (recipients: string) => {
    if (!recipients.trim()) {
      setShareRecipientsValid([]);
      setShareRecipientsError('');
      return;
    }
    const recipientList = recipients.split(',').map(r => r.trim()).filter(r => r);
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
            .select('address')
            .ilike('username', username)
            .single();
          if (data) {
            const addressLower = data.address.toLowerCase();
            // Check if trying to share with self
            if (address && addressLower === address.toLowerCase()) {
              errors.push(`Cannot share with yourself (@${username})`);
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
            .select('username')
            .eq('address', addressLower)
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
    setShareRecipientsValid(validRecipients);
    setShareRecipientsError(errors.join(', '));
  };
  const handleUpload = async () => {
    if (!file || !address) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    setUploadStage('Preparing upload...');
    try {
      let uploadUrl: string;
      if (selectedAction === 'share') {
        // Share files (encrypted)
        setUploadStage('Encrypting and uploading to Irys...');
        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        uploadUrl = await uploadEncryptedToIrys(
          arrayBuffer,
          file.name,
          file.type,
          address,
          shareRecipientsValid.map(r => r.address)
        );
        setUploadProgress(50);
        setUploadStage('Saving to database...');
        // Save to database
        const { data: fileData, error: dbError } = await supabase
          .from('files')
          .insert({
            file_name: file.name,
            file_size_bytes: file.size,
            file_type: file.type,
            file_url: uploadUrl,
            owner_address: address.toLowerCase().trim(),
            is_encrypted: true
          })
          .select()
          .single();
        if (dbError) throw dbError;
        // Save shares
        for (const recipient of shareRecipientsValid) {
          await supabase
            .from('file_shares')
            .insert({
              file_id: fileData.id,
              recipient_address: recipient.address,
              recipient_username: recipient.username
            });
        }
        setUploadProgress(100);
        setUploadStage('Upload complete!');
      } else {
        // Store files (public or private)
        if (storePrivate) {
          // Private files should be encrypted
          setUploadStage('Encrypting and uploading to Irys...');
          // Convert file to ArrayBuffer
          const arrayBuffer = await file.arrayBuffer();
          uploadUrl = await uploadEncryptedToIrys(
            arrayBuffer,
            file.name,
            file.type,
            address,
            [] // No recipients for private files
          );
        } else {
          // Public files use regular upload
          setUploadStage('Uploading to Irys...');
          // Get Irys uploader
          const irysUploader = await getIrysUploader();
          uploadUrl = await uploadFile(irysUploader, file, address);
        }
        setUploadProgress(50);
        setUploadStage('Saving to database...');
        const { data: fileData, error: dbError } = await supabase
          .from('files')
          .insert({
            file_name: file.name,
            file_size_bytes: file.size,
            file_type: file.type,
            file_url: uploadUrl,
            owner_address: address.toLowerCase().trim(),
            is_encrypted: storePrivate, // Set based on whether file was encrypted
            is_public: !storePrivate, // Public if not private
            profile_visible: !storePrivate // Only visible in profile if public
          })
          .select()
          .single();
        if (dbError) throw dbError;
        // Save shares if recipients are specified
        if (shareRecipientsValid.length > 0) {
          for (const recipient of shareRecipientsValid) {
            await supabase
              .from('file_shares')
              .insert({
                file_id: fileData.id,
                recipient_address: recipient.address,
                recipient_username: recipient.username
              });
          }
        }
        setUploadProgress(100);
        setUploadStage('Upload complete!');
      }
      // Storage tracking temporarily disabled to fix 406 errors
      // TODO: Re-enable when user_storage table is properly configured
      // Reset form
      setFile(null);
      setShareRecipients('');
      setShareRecipientsValid([]);
      setSelectedAction('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Trigger refresh
      if (onFileUpload) {
        onFileUpload();
      }
      // Track successful upload
      trackFileUpload(
        file.size,
        file.type,
        selectedAction === 'share' || storePrivate,
        selectedAction as 'share' | 'store',
        shareRecipientsValid.length
      );
      // Show success toast
      toast({
        title: "Upload Successful!",
        description: selectedAction === 'share' 
          ? `File "${file.name}" shared with ${shareRecipientsValid.length} recipient(s)`
          : `File "${file.name}" uploaded successfully`,
        variant: "success",
      });
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadStage('');
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      // Track error
      trackError('upload_failed', errorMessage, selectedAction);
      // Show error toast
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setUploading(false);
      setUploadProgress(0);
      setUploadStage('');
    }
  };
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedAction('');
      setFile(null);
      setShareRecipients('');
      setShareRecipientsValid([]);
      setUploadError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                  WELCOME TO <span style={{ fontFamily: 'IrysItalic', letterSpacing: '0.1em' }} className="ml-1">IRYSHARE</span>
                </h1>
                <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>
                  Share and store files securely on Irys Network
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Share & Store Files Card */}
          <div className="rounded-lg p-6 flex flex-col bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="flex items-center gap-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share text-white">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" x2="12" y1="2" y2="15"></line>
              </svg>
              <h3 className="text-white font-bold text-xl">Share & Store Files</h3>
            </div>
            <p className="text-white/90 mb-6 flex-1">Share files securely with specific users using encryption, or store files in decentralized storage. Choose between public and private encrypted storage.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setSelectedAction('share')}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#67FFD4] text-black hover:bg-[#8AFFE4] font-bold transition-colors h-10 px-4 py-2 flex-1 bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                Share Files
              </button>
              <button 
                onClick={() => setSelectedAction('store')}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#67FFD4] text-black hover:bg-[#8AFFE4] font-bold transition-colors h-10 px-4 py-2 flex-1 bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                Store Files
              </button>
            </div>
          </div>

          {/* Send Tokens Card */}
          <div className="rounded-lg p-6 flex flex-col bg-gradient-to-br from-yellow-400 to-orange-500">
            <div className="flex items-center gap-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send text-white">
                <path d="M14.536 21.21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
                <path d="m21.854 2.147-10.94 10.939"></path>
              </svg>
              <h3 className="text-white font-bold text-xl">Send IRYS Tokens</h3>
            </div>
            <p className="text-white/90 mb-6 flex-1">Disperse IRYS tokens to multiple addresses instantly. Send to as many recipients as you want with one click.</p>
            <button 
              onClick={() => onPageChange?.('sendtokens')}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#67FFD4] text-black hover:bg-[#8AFFE4] font-bold transition-colors h-10 px-4 py-2 w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              Send Tokens
            </button>
          </div>
        </div>

        {/* Recent Files */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-xl mb-6" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
            RECENT FILES
          </h2>
          <MyFiles 
            address={address}
            isConnected={isConnected}
            usernameSaved={usernameSaved}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
      {/* Upload Modal */}
      {selectedAction && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
        >
          <div 
            className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[#67FFD4] font-bold text-xl flex-1">
                {selectedAction === 'share' ? 'Share Files' : 'Store Files'}
              </h3>
              <button
                onClick={() => {
                  setSelectedAction('');
                  setFile(null);
                  setShareRecipients('');
                  setShareRecipientsValid([]);
                  setUploadError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-white/60 hover:text-white transition-colors p-2 rounded-md hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            {/* File Selection */}
            <div className="mb-6">
              <label className="text-[#67FFD4] font-bold block mb-2" style={{ fontFamily: 'Irys2' }}>
                SELECT FILE
              </label>
              <FileInput
                accept="*/*"
                onChange={handleFileSelect}
                selectedFile={file}
                disabled={uploading}
                loading={uploading}
                placeholder="Choose a file to upload..."
                variant="upload"
                maxSize={25 * 1024 * 1024} // 25MB limit
              />
              {/* File size info */}
              {file && (
                <div className="mt-2 text-[#67FFD4] text-sm">
                  📁 File size: {Math.round(file.size / 1024 / 1024 * 100) / 100}MB / 25MB max
                </div>
              )}
            </div>
            {/* Share Recipients (only for share action) */}
            {selectedAction === 'share' && (
              <div className="mb-6">
                <label className="text-[#67FFD4] font-bold block mb-2" style={{ fontFamily: 'Irys2' }}>
                  RECIPIENTS (REQUIRED)
                </label>
                <textarea
                  value={shareRecipients}
                  onChange={(e) => {
                    setShareRecipients(e.target.value);
                    validateRecipients(e.target.value);
                  }}
                  placeholder="Enter usernames (@username) or addresses (0x...) separated by commas"
                  className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all h-20 resize-none"
                  disabled={uploading}
                />
                {shareRecipientsValid.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[#67FFD4] text-sm font-bold mb-1">Valid Recipients:</div>
                    <div className="space-y-1">
                      {shareRecipientsValid.map((recipient, index) => (
                        <div key={index} className="text-sm text-white bg-emerald-500/20 border border-emerald-500/30 p-2 rounded-lg">
                          {recipient.username ? `@${recipient.username}` : recipient.address}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {shareRecipientsError && (
                  <div className="mt-2 text-red-400 text-sm">{shareRecipientsError}</div>
                )}
              </div>
            )}
            {/* Storage Type (only for store action) */}
            {selectedAction === 'store' && (
              <div className="mb-6">
                <label className="text-[#67FFD4] font-bold block mb-2" style={{ fontFamily: 'Irys2' }}>
                  STORAGE TYPE
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="storageType"
                      checked={!storePrivate}
                      onChange={() => setStorePrivate(false)}
                      className="text-[#67FFD4]"
                      disabled={uploading}
                    />
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-[#67FFD4]" />
                      <span className="text-white">Public Storage</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="storageType"
                      checked={storePrivate}
                      onChange={() => setStorePrivate(true)}
                      className="text-[#67FFD4]"
                      disabled={uploading}
                    />
                    <div className="flex items-center gap-2">
                      <Lock size={16} className="text-[#67FFD4]" />
                      <span className="text-white">Private Storage (Encrypted)</span>
                    </div>
                  </label>
                </div>
              </div>
            )}
            {/* Upload Progress */}
            {uploading && (
              <div className="mb-6">
                <div className="text-[#67FFD4] text-center mb-4" style={{ fontFamily: 'Irys2' }}>
                  {uploadStage}
                </div>
                <div className="w-full bg-white/10 rounded-full h-3">
                  <div 
                    className="bg-[#67FFD4] h-3 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            {/* Error Message */}
            {uploadError && (
              <div className="mb-6 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                {uploadError}
              </div>
            )}
            {/* Upload Button */}
            <Button
              variant="irys"
              onClick={handleUpload}
              disabled={!file || uploading || (selectedAction === 'share' && shareRecipientsValid.length === 0)}
              className="w-full"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 
