import { useState, useEffect } from 'react';

// Comprehensive Device Detection Utility
// Provides device-specific configurations for optimal UX across all dimensions

export interface DeviceConfig {
  type: string;
  category: 'phone' | 'tablet' | 'laptop' | 'desktop';
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  isTouch: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export interface CropperConfig {
  containerWidth: number;
  containerHeight: number;
  modalPadding: string;
  buttonSize: string;
  zoomRange: {
    min: number;
    max: number;
    step: number;
  };
  showGrid: boolean;
  textSize: string;
}

/**
 * Detect the current device and its characteristics
 */
export const detectDevice = (): DeviceConfig => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  let type: string;
  let category: 'phone' | 'tablet' | 'laptop' | 'desktop';
  let orientation: 'portrait' | 'landscape' = width > height ? 'landscape' : 'portrait';

  // Phone detection
  if (width <= 428) {
    category = 'phone';
    if (width <= 375) type = 'small-phone';        // iPhone SE, small Android
    else if (width <= 414) type = 'medium-phone';  // iPhone XR, 11, 12, 13
    else type = 'large-phone';                     // iPhone 12/13 Pro Max, 14 Plus
  }
  // Tablet detection
  else if (width <= 1024) {
    category = 'tablet';
    if (width <= 768) type = 'tablet-portrait';    // iPad Mini, small tablets
    else type = 'tablet-landscape';                 // iPad Air, Pro
  }
  // Laptop detection
  else if (width <= 1366) {
    category = 'laptop';
    type = 'laptop';
  }
  // Desktop detection
  else {
    category = 'desktop';
    type = 'desktop';
  }

  return {
    type,
    category,
    width,
    height,
    orientation,
    pixelRatio,
    isTouch,
    isMobile: category === 'phone',
    isTablet: category === 'tablet',
    isDesktop: category === 'laptop' || category === 'desktop'
  };
};

/**
 * Get device-specific cropper configuration
 */
export const getCropperConfig = (device: DeviceConfig): CropperConfig => {
  const { width, height, type, category } = device;
  
  switch (type) {
    case 'small-phone':
      return {
        containerWidth: width - 32,
        containerHeight: Math.min(height * 0.6, 400),
        modalPadding: 'p-4',
        buttonSize: 'text-sm px-3 py-2',
        zoomRange: { min: 0.8, max: 3, step: 0.1 },
        showGrid: false,
        textSize: 'text-sm'
      };
      
    case 'medium-phone':
      return {
        containerWidth: width - 40,
        containerHeight: Math.min(height * 0.65, 450),
        modalPadding: 'p-5',
        buttonSize: 'text-sm px-4 py-2.5',
        zoomRange: { min: 0.8, max: 3, step: 0.1 },
        showGrid: true,
        textSize: 'text-sm'
      };
      
    case 'large-phone':
      return {
        containerWidth: width - 48,
        containerHeight: Math.min(height * 0.7, 500),
        modalPadding: 'p-6',
        buttonSize: 'text-base px-4 py-3',
        zoomRange: { min: 0.8, max: 3, step: 0.1 },
        showGrid: true,
        textSize: 'text-base'
      };
      
    case 'tablet-portrait':
      return {
        containerWidth: Math.min(width - 80, 600),
        containerHeight: Math.min(height * 0.75, 600),
        modalPadding: 'p-8',
        buttonSize: 'text-base px-6 py-3',
        zoomRange: { min: 0.7, max: 4, step: 0.1 },
        showGrid: true,
        textSize: 'text-base'
      };
      
    case 'tablet-landscape':
      return {
        containerWidth: Math.min(width - 120, 800),
        containerHeight: Math.min(height * 0.8, 700),
        modalPadding: 'p-10',
        buttonSize: 'text-lg px-8 py-4',
        zoomRange: { min: 0.6, max: 5, step: 0.1 },
        showGrid: true,
        textSize: 'text-lg'
      };
      
    case 'laptop':
      return {
        containerWidth: Math.min(width - 160, 900),
        containerHeight: Math.min(height * 0.8, 800),
        modalPadding: 'p-12',
        buttonSize: 'text-lg px-8 py-4',
        zoomRange: { min: 0.5, max: 6, step: 0.1 },
        showGrid: true,
        textSize: 'text-lg'
      };
      
    default: // desktop
      return {
        containerWidth: Math.min(width - 200, 1000),
        containerHeight: Math.min(height * 0.85, 900),
        modalPadding: 'p-16',
        buttonSize: 'text-xl px-10 py-5',
        zoomRange: { min: 0.5, max: 8, step: 0.1 },
        showGrid: true,
        textSize: 'text-xl'
      };
  }
};

/**
 * Get device-specific feedback positioning
 */
export const getFeedbackPositioning = (device: DeviceConfig): string => {
  switch (device.type) {
    case 'small-phone':
      return 'top-16 left-2 right-2';
    case 'medium-phone':
      return 'top-20 left-3 right-3';
    case 'large-phone':
      return 'top-20 left-4 right-4';
    case 'tablet-portrait':
      return 'top-24 left-6 right-6';
    case 'tablet-landscape':
      return 'top-28 left-8 right-8';
    case 'laptop':
      return 'top-24 left-8 right-8';
    default: // desktop
      return 'top-24 left-8 right-8';
  }
};

/**
 * Get device-specific header height
 */
export const getHeaderHeight = (device: DeviceConfig): string => {
  switch (device.type) {
    case 'small-phone':
    case 'medium-phone':
    case 'large-phone':
      return '72px';
    case 'tablet-portrait':
    case 'tablet-landscape':
      return '88px';
    default: // desktop
      return '80px';
  }
};

/**
 * Get device-specific content padding
 */
export const getContentPadding = (device: DeviceConfig): string => {
  const headerHeight = getHeaderHeight(device);
  
  if (device.isMobile) {
    return `pt-[${headerHeight}] pb-[90px]`;
  } else if (device.isTablet) {
    return `pt-[${headerHeight}]`;
  } else {
    return `pt-[${headerHeight}]`;
  }
};

/**
 * Hook for reactive device detection
 */
export const useDeviceDetection = () => {
  const [device, setDevice] = useState<DeviceConfig>(detectDevice());
  
  useEffect(() => {
    const handleResize = () => {
      setDevice(detectDevice());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return device;
};
