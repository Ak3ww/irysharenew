/**
 * Auto-detects social media platform from URL and returns appropriate logo
 */

export interface SocialPlatform {
  name: string;
  logo: string;
  color: string;
}

const socialPlatforms: Record<string, SocialPlatform> = {
  // Social Media
  instagram: {
    name: 'Instagram',
    logo: '/social-icons/icons8-instagram.svg',
    color: '#E1306C' // Instagram official gradient pink
  },
  youtube: {
    name: 'YouTube', 
    logo: '/social-icons/icons8-youtube.svg',
    color: '#FF0000' // YouTube red
  },
  twitter: {
    name: 'Twitter/X',
    logo: '/social-icons/icons8-x.svg',
    color: '#000000' // X (Twitter) is now black
  },
  linkedin: {
    name: 'LinkedIn',
    logo: '/social-icons/icons8-linkedin.svg',
    color: '#0077B5' // LinkedIn blue
  },
  tiktok: {
    name: 'TikTok',
    logo: '/social-icons/icons8-tiktok.svg',
    color: '#000000' // TikTok black
  },
  facebook: {
    name: 'Facebook',
    logo: '/social-icons/icons8-facebook.svg',
    color: '#1877F2' // Facebook blue
  },
  snapchat: {
    name: 'Snapchat',
    logo: '/social-icons/icons8-snapchat.svg',
    color: '#FFFC00'
  },
  pinterest: {
    name: 'Pinterest',
    logo: '/social-icons/icons8-pinterest.svg',
    color: '#E60023'
  },
  reddit: {
    name: 'Reddit',
    logo: '/social-icons/icons8-reddit.svg',
    color: '#FF4500'
  },
  twitch: {
    name: 'Twitch',
    logo: '/social-icons/icons8-twitch.svg',
    color: '#9146FF'
  },
  
  // Professional/Work
  github: {
    name: 'GitHub',
    logo: '/social-icons/icons8-github.svg',
    color: '#333333'
  },
  behance: {
    name: 'Behance',
    logo: '/social-icons/icons8-behance.svg',
    color: '#1769FF'
  },
  dribbble: {
    name: 'Dribbble',
    logo: '/social-icons/icons8-dribbble.svg',
    color: '#EA4C89'
  },
  medium: {
    name: 'Medium',
    logo: '/social-icons/icons8-medium.svg',
    color: '#000000'
  },
  substack: {
    name: 'Substack',
    logo: '/social-icons/icons8-substack.svg',
    color: '#FF6719'
  },
  
  // Communication
  discord: {
    name: 'Discord',
    logo: '/social-icons/icons8-discord.svg',
    color: '#5865F2'
  },
  telegram: {
    name: 'Telegram',
    logo: '/social-icons/icons8-telegram-app.svg',
    color: '#0088CC'
  },
  whatsapp: {
    name: 'WhatsApp',
    logo: '/social-icons/icons8-whatsapp.svg',
    color: '#25D366'
  },
  signal: {
    name: 'Signal',
    logo: '/social-icons/icons8-signal-app.svg',
    color: '#3A76F0'
  },
  
  // Music/Audio
  spotify: {
    name: 'Spotify',
    logo: '/social-icons/icons8-spotify.svg',
    color: '#1DB954'
  },
  soundcloud: {
    name: 'SoundCloud',
    logo: '/social-icons/icons8-soundcloud.svg',
    color: '#FF5500'
  },
  bandcamp: {
    name: 'Bandcamp',
    logo: '/social-icons/icons8-bandcamp.svg',
    color: '#629AA0'
  },
  applemusic: {
    name: 'Apple Music',
    logo: '/social-icons/icons8-apple-music.svg',
    color: '#FA243C'
  },
  
  // Shopping/Business
  etsy: {
    name: 'Etsy',
    logo: '/social-icons/icons8-etsy.svg',
    color: '#F16521'
  },
  shopify: {
    name: 'Shopify',
    logo: '/social-icons/icons8-shopify.svg',
    color: '#7AB55C'
  },
  amazon: {
    name: 'Amazon',
    logo: '/social-icons/icons8-amazon.svg',
    color: '#FF9900'
  },
  paypal: {
    name: 'PayPal',
    logo: '/social-icons/icons8-paypal.svg',
    color: '#00457C'
  },
  
  // Crypto/Web3
  opensea: {
    name: 'OpenSea',
    logo: '/social-icons/opensea.svg',
    color: '#0086FF' // Official OpenSea blue from logomark
  },
  foundation: {
    name: 'Foundation',
    logo: '/social-icons/icons8-foundation.svg',
    color: '#000000'
  },
  
  // Video/Streaming
  vimeo: {
    name: 'Vimeo',
    logo: '/social-icons/icons8-vimeo.svg',
    color: '#1AB7EA'
  },
  onlyfans: {
    name: 'OnlyFans',
    logo: '/social-icons/icons8-onlyfans.svg',
    color: '#00AFF0'
  },
  
  // Gaming
  steam: {
    name: 'Steam',
    logo: '/social-icons/icons8-steam.svg',
    color: '#171A21'
  },
  xbox: {
    name: 'Xbox',
    logo: '/social-icons/icons8-xbox.svg',
    color: '#107C10'
  },
  roblox: {
    name: 'Roblox',
    logo: '/social-icons/icons8-roblox.svg',
    color: '#00A2FF'
  },
  epicgames: {
    name: 'Epic Games',
    logo: '/social-icons/icons8-epic-games.svg',
    color: '#2A2A2A'
  },
  
  // Additional Social
  facebookmessenger: {
    name: 'Facebook Messenger',
    logo: '/social-icons/icons8-facebook-messenger.svg',
    color: '#0084FF'
  },
  vk: {
    name: 'VK',
    logo: '/social-icons/icons8-vk-com.svg',
    color: '#4C75A3'
  },
  
  // Default
  website: {
    name: 'Website',
    logo: '/social-icons/website-black.png',
    color: '#666666'
  },
  email: {
    name: 'Email',
    logo: '/social-icons/icons8-gmail.svg',
    color: '#EA4335'
  },
  phone: {
    name: 'Phone',
    logo: '/social-icons/icons8-phone.svg',
    color: '#34A853'
  }
};

/**
 * Detects social media platform from URL
 * @param url - The URL to analyze
 * @returns SocialPlatform object with name, logo, and color
 */
export function detectSocialPlatform(url: string): SocialPlatform {
  if (!url) return socialPlatforms.website;
  
  const normalizedUrl = url.toLowerCase();
  
  // Social Media
  if (normalizedUrl.includes('instagram.com') || normalizedUrl.includes('instagr.am')) {
    return socialPlatforms.instagram;
  }
  if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
    return socialPlatforms.youtube;
  }
  if (normalizedUrl.includes('twitter.com') || normalizedUrl.includes('x.com')) {
    return socialPlatforms.twitter;
  }
  if (normalizedUrl.includes('linkedin.com')) {
    return socialPlatforms.linkedin;
  }
  if (normalizedUrl.includes('tiktok.com')) {
    return socialPlatforms.tiktok;
  }
  if (normalizedUrl.includes('facebook.com') || normalizedUrl.includes('fb.com')) {
    return socialPlatforms.facebook;
  }
  if (normalizedUrl.includes('snapchat.com')) {
    return socialPlatforms.snapchat;
  }
  if (normalizedUrl.includes('pinterest.com')) {
    return socialPlatforms.pinterest;
  }
  if (normalizedUrl.includes('reddit.com')) {
    return socialPlatforms.reddit;
  }
  if (normalizedUrl.includes('twitch.tv')) {
    return socialPlatforms.twitch;
  }
  
  // Professional/Work
  if (normalizedUrl.includes('github.com')) {
    return socialPlatforms.github;
  }
  if (normalizedUrl.includes('behance.net')) {
    return socialPlatforms.behance;
  }
  if (normalizedUrl.includes('dribbble.com')) {
    return socialPlatforms.dribbble;
  }
  if (normalizedUrl.includes('medium.com')) {
    return socialPlatforms.medium;
  }
  if (normalizedUrl.includes('substack.com')) {
    return socialPlatforms.substack;
  }
  
  // Communication
  if (normalizedUrl.includes('discord.gg') || normalizedUrl.includes('discord.com')) {
    return socialPlatforms.discord;
  }
  if (normalizedUrl.includes('t.me') || normalizedUrl.includes('telegram.me')) {
    return socialPlatforms.telegram;
  }
  if (normalizedUrl.includes('wa.me') || normalizedUrl.includes('whatsapp.com')) {
    return socialPlatforms.whatsapp;
  }
  if (normalizedUrl.includes('signal.org')) {
    return socialPlatforms.signal;
  }
  
  // Music/Audio
  if (normalizedUrl.includes('spotify.com') || normalizedUrl.includes('open.spotify.com')) {
    return socialPlatforms.spotify;
  }
  if (normalizedUrl.includes('soundcloud.com')) {
    return socialPlatforms.soundcloud;
  }
  if (normalizedUrl.includes('bandcamp.com')) {
    return socialPlatforms.bandcamp;
  }
  if (normalizedUrl.includes('music.apple.com')) {
    return socialPlatforms.applemusic;
  }
  
  // Shopping/Business
  if (normalizedUrl.includes('etsy.com')) {
    return socialPlatforms.etsy;
  }
  if (normalizedUrl.includes('shopify.com') || normalizedUrl.includes('.myshopify.com')) {
    return socialPlatforms.shopify;
  }
  if (normalizedUrl.includes('amazon.com')) {
    return socialPlatforms.amazon;
  }
  if (normalizedUrl.includes('paypal.me') || normalizedUrl.includes('paypal.com')) {
    return socialPlatforms.paypal;
  }
  
  // Crypto/Web3
  if (normalizedUrl.includes('opensea.io')) {
    return socialPlatforms.opensea;
  }
  if (normalizedUrl.includes('foundation.app')) {
    return socialPlatforms.foundation;
  }
  
  // Video/Streaming
  if (normalizedUrl.includes('vimeo.com')) {
    return socialPlatforms.vimeo;
  }
  if (normalizedUrl.includes('onlyfans.com')) {
    return socialPlatforms.onlyfans;
  }
  
  // Gaming
  if (normalizedUrl.includes('steam.com') || normalizedUrl.includes('steampowered.com')) {
    return socialPlatforms.steam;
  }
  if (normalizedUrl.includes('xbox.com') || normalizedUrl.includes('xboxlive.com')) {
    return socialPlatforms.xbox;
  }
  if (normalizedUrl.includes('roblox.com')) {
    return socialPlatforms.roblox;
  }
  if (normalizedUrl.includes('epicgames.com') || normalizedUrl.includes('unrealengine.com')) {
    return socialPlatforms.epicgames;
  }
  
  // Additional Social
  if (normalizedUrl.includes('messenger.com') || normalizedUrl.includes('fb-messenger.com')) {
    return socialPlatforms.facebookmessenger;
  }
  if (normalizedUrl.includes('vk.com')) {
    return socialPlatforms.vk;
  }
  
  // Special cases
  if (normalizedUrl.includes('mailto:')) {
    return socialPlatforms.email;
  }
  if (normalizedUrl.includes('tel:') || normalizedUrl.includes('phone:')) {
    return socialPlatforms.phone;
  }
  
  // Default to website icon for unknown URLs
  return socialPlatforms.website;
}

/**
 * Gets the logo URL for a given platform
 * @param url - The URL to analyze
 * @returns Logo path
 */
export function getSocialLogo(url: string): string {
  return detectSocialPlatform(url).logo;
}



/**
 * Gets the platform name for a given URL
 * @param url - The URL to analyze  
 * @returns Platform name
 */
export function getSocialPlatformName(url: string): string {
  return detectSocialPlatform(url).name;
}

/**
 * Gets the brand color for a given platform
 * @param url - The URL to analyze
 * @returns Hex color code
 */
export function getSocialColor(url: string): string {
  return detectSocialPlatform(url).color;
}

/**
 * Gets the logo URL for a given platform based on context
 * @param url - The URL to analyze
 * @param isAdmin - Whether this is for admin interface (true) or live page (false)
 * @returns Logo path
 */
export function getSocialLogoContext(url: string, isAdmin: boolean = false): string {
  const platform = detectSocialPlatform(url);
  
  // For admin interface, use white icons for better visibility
  if (isAdmin) {
    if (platform.name === 'Website') {
      return '/social-icons/website-white.png';
    }
    if (platform.name === 'Twitter/X') {
      return '/social-icons/icons8-x-white.svg';
    }
  }
  
  // For live page, use black icons (default)
  return platform.logo;
}
