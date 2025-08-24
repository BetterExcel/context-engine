import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'table' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width = '100%',
  height = '1rem',
  lines = 1,
  animate = true
}) => {
  const baseClasses = `bg-gray-200 ${animate ? 'animate-pulse' : ''}`;
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'rounded h-4';
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded';
      case 'table':
        return 'rounded';
      case 'card':
        return 'rounded-lg';
      default:
        return 'rounded';
    }
  };

  const getStyle = () => ({
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  });

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()} mb-2 last:mb-0`}
            style={{
              ...getStyle(),
              width: index === lines - 1 ? '75%' : width, // Last line is shorter
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={getStyle()}
    />
  );
};

// Specialized skeleton components
export const SpreadsheetSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <LoadingSkeleton variant="text" width="200px" height="24px" />
      <LoadingSkeleton variant="rectangular" width="120px" height="32px" />
    </div>
    
    {/* Formula bar */}
    <div className="border border-gray-200 rounded p-3 mb-4 bg-gray-50">
      <div className="flex items-center space-x-3">
        <LoadingSkeleton variant="text" width="60px" height="20px" />
        <LoadingSkeleton variant="rectangular" width="100%" height="32px" />
      </div>
    </div>
    
    {/* Table header */}
    <div className="grid grid-cols-6 gap-1 mb-2">
      {Array.from({ length: 6 }, (_, index) => (
        <LoadingSkeleton key={index} variant="rectangular" height="32px" />
      ))}
    </div>
    
    {/* Table rows */}
    {Array.from({ length: 8 }, (_, rowIndex) => (
      <div key={rowIndex} className="grid grid-cols-6 gap-1 mb-1">
        {Array.from({ length: 6 }, (_, colIndex) => (
          <LoadingSkeleton key={colIndex} variant="rectangular" height="32px" />
        ))}
      </div>
    ))}
  </div>
);

export const ContextAnalysisSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <LoadingSkeleton variant="text" width="250px" height="24px" />
      <LoadingSkeleton variant="rectangular" width="120px" height="32px" />
    </div>
    
    {/* Tabs */}
    <div className="flex space-x-8 mb-6 border-b border-gray-200">
      {Array.from({ length: 3 }, (_, index) => (
        <LoadingSkeleton key={index} variant="text" width="100px" height="20px" />
      ))}
    </div>
    
    {/* Content */}
    <div className="space-y-6">
      {/* Confidence indicator */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <LoadingSkeleton variant="text" width="150px" height="20px" />
        <LoadingSkeleton variant="rectangular" width="200px" height="8px" className="mt-2" />
      </div>
      
      {/* Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <LoadingSkeleton variant="text" width="200px" height="24px" className="mb-3" />
        <LoadingSkeleton variant="text" lines={3} />
      </div>
      
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="bg-gray-50 rounded-md p-4">
            <LoadingSkeleton variant="text" width="100px" height="20px" className="mb-2" />
            <LoadingSkeleton variant="text" width="80px" height="16px" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ChartSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <LoadingSkeleton variant="text" width="180px" height="24px" />
      <LoadingSkeleton variant="rectangular" width="100px" height="24px" />
    </div>
    
    {/* Chart area */}
    <div className="relative">
      <LoadingSkeleton variant="rectangular" width="100%" height="300px" />
      
      {/* Simulate chart elements */}
      <div className="absolute inset-0 p-8">
        {/* Y-axis */}
        <div className="absolute left-4 top-8 bottom-8 w-8 flex flex-col justify-between">
          {Array.from({ length: 6 }, (_, index) => (
            <LoadingSkeleton key={index} variant="text" width="24px" height="12px" />
          ))}
        </div>
        
        {/* X-axis */}
        <div className="absolute bottom-4 left-16 right-8 h-8 flex justify-between items-end">
          {Array.from({ length: 8 }, (_, index) => (
            <LoadingSkeleton key={index} variant="text" width="32px" height="12px" />
          ))}
        </div>
        
        {/* Chart bars/lines */}
        <div className="absolute left-16 right-8 top-8 bottom-16 flex items-end justify-between">
          {Array.from({ length: 8 }, (_, index) => (
            <LoadingSkeleton 
              key={index} 
              variant="rectangular" 
              width="20px" 
              height={`${Math.random() * 80 + 20}%`}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const FileUploadSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <div className="mb-6">
      <LoadingSkeleton variant="text" width="250px" height="24px" className="mb-2" />
      <LoadingSkeleton variant="text" width="400px" height="16px" />
    </div>
    
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
      <div className="text-center">
        <LoadingSkeleton variant="circular" width="48px" height="48px" className="mx-auto mb-4" />
        <LoadingSkeleton variant="text" width="200px" height="20px" className="mx-auto mb-2" />
        <LoadingSkeleton variant="text" width="300px" height="16px" className="mx-auto" />
      </div>
    </div>
  </div>
);

export default LoadingSkeleton;