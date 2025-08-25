import React, { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useLinktreeStore } from '../context/LinktreeContext';
import AdminLayout from '../layouts/AdminLayout';
import DevicePreview from '../components/DevicePreview';

// Full image cropper component using react-easy-crop (from ProfileSettings.tsx)
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
          <button
            onClick={onCancel}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-xl transition-colors border border-white/20"
            style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}
          >
            CANCEL
          </button>
          <button
            onClick={handleApply}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-medium py-2 px-4 rounded-xl transition-colors"
            style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}
          >
            APPLY
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminApperance() {
  const userStore = useLinktreeStore();
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [croppedAvatarUrl, setCroppedAvatarUrl] = useState<string | null>(null);
  
  // Load auto-saved data on component mount
  useEffect(() => {
    // No need for localStorage loading - just let the context load from Supabase
    console.log('AdminApperance loaded - Linktree data will be loaded from Supabase');
  }, []); // Run only once on mount

  // Add auto-save status indicator


  // Disabled auto-save for now - use manual save button instead
  // Auto-save was causing 409 conflicts and infinite loops
  // useEffect(() => {
  //   // Auto-save logic disabled
  // }, []);

  const handleAvatarChange = async (file: File) => {
    try {
      console.log('🔄 DEBUG: handleAvatarChange called with file:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      const reader = new FileReader();
      reader.onload = () => {
        console.log('✅ DEBUG: File read successfully, opening cropper...');
        setCroppedAvatarUrl(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('❌ DEBUG: Error reading file:', error);
      alert('Error reading file. Please try again.');
    }
  };

  const handleCroppedAvatar = async (croppedImageUrl: string) => {
    try {
      console.log('🔄 DEBUG: handleCroppedAvatar called with cropped image URL');
      
      // Convert base64 to File
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'cropped-avatar.jpg', { type: 'image/jpeg' });
      
      console.log('🔄 DEBUG: Converted to file, calling userStore.changeAvatar...');
      console.log('🔄 DEBUG: File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      await userStore.changeAvatar(file);
      console.log('✅ DEBUG: changeAvatar completed successfully');
      
      setIsCropperOpen(false);
      setCroppedAvatarUrl(null);
      console.log('🎉 DEBUG: Final linktree_avatar value:', userStore.linktree_avatar);
    } catch (error) {
      console.error('❌ DEBUG: Error saving cropped avatar:', error);
      console.error('❌ DEBUG: Error details:', {
        message: error && typeof error === 'object' && 'message' in error ? (error as Error).message : 'No message available',
        type: typeof error
      });
      alert('Failed to save cropped avatar. Please try again.');
    }
  };

  const handleCropCancel = () => {
    setIsCropperOpen(false);
    setCroppedAvatarUrl(null);
  };

  return (
    <AdminLayout>
      <div className="flex min-h-screen pb-4 bg-black">
        <div className="lg:w-[calc(100%-500px)] md:w-[calc(100%-330px)] w-full md:pt-20 pt-14">
          <div className={`ml-8 space-y-8 ${userStore.isMobile ? 'pb-32' : 'pb-24'}`}>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                APPEARANCE SETTINGS
              </h1>
              <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>
                Customize your Linktree profile and theme
              </p>
              </div>
              
            {/* Profile Section */}
            <div id="ProfileSection" className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-8" style={{ fontFamily: 'Irys1', letterSpacing: '0.05em' }}>
                PROFILE CUSTOMIZATION
              </h2>
              
              {/* Avatar Section */}
              <div className="mb-8">
                <label className="block text-white/80 text-sm mb-4" style={{ fontFamily: 'Irys2' }}>
                  PROFILE AVATAR
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20">
                    {userStore.linktree_avatar ? (
                      <img 
                        key={userStore.linktree_avatar} // Force re-render when avatar changes
                        src={userStore.linktree_avatar} 
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
                        await handleAvatarChange(file);
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

              {/* Profile Title */}
              <div className="mb-8">
                <label className="block text-white/80 text-sm mb-4" style={{ fontFamily: 'Irys2' }}>
                  PROFILE TITLE
                </label>
                <input
                  type="text"
                  value={userStore.linktree_username || ''}
                  onChange={async (e) => {
                    const newValue = e.target.value;
                    try {
                      await userStore.updateLinktreeProfile(newValue, userStore.linktree_bio || '');
                    } catch {
                      // Error updating profile title
                    }
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-[#67FFD4] focus:outline-none transition-colors"
                  placeholder="Enter your profile title"
                  style={{ fontFamily: 'Irys2' }}
                  />
                </div>

              {/* Profile Bio */}
              <div className="mb-8">
                <label className="block text-white/80 text-sm mb-4" style={{ fontFamily: 'Irys2' }}>
                  PROFILE BIO
                </label>
                <textarea 
                  value={userStore.linktree_bio || ''}
                  onChange={async (e) => {
                    const newValue = e.target.value;
                    try {
                      await userStore.updateLinktreeProfile(userStore.linktree_username || '', newValue);
                    } catch {
                      // Error updating profile bio
                    }
                  }}
                  placeholder="Tell people about yourself..."
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                  rows={3}
                  style={{ fontFamily: 'Irys2' }}
                />
                </div>

              {/* Theme Selection */}
              <div className="mb-6">
                <label className="block text-white/80 text-sm mb-4" style={{ fontFamily: 'Irys2' }}>
                  SELECT THEME
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {userStore.colors.map((theme) => (
                    <div
                      key={theme.id}
                      onClick={async () => {
                        try {
                          await userStore.updateTheme(theme.id);
                        } catch {
                          // Error updating theme
                        }
                      }}
                      className={`cursor-pointer rounded-xl p-4 transition-all transform hover:scale-105 ${
                        userStore.theme_id === theme.id ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black' : ''
                      }`}
                    >
                      <div className={`w-full h-20 rounded-lg ${theme.color} mb-3`}></div>
                      <div className="text-center">
                        <div className={`font-medium text-sm ${
                          theme.id === 1 || theme.id === 10
                            ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                            : theme.text
                        }`} style={{ fontFamily: 'Irys2' }}>
                          {theme.name}
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Phone Frame Preview - Desktop Only */}
        <DevicePreview />
      </div>

      {isCropperOpen && croppedAvatarUrl && (
        <ImageCropper
          imageUrl={croppedAvatarUrl}
          onCrop={handleCroppedAvatar}
          onCancel={handleCropCancel}
        />
      )}

    </AdminLayout>
  );
}
