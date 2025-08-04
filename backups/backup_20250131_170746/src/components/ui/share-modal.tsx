import { useState, useEffect } from 'react';
import { X, UserPlus, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { updateFileAccessControl } from '../../utils/litIrys';

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
  const [resolvedNewRecipient, setResolvedNewRecipient] = useState<{ address: string, username?: string } | null>(null);
  const [addingRecipients, setAddingRecipients] = useState(false);
  const [addingRecipientsProgress, setAddingRecipientsProgress] = useState(0);
  const [addingRecipientsStage, setAddingRecipientsStage] = useState('');

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
      
      // Call callback if provided
      if (onRecipientAdded) {
        onRecipientAdded();
      }
      
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

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
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
          <p className="text-white font-medium text-sm mb-1">{file.file_name}</p>
          <p className="text-white/60 text-xs">
            {file.is_encrypted ? 'Encrypted file' : 'Public file'}
          </p>
        </div>

        {/* Recipient Input */}
        <div className="space-y-4">
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
    </div>
  );
} 