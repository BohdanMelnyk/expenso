/**
 * Extracts error message from axios error response
 * @param error - The error object (usually from axios)
 * @param fallback - Fallback message if no specific error found
 * @returns Formatted error message
 */
export const getErrorMessage = (error: any, fallback: string = 'An unexpected error occurred'): string => {
  // Check for axios response error
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Check for axios response message
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Check for general error message
  if (error.message) {
    return error.message;
  }
  
  // Return fallback message
  return fallback;
};