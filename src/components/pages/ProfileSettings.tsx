import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Save, Eye, EyeOff, User, X, Info, CheckCircle } from 'lucide-react';

import { supabase } from '../../utils/supabase';


import Cropper from 'react-easy-crop';
interface ProfileSettingsProps {
  address: string;
  isConnected: boolean;
  usernameSaved: boolean;
  onBack?: () => void;
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
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]"
      onClick={handleBackdropClick}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
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
export function ProfileSettings({ address, isConnected, usernameSaved, onBack }: ProfileSettingsProps) {
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [profileVisible, setProfileVisible] = useState(true);
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState(''); // Store original avatar for cleanup

  const [avatarUploaded, setAvatarUploaded] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  
  // Debug info for troubleshooting
  const isLocalDev = import.meta.env.DEV;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('🔍 DEBUG: ProfileSettings Environment Info:', {
    isLocalDev,
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey,
    supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT SET',
    address,
    isConnected,
    usernameSaved
  });
  // ESC key handler for back navigation
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onBack) {
        onBack();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onBack]);

  // Auto-save username and bio changes to Supabase after 2.5 seconds
  useEffect(() => {
    if (!address || !isConnected || !usernameSaved) return;
    
    const timer = setTimeout(async () => {
      if (username !== currentUsername || profileBio !== (profileBio || '')) {
        setAutoSaving(true);
        try {
          // Auto-save to Supabase (but don't update profile yet)
          const { error } = await supabase
            .from('usernames')
            .update({
              username: username.trim(),
              profile_bio: profileBio
            })
            .eq('address', address.toLowerCase().trim());
          
          if (!error) {
            setCurrentUsername(username.trim());
            console.log('✅ Auto-saved username/bio to Supabase');
          }
        } catch (error) {
          console.log('⚠️ Auto-save failed:', error);
        } finally {
          setAutoSaving(false);
        }
      }
    }, 2500); // 2.5 seconds

    return () => clearTimeout(timer);
  }, [username, profileBio, address, isConnected, usernameSaved, currentUsername]);
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
          setOriginalAvatarUrl(usernameData.profile_avatar || ''); // Initialize original avatar URL
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
    setError('');
    
    try {
      // Convert file to data URL for cropper (don't upload yet)
      const reader = new FileReader();
      reader.onload = () => {
        console.log('✅ DEBUG: File read successfully, opening cropper...');
        setTempAvatarUrl(reader.result as string);
        setAvatarUploaded(true);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Avatar processing error:', error);
      setError('Failed to process image. Please try again.');
    }
  }, [address]);
  const handleCropComplete = async (croppedImageUrl: string) => {
    console.log('DEBUG: Crop complete, processing cropped image');
    
    try {
      // Store the original avatar URL before changing it (for cleanup purposes)
      const originalAvatarUrl = profileAvatar;
      
      // Convert base64 cropped image to File
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const croppedFile = new File([blob], 'cropped-avatar.jpg', { type: 'image/jpeg' });
      
      // Upload the cropped image to replace the original
      // Generate filename with timestamp to prevent browser caching
      const timestamp = Date.now();
      const fileExt = 'jpg';
      const fileName = `mainavatars/${address?.toLowerCase()}_${timestamp}.${fileExt}`;
      
      console.log('🔍 DEBUG: Uploading cropped avatar to:', fileName);
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedFile, {
          cacheControl: '3600',
          upsert: true // This will automatically replace existing files
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL of the cropped image
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      console.log('✅ DEBUG: Cropped avatar uploaded successfully to:', fileName);
      
      // Update the profile avatar with the cropped version
      setProfileAvatar(publicUrl);
      
      // Store the original URL for cleanup
      setOriginalAvatarUrl(originalAvatarUrl);
      
      // Dispatch custom event to notify ProfileWidget to refresh
      window.dispatchEvent(new CustomEvent('avatar-updated'));
      
      setShowCropper(false);
      setSuccess('Profile picture cropped and uploaded successfully! Click "Save Profile Settings" to apply changes.');
    } catch (error) {
      console.error('Error processing cropped avatar:', error);
      setError('Failed to process cropped image. Please try again.');
    }
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
      console.log('🔍 DEBUG: Starting profile update for wallet:', address);
      console.log('🔍 DEBUG: Profile data:', {
        profileVisible,
        profileBio,
        profileAvatar,
        originalAvatarUrl,
        tempAvatarUrl
      });
      
      // Request MetaMask signature to prove wallet ownership
      if (!(window as { ethereum?: { request: (params: { method: string; params: string[] }) => Promise<string> } }).ethereum) {
        console.error('❌ DEBUG: MetaMask not found');
        setError('MetaMask is required for profile update');
        setLoading(false);
        return;
      }
      
      const message = `Iryshare Profile Update\n\nWallet: ${address}\nUsername: ${username.trim()}\nProfile Visibility: ${profileVisible ? 'Public' : 'Private'}\nBio: ${profileBio}\nAvatar: ${profileAvatar}\n\nSign this message to update your profile.`;
      console.log('🔍 DEBUG: Requesting signature for message:', message);
      
      const signature = await (window as { ethereum: { request: (params: { method: string; params: string[] }) => Promise<string> } }).ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });
      
      if (!signature) {
        console.error('❌ DEBUG: No signature received');
        setError('Signature required for profile update');
        setLoading(false);
        return;
      }
      
      console.log('✅ DEBUG: Signature received:', signature.substring(0, 20) + '...');
      
      // Clean up old avatar from storage if it exists and is different from new one
      if (originalAvatarUrl && originalAvatarUrl !== tempAvatarUrl) {
        try {
          console.log('🔍 DEBUG: Cleaning up old avatar:', originalAvatarUrl);
          
          // Extract the actual file path from the URL
          // Supabase URLs look like: https://xxx.supabase.co/storage/v1/object/public/avatars/mainavatars/filename.jpg
          const urlParts = originalAvatarUrl.split('/');
          const fileNameIndex = urlParts.indexOf('mainavatars') + 1;
          if (fileNameIndex > 0 && fileNameIndex < urlParts.length) {
            const oldFileName = urlParts[fileNameIndex];
            const oldAvatarPath = `mainavatars/${oldFileName}`;
            
            console.log('🔍 DEBUG: Deleting old avatar path:', oldAvatarPath);
            const { error: deleteError } = await supabase.storage
              .from('avatars')
              .remove([oldAvatarPath]);
            
            if (deleteError) {
              console.log('⚠️ DEBUG: Error deleting old avatar:', deleteError);
            } else {
              console.log('✅ DEBUG: Old avatar removed successfully');
            }
          }
        } catch (deleteError) {
          console.log('⚠️ DEBUG: Error in avatar cleanup:', deleteError);
        }
      }

      console.log('🔍 DEBUG: Updating profile in usernames table...');
      
      // Update profile data in usernames table
      const { error: updateError } = await supabase
        .from('usernames')
        .update({
          username: username.trim(),
          profile_public: profileVisible,
          profile_bio: profileBio,
          profile_avatar: profileAvatar,
          registration_signature: signature
        })
        .eq('address', address.toLowerCase().trim());
        
      if (updateError) {
        console.error('❌ DEBUG: Error updating profile in usernames table:', updateError);
        console.error('❌ DEBUG: Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        setError(`Error updating profile: ${updateError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('✅ DEBUG: Profile updated successfully in usernames table');
      
      // Dispatch custom event to notify ProfileWidget to refresh after database update
      window.dispatchEvent(new CustomEvent('avatar-updated'));
      
      console.log('🔍 DEBUG: Updating profile_visible for all user files...');
      
      // Update profile visibility for all user's files
      const { error: filesError } = await supabase
        .from('files')
        .update({ profile_visible: profileVisible })
        .eq('owner_address', address.toLowerCase().trim());
        
      if (filesError) {
        console.error('❌ DEBUG: Error updating profile_visible in files table:', filesError);
        console.error('❌ DEBUG: Files error details:', {
          code: filesError.code,
          message: filesError.message,
          details: filesError.details,
          hint: filesError.hint
        });
        setError(`Error updating profile visibility: ${filesError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('✅ DEBUG: Profile visibility updated for all files');
      
      setAvatarUploaded(false);
      setSuccess('Profile updated successfully!');
      console.log('🎉 DEBUG: Profile update completed successfully for wallet:', address);
      
    } catch (error) {
      console.error('❌ DEBUG: Profile update error:', error);
      console.error('❌ DEBUG: Error type:', typeof error);
      console.error('❌ DEBUG: Error constructor:', error?.constructor?.name);
      console.error('❌ DEBUG: Error stack:', error && typeof error === 'object' && 'stack' in error ? (error as Error).stack : 'No stack trace');
      
      if (error instanceof Error && error.message.includes('User rejected')) {
        setError('Profile update cancelled - signature required');
      } else if (error instanceof Error) {
        setError(`Profile update failed: ${error.message}`);
      } else {
        setError('Profile update failed - unknown error');
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
          <div className="flex items-center justify-between mb-8">
            {onBack && (
              <button
                onClick={onBack}
                className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                title="Go back (ESC)"
              >
                <X size={24} />
              </button>
            )}
            <h3 className="text-2xl text-white font-semibold flex-1 text-center" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>PROFILE SETTINGS</h3>
            {onBack && <div className="w-10"></div>} {/* Spacer for centering */}
          </div>
          {usernameLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#67FFD4] mx-auto"></div>
              <p className="text-[#67FFD4] mt-4" style={{ fontFamily: 'Irys2' }}>Loading profile...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Username Section - Simplified */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h4 className="text-xl text-white font-medium mb-6 flex items-center gap-3" style={{ fontFamily: 'Irys2' }}>
                  <User size={24} className="text-[#67FFD4]" />
                  Username
                </h4>
                <div className="space-y-6">
                  <div>
                    <label className="text-white/80 text-sm font-medium block mb-2" style={{ fontFamily: 'Irys2' }}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full bg-white/5 border border-white/20 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent"
                      disabled={loading}
                      style={{ fontFamily: 'Irys2' }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>
                        Changes will be auto-saved and committed when you click "Save Profile Settings"
                      </p>
                      {autoSaving && (
                        <div className="flex items-center gap-1 text-[#67FFD4] text-xs">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-[#67FFD4]"></div>
                          Auto-saving...
                        </div>
                      )}
                    </div>
                  </div>
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
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>
                        Changes will be auto-saved and committed when you click "Save Profile Settings"
                      </p>
                      {autoSaving && (
                        <div className="flex items-center gap-1 text-[#67FFD4] text-xs">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-[#67FFD4]"></div>
                          Auto-saving...
                        </div>
                      )}
                    </div>
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
                    {/* Avatar Section - Exact Copy from Linktree Appearance */}
                    <div className="mb-8">
                      <label className="block text-white/80 text-sm mb-4" style={{ fontFamily: 'Irys2' }}>
                        PROFILE AVATAR
                      </label>
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20">
                          {profileAvatar ? (
                            <img 
                              key={`profile-avatar-${profileAvatar}`}
                              src={profileAvatar} 
                              alt="Profile"
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <input
                          type="file"
                          id="avatar-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSuccess(''); // Clear previous success messages
                              setError(''); // Clear previous errors
                              // Automatically upload to Irys
                              await handleAvatarUpload(file);
                              // Reset input
                              e.target.value = '';
                            }
                          }}
                        />
                        <label 
                          htmlFor="avatar-upload"
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20 text-sm cursor-pointer"
                          style={{ fontFamily: 'Irys2' }}
                        >
                          CHANGE AVATAR
                        </label>
                      </div>
                    </div>
                    
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
