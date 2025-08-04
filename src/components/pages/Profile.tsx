import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { ProfileSearch } from '../ui/profile-search';
import { FileCard } from '../ui/file-card';
import { FilePreview } from '../ui/file-preview';
import { Button } from '../ui/button';

interface ProfileData {
  id?: number;
  username: string;
  address: string;
  profile_bio?: string | null;
  profile_avatar?: string | null;
  profile_public?: boolean | null;
  created_at: string;
  updated_at?: string;
  public_file_count?: number;
}

interface ProfileFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  file_type: string;
  tags: string[];
  is_encrypted: boolean;
  is_public: boolean;
  profile_visible: boolean;
  created_at: string;
  updated_at: string;
  owner_address: string;
}

export function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileFiles, setProfileFiles] = useState<ProfileFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProfileSearch, setShowProfileSearch] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ProfileFile | null>(null);

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

        console.log('🔄 Loading profile for username:', cleanUsername);

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

        console.log('📊 Profile data received:', profileResult);
        console.log('🔒 Profile public status:', profileResult.profile_public);

        const profile = profileResult;
        setProfileData(profile);

        // Load files based on profile visibility
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

    // Set up real-time subscription for profile changes
    console.log('📡 Setting up real-time subscription for username:', cleanUsername);
    
    const profileSubscription = supabase
      .channel(`profile-changes-${cleanUsername}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usernames',
          filter: `username=eq.${cleanUsername}`
        },
        (payload) => {
          console.log('📡 Profile change detected:', payload);
          console.log('🔄 Reloading profile data...');
          // Reload profile data when it changes
          loadProfile();
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up subscription for:', cleanUsername);
      profileSubscription.unsubscribe();
    };
  }, [cleanUsername]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handlePreview = (file: ProfileFile) => {
    setSelectedFile(file);
  };

  const closePreview = () => {
    setSelectedFile(null);
  };

  const handleMenuAction = (action: string, file: ProfileFile) => {
    switch (action) {
      case 'download':
        handleDirectDownload(file);
        break;
      case 'share':
        // Share functionality disabled for profile files (not owned by viewer)
        console.log('Share disabled for profile files');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleDirectDownload = async (file: ProfileFile) => {
    try {
      const response = await fetch(file.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const refreshProfile = async () => {
    console.log('🔄 Manual refresh triggered');
    setLoading(true);
    
    try {
      // Force reload profile data
      const { data: profileResult, error: profileError } = await supabase
        .from('usernames')
        .select('*')
        .eq('username', cleanUsername)
        .single();

      if (profileError) {
        console.error('Refresh profile error:', profileError);
        return;
      }

      if (!profileResult) {
        console.error('No profile found on refresh');
        return;
      }

      console.log('🔄 Refreshed profile data:', profileResult);
      console.log('🔒 Refreshed profile public status:', profileResult.profile_public);

      setProfileData(profileResult);

      // Reload files
      const { data: filesResult, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('owner_address', profileResult.address.toLowerCase())
        .eq('is_public', true)
        .eq('profile_visible', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (filesError) {
        console.error('Refresh files error:', filesError);
        setProfileFiles([]);
      } else {
        setProfileFiles(filesResult || []);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#18191a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#67FFD4] mx-auto"></div>
            <p className="text-white/80 mt-4 text-lg font-medium">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#18191a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-red-400 text-xl mb-4" style={{ fontFamily: 'Irys2' }}>
              {error}
            </div>
            <Button
              onClick={() => navigate('/')}
              className="bg-[#67FFD4] text-black hover:bg-[#8AFFE4] font-bold"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-[#18191a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-red-400 text-xl" style={{ fontFamily: 'Irys2' }}>Profile not found</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#18191a] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">@{profileData.username}</h1>
                <p className="text-white/60 text-sm">
                  {profileData.profile_public === false ? 'Private profile' : 'Public profile and files'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {profileData.profile_public === false ? (
                  <div className="flex items-center gap-1 text-amber-400 text-sm">
                    <EyeOff size={16} />
                    <span>Private Profile</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-400 text-sm">
                    <Eye size={16} />
                    <span>Public Profile</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowProfileSearch(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <Search size={16} />
                Search Profiles
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshProfile}
                disabled={loading}
                className="flex items-center gap-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center mb-4">
            {profileData.profile_avatar ? (
              <img
                src={profileData.profile_avatar}
                alt={`${profileData.username}'s avatar`}
                className="w-16 h-16 rounded-full mr-4"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#67FFD4] flex items-center justify-center mr-4">
                <span className="text-black text-xl font-bold" style={{ fontFamily: 'Irys2' }}>
                  {profileData.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl text-white" style={{ fontFamily: 'Irys2' }}>
                  @{profileData.username}
                </h2>
              </div>
              <p className="text-white/60" style={{ fontFamily: 'Irys2' }}>
                {profileData.address}
              </p>
            </div>
          </div>

          {profileData.profile_bio && (
            <div className="mb-4">
              <p className="text-white/80" style={{ fontFamily: 'Irys2' }}>{profileData.profile_bio}</p>
            </div>
          )}

          <div className="flex gap-4 text-sm text-white/60">
            <span>Joined: {formatDate(profileData.created_at)}</span>
            <span>Files: {profileFiles.length}</span>
          </div>
        </div>

        {/* Files Section */}
        {profileData.profile_public === false ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <EyeOff size={48} className="mx-auto mb-4 text-amber-400" />
            <h4 className="text-white text-lg mb-2" style={{ fontFamily: 'Irys2' }}>
              Can't see files - this profile is private
            </h4>
            <p className="text-white/60 mb-4">
              This user has set their profile to private. Their files are hidden from public view.
            </p>
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
              <p className="text-amber-400 text-sm">
                <strong>Note:</strong> The profile is still searchable, but file content is hidden when set to private.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#67FFD4] mx-auto"></div>
            <p className="text-white/80 mt-4 text-lg font-medium">Loading files...</p>
          </div>
        ) : profileFiles.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-white/80 text-lg font-medium">No public files yet.</p>
            <p className="text-white/40 text-sm mt-2">This user hasn't uploaded any public files.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {profileFiles.map((file) => (
              <FileCard
                key={file.id}
                file={{
                  ...file,
                  is_owned: false, // Profile files are not owned by the viewer
                  recipient_address: undefined,
                  recipient_username: undefined,
                  shared_at: undefined
                }}
                onPreview={handlePreview}
                onMenuAction={handleMenuAction}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Profile Search Modal */}
      <ProfileSearch 
        isOpen={showProfileSearch}
        onClose={() => setShowProfileSearch(false)}
        currentAddress={profileData?.address}
      />

      {/* File Preview Modal */}
      {selectedFile && (
        <FilePreview
          file={{
            ...selectedFile,
            is_owned: false, // Profile files are not owned by the viewer
            recipient_address: undefined,
            recipient_username: undefined,
            shared_at: undefined
          }}
          onClose={closePreview}
          address={profileData?.address || ''}
        />
      )}
    </div>
  );
} 