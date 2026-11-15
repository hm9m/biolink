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
  | 'unban'
  | 'grant_credits';

export type CrateRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type CrateId = 'standard' | 'phantom' | 'sovereign';

export interface ProfileFrameDefinition {
  id: string;
  name: string;
  description: string;
  rarity: CrateRarity;
  primaryColor: string;
  secondaryColor: string;
  duplicateRefund: number;
  crateSources: CrateId[];
}

export interface CrateLootOption {
  id: string;
  type: 'frame' | 'credits';
  label: string;
  rarity: CrateRarity;
  oddsPercent: number;
  frameId?: string;
  creditsAmount?: number;
}

export interface CrateDefinition {
  id: CrateId;
  name: string;
  tagline: string;
  cost: number;
  accentColor: string;
  lootTable: CrateLootOption[];
}

export interface CrateRollRecord {
  id?: string;
  ownerUid: string;
  crateId: CrateId;
  cost: number;
  rewardType: 'frame' | 'duplicate_refund' | 'credits';
  rewardId: string;
  rewardLabel: string;
  rarity: CrateRarity;
  creditsDelta: number;
  createdAt?: Timestamp | null;
}

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
  audioAutoplay?: boolean;
  audioVolume?: number;
  effect: VisualEffect;
  linkLayout: LinkLayout;
  badges: string[];
  hiddenBadges?: string[];
  credits?: number;
  lastDailyClaimAt?: number;
  unlockedFrames?: string[];
  equippedFrame?: string;
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

export interface UserPrivateRecord {
  uid: string;
  email: string;
  displayName: string;
  recoveryId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}
