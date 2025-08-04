import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Eye, EyeOff, FileText, Calendar, User } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { ProfileSearch } from './ui/profile-search';

interface ProfileData {
  id?: number;
  username: string;
  address: string;
  profile_bio?: string | null;
  profile_avatar?: string | null;
  profile_public?: boolean | null;
  created_at: string;
  updated_at?: string;
  // Optional fields that might not exist
  last_active?: string;
  public_file_count?: number;
  total_storage_used?: number;
}

interface ProfileFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  created_at: string;
  tags: string;
}

export function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileFiles, setProfileFiles] = useState<ProfileFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProfileFile | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [showProfileSearch, setShowProfileSearch] = useState(false);

  // Extract username from URL (remove @ if present)
  const cleanUsername = username?.startsWith('@') ? username.slice(1) : username;

  useEffect(() => {
    if (!cleanUsername) {
      setError('No username provided');
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get profile data (including private profiles)
        const { data: profileResult, error: profileError } = await supabase
          .from('usernames')
          .select('*')
          .eq('username', cleanUsername)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          setError('Profile not found');
          setLoading(false);
          return;
        }

        if (!profileResult) {
          setError('Profile not found');
          setLoading(false);
          return;
        }

        console.log('Profile data received:', profileResult);

        const profile = profileResult;
        setProfileData(profile);

        // Load files based on profile visibility
        // If profile is private, still show files but indicate they're hidden
        console.log('🔍 Loading files for address:', profile.address.toLowerCase());
        
        const { data: filesResult, error: filesError } = await supabase
          .from('files')
          .select('*')
          .eq('owner_address', profile.address.toLowerCase())
          .eq('is_public', true)
          .eq('profile_visible', true)
          .order('created_at', { ascending: false })
          .limit(20);

        console.log('📁 Files query result:', { filesResult, filesError });

        if (filesError) {
          console.error('Error loading files:', filesError);
          setProfileFiles([]);
        } else {
          setProfileFiles(filesResult || []);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [cleanUsername]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#67FFD4] text-xl mb-4" style={{ fontFamily: 'Irys2' }}>
            Loading profile...
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#67FFD4] mx-auto"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4" style={{ fontFamily: 'Irys2' }}>
            {error}
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn-irys"
            style={{ background: '#67FFD4', color: '#111', fontWeight: 'bold', borderRadius: 8, padding: '10px 20px', fontFamily: 'Irys2' }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400 text-xl" style={{ fontFamily: 'Irys2' }}>Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-[#67FFD4] hover:text-[#8AFFE4] transition-colors"
            style={{ fontFamily: 'Irys2' }}
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl text-white" style={{ fontFamily: 'Irys' }}>IRYSHARE</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfileSearch(true)}
              className="text-[#67FFD4] hover:text-[#8AFFE4] transition-colors flex items-center gap-2"
              style={{ fontFamily: 'Irys2' }}
              title="Search Profiles"
            >
              <Search size={16} />
              Search
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-[#67FFD4] hover:text-[#8AFFE4] transition-colors"
              style={{ fontFamily: 'Irys2' }}
              title="Refresh Profile"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            {profileData.profile_avatar ? (
              <img
                src={profileData.profile_avatar}
                alt={`${profileData.username}'s avatar`}
                className="w-16 h-16 rounded-full mr-4"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#67FFD4] flex items-center justify-center mr-4">
                <span className="text-[#111] text-xl font-bold" style={{ fontFamily: 'Irys2' }}>
                  {profileData.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl text-white" style={{ fontFamily: 'Irys2' }}>
                  @{profileData.username}
                </h2>
                {profileData.profile_public === false ? (
                  <div className="flex items-center gap-1 text-amber-400 text-sm">
                    <EyeOff size={16} />
                    <span>Private</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-400 text-sm">
                    <Eye size={16} />
                    <span>Public</span>
                  </div>
                )}
              </div>
              <p className="text-gray-400" style={{ fontFamily: 'Irys2' }}>
                {profileData.address}
              </p>
            </div>
          </div>

          {profileData.profile_bio && (
            <div className="mb-4">
              <p className="text-white" style={{ fontFamily: 'Irys2' }}>{profileData.profile_bio}</p>
            </div>
          )}

          <div className="flex gap-4 text-sm text-gray-400">
            <span>Joined: {new Date(profileData.created_at).toLocaleDateString()}</span>
            <span>Files: {profileFiles.length}</span>
          </div>
        </div>

        {/* Files Section */}
        <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl text-white" style={{ fontFamily: 'Irys2' }}>
              {profileData.profile_public === false ? 'Public Files (Hidden)' : 'Public Files'}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FileText size={16} />
              <span>{profileFiles.length} files</span>
            </div>
          </div>
          
          {profileData.profile_public === false ? (
            <div className="text-center py-12">
              <EyeOff size={48} className="mx-auto mb-4 text-amber-400" />
              <h4 className="text-white text-lg mb-2" style={{ fontFamily: 'Irys2' }}>
                Profile is Private
              </h4>
              <p className="text-gray-400 mb-4">
                This user has set their profile to private. Their public files are hidden.
              </p>
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-400 text-sm">
                  <strong>Note:</strong> The profile is still searchable, but file content is hidden when set to private.
                </p>
              </div>
            </div>
          ) : profileFiles.length === 0 ? (
            <p className="text-[#67FFD4] text-center py-8" style={{ fontFamily: 'IrysItalic' }}>
              No public files yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profileFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className="bg-[#222] border border-[#67FFD4] rounded-lg p-4 cursor-pointer hover:bg-[#333] transition-colors"
                >
                  <h4 className="text-white font-bold mb-2" style={{ fontFamily: 'Irys2' }}>
                    {file.file_name}
                  </h4>
                  <p className="text-gray-400 text-sm mb-2">
                    Size: {formatFileSize(file.file_size_bytes)}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Uploaded: {formatDate(file.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Profile Search Modal */}
      <ProfileSearch 
        isOpen={showProfileSearch}
        onClose={() => setShowProfileSearch(false)}
        currentAddress={profileData?.address}
      />
    </div>
  );
} 