import { useState, useCallback } from 'react';

export interface UseApiRequestResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  execute: () => Promise<void>;
  reset: () => void;
}

export interface UseApiRequestOptions {
  retryAttempts?: number;
  retryDelay?: number;
  showSuccessToast?: boolean;
  successMessage?: string;
}

export function useApiRequest<T>(
  apiCall: () => Promise<T>,
  options: UseApiRequestOptions = {}
): UseApiRequestResult<T> {
  const {
    retryAttempts = 3,
    retryDelay = 1000,
    showSuccessToast = false,
    successMessage = 'Operation completed successfully'
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRetryAttempt, setCurrentRetryAttempt] = useState(0);

  const execute = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    let lastError: any;
    
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const result = await apiCall();
        setData(result);
        setCurrentRetryAttempt(0);
        setLoading(false);
        
        if (showSuccessToast && successMessage) {
          // You can integrate with your toast system here
          console.log(successMessage);
        }
        
        return;
      } catch (err: any) {
        lastError = err;
        setCurrentRetryAttempt(attempt + 1);
        
        if (attempt < retryAttempts) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }
    
    // All retries failed
    setError(
      lastError?.response?.data?.message || 
      lastError?.message || 
      'An unexpected error occurred. Please try again.'
    );
    setLoading(false);
  }, [apiCall, retryAttempts, retryDelay, showSuccessToast, successMessage]);

  const retry = useCallback(() => {
    execute();
  }, [execute]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setCurrentRetryAttempt(0);
  }, []);

  return {
    data,
    loading,
    error,
    retry,
    execute,
    reset
  };
}