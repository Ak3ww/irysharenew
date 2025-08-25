import { useState, useEffect, useMemo } from 'react';

export interface ResponsiveConfig {
  // Device types
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  
  // Orientation
  isPortrait: boolean;
  isLandscape: boolean;
  
  // Screen dimensions
  width: number;
  height: number;
  
  // Breakpoint helpers
  isSmallPhone: boolean;      // <= 375px
  isMediumPhone: boolean;     // 376px - 480px
  isLargePhone: boolean;      // 481px - 767px
  isTabletPortrait: boolean;  // 768px - 1023px
  isTabletLandscape: boolean; // 1024px - 1365px
  isLaptop: boolean;          // 1366px - 1919px
  isDesktopLarge: boolean;    // >= 1920px
  
  // Responsive utilities
  getResponsiveValue: <T>(mobile: T, tablet: T, desktop: T) => T;
  getResponsiveSpacing: (mobile: string, tablet: string, desktop: string) => string;
  getResponsiveText: (mobile: string, tablet: string, desktop: string) => string;
}

export function useResponsive(): ResponsiveConfig {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const config = useMemo(() => {
    const { width, height } = dimensions;
    
    // Device type detection
    const isMobile = width <= 767;
    const isTablet = width > 767 && width <= 1023;
    const isDesktop = width > 1023;
    const isLargeDesktop = width >= 1920;
    
    // Orientation detection
    const isPortrait = height > width;
    const isLandscape = width > height;
    
    // Detailed breakpoint detection
    const isSmallPhone = width <= 375;
    const isMediumPhone = width > 375 && width <= 480;
    const isLargePhone = width > 480 && width <= 767;
    const isTabletPortrait = width > 767 && width <= 1023 && isPortrait;
    const isTabletLandscape = width > 767 && width <= 1023 && isLandscape;
    const isLaptop = width > 1023 && width <= 1919;
    const isDesktopLarge = width >= 1920;
    
    // Responsive utility functions
    const getResponsiveValue = <T>(mobile: T, tablet: T, desktop: T): T => {
      if (isMobile) return mobile;
      if (isTablet) return tablet;
      return desktop;
    };
    
    const getResponsiveSpacing = (mobile: string, tablet: string, desktop: string): string => {
      if (isMobile) return mobile;
      if (isTablet) return tablet;
      return desktop;
    };
    
    const getResponsiveText = (mobile: string, tablet: string, desktop: string): string => {
      if (isMobile) return mobile;
      if (isTablet) return tablet;
      return desktop;
    };

    return {
      isMobile,
      isTablet,
      isDesktop,
      isLargeDesktop,
      isPortrait,
      isLandscape,
      width,
      height,
      isSmallPhone,
      isMediumPhone,
      isLargePhone,
      isTabletPortrait,
      isTabletLandscape,
      isLaptop,
      isDesktopLarge,
      getResponsiveValue,
      getResponsiveSpacing,
      getResponsiveText
    };
  }, [dimensions]);

  return config;
}

// Predefined responsive values for common use cases
export const responsiveValues = {
  // Spacing
  spacing: {
    xs: { mobile: '0.5rem', tablet: '0.75rem', desktop: '1rem' },
    sm: { mobile: '0.75rem', tablet: '1rem', desktop: '1.25rem' },
    md: { mobile: '1rem', tablet: '1.5rem', desktop: '2rem' },
    lg: { mobile: '1.5rem', tablet: '2rem', desktop: '2.5rem' },
    xl: { mobile: '2rem', tablet: '2.5rem', desktop: '3rem' },
    '2xl': { mobile: '2.5rem', tablet: '3rem', desktop: '4rem' },
    '3xl': { mobile: '3rem', tablet: '4rem', desktop: '5rem' }
  },
  
  // Text sizes
  text: {
    xs: { mobile: 'text-xs', tablet: 'text-sm', desktop: 'text-base' },
    sm: { mobile: 'text-sm', tablet: 'text-base', desktop: 'text-lg' },
    base: { mobile: 'text-base', tablet: 'text-lg', desktop: 'text-xl' },
    lg: { mobile: 'text-lg', tablet: 'text-xl', desktop: 'text-2xl' },
    xl: { mobile: 'text-xl', tablet: 'text-2xl', desktop: 'text-3xl' },
    '2xl': { mobile: 'text-2xl', tablet: 'text-3xl', desktop: 'text-4xl' },
    '3xl': { mobile: 'text-3xl', tablet: 'text-4xl', desktop: 'text-5xl' }
  },
  
  // Padding
  padding: {
    xs: { mobile: 'p-2', tablet: 'p-3', desktop: 'p-4' },
    sm: { mobile: 'p-3', tablet: 'p-4', desktop: 'p-5' },
    md: { mobile: 'p-4', tablet: 'p-6', desktop: 'p-8' },
    lg: { mobile: 'p-6', tablet: 'p-8', desktop: 'p-10' },
    xl: { mobile: 'p-8', tablet: 'p-10', desktop: 'p-12' }
  },
  
  // Margins
  margin: {
    xs: { mobile: 'm-2', tablet: 'm-3', desktop: 'm-4' },
    sm: { mobile: 'm-3', tablet: 'm-4', desktop: 'm-5' },
    md: { mobile: 'm-4', tablet: 'm-6', desktop: 'm-8' },
    lg: { mobile: 'm-6', tablet: 'm-8', desktop: 'm-10' },
    xl: { mobile: 'm-8', tablet: 'm-10', desktop: 'm-12' }
  },
  
  // Grid columns
  grid: {
    cols: {
      mobile: { mobile: 'grid-cols-1', tablet: 'grid-cols-2', desktop: 'grid-cols-3' },
      auto: { mobile: 'grid-cols-1', tablet: 'grid-cols-2', desktop: 'grid-cols-auto' }
    }
  }
};
