import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

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

        // Only load files if profile is public (with safety check)
        // Default to true if profile_public is null/undefined (backward compatibility)
        const isProfilePublic = profile.profile_public === true || profile.profile_public === null || profile.profile_public === undefined;
        
        if (isProfilePublic) {
          const { data: filesResult, error: filesError } = await supabase
            .from('files_new')
            .select('*')
            .eq('owner_address', profile.address.toLowerCase())
            .eq('is_public', true)
            .eq('profile_visible', true)
            .order('created_at', { ascending: false })
            .limit(20);

          if (filesError) {
            console.error('Error loading files:', filesError);
            setProfileFiles([]);
          } else {
            setProfileFiles(filesResult || []);
          }
        } else {
          setProfileFiles([]);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    // Set up realtime subscriptions for live updates
    console.log('Setting up profile subscription for username:', cleanUsername);
    
    const profileSubscription = supabase
      .channel(`profile_${cleanUsername}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'usernames',
          filter: `username=eq.${cleanUsername}`
        },
        async (payload) => {
          console.log('Profile updated in realtime:', payload);
          const newData = payload.new as any;
          
          // Update profile data
          if (newData) {
            setProfileData(prev => ({
              ...prev!,
              profile_public: newData.profile_public ?? prev!.profile_public,
              profile_bio: newData.profile_bio ?? prev!.profile_bio,
              profile_avatar: newData.profile_avatar ?? prev!.profile_avatar
            }));
            
            console.log('Profile privacy changed to:', newData.profile_public);
            
            // If profile became private, clear files immediately
            if (newData.profile_public === false) {
              console.log('Profile became private - clearing files');
              setProfileFiles([]);
            } else if (newData.profile_public === true || newData.profile_public === null) {
              // If profile became public, reload files immediately
              console.log('Profile became public - loading files');
              const { data: filesResult } = await supabase
                .from('files_new')
                .select('*')
                .eq('owner_address', newData.address.toLowerCase())
                .eq('is_public', true)
                .eq('profile_visible', true)
                .order('created_at', { ascending: false })
                .limit(20);
              console.log('Loaded files for public profile:', filesResult?.length || 0);
              setProfileFiles(filesResult || []);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Profile subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      profileSubscription.unsubscribe();
    };
  }, [cleanUsername]);

  // Separate useEffect for file subscriptions (only after profile is loaded)
  useEffect(() => {
    if (!profileData?.address) return;

    console.log('Setting up file subscriptions for address:', profileData.address);
    console.log('Profile public status:', profileData.profile_public);

    const filesSubscription = supabase
      .channel(`files_${profileData.address}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'files_new',
          filter: `owner_address=eq.${profileData.address.toLowerCase()}`
        },
        async (payload) => {
          console.log('New file added in realtime:', payload);
          const newFile = payload.new as any;
          
          // Only add if it's a public file and profile is public
          const isProfilePublic = profileData?.profile_public === true || profileData?.profile_public === null || profileData?.profile_public === undefined;
          if (newFile && newFile.is_public && newFile.profile_visible && isProfilePublic) {
            setProfileFiles(prev => [newFile, ...prev.slice(0, 19)]); // Keep max 20 files
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'files_new',
          filter: `owner_address=eq.${profileData.address.toLowerCase()}`
        },
        async (payload) => {
          console.log('File updated in realtime:', payload);
          const updatedFile = payload.new as any;
          
          // Handle file visibility changes
          const isProfilePublic = profileData?.profile_public === true || profileData?.profile_public === null || profileData?.profile_public === undefined;
          if (updatedFile && isProfilePublic) {
            if (updatedFile.is_public && updatedFile.profile_visible) {
              // File became visible - add it if not already present
              setProfileFiles(prev => {
                const exists = prev.find(f => f.id === updatedFile.id);
                if (!exists) {
                  return [updatedFile, ...prev.slice(0, 19)];
                }
                return prev;
              });
            } else {
              // File became hidden - remove it
              setProfileFiles(prev => prev.filter(f => f.id !== updatedFile.id));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'files_new',
          filter: `owner_address=eq.${profileData.address.toLowerCase()}`
        },
        async (payload) => {
          console.log('File deleted in realtime:', payload);
          const deletedFile = payload.old as any;
          
          // Remove deleted file from list
          if (deletedFile) {
            setProfileFiles(prev => prev.filter(f => f.id !== deletedFile.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      filesSubscription.unsubscribe();
    };
  }, [profileData?.address, profileData?.profile_public]);

  // File preview helpers
  function isImage(file: ProfileFile) {
    const name = file.file_name.toLowerCase();
    return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.webp');
  }

  function isPDF(file: ProfileFile) {
    const name = file.file_name.toLowerCase();
    return name.endsWith('.pdf');
  }

  function isVideo(file: ProfileFile) {
    const name = file.file_name.toLowerCase();
    return name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.ogg') || name.endsWith('.mov');
  }

  function isAudio(file: ProfileFile) {
    const name = file.file_name.toLowerCase();
    return name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.flac');
  }

  // Preview public file
  const previewPublicFile = async (file: ProfileFile) => {
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewBlobUrl(null);

    try {
      // Extract transaction ID from file_url
      let txId = file.file_url;
      try {
        if (typeof txId !== 'string') {
          txId = JSON.stringify(txId);
        }
        if (typeof txId === 'string' && txId.includes('{')) {
          const parsed = JSON.parse(txId);
          txId = parsed.url || parsed.id || txId;
        }
      } catch (e) {
        console.log('JSON parsing failed, using original:', e);
      }
      if (typeof txId === 'string' && txId.startsWith('https://gateway.irys.xyz/')) {
        txId = txId.replace('https://gateway.irys.xyz/', '');
      }

      console.log('Fetching from gateway with txId:', txId);
      const res = await fetch(`https://gateway.irys.xyz/${txId}`);
      if (!res.ok) throw new Error(`Failed to fetch from Irys: ${res.status} ${res.statusText}`);

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewBlobUrl(blobUrl);
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewError('Failed to load file preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle file click
  const handleFileClick = (file: ProfileFile) => {
    setSelectedFile(file);
    previewPublicFile(file);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#67FFD4] text-xl" style={{ fontFamily: 'Irys2' }}>Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4" style={{ fontFamily: 'Irys2' }}>{error}</div>
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
          <button
            onClick={() => window.location.reload()}
            className="text-[#67FFD4] hover:text-[#8AFFE4] transition-colors"
            style={{ fontFamily: 'Irys2' }}
            title="Refresh Profile"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => {
              console.log('Current profile data:', profileData);
              console.log('Current profile files:', profileFiles);
            }}
            className="text-[#67FFD4] hover:text-[#8AFFE4] transition-colors ml-2"
            style={{ fontFamily: 'Irys2' }}
            title="Debug Info"
          >
            🐛 Debug
          </button>
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
              <h2 className="text-2xl text-white mb-1" style={{ fontFamily: 'Irys2' }}>
                @{profileData.username}
                {profileData.profile_public === false && (
                  <span className="ml-2 text-red-400">🔒</span>
                )}
              </h2>
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
            <span>Joined: {formatDate(profileData.created_at)}</span>
            <span>Files: {profileFiles.length}</span>
          </div>
        </div>

        {/* Files Section */}
        {(profileData.profile_public === true || profileData.profile_public === null || profileData.profile_public === undefined) ? (
          <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-6">
            <h3 className="text-xl text-white mb-4" style={{ fontFamily: 'Irys2' }}>Public Files</h3>
            
            {profileFiles.length === 0 ? (
              <p className="text-[#67FFD4] text-center py-8" style={{ fontFamily: 'IrysItalic' }}>
                No public files yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profileFiles.map(file => (
                  <div
                    key={file.id}
                    className="bg-[#222] rounded-lg p-4 cursor-pointer hover:border-[#67FFD4] border-2 border-transparent transition"
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="mb-2 flex items-center justify-center" style={{ minHeight: 60 }}>
                      {isImage(file) ? (
                        <span className="text-[#67FFD4] text-2xl">🖼️</span>
                      ) : isPDF(file) ? (
                        <span className="text-[#67FFD4] text-2xl">📄</span>
                      ) : isVideo(file) ? (
                        <span className="text-[#67FFD4] text-2xl">🎬</span>
                      ) : isAudio(file) ? (
                        <span className="text-[#67FFD4] text-2xl">🎵</span>
                      ) : (
                        <span className="text-[#67FFD4] text-2xl">📁</span>
                      )}
                    </div>
                    <div className="text-white text-sm truncate">{file.file_name}</div>
                    <div className="text-xs text-gray-400 mt-1">{formatFileSize(file.file_size_bytes)}</div>
                    <div className="text-xs text-gray-400">{formatDate(file.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-6">
            <div className="text-center">
              <div className="text-red-400 text-xl mb-4" style={{ fontFamily: 'Irys2' }}>
                🔒 Private Profile
              </div>
              <p className="text-gray-400" style={{ fontFamily: 'IrysItalic' }}>
                This profile is private and files are not visible.
              </p>
            </div>
          </div>
        )}

        {/* File Preview Popup */}
        {selectedFile && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              background: '#111',
              border: '2px solid #67FFD4',
              borderRadius: 16,
              padding: 24,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
            }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-lg" style={{ fontFamily: 'Irys2' }}>{selectedFile.file_name}</h3>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
                  }}
                  className="text-[#67FFD4] hover:text-[#8AFFE4] text-xl"
                  style={{ fontFamily: 'Irys2' }}
                >
                  ✕
                </button>
              </div>

              {previewLoading ? (
                <div className="text-center py-8">
                  <div className="text-[#67FFD4] text-lg" style={{ fontFamily: 'Irys2' }}>Loading preview...</div>
                </div>
              ) : previewError ? (
                <div className="text-center py-8">
                  <div className="text-red-400 text-lg" style={{ fontFamily: 'Irys2' }}>{previewError}</div>
                </div>
              ) : previewBlobUrl ? (
                <div className="text-center">
                  {isImage(selectedFile) ? (
                    <img
                      src={previewBlobUrl}
                      alt={selectedFile.file_name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '70vh',
                        objectFit: 'contain',
                        borderRadius: 8,
                      }}
                    />
                  ) : isVideo(selectedFile) ? (
                    <video
                      controls
                      src={previewBlobUrl}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '70vh',
                        borderRadius: 8,
                      }}
                    />
                  ) : isAudio(selectedFile) ? (
                    <audio
                      controls
                      src={previewBlobUrl}
                      style={{
                        width: '100%',
                        maxWidth: 400,
                        margin: '0 auto',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[#67FFD4] text-lg mb-4" style={{ fontFamily: 'Irys2' }}>
                        Preview not available for this file type
                      </p>
                      <a
                        href={previewBlobUrl}
                        download={selectedFile.file_name}
                        className="btn-irys"
                        style={{ background: '#67FFD4', color: '#111', fontWeight: 'bold', borderRadius: 8, padding: '10px 20px', fontFamily: 'Irys2' }}
                      >
                        Download File
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-[#67FFD4] text-lg" style={{ fontFamily: 'Irys2' }}>No preview available</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 