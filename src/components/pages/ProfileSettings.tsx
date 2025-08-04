import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Save, Eye, EyeOff, User, X, Info, CheckCircle } from 'lucide-react';
import { FileInput } from '../ui/file-input';
import { supabase } from '../../utils/supabase';
import { uploadFile } from '../../utils/irys';
import Cropper from 'react-easy-crop';

interface ProfileSettingsProps {
  address: string;
  isConnected: boolean;
  usernameSaved: boolean;
}

// Full image cropper component using react-easy-crop
function ImageCropper({ 
  imageUrl, 
  onCrop, 
  onCancel 
}: { 
  imageUrl: string; 
  onCrop: (croppedImageUrl: string) => void; 
  onCancel: () => void; 
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const onCropComplete = useCallback((_: {
    x: number;
    y: number;
    width: number;
    height: number;
  }, croppedAreaPixels: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
    rotation = 0,
    flip = { horizontal: false, vertical: false }
  ): Promise<string> => {
    const image = await createImage(imageSrc);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const rotRad = (rotation * Math.PI) / 180;

    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
      image.width,
      image.height,
      rotation
    );

    // set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    // draw rotated image
    ctx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement('canvas');

    const croppedCtx = croppedCanvas.getContext('2d');

    if (!croppedCtx) {
      throw new Error('No 2d context');
    }

    // Set the size of the cropped canvas
    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    // Draw the cropped image
    croppedCtx.drawImage(
      canvas,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // As a Base64 string
    return croppedCanvas.toDataURL('image/jpeg', 0.9);
  };

  const rotateSize = (width: number, height: number, rotation: number) => {
    const rotRad = (rotation * Math.PI) / 180;

    return {
      width:
        Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
      height:
        Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
  };

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  // Click outside handler
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleApply = async () => {
    try {
      if (croppedAreaPixels) {
        const croppedImage = await getCroppedImg(
          imageUrl,
          croppedAreaPixels,
          rotation
        );
        onCrop(croppedImage);
      } else {
        // Fallback to original image if no crop area
        onCrop(imageUrl);
      }
    } catch (e) {
      console.error(e);
      // Fallback to original image on error
      onCrop(imageUrl);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-4xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl text-white font-semibold mb-4 text-center" style={{ fontFamily: 'Irys2' }}>
          Adjust Profile Picture
        </h3>
        
        <div className="mb-4">
          <p className="text-white/70 text-sm text-center mb-4" style={{ fontFamily: 'Irys2' }}>
            Drag to move • Pinch/scroll to zoom • Use sliders for fine control
          </p>
          
          {/* Image Editor Container */}
          <div className="flex justify-center">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20" style={{ width: '400px', height: '400px' }}>
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={true}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#1a1a1a'
                  },
                  cropAreaStyle: {
                    border: '2px solid #67FFD4',
                    color: 'rgba(103, 255, 212, 0.3)'
                  }
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="space-y-4">
          {/* Zoom Control */}
          <div>
            <label className="text-white/80 text-sm font-medium block mb-2" style={{ fontFamily: 'Irys2' }}>
              Zoom: {Math.round(zoom * 100)}%
            </label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          {/* Rotation Control */}
          <div>
            <label className="text-white/80 text-sm font-medium block mb-2" style={{ fontFamily: 'Irys2' }}>
              Rotation: {Math.round(rotation)}°
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotation}
              onChange={(e) => setRotation(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="irys"
            onClick={handleApply}
            className="flex-1"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProfileSettings({ address, isConnected, usernameSaved }: ProfileSettingsProps) {
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [profileVisible, setProfileVisible] = useState(true);
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploaded, setAvatarUploaded] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState('');
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

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!address) return;
    
    setAvatarUploading(true);
    setError('');
    
    try {
      // Get Irys uploader
      const { getIrysUploader } = await import('../../utils/irys');
      const irysUploader = await getIrysUploader();
      
      // Upload avatar to Irys
      const avatarUrl = await uploadFile(irysUploader, file);
      
      setTempAvatarUrl(avatarUrl);
      setAvatarUploaded(true);
      setAvatarFile(null);
      // Automatically show cropper after upload
      setShowCropper(true);
    } catch (error) {
      console.error('Avatar upload error:', error);
      setError('Avatar upload failed. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  }, [address]);

  const handleCropComplete = (croppedImageUrl: string) => {
    setProfileAvatar(croppedImageUrl);
    setShowCropper(false);
    setSuccess('Profile picture adjusted! Click "Save Profile Settings" to apply changes.');
  };

  const handleSaveProfile = async () => {
    if (!address) return;
    
    // Check if avatar was uploaded but not saved
    if (avatarUploaded && !profileAvatar) {
      setError('Please adjust your profile picture position before saving.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Request MetaMask signature to prove wallet ownership
      if (!(window as { ethereum?: { request: (params: { method: string; params: string[] }) => Promise<string> } }).ethereum) {
        setError('MetaMask is required for profile update');
        setLoading(false);
        return;
      }

      const message = `Iryshare Profile Update\n\nWallet: ${address}\nProfile Visibility: ${profileVisible ? 'Public' : 'Private'}\nBio: ${profileBio}\nAvatar: ${profileAvatar}\n\nSign this message to update your profile.`;

      const signature = await (window as { ethereum: { request: (params: { method: string; params: string[] }) => Promise<string> } }).ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

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

      setAvatarUploaded(false);
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
      if (!(window as { ethereum?: { request: (params: { method: string; params: string[] }) => Promise<string> } }).ethereum) {
        setError('MetaMask is required for username update');
        setLoading(false);
        return;
      }

      const message = `Iryshare Username Update\n\nWallet: ${address}\nNew Username: ${username.trim()}\n\nSign this message to update your username.`;

      const signature = await (window as { ethereum: { request: (params: { method: string; params: string[] }) => Promise<string> } }).ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

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



  if (!isConnected || !usernameSaved) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <p className="text-white/60 text-center">Please connect your wallet and set a username to access profile settings.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#18191a] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h3 className="text-2xl text-white font-semibold mb-8 text-center" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>PROFILE SETTINGS</h3>

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
                  
                  <p className="text-white/80 text-sm" style={{ fontFamily: 'Irys2' }}>
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
                    <label className="text-white/80 text-sm font-medium block mb-2 flex items-center gap-2" style={{ fontFamily: 'Irys2' }}>
                      Profile Avatar
                      <div className="group relative">
                        <Info size={14} className="text-white/40 cursor-help" />
                                                 <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                           Select image to automatically upload and adjust position
                         </div>
                      </div>
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
                        <FileInput
                          accept="image/*"
                          onChange={async (file) => {
                            if (file) {
                              setAvatarFile(file);
                              setSuccess(''); // Clear previous success messages
                              setError(''); // Clear previous errors
                              
                              // Automatically upload to Irys
                              await handleAvatarUpload(file);
                            } else {
                              setAvatarFile(null);
                            }
                          }}
                          selectedFile={avatarFile}
                          disabled={loading || avatarUploading}
                          loading={avatarUploading}
                          placeholder="Choose profile picture..."
                          variant="profile"
                          maxSize={5 * 1024 * 1024} // 5MB limit
                        />
                      </div>
                    </div>
                    
                                         {/* Upload Status */}
                     {avatarUploading && (
                       <div className="mb-4">
                         <div className="flex items-center gap-2 mb-2">
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#67FFD4]"></div>
                           <span className="text-[#67FFD4] text-sm" style={{ fontFamily: 'Irys2' }}>
                             Uploading to Irys...
                           </span>
                         </div>
                       </div>
                     )}
                     
                     {avatarUploaded && tempAvatarUrl && (
                       <div className="mb-4">
                         <div className="flex items-center gap-2 mb-2">
                           <CheckCircle size={16} className="text-green-400" />
                           <span className="text-green-400 text-sm" style={{ fontFamily: 'Irys2' }}>
                             Image uploaded! Adjust position in the popup.
                           </span>
                         </div>
                       </div>
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
      
      {/* Image Cropper Modal */}
      {showCropper && tempAvatarUrl && (
        <ImageCropper
          imageUrl={tempAvatarUrl}
          onCrop={handleCropComplete}
          onCancel={() => setShowCropper(false)}
        />
      )}
    </div>
  );
} 