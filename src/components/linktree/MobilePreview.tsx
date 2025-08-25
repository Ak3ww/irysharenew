import React from 'react';

interface MobilePreviewProps {
  profile: {
    name: string;
    bio: string;
    image?: string;
  };
  links: Array<{
    id: string;
    name: string;
    url: string;
    image?: string;
  }>;
  theme: {
    color: string;
    text: string;
  };
}

// Exact copy of MobileSectionDisplay.vue converted to React
export default function MobilePreview({ profile, links, theme }: MobilePreviewProps) {
  const allLowerCaseNoCaps = (str: string) => {
    return str.split(' ').join('').toLowerCase();
  };

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
          className={`w-full h-full absolute lg:max-w-[220px] max-w-[195px] rounded-3xl z-0 ${theme.color}`}
        />

        {/* Screen Content */}
        <div className="h-full mx-auto w-full overflow-auto z-10">
          {/* Profile Image */}
          <img 
            className="rounded-full min-w-[60px] w-[60px] mx-auto mt-8"
            src={profile.image || '/default-avatar.png'}
            alt="Profile"
          />

          {/* Username */}
          <div 
            className={`text-center text-sm font-semibold mt-4 break-words ${theme.text}`}
            style={{ 
              fontFamily: 'Irys1',
              letterSpacing: '0.1em'
            }}
          >
            @{allLowerCaseNoCaps(profile.name || 'username')}
          </div>

          {/* Bio */}
          <div 
            className={`text-center text-[8px] font-semibold mt-2 mb-4 ${theme.text}`}
            style={{ 
              fontFamily: 'Irys2'
            }}
          >
            <div className="px-8 break-words">
              {profile.bio}
            </div>
          </div>

          {/* Links */}
          {links.map((link) => (
            <a 
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center relative w-[calc(100%-10px)] mx-auto border bg-white mt-2 p-1 rounded-xl"
            >
              <img 
                className="rounded-lg h-[30px] aspect-square"
                src={link.image || '/link-placeholder.png'}
                alt={link.name}
              />

              <div className="absolute w-full">
                <div className="max-w-[70%] w-full mx-auto text-[10px] text-center" style={{ 
                  fontFamily: 'Irys1',
                  letterSpacing: '0.05em'
                }}>
                  {link.name.toUpperCase()}
                </div>
              </div>
            </a>
          ))}

          <div className="pb-12"/>
        </div>
      </div>
    </div>
  );
}