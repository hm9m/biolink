import { getFrameById, RARITY_META } from '@/src/lib/crates';
import type { CrateRarity, ProfileFrameDefinition } from '@/src/types/comboss';

export interface FrameVisuals {
  frame: ProfileFrameDefinition | null;
  rarityMeta: { label: string; color: string; bg: string; border: string } | null;
  ringBackground: string;
  isAnimated: boolean;
  avatarBoxShadow: string;
  cardBorderColor: string;
  cardBoxShadow: string;
  hasCornerTicks: boolean;
  cornerColor: string;
}

const DEFAULT_VISUALS: FrameVisuals = {
  frame: null,
  rarityMeta: null,
  ringBackground: '',
  isAnimated: false,
  avatarBoxShadow: '',
  cardBorderColor: '',
  cardBoxShadow: '',
  hasCornerTicks: false,
  cornerColor: '',
};

const RARITY_TICKS: Record<CrateRarity, boolean> = {
  common: false,
  rare: true,
  epic: true,
  legendary: true,
  mythic: true,
};

export function getFrameVisuals(
  frameId?: string,
  unlockedFrames?: string[],
  forcePreview = false
): FrameVisuals {
  if (!frameId) return DEFAULT_VISUALS;

  const isOwned = Array.isArray(unlockedFrames) && unlockedFrames.includes(frameId);
  if (!forcePreview && !isOwned) {
    return DEFAULT_VISUALS;
  }

  const frame = getFrameById(frameId);
  if (!frame) return DEFAULT_VISUALS;

  const rarityMeta = RARITY_META[frame.rarity];
  const isAnimated = frame.rarity === 'mythic';

  const ringBackground = isAnimated
    ? `conic-gradient(from 0deg, ${frame.primaryColor}, ${frame.secondaryColor}, #FFFFFF, ${frame.primaryColor})`
    : `linear-gradient(135deg, ${frame.primaryColor}, ${frame.secondaryColor}, ${frame.primaryColor})`;

  const glowIntensity =
    frame.rarity === 'mythic'
      ? '0 0 28px -4px'
      : frame.rarity === 'legendary'
        ? '0 0 22px -4px'
        : frame.rarity === 'epic'
          ? '0 0 18px -5px'
          : '0 0 12px -5px';

  const avatarBoxShadow = `${glowIntensity} ${frame.primaryColor}`;

  const cardBorderColor =
    frame.rarity === 'mythic' || frame.rarity === 'legendary'
      ? `${frame.primaryColor}70`
      : `${frame.primaryColor}48`;

  const cardBoxShadow =
    frame.rarity === 'mythic'
      ? `0 24px 60px -15px rgba(0,0,0,0.85), 0 0 42px -12px ${frame.primaryColor}55, inset 0 1px 0 0 ${frame.secondaryColor}45`
      : frame.rarity === 'legendary'
        ? `0 24px 60px -15px rgba(0,0,0,0.85), 0 0 32px -12px ${frame.primaryColor}45, inset 0 1px 0 0 ${frame.primaryColor}35`
        : `0 24px 60px -15px rgba(0,0,0,0.85), 0 0 22px -12px ${frame.primaryColor}35`;

  return {
    frame,
    rarityMeta,
    ringBackground,
    isAnimated,
    avatarBoxShadow,
    cardBorderColor,
    cardBoxShadow,
    hasCornerTicks: RARITY_TICKS[frame.rarity],
    cornerColor: frame.secondaryColor,
  };
}
