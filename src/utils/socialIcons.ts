export interface SocialIcon {
  name: string;
  icon: string;
  color: string;
  patterns: string[];
  logoPath?: string; // Path to actual logo file
}

export const SOCIAL_ICONS: SocialIcon[] = [
  {
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    patterns: ['youtube', 'yt', 'you tube'],
    logoPath: '/youtube-logo.png'
  },
  {
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    patterns: ['twitter', 'x', 'x.com', 'tweet'],
    logoPath: '/twitter-logo.png'
  },
  {
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    patterns: ['instagram', 'ig', 'insta']
  },
  {
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    patterns: ['facebook', 'fb', 'face book']
  },
  {
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    patterns: ['linkedin', 'li', 'linked in']
  },
  {
    name: 'GitHub',
    icon: 'github',
    color: '#181717',
    patterns: ['github', 'gh', 'git hub']
  },
  {
    name: 'TikTok',
    icon: 'music-note',
    color: '#000000',
    patterns: ['tiktok', 'tt', 'tik tok']
  },
  {
    name: 'Snapchat',
    icon: 'snapchat',
    color: '#FFFC00',
    patterns: ['snapchat', 'snap', 'snap chat']
  },
  {
    name: 'Discord',
    icon: 'discord',
    color: '#5865F2',
    patterns: ['discord', 'disc', 'discord.gg']
  },
  {
    name: 'Twitch',
    icon: 'twitch',
    color: '#9146FF',
    patterns: ['twitch', 'twitch.tv']
  },
  {
    name: 'Reddit',
    icon: 'reddit',
    color: '#FF4500',
    patterns: ['reddit', 'redd.it']
  },
  {
    name: 'Pinterest',
    icon: 'pinterest',
    color: '#BD081C',
    patterns: ['pinterest', 'pin']
  },
  {
    name: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    patterns: ['whatsapp', 'wa', 'whats app']
  },
  {
    name: 'Telegram',
    icon: 'telegram',
    color: '#0088CC',
    patterns: ['telegram', 'tg', 't.me']
  },
  {
    name: 'Spotify',
    icon: 'music',
    color: '#1DB954',
    patterns: ['spotify', 'spoti']
  },
  {
    name: 'Apple Music',
    icon: 'music',
    color: '#FA243C',
    patterns: ['apple music', 'itunes']
  },
  {
    name: 'SoundCloud',
    icon: 'music',
    color: '#FF7700',
    patterns: ['soundcloud', 'sc']
  },
  {
    name: 'Behance',
    icon: 'behance',
    color: '#1769FF',
    patterns: ['behance', 'behance.net']
  },
  {
    name: 'Dribbble',
    icon: 'dribbble',
    color: '#EA4C89',
    patterns: ['dribbble', 'dribble']
  },
  {
    name: 'Medium',
    icon: 'medium',
    color: '#000000',
    patterns: ['medium', 'medium.com']
  },
  {
    name: 'Substack',
    icon: 'mail',
    color: '#FF6719',
    patterns: ['substack', 'substack.com']
  },
  {
    name: 'OnlyFans',
    icon: 'heart',
    color: '#00AFF0',
    patterns: ['onlyfans', 'only fans']
  },
  {
    name: 'Patreon',
    icon: 'heart',
    color: '#FF424D',
    patterns: ['patreon', 'patreon.com']
  },
  {
    name: 'Buy Me a Coffee',
    icon: 'coffee',
    color: '#FFDD00',
    patterns: ['buymeacoffee', 'buy me a coffee'],
    logoPath: '/coffee-logo.png'
  },
  {
    name: 'Ko-fi',
    icon: 'coffee',
    color: '#F6D300',
    patterns: ['ko-fi', 'ko fi'],
    logoPath: '/coffee-logo.png'
  }
];

export function detectSocialIcon(linkName: string, url?: string): SocialIcon | null {
  const searchText = `${linkName} ${url || ''}`.toLowerCase();
  
  for (const socialIcon of SOCIAL_ICONS) {
    for (const pattern of socialIcon.patterns) {
      if (searchText.includes(pattern.toLowerCase())) {
        return socialIcon;
      }
    }
  }
  
  return null;
}

export function getSocialIconName(linkName: string, url?: string): string {
  const socialIcon = detectSocialIcon(linkName, url);
  return socialIcon ? socialIcon.icon : 'link';
}

export function getSocialIconColor(linkName: string, url?: string): string {
  const socialIcon = detectSocialIcon(linkName, url);
  return socialIcon ? socialIcon.color : '#6B7280';
}

export function getSocialIconDisplayName(linkName: string, url?: string): string {
  const socialIcon = detectSocialIcon(linkName, url);
  return socialIcon ? socialIcon.name : 'Link';
}

export function getSocialIconLogoPath(linkName: string, url?: string): string | null {
  const socialIcon = detectSocialIcon(linkName, url);
  return socialIcon?.logoPath || null;
}
