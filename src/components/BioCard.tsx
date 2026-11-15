import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Eye,
  MapPin,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BadgeGlyph, PlatformLogo, ResilientImage } from '@/src/components/BrandIcons';
import { FramedAvatar } from '@/src/components/FramedAvatar';
import { CORE_BADGES } from '@/src/lib/constants';
import { getFrameVisuals } from '@/src/lib/frameStyles';
import type { BadgeDefinition, Profile } from '@/src/types/comboss';

interface BioCardProps {
  profile: Profile;
  badgeCatalog?: BadgeDefinition[];
  isPlaying?: boolean;
  isMuted?: boolean;
  onTogglePlay?: () => void;
  onToggleMute?: () => void;
  compact?: boolean;
}

export const BioCard: React.FC<BioCardProps> = ({
  profile,
  badgeCatalog = CORE_BADGES,
  isPlaying = false,
  isMuted = false,
  onTogglePlay,
  onToggleMute,
  compact = false,
}) => {
  const badgeMap = new Map<string, BadgeDefinition>();
  for (const b of badgeCatalog) badgeMap.set(b.id, b);

  const hiddenSet = new Set(profile.hiddenBadges || []);
  const activeBadges: BadgeDefinition[] = profile.badges
    .filter((id) => !hiddenSet.has(id))
    .map(
      (id) =>
        badgeMap.get(id) || {
          id,
          name: id,
          description: 'Custom profile badge',
          color: '#93C5FD',
          iconKey: 'award' as const,
          isSystem: false,
        }
    );

  const visibleLinks = profile.links.filter((l) => l.visible);
  const now = Date.now();
  const isActivelySuspended =
    profile.moderationStatus === 'suspended' &&
    (profile.suspendedUntil === 0 || profile.suspendedUntil > now);
  const isBanned = profile.moderationStatus === 'banned';

  const cardBgOpacity = Math.min(100, Math.max(10, profile.cardOpacity)) / 100;
  const accent = profile.accentColor || '#93C5FD';
  const frameVisual = getFrameVisuals(profile.equippedFrame, profile.unlockedFrames);

  if (isBanned || isActivelySuspended) {
    return (
      <div
        className="w-full max-w-[460px] rounded-xl border border-white/10 p-8 text-center shadow-2xl"
        style={{
          backgroundColor: `rgba(11, 13, 18, ${Math.max(0.85, cardBgOpacity)})`,
          backdropFilter: `blur(${profile.cardBlur}px)`,
        }}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
          {isBanned ? <Ban size={22} /> : <AlertTriangle size={22} />}
        </div>
        <h2 className="font-display text-xl font-semibold text-white">
          {isBanned ? 'Profile Banned' : 'Profile Suspended'}
        </h2>
        <p className="mt-1 font-mono text-xs text-zinc-400">@{profile.handle}</p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">
          {profile.moderationReason ||
            (isBanned
              ? 'This profile has been permanently removed for violating hightier.lol guidelines.'
              : 'This profile is temporarily suspended by hightier.lol moderation.')}
        </p>
        {isActivelySuspended && profile.suspendedUntil > now && (
          <p className="mt-3 font-mono text-xs text-amber-400 tabular-nums">
            Suspension ends {new Date(profile.suspendedUntil).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-[460px] overflow-hidden rounded-xl border border-white/12 shadow-2xl transition-colors"
      style={{
        backgroundColor: `rgba(11, 13, 18, ${cardBgOpacity})`,
        backdropFilter: `blur(${profile.cardBlur}px)`,
        ...(frameVisual.frame
          ? {
              borderColor: frameVisual.cardBorderColor,
              boxShadow: frameVisual.cardBoxShadow,
            }
          : {}),
      }}
    >
      {/* Optional Profile Banner */}
      {profile.bannerUrl ? (
        <div className="relative h-28 w-full overflow-hidden border-b border-white/10">
          <ResilientImage
            src={profile.bannerUrl}
            alt={`${profile.displayName} banner`}
            className="h-full w-full object-cover"
            fallbackLabel={profile.displayName}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D12]/80 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="h-6 w-full" />
      )}

      <div className={`${compact ? 'px-5 pb-5' : 'px-6 pb-6'} ${profile.bannerUrl ? '-mt-10' : 'pt-1'} relative`}>
        {/* Avatar + Top Meta Row */}
        <div className="flex items-end justify-between gap-4">
          <FramedAvatar
            src={profile.avatarUrl}
            alt={profile.displayName}
            fallbackLabel={profile.displayName}
            accentColor={accent}
            frameId={profile.equippedFrame}
            unlockedFrames={profile.unlockedFrames}
            sizeClass="h-20 w-20"
          />

          {profile.audioUrl && onTogglePlay && (
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-zinc-300">
              <button
                type="button"
                onClick={onTogglePlay}
                className="flex h-6 w-6 items-center justify-center rounded text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <span className="max-w-[110px] truncate text-[12px] text-zinc-300">
                {profile.audioTitle || 'Ambient Audio'}
              </span>
              {onToggleMute && (
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                >
                  {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Identity + Badges */}
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
              {profile.displayName}
            </h1>

            {activeBadges.length > 0 && (
              <div
                className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1"
                aria-label="Verified profile badges"
              >
                {activeBadges.map((badge) => (
                  <div key={badge.id} className="group relative flex items-center">
                    <span
                      className="inline-flex items-center justify-center transition-transform duration-150 group-hover:scale-110"
                      aria-label={badge.name}
                    >
                      <BadgeGlyph iconKey={badge.iconKey} color={badge.color} size={14} />
                    </span>
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/15 bg-[#0D0F15] px-2.5 py-1.5 text-left opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                      <div className="text-xs font-semibold text-white" style={{ color: badge.color }}>
                        {badge.name}
                      </div>
                      <div className="max-w-[190px] whitespace-normal text-[11px] leading-snug text-zinc-400">
                        {badge.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="font-mono text-zinc-300">hightier.lol/{profile.handle}</span>
            {profile.location && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="text-zinc-500" />
                  {profile.location}
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
              <Eye size={12} className="text-zinc-500" />
              {profile.views.toLocaleString()}
            </span>
          </div>

          {profile.bio && (
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{profile.bio}</p>
          )}
        </div>

        {/* Icon Dock (when layout is icons or both) */}
        {(profile.linkLayout === 'icons' || profile.linkLayout === 'both') &&
          visibleLinks.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-white/10 pt-4">
              {visibleLinks.map((link) => (
                <a
                  key={`icon-${link.id}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.title}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] transition-transform duration-150 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08]"
                >
                  <PlatformLogo platform={link.platform} iconUrl={link.iconUrl} size={18} />
                </a>
              ))}
            </div>
          )}

        {/* Link Cards (when layout is cards or both) */}
        {(profile.linkLayout === 'cards' || profile.linkLayout === 'both') && (
          <div className="mt-5 space-y-2.5">
            {visibleLinks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-xs text-zinc-500">
                No links published yet.
              </div>
            ) : (
              visibleLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 transition-all duration-150 hover:border-white/25 hover:bg-white/[0.08]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/40">
                      <PlatformLogo platform={link.platform} iconUrl={link.iconUrl} size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{link.title}</div>
                      {link.subtitle && (
                        <div className="truncate font-mono text-xs text-zinc-400">
                          {link.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="shrink-0 text-zinc-500 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                  />
                </a>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
