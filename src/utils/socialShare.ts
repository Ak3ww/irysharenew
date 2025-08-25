export interface ShareOptions {
  url: string;
  title: string;
  description: string;
  username: string;
}

// Generate share content for different platforms
export function generateShareContent(options: ShareOptions) {
  const { url, title, description, username } = options;
  
  return {
    twitter: {
      text: `Check out ${title}'s awesome Linktree! 🔗✨ All their content in one place. Create yours too! ${url} #Iryshare #Linktree`,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${title}'s awesome Linktree! 🔗✨ All their content in one place. Create yours too! ${url} #Iryshare #Linktree`)}`
    },
    facebook: {
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(`Check out ${title}'s Linktree on Iryshare! ${description}`)}`
    },
    linkedin: {
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description)}`
    },
    reddit: {
      url: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(`${title}'s Linktree on Iryshare`)}`
    },
    telegram: {
      url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Check out ${title}'s Linktree! ${description}`)}`
    },
    whatsapp: {
      url: `https://wa.me/?text=${encodeURIComponent(`Check out ${title}'s Linktree! ${description} ${url}`)}`
    },
    pinterest: {
      url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(`${title}'s Linktree on Iryshare`)}`
    },
    email: {
      url: `mailto:?subject=${encodeURIComponent(`Check out ${title}'s Linktree`)}&body=${encodeURIComponent(`Hi! I wanted to share ${title}'s awesome Linktree with you: ${url}\n\n${description}\n\nYou can create your own Linktree too on Iryshare!`)}`
    }
  };
}

// Open share dialog for specific platform
export function shareToSocial(platform: string, options: ShareOptions) {
  const shareContent = generateShareContent(options);
  const platformData = shareContent[platform as keyof typeof shareContent];
  
  if (!platformData) {
    console.error('Unsupported platform:', platform);
    return;
  }
  
  // Open share URL in new window
  const width = 600;
  const height = 400;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  
  window.open(
    platformData.url,
    `share-${platform}`,
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
}

// Copy link to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      console.error('Failed to copy to clipboard:', fallbackError);
      return false;
    }
  }
}

// Native share API (for mobile devices)
export async function nativeShare(options: ShareOptions): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }
  
  try {
    await navigator.share({
      title: options.title,
      text: options.description,
      url: options.url
    });
    return true;
  } catch (error) {
    console.error('Native share failed:', error);
    return false;
  }
}

// Get available share platforms with icons
export function getSharePlatforms() {
  return [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: '🐦',
      color: '#1DA1F2',
      bgColor: 'bg-blue-500'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '📘',
      color: '#4267B2',
      bgColor: 'bg-blue-600'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: '💼',
      color: '#0077B5',
      bgColor: 'bg-blue-700'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💬',
      color: '#25D366',
      bgColor: 'bg-green-500'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: '✈️',
      color: '#0088cc',
      bgColor: 'bg-blue-400'
    },
    {
      id: 'reddit',
      name: 'Reddit',
      icon: '🔴',
      color: '#FF4500',
      bgColor: 'bg-orange-500'
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      icon: '📌',
      color: '#BD081C',
      bgColor: 'bg-red-500'
    },
    {
      id: 'email',
      name: 'Email',
      icon: '📧',
      color: '#6B7280',
      bgColor: 'bg-gray-500'
    }
  ];
}
