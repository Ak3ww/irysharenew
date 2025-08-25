import React, { useState } from 'react';

interface IryshareFooterProps {
  username: string;
}

export default function IryshareFooter({ username }: IryshareFooterProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[1000] flex h-auto flex-col items-center justify-center py-6 sm:py-8 pointer-events-none"
      style={{
        background: 'linear-gradient(0deg, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)'
      }}
    >
      {/* Animated Pill CTA */}
      <div className="flex items-center bg-white rounded-full px-4 py-3 shadow-lg mb-4 animate-pulse pointer-events-auto hover:shadow-xl transition-all duration-200 cursor-pointer">
        <button 
          onClick={() => window.open('https://iryshare.vercel.app', '_blank')}
          className="flex h-full w-full items-center justify-start"
          aria-label="Visit Iryshare landing page"
          title="Visit Iryshare landing page"
        >
          {/* Iryshare Logo Icon */}
          <div className="w-6 h-6 flex items-center justify-center">
            <img src="/iryshare_logo.svg" alt="Iryshare" className="w-6 h-6" />
          </div>
          
          <div className="ml-3 flex items-center">
            <p className="text-sm font-medium text-black leading-[1.57]" style={{ fontFamily: 'Irys2' }}>
              Share your link with Iryshare
            </p>
            <svg className="w-4 h-4 ml-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </button>
        
        {/* Dismiss Button */}
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 ml-2 pointer-events-auto"
        >
          <svg viewBox="0 0 10 10" className="w-3 h-3 fill-black">
            <path d="M0.64063 8.19141C0.341802 8.49023 0.330083 9.0293 0.64649 9.3457C0.962896 9.66211 1.50196 9.65039 1.80079 9.35742L4.98829 6.16992L8.16993 9.35156C8.48047 9.66211 9.00782 9.66211 9.32422 9.33984C9.63477 9.02344 9.64063 8.49609 9.33008 8.19141L6.14844 5.00977L9.33008 1.82227C9.64063 1.51758 9.64063 0.984375 9.32422 0.673828C9.00782 0.357422 8.48047 0.357422 8.16993 0.662109L4.98829 3.84375L1.80079 0.65625C1.50196 0.363281 0.962896 0.351562 0.64649 0.667969C0.335943 0.984375 0.341802 1.52344 0.64063 1.82227L3.82813 5.00977L0.64063 8.19141Z" />
          </svg>
        </button>
      </div>
      
      {/* Main CTA Text */}
      <p className="text-sm font-medium text-white leading-[1.57]" style={{ fontFamily: 'Irys2' }}>
        SHARE YOUR LINK WITH IRYSHARE
      </p>
      <p className="text-xs text-white/80 leading-[1.57] mt-1" style={{ fontFamily: 'Irys2' }}>
        Sign up now for free
      </p>
    </div>
  );
}
