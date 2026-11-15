import React, { useEffect, useRef } from 'react';
import { loadYouTubeIframeApi, type YTPlayerInstance } from '@/src/lib/youtube';

interface YouTubeAudioPlayerProps {
  videoId: string;
  playing: boolean;
  muted: boolean;
  volume: number;
  onPlayStateChange?: (playing: boolean) => void;
}

export const YouTubeAudioPlayer: React.FC<YouTubeAudioPlayerProps> = ({
  videoId,
  playing,
  muted,
  volume,
  onPlayStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const readyRef = useRef(false);

  const latestPropsRef = useRef({ playing, muted, volume, onPlayStateChange });
  latestPropsRef.current = { playing, muted, volume, onPlayStateChange };

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;

    const mountPlayer = async () => {
      try {
        const YT = await loadYouTubeIframeApi();
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = '';
        const hostEl = document.createElement('div');
        containerRef.current.appendChild(hostEl);

        const instance = new YT.Player(hostEl, {
          videoId,
          width: 160,
          height: 160,
          playerVars: {
            autoplay: latestPropsRef.current.playing ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            loop: 1,
            playlist: videoId,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              readyRef.current = true;
              const target = event.target;
              const { playing: shouldPlay, muted: isMuted, volume: vol } =
                latestPropsRef.current;

              target.setVolume(Math.min(100, Math.max(0, Math.round(vol))));
              if (isMuted) {
                target.mute();
              } else {
                target.unMute();
              }

              if (shouldPlay) {
                target.playVideo();
              } else {
                target.pauseVideo();
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === YT.PlayerState.ENDED) {
                event.target.playVideo();
                return;
              }
              if (event.data === YT.PlayerState.PLAYING) {
                latestPropsRef.current.onPlayStateChange?.(true);
              } else if (event.data === YT.PlayerState.PAUSED) {
                latestPropsRef.current.onPlayStateChange?.(false);
              }
            },
            onError: () => {
              if (!cancelled) {
                latestPropsRef.current.onPlayStateChange?.(false);
              }
            },
          },
        });

        playerRef.current = instance;
      } catch {
        if (!cancelled) {
          latestPropsRef.current.onPlayStateChange?.(false);
        }
      }
    };

    void mountPlayer();

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore destroy cleanup error
        }
        playerRef.current = null;
      }
    };
  }, [videoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try {
      if (playing) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch {
      // ignore player timing error
    }
  }, [playing]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try {
      player.setVolume(Math.min(100, Math.max(0, Math.round(volume))));
      if (muted) {
        player.mute();
      } else {
        player.unMute();
      }
    } catch {
      // ignore volume error
    }
  }, [muted, volume]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 right-0 h-[120px] w-[120px] overflow-hidden opacity-0"
    />
  );
};
