import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import Modal from 'react-modal';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onClose: () => void;
  aspectRatio?: number;
}

// Configure Modal for accessibility
Modal.setAppElement('#root');

export default function ImageCropper({ image, onCropComplete, onClose, aspectRatio = 1 }: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Professional device detection with viewport calculations
  const deviceConfig = useMemo(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;
    
    // Mobile devices
    if (width <= 480) {
      return {
        type: 'mobile',
        modalStyle: {
          content: {
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            bottom: '10px',
            border: 'none',
            background: 'transparent',
            padding: '0',
            overflow: 'hidden'
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1000
          }
        },
        containerStyle: {
          width: '100%',
          height: '100%',
          maxWidth: '100vw',
          maxHeight: '100vh'
        },
        cropperHeight: Math.min(height * 0.7, height - 200),
        showGrid: false,
        zoomRange: { min: 0.8, max: 3, step: 0.1 },
        buttonSize: 'text-sm px-4 py-2',
        textSize: 'text-sm'
      };
    }
    
    // Tablet devices
    if (width <= 1024) {
      return {
        type: 'tablet',
        modalStyle: {
          content: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            transform: 'translate(-50%, -50%)',
            border: 'none',
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'hidden'
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 1000
          }
        },
        containerStyle: {
          width: Math.min(width - 100, 600),
          height: Math.min(height - 100, 600)
        },
        cropperHeight: Math.min(height - 200, 600),
        showGrid: true,
        zoomRange: { min: 0.7, max: 4, step: 0.1 },
        buttonSize: 'text-base px-6 py-3',
        textSize: 'text-base'
      };
    }
    
    // Desktop devices
    return {
      type: 'desktop',
      modalStyle: {
        content: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          transform: 'translate(-50%, -50%)',
          border: 'none',
          background: 'white',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '80vw',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000
        }
      },
      containerStyle: {
        width: Math.min(width - 200, 800),
        height: Math.min(height - 200, 800)
      },
      cropperHeight: Math.min(height - 200, 800),
      showGrid: true,
      zoomRange: { min: 0.5, max: 6, step: 0.1 },
      buttonSize: 'text-lg px-8 py-4',
      textSize: 'text-lg'
    };
  }, []);

  const onCropChange = useCallback((crop: Point) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const handleCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((0 * Math.PI) / 180);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x,
      0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    
    setIsLoading(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error('Error cropping image:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={true}
      onRequestClose={handleClose}
      style={deviceConfig.modalStyle}
      closeTimeoutMS={200}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className={`font-semibold text-gray-900 ${deviceConfig.textSize}`}>
            Crop Profile Picture
          </h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cropper Container */}
        <div 
          className="relative bg-gray-100 rounded-lg overflow-hidden flex-1"
          style={{
            height: deviceConfig.cropperHeight
          }}
        >
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={handleCropComplete}
            minZoom={deviceConfig.zoomRange.min}
            maxZoom={deviceConfig.zoomRange.max}
            zoomSpeed={0.1}
            showGrid={deviceConfig.showGrid}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                backgroundColor: '#f3f4f6'
              }
            }}
          />
        </div>

        {/* Controls */}
        <div className="mt-4 space-y-3 flex-shrink-0">
          {/* Zoom Control */}
          <div className="flex items-center space-x-3">
            <span className={`text-gray-700 ${deviceConfig.textSize}`}>
              Zoom:
            </span>
            <input
              type="range"
              min={deviceConfig.zoomRange.min}
              max={deviceConfig.zoomRange.max}
              step={deviceConfig.zoomRange.step}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #67FFD4 0%, #67FFD4 ${(zoom - deviceConfig.zoomRange.min) / (deviceConfig.zoomRange.max - deviceConfig.zoomRange.min) * 100}%, #e5e7eb ${(zoom - deviceConfig.zoomRange.min) / (deviceConfig.zoomRange.max - deviceConfig.zoomRange.min) * 100}%, #e5e7eb 100%)`
              }}
            />
            <span className={`text-gray-500 ${deviceConfig.textSize}`}>
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className={`px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 ${deviceConfig.buttonSize}`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!croppedAreaPixels || isLoading}
              className={`px-4 py-2 bg-[#67FFD4] hover:bg-[#5AFFB8] text-black font-semibold rounded-lg transition-colors disabled:opacity-50 ${deviceConfig.buttonSize}`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </div>
              ) : (
                'Save Crop'
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
