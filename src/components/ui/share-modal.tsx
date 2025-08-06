import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { updateFileAccessControl } from '../../utils/aesIrys';
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
interface ShareModalProps {
  file: FileData | null;
  address: string;
  onClose: () => void;
  onRecipientAdded?: () => void;
}
export function ShareModal({ file, address, onClose, onRecipientAdded }: ShareModalProps) {
  const [newRecipientInput, setNewRecipientInput] = useState('');
  const [newRecipientValid, setNewRecipientValid] = useState(false);
  const [newRecipientError, setNewRecipientError] = useState('');
  const [newRecipientLoading, setNewRecipientLoading] = useState(false);
  const [resolvedNewRecipients, setResolvedNewRecipients] = useState<Array<{ address: string, username?: string }>>([]);
  const [addingRecipients, setAddingRecipients] = useState(false);
  const [addingRecipientsProgress, setAddingRecipientsProgress] = useState(0);
  const [addingRecipientsStage, setAddingRecipientsStage] = useState('');
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
          console.error('Error fetching existing shares:', error);
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
      setAddingRecipientsStage('Preparing to add recipients...');
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
        console.error('Error updating file URL:', updateFileError);
        throw new Error('Failed to update file URL in database');
      }
      // Add all new recipients to file_shares table
      for (const recipient of resolvedNewRecipients) {
        const { error: insertError } = await supabase
          .from('file_shares')
          .insert({
            file_id: file.id,
            recipient_address: recipient.address.toLowerCase(),
            recipient_username: recipient.username
          });
        if (insertError) {
          throw new Error(`Failed to add recipient ${recipient.address} to file shares`);
        }
      }
      setAddingRecipientsProgress(100);
      setAddingRecipientsStage(`${resolvedNewRecipients.length} recipient(s) added successfully!`);
      // Call callback if provided
      if (onRecipientAdded) {
        onRecipientAdded();
      }
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
      console.error('Error adding recipients:', error);
      alert(`Failed to add recipients: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAddingRecipients(false);
      setAddingRecipientsProgress(0);
      setAddingRecipientsStage('');
    }
  };
  // ESC key handler for closing modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (file) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [file, onClose]);
  // Click outside handler
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  if (!file) return null;
  return createPortal(
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[99999] p-4"
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
        className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[#67FFD4] font-bold text-lg">Share File</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-[#67FFD4] transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
        {/* File Info */}
        <div className="mb-6 p-4 bg-white/5 rounded-lg">
          <p className="text-white font-medium text-sm mb-1 truncate max-w-full" title={file.file_name}>
  {file.file_name.length > 50 ? file.file_name.substring(0, 47) + '...' : file.file_name}
</p>
          <p className="text-white/60 text-xs">
            {file.is_encrypted ? 'Encrypted file' : 'Public file'}
          </p>
        </div>
        {/* Recipient Input */}
        <div className="space-y-4">
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
    </div>,
    document.body
  );
} 
