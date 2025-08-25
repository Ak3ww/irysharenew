import React, { useState, useEffect, useRef } from 'react';
import { useLinktreeStore } from '../context/LinktreeContext';
import { type Link } from '../../../utils/linktreeStorage';
import { getSocialLogo, getSocialLogoContext, getSocialPlatformName } from '../../../utils/socialDetection';

interface LinkBoxProps {
  link: Link;
  selectedId: number;
  selectedStr: string;
  onUpdatedInput: (data: { id: number; str: string }) => void;
  className?: string;
  onLinkUpdated?: () => void;
}

// Utility function for debouncing
function useDebounce(func: Function, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  return (...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => func(...args), delay);
  };
}

export default function LinkBox({ 
  link, 
  selectedId, 
  selectedStr, 
  onUpdatedInput, 
  className = '',
  onLinkUpdated 
}: LinkBoxProps) {
  const userStore = useLinktreeStore();
  
  const [name, setName] = useState(link.name);
  const [url, setUrl] = useState(link.url);
  const [isDelete, setIsDelete] = useState(false);
  const [isUploadImage, setIsUploadImage] = useState(false);
  const [openCropper, setOpenCropper] = useState(false);
  const [data, setData] = useState<string>('');

  useEffect(() => {
    setName(link.name);
    setUrl(link.url);
  }, [link.name, link.url]);

  // Add click outside listeners
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const editNameInput = document.getElementById(`editNameInput-${link.id}`);
      if (
        editNameInput &&
        !editNameInput.contains(e.target as Node) && 
        selectedStr === 'isName' && 
        link.id === selectedId
      ) { 
        editNameInput.blur();
        onUpdatedInput({ id: 0, str: '' });
      }
    };

    const handleMouseUpLink = (e: MouseEvent) => {
      const editLinkInput = document.getElementById(`editLinkInput-${link.id}`);
      if (
        editLinkInput &&
        !editLinkInput.contains(e.target as Node) && 
        selectedStr === 'isLink' && 
        link.id === selectedId
      ) {
        editLinkInput.blur();
        onUpdatedInput({ id: 0, str: '' });
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseup', handleMouseUpLink);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseup', handleMouseUpLink);
    };
  }, [link.id, selectedId, selectedStr, onUpdatedInput]);

  const updateLink = useDebounce(async () => {
    try {
      await userStore.updateLink(link.id, name, url);
      await userStore.getAllLinks();
      if (onLinkUpdated) onLinkUpdated();
    } catch (error) {
      console.log(error);
    }
  }, 500);

  const changeInput = (str: string, linkIdNameString: string) => {
    if (selectedId === link.id && selectedStr === str) {
      setTimeout(() => {
        const element = document.getElementById(`${linkIdNameString}-${link.id}`);
        if (element) element.focus();
      }, 100);
    }
  };

  const editName = (selectedId: number, selectedStr: string) => {
    if (userStore.isMobile) {
      userStore.setUpdatedLinkId(selectedId);
      return false;
    } else if (selectedId === link.id && selectedStr === 'isName') {
      return true;
    }
    return false;
  };

  const editLink = (selectedId: number, selectedStr: string) => {
    if (userStore.isMobile) {
      userStore.setUpdatedLinkId(selectedId);
      return false;
    } else if (selectedId === link.id && selectedStr === 'isLink') {
      return true;
    }
    return false;
  };

  const editImage = () => {
    if (userStore.isMobile) {
      userStore.setUpdatedLinkId(link.id);
    } else {
      setIsUploadImage(true);
      setIsDelete(false);
    }
  };

  const updateLinkImage = async () => {
    if (!data) return;
    
    try {
      await userStore.updateLinkImage(data, link.id);
      await userStore.getAllLinks();
      if (onLinkUpdated) onLinkUpdated();
      setTimeout(() => setOpenCropper(false), 300);
    } catch (error) {
      console.log(error);
    }
  };

  const deleteLink = async () => {
    const res = confirm('Are you sure you want to delete this link?');
    try {
      if (res) {
        await userStore.deleteLink(link.id);
        await userStore.getAllLinks();
        if (onLinkUpdated) onLinkUpdated();
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Watch for name changes
  useEffect(() => {
    if (name && name !== link.name) {
      updateLink();
    }
  }, [name]);

  // Watch for URL changes
  useEffect(() => {
    if (url && url !== link.url) {
      updateLink();
    }
  }, [url]);

  // Watch for selectedId changes
  useEffect(() => {
    if (selectedId) {
      changeInput('isName', 'editNameInput');
      changeInput('isLink', 'editLinkInput');
    }
  }, [selectedId]);

  // Watch for selectedStr changes
  useEffect(() => {
    if (selectedStr) {
      changeInput('isName', 'editNameInput');
      changeInput('isLink', 'editLinkInput');
    }
  }, [selectedStr]);

  // Watch for updatedLinkId changes
  useEffect(() => {
    if (!userStore.updatedLinkId) {
      onUpdatedInput({ id: 0, str: '' });
    }
  }, [userStore.updatedLinkId]);

  // Compute edit states to avoid calling functions during render
  const isEditingName = userStore.isMobile ? false : (selectedId === link.id && selectedStr === 'isName');
  const isEditingLink = userStore.isMobile ? false : (selectedId === link.id && selectedStr === 'isLink');

  return (
    <div id={`LinkBox${link.id}`} className={`w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl ${className}`}>
      <div id="MainLinkBoxSection" className="px-6 py-4">
        <div className="flex items-center justify-between py-3 mb-3">
          <div className="flex items-center w-full">
            {isEditingName ? (
              <input 
                id={`editNameInput-${link.id}`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={18}
                className="w-full text-sm font-semibold focus:outline-none bg-transparent text-white"
                style={{ 
                  fontFamily: 'Irys1',
                  letterSpacing: '0.1em'
                }}
              />
            ) : (
              <div className="flex items-center w-full">
                <div 
                  onClick={() => {
                    setName(link.name);
                    onUpdatedInput({ id: link.id, str: 'isName' });
                  }}
                  className={`font-semibold mr-3 cursor-pointer text-white ${
                    userStore.isMobile ? 'text-xl' : 'text-sm'
                  }`}
                  style={{ 
                    fontFamily: 'Irys1',
                    letterSpacing: '0.1em'
                  }}
                >
                  {link.name.toUpperCase()}
                </div>
                <svg 
                  onClick={() => onUpdatedInput({ id: link.id, str: 'isName' })}
                  className={`cursor-pointer ${
                    userStore.isMobile ? 'w-[23px] h-[23px]' : 'w-[17px] h-[17px]'
                  }`}
                  fill="none" 
                  stroke="#67FFD4" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" 
                  />
                </svg>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            {/* Move Up Arrow */}
            <button
              onClick={() => userStore.moveLink(link.id, 'up')}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${
                userStore.allLinks.findIndex(l => l.id === link.id) === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
              disabled={userStore.allLinks.findIndex(l => l.id === link.id) === 0}
              title="Move up"
            >
              <svg 
                className={`${
                  userStore.isMobile ? 'w-[18px] h-[18px]' : 'w-[14px] h-[14px]'
                }`}
                fill="none" 
                stroke="#67FFD4" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 15l7-7 7 7" 
                />
              </svg>
            </button>
            
            {/* Move Down Arrow */}
            <button
              onClick={() => userStore.moveLink(link.id, 'down')}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${
                userStore.allLinks.findIndex(l => l.id === link.id) === userStore.allLinks.length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
              disabled={userStore.allLinks.findIndex(l => l.id === link.id) === userStore.allLinks.length - 1}
              title="Move down"
            >
              <svg 
                className={`${
                  userStore.isMobile ? 'w-[18px] h-[18px]' : 'w-[14px] h-[14px]'
                }`}
                fill="none" 
                stroke="#67FFD4" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 9l-7 7-7-7" 
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 mb-4">
          <div className="flex items-center w-full">
            {isEditingLink ? (
              <input 
                id={`editLinkInput-${link.id}`}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full text-sm focus:outline-none bg-transparent text-white/80"
                style={{ fontFamily: 'Irys2' }}
              />
            ) : (
              <div className="flex items-center w-[calc(100%-2px)]">
                <div 
                  onClick={() => {
                    setUrl(link.url);
                    onUpdatedInput({ id: link.id, str: 'isLink' });
                  }}
                  className={`mr-3 truncate cursor-pointer text-white/80 ${
                    userStore.isMobile ? 'text-lg' : 'text-sm'
                  }`}
                  style={{ fontFamily: 'Irys2' }}
                >
                  {link.url}
                </div>
                <svg 
                  onClick={() => onUpdatedInput({ id: link.id, str: 'isLink' })}
                  className={`cursor-pointer ${
                    userStore.isMobile ? 'min-w-[23px] w-[23px] h-[23px]' : 'min-w-[17px] w-[17px] h-[17px]'
                  }`}
                  fill="none" 
                  stroke="#67FFD4" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" 
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between py-3">
          <div className="flex items-center w-full">
            <div className="flex items-center gap-3">
              <img 
                src={getSocialLogoContext(url, true)} 
                alt={getSocialPlatformName(url)}
                className={`${
                  userStore.isMobile ? 'w-[28px] h-[28px]' : 'w-[20px] h-[20px]'
                }`}
              />
              <span className="text-sm text-white/60" style={{ fontFamily: 'Irys2' }}>
                {getSocialPlatformName(url)}
              </span>
            </div>
          </div>
          {!userStore.isMobile && (
            <div className="flex items-center">
              <div className="flex items-center px-2 py-1 rounded-md relative">
                <button 
                  onClick={() => {
                    setIsDelete(true);
                    setIsUploadImage(false);
                  }}
                  className={`flex items-center px-2 py-1 absolute -right-2 rounded-md ${
                    isDelete ? 'bg-[#67FFD4]' : 'hover:bg-white/10'
                  }`}
                >
                  <svg 
                    className="cursor-pointer w-[20px] h-[20px]"
                    fill={isDelete ? '#000000' : '#67FFD4'}
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Section */}
      <div
        id="FooterLinkDeleteSection"
        className={`overflow-hidden transition-all ${
          isDelete 
            ? 'max-h-[180px] duration-300 ease-in' 
            : 'max-h-0 duration-200 ease-out'
        }`}
      >
        <button 
          onClick={() => setIsDelete(false)}
          className="relative w-full bg-white/10 backdrop-blur-xl border border-white/20 py-3 hover:bg-white/20 transition-colors"
        >
          <svg
            className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer w-5 h-5" 
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
          <div className="text-center text-sm font-bold text-white" style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}>
            DELETE
          </div>
        </button>

        <div className="flex items-center justify-center pt-4 pb-3">
          <span className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>
            Delete this forever?
          </span>
        </div>

        <div className="w-full px-4 py-3">
          <div className="flex items-center gap-3 w-full">
            <button     
              onClick={() => setIsDelete(false)}
              className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-colors font-medium"
              style={{ fontFamily: 'Irys2' }}
            >
              CANCEL
            </button>
            <button     
              onClick={deleteLink}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium shadow-lg"
              style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}
            >
              DELETE
            </button>
          </div>
        </div>
      </div>




    </div>
  );
}