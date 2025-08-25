// Profile Update Utility Functions
// These functions allow child components to trigger profile update feedback
// that automatically adapts to different device dimensions

export interface ProfileUpdateEvent {
  status: 'idle' | 'updating' | 'success' | 'error';
  message: string;
}

/**
 * Trigger a profile update status change
 * @param status - The status to display
 * @param message - The message to show
 */
export const triggerProfileUpdate = (status: ProfileUpdateEvent['status'], message: string) => {
  const event = new CustomEvent('profileUpdate', {
    detail: { status, message }
  });
  window.dispatchEvent(event);
};

/**
 * Show profile update in progress
 * @param message - Optional custom message
 */
export const showProfileUpdating = (message?: string) => {
  triggerProfileUpdate('updating', message || 'Updating profile picture...');
};

/**
 * Show profile update success
 * @param message - Optional custom message
 */
export const showProfileSuccess = (message?: string) => {
  triggerProfileUpdate('success', message || 'Profile picture updated successfully!');
};

/**
 * Show profile update error
 * @param message - Optional custom message
 */
export const showProfileError = (message?: string) => {
  triggerProfileUpdate('error', message || 'Failed to update profile picture. Please try again.');
};

/**
 * Clear profile update status
 */
export const clearProfileStatus = () => {
  triggerProfileUpdate('idle', '');
};

/**
 * Get device-specific feedback positioning
 * @param deviceType - The detected device type
 * @returns CSS classes for positioning
 */
export const getFeedbackPositioning = (deviceType: string) => {
  switch (deviceType) {
    case 'small-phone':
      return 'top-16 left-2 right-2';
    case 'medium-phone':
      return 'top-20 left-3 right-3';
    case 'large-phone':
      return 'top-20 left-4 right-4';
    case 'tablet-portrait':
      return 'top-24 left-6 right-6';
    case 'tablet-landscape':
      return 'top-28 left-8 right-8';
    case 'laptop':
      return 'top-24 left-8 right-8';
    default: // desktop
      return 'top-24 left-8 right-8';
  }
};

/**
 * Get device-specific text sizing
 * @param deviceType - The detected device type
 * @returns CSS classes for text sizing
 */
export const getFeedbackTextSize = (deviceType: string) => {
  if (deviceType.includes('phone')) {
    return 'text-sm';
  }
  return 'text-base';
};

/**
 * Get device-specific button sizing
 * @param deviceType - The detected device type
 * @returns CSS classes for button sizing
 */
export const getFeedbackButtonSize = (deviceType: string) => {
  if (deviceType.includes('phone')) {
    return 'text-sm px-3 py-2';
  } else if (deviceType.includes('tablet')) {
    return 'text-base px-4 py-2.5';
  } else {
    return 'text-base px-4 py-3';
  }
};
