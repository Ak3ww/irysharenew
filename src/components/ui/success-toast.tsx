import React from 'react';

interface SuccessToastProps {
  isVisible: boolean;
  onClose: () => void;
  linktreeUrl: string;
  message?: string;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({
  isVisible,
  onClose,
  linktreeUrl,
  message = 'Linktree Published Successfully!'
}) => {
  if (!isVisible) return null;

  const handleVisitLivePage = () => {
    window.open(linktreeUrl, '_blank');
  };

  const handleShareOnTwitter = () => {
    const shareMessage = `Visit my beautiful links at ${linktreeUrl} | Share your beautiful links on https://iryshare.vercel.app | #Iryshare @iryshare`;
    const searchParams = new URLSearchParams({
      text: shareMessage
    });
    const shareUrl = `https://twitter.com/intent/tweet?${searchParams.toString()}`;
    window.open(shareUrl, '_blank', 'width=800,height=640,noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-black/90 backdrop-blur-xl border border-[#67FFD4]/20 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#67FFD4] to-[#00B4D8] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <svg className="w-10 h-10 text-black drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-bold text-[#67FFD4] text-2xl mb-3" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
            SUCCESS! 
          </h3>
          <p className="text-white/80 text-base font-medium leading-relaxed" style={{ fontFamily: 'Irys2' }}>{message}</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-8">
          {/* Visit Live Page Button */}
          <button
            onClick={handleVisitLivePage}
            className="w-full bg-white hover:bg-gray-100 text-black rounded-xl py-4 font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-3 text-lg group border-2 border-white hover:border-gray-200"
            style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}
          >
            <img src="/social-icons/icons8-checkmark.gif" alt="Checkmark" className="w-6 h-6 group-hover:animate-bounce" />
            <span>VISIT LIVE PAGE</span>
          </button>

          {/* Share on Twitter Button */}
          <button
            onClick={handleShareOnTwitter}
            className="w-full bg-white hover:bg-gray-100 text-black rounded-xl py-4 font-bold transition-all duration-300 border-2 border-white hover:border-gray-200 transform hover:scale-105 flex items-center justify-center space-x-3 text-lg group shadow-lg hover:shadow-xl"
            style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}
          >
            <img src="/social-icons/icons8-x.svg" alt="X (Twitter)" className="w-6 h-6 group-hover:animate-pulse" />
            <span>SHARE ON TWITTER</span>
          </button>
        </div>

        {/* Close Button */}
        <div className="text-center mb-4">
          <button
            onClick={onClose}
            className="px-8 py-3 text-white/60 hover:text-[#67FFD4] font-semibold transition-all duration-200 hover:bg-white/5 rounded-xl border border-white/10 hover:border-[#67FFD4]/30"
            style={{ fontFamily: 'Irys2' }}
          >
            CLOSE
          </button>
        </div>

        {/* Auto-close timer indicator */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center justify-center text-sm text-white/40">
            <div className="w-4 h-4 mr-2 relative">
              <div className="absolute inset-0 rounded-full border-2 border-white/20 border-t-[#67FFD4] animate-spin"></div>
            </div>
            <span style={{ fontFamily: 'Irys2' }}>Auto-closes in 10 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for managing the success toast
export const useSuccessToast = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [linktreeUrl, setLinktreeUrl] = React.useState('');
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    // Listen for the showSuccessToast event
    const handleShowSuccessToast = (event: CustomEvent) => {
      setLinktreeUrl(event.detail.linktreeUrl);
      setMessage(event.detail.message);
      setIsVisible(true);

      // Auto-close after 10 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 10000);
    };

    window.addEventListener('showSuccessToast', handleShowSuccessToast as EventListener);
    
    return () => {
      window.removeEventListener('showSuccessToast', handleShowSuccessToast as EventListener);
    };
  }, []);

  const hideSuccessToast = () => {
    setIsVisible(false);
  };

  return {
    isVisible,
    linktreeUrl,
    message,
    hideSuccessToast
  };
};
