// Analytics utility for tracking user events

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// Track custom events
export function trackEvent(eventName: string, parameters?: Record<string, any>) {
  // Only send to Google Analytics, no console logging
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
}

// Track user registration
export function trackUserRegistration(walletType: string, address: string) {
  trackEvent('user_registered', {
    wallet_type: walletType,
    user_address: address.slice(0, 6) + '...' + address.slice(-4), // Truncated for privacy
    timestamp: new Date().toISOString()
  });
}

// Track file upload
export function trackFileUpload(
  fileSize: number,
  fileType: string,
  isEncrypted: boolean,
  action: 'share' | 'store',
  recipientCount?: number
) {
  trackEvent('file_uploaded', {
    file_size_mb: Math.round(fileSize / (1024 * 1024) * 100) / 100,
    file_type: fileType,
    is_encrypted: isEncrypted,
    action: action,
    recipient_count: recipientCount || 0,
    timestamp: new Date().toISOString()
  });
}

// Track credit purchase
export function trackCreditPurchase(amount: number, currency: string) {
  trackEvent('credit_purchased', {
    amount: amount,
    currency: currency,
    timestamp: new Date().toISOString()
  });
}

// Track page views
export function trackPageView(pageName: string) {
  trackEvent('page_view', {
    page_name: pageName,
    timestamp: new Date().toISOString()
  });
}

// Track user login
export function trackUserLogin(walletType: string, address: string) {
  trackEvent('user_login', {
    wallet_type: walletType,
    user_address: address.slice(0, 6) + '...' + address.slice(-4),
    timestamp: new Date().toISOString()
  });
}

// Track error events
export function trackError(errorType: string, errorMessage: string, context?: string) {
  trackEvent('error_occurred', {
    error_type: errorType,
    error_message: errorMessage,
    context: context,
    timestamp: new Date().toISOString()
  });
}

// Track feature usage
export function trackFeatureUsage(featureName: string, parameters?: Record<string, any>) {
  trackEvent('feature_used', {
    feature_name: featureName,
    ...parameters,
    timestamp: new Date().toISOString()
  });
} 