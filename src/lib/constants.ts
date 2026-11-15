import backdropObsidianImg from '@/src/assets/images/comboss_backdrop_obsidian_1794696768929.jpg';
import avatarFounderImg from '@/src/assets/images/comboss_avatar_founder_1794696769079.jpg';
import bannerMetalImg from '@/src/assets/images/comboss_banner_metal_1794696770065.jpg';
import type { BadgeDefinition, PlatformId, Profile } from '@/src/types/comboss';

export const BOOTSTRAP_OWNER_EMAIL = 'prodigyeditshelp@gmail.com';

export const RESERVED_HANDLES = [
  'admin',
  'dashboard',
  'auth',
  'login',
  'directory',
  'api',
  'settings',
  'forgot-password',
];

export const HANDLE_REGEX = /^[a-z0-9_-]{2,24}$/;
export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const CORE_BADGES: BadgeDefinition[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Founder and lead administrator of hightier.lol.',
    color: '#F59E0B',
    iconKey: 'crown',
    isSystem: true,
  },
  {
    id: 'staff',
    name: 'Staff',
    description: 'Official hightier.lol moderation and support team.',
    color: '#3B82F6',
    iconKey: 'shield',
    isSystem: true,
  },
  {
    id: 'known',
    name: 'Known',
    description: 'Recognized creator or notable figure in the community.',
    color: '#E2E8F0',
    iconKey: 'star',
    isSystem: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Active hightier.lol Pro member with unlocked customization.',
    color: '#A78BFA',
    iconKey: 'gem',
    isSystem: true,
  },
  {
    id: 'donator',
    name: 'Donator',
    description: 'Direct financial supporter helping keep hightier.lol online.',
    color: '#F43F5E',
    iconKey: 'heart',
    isSystem: true,
  },
  {
    id: 'bug_hunter',
    name: 'Bug Hunter',
    description: 'Identified and responsibly reported a platform security or UI bug.',
    color: '#10B981',
    iconKey: 'bug',
    isSystem: true,
  },
];

export const PLATFORM_OPTIONS: {
  id: PlatformId;
  label: string;
  placeholderUrl: string;
  accent: string;
}[] = [
  { id: 'discord', label: 'Discord', placeholderUrl: 'https://discord.gg/invite', accent: '#5865F2' },
  { id: 'x', label: 'X (Twitter)', placeholderUrl: 'https://x.com/handle', accent: '#E2E8F0' },
  { id: 'instagram', label: 'Instagram', placeholderUrl: 'https://instagram.com/handle', accent: '#E1306C' },
  { id: 'tiktok', label: 'TikTok', placeholderUrl: 'https://tiktok.com/@handle', accent: '#25F4EE' },
  { id: 'youtube', label: 'YouTube', placeholderUrl: 'https://youtube.com/@handle', accent: '#FF0000' },
  { id: 'twitch', label: 'Twitch', placeholderUrl: 'https://twitch.tv/handle', accent: '#9146FF' },
  { id: 'github', label: 'GitHub', placeholderUrl: 'https://github.com/handle', accent: '#E2E8F0' },
  { id: 'spotify', label: 'Spotify', placeholderUrl: 'https://open.spotify.com/user/...', accent: '#1DB954' },
  { id: 'soundcloud', label: 'SoundCloud', placeholderUrl: 'https://soundcloud.com/handle', accent: '#FF5500' },
  { id: 'steam', label: 'Steam', placeholderUrl: 'https://steamcommunity.com/id/...', accent: '#66C0F4' },
  { id: 'telegram', label: 'Telegram', placeholderUrl: 'https://t.me/handle', accent: '#26A5E4' },
  { id: 'kick', label: 'Kick', placeholderUrl: 'https://kick.com/handle', accent: '#53FC18' },
  { id: 'cashapp', label: 'Cash App', placeholderUrl: 'https://cash.app/$handle', accent: '#00D632' },
  { id: 'paypal', label: 'PayPal', placeholderUrl: 'https://paypal.me/handle', accent: '#0070BA' },
  { id: 'applemusic', label: 'Apple Music', placeholderUrl: 'https://music.apple.com/...', accent: '#FA243C' },
  { id: 'roblox', label: 'Roblox', placeholderUrl: 'https://www.roblox.com/users/...', accent: '#E2E8F0' },
  { id: 'linkedin', label: 'LinkedIn', placeholderUrl: 'https://linkedin.com/in/handle', accent: '#0A66C2' },
  { id: 'reddit', label: 'Reddit', placeholderUrl: 'https://reddit.com/u/handle', accent: '#FF4500' },
  { id: 'snapchat', label: 'Snapchat', placeholderUrl: 'https://snapchat.com/add/handle', accent: '#FFFC00' },
  { id: 'email', label: 'Email', placeholderUrl: 'mailto:hello@hightier.lol', accent: '#94A3B8' },
  { id: 'website', label: 'Website', placeholderUrl: 'https://hightier.lol', accent: '#E2E8F0' },
  { id: 'custom', label: 'Custom Logo', placeholderUrl: 'https://example.com', accent: '#94A3B8' },
];

export const PRESET_BACKGROUNDS = [
  {
    id: 'obsidian-glass',
    label: 'Obsidian Glass',
    url: backdropObsidianImg,
  },
  {
    id: 'brushed-titanium',
    label: 'Brushed Titanium',
    url: bannerMetalImg,
  },
  {
    id: 'pure-void',
    label: 'Pure Void',
    url: '',
  },
];

export const DEFAULT_AVATAR = avatarFounderImg;
export const DEFAULT_BANNER = bannerMetalImg;
export const DEFAULT_BACKDROP = backdropObsidianImg;

export const AUDIO_PRESETS = [
  { id: '', label: 'No Audio' },
  { id: 'synth:obsidian', label: 'Obsidian Drone (Built-in)' },
  { id: 'synth:midnight', label: 'Midnight Chord (Built-in)' },
  { id: 'synth:pulse', label: 'Subtle Pulse (Built-in)' },
];

export const SHOWCASE_PROFILE: Profile = {
  ownerUid: 'showcase-hightier',
  handle: 'hightier',
  displayName: 'hightier',
  bio: 'Digital architecture, sound design, and curated online identities. Building hightier.lol.',
  location: 'New York, NY',
  avatarUrl: DEFAULT_AVATAR,
  bannerUrl: DEFAULT_BANNER,
  backgroundUrl: DEFAULT_BACKDROP,
  accentColor: '#93C5FD',
  cardOpacity: 76,
  cardBlur: 18,
  enterGateEnabled: true,
  enterGateText: 'click to enter',
  audioUrl: 'synth:obsidian',
  audioTitle: 'Obsidian Drone',
  audioAutoplay: true,
  audioVolume: 50,
  effect: 'embers',
  linkLayout: 'both',
  badges: ['owner', 'staff', 'known', 'premium', 'donator', 'bug_hunter'],
  credits: 2500,
  lastDailyClaimAt: 0,
  unlockedFrames: ['solaris_gold'],
  equippedFrame: 'solaris_gold',
  links: [
    {
      id: 'lnk-1',
      platform: 'discord',
      title: 'Discord Server',
      subtitle: 'discord.gg/GP5JHNd6x',
      url: 'https://discord.gg/GP5JHNd6x',
      iconUrl: '',
      visible: true,
    },
    {
      id: 'lnk-2',
      platform: 'x',
      title: 'X / Twitter',
      subtitle: '@hightierlol',
      url: 'https://x.com',
      iconUrl: '',
      visible: true,
    },
    {
      id: 'lnk-3',
      platform: 'github',
      title: 'GitHub',
      subtitle: 'github.com/hightier',
      url: 'https://github.com',
      iconUrl: '',
      visible: true,
    },
    {
      id: 'lnk-4',
      platform: 'spotify',
      title: 'Night Rotation',
      subtitle: 'open.spotify.com',
      url: 'https://open.spotify.com',
      iconUrl: '',
      visible: true,
    },
    {
      id: 'lnk-5',
      platform: 'youtube',
      title: 'Visual Archive',
      subtitle: '@hightier',
      url: 'https://youtube.com',
      iconUrl: '',
      visible: true,
    },
  ],
  views: 14820,
  moderationStatus: 'active',
  moderationReason: '',
  suspendedUntil: 0,
  warningCount: 0,
  lastWarningAckAt: 0,
};
