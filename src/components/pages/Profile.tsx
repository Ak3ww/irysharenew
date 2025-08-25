import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
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
  like_count?: number;
  comment_count?: number;
}
export function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { address: currentUserAddress } = useAccount();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileFiles, setProfileFiles] = useState<ProfileFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProfileSearch, setShowProfileSearch] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ProfileFile | null>(null);
  // Extract username from URL (remove @ if present)
  const cleanUsername = username?.startsWith('@') ? username.slice(1) : username;

  // Handle file updates from preview
  const handleFileUpdated = (fileId: string, updates: Partial<ProfileFile>) => {
    setProfileFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, ...updates } : file
    ));
  };
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
        const profile = profileResult;
        setProfileData(profile);
        // CRITICAL SECURITY FIX: Only load files that are explicitly public AND profile visible
        const { data: filesResult, error: filesError } = await supabase
          .from('files')
          .select('*')
          .eq('owner_address', profile.address.toLowerCase())
          .eq('is_public', true)  // Must be explicitly public
          .eq('profile_visible', true)  // Must be explicitly profile visible
          .order('created_at', { ascending: false })
          .limit(20);
        if (filesError) {
          console.error('Error loading files:', filesError);
          setProfileFiles([]);
        } else {
          // ADDITIONAL SECURITY FILTER: Double-check each file is actually public
          const publicFiles = (filesResult || []).filter((file: ProfileFile) => {
            const isPublic = file.is_public === true;
            const isProfileVisible = file.profile_visible === true;
            const isEncrypted = file.is_encrypted === true;
            // SECURITY: Never show encrypted files in public profiles
            if (isEncrypted) {
              console.warn('🚨 Security: Filtered out encrypted file from public profile:', file.file_name);
              return false;
            }
            // SECURITY: Never show private files in public profiles
            if (!isPublic || !isProfileVisible) {
              console.warn('🚨 Security: Filtered out private file from public profile:', file.file_name);
              return false;
            }
            return true;
          });
          setProfileFiles(publicFiles);
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
          // Reload profile data when it changes
          loadProfile();
        }
      )
      .subscribe((status) => {
      });

    // Subscribe to changes in file_likes table for real-time like count updates
    const likesSubscription = supabase
      .channel(`profile-files-likes-changes-${cleanUsername}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'file_likes'
        },
        () => {
          // Reload profile files when likes change to update counts
          loadProfile();
        }
      )
      .subscribe();

    // Subscribe to changes in file_comments table for real-time comment count updates
    const commentsSubscription = supabase
      .channel(`profile-files-comments-changes-${cleanUsername}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'file_comments'
        },
        () => {
          // Reload profile files when comments change to update counts
          loadProfile();
        }
      )
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
      likesSubscription.unsubscribe();
      commentsSubscription.unsubscribe();
    };
  }, [cleanUsername]);

  // Cleanup effect to reset URL when component unmounts
  useEffect(() => {
    return () => {
      // Reset browser URL if we're on a file preview URL
      if (window.location.pathname.startsWith('/file/')) {
        window.history.pushState({}, '', '/');
        document.title = 'Iryshare - Decentralized File Sharing';
      }
    };
  }, []);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  const handlePreview = (file: ProfileFile) => {
    // Security check: Verify this is a public file that should be previewable
    if (!file.is_public || !file.profile_visible) {
      console.error('❌ Access denied: Cannot preview private file from public profile');
      alert('Access denied: Cannot preview private files');
      return;
    }
    setSelectedFile(file);
    
    // Update browser URL for public, non-encrypted files ONLY
    if (file.is_public && !file.is_encrypted) {
      window.history.pushState({}, '', `/file/${file.id}`);
      // Update page title to show file name
      document.title = `${file.file_name} - Iryshare - Decentralized File Sharing`;
    }
  };
  const closePreview = () => {
    setSelectedFile(null);
    
    // Reset browser URL and title when preview is closed
    if (window.location.pathname.startsWith('/file/')) {
      window.history.pushState({}, '', `/profile/${cleanUsername}`);
      document.title = `@${cleanUsername} - Iryshare - Decentralized File Sharing`;
    }
  };
  const handleMenuAction = (action: string, file: ProfileFile) => {
    switch (action) {
      case 'download':
        handleDirectDownload(file);
        break;
      case 'share':
        // Share functionality disabled for profile files (not owned by viewer)
        break;
      default:
    }
  };
  const handleDirectDownload = async (file: ProfileFile) => {
    try {
      // Security check: Verify this is a public file that should be downloadable
      if (!file.is_public || !file.profile_visible) {
        console.error('❌ Access denied: Cannot download private file from public profile');
        alert('Access denied: Cannot download private files');
        return;
      }
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
      alert('Download failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  const refreshProfile = async () => {
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
      setProfileData(profileResult);
      // Reload files
      const { data: filesResult, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('owner_address', profileResult.address.toLowerCase())
        .eq('is_public', true)  // Must be explicitly public
        .eq('profile_visible', true)  // Must be explicitly profile visible
        .order('created_at', { ascending: false })
        .limit(20);
      if (filesError) {
        console.error('Refresh files error:', filesError);
        setProfileFiles([]);
      } else {
        // ADDITIONAL SECURITY FILTER: Double-check each file is actually public
        const publicFiles = (filesResult || []).filter((file: ProfileFile) => {
          const isPublic = file.is_public === true;
          const isProfileVisible = file.profile_visible === true;
          const isEncrypted = file.is_encrypted === true;
          // SECURITY: Never show encrypted files in public profiles
          if (isEncrypted) {
            console.warn('🚨 Security: Filtered out encrypted file from public profile:', file.file_name);
            return false;
          }
          // SECURITY: Never show private files in public profiles
          if (!isPublic || !isProfileVisible) {
            console.warn('🚨 Security: Filtered out private file from public profile:', file.file_name);
            return false;
          }
          return true;
        });
        setProfileFiles(publicFiles);
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
      <div className="min-h-screen bg-black p-6">
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
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-red-400 text-xl" style={{ fontFamily: 'Irys2' }}>Profile not found</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                  @{profileData.username.toUpperCase()}
                </h1>
                <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>
                  {profileData.profile_public === false ? 'Private profile' : 'Public profile and files'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {profileData.profile_public === false ? (
                  <div className="flex items-center gap-1 text-amber-400 text-sm" style={{ fontFamily: 'Irys2' }}>
                    <EyeOff size={16} />
                    <span>PRIVATE PROFILE</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-400 text-sm" style={{ fontFamily: 'Irys2' }}>
                    <Eye size={16} />
                    <span>PUBLIC PROFILE</span>
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
                style={{ fontFamily: 'Irys2' }}
              >
                <Search size={16} />
                SEARCH PROFILES
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshProfile}
                disabled={loading}
                className="flex items-center gap-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
                style={{ fontFamily: 'Irys2' }}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                REFRESH
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl text-white" style={{ fontFamily: 'Irys2' }}>
                  @{profileData.username}
                </h2>
              </div>
              <p className="text-white/60 text-sm md:text-base break-all" style={{ fontFamily: 'Irys2' }}>
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
                key={`${file.id}-${file.like_count}-${file.comment_count}`}
                file={{
                  ...file,
                  is_owned: false, // Profile files are not owned by the viewer
                  recipient_address: undefined,
                  recipient_username: undefined,
                  shared_at: undefined,
                  // Ensure all required fields for FileCard are present
                  owner_address: file.owner_address,
                  file_url: file.file_url,
                  file_name: file.file_name,
                  tags: file.tags,
                  is_encrypted: file.is_encrypted,
                  file_size_bytes: file.file_size_bytes,
                  is_public: file.is_public,
                  profile_visible: file.profile_visible,
                  file_type: file.file_type,
                  created_at: file.created_at,
                  updated_at: file.updated_at
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
            shared_at: undefined,
            // Ensure all required fields for FilePreview are present
            owner_address: selectedFile.owner_address,
            file_url: selectedFile.file_url,
            file_name: selectedFile.file_name,
            tags: selectedFile.tags,
            is_encrypted: selectedFile.is_encrypted,
            file_size_bytes: selectedFile.file_size_bytes,
            is_public: selectedFile.is_public,
            profile_visible: selectedFile.profile_visible,
            file_type: selectedFile.file_type,
            created_at: selectedFile.created_at,
            updated_at: selectedFile.updated_at
          }}
          onClose={closePreview}
          address={currentUserAddress || ''}
          onFileUpdated={handleFileUpdated}
        />
      )}
    </div>
  );
} 
