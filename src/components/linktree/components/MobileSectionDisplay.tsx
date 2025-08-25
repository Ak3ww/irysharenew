import React from 'react';
import { useLinktreeStore } from '../context/LinktreeContext';
import IryshareFooter from './IryshareFooter';
import { getSocialLogo } from '../../../utils/socialDetection';

export default function MobileSectionDisplay() {
  const userStore = useLinktreeStore();

  // Don't render if no theme (like the original v-if="userStore.theme")
  if (!userStore.theme) {
    return null;
  }

  return (
    <div className="md:block fixed hidden right-0 lg:w-[500px] w-[310px] h-[calc(100%-20px)] mt-[20px] mx-auto border-l border-l-gray-300 pt-20">
      <div className="mx-auto mt-16 mb-16 flex items-center justify-center w-full lg:max-w-[230px] max-w-[200px] lg:h-[460px] h-[400px] p-3 rounded-3xl relative">
        {/* Mobile Case Image */}
        <img 
          className="absolute z-10 pointer-events-none select-none" 
          src="/mobile-case.png"
          alt="Mobile Case"
        />

        {/* Screen Background */}
        <div 
          className={`w-full h-full absolute lg:max-w-[220px] max-w-[195px] rounded-3xl z-0 ${userStore.theme.color}`}
        />

        {/* Screen Content */}
        <div className="h-full mx-auto w-full overflow-auto z-10">
          {/* Profile Image */}
          <img 
            className="rounded-full min-w-[60px] w-[60px] h-[60px] mx-auto mt-8 object-cover"
            src={userStore.image || '/default-avatar.png'}
            alt="Profile"
          />

          {/* Profile Title (Display Name) */}
          <div 
            className={`text-center text-sm font-bold mt-2 ${userStore.theme.text}`}
            style={{ 
              fontFamily: 'Irys1',
              letterSpacing: '0.1em'
            }}
          >
            {userStore.name && userStore.name.trim() !== '' 
              ? userStore.name.toUpperCase()
              : userStore.username ? userStore.username.toUpperCase() : 'DEMO USER'
            }
          </div>

          {/* Username display removed - only show Profile Title or username, not both */}

          {/* Bio */}
          <div 
            className={`text-center text-xs font-light mt-1 mb-4 ${userStore.theme.text}`}
            style={{ 
              fontFamily: 'Irys2'
            }}
          >
            <div className="px-4">
              {userStore.bio}
            </div>
          </div>

          {/* Links */}
          {userStore.allLinks?.map((link, index) => (
            <a
              key={link.id || index}
              href={link.url} 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center relative border w-[calc(100%-10px)] mx-auto bg-white mt-2 p-1 rounded-lg"
            >
              <img 
                className="rounded-lg h-[25px] w-[25px] object-cover"
                src={getSocialLogo(link.url)}
                alt={link.name}
              />

              <div className="absolute text-[10px] text-center w-full text-gray-800" style={{ 
                fontFamily: 'Irys1',
                letterSpacing: '0.05em'
              }}>
                {link.name.toUpperCase()}
              </div>
            </a>
          ))}


          
          <div className="pb-8"/>
        </div>
      </div>
    </div>
  );
}