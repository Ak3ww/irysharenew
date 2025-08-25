import React, { useEffect, useState } from 'react';
import { getSocialLogo } from '../../../utils/socialDetection';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

interface SocialPlatform {
  name: string;
  icon: React.ReactElement;
  color: string;
  action: () => void;
}

export default function ShareModal({ isOpen, onClose, shareUrl }: ShareModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(isOpen);
  const [currentShareUrl, setCurrentShareUrl] = useState(shareUrl);

  useEffect(() => {
    setIsModalOpen(isOpen);
    setCurrentShareUrl(shareUrl);
  }, [isOpen, shareUrl]);

  // ESC key handler for closing modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        handleClose();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isModalOpen]);

  // Listen for the openShareModal event
  useEffect(() => {
    const handleOpenShareModal = (event: CustomEvent) => {
      setCurrentShareUrl(event.detail.shareUrl);
      setIsModalOpen(true);
    };

    window.addEventListener('openShareModal', handleOpenShareModal as EventListener);
    
    return () => {
      window.removeEventListener('openShareModal', handleOpenShareModal as EventListener);
    };
  }, []);

  // Enhanced sharing message - More engaging and promotional!
  const getShareMessage = () => {
    return `Visit my beautiful links at ${currentShareUrl} | Share your beautiful links on https://iryshare.vercel.app | #Iryshare @iryshare`;
  };

  // Copy Link with beautiful message
  const handleCopyLink = () => {
    const message = getShareMessage();
    navigator.clipboard.writeText(message);
    alert('📋 Beautiful message copied to clipboard!\n\n✨ You can now paste this anywhere you want to share your Linktree!');
  };

  // Auto-share to Twitter - Called after successful save & publish
  const autoShareToTwitter = () => {
    const searchParams = new URLSearchParams({
      url: currentShareUrl,
      text: getShareMessage()
    });
    const shareUrl = `https://twitter.com/intent/tweet?${searchParams.toString()}`;
    window.open(shareUrl, '_blank', 'width=800,height=640,noopener,noreferrer');
  };

  // Expose auto-share function globally so it can be called from other components
  useEffect(() => {
    const globalWindow = window as typeof window & { autoShareToTwitter?: () => void };
    globalWindow.autoShareToTwitter = autoShareToTwitter;
    return () => {
      delete globalWindow.autoShareToTwitter;
    };
  }, [currentShareUrl]);

  if (!isModalOpen) return null;

  const handleClose = () => {
    setIsModalOpen(false);
    onClose();
  };

  // Simple Social Media Platforms - Just Like Real Linktree!
  const socialPlatforms: SocialPlatform[] = [
    {
      name: 'X (Twitter)',
      icon: (
        <img 
          className="h-6 w-6 object-cover drop-shadow-sm" 
          alt="X (Twitter)" 
          src="/social-icons/twitter-white.png"
        />
      ),
      color: 'bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 shadow-lg hover:shadow-xl',
      action: () => {
        const searchParams = new URLSearchParams({
          url: currentShareUrl,
          text: getShareMessage()
        });
        const shareUrl = `https://twitter.com/intent/tweet?${searchParams.toString()}`;
        window.open(shareUrl, '_blank', 'width=800,height=640,noopener,noreferrer');
      }
    },
    {
      name: 'Facebook',
      icon: (
        <img 
          className="h-6 w-6 object-cover drop-shadow-sm" 
          alt="Facebook" 
          src="/social-icons/facebook.png"
        />
      ),
      color: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl',
      action: () => {
        const shareUrl = `https://www.facebook.com/sharer.php?u=${encodeURIComponent(currentShareUrl)}`;
        window.open(shareUrl, '_blank', 'width=800,height=640,noopener,noreferrer');
      }
    },
    {
      name: 'LinkedIn',
      icon: (
        <img 
          className="h-6 w-6 object-cover drop-shadow-sm" 
          alt="LinkedIn" 
          src={getSocialLogo('https://linkedin.com')}
        />
      ),
      color: 'bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl',
      action: () => {
        const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentShareUrl)}`;
        window.open(shareUrl, '_blank', 'width=800,height=640,noopener,noreferrer');
      }
    },
    {
      name: 'WhatsApp',
      icon: (
        <img 
          className="h-6 w-6 object-cover drop-shadow-sm" 
          alt="WhatsApp" 
          src={getSocialLogo('https://wa.me')}
        />
      ),
      color: 'bg-gradient-to-br from-green-500 via-green-600 to-green-700 hover:from-green-400 hover:via-green-500 hover:to-green-600 shadow-lg hover:shadow-xl',
      action: () => {
        const message = getShareMessage();
        const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message + ' ' + currentShareUrl)}`;
        window.open(shareUrl, '_blank', 'width=800,height=640,noopener,noreferrer');
      }
    },
    {
      name: 'Messenger',
      icon: (
        <img 
          className="h-6 w-6 object-cover drop-shadow-sm" 
          alt="Messenger" 
          src={getSocialLogo('https://messenger.com')}
        />
      ),
      color: 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 hover:from-blue-400 hover:via-blue-500 hover:to-blue-600 shadow-lg hover:shadow-xl',
      action: () => {
        const shareUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(currentShareUrl)}&app_id=123456789&redirect_uri=${encodeURIComponent(window.location.origin)}`;
        window.open(shareUrl, '_blank', 'width=800,height=640,noopener,noreferrer');
      }
    },
    {
      name: 'Telegram',
      icon: (
        <img 
          className="h-6 w-6 object-cover drop-shadow-sm" 
          alt="Telegram" 
          src={getSocialLogo('https://t.me')}
        />
      ),
      color: 'bg-gradient-to-br from-sky-500 via-blue-500 to-blue-600 hover:from-sky-400 hover:via-blue-400 hover:to-blue-500 shadow-lg hover:shadow-xl',
      action: () => {
        const message = getShareMessage();
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(currentShareUrl)}&text=${encodeURIComponent(message)}`;
        window.open(shareUrl, '_blank', 'width=800,height=640,noopener,noreferrer');
      }
    },
    {
      name: 'Reddit',
      icon: (
        <img 
          className="h-6 w-6 object-cover drop-shadow-sm" 
          alt="Reddit" 
          src={getSocialLogo('https://reddit.com')}
        />
      ),
      color: 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 hover:from-orange-400 hover:via-orange-500 hover:to-orange-600 shadow-lg hover:shadow-xl',
      action: () => {
        const title = getShareMessage();
        const shareUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(currentShareUrl)}&title=${encodeURIComponent(title)}`;
        window.open(shareUrl, '_blank', 'width=800,height=640,noopener,noreferrer');
      }
    },
    {
      name: 'Pinterest',
      icon: (
        <img 
          className="h-6 w-6 object-cover drop-shadow-sm" 
          alt="Pinterest" 
          src={getSocialLogo('https://pinterest.com')}
        />
      ),
      color: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 hover:from-red-400 hover:via-red-500 hover:to-red-600 shadow-lg hover:shadow-xl',
      action: () => {
        const description = getShareMessage();
        const shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(currentShareUrl)}&description=${encodeURIComponent(description)}`;
        window.open(shareUrl, '_blank', 'width=800,height=640,noopener,noreferrer');
      }
    },
    {
      name: 'Email',
      icon: (
        <img 
          className="h-6 w-6 object-cover drop-shadow-sm" 
          alt="Email" 
          src={getSocialLogo('mailto:test@example.com')}
        />
      ),
      color: 'bg-gradient-to-br from-slate-600 via-gray-700 to-slate-800 hover:from-slate-500 hover:via-gray-600 hover:to-slate-700 shadow-lg hover:shadow-xl',
      action: () => {
        const subject = "Check out my Linktree!";
        const body = getShareMessage() + '\n\n' + currentShareUrl;
        const shareUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(shareUrl);
      }
    },
    {
      name: 'Copy Link',
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
        </svg>
      ),
      color: 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 hover:from-gray-500 hover:via-gray-600 hover:to-gray-700 shadow-lg hover:shadow-xl',
      action: handleCopyLink
    }
  ];

  const handleShare = (platform: SocialPlatform) => {
    if (platform.action) {
      platform.action();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 text-center">
          <h2 className="text-xl font-bold mb-2">Share Your Linktree</h2>
          <p className="text-blue-100 text-sm">Share your beautiful links with the world! 🌟</p>
        </div>

        {/* Share URL Display */}
        <div className="p-4 border-b border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-2">Your Linktree URL:</p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={currentShareUrl}
                readOnly
                className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono"
              />
              <button
                onClick={() => {
                  // Create the beautiful message to copy
                  const beautifulMessage = `Visit my beautiful links at ${currentShareUrl} | Share your beautiful links on https://iryshare.vercel.app | #Iryshare @iryshare`;
                  navigator.clipboard.writeText(beautifulMessage);
                  alert('📋 Beautiful message copied to clipboard!\n\n✨ You can now paste this anywhere you want to share your Linktree!');
                }}
                className="px-4 py-2 bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 hover:from-gray-500 hover:via-gray-600 hover:to-gray-700 text-white rounded-lg hover:shadow-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:-translate-y-1 border border-white/10 hover:border-white/20"
              >
                Copy
              </button>
            </div>
          </div>
          
          {/* Visit Live Page Button */}
          <div className="mt-3 text-center">
            <button
              onClick={() => window.open(currentShareUrl, '_blank')}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl py-2.5 font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}
            >
              🚀 VISIT LIVE PAGE
            </button>
          </div>
        </div>

        {/* Social Media Buttons */}
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {socialPlatforms.map((platform) => (
              <button
                key={platform.name}
                onClick={() => handleShare(platform)}
                className={`${platform.color} text-white rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 border border-white/10 hover:border-white/20`}
              >
                <div className="text-white drop-shadow-sm">
                  {platform.icon}
                </div>
                <span className="text-xs font-semibold tracking-wide drop-shadow-sm">
                  {platform.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="p-4 pt-0">
          <button
            onClick={handleClose}
            className="w-full bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium hover:bg-gray-200 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
