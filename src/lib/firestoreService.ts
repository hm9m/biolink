import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { isEmailAdmin } from '@/src/lib/admins';
import {
  CORE_BADGES,
  DEFAULT_AVATAR,
  DEFAULT_BACKDROP,
  DEFAULT_BANNER,
  HANDLE_REGEX,
  HEX_COLOR_REGEX,
  RESERVED_HANDLES,
} from '@/src/lib/constants';
import { PROFILE_IMAGE_CHAR_LIMITS } from '@/src/lib/imageUpload';
import {
  DAILY_CLAIM_AMOUNT,
  DAILY_CLAIM_COOLDOWN_MS,
  getCrateById,
  getFrameById,
  rollCrateLoot,
  STARTER_CREDITS,
} from '@/src/lib/crates';
import { parseYouTubeVideoId, toYouTubeAudioSource } from '@/src/lib/youtube';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import type {
  BadgeDefinition,
  BadgeIconKey,
  BioLink,
  CrateId,
  CrateLootOption,
  CrateRollRecord,
  ModerationAction,
  ModerationLog,
  Profile,
  UserPrivateRecord,
} from '@/src/types/comboss';

const RECOVERY_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRecoveryId(): string {
  const bytes = new Uint8Array(12);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const chars = Array.from(bytes, (b) => RECOVERY_CHARSET[b % RECOVERY_CHARSET.length]).join('');
  return `HT-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

function clampStr(val: string, max: number): string {
  return (val || '').trim().slice(0, max);
}

export function sanitizeHandle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
}

export function isHandleValid(handle: string): boolean {
  return HANDLE_REGEX.test(handle) && !RESERVED_HANDLES.includes(handle);
}

export function sanitizeUrl(url: string, fallback = ''): string {
  const trimmed = (url || '').trim().slice(0, 500);
  if (!trimmed) return fallback;
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/src/assets/') ||
    trimmed.startsWith('synth:')
  ) {
    return trimmed;
  }
  return `https://${trimmed}`.slice(0, 500);
}

export function sanitizeImageSource(src: string, maxLen: number, fallback = ''): string {
  const trimmed = (src || '').trim();
  if (!trimmed) return fallback;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    if (trimmed.length <= maxLen) return trimmed;
    throw new Error('One of the uploaded images exceeds the size limit. Please replace or re-upload it.');
  }
  if (
    (trimmed.startsWith('https://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('/src/assets/') ||
      trimmed.startsWith('/assets/')) &&
    trimmed.length <= 500
  ) {
    return trimmed;
  }
  return fallback;
}

export function sanitizeLinks(links: BioLink[]): BioLink[] {
  return links.slice(0, 25).map((link, idx) => ({
    id: clampStr(link.id || `lnk-${idx + 1}`, 40) || `lnk-${idx + 1}`,
    platform: link.platform || 'website',
    title: clampStr(link.title || 'Link', 48) || 'Link',
    url: sanitizeUrl(link.url, 'https://hightier.lol'),
    subtitle: clampStr(link.subtitle || '', 64),
    iconUrl: link.iconUrl
      ? sanitizeImageSource(link.iconUrl, PROFILE_IMAGE_CHAR_LIMITS.icon, '')
      : '',
    visible: link.visible !== false,
  }));
}

export async function syncPrivateUser(user: User): Promise<void> {
  const path = `usersPrivate/${user.uid}`;
  const ref = doc(db, 'usersPrivate', user.uid);
  try {
    const snap = await getDoc(ref);
    const email = clampStr(user.email || 'user@hightier.lol', 160);
    const displayName = clampStr(user.displayName || email.split('@')[0] || 'Creator', 80);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email,
        displayName,
        recoveryId: generateRecoveryId(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = snap.data() as Partial<UserPrivateRecord>;
      const patch: Record<string, unknown> = {
        email,
        displayName,
        updatedAt: serverTimestamp(),
      };
      if (typeof existingData.recoveryId !== 'string' || !existingData.recoveryId) {
        patch.recoveryId = generateRecoveryId();
      }
      await updateDoc(ref, patch);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeOwnPrivateUser(
  uid: string,
  onData: (record: UserPrivateRecord | null) => void
): Unsubscribe {
  const path = `usersPrivate/${uid}`;
  return onSnapshot(
    doc(db, 'usersPrivate', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserPrivateRecord) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeAllUsersPrivateAdmin(
  onData: (recordsByUid: Record<string, UserPrivateRecord>) => void
): Unsubscribe {
  const path = 'usersPrivate';
  const q = query(collection(db, 'usersPrivate'), where('uid', '>=', ''), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, UserPrivateRecord> = {};
      for (const d of snap.docs) {
        const rec = d.data() as UserPrivateRecord;
        map[rec.uid || d.id] = rec;
      }
      onData(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function checkIsAdmin(user: User | null): boolean {
  if (!user || !user.emailVerified) {
    return false;
  }
  return isEmailAdmin(user.email);
}

export async function isHandleAvailable(handle: string): Promise<boolean> {
  const clean = sanitizeHandle(handle);
  if (!isHandleValid(clean)) return false;
  const path = `handles/${clean}`;
  try {
    const snap = await getDoc(doc(db, 'handles', clean));
    return !snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const clean = sanitizeHandle(handle);
  if (!isHandleValid(clean)) return null;
  const handlePath = `handles/${clean}`;
  try {
    const handleSnap = await getDoc(doc(db, 'handles', clean));
    if (!handleSnap.exists()) return null;
    const { ownerUid } = handleSnap.data() as { ownerUid: string };
    const profileSnap = await getDoc(doc(db, 'profiles', ownerUid));
    if (!profileSnap.exists()) return null;
    return profileSnap.data() as Profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, handlePath);
  }
}

export async function getProfileByUid(uid: string): Promise<Profile | null> {
  const path = `profiles/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'profiles', uid));
    return snap.exists() ? (snap.data() as Profile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createProfile(user: User, requestedHandle: string): Promise<Profile> {
  const handle = sanitizeHandle(requestedHandle);
  if (!isHandleValid(handle)) {
    throw new Error('Handle must be 2–24 lowercase letters, numbers, underscores, or hyphens.');
  }
  const available = await isHandleAvailable(handle);
  if (!available) {
    throw new Error(`Handle @${handle} is already claimed.`);
  }

  const displayName = clampStr(user.displayName || handle, 48) || handle;
  const batch = writeBatch(db);
  const handleRef = doc(db, 'handles', handle);
  const profileRef = doc(db, 'profiles', user.uid);

  const payload = {
    ownerUid: user.uid,
    handle,
    displayName,
    bio: 'Building on hightier.lol.',
    location: '',
    avatarUrl: clampStr(user.photoURL || DEFAULT_AVATAR, 500) || DEFAULT_AVATAR,
    bannerUrl: DEFAULT_BANNER,
    backgroundUrl: DEFAULT_BACKDROP,
    accentColor: '#93C5FD',
    cardOpacity: 78,
    cardBlur: 18,
    enterGateEnabled: true,
    enterGateText: 'click to enter',
    audioUrl: 'synth:obsidian',
    audioTitle: 'Obsidian Drone',
    audioAutoplay: true,
    audioVolume: 50,
    effect: 'none' as const,
    linkLayout: 'cards' as const,
    badges: [] as string[],
    hiddenBadges: [] as string[],
    credits: STARTER_CREDITS,
    lastDailyClaimAt: 0,
    unlockedFrames: [] as string[],
    equippedFrame: '',
    links: [
      {
        id: 'lnk-1',
        platform: 'website' as const,
        title: 'My hightier.lol Page',
        url: 'https://hightier.lol',
        subtitle: `@${handle}`,
        iconUrl: '',
        visible: true,
      },
    ],
    views: 0,
    moderationStatus: 'active' as const,
    moderationReason: '',
    suspendedUntil: 0,
    warningCount: 0,
    lastWarningAckAt: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(handleRef, {
    handle,
    ownerUid: user.uid,
    createdAt: serverTimestamp(),
  });
  batch.set(profileRef, payload);

  try {
    await batch.commit();
    const created = await getProfileByUid(user.uid);
    return created || (payload as unknown as Profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `profiles/${user.uid}`);
  }
}

export async function updateOwnProfile(
  uid: string,
  previousHandle: string,
  updates: {
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
    audioAutoplay: boolean;
    audioVolume: number;
    effect: Profile['effect'];
    linkLayout: Profile['linkLayout'];
    hiddenBadges: string[];
    equippedFrame?: string;
    links: BioLink[];
  }
): Promise<void> {
  const newHandle = sanitizeHandle(updates.handle);
  if (!isHandleValid(newHandle)) {
    throw new Error('Handle must be 2–24 lowercase characters (a-z, 0-9, _, -).');
  }

  const batch = writeBatch(db);
  if (newHandle !== previousHandle) {
    const avail = await isHandleAvailable(newHandle);
    if (!avail) {
      throw new Error(`Handle @${newHandle} is already taken.`);
    }
    batch.delete(doc(db, 'handles', previousHandle));
    batch.set(doc(db, 'handles', newHandle), {
      handle: newHandle,
      ownerUid: uid,
      createdAt: serverTimestamp(),
    });
  }

  const accent = HEX_COLOR_REGEX.test(updates.accentColor) ? updates.accentColor : '#93C5FD';
  const cleanHiddenBadges = Array.from(
    new Set(updates.hiddenBadges.map((b) => clampStr(b, 32)).filter(Boolean))
  ).slice(0, 12);

  const cleanAvatar = sanitizeImageSource(
    updates.avatarUrl,
    PROFILE_IMAGE_CHAR_LIMITS.avatar,
    ''
  );
  const cleanBanner = sanitizeImageSource(
    updates.bannerUrl,
    PROFILE_IMAGE_CHAR_LIMITS.banner,
    ''
  );
  const cleanBackdrop = sanitizeImageSource(
    updates.backgroundUrl,
    PROFILE_IMAGE_CHAR_LIMITS.backdrop,
    ''
  );
  const cleanLinks = sanitizeLinks(updates.links);

  const approxPayloadBytes =
    cleanAvatar.length +
    cleanBanner.length +
    cleanBackdrop.length +
    cleanLinks.reduce((sum, l) => sum + (l.iconUrl?.length || 0) + l.title.length + l.url.length, 0);

  if (approxPayloadBytes > 920000) {
    throw new Error(
      'Total uploaded media exceeds profile storage capacity. Remove or shrink a link logo or backdrop.'
    );
  }

  const rawAudio = clampStr(updates.audioUrl, 500);
  const ytId = rawAudio.startsWith('youtube:') ? parseYouTubeVideoId(rawAudio) : null;
  const cleanAudioUrl = ytId ? toYouTubeAudioSource(ytId) : rawAudio;

  const updatePayload: Record<string, unknown> = {
    handle: newHandle,
    displayName: clampStr(updates.displayName, 48) || newHandle,
    bio: clampStr(updates.bio, 320),
    location: clampStr(updates.location, 48),
    avatarUrl: cleanAvatar,
    bannerUrl: cleanBanner,
    backgroundUrl: cleanBackdrop,
    accentColor: accent,
    cardOpacity: Math.min(100, Math.max(10, Math.round(updates.cardOpacity))),
    cardBlur: Math.min(24, Math.max(0, Math.round(updates.cardBlur))),
    enterGateEnabled: Boolean(updates.enterGateEnabled),
    enterGateText: clampStr(updates.enterGateText, 64),
    audioUrl: cleanAudioUrl,
    audioTitle: clampStr(updates.audioTitle, 64),
    audioAutoplay: Boolean(updates.audioAutoplay),
    audioVolume: Math.min(100, Math.max(0, Math.round(updates.audioVolume))),
    effect: updates.effect,
    linkLayout: updates.linkLayout,
    hiddenBadges: cleanHiddenBadges,
    links: cleanLinks,
    updatedAt: serverTimestamp(),
  };

  if (typeof updates.equippedFrame === 'string') {
    updatePayload.equippedFrame = clampStr(updates.equippedFrame, 32);
  }

  batch.update(doc(db, 'profiles', uid), updatePayload);

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${uid}`);
  }
}

export async function acknowledgeWarning(
  uid: string,
  currentStatus: Profile['moderationStatus'],
  currentReason: string
): Promise<void> {
  const path = `profiles/${uid}`;
  try {
    await updateDoc(doc(db, 'profiles', uid), {
      lastWarningAckAt: Date.now(),
      moderationStatus: currentStatus === 'warned' ? 'active' : currentStatus,
      moderationReason: currentStatus === 'warned' ? '' : currentReason,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function incrementProfileView(targetUid: string, currentViews: number): Promise<void> {
  const path = `profiles/${targetUid}`;
  try {
    await updateDoc(doc(db, 'profiles', targetUid), {
      views: Math.max(0, Math.floor(currentViews)) + 1,
    });
  } catch {
    // Silent fallback if unauthenticated or concurrent race
  }
}

export function subscribePublicDirectory(
  onData: (profiles: Profile[]) => void
): Unsubscribe {
  const path = 'profiles';
  const q = query(
    collection(db, 'profiles'),
    where('moderationStatus', 'in', ['active', 'warned']),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as Profile)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 24);
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAllProfilesAdmin(
  onData: (profiles: Profile[]) => void
): Unsubscribe {
  const path = 'profiles';
  const q = query(
    collection(db, 'profiles'),
    where('moderationStatus', 'in', ['active', 'warned', 'suspended', 'banned']),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as Profile)
        .sort((a, b) => (b.views || 0) - (a.views || 0));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeBadges(onData: (badges: BadgeDefinition[]) => void): Unsubscribe {
  const path = 'badges';
  const q = query(collection(db, 'badges'), where('isSystem', 'in', [true, false]));
  return onSnapshot(
    q,
    (snap) => {
      const custom = snap.docs.map((d) => d.data() as BadgeDefinition);
      const map = new Map<string, BadgeDefinition>();
      for (const b of CORE_BADGES) map.set(b.id, b);
      for (const b of custom) map.set(b.id, b);
      onData(Array.from(map.values()));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createCustomBadge(badge: {
  id: string;
  name: string;
  description: string;
  color: string;
  iconKey: BadgeIconKey;
}): Promise<void> {
  const cleanId = sanitizeHandle(badge.id);
  if (!isHandleValid(cleanId)) {
    throw new Error('Badge ID must be 2–24 lowercase characters (a-z, 0-9, _, -).');
  }
  const path = `badges/${cleanId}`;
  try {
    await setDoc(doc(db, 'badges', cleanId), {
      id: cleanId,
      name: clampStr(badge.name, 32),
      description: clampStr(badge.description, 160),
      color: HEX_COLOR_REGEX.test(badge.color) ? badge.color : '#93C5FD',
      iconKey: badge.iconKey,
      isSystem: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCustomBadge(badgeId: string): Promise<void> {
  const path = `badges/${badgeId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'badges', badgeId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminToggleBadge(
  moderatorUid: string,
  target: Profile,
  badgeId: string
): Promise<void> {
  const hasBadge = target.badges.includes(badgeId);
  const nextBadges = hasBadge
    ? target.badges.filter((b) => b !== badgeId)
    : [...target.badges, badgeId].slice(0, 12);

  const action: ModerationAction = hasBadge ? 'remove_badge' : 'add_badge';
  const batch = writeBatch(db);

  batch.update(doc(db, 'profiles', target.ownerUid), {
    badges: nextBadges,
    updatedAt: serverTimestamp(),
  });

  const logRef = doc(collection(db, 'moderationLogs'));
  batch.set(logRef, {
    targetUid: target.ownerUid,
    targetHandle: target.handle,
    action,
    reason: hasBadge ? `Removed badge ${badgeId}` : `Granted badge ${badgeId}`,
    details: badgeId,
    moderatorUid,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `profiles/${target.ownerUid}`);
  }
}

export async function adminCreateAndAssignCustomBadge(
  moderatorUid: string,
  target: Profile,
  badge: {
    id?: string;
    name: string;
    description: string;
    color: string;
    iconKey: BadgeIconKey;
  }
): Promise<string> {
  const cleanId = sanitizeHandle(badge.id || badge.name);
  if (!isHandleValid(cleanId)) {
    throw new Error('Badge ID/name must produce 2–24 lowercase characters (a-z, 0-9, _, -).');
  }

  const batch = writeBatch(db);
  const existingBadge = await getDoc(doc(db, 'badges', cleanId));
  if (!existingBadge.exists()) {
    batch.set(doc(db, 'badges', cleanId), {
      id: cleanId,
      name: clampStr(badge.name, 32) || cleanId,
      description: clampStr(badge.description, 160) || `Custom badge: ${badge.name}`,
      color: HEX_COLOR_REGEX.test(badge.color) ? badge.color : '#38BDF8',
      iconKey: badge.iconKey,
      isSystem: false,
      createdAt: serverTimestamp(),
    });
  }

  const nextBadges = target.badges.includes(cleanId)
    ? target.badges
    : [...target.badges, cleanId].slice(0, 12);

  batch.update(doc(db, 'profiles', target.ownerUid), {
    badges: nextBadges,
    updatedAt: serverTimestamp(),
  });

  const logRef = doc(collection(db, 'moderationLogs'));
  batch.set(logRef, {
    targetUid: target.ownerUid,
    targetHandle: target.handle,
    action: 'add_badge',
    reason: `Granted custom badge ${cleanId}`,
    details: cleanId,
    moderatorUid,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return cleanId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `profiles/${target.ownerUid}`);
  }
}

export async function adminModerateProfile(params: {
  moderatorUid: string;
  target: Profile;
  action: 'warn' | 'remove_warning' | 'clear_warnings' | 'suspend' | 'ban' | 'unban';
  reason: string;
  durationHours?: number;
}): Promise<void> {
  const { moderatorUid, target, action, reason, durationHours = 24 } = params;
  const cleanReason = clampStr(reason, 300) || `Administrative ${action}`;
  const batch = writeBatch(db);

  let nextStatus = target.moderationStatus;
  let nextSuspendedUntil = target.suspendedUntil;
  let nextWarningCount = target.warningCount;
  let nextReason = action === 'unban' ? '' : cleanReason;
  let details = '';

  if (action === 'warn') {
    nextStatus = target.moderationStatus === 'banned' ? 'banned' : 'warned';
    nextWarningCount = target.warningCount + 1;
    details = `Warning #${nextWarningCount}`;
  } else if (action === 'remove_warning') {
    nextWarningCount = Math.max(0, target.warningCount - 1);
    if (target.moderationStatus === 'warned' && nextWarningCount === 0) {
      nextStatus = 'active';
      nextReason = '';
    } else if (target.moderationStatus !== 'warned') {
      nextReason = target.moderationReason;
    }
    details = `Remaining warnings: ${nextWarningCount}`;
  } else if (action === 'clear_warnings') {
    nextWarningCount = 0;
    if (target.moderationStatus === 'warned') {
      nextStatus = 'active';
      nextReason = '';
    } else {
      nextReason = target.moderationReason;
    }
    details = 'Cleared all warnings';
  } else if (action === 'suspend') {
    nextStatus = 'suspended';
    nextSuspendedUntil = Date.now() + Math.max(1, durationHours) * 3600 * 1000;
    details = `${durationHours}h suspension`;
  } else if (action === 'ban') {
    nextStatus = 'banned';
    nextSuspendedUntil = 0;
    details = 'Permanent ban';
  } else if (action === 'unban') {
    nextStatus = 'active';
    nextSuspendedUntil = 0;
    details = 'Restored to active';
  }

  batch.update(doc(db, 'profiles', target.ownerUid), {
    moderationStatus: nextStatus,
    moderationReason: nextReason,
    suspendedUntil: nextSuspendedUntil,
    warningCount: nextWarningCount,
    updatedAt: serverTimestamp(),
  });

  const logRef = doc(collection(db, 'moderationLogs'));
  batch.set(logRef, {
    targetUid: target.ownerUid,
    targetHandle: target.handle,
    action,
    reason: cleanReason,
    details,
    moderatorUid,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `profiles/${target.ownerUid}`);
  }
}

export function subscribeModerationLogs(onData: (logs: ModerationLog[]) => void): Unsubscribe {
  const path = 'moderationLogs';
  const q = query(collection(db, 'moderationLogs'), orderBy('createdAt', 'desc'), limit(60));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ModerationLog, 'id'>),
      }));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function initializeStarterCredits(uid: string): Promise<void> {
  const path = `profiles/${uid}`;
  try {
    await updateDoc(doc(db, 'profiles', uid), {
      credits: STARTER_CREDITS,
      lastDailyClaimAt: 0,
      unlockedFrames: [],
      equippedFrame: '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function claimDailyCredits(profile: Profile): Promise<number> {
  const lastClaim = profile.lastDailyClaimAt || 0;
  const now = Date.now();
  if (lastClaim > 0 && now - lastClaim < DAILY_CLAIM_COOLDOWN_MS) {
    throw new Error('Daily credit drop is still on cooldown.');
  }

  const currentCredits = profile.credits ?? 0;
  const nextCredits = currentCredits + DAILY_CLAIM_AMOUNT;
  const path = `profiles/${profile.ownerUid}`;

  try {
    await updateDoc(doc(db, 'profiles', profile.ownerUid), {
      credits: nextCredits,
      lastDailyClaimAt: now,
      updatedAt: serverTimestamp(),
    });
    return nextCredits;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function equipProfileFrame(uid: string, frameId: string): Promise<void> {
  const cleanFrame = clampStr(frameId, 32);
  const path = `profiles/${uid}`;
  try {
    await updateDoc(doc(db, 'profiles', uid), {
      equippedFrame: cleanFrame,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export interface CrateOpenResult {
  crateId: CrateId;
  loot: CrateLootOption;
  rewardType: 'frame' | 'duplicate_refund' | 'credits';
  rewardLabel: string;
  creditsDelta: number;
  nextCredits: number;
  nextUnlockedFrames: string[];
  unlockedNewFrameId: string | null;
}

export async function openCrateGamble(
  profile: Profile,
  crateId: CrateId
): Promise<CrateOpenResult> {
  const crate = getCrateById(crateId);
  const currentCredits = profile.credits ?? 0;
  if (currentCredits < crate.cost) {
    throw new Error(`You need ${crate.cost} credits to open ${crate.name}.`);
  }

  const existingFrames = Array.isArray(profile.unlockedFrames) ? profile.unlockedFrames : [];
  const loot = rollCrateLoot(crate);

  let rewardType: CrateOpenResult['rewardType'] = 'credits';
  let rewardLabel = loot.label;
  let rewardId = loot.id;
  let creditsEarned = 0;
  let nextFrames = existingFrames;
  let unlockedNewFrameId: string | null = null;

  if (loot.type === 'credits') {
    rewardType = 'credits';
    creditsEarned = loot.creditsAmount || 0;
  } else if (loot.type === 'frame' && loot.frameId) {
    const frameDef = getFrameById(loot.frameId);
    if (existingFrames.includes(loot.frameId)) {
      rewardType = 'duplicate_refund';
      creditsEarned = frameDef?.duplicateRefund || Math.round(crate.cost * 0.6);
      rewardLabel = `${frameDef?.name || loot.label} (Duplicate +${creditsEarned} cr)`;
      rewardId = loot.frameId;
    } else {
      rewardType = 'frame';
      nextFrames = [...existingFrames, loot.frameId];
      unlockedNewFrameId = loot.frameId;
      rewardLabel = frameDef?.name || loot.label;
      rewardId = loot.frameId;
    }
  }

  const creditsDelta = Math.round(creditsEarned - crate.cost);
  const nextCredits = Math.max(0, Math.round(currentCredits) + creditsDelta);

  const profilePath = `profiles/${profile.ownerUid}`;
  try {
    await updateDoc(doc(db, 'profiles', profile.ownerUid), {
      credits: nextCredits,
      unlockedFrames: nextFrames,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, profilePath);
  }

  const rollRef = doc(collection(db, 'crateRolls'));
  try {
    await setDoc(rollRef, {
      ownerUid: profile.ownerUid,
      crateId: crate.id,
      cost: crate.cost,
      rewardType,
      rewardId: clampStr(rewardId, 48),
      rewardLabel: clampStr(rewardLabel, 64),
      rarity: loot.rarity,
      creditsDelta,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `crateRolls/${rollRef.id}`);
  }

  return {
    crateId: crate.id,
    loot,
    rewardType,
    rewardLabel,
    creditsDelta,
    nextCredits,
    nextUnlockedFrames: nextFrames,
    unlockedNewFrameId,
  };
}

export function subscribeUserCrateRolls(
  uid: string,
  onData: (rolls: CrateRollRecord[]) => void
): Unsubscribe {
  const path = 'crateRolls';
  const q = query(
    collection(db, 'crateRolls'),
    where('ownerUid', '==', uid),
    limit(40)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CrateRollRecord, 'id'>),
        }))
        .sort((a, b) => {
          const at = a.createdAt?.toMillis?.() ?? 0;
          const bt = b.createdAt?.toMillis?.() ?? 0;
          return bt - at;
        })
        .slice(0, 15);
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function adminGrantCredits(
  moderatorUid: string,
  target: Profile,
  amount: number,
  reason: string
): Promise<void> {
  const cleanAmount = Math.round(amount);
  if (!Number.isFinite(cleanAmount) || cleanAmount === 0) {
    throw new Error('Enter a non-zero credit amount.');
  }
  const currentCredits = target.credits ?? 0;
  const nextCredits = Math.min(10000000, Math.max(0, currentCredits + cleanAmount));
  const cleanReason =
    clampStr(reason, 300) ||
    `${cleanAmount > 0 ? 'Granted' : 'Adjusted'} ${Math.abs(cleanAmount)} credits`;

  const batch = writeBatch(db);
  const profilePatch: Record<string, unknown> = {
    credits: nextCredits,
    updatedAt: serverTimestamp(),
  };
  if (target.lastDailyClaimAt === undefined) {
    profilePatch.lastDailyClaimAt = 0;
  }
  if (!Array.isArray(target.unlockedFrames)) {
    profilePatch.unlockedFrames = [];
  }
  if (typeof target.equippedFrame !== 'string') {
    profilePatch.equippedFrame = '';
  }

  batch.update(doc(db, 'profiles', target.ownerUid), profilePatch);

  const logRef = doc(collection(db, 'moderationLogs'));
  batch.set(logRef, {
    targetUid: target.ownerUid,
    targetHandle: target.handle,
    action: 'grant_credits',
    reason: cleanReason,
    details: `${cleanAmount > 0 ? '+' : ''}${cleanAmount} cr (Balance: ${nextCredits})`,
    moderatorUid,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `profiles/${target.ownerUid}`);
  }
}
