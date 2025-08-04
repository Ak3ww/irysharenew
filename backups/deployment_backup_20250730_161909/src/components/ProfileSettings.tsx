import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Save, Eye, EyeOff, User, Upload, X, Camera } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { uploadFile } from '../utils/irys';

interface ProfileSettingsProps {
  address: string;
  isConnected: boolean;
  usernameSaved: boolean;
}

export function ProfileSettings({ address, isConnected, usernameSaved }: ProfileSettingsProps) {
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [profileVisible, setProfileVisible] = useState(true);
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Fetch current profile data
  useEffect(() => {
    if (!address || !isConnected || !usernameSaved) return;
    
    const fetchProfile = async () => {
      setUsernameLoading(true);
      const normalizedAddress = address.toLowerCase().trim();
      
      try {
        // Fetch username and profile data
        const { data: usernameData, error: usernameError } = await supabase
          .from('usernames')
          .select('username, profile_public, profile_bio, profile_avatar')
          .eq('address', normalizedAddress)
          .single();
        
        if (usernameError) {
          console.error('Error fetching username:', usernameError);
        } else if (usernameData) {
          setCurrentUsername(usernameData.username);
          setUsername(usernameData.username);
          setProfileBio(usernameData.profile_bio || '');
          setProfileAvatar(usernameData.profile_avatar || '');
          // Set profile visibility based on profile_public from usernames table
          setProfileVisible(usernameData.profile_public !== false);
        }
        
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setUsernameLoading(false);
      }
    };
    
    fetchProfile();
  }, [address, isConnected, usernameSaved]);

  const handleAvatarUpload = useCallback(async () => {
    if (!avatarFile || !address) return;
    
    setAvatarUploading(true);
    setError('');
    
    try {
      // Get Irys uploader
      const { getIrysUploader } = await import('../utils/irys');
      const irysUploader = await getIrysUploader();
      
      // Upload avatar to Irys
      const avatarUrl = await uploadFile(irysUploader, avatarFile);
      
      setProfileAvatar(avatarUrl);
      setAvatarFile(null);
      setSuccess('Avatar uploaded successfully!');
    } catch (error) {
      console.error('Avatar upload error:', error);
      setError('Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  }, [avatarFile, address]);

  const handleSaveProfile = async () => {
    if (!address) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Request MetaMask signature to prove wallet ownership
      if (!(window as any).ethereum) {
        setError('MetaMask is required for profile update');
        setLoading(false);
        return;
      }

      const message = `Iryshare Profile Update\n\nWallet: ${address}\nProfile Visibility: ${profileVisible ? 'Public' : 'Private'}\nBio: ${profileBio}\nAvatar: ${profileAvatar}\n\nSign this message to update your profile.`;

      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      }) as string;

      if (!signature) {
        setError('Signature required for profile update');
        setLoading(false);
        return;
      }

      // Update profile data in usernames table
      const { error: updateError } = await supabase
        .from('usernames')
        .update({
          profile_public: profileVisible,
          profile_bio: profileBio,
          profile_avatar: profileAvatar,
          registration_signature: signature
        })
        .eq('address', address.toLowerCase().trim());

      if (updateError) {
        console.error('Error updating profile:', updateError);
        setError('Error updating profile');
        setLoading(false);
        return;
      }

      // Update profile visibility for all user's files
      const { error: filesError } = await supabase
        .from('files')
        .update({ profile_visible: profileVisible })
        .eq('owner_address', address.toLowerCase().trim());

      if (filesError) {
        console.error('Error updating profile_visible:', filesError);
        setError('Error updating profile visibility');
        setLoading(false);
        return;
      }

      setSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      if (error instanceof Error && error.message.includes('User rejected')) {
        setError('Profile update cancelled - signature required');
      } else {
        setError('Profile update failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!address) {
      setError('Wallet address is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if username is taken (excluding current user)
      if (username.trim() !== currentUsername) {
        const { data: existing } = await supabase
          .from('usernames')
          .select('id')
          .eq('username', username.trim())
          .neq('address', address.toLowerCase().trim())
          .single();

        if (existing) {
          setError('Username is already taken');
          setLoading(false);
          return;
        }
      }

      // Request MetaMask signature to prove wallet ownership
      if (!(window as any).ethereum) {
        setError('MetaMask is required for username update');
        setLoading(false);
        return;
      }

      const message = `Iryshare Username Update\n\nWallet: ${address}\nNew Username: ${username.trim()}\n\nSign this message to update your username.`;

      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      }) as string;

      if (!signature) {
        setError('Signature required for username update');
        setLoading(false);
        return;
      }

      // Update username in Supabase
      const { error: updateError } = await supabase
        .from('usernames')
        .update({
          username: username.trim(),
          registration_signature: signature
        })
        .eq('address', address.toLowerCase().trim());

      if (updateError) {
        setError('Error updating username');
        setLoading(false);
        return;
      }

      setCurrentUsername(username.trim());
      setSuccess('Username updated successfully!');
    } catch (error) {
      console.error('Username update error:', error);
      if (error instanceof Error && error.message.includes('User rejected')) {
        setError('Username update cancelled - signature required');
      } else {
        setError('Username update failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfileVisibility = async () => {
    if (!address) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Debug: Check authentication status
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔐 Auth status:', { user, authError });
      
      // Debug: Check current profile data
      const { data: currentProfile, error: profileError } = await supabase
        .from('usernames')
        .select('*')
        .eq('address', address.toLowerCase().trim())
        .single();
      console.log('📊 Current profile:', currentProfile, profileError);

      // Update profile_public in usernames table
      const { error: usernameError } = await supabase
        .from('usernames')
        .update({ profile_public: profileVisible })
        .eq('address', address.toLowerCase().trim());

      if (usernameError) {
        console.error('Error updating profile_public:', usernameError);
        
        // If it's an RLS error, try a different approach or show helpful message
        if (usernameError.message.includes('row-level security policy')) {
          setError('Profile visibility update failed due to security policy. Please try refreshing the page or contact support.');
        } else {
          setError('Error updating profile visibility');
        }
        setLoading(false);
        return;
      }

      // Update profile visibility for all user's files
      const { error: filesError } = await supabase
        .from('files')
        .update({ profile_visible: profileVisible })
        .eq('owner_address', address.toLowerCase().trim());

      if (filesError) {
        console.error('Error updating profile_visible:', filesError);
        setError('Error updating profile visibility');
        setLoading(false);
        return;
      }

      setSuccess('Profile visibility updated successfully!');
      console.log('✅ Profile visibility updated:', { profile_public: profileVisible, profile_visible: profileVisible });
    } catch (error) {
      console.error('Profile visibility update error:', error);
      setError('Profile visibility update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected || !usernameSaved) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <p className="text-white/60 text-center">Please connect your wallet and set a username to access profile settings.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h3 className="text-2xl text-white font-semibold mb-8 text-center" style={{ fontFamily: 'Irys2' }}>Profile Settings</h3>

          {usernameLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#67FFD4] mx-auto"></div>
              <p className="text-[#67FFD4] mt-4" style={{ fontFamily: 'Irys2' }}>Loading profile...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Username Section */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h4 className="text-xl text-white font-medium mb-6 flex items-center gap-3" style={{ fontFamily: 'Irys2' }}>
                  <User size={24} className="text-[#67FFD4]" />
                  Username
                </h4>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-white/80 text-sm font-medium block mb-2" style={{ fontFamily: 'Irys2' }}>
                      Current Username
                    </label>
                    <div className="text-white bg-white/5 px-4 py-3 rounded-lg border border-white/10">
                      @{currentUsername}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-white/80 text-sm font-medium block mb-2" style={{ fontFamily: 'Irys2' }}>
                      New Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter new username"
                      className="w-full bg-white/5 border border-white/20 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent"
                      disabled={loading}
                      style={{ fontFamily: 'Irys2' }}
                    />
                  </div>
                  
                  <Button
                    variant="irys"
                    onClick={handleSaveUsername}
                    disabled={loading || username.trim() === currentUsername}
                    className="flex items-center gap-2"
                  >
                    <Save size={16} />
                    Update Username
                  </Button>
                </div>
              </div>

              {/* Profile Visibility Section */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h4 className="text-xl text-white font-medium mb-6 flex items-center gap-3" style={{ fontFamily: 'Irys2' }}>
                  {profileVisible ? <Eye size={24} className="text-[#67FFD4]" /> : <EyeOff size={24} className="text-[#67FFD4]" />}
                  Profile Visibility
                </h4>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="profileVisible"
                      checked={profileVisible}
                      onChange={(e) => setProfileVisible(e.target.checked)}
                      className="w-5 h-5 text-[#67FFD4] bg-white/5 border-white/20 rounded focus:ring-[#67FFD4]"
                      disabled={loading}
                    />
                    <label htmlFor="profileVisible" className="text-white text-lg" style={{ fontFamily: 'Irys2' }}>
                      Make my profile and files publicly searchable
                    </label>
                  </div>
                  
                  <p className="text-white/60 text-sm" style={{ fontFamily: 'IrysItalic' }}>
                    {profileVisible 
                      ? "Your profile and files will be visible to other users and searchable by username."
                      : "Your profile and files will be private and not searchable by other users."
                    }
                  </p>
                </div>
              </div>

              {/* Profile Details Section */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h4 className="text-xl text-white font-medium mb-6 flex items-center gap-3" style={{ fontFamily: 'Irys2' }}>
                  <User size={24} className="text-[#67FFD4]" />
                  Profile Details
                </h4>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-white/80 text-sm font-medium block mb-2" style={{ fontFamily: 'Irys2' }}>
                      Profile Bio
                    </label>
                    <textarea
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder="Write a brief bio about yourself..."
                      className="w-full bg-white/5 border border-white/20 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent"
                      rows={4}
                      disabled={loading}
                      style={{ fontFamily: 'Irys2' }}
                    />
                  </div>
                  
                  <div>
                    <label className="text-white/80 text-sm font-medium block mb-2" style={{ fontFamily: 'Irys2' }}>
                      Profile Avatar
                    </label>
                    
                    {/* Avatar Preview */}
                    <div className="flex items-center gap-6 mb-4">
                      <div className="flex items-center justify-center w-24 h-24 bg-white/5 rounded-full overflow-hidden border-2 border-white/10">
                        {profileAvatar ? (
                          <img src={profileAvatar} alt="Profile Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={48} className="text-white/40" />
                        )}
                      </div>
                      
                      {/* Avatar Upload */}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setAvatarFile(e.target.files[0]);
                              setSuccess(''); // Clear previous success messages
                            }
                          }}
                          className="text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#67FFD4] file:text-black hover:file:bg-[#57e2c2] cursor-pointer"
                          disabled={loading || avatarUploading}
                        />
                        
                        {avatarFile && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-white/60 text-sm">{avatarFile.name}</span>
                            <Button
                              variant="outline"
                              onClick={() => setAvatarFile(null)}
                              className="h-6 px-2 text-red-400 hover:text-red-300"
                              disabled={loading || avatarUploading}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Upload Button */}
                    {avatarFile && (
                      <Button
                        variant="outline"
                        onClick={handleAvatarUpload}
                        className="flex items-center gap-2 text-[#67FFD4] hover:text-[#57e2c2]"
                        disabled={loading || avatarUploading}
                      >
                        <Upload size={16} />
                        {avatarUploading ? 'Uploading...' : 'Upload Avatar'}
                      </Button>
                    )}
                  </div>
                  
                  <Button
                    variant="irys"
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex items-center gap-2 w-full"
                  >
                    <Save size={16} />
                    Save Profile Settings
                  </Button>
                </div>
              </div>

              {/* Error and Success Messages */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-lg">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-6 py-4 rounded-lg">
                  {success}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 