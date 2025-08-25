import React from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { useLinktreeStore } from '../context/LinktreeContext';

interface AdminPreviewProps {
  standalone?: boolean; // If true, don't use AdminLayout
}

export default function AdminPreview({ standalone = false }: AdminPreviewProps) {
  const userStore = useLinktreeStore();

  // Add loading state and fallback data
  const displayName = userStore.name || userStore.username || 'Demo User';
  const displayBio = userStore.bio || 'Welcome to my Linktree on Iryshare!';
  const displayImage = userStore.image || '/default-avatar.png';
  const displayLinks = userStore.allLinks || [];
  const currentTheme = userStore.theme || { color: 'bg-gradient-to-br from-purple-400 to-blue-400', text: 'text-white' };

  // Standalone preview content (without admin layout)
  const renderPreviewContent = () => (
    <div className="min-h-screen">
      <div 
        className={`fixed overflow-auto w-full h-screen ${currentTheme.color}`}
      />

      <div className="relative z-10 min-h-screen">
        <div 
          id="PreviewAdminPage" 
          className="w-full mx-auto pt-32 relative z-10"
        >
          <div className="mx-auto w-full">
            <div className="h-full mx-auto w-full">
              <img 
                className="rounded-full min-w-[120px] w-[120px] h-[120px] mx-auto object-cover"
                src={displayImage}
                alt="Profile"
                onError={(e) => {
                  e.currentTarget.src = '/default-avatar.png';
                }}
              />

              <div 
                className={`text-center text-2xl font-semibold mt-2 ${currentTheme.text}`}
              >
                @{userStore.allLowerCaseNoCaps(displayName)}
              </div>

              <div 
                className={`text-center text-lg font-light mt-2 mb-10 ${currentTheme.text}`}
              >
                <div className="px-8">
                  {displayBio}
                </div>
              </div>

              {displayLinks.length > 0 ? (
                displayLinks.map((link, index) => (
                  <a
                    key={link.id || index}
                    href={link.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center relative border w-[calc(100%-10px)] mx-auto bg-white mt-4 p-1 rounded-lg hover:shadow-lg transition-shadow"
                  >
                    <img 
                      className="rounded-full h-[55px] w-[55px] object-cover"
                      src={link.image || '/link-placeholder.png'}
                      alt={link.name}
                      onError={(e) => {
                        e.currentTarget.src = '/link-placeholder.png';
                      }}
                    />

                    <div className="absolute text-[20px] text-center w-full text-gray-800" style={{ 
                      fontFamily: 'Irys1',
                      letterSpacing: '0.05em'
                    }}>
                      {link.name.toUpperCase()}
                    </div>
                  </a>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">No Links Yet</h3>
                  <p className="text-sm text-gray-500">Add some links to your Linktree</p>
                </div>
              )}

              <div className="pb-32"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // If standalone, render just the preview content
  if (standalone) {
    return renderPreviewContent();
  }

  // If not standalone, render with AdminLayout (for admin dashboard)
  return (
    <>
      <div 
        className={`fixed overflow-auto w-full h-screen ${currentTheme.color}`}
      />

      <AdminLayout>
        <div 
          id="PreviewAdminPage" 
          className="w-full mx-auto pt-32 relative z-10"
        >
          <div className="mx-auto w-full">
            <div className="h-full mx-auto w-full">
              <img 
                className="rounded-full min-w-[120px] w-[120px] h-[120px] mx-auto object-cover"
                src={displayImage}
                alt="Profile"
                onError={(e) => {
                  e.currentTarget.src = '/default-avatar.png';
                }}
              />

              <div 
                className={`text-center text-2xl font-semibold mt-2 ${currentTheme.text}`}
              >
                @{userStore.allLowerCaseNoCaps(displayName)}
              </div>

              <div 
                className={`text-center text-lg font-light mt-2 mb-10 ${currentTheme.text}`}
              >
                <div className="px-8">
                  {displayBio}
                </div>
              </div>

              {displayLinks.length > 0 ? (
                displayLinks.map((link, index) => (
                  <a
                    key={link.id || index}
                    href={link.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center relative border w-[calc(100%-10px)] mx-auto bg-white mt-4 p-1 rounded-lg hover:shadow-lg transition-shadow"
                  >
                    <img 
                      className="rounded-full h-[55px] w-[55px] object-cover"
                      src={link.image || '/link-placeholder.png'}
                      alt={link.name}
                      onError={(e) => {
                        e.currentTarget.src = '/link-placeholder.png';
                      }}
                    />

                    <div className="absolute text-[20px] text-center w-full text-gray-800" style={{ 
                      fontFamily: 'Irys1',
                      letterSpacing: '0.05em'
                    }}>
                      {link.name.toUpperCase()}
                    </div>
                  </a>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">No Links Yet</h3>
                  <p className="text-sm text-gray-500">Add some links to your Linktree</p>
                </div>
              )}

              <div className="pb-32"/>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}