const YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function parseYouTubeVideoId(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('youtube:')) {
    const candidate = trimmed.slice('youtube:'.length).trim();
    return YT_ID_REGEX.test(candidate) ? candidate : null;
  }

  if (YT_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const normalized =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      const seg = url.pathname.split('/').filter(Boolean)[0] || '';
      return YT_ID_REGEX.test(seg) ? seg : null;
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      const vParam = url.searchParams.get('v') || '';
      if (YT_ID_REGEX.test(vParam)) return vParam;

      const parts = url.pathname.split('/').filter(Boolean);
      if (
        parts.length >= 2 &&
        (parts[0] === 'embed' ||
          parts[0] === 'shorts' ||
          parts[0] === 'live' ||
          parts[0] === 'v')
      ) {
        return YT_ID_REGEX.test(parts[1]) ? parts[1] : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function isYouTubeAudioSource(audioUrl: string): boolean {
  return parseYouTubeVideoId(audioUrl) !== null && audioUrl.startsWith('youtube:');
}

export function toYouTubeAudioSource(videoId: string): string {
  return `youtube:${videoId}`;
}

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
}

export interface YTNamespace {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string;
      width?: number | string;
      height?: number | string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayerInstance }) => void;
        onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
        onError?: () => void;
      };
    }
  ) => YTPlayerInstance;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not available.'));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error('YouTube Player API failed to initialize.'));
      }
    };

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        ytApiPromise = null;
        reject(new Error('Failed to load YouTube IFrame API.'));
      };
      document.head.appendChild(script);
    }
  });

  return ytApiPromise;
}
