// Generate random unique links for Linktree pages (letters and numbers only)
export function generateRandomLink(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // Generate 8 random characters
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

// Check if a link is already taken (for future database integration)
export async function isLinkAvailable(link: string): Promise<boolean> {
  // TODO: Check against database/Irys storage
  // For now, assume all generated links are available
  return true;
}

// Generate a guaranteed unique link
export async function generateUniqueLink(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const link = generateRandomLink();
    const available = await isLinkAvailable(link);
    
    if (available) {
      return link;
    }
    
    attempts++;
  }
  
  // Fallback with timestamp if all else fails
  return `iryshare-${Date.now()}`;
}
