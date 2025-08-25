import React from 'react';
import { useLinktreeStore } from '../context/LinktreeContext';
import { getSocialLogo, getSocialPlatformName } from '../../../utils/socialDetection';

export default function MobilePreview() {
  const userStore = useLinktreeStore();

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        {/* Profile Section */}
        <div className="text-center mb-6">
          {userStore.image && (
            <div className="w-20 h-20 mx-auto mb-4">
              <img 
                src={userStore.image} 
                alt={userStore.name} 
                className="w-full h-full rounded-full object-cover border-2 border-white/20"
              />
            </div>
          )}
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
            {userStore.name.toUpperCase()}
          </h2>
          {userStore.bio && (
            <p className="text-white/60 text-sm mb-4" style={{ fontFamily: 'Irys2' }}>
              {userStore.bio}
            </p>
          )}
        </div>

        {/* Links Section */}
        <div className="space-y-3">
          {userStore.allLinks.map((link) => (
            <div 
              key={link.id}
              className="w-full bg-white/10 border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <img 
                  src={getSocialLogo(link.url)} 
                  alt={getSocialPlatformName(link.url)}
                  className="w-6 h-6"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-sm" style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}>
                    {link.name.toUpperCase()}
                  </h3>
                  <p className="text-white/60 text-xs truncate" style={{ fontFamily: 'Irys2' }}>
                    {getSocialPlatformName(link.url)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



