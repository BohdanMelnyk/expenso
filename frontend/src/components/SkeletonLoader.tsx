import React from 'react';

interface SkeletonLoaderProps {
  type?: 'card' | 'table' | 'chart' | 'list' | 'stats';
  count?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'card', 
  count = 1, 
  className = '' 
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
            <div className={`${baseClasses} h-4 w-1/4 mb-4`}></div>
            <div className={`${baseClasses} h-6 w-1/2 mb-2`}></div>
            <div className={`${baseClasses} h-4 w-3/4`}></div>
          </div>
        );
      
      case 'table':
        return (
          <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
            <div className="px-6 py-4 border-b">
              <div className={`${baseClasses} h-4 w-1/3`}></div>
            </div>
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center space-x-4">
                  <div className={`${baseClasses} h-10 w-10 rounded-full`}></div>
                  <div className="flex-1">
                    <div className={`${baseClasses} h-4 w-1/2 mb-2`}></div>
                    <div className={`${baseClasses} h-3 w-1/4`}></div>
                  </div>
                  <div className={`${baseClasses} h-4 w-16`}></div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'chart':
        return (
          <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
            <div className={`${baseClasses} h-4 w-1/4 mb-6`}></div>
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-end space-x-2">
                  <div className={`${baseClasses} w-8`} style={{ height: Math.random() * 100 + 50 }}></div>
                  <div className={`${baseClasses} w-8`} style={{ height: Math.random() * 100 + 50 }}></div>
                  <div className={`${baseClasses} w-8`} style={{ height: Math.random() * 100 + 50 }}></div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'list':
        return (
          <div className={`space-y-4 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="bg-white shadow rounded-lg p-4 flex items-center space-x-4">
                <div className={`${baseClasses} h-12 w-12 rounded-full`}></div>
                <div className="flex-1">
                  <div className={`${baseClasses} h-4 w-2/3 mb-2`}></div>
                  <div className={`${baseClasses} h-3 w-1/3`}></div>
                </div>
                <div className={`${baseClasses} h-4 w-20`}></div>
              </div>
            ))}
          </div>
        );
      
      case 'stats':
        return (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6">
                <div className={`${baseClasses} h-3 w-16 mb-3`}></div>
                <div className={`${baseClasses} h-8 w-20 mb-2`}></div>
                <div className={`${baseClasses} h-3 w-12`}></div>
              </div>
            ))}
          </div>
        );
      
      default:
        return (
          <div className={`${baseClasses} h-4 w-full ${className}`}></div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

export default SkeletonLoader;