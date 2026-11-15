import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Ban,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { BioCard } from '@/src/components/BioCard';
import { BadgeGlyph, PlatformLogo, ResilientImage } from '@/src/components/BrandIcons';
import { CratesTab } from '@/src/components/CratesTab';
import { ImageUploadField } from '@/src/components/ImageUploadField';
import {
  AUDIO_PRESETS,
  PLATFORM_OPTIONS,
  PRESET_BACKGROUNDS,
} from '@/src/lib/constants';
import { processImageUpload } from '@/src/lib/imageUpload';
import { parseYouTubeVideoId, toYouTubeAudioSource } from '@/src/lib/youtube';
import {
  acknowledgeWarning,
  adminModerateProfile,
  createProfile,
  isHandleAvailable,
  isHandleValid,
  sanitizeHandle,
  subscribeOwnPrivateUser,
  updateOwnProfile,
} from '@/src/lib/firestoreService';
import type {
  BadgeDefinition,
  BioLink,
  LinkLayout,
  PlatformId,
  Profile,
  UserPrivateRecord,
  VisualEffect,
} from '@/src/types/comboss';
import type { User } from 'firebase/auth';

interface DashboardViewProps {
  user: User;
  profile: Profile | null;
  isAdmin?: boolean;
  badgeCatalog: BadgeDefinition[];
  pendingClaimHandle: string;
  onProfileCreated: (profile: Profile) => void;
  onOpenBio: (handle: string) => void;
}

type StudioTab = 'profile' | 'links' | 'appearance' | 'badges' | 'crates' | 'settings';

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  profile,
  isAdmin = false,
  badgeCatalog,
  pendingClaimHandle,
  onProfileCreated,
  onOpenBio,
}) => {
  // Onboarding state when user has no profile yet
  const [claimHandle, setClaimHandle] = useState(
    pendingClaimHandle || sanitizeHandle(user.email?.split('@')[0] || '')
  );
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);

  // Studio tabs & form state
  const [activeTab, setActiveTab] = useState<StudioTab>('profile');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#93C5FD');
  const [cardOpacity, setCardOpacity] = useState(78);
  const [cardBlur, setCardBlur] = useState(18);
  const [enterGateEnabled, setEnterGateEnabled] = useState(true);
  const [enterGateText, setEnterGateText] = useState('click to enter');
  const [audioUrl, setAudioUrl] = useState('synth:obsidian');
  const [audioTitle, setAudioTitle] = useState('Obsidian Drone');
  const [audioAutoplay, setAudioAutoplay] = useState(true);
  const [audioVolume, setAudioVolume] = useState(50);
  const [audioMode, setAudioMode] = useState<'preset' | 'youtube' | 'mp3'>('preset');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [effect, setEffect] = useState<VisualEffect>('none');
  const [linkLayout, setLinkLayout] = useState<LinkLayout>('cards');
  const [hiddenBadges, setHiddenBadges] = useState<string[]>([]);
  const [equippedFrame, setEquippedFrame] = useState('');
  const [links, setLinks] = useState<BioLink[]>([]);

  // New link composer state
  const [newPlatform, setNewPlatform] = useState<PlatformId>('discord');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newIconUrl, setNewIconUrl] = useState('');

  // Status feedback
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);
  const [ackBusy, setAckBusy] = useState(false);
  const [privateUser, setPrivateUser] = useState<UserPrivateRecord | null>(null);
  const [hideRecoveryId, setHideRecoveryId] = useState(false);
  const [copiedRecoveryId, setCopiedRecoveryId] = useState(false);

  useEffect(() => {
    const unsub = subscribeOwnPrivateUser(user.uid, setPrivateUser);
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    if (!profile) return;
    setHandle(profile.handle);
    setDisplayName(profile.displayName);
    setBio(profile.bio);
    setLocation(profile.location);
    setAvatarUrl(profile.avatarUrl);
    setBannerUrl(profile.bannerUrl);
    setBackgroundUrl(profile.backgroundUrl);
    setAccentColor(profile.accentColor || '#93C5FD');
    setCardOpacity(profile.cardOpacity ?? 78);
    setCardBlur(profile.cardBlur ?? 18);
    setEnterGateEnabled(profile.enterGateEnabled);
    setEnterGateText(profile.enterGateText || 'click to enter');
    const loadedAudio = profile.audioUrl || '';
    setAudioUrl(loadedAudio);
    setAudioTitle(profile.audioTitle || '');
    setAudioAutoplay(profile.audioAutoplay ?? true);
    setAudioVolume(profile.audioVolume ?? 50);
    if (loadedAudio.startsWith('youtube:')) {
      setAudioMode('youtube');
      setYoutubeInput(loadedAudio.slice('youtube:'.length));
    } else if (AUDIO_PRESETS.some((p) => p.id === loadedAudio)) {
      setAudioMode('preset');
      setYoutubeInput('');
    } else {
      setAudioMode('mp3');
      setYoutubeInput('');
    }
    setEffect(profile.effect || 'none');
    setLinkLayout(profile.linkLayout || 'cards');
    setHiddenBadges(profile.hiddenBadges || []);
    setEquippedFrame(profile.equippedFrame || '');
    setLinks(profile.links || []);
  }, [profile]);

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError('');
    const clean = sanitizeHandle(claimHandle);
    if (!isHandleValid(clean)) {
      setClaimError('Handle must be 2–24 lowercase characters (a-z, 0-9, _, -).');
      return;
    }
    setClaiming(true);
    try {
      const avail = await isHandleAvailable(clean);
      if (!avail) {
        setClaimError(`Handle @${clean} is already taken.`);
        setClaiming(false);
        return;
      }
      const created = await createProfile(user, clean);
      onProfileCreated(created);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Unable to create profile.');
    } finally {
      setClaiming(false);
    }
  };

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20">
        <div className="rounded-xl border border-white/12 bg-[#0B0D12] p-8">
          <h1 className="font-display text-2xl font-semibold text-white">
            Claim your hightier.lol handle
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Choose a unique URL handle for your bio profile. You can update it later from your
            studio.
          </p>

          <form onSubmit={(e) => void handleClaimSubmit(e)} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300" htmlFor="claim-handle">
                Profile URL
              </label>
              <div className="mt-1.5 flex items-center rounded-lg border border-white/15 bg-[#07080A] px-3.5 py-2.5 focus-within:border-white/40">
                <span className="font-mono text-sm text-zinc-500">hightier.lol/</span>
                <input
                  id="claim-handle"
                  type="text"
                  value={claimHandle}
                  onChange={(e) => setClaimHandle(sanitizeHandle(e.target.value))}
                  placeholder="yourname"
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            {claimError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {claimError}
              </p>
            )}

            <button
              type="submit"
              disabled={claiming}
              className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#07080A] transition-colors hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
            >
              {claiming ? 'Creating Profile...' : 'Create Bio Profile'}
            </button>
          </form>

          {privateUser?.recoveryId && (
            <div className="mt-6 rounded-lg border border-white/10 bg-[#07080A] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                  <KeyRound size={13} className="text-zinc-400" />
                  Your Recovery ID
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(privateUser.recoveryId).then(() => {
                      setCopiedRecoveryId(true);
                      window.setTimeout(() => setCopiedRecoveryId(false), 2000);
                    });
                  }}
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  {copiedRecoveryId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copiedRecoveryId ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="mt-1.5 font-mono text-sm font-semibold tracking-wider text-white">
                {privateUser.recoveryId}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Save this ID — you can also view it anytime in Dashboard Settings.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const now = Date.now();
  const isBanned = profile.moderationStatus === 'banned';
  const isSuspended =
    profile.moderationStatus === 'suspended' &&
    (profile.suspendedUntil === 0 || profile.suspendedUntil > now);
  const isLocked = isBanned || isSuspended;
  const hasUnackWarning =
    profile.moderationStatus === 'warned' ||
    (profile.warningCount > 0 && profile.lastWarningAckAt === 0);

  const previewProfile: Profile = {
    ...profile,
    handle: sanitizeHandle(handle) || profile.handle,
    displayName: displayName || profile.displayName,
    bio,
    location,
    avatarUrl,
    bannerUrl,
    backgroundUrl,
    accentColor,
    cardOpacity,
    cardBlur,
    enterGateEnabled,
    enterGateText,
    audioUrl,
    audioTitle,
    audioAutoplay,
    audioVolume,
    effect,
    linkLayout,
    hiddenBadges,
    equippedFrame,
    links,
  };

  const handleSave = async () => {
    if (isLocked) return;
    if (audioMode === 'youtube' && !parseYouTubeVideoId(audioUrl)) {
      setSaveError('Please enter a valid YouTube video URL or 11-character video ID.');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    try {
      await updateOwnProfile(user.uid, profile.handle, {
        handle,
        displayName,
        bio,
        location,
        avatarUrl,
        bannerUrl,
        backgroundUrl,
        accentColor,
        cardOpacity,
        cardBlur,
        enterGateEnabled,
        enterGateText,
        audioUrl,
        audioTitle,
        audioAutoplay,
        audioVolume,
        effect,
        linkLayout,
        hiddenBadges,
        equippedFrame: Array.isArray(profile.unlockedFrames) ? equippedFrame : '',
        links,
      });
      setSaveMessage('Changes published.');
      window.setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || links.length >= 25) return;
    const platInfo = PLATFORM_OPTIONS.find((p) => p.id === newPlatform);
    const created: BioLink = {
      id: `lnk-${Date.now().toString(36)}`,
      platform: newPlatform,
      title: newTitle.trim() || platInfo?.label || 'Link',
      url: newUrl.trim(),
      subtitle: newSubtitle.trim(),
      iconUrl: newIconUrl.trim(),
      visible: true,
    };
    setLinks([...links, created]);
    setNewTitle('');
    setNewUrl('');
    setNewSubtitle('');
    setNewIconUrl('');
  };

  const moveLink = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= links.length) return;
    const copy = [...links];
    const [item] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, item);
    setLinks(copy);
  };

  const toggleLinkVisible = (id: string) => {
    setLinks(links.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  };

  const removeLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  const handleExistingLinkLogoUpload = async (id: string, file: File | undefined) => {
    if (!file || isLocked) return;
    setSaveError('');
    try {
      const optimized = await processImageUpload(file, 'icon');
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, iconUrl: optimized } : l)));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to upload link logo.');
    }
  };

  const clearExistingLinkLogo = (id: string) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, iconUrl: '' } : l)));
  };

  const handleCopyUrl = async () => {
    const url = `${window.location.origin}/${profile.handle}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10">
      {/* Moderation Notices */}
      {isLocked && (
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            {isBanned ? <Ban size={18} className="mt-0.5 shrink-0 text-red-400" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />}
            <div>
              <div className="font-semibold text-white">
                {isBanned ? 'Your profile is banned' : 'Your profile is suspended'}
              </div>
              <p className="mt-1 text-xs text-zinc-300">
                Reason: {profile.moderationReason || 'Violated hightier.lol guidelines.'}
                {isSuspended && profile.suspendedUntil > now
                  ? ` · Ends ${new Date(profile.suspendedUntil).toLocaleString()}`
                  : ''}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() =>
                void adminModerateProfile({
                  moderatorUid: user.uid,
                  target: profile,
                  action: 'unban',
                  reason: 'Restored by admin',
                })
              }
              className="rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-3.5 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-400/25 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Unsuspend / Restore
            </button>
          )}
        </div>
      )}

      {!isLocked && hasUnackWarning && (
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
            <div>
              <div className="text-sm font-semibold text-white">
                Moderation Warning ({profile.warningCount} total)
              </div>
              <p className="mt-0.5 text-xs text-amber-200/90">
                {profile.moderationReason || 'Please review hightier.lol community guidelines.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={ackBusy}
            onClick={() => {
              setAckBusy(true);
              setSaveError('');
              void acknowledgeWarning(
                user.uid,
                profile.moderationStatus,
                profile.moderationReason
              )
                .catch((err) => {
                  setSaveError(err instanceof Error ? err.message : 'Unable to acknowledge warning.');
                })
                .finally(() => setAckBusy(false));
            }}
            className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-3.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/25 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {ackBusy ? 'Acknowledging...' : 'Acknowledge'}
          </button>
        </div>
      )}

      {/* Studio Top Bar */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Creator Studio</h1>
          <p className="mt-1 font-mono text-xs text-zinc-400 tabular-nums">
            hightier.lol/{profile.handle} · {profile.views.toLocaleString()} views ·{' '}
            {(profile.credits ?? 0).toLocaleString()} credits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleCopyUrl()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0D0F15] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:border-white/30 hover:text-white whitespace-nowrap cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copied URL' : 'Copy Link'}
          </button>
          <button
            type="button"
            onClick={() => onOpenBio(profile.handle)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0D0F15] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:border-white/30 hover:text-white whitespace-nowrap cursor-pointer"
          >
            <ExternalLink size={14} />
            Open Live Bio
          </button>
          <button
            type="button"
            disabled={saving || isLocked}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#07080A] hover:bg-zinc-200 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
          {saveMessage}
        </div>
      )}
      {saveError && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
          {saveError}
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="grid gap-10 lg:grid-cols-12">
        {/* Editor Column */}
        <div className="lg:col-span-7">
          <div className="mb-6 flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-[#0B0D12] p-1">
            {(
              [
                { id: 'profile', label: 'Profile' },
                { id: 'links', label: `Links (${links.length})` },
                { id: 'appearance', label: 'Appearance & Audio' },
                { id: 'badges', label: `Badges (${profile.badges.length})` },
                { id: 'crates', label: 'Crates & Frames' },
                { id: 'settings', label: 'Settings' },
              ] as { id: StudioTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-[#07080A]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'profile' && (
            <div className="space-y-5 rounded-xl border border-white/10 bg-[#0B0D12] p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">Handle</label>
                  <div className="mt-1.5 flex items-center rounded-lg border border-white/15 bg-[#07080A] px-3 py-2">
                    <span className="font-mono text-xs text-zinc-500">@</span>
                    <input
                      type="text"
                      value={handle}
                      disabled={isLocked}
                      onChange={(e) => setHandle(sanitizeHandle(e.target.value))}
                      className="ml-1.5 w-full bg-transparent font-mono text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300">Display Name</label>
                  <input
                    type="text"
                    maxLength={48}
                    disabled={isLocked}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Bio <span className="font-mono text-zinc-500">({bio.length}/320)</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={320}
                  disabled={isLocked}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell visitors what you build or create..."
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Location / Tagline</label>
                <input
                  type="text"
                  maxLength={48}
                  disabled={isLocked}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Tokyo, JP"
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ImageUploadField
                  label="Avatar Image"
                  value={avatarUrl}
                  preset="avatar"
                  disabled={isLocked}
                  previewAspect="square"
                  emptyHint="PNG, JPG, WebP, or GIF · Auto-resized to 256px"
                  onChange={setAvatarUrl}
                />
                <ImageUploadField
                  label="Card Banner (optional)"
                  value={bannerUrl}
                  preset="banner"
                  disabled={isLocked}
                  previewAspect="wide"
                  emptyHint="Wide header image · Auto-resized to 960px"
                  onChange={setBannerUrl}
                />
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="space-y-6">
              {/* Add New Link Form */}
              <form
                onSubmit={handleAddLink}
                className="space-y-4 rounded-xl border border-white/10 bg-[#0B0D12] p-6"
              >
                <h2 className="font-display text-base font-semibold text-white">
                  Add Link with Brand Logo
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">Platform Logo</label>
                    <div className="mt-1.5 flex items-center gap-2.5 rounded-lg border border-white/15 bg-[#07080A] px-3 py-2">
                      <PlatformLogo platform={newPlatform} iconUrl={newIconUrl} size={18} />
                      <select
                        value={newPlatform}
                        disabled={isLocked}
                        onChange={(e) => {
                          const p = e.target.value as PlatformId;
                          setNewPlatform(p);
                          const opt = PLATFORM_OPTIONS.find((o) => o.id === p);
                          if (opt && !newTitle) setNewTitle(opt.label);
                        }}
                        className="w-full bg-[#07080A] text-sm text-white focus:outline-none"
                      >
                        {PLATFORM_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300">Display Title</label>
                    <input
                      type="text"
                      maxLength={48}
                      disabled={isLocked}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Discord Server"
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">Destination URL</label>
                    <input
                      type="text"
                      maxLength={500}
                      disabled={isLocked}
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder={
                        PLATFORM_OPTIONS.find((p) => p.id === newPlatform)?.placeholderUrl ||
                        'https://...'
                      }
                      required
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Subtitle / Handle (optional)
                    </label>
                    <input
                      type="text"
                      maxLength={64}
                      disabled={isLocked}
                      value={newSubtitle}
                      onChange={(e) => setNewSubtitle(e.target.value)}
                      placeholder="@hightier"
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
                    />
                  </div>
                </div>

                <ImageUploadField
                  label="Custom Logo Image (optional override)"
                  value={newIconUrl}
                  preset="icon"
                  disabled={isLocked}
                  previewAspect="icon"
                  emptyHint="Leave empty to use built-in vector brand logo"
                  onChange={setNewIconUrl}
                />

                <button
                  type="submit"
                  disabled={isLocked || links.length >= 25}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#07080A] hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
                >
                  <Plus size={14} />
                  Add Link ({links.length}/25)
                </button>
              </form>

              {/* Existing Links List */}
              <div className="space-y-2.5">
                {links.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">
                    No links added yet. Use the form above to add your first link.
                  </div>
                ) : (
                  links.map((link, idx) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0B0D12] px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#07080A]">
                          <PlatformLogo platform={link.platform} iconUrl={link.iconUrl} size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">
                            {link.title}
                          </div>
                          <div className="truncate font-mono text-xs text-zinc-400">
                            {link.url}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <label
                          className={`rounded p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white ${
                            isLocked ? 'pointer-events-none opacity-30' : 'cursor-pointer'
                          }`}
                          title="Upload custom logo image"
                          aria-label="Upload custom logo image"
                        >
                          <ImagePlus size={14} />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
                            disabled={isLocked}
                            onChange={(e) => {
                              void handleExistingLinkLogoUpload(link.id, e.target.files?.[0]);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                        {link.iconUrl && (
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => clearExistingLinkLogo(link.id)}
                            className="rounded px-1.5 py-1 text-[11px] font-medium text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
                            title="Revert to built-in platform logo"
                          >
                            Reset Logo
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isLocked || idx === 0}
                          onClick={() => moveLink(idx, -1)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer"
                          aria-label="Move link up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isLocked || idx === links.length - 1}
                          onClick={() => moveLink(idx, 1)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer"
                          aria-label="Move link down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => toggleLinkVisible(link.id)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
                          aria-label={link.visible ? 'Hide link' : 'Show link'}
                        >
                          {link.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => removeLink(link.id)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-red-500/15 hover:text-red-400 cursor-pointer"
                          aria-label="Delete link"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6 rounded-xl border border-white/10 bg-[#0B0D12] p-6">
              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-300">Backdrop Preset or Upload</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {PRESET_BACKGROUNDS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => setBackgroundUrl(preset.url)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        backgroundUrl === preset.url
                          ? 'border-white bg-white/10 text-white'
                          : 'border-white/10 bg-[#07080A] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <ImageUploadField
                  label="Custom Backdrop Image"
                  value={backgroundUrl}
                  preset="backdrop"
                  disabled={isLocked}
                  previewAspect="wide"
                  emptyHint="PNG, JPG, WebP, or GIF · Auto-resized to 1280px"
                  onChange={setBackgroundUrl}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">Accent Color</label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-white/15 bg-[#07080A] px-2.5 py-1.5">
                    <input
                      type="color"
                      disabled={isLocked}
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-6 w-6 cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      maxLength={7}
                      disabled={isLocked}
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-full bg-transparent font-mono text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Card Opacity ({cardOpacity}%)
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    disabled={isLocked}
                    value={cardOpacity}
                    onChange={(e) => setCardOpacity(Number(e.target.value))}
                    className="mt-3 w-full accent-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Card Blur ({cardBlur}px)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    disabled={isLocked}
                    value={cardBlur}
                    onChange={(e) => setCardBlur(Number(e.target.value))}
                    className="mt-3 w-full accent-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">Link Layout</label>
                  <div className="mt-1.5 flex gap-1 rounded-lg border border-white/10 bg-[#07080A] p-1">
                    {(['cards', 'icons', 'both'] as LinkLayout[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        disabled={isLocked}
                        onClick={() => setLinkLayout(mode)}
                        className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize cursor-pointer ${
                          linkLayout === mode
                            ? 'bg-white text-[#07080A]'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Atmospheric Effect
                  </label>
                  <select
                    value={effect}
                    disabled={isLocked}
                    onChange={(e) => setEffect(e.target.value as VisualEffect)}
                    className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="none">None</option>
                    <option value="snow">Falling Dust / Snow</option>
                    <option value="embers">Rising Embers</option>
                    <option value="grid">Architectural Grid</option>
                  </select>
                </div>
              </div>

              {/* Enter Screen & Audio */}
              <div className="border-t border-white/10 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Click-to-Enter Gate</div>
                    <div className="text-xs text-zinc-400">
                      Show a minimalist splash overlay before revealing your bio and playing audio.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setEnterGateEnabled(!enterGateEnabled)}
                    className={`h-6 w-11 rounded-full transition-colors cursor-pointer ${
                      enterGateEnabled ? 'bg-white' : 'bg-white/15'
                    }`}
                    aria-label="Toggle click to enter gate"
                  >
                    <span
                      className={`block h-4 w-4 rounded-full transition-transform ${
                        enterGateEnabled
                          ? 'translate-x-6 bg-[#07080A]'
                          : 'translate-x-1 bg-zinc-400'
                      }`}
                    />
                  </button>
                </div>

                {enterGateEnabled && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Splash Gate Prompt Text
                    </label>
                    <input
                      type="text"
                      maxLength={64}
                      disabled={isLocked}
                      value={enterGateText}
                      onChange={(e) => setEnterGateText(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Background Music / Audio Track
                    </label>
                    <select
                      value={
                        audioMode === 'youtube'
                          ? 'youtube'
                          : audioMode === 'mp3'
                            ? 'custom'
                            : audioUrl
                      }
                      disabled={isLocked}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'youtube') {
                          setAudioMode('youtube');
                          const parsed = parseYouTubeVideoId(youtubeInput);
                          setAudioUrl(parsed ? toYouTubeAudioSource(parsed) : '');
                          if (
                            !audioTitle ||
                            AUDIO_PRESETS.some(
                              (p) => p.label.replace(' (Built-in)', '') === audioTitle
                            )
                          ) {
                            setAudioTitle('YouTube Audio');
                          }
                        } else if (val === 'custom') {
                          setAudioMode('mp3');
                          setAudioUrl(
                            audioUrl &&
                              !audioUrl.startsWith('synth:') &&
                              !audioUrl.startsWith('youtube:')
                              ? audioUrl
                              : 'https://'
                          );
                        } else {
                          setAudioMode('preset');
                          setAudioUrl(val);
                          const found = AUDIO_PRESETS.find((p) => p.id === val);
                          if (found) {
                            setAudioTitle(
                              val ? found.label.replace(' (Built-in)', '') : ''
                            );
                          }
                        }
                      }}
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      {AUDIO_PRESETS.map((p) => (
                        <option key={p.id || 'none'} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                      <option value="youtube">YouTube Video / Music</option>
                      <option value="custom">Custom MP3 URL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Audio Display Title
                    </label>
                    <input
                      type="text"
                      maxLength={64}
                      disabled={isLocked}
                      value={audioTitle}
                      onChange={(e) => setAudioTitle(e.target.value)}
                      placeholder="Track Name"
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                {audioMode === 'youtube' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-300">
                      YouTube Video URL or ID
                    </label>
                    <input
                      type="text"
                      maxLength={240}
                      disabled={isLocked}
                      value={youtubeInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setYoutubeInput(raw);
                        const extracted = parseYouTubeVideoId(raw);
                        setAudioUrl(extracted ? toYouTubeAudioSource(extracted) : '');
                      }}
                      placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ or video ID"
                      className="w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
                    />
                    {youtubeInput.trim() ? (
                      parseYouTubeVideoId(youtubeInput) ? (
                        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#07080A] p-2.5">
                          <ResilientImage
                            src={`https://i.ytimg.com/vi/${parseYouTubeVideoId(youtubeInput)}/mqdefault.jpg`}
                            alt="YouTube video preview"
                            fallbackLabel="YT"
                            className="h-11 w-20 rounded object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-emerald-300">
                              YouTube embed ready
                            </div>
                            <div className="font-mono text-[11px] text-zinc-400">
                              Video ID: {parseYouTubeVideoId(youtubeInput)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-400">
                          Paste a valid YouTube link (youtube.com / youtu.be) or 11-character video ID.
                        </p>
                      )
                    ) : (
                      <p className="text-[11px] text-zinc-500">
                        Accepts standard watch URLs, youtu.be links, Shorts, or an 11-character video ID.
                      </p>
                    )}
                  </div>
                )}

                {audioMode === 'mp3' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Custom Audio URL (.mp3 / .ogg)
                    </label>
                    <input
                      type="text"
                      maxLength={500}
                      disabled={isLocked}
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      placeholder="https://example.com/track.mp3"
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 font-mono text-xs text-white focus:outline-none"
                    />
                  </div>
                )}

                {(audioUrl !== '' || audioMode === 'youtube' || audioMode === 'mp3') && (
                  <div className="grid gap-4 rounded-lg border border-white/10 bg-[#07080A] p-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-white">Auto-Play Music</div>
                        <div className="mt-0.5 text-[11px] text-zinc-400">
                          Start playback automatically when visitors enter your bio.
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => setAudioAutoplay(!audioAutoplay)}
                        className={`h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                          audioAutoplay ? 'bg-white' : 'bg-white/15'
                        }`}
                        aria-label="Toggle background music auto-play"
                      >
                        <span
                          className={`block h-4 w-4 rounded-full transition-transform ${
                            audioAutoplay
                              ? 'translate-x-6 bg-[#07080A]'
                              : 'translate-x-1 bg-zinc-400'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                        <span>Default Volume</span>
                        <span className="font-mono text-zinc-400 tabular-nums">
                          {audioVolume}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        disabled={isLocked}
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(Number(e.target.value))}
                        aria-label="Default background music volume"
                        className="mt-2.5 w-full accent-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'badges' && (
            <div className="rounded-xl border border-white/10 bg-[#0B0D12] p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-base font-semibold text-white">Your Badges</h2>
                  <p className="mt-1 text-xs text-zinc-400">
                    Choose which of your assigned badges are visible on your public bio card, then
                    click Save Changes.
                  </p>
                </div>
                {profile.badges.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => setHiddenBadges([])}
                      className="rounded-md border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 cursor-pointer"
                    >
                      Show All
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => setHiddenBadges([...profile.badges])}
                      className="rounded-md border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      Hide All
                    </button>
                  </div>
                )}
              </div>

              {profile.badges.length === 0 ? (
                <div className="mt-6 rounded-lg border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">
                  No badges assigned to @{profile.handle} yet.
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {profile.badges.map((id) => {
                    const def = badgeCatalog.find((b) => b.id === id) || {
                      id,
                      name: id,
                      description: 'Custom profile badge',
                      color: '#93C5FD',
                      iconKey: 'award' as const,
                      isSystem: false,
                    };
                    const isHidden = hiddenBadges.includes(id);
                    const toggleVisibility = () => {
                      setHiddenBadges((prev) =>
                        prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
                      );
                    };
                    return (
                      <div
                        key={id}
                        className={`flex items-start justify-between gap-3 rounded-lg border p-4 transition-colors ${
                          isHidden
                            ? 'border-white/5 bg-[#07080A]/60 opacity-65'
                            : 'border-white/15 bg-[#07080A]'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#12151E]">
                            <BadgeGlyph iconKey={def.iconKey} color={def.color} size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white">{def.name}</div>
                            <div className="mt-0.5 text-xs text-zinc-400">{def.description}</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={toggleVisibility}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium shrink-0 cursor-pointer ${
                            isHidden
                              ? 'border-white/10 bg-transparent text-zinc-400 hover:text-white'
                              : 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                          }`}
                        >
                          {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                          {isHidden ? 'Hidden' : 'Visible'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'crates' && (
            <CratesTab
              user={user}
              profile={profile}
              isLocked={isLocked}
              equippedFrame={equippedFrame}
              onFrameEquipped={setEquippedFrame}
              onFeedback={(msg, isError) => {
                if (isError) {
                  setSaveMessage('');
                  setSaveError(msg);
                } else {
                  setSaveError('');
                  setSaveMessage(msg);
                  window.setTimeout(() => setSaveMessage(''), 3500);
                }
              }}
            />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 rounded-xl border border-white/10 bg-[#0B0D12] p-6">
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  Account & Recovery Settings
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Private account details visible only to you and hightier.lol administrators.
                </p>
              </div>

              <div className="rounded-xl border border-white/12 bg-[#07080A] p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#12151E] text-white">
                      <KeyRound size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Account Recovery ID</div>
                      <div className="text-xs text-zinc-400">
                        Unique identifier assigned upon signup for account recovery support.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHideRecoveryId((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0D12] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-white/30 hover:text-white cursor-pointer"
                    >
                      {hideRecoveryId ? <Eye size={13} /> : <EyeOff size={13} />}
                      {hideRecoveryId ? 'Reveal' : 'Hide'}
                    </button>
                    {privateUser?.recoveryId && (
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(privateUser.recoveryId)
                            .then(() => {
                              setCopiedRecoveryId(true);
                              window.setTimeout(() => setCopiedRecoveryId(false), 2000);
                            });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#07080A] hover:bg-zinc-200 cursor-pointer"
                      >
                        {copiedRecoveryId ? (
                          <Check size={13} className="text-emerald-600" />
                        ) : (
                          <Copy size={13} />
                        )}
                        {copiedRecoveryId ? 'Copied' : 'Copy ID'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-white/10 bg-[#0B0D12] px-4 py-3 font-mono text-base font-semibold tracking-widest text-white select-all">
                  {privateUser?.recoveryId
                    ? hideRecoveryId
                      ? 'HT-••••-••••-••••'
                      : privateUser.recoveryId
                    : 'Generating recovery ID...'}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  Keep this Recovery ID private. If you forget your password or lose access to your
                  account, join our Discord and provide this ID so an administrator can verify your
                  identity.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-[#07080A] p-4">
                  <div className="text-xs font-medium text-zinc-400">Account Email</div>
                  <div className="mt-1 truncate font-mono text-xs text-white">
                    {privateUser?.email || user.email || '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#07080A] p-4">
                  <div className="text-xs font-medium text-zinc-400">User UID</div>
                  <div className="mt-1 truncate font-mono text-xs text-zinc-300">{user.uid}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Live Preview Column */}
        <div className="lg:col-span-5">
          <div className="sticky top-8 rounded-2xl border border-white/10 bg-[#090B0F] p-6">
            <div className="mb-4 flex items-center justify-between text-xs text-zinc-400">
              <span>Live Profile Preview</span>
              <span className="font-mono">/{previewProfile.handle}</span>
            </div>
            <div className="flex justify-center">
              <BioCard profile={previewProfile} badgeCatalog={badgeCatalog} compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
