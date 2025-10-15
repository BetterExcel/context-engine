import { useState, useEffect } from 'react';

interface BreakpointConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
}

const defaultBreakpoints: BreakpointConfig = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1600,
};

export type Breakpoint = keyof BreakpointConfig;

export const useResponsive = (breakpoints: Partial<BreakpointConfig> = {}) => {
  const config = { ...defaultBreakpoints, ...breakpoints };
  
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isBreakpoint = (breakpoint: Breakpoint): boolean => {
    return windowSize.width >= config[breakpoint];
  };

  const isBetween = (min: Breakpoint, max: Breakpoint): boolean => {
    return windowSize.width >= config[min] && windowSize.width < config[max];
  };

  const isBelow = (breakpoint: Breakpoint): boolean => {
    return windowSize.width < config[breakpoint];
  };

  const getCurrentBreakpoint = (): Breakpoint => {
    const sortedBreakpoints = Object.entries(config)
      .sort(([, a], [, b]) => b - a) as [Breakpoint, number][];
    
    for (const [breakpoint, width] of sortedBreakpoints) {
      if (windowSize.width >= width) {
        return breakpoint;
      }
    }
    
    return 'xs';
  };

  const isMobile = isBelow('md');
  const isTablet = isBetween('md', 'lg');
  const isDesktop = isBreakpoint('lg');
  const isLargeDesktop = isBreakpoint('xl');

  return {
    windowSize,
    isBreakpoint,
    isBetween,
    isBelow,
    getCurrentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    breakpoints: config,
  };
};

// Hook for responsive values
export const useResponsiveValue = <T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T): T => {
  const { getCurrentBreakpoint } = useResponsive();
  const currentBreakpoint = getCurrentBreakpoint();
  
  // Find the best matching value by checking breakpoints in descending order
  const sortedBreakpoints: Breakpoint[] = ['3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = sortedBreakpoints.indexOf(currentBreakpoint);
  
  for (let i = currentIndex; i < sortedBreakpoints.length; i++) {
    const breakpoint = sortedBreakpoints[i];
    if (values[breakpoint] !== undefined) {
      return values[breakpoint] as T;
    }
  }
  
  return defaultValue;
};

// Hook for responsive grid columns
export const useResponsiveColumns = (
  columns: Partial<Record<Breakpoint, number>>,
  defaultColumns: number = 1
): number => {
  return useResponsiveValue(columns, defaultColumns);
};

// Hook for responsive spacing
export const useResponsiveSpacing = (
  spacing: Partial<Record<Breakpoint, string>>,
  defaultSpacing: string = '1rem'
): string => {
  return useResponsiveValue(spacing, defaultSpacing);
};