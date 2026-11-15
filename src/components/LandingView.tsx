import React, { useState } from 'react';
import { ArrowRight, Check, ShieldAlert } from 'lucide-react';
import { BioCard } from '@/src/components/BioCard';
import { BadgeGlyph } from '@/src/components/BrandIcons';
import { CORE_BADGES, SHOWCASE_PROFILE } from '@/src/lib/constants';
import { isHandleAvailable, isHandleValid, sanitizeHandle } from '@/src/lib/firestoreService';
import type { BadgeDefinition, LinkLayout, Profile } from '@/src/types/comboss';

interface LandingViewProps {
  badgeCatalog: BadgeDefinition[];
  isSignedIn: boolean;
  hasOwnProfile: boolean;
  onClaimHandle: (handle: string) => void;
  onOpenBio: (handle: string) => void;
  onSignIn: () => void;
  onGoDashboard: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  badgeCatalog,
  isSignedIn,
  hasOwnProfile,
  onClaimHandle,
  onOpenBio,
  onSignIn,
  onGoDashboard,
}) => {
  const [handleInput, setHandleInput] = useState('');
  const [availability, setAvailability] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [previewLayout, setPreviewLayout] = useState<LinkLayout>('both');

  const handleCheck = async (raw: string) => {
    const clean = sanitizeHandle(raw);
    setHandleInput(clean);
    if (!clean) {
      setAvailability('idle');
      return;
    }
    if (!isHandleValid(clean) || clean === 'hightier') {
      setAvailability(clean === 'hightier' ? 'taken' : 'invalid');
      return;
    }
    setAvailability('checking');
    try {
      const avail = await isHandleAvailable(clean);
      setAvailability(avail ? 'available' : 'taken');
    } catch {
      setAvailability('idle');
    }
  };

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeHandle(handleInput);
    if (!clean || !isHandleValid(clean)) {
      setAvailability('invalid');
      return;
    }
    onClaimHandle(clean);
  };

  const showcaseCardProfile: Profile = {
    ...SHOWCASE_PROFILE,
    linkLayout: previewLayout,
  };

  return (
    <div className="min-h-screen bg-[#07080A] text-[#F2F4F8]">
      {/* Hero Section */}
      <section id="showcase" className="mx-auto max-w-[1200px] px-6 pt-14 pb-20 lg:pt-20 lg:pb-24">
        <div className="grid items-stretch gap-12 lg:grid-cols-12">
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-xs font-medium tracking-wide text-zinc-400">
              Obsidian Bio Profiles · hightier.lol
            </p>
            <h1 className="mt-3 max-w-xl font-display text-4xl font-semibold tracking-tight text-white [text-wrap:balance] sm:text-5xl lg:text-[54px] lg:leading-[1.08]">
              One minimal bio link built for creators.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400">
              Publish a fast, customizable profile with verified platform badges, brand-logo links,
              click-to-enter splash screens, and ambient audio.
            </p>

            {/* Claim Handle Bar */}
            <form onSubmit={handleClaimSubmit} className="mt-8 max-w-lg">
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <div className="flex flex-1 items-center rounded-lg border border-white/15 bg-[#0D0F15] px-3.5 py-2.5 focus-within:border-white/40">
                  <span className="font-mono text-sm text-zinc-500 select-none">hightier.lol/</span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => void handleCheck(e.target.value)}
                    placeholder="yourname"
                    aria-label="Desired bio handle"
                    className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#07080A] transition-colors hover:bg-zinc-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {hasOwnProfile ? 'Open Dashboard' : 'Claim Handle'}
                  <ArrowRight size={15} />
                </button>
              </div>
              <div className="mt-2.5 min-h-[20px] text-xs">
                {availability === 'checking' && (
                  <span className="text-zinc-400">Checking availability...</span>
                )}
                {availability === 'available' && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <Check size={13} />
                    hightier.lol/{handleInput} is available.
                  </span>
                )}
                {availability === 'taken' && (
                  <span className="inline-flex items-center gap-1.5 text-amber-400">
                    <ShieldAlert size={13} />
                    @{handleInput} is already claimed.
                  </span>
                )}
                {availability === 'invalid' && (
                  <span className="text-red-400">
                    Use 2–24 lowercase letters, numbers, underscores, or hyphens.
                  </span>
                )}
                {availability === 'idle' && (
                  <span className="text-zinc-500">
                    {isSignedIn
                      ? hasOwnProfile
                        ? 'Your dashboard is ready to customize links and appearance.'
                        : 'Enter a handle to create your profile.'
                      : 'Sign in with Google to claim your handle in seconds.'}
                  </span>
                )}
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-white/10 pt-6 text-xs text-zinc-400">
              <span>22 Brand Logos</span>
              <span aria-hidden="true">·</span>
              <span>6 Official Badges</span>
              <span aria-hidden="true">·</span>
              <span>Click-to-Enter Audio Gate</span>
            </div>
          </div>

          {/* Interactive Live Bio Preview */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#0B0D12] p-6 lg:col-span-6">
            <div className="mb-4 flex w-full max-w-[460px] items-center justify-between gap-4">
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#07080A] p-1">
                {(['cards', 'icons', 'both'] as LinkLayout[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreviewLayout(mode)}
                    className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap ${
                      previewLayout === mode
                        ? 'bg-white text-[#07080A]'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onOpenBio('hightier')}
                className="text-xs font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Full Bio
              </button>
            </div>
            <BioCard profile={showcaseCardProfile} badgeCatalog={badgeCatalog} compact />
          </div>
        </div>
      </section>

      {/* Official Badges Section */}
      <section id="badges" className="border-t border-white/10 bg-[#090B0F] py-20">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Official Profile Badges
              </h2>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">
                Badges are verified and assigned exclusively through the hightier.lol moderation
                panel. Hover any glyph on a profile to inspect its title.
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-500">
              {badgeCatalog.length} Active Definitions
            </span>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {CORE_BADGES.map((badge) => (
              <div key={badge.id} className="bg-[#0B0D12] p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#12151E]">
                    <BadgeGlyph iconKey={badge.iconKey} color={badge.color} size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-white">
                      {badge.name}
                    </h3>
                    <span className="font-mono text-xs text-zinc-500">{badge.id}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
          <div className="text-xs text-zinc-500">
            hightier.lol — Bio links, verified badges, and creator moderation.
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <button
              type="button"
              onClick={() => onOpenBio('hightier')}
              className="hover:text-white cursor-pointer"
            >
              Demo Profile
            </button>
            <button
              type="button"
              onClick={isSignedIn ? onGoDashboard : onSignIn}
              className="hover:text-white cursor-pointer"
            >
              {isSignedIn ? 'Open Dashboard' : 'Sign In'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
