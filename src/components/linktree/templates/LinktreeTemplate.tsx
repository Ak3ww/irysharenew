import React from 'react';
import { getSocialLogo, detectSocialPlatform } from '../../../utils/socialDetection';

export interface TemplateProps {
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
    id: number;
    color: string;
    text: string;
    name: string;
  };
}

// Classic Template - Matches Dashboard Mobile Preview exactly
export const ClassicTemplate: React.FC<TemplateProps> = ({ profile, links, theme }) => {
  return (
    <div
      className={`min-h-screen w-full ${theme.color}`}
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div className="w-full max-w-[520px] mx-auto px-[14px] py-[14px]">
        {/* Profile Header - Linktree Style */}
        <div className="text-center mb-6">
          <img
            className="rounded-full w-[96px] h-[96px] mx-auto mt-14 object-cover shadow-lg"
            src={profile.image || '/default-avatar.png'}
            alt="Profile"
          />

          {/* Profile Title (Display Name) */}
          <div className={`text-center text-xl font-bold mt-4 mb-3 ${theme.text}`} style={{ 
            lineHeight: '1.5',
            fontFamily: 'Irys1',
            letterSpacing: '0.1em'
          }}>
            {profile.name && profile.name.trim() !== '' 
              ? profile.name.toUpperCase()
              : 'DEMO USER'
            }
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className={`text-center text-sm font-medium mt-3 mb-8 ${theme.text}`} style={{ 
              lineHeight: '1.5',
              fontFamily: 'Irys2'
            }}>
              <div className="px-4 max-w-md mx-auto">
                {profile.bio}
              </div>
            </div>
          )}
        </div>

        {/* Links - Linktree Style Layout */}
        <div className="space-y-[14px] max-w-[480px] mx-auto">
          {links?.map((link, index) => (
            <a
              key={link.id || index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center relative w-full bg-white border-none rounded-lg p-4 hover:scale-[1.02] transition-all duration-150 shadow-sm hover:shadow-md text-center min-h-[56px]"
              style={{ 
                backgroundColor: 'var(--button-style-background, #fff)',
                color: 'var(--button-style-text, #000)',
                borderRadius: 'var(--button-style-radius, 8px)'
              }}
            >
              <img 
                className="rounded-lg h-[32px] w-[32px] object-cover absolute left-4"
                src={getSocialLogo(link.url)}
                alt={link.name}
              />

              <div className="text-sm font-medium flex-1 px-12" style={{ 
                fontSize: 'var(--linkTextFontSize, 14px)',
                fontWeight: 'var(--linkTextFontWeight, 500)',
                lineHeight: '1.5',
                fontFamily: 'Irys1',
                letterSpacing: '0.05em'
              }}>
                {link.name.toUpperCase()}
              </div>
            </a>
          ))}
        </div>

        <div className="pb-16"/>
      </div>
    </div>
  );
};

// Minimal Template - Ultra-clean design
export const MinimalTemplate: React.FC<TemplateProps> = ({ profile, links, theme }) => {
  return (
    <div className={`min-h-screen w-full flex items-center justify-center ${theme.color}`}>
      <div className="w-full max-w-[300px] mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-gray-300 flex items-center justify-center">
            {profile.image ? (
              <img src={profile.image} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="text-gray-500 text-xl">👤</div>
            )}
          </div>
          
          <h1 className={`text-lg font-light mb-1 ${theme.text}`} style={{ 
            fontFamily: 'Irys1',
            letterSpacing: '0.1em'
          }}>
            {profile.name ? profile.name.toUpperCase() : 'USERNAME'}
          </h1>
          
          {profile.bio && (
            <p className={`text-xs opacity-70 ${theme.text}`} style={{ 
              fontFamily: 'Irys2'
            }}>
              {profile.bio}
            </p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-4">
          {links.map((link) => (
            <a 
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block w-full py-3 text-center text-sm font-light border-b transition-opacity hover:opacity-70 ${theme.text}`}
              style={{ 
                borderColor: theme.text === 'text-white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
                fontFamily: 'Irys1',
                letterSpacing: '0.05em'
              }}
            >
              {link.name.toUpperCase()}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// Card Template - Modern card-based layout
export const CardTemplate: React.FC<TemplateProps> = ({ profile, links, theme }) => {
  const renderLinkIcon = (link: any) => {
    if (link.image) {
      return <img src={link.image} alt={link.name} className="w-8 h-8 rounded-lg object-cover" />;
    }
    
    const socialPlatform = detectSocialPlatform(link.url);
    if (socialPlatform && socialPlatform.logo) {
      return <img src={socialPlatform.logo} alt={socialPlatform.name} className="w-8 h-8 rounded-lg object-contain" />;
    }
    
    return (
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
        style={{ backgroundColor: socialPlatform?.color || '#6B7280' }}
      >
        {link.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center ${theme.color}`}>
      <div className="w-full max-w-[400px] mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-2xl mx-auto mb-4 bg-gray-300 flex items-center justify-center shadow-lg">
            {profile.image ? (
              <img src={profile.image} alt="Profile" className="w-24 h-24 rounded-2xl object-cover" />
            ) : (
              <div className="text-gray-500 text-3xl">👤</div>
            )}
          </div>
          
          <h1 className={`text-xl font-bold mb-2 ${theme.text}`} style={{ 
            fontFamily: 'Irys1',
            letterSpacing: '0.1em'
          }}>
            {profile.name ? profile.name.toUpperCase() : 'USERNAME'}
          </h1>
          
          {profile.bio && (
            <p className={`text-sm mb-6 ${theme.text}`} style={{ 
              fontFamily: 'Irys2'
            }}>
              {profile.bio}
            </p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-4">
          {links.map((link) => (
            <a 
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full p-4 rounded-2xl font-medium bg-white hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl border border-gray-100"
            >
              <div className="flex items-center space-x-4">
                {renderLinkIcon(link)}
                <span className="text-gray-800 flex-1" style={{ 
                  fontFamily: 'Irys1',
                  letterSpacing: '0.05em'
                }}>{link.name.toUpperCase()}</span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// Rounded Template - Soft rounded design
export const RoundedTemplate: React.FC<TemplateProps> = ({ profile, links, theme }) => {
  const renderLinkIcon = (link: any) => {
    if (link.image) {
      return <img src={link.image} alt={link.name} className="w-6 h-6 rounded-full object-cover" />;
    }
    
    const socialPlatform = detectSocialPlatform(link.url);
    if (socialPlatform && socialPlatform.logo) {
      return <img src={socialPlatform.logo} alt={socialPlatform.name} className="w-6 h-6 rounded-full object-contain" />;
    }
    
    return (
      <div 
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: socialPlatform?.color || '#6B7280' }}
      >
        {link.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center ${theme.color}`}>
      <div className="w-full max-w-[400px] mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-gray-300 flex items-center justify-center">
            {profile.image ? (
              <img src={profile.image} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="text-gray-500 text-2xl">👤</div>
            )}
          </div>
          
          <h1 className={`text-xl font-bold mb-2 ${theme.text}`} style={{ 
            fontFamily: 'Irys1',
            letterSpacing: '0.1em'
          }}>
            {profile.name ? profile.name.toUpperCase() : 'USERNAME'}
          </h1>
          
          {profile.bio && (
            <p className={`text-sm mb-6 ${theme.text}`} style={{ 
              fontFamily: 'Irys2'
            }}>
              {profile.bio}
            </p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-3">
          {links.map((link) => (
            <a 
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full p-4 rounded-full text-center font-medium bg-white hover:bg-gray-50 transition-colors duration-200 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-center space-x-3">
                {renderLinkIcon(link)}
                <span className="text-gray-800" style={{ 
                  fontFamily: 'Irys1',
                  letterSpacing: '0.05em'
                }}>{link.name.toUpperCase()}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
