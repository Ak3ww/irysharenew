import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Share, Upload, FileText, X, Lock, Globe, HardDrive } from 'lucide-react';
import { MyFiles } from './MyFiles';
import { CircleProgress } from './ui/circle-progress';
import { supabase } from '../utils/supabase';
import { uploadFile, getIrysUploader } from '../utils/irys';
import { uploadEncryptedToIrys } from '../utils/litIrys';

interface HomepageProps {
  address: string;
  isConnected: boolean;
  usernameSaved: boolean;
  onFileUpload?: () => void;
  refreshTrigger?: number;
}

export function Homepage({ address, isConnected, usernameSaved, onFileUpload, refreshTrigger = 0 }: HomepageProps) {
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
  
  // Storage state
  const [storageInfo, setStorageInfo] = useState<{ used: number; total: number } | null>(null);
  
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

  // Fetch storage info
  useEffect(() => {
    if (!address) return;
    
    const fetchStorageInfo = async () => {
      try {
        const { data } = await supabase
          .from('user_storage')
          .select('used_bytes')
          .eq('address', address.toLowerCase().trim())
          .single();
        
        if (data) {
          setStorageInfo({
            used: data.used_bytes,
            total: 12 * 1024 * 1024 * 1024 // 12GB
          });
        } else {
          setStorageInfo({ used: 0, total: 12 * 1024 * 1024 * 1024 });
        }
      } catch (error) {
        console.error('Error fetching storage info:', error);
        setStorageInfo({ used: 0, total: 12 * 1024 * 1024 * 1024 });
      }
    };

    fetchStorageInfo();
  }, [address]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError(null);
    }
  };

  const validateRecipients = async (recipients: string) => {
    if (!recipients.trim()) {
      setShareRecipientsValid([]);
      setShareRecipientsError('');
      return;
    }

    const addresses = recipients.split(',').map(r => r.trim()).filter(r => r);
    const validRecipients: Array<{address: string, username?: string}> = [];
    const errors: string[] = [];

    for (const addr of addresses) {
      if (addr.startsWith('@')) {
        // Username lookup
        const username = addr.slice(1);
        try {
          const { data, error } = await supabase
            .from('usernames')
            .select('address')
            .eq('username', username)
            .single();
          
          if (error || !data) {
            errors.push(`Username @${username} not found`);
          } else {
            validRecipients.push({ address: data.address, username });
          }
        } catch {
          errors.push(`Error looking up @${username}`);
        }
      } else if (addr.startsWith('0x') && addr.length === 42) {
        // Valid address format
        validRecipients.push({ address: addr.toLowerCase() });
      } else {
        errors.push(`Invalid address format: ${addr}`);
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
      let result: string;
      
      if (selectedAction === 'share' || (selectedAction === 'store' && storePrivate)) {
        // Use Lit Protocol for encryption (both sharing and private storage)
        setUploadStage('Encrypting file with Lit Protocol...');
        console.log('Starting Lit Protocol encryption for file:', file.name, 'Size:', file.size);
        
        try {
          // Convert file to ArrayBuffer
          const fileBuffer = await file.arrayBuffer();
          
          if (selectedAction === 'share' && shareRecipientsValid.length > 0) {
            // Share with multiple recipients
            const recipientAddresses = shareRecipientsValid.map(r => r.address);
            console.log('Sharing with recipients:', recipientAddresses);
            
            result = await uploadEncryptedToIrys(
              fileBuffer,
              file.name,
              file.type,
              address,
              recipientAddresses,
              (progress) => {
                setUploadProgress(progress);
                setUploadStage(`Encrypting and uploading file for ${shareRecipientsValid.length} recipient(s)... ${Math.round(progress)}%`);
              }
            );
            console.log('Lit Protocol encryption and upload completed successfully for sharing with', shareRecipientsValid.length, 'recipients');
          } else {
            // Private store - encrypt for owner only
            result = await uploadEncryptedToIrys(
              fileBuffer,
              file.name,
              file.type,
              address,
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
        tags: selectedAction === 'share' ? shareRecipientsValid.map(r => r.username || r.address) : [],
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
      if (selectedAction === 'share' && shareRecipientsValid.length > 0 && fileData) {
        const shareRecords = shareRecipientsValid.map(recipient => ({
          file_id: fileData.id,
          recipient_address: recipient.address.toLowerCase().trim(),
          recipient_username: recipient.username || null
        }));
          
        const { error: shareError } = await supabase
          .from('file_shares')
          .insert(shareRecords);
          
        if (shareError) {
          console.error('Error creating file shares:', shareError);
          throw new Error('Failed to create file share records');
        }
        
        console.log('File share records created successfully for', shareRecipientsValid.length, 'recipients');
      }

      setUploadProgress(100);
      setUploadStage('Complete!');
      
      console.log('✅ Upload completed successfully!');
      console.log('📁 File saved to database:', fileData);
      if (selectedAction === 'share' && shareRecipientsValid.length > 0) {
        console.log('👥 Shared with recipients:', shareRecipientsValid);
      }
      
      // Reset form
      setFile(null);
      setShareRecipients('');
      setShareRecipientsValid([]);
      setSelectedAction('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Trigger refresh of file lists in parent component
      if (onFileUpload) {
        onFileUpload();
      }
      
      // Refresh storage info
      setTimeout(() => {

      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl text-white mb-6" style={{ fontFamily: 'Irys' }}>IRYSHARE</h1>
          
          {/* Storage Usage - Simplified Design */}
          {storageInfo && (
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-8">
              <div className="flex items-center gap-3">
                <HardDrive size={20} className="text-[#67FFD4]" />
                <span className="text-white font-medium">Storage</span>
              </div>
              <CircleProgress 
                percentage={(storageInfo.used / storageInfo.total) * 100} 
                size={50} 
                strokeWidth={4}
                color="#67FFD4"
                backgroundColor="rgba(255, 255, 255, 0.1)"
              >
                <div className="text-center">
                  <div className="text-[#67FFD4] text-xs font-bold">
                    {((storageInfo.used / storageInfo.total) * 100).toFixed(1)}%
                  </div>
                </div>
              </CircleProgress>
              <div className="text-right">
                <div className="text-white text-sm font-medium">
                  {(storageInfo.used / (1024 * 1024 * 1024)).toFixed(2)} GB
                </div>
                <div className="text-white/60 text-xs">
                  of 12 GB
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Big Cards Section */}
          <section>
            <h1 className="text-3xl font-bold text-white mb-8">
              What would you like to do?
            </h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              {/* Share Files Card */}
              <div className="rounded-lg p-6 flex flex-col bg-gradient-to-br from-blue-500 to-purple-600">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Share Files
                </h2>
                
                <div className="flex-grow relative min-h-[160px] mb-4">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-b from-orange-300 to-purple-400 rounded-lg border-4 border-white shadow-lg rotate-3">
                    <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    className="bg-black text-white py-3 rounded-md flex items-center justify-center gap-1.5 hover:bg-opacity-90 transition"
                    onClick={() => setSelectedAction('share')}
                  >
                    <Share size={18} />
                    <span>Share Files</span>
                  </Button>
                </div>
              </div>

              {/* Store Files Card */}
              <div className="rounded-lg p-6 flex flex-col bg-gradient-to-br from-yellow-400 to-orange-500">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Store Files
                </h2>
                
                <div className="flex-grow relative min-h-[160px] mb-4">
                  <div className="absolute right-2 top-8">
                    <div className="relative">
                      <div className="w-28 h-16 bg-black rounded border border-gray-700" />
                      <div className="absolute w-14 h-14 bottom-4 left-2 bg-gray-800 rounded overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-8 right-4 text-xs text-white bg-black/50 px-1 rounded">
                        Storing
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    className="bg-black text-white py-3 rounded-md flex items-center justify-center gap-1.5 hover:bg-opacity-90 transition"
                    onClick={() => setSelectedAction('store')}
                  >
                    <Upload size={18} />
                    <span>Store Files</span>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Upload Modal */}
          {selectedAction && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl text-[#67FFD4] text-center flex-1" style={{ fontFamily: 'Irys2' }}>
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
                    className="text-[#67FFD4] hover:text-[#8AFFE4] text-2xl"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* File Selection */}
                <div className="mb-6">
                  <label className="text-[#67FFD4] font-bold block mb-2" style={{ fontFamily: 'Irys2' }}>
                    SELECT FILE
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="w-full bg-[#222] border border-[#67FFD4] text-white p-3 rounded-lg focus:outline-none"
                    disabled={uploading}
                  />
                  {file && (
                    <div className="mt-2 text-sm text-gray-400">
                      Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>

                {/* Share Recipients (only for share action) */}
                {selectedAction === 'share' && (
                  <div className="mb-6">
                    <label className="text-[#67FFD4] font-bold block mb-2" style={{ fontFamily: 'Irys2' }}>
                      RECIPIENTS (OPTIONAL)
                    </label>
                    <textarea
                      value={shareRecipients}
                      onChange={(e) => {
                        setShareRecipients(e.target.value);
                        validateRecipients(e.target.value);
                      }}
                      placeholder="Enter usernames (@username) or addresses (0x...) separated by commas"
                      className="w-full bg-[#222] border border-[#67FFD4] text-white p-3 rounded-lg focus:outline-none h-20 resize-none"
                      disabled={uploading}
                    />
                    {shareRecipientsValid.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[#67FFD4] text-sm font-bold mb-1">Valid Recipients:</div>
                        <div className="space-y-1">
                          {shareRecipientsValid.map((recipient, index) => (
                            <div key={index} className="text-sm text-white bg-[#222] p-2 rounded">
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
                    <div className="w-full bg-[#222] rounded-full h-3 border border-[#67FFD4] overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#67FFD4] to-[#8AFFE4] h-3 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {uploadError && (
                  <div className="mb-6 bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
                    {uploadError}
                  </div>
                )}

                {/* Upload Button */}
                <Button
                  variant="irys"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full py-3 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      {selectedAction === 'share' ? 'Share File' : 'Store File'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* My Files Section */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">
              My Files
            </h2>
            <MyFiles address={address} isConnected={isConnected} usernameSaved={usernameSaved} refreshTrigger={refreshTrigger} />
          </section>
        </div>
      </div>
    </div>
  );
} 