import React, { useRef, useEffect } from 'react';
import { useLinktreeStore } from '../context/LinktreeContext';
import { getSocialLogo } from '../../../utils/socialDetection';

export default function DevicePreview() {
  const userStore = useLinktreeStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Always render, but use default theme if none is set
  const currentTheme = userStore.theme || userStore.colors[0];
  
  // Touch scrolling functionality
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let isScrolling = false;
    let startY = 0;
    let startScrollTop = 0;

    const handleTouchStart = (e: TouchEvent) => {
      isScrolling = true;
      startY = e.touches[0].clientY;
      startScrollTop = container.scrollTop;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isScrolling) return;
      
      const deltaY = startY - e.touches[0].clientY;
      container.scrollTop = startScrollTop + deltaY;
      
      e.preventDefault();
    };

    const handleTouchEnd = () => {
      isScrolling = false;
    };

    // Mouse drag scrolling for desktop
    let isMouseScrolling = false;
    let mouseStartY = 0;
    let mouseStartScrollTop = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isMouseScrolling = true;
      mouseStartY = e.clientY;
      mouseStartScrollTop = container.scrollTop;
      container.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseScrolling) return;
      
      const deltaY = mouseStartY - e.clientY;
      container.scrollTop = mouseStartScrollTop + deltaY;
    };

    const handleMouseUp = () => {
      isMouseScrolling = false;
      container.style.cursor = 'grab';
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
    };
  }, []);
  
  // DevicePreview rendering silently

  const renderLinktreeContent = () => (
    <div 
      className={`w-full ${currentTheme.color} select-none`}
      style={{
        minHeight: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: currentTheme.color.includes('gradient') ? currentTheme.color : undefined
      }}
    >
      <div className="w-full max-w-[240px] mx-auto px-2 py-2">
        {/* Profile Header - Compact for Mobile Frame */}
        <div className="text-center mb-3">
          <img
            className="rounded-full w-[70px] h-[70px] mx-auto mt-6 object-cover shadow-lg"
            src={userStore.linktree_avatar || userStore.image || '/default-avatar.png'}
            alt="Profile"
          />

          {/* Profile Title (Display Name) */}
          <div 
            className={`text-center text-base font-bold mt-3 ${currentTheme.text}`}
            style={{ 
              lineHeight: '1.5',
              fontFamily: 'Irys1',
              letterSpacing: '0.1em'
            }}
          >
            {userStore.linktree_username && userStore.linktree_username.trim() !== '' 
              ? userStore.linktree_username.toUpperCase()
              : userStore.name && userStore.name.trim() !== '' 
                ? userStore.name.toUpperCase()
                : userStore.username ? userStore.username.toUpperCase() : 'DEMO USER'
            }
          </div>

          {/* Bio */}
          {(userStore.linktree_bio || userStore.bio) && (
            <div 
              className={`text-center text-xs font-medium mt-2 mb-4 ${currentTheme.text}`}
              style={{ 
                lineHeight: '1.5',
                fontFamily: 'Irys2'
              }}
            >
              <div className="px-2">
                {userStore.linktree_bio || userStore.bio}
              </div>
            </div>
          )}
        </div>

        {/* Links - Compact Desktop Style for Mobile Frame */}
        <div className="space-y-[10px] max-w-[220px] mx-auto">
          {userStore.allLinks?.map((link, index) => (
            <a
              key={link.id || index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center relative w-full bg-white border-none rounded-lg p-3 hover:scale-[1.02] transition-all duration-150 shadow-sm hover:shadow-md text-center min-h-[48px]"
              style={{ 
                backgroundColor: 'var(--button-style-background, #fff)',
                color: 'var(--button-style-text, #000)',
                borderRadius: 'var(--button-style-radius, 8px)'
              }}
            >
              <img 
                className="rounded-lg h-[24px] w-[24px] object-cover absolute left-3"
                src={getSocialLogo(link.url)}
                alt={link.name}
              />

              <div 
                className="text-xs font-medium flex-1 px-8"
                style={{ 
                  fontSize: '12px',
                  fontWeight: '500',
                  lineHeight: '1.5',
                  fontFamily: 'Irys1',
                  letterSpacing: '0.05em'
                }}
              >
                {link.name.toUpperCase()}
              </div>
            </a>
          ))}
        </div>

        <div className="pb-6"/>
      </div>
    </div>
  );

  const getDeviceFrame = () => {
    return (
      <div className="relative">
        <div className="w-[280px] h-[560px] rounded-3xl overflow-hidden relative">
          {/* Mobile Case Frame */}
          <img 
            className="absolute z-10 pointer-events-none select-none w-full h-full" 
            src="/mobile-case.png"
            alt="Mobile case"
          />
          
          {/* Screen Content - Desktop-first style in mobile frame */}
          <div 
            className="absolute inset-0 rounded-3xl overflow-hidden"
            style={{
              top: '12px',
              left: '12px',
              right: '12px',
              bottom: '12px'
            }}
          >
            <div 
              ref={scrollContainerRef}
              className="w-full h-full overflow-hidden touch-pan-y cursor-grab"
              style={{
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {renderLinktreeContent()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="md:block fixed hidden right-0 lg:w-[500px] w-[310px] h-[calc(100vh-20px)] mt-[20px] mx-auto md:pt-20 pt-14 z-10">
      {/* Device Preview - Aligned with main content level */}
      <div className="mx-auto mt-0 mb-16 flex items-center justify-center w-full lg:max-w-[230px] max-w-[200px] lg:h-[460px] h-[400px] p-3 rounded-3xl relative">
        {getDeviceFrame()}
      </div>
    </div>
  );
}
