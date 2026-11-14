import type { Timestamp } from 'firebase/firestore';

export type PlatformId =
  | 'discord'
  | 'x'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'twitch'
  | 'github'
  | 'spotify'
  | 'soundcloud'
  | 'steam'
  | 'telegram'
  | 'kick'
  | 'cashapp'
  | 'paypal'
  | 'applemusic'
  | 'roblox'
  | 'linkedin'
  | 'reddit'
  | 'snapchat'
  | 'email'
  | 'website'
  | 'custom';

export type BadgeIconKey =
  | 'crown'
  | 'shield'
  | 'star'
  | 'gem'
  | 'heart'
  | 'bug'
  | 'bolt'
  | 'award';

export type VisualEffect = 'none' | 'snow' | 'embers' | 'grid';
export type LinkLayout = 'cards' | 'icons' | 'both';
export type ModerationStatus = 'active' | 'warned' | 'suspended' | 'banned';
export type ModerationAction =
  | 'add_badge'
  | 'remove_badge'
  | 'warn'
  | 'remove_warning'
  | 'clear_warnings'
  | 'suspend'
  | 'ban'
  | 'unban';

export interface BioLink {
  id: string;
  platform: PlatformId;
  title: string;
  url: string;
  subtitle: string;
  iconUrl: string;
  visible: boolean;
}

export interface Profile {
  ownerUid: string;
  handle: string;
  displayName: string;
  bio: string;
  location: string;
  avatarUrl: string;
  bannerUrl: string;
  backgroundUrl: string;
  accentColor: string;
  cardOpacity: number;
  cardBlur: number;
  enterGateEnabled: boolean;
  enterGateText: string;
  audioUrl: string;
  audioTitle: string;
  effect: VisualEffect;
  linkLayout: LinkLayout;
  badges: string[];
  hiddenBadges?: string[];
  links: BioLink[];
  views: number;
  moderationStatus: ModerationStatus;
  moderationReason: string;
  suspendedUntil: number;
  warningCount: number;
  lastWarningAckAt: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  iconKey: BadgeIconKey;
  isSystem: boolean;
  createdAt?: Timestamp | null;
}

export interface ModerationLog {
  id?: string;
  targetUid: string;
  targetHandle: string;
  action: ModerationAction;
  reason: string;
  details: string;
  moderatorUid: string;
  createdAt?: Timestamp | null;
}
