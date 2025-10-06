import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'default' | 'compact' | 'banner';
  showRetry?: boolean;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onRetry,
  onDismiss,
  variant = 'default',
  showRetry = true,
  className = ''
}) => {
  const baseClasses = 'flex items-center gap-3 border rounded-md';
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'p-3 text-sm bg-red-50 border-red-200 text-red-700';
      case 'banner':
        return 'p-4 bg-red-100 border-red-300 text-red-800';
      default:
        return 'p-4 bg-red-50 border-red-200 text-red-700';
    }
  };

  return (
    <div className={`${baseClasses} ${getVariantClasses()} ${className}`}>
      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="font-medium">Error</p>
        <p className="text-sm opacity-90 mt-1">{error}</p>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </button>
        )}
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-red-500 hover:text-red-700 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;