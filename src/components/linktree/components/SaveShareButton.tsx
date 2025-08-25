import React, { useState, useEffect } from 'react';
import { Share2, Save, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { useLinktreeStore } from '../context/LinktreeContext';
import { uploadLinktreeToIrys, getUserLinktreeLink } from '../../../utils/irysLinktreeStorage';
import { shareToSocial, copyToClipboard, nativeShare, getSharePlatforms, type ShareOptions } from '../../../utils/socialShare';
import { useAccount } from 'wagmi';
import { handleSaveSuccess } from '../../../utils/autoShare';
import ShareModal from './ShareModal';

export default function SaveShareButton() {
  const userStore = useLinktreeStore();
  const { address } = useAccount();
  const [isLoading, setSaveLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const existingLink = address ? getUserLinktreeLink(address) : null;

  const handleSaveAndShare = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    setSaveLoading(true);
    setSaveStatus('idle');

    try {
      // Prepare linktree data
      const linktreeData = {
        id: userStore.id,
        name: userStore.name,
        username: userStore.username,
        bio: userStore.bio,
        image: userStore.image,
        links: userStore.allLinks || [],
        theme: userStore.theme || { id: 1, color: 'bg-black', text: 'text-white', name: 'Default' },
        theme_id: userStore.theme_id
      };

      // Upload to Irys
      const result = await uploadLinktreeToIrys(address, linktreeData);
      
      setShareUrl(result.shareUrl);
      setSaveStatus('success');
      // Show success toast instead of modal
      handleSaveSuccess(result.shareUrl);
      
      // Dispatch custom event to notify AdminIndex of URL update
      window.dispatchEvent(new CustomEvent('linktreeUrlUpdated'));
      
      console.log('Linktree saved successfully!', result);
      
    } catch (error) {
      console.error('Failed to save linktree:', error);
      setSaveStatus('error');
      alert('Failed to save your Linktree. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleShare = async (platform: string) => {
    if (!shareUrl) return;

    const shareOptions: ShareOptions = {
      url: shareUrl,
      title: userStore.name || userStore.username || 'My Linktree',
      description: userStore.bio || 'Check out my awesome Linktree!',
      username: userStore.username || 'user'
    };

    if (platform === 'copy') {
      // Create the beautiful message to copy
      const beautifulMessage = `Visit my beautiful links at ${shareUrl} | Share your beautiful links on https://iryshare.vercel.app | #Iryshare @iryshare`;
      const success = await copyToClipboard(beautifulMessage);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else if (platform === 'native') {
      const success = await nativeShare(shareOptions);
      if (!success) {
        // Fallback to copy beautiful message
        const beautifulMessage = `Visit my beautiful links at ${shareUrl} | Share your beautiful links on https://iryshare.vercel.app | #Iryshare @iryshare`;
        await copyToClipboard(beautifulMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      shareToSocial(platform, shareOptions);
    }
  };

  const platforms = getSharePlatforms();

  // Function to open ShareModal for dashboard share button
  const openShareModal = () => {
    if (shareUrl) {
      setShowShareModal(true);
    }
  };

  // Expose the openShareModal function globally for dashboard share button
  useEffect(() => {
    const globalWindow = window as typeof window & { openLinktreeShareModal?: () => void };
    globalWindow.openLinktreeShareModal = openShareModal;
    return () => {
      delete globalWindow.openLinktreeShareModal;
    };
  }, [shareUrl]);

  return (
    <>
      {/* Save & Share Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleSaveAndShare}
          disabled={isLoading}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Saving...
            </>
          ) : saveStatus === 'success' ? (
            <>
              <Check size={16} />
              Saved!
            </>
          ) : saveStatus === 'error' ? (
            <>
              <AlertCircle size={16} />
              Try Again
            </>
          ) : (
            <>
              <Save size={16} />
              <Share2 size={16} />
              {existingLink ? 'Update & Share' : 'Save & Share'}
            </>
          )}
        </button>
      </div>

      {/* Share Modal for Dashboard Share Button */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl || ''}
      />
    </>
  );
}
