import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

interface BackToTopProps {
  className?: string;
}

export function BackToTop({ className = '' }: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-50 bg-[#67FFD4] hover:bg-[#8AFFE4] text-black rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110 ${className}`}
      aria-label="Back to top"
    >
      <ChevronUp size={24} />
    </button>
  );
} 