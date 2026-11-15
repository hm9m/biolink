import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { BioCard } from '@/src/components/BioCard';
import { ResilientImage } from '@/src/components/BrandIcons';
import { YouTubeAudioPlayer } from '@/src/components/YouTubeAudioPlayer';
import { ambientAudio } from '@/src/lib/audio';
import { incrementProfileView } from '@/src/lib/firestoreService';
import { parseYouTubeVideoId } from '@/src/lib/youtube';
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
  const youtubeVideoId = profile.audioUrl?.startsWith('youtube:')
    ? parseYouTubeVideoId(profile.audioUrl)
    : null;
  const shouldAutoplay = profile.audioAutoplay !== false;
  const defaultVolume =
    typeof profile.audioVolume === 'number'
      ? Math.min(100, Math.max(0, Math.round(profile.audioVolume)))
      : 50;

  const [entered, setEntered] = useState(!profile.enterGateEnabled);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(defaultVolume === 0);
  const [volume, setVolume] = useState(defaultVolume);
  const viewedRef = useRef(false);

  useEffect(() => {
    const startEntered = !profile.enterGateEnabled;
    setEntered(startEntered);
    setVolume(defaultVolume);
    setIsMuted(defaultVolume === 0);
    ambientAudio.setMuted(defaultVolume === 0);

    if (startEntered && profile.audioUrl && shouldAutoplay) {
      if (!youtubeVideoId) {
        ambientAudio.start(profile.audioUrl, defaultVolume);
      }
      setIsPlaying(true);
    } else {
      ambientAudio.stop();
      setIsPlaying(false);
    }

    return () => {
      ambientAudio.stop();
    };
  }, [
    profile.handle,
    profile.enterGateEnabled,
    profile.audioUrl,
    shouldAutoplay,
    defaultVolume,
    youtubeVideoId,
  ]);

  useEffect(() => {
    if (entered && canIncrementView && !viewedRef.current && profile.ownerUid !== 'showcase-hightier') {
      viewedRef.current = true;
      void incrementProfileView(profile.ownerUid, profile.views);
    }
  }, [entered, canIncrementView, profile.ownerUid, profile.views]);

  const handleEnter = () => {
    setEntered(true);
    if (profile.audioUrl && shouldAutoplay) {
      if (!youtubeVideoId) {
        ambientAudio.start(profile.audioUrl, volume);
      }
      setIsPlaying(true);
    }
  };

  const handleTogglePlay = () => {
    if (!profile.audioUrl) return;
    if (youtubeVideoId) {
      setIsPlaying((prev) => !prev);
      return;
    }
    if (isPlaying) {
      ambientAudio.stop();
      setIsPlaying(false);
    } else {
      ambientAudio.start(profile.audioUrl, volume);
      setIsPlaying(true);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (!youtubeVideoId) {
      ambientAudio.setMuted(next);
    }
  };

  const handleVolumeChange = (nextVol: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(nextVol)));
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
      if (!youtubeVideoId) ambientAudio.setMuted(false);
    } else if (clamped === 0 && !isMuted) {
      setIsMuted(true);
      if (!youtubeVideoId) ambientAudio.setMuted(true);
    }
    if (!youtubeVideoId) {
      ambientAudio.setVolume(clamped);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#07080A] px-4 py-12">
      {/* Hidden YouTube Player for Background Music */}
      {entered && youtubeVideoId && (
        <YouTubeAudioPlayer
          videoId={youtubeVideoId}
          playing={isPlaying}
          muted={isMuted}
          volume={volume}
          onPlayStateChange={setIsPlaying}
        />
      )}

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

      {/* Top Navigation & Audio Controls */}
      <div className="fixed top-4 left-4 right-4 z-20 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            ambientAudio.stop();
            onNavigateHome();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0B0D12]/80 px-3 py-2 text-xs font-medium text-zinc-300 backdrop-blur-md transition-colors hover:border-white/25 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft size={14} />
          hightier.lol
        </button>

        {entered && profile.audioUrl && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0B0D12]/85 px-2.5 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-md whitespace-nowrap shrink-0">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              aria-label={isMuted ? 'Unmute ambient audio' : 'Mute ambient audio'}
            >
              {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label="Background music volume"
              className="h-1.5 w-20 cursor-pointer accent-white sm:w-24"
            />

            <span className="w-8 text-right font-mono text-[11px] text-zinc-400 tabular-nums">
              {isMuted ? 0 : volume}%
            </span>
          </div>
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
            hightier.lol/{profile.handle}
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
              Claim your link at hightier.lol
            </button>
          </footer>
        </main>
      )}
    </div>
  );
};
