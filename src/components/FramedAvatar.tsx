import React from 'react';
import { ResilientImage } from '@/src/components/BrandIcons';
import { getFrameVisuals } from '@/src/lib/frameStyles';

interface FramedAvatarProps {
  src: string;
  alt: string;
  fallbackLabel: string;
  accentColor?: string;
  frameId?: string;
  unlockedFrames?: string[];
  forcePreview?: boolean;
  sizeClass?: string;
}

export const FramedAvatar: React.FC<FramedAvatarProps> = ({
  src,
  alt,
  fallbackLabel,
  accentColor = '#93C5FD',
  frameId,
  unlockedFrames,
  forcePreview = false,
  sizeClass = 'h-20 w-20',
}) => {
  const visuals = getFrameVisuals(frameId, unlockedFrames, forcePreview);

  if (!visuals.frame) {
    return (
      <div
        className={`${sizeClass} shrink-0 overflow-hidden rounded-xl border-2 bg-[#0E1016] shadow-lg`}
        style={{ borderColor: accentColor }}
      >
        <ResilientImage
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          fallbackLabel={fallbackLabel}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} relative shrink-0 rounded-xl p-[3px] shadow-lg`}
      style={{ boxShadow: visuals.avatarBoxShadow }}
      title={`${visuals.frame.name} (${visuals.rarityMeta?.label || ''})`}
    >
      {/* Perimeter bezel gradient layer (rotates smoothly on Mythic frames) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        <div
          className={`absolute ${visuals.isAnimated ? 'inset-[-45%] frame-aurora-spin' : 'inset-0'}`}
          style={{ background: visuals.ringBackground }}
        />
      </div>

      {/* Inner clipped avatar viewport */}
      <div className="relative z-10 h-full w-full overflow-hidden rounded-[9px] bg-[#0B0D12] ring-1 ring-black/60">
        <ResilientImage
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          fallbackLabel={fallbackLabel}
        />
      </div>

      {/* Architectural corner brackets on Rare+ frames */}
      {visuals.hasCornerTicks && (
        <div className="pointer-events-none absolute -inset-[2px] z-20">
          <span
            className="absolute top-0 left-0 h-2.5 w-2.5 rounded-tl-md border-t-2 border-l-2"
            style={{ borderColor: visuals.cornerColor }}
          />
          <span
            className="absolute top-0 right-0 h-2.5 w-2.5 rounded-tr-md border-t-2 border-r-2"
            style={{ borderColor: visuals.cornerColor }}
          />
          <span
            className="absolute bottom-0 left-0 h-2.5 w-2.5 rounded-bl-md border-b-2 border-l-2"
            style={{ borderColor: visuals.cornerColor }}
          />
          <span
            className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-br-md border-r-2 border-b-2"
            style={{ borderColor: visuals.cornerColor }}
          />
        </div>
      )}
    </div>
  );
};
