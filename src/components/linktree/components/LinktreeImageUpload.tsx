import React, { useState, useCallback } from 'react';
import { FileInput } from '../../ui/file-input';
import { supabase } from '../../../utils/supabase';
import { useAccount } from 'wagmi';
import Cropper from 'react-easy-crop';

interface LinktreeImageUploadProps {
  onImageUpdate: (imageUrl: string) => void;
  currentImage: string;
}

interface ImageCropperProps {
  imageUrl: string;
  onCrop: (croppedImageUrl: string) => void;
  onCancel: () => void;
}

// Image cropper component (same as ProfileSettings)
function ImageCropper({ imageUrl, onCrop, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
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
    rotation = 0
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
        onCrop(imageUrl);
      }
    } catch (e) {
      console.error(e);
      onCrop(imageUrl);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div 
        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-4xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl text-white font-semibold mb-4 text-center" style={{ fontFamily: 'Irys2' }}>
          Adjust Linktree Profile Picture
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
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
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
          
          {/* Controls */}
          <div className="mt-6 space-y-4">
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
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium"
            style={{ fontFamily: 'Irys2' }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-6 py-3 bg-[#67FFD4] text-black rounded-lg hover:bg-[#67FFD4]/80 transition-colors font-medium"
            style={{ fontFamily: 'Irys2' }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LinktreeImageUpload({ onImageUpdate, currentImage }: LinktreeImageUploadProps) {
  const { address } = useAccount();
  const [uploading, setUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [error, setError] = useState('');

  const handleFileUpload = useCallback(async (file: File) => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    
    setUploading(true);
    setError('');
    
    try {
      console.log('DEBUG: Attempting Supabase storage upload for Linktree...');
      
      // Generate unique filename for linktree avatars folder
      const fileExt = file.name.split('.').pop();
      const fileName = `linktreeavatars/linktree_${address}_${Date.now()}.${fileExt}`;
      console.log('DEBUG: Uploading to Supabase storage in linktreeavatars folder as:', fileName);
      
      // Upload to Supabase storage in the linktreeavatars folder
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.log('DEBUG: Storage upload error for Linktree:', uploadError);
        
        // If bucket doesn't exist, use base64 fallback
        if (uploadError.message?.includes('Bucket not found')) {
          console.log('DEBUG: Bucket not found, using base64 fallback for Linktree');
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          console.log('DEBUG: Base64 conversion successful for Linktree');
          setTempImageUrl(dataUrl);
        } else {
          throw uploadError;
        }
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        console.log('DEBUG: Storage upload successful for Linktree, URL:', publicUrl);
        setTempImageUrl(publicUrl);
      }
      
      // Automatically show cropper after upload
      setShowCropper(true);
    } catch (error) {
      console.error('Image upload error:', error);
      setError('Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [address]);

  const handleCropComplete = async (croppedImageUrl: string) => {
    console.log('DEBUG: Linktree crop complete, updating database with new avatar');
    
    try {
      // Update the database with the new linktree avatar
      if (address && tempImageUrl) {
        const { error: updateError } = await supabase
          .from('usernames')
          .upsert({
            address: address.toLowerCase().trim(),
            linktree_avatar: tempImageUrl,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'address'
          });

        if (updateError) {
          console.error('Error updating database with new avatar:', updateError);
        } else {
          console.log('Successfully updated database with new linktree avatar');
        }
      }
      
      // Use the Supabase storage URL
      onImageUpdate(tempImageUrl);
      setShowCropper(false);
      setTempImageUrl('');
    } catch (error) {
      console.error('Error updating database with new avatar:', error);
      // Still update the UI even if database update fails
      onImageUpdate(tempImageUrl);
      setShowCropper(false);
      setTempImageUrl('');
    }
  };

  return (
    <div className="w-full">
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-100 transition-colors">
        <FileInput
          accept="image/*"
          onChange={async (file) => {
            if (file) {
              await handleFileUpload(file);
            } else {
              setError('');
            }
          }}
          selectedFile={null}
          disabled={uploading}
          loading={uploading}
          placeholder="Choose Linktree profile picture..."
          variant="profile"
          maxSize={5 * 1024 * 1024} // 5MB limit
        />
      </div>
      
      {uploading && (
        <div className="mt-2 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#8228D9]"></div>
          <span className="text-[#8228D9] text-sm">Uploading to Irys...</span>
        </div>
      )}
      
      {error && (
        <div className="mt-2 text-red-500 text-sm">{error}</div>
      )}
      
      {/* Image Cropper Modal */}
      {showCropper && tempImageUrl && (
        <ImageCropper
          imageUrl={tempImageUrl}
          onCrop={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setTempImageUrl('');
          }}
        />
      )}
    </div>
  );
}
