// Auto-Share Utility Functions
// These functions help trigger the new success toast after successful operations

/**
 * Triggers the success toast with quick action buttons
 * This replaces the old alert system with a beautiful toast
 */
export const showSuccessToast = (linktreeUrl: string, customMessage?: string) => {
  // Dispatch a custom event that the SuccessToast component will listen to
  const event = new CustomEvent('showSuccessToast', {
    detail: {
      linktreeUrl,
      message: customMessage || 'Linktree Published Successfully!'
    }
  });
  window.dispatchEvent(event);
};

/**
 * Enhanced save success with success toast
 * Shows beautiful success toast with visit and share options
 */
export const handleSaveSuccess = (linktreeUrl: string) => {
  showSuccessToast(linktreeUrl, '🚀 Linktree saved and published successfully!');
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use showSuccessToast instead
 */
export const triggerAutoTwitterShare = (linktreeUrl: string) => {
  // Fallback: manually create Twitter share URL
  const message = `Visit my beautiful links at ${linktreeUrl} | Share your beautiful links on https://iryshare.vercel.app | #Iryshare @iryshare`;
  const searchParams = new URLSearchParams({
    url: linktreeUrl,
    text: message
  });
  const shareUrl = `https://twitter.com/intent/tweet?${searchParams.toString()}`;
  window.open(shareUrl, '_blank', 'width=800,height=640,noopener,noreferrer');
};
