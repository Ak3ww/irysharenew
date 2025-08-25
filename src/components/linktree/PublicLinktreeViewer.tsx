import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { getLinktreeFromIrys, type LinktreeMetadata } from '../../utils/irysLinktreeStorage';
import { ClassicTemplate } from './templates/LinktreeTemplate';
import IryshareFooter from './components/IryshareFooter';
import ShareModal from './components/ShareModal';


export default function PublicLinktreeViewer() {
  const { username: randomLink } = useParams<{ username: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LinktreeMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');


  useEffect(() => {
    if (randomLink) {
      loadPublicData();
    }
  }, [randomLink]);

  const loadPublicData = async () => {
    if (!randomLink) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const linktreeData = await getLinktreeFromIrys(randomLink);
      if (linktreeData) {
        setData(linktreeData);
      } else {
        setError('Linktree not found');
      }
    } catch (error) {
      console.error('Error loading public linktree:', error);
      setError('Failed to load linktree');
    } finally {
      setLoading(false);
    }
  };

  const shareLinktree = () => {
    // Open ShareModal directly with current URL
    const currentUrl = window.location.href;
    setShareUrl(currentUrl);
    setIsShareModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#67FFD4] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading linktree...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
            LINKTREE NOT FOUND
          </h1>
          <p className="text-white/60 mb-6 max-w-md" style={{ fontFamily: 'Irys2' }}>
            This linktree doesn't exist or may have been removed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[#67FFD4] text-black font-semibold rounded-lg hover:bg-[#8AFFE4] transition-colors"
            style={{ fontFamily: 'Irys2' }}
          >
            BACK TO IRYSHARE
          </button>
        </div>
      </div>
    );
  }

  // Get theme colors (exact from original linktree)
  const THEME_COLORS = [
    { id: 1, color: 'bg-gradient-to-b from-sky-100 via-blue-50 to-white', text: 'text-gray-800', name: 'Air Blue' },
    { id: 2, color: 'bg-gray-800', text: 'text-white', name: 'Lake Black' },
    { id: 3, color: 'bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-500', text: 'text-white', name: 'Purple Pie' },
    { id: 4, color: 'bg-gradient-to-t from-gray-500 via-blue-500 to-green-500', text: 'text-white', name: 'Green Grass' },
    { id: 5, color: 'bg-gradient-to-t from-orange-500 via-green-500 to-red-500', text: 'text-white', name: 'Traffic Lights' },
    { id: 6, color: 'bg-gradient-to-b from-blue-800 via-blue-500 to-green-500', text: 'text-white', name: 'Blue Sky' },
    { id: 7, color: 'bg-gradient-to-t from-lime-500 via-indigo-700 to-amber-500', text: 'text-white', name: 'Soft Horizon' },
    { id: 8, color: 'bg-gradient-to-t from-gray-800 to-emerald-500', text: 'text-white', name: 'Tinted Lake' },
  ];

  // Use the theme from the data directly since it's already in the correct format
  const theme = data.theme || THEME_COLORS[0];

  // Prepare props for templates
  const templateProps = {
    profile: {
      name: data.name || data.username || 'Demo User',
      bio: data.bio || '',
      image: data.image
    },
    links: (data.links || []).map(link => ({
      ...link,
      id: String(link.id) // Convert number ID to string to match TemplateProps interface
    })),
    theme
  };

  // Render the Classic template (default)
  const renderTemplate = () => {
    return <ClassicTemplate {...templateProps} />;
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Wider Frame Based on Linktree Design */}
      <div className="relative w-full max-w-[580px] mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden relative min-h-[700px]">
          {/* Navigation Controls - Inside Border Header */}
          <div className="absolute top-4 left-4 right-4 z-50 flex justify-between">
            <button
              onClick={() => navigate('/linktree/admin')}
              className="p-2 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200 transition-colors shadow-sm"
              aria-label="Go to Linktree admin dashboard"
              title="Go to Linktree admin dashboard"
            >
              <img src="/iryshare_logo.svg" alt="Iryshare" className="w-5 h-5" />
            </button>

            <button
              onClick={shareLinktree}
              className="p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200 transition-colors shadow-sm"
            >
              <Share2 size={20} />
            </button>
          </div>

          {/* Template Render - Inside Border */}
          <div className="w-full h-full">
            {renderTemplate()}
            
            {/* Linktree-style CTA Footer */}
            <IryshareFooter username={randomLink || 'demo'} />
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareUrl={shareUrl}
        />
      )}
    </div>
  );
}
