import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { BioCard } from '@/src/components/BioCard';
import { ResilientImage } from '@/src/components/BrandIcons';
import { ambientAudio } from '@/src/lib/audio';
import { incrementProfileView } from '@/src/lib/firestoreService';
import type { BadgeDefinition, Profile } from '@/src/types/comboss';

interface BioViewProps {
  profile: Profile;
  badgeCatalog: BadgeDefinition[];
  canIncrementView: boolean;
  onNavigateHome: () => void;
}

export const BioView: React.FC<BioViewProps> = ({
  profile,
  badgeCatalog,
  canIncrementView,
  onNavigateHome,
}) => {
  const [entered, setEntered] = useState(!profile.enterGateEnabled);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    setEntered(!profile.enterGateEnabled);
    return () => {
      ambientAudio.stop();
    };
  }, [profile.handle, profile.enterGateEnabled]);

  useEffect(() => {
    if (entered && canIncrementView && !viewedRef.current && profile.ownerUid !== 'showcase-comboss') {
      viewedRef.current = true;
      void incrementProfileView(profile.ownerUid, profile.views);
    }
  }, [entered, canIncrementView, profile.ownerUid, profile.views]);

  const handleEnter = () => {
    setEntered(true);
    if (profile.audioUrl) {
      ambientAudio.start(profile.audioUrl);
      setIsPlaying(true);
    }
  };

  const handleTogglePlay = () => {
    if (!profile.audioUrl) return;
    if (isPlaying) {
      ambientAudio.stop();
      setIsPlaying(false);
    } else {
      ambientAudio.start(profile.audioUrl);
      setIsPlaying(true);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    ambientAudio.setMuted(next);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#07080A] px-4 py-12">
      {/* Background Media Layer */}
      {profile.backgroundUrl && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <ResilientImage
            src={profile.backgroundUrl}
            alt="Profile backdrop"
            className="h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07080A]/75 via-[#07080A]/65 to-[#07080A]/90" />
        </div>
      )}

      {/* Atmospheric Particle Layer */}
      {profile.effect === 'grid' && (
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      )}

      {(profile.effect === 'snow' || profile.effect === 'embers') && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => {
            const left = `${(i * 19) % 100}%`;
            const delay = `${(i * 0.7) % 7}s`;
            const duration = `${8 + (i % 5) * 2}s`;
            const isEmber = profile.effect === 'embers';
            return (
              <span
                key={i}
                className={isEmber ? 'animate-ember' : 'animate-particle'}
                style={{
                  position: 'absolute',
                  left,
                  top: isEmber ? 'auto' : '-10px',
                  bottom: isEmber ? '-10px' : 'auto',
                  width: isEmber ? '3px' : '4px',
                  height: isEmber ? '3px' : '4px',
                  borderRadius: '9999px',
                  backgroundColor: isEmber ? profile.accentColor || '#F59E0B' : 'rgba(255,255,255,0.55)',
                  animation: `${isEmber ? 'emberRise' : 'floatParticle'} ${duration} linear ${delay} infinite`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Top Navigation Controls */}
      <div className="fixed top-4 left-4 right-4 z-20 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            ambientAudio.stop();
            onNavigateHome();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0B0D12]/80 px-3 py-2 text-xs font-medium text-zinc-300 backdrop-blur-md transition-colors hover:border-white/25 hover:text-white cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft size={14} />
          comboss.lol
        </button>

        {entered && profile.audioUrl && (
          <button
            type="button"
            onClick={handleToggleMute}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0B0D12]/80 px-3 py-2 text-xs font-medium text-zinc-300 backdrop-blur-md transition-colors hover:border-white/25 hover:text-white cursor-pointer"
            aria-label={isMuted ? 'Unmute ambient audio' : 'Mute ambient audio'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>
        )}
      </div>

      {/* Click-to-Enter Splash Gate */}
      {!entered ? (
        <button
          type="button"
          onClick={handleEnter}
          className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-[#07080A]/92 px-6 text-center backdrop-blur-xl transition-opacity duration-300 cursor-pointer"
        >
          <span className="font-display text-2xl font-medium tracking-tight text-white sm:text-3xl">
            {profile.enterGateText || 'click to enter'}
          </span>
          <span className="mt-3 font-mono text-xs text-zinc-400">
            comboss.lol/{profile.handle}
          </span>
        </button>
      ) : (
        <main className="relative z-10 flex w-full flex-col items-center">
          <BioCard
            profile={profile}
            badgeCatalog={badgeCatalog}
            isPlaying={isPlaying}
            isMuted={isMuted}
            onTogglePlay={handleTogglePlay}
            onToggleMute={handleToggleMute}
          />
          <footer className="mt-8 text-center text-xs text-zinc-500">
            <button
              type="button"
              onClick={() => {
                ambientAudio.stop();
                onNavigateHome();
              }}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Claim your link at comboss.lol
            </button>
          </footer>
        </main>
      )}
    </div>
  );
};
