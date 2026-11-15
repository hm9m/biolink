export type ImageUploadPreset = 'avatar' | 'banner' | 'backdrop' | 'icon';

interface PresetConfig {
  maxWidth: number;
  maxHeight: number;
  maxChars: number;
  label: string;
}

export const IMAGE_UPLOAD_PRESETS: Record<ImageUploadPreset, PresetConfig> = {
  avatar: {
    maxWidth: 256,
    maxHeight: 256,
    maxChars: 75000,
    label: 'Avatar',
  },
  banner: {
    maxWidth: 960,
    maxHeight: 360,
    maxChars: 130000,
    label: 'Banner',
  },
  backdrop: {
    maxWidth: 1280,
    maxHeight: 720,
    maxChars: 185000,
    label: 'Backdrop',
  },
  icon: {
    maxWidth: 96,
    maxHeight: 96,
    maxChars: 18000,
    label: 'Link logo',
  },
};

export const PROFILE_IMAGE_CHAR_LIMITS = {
  avatar: 80000,
  banner: 140000,
  backdrop: 200000,
  icon: 20000,
} as const;

const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read selected image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Selected file could not be decoded as an image.'));
    img.src = src;
  });
}

function encodeCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
  mime: 'image/webp' | 'image/jpeg',
  quality: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Image processing canvas is unavailable.');
  }
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#07080A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(mime, quality);
}

export async function processImageUpload(
  file: File,
  preset: ImageUploadPreset
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (PNG, JPG, WebP, or GIF).');
  }
  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new Error('Image file is too large (max 15 MB before optimization).');
  }

  const cfg = IMAGE_UPLOAD_PRESETS[preset];
  const rawDataUrl = await readFileAsDataUrl(file);

  // Preserve animated GIFs when they already fit within the slot's budget
  if (file.type === 'image/gif' && rawDataUrl.length <= cfg.maxChars) {
    return rawDataUrl;
  }

  const img = await loadImageElement(rawDataUrl);
  const srcWidth = img.naturalWidth || img.width || cfg.maxWidth;
  const srcHeight = img.naturalHeight || img.height || cfg.maxHeight;

  const baseScale = Math.min(1, cfg.maxWidth / srcWidth, cfg.maxHeight / srcHeight);
  let targetW = Math.max(1, Math.round(srcWidth * baseScale));
  let targetH = Math.max(1, Math.round(srcHeight * baseScale));

  const qualities = [0.86, 0.78, 0.7, 0.6, 0.5];
  const mimes: ('image/webp' | 'image/jpeg')[] = ['image/webp', 'image/jpeg'];

  for (let dimAttempt = 0; dimAttempt < 4; dimAttempt++) {
    for (const mime of mimes) {
      for (const quality of qualities) {
        const candidate = encodeCanvas(img, targetW, targetH, mime, quality);
        if (candidate.startsWith(`data:${mime}`) && candidate.length <= cfg.maxChars) {
          return candidate;
        }
      }
    }
    targetW = Math.max(32, Math.round(targetW * 0.75));
    targetH = Math.max(32, Math.round(targetH * 0.75));
  }

  throw new Error(
    `${cfg.label} image could not be compressed within the storage budget. Try a simpler image.`
  );
}
