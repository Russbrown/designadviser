'use client';

import { useEffect } from 'react';

export function ErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection caught:', event.reason);
      
      // Log more details about the error
      if (event.reason instanceof Error) {
        console.error('Error name:', event.reason.name);
        console.error('Error message:', event.reason.message);
        console.error('Error stack:', event.reason.stack);
      }
      
      // Prevent the default behavior (which logs to console and triggers Next.js error overlay)
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Uncaught error:', event.error);
      event.preventDefault();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleError);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleError);
      }
    };
  }, []);

  return null;
}