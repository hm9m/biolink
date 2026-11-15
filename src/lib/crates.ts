import type {
  CrateDefinition,
  CrateId,
  CrateLootOption,
  CrateRarity,
  ProfileFrameDefinition,
} from '@/src/types/comboss';

export const STARTER_CREDITS = 250;
export const DAILY_CLAIM_AMOUNT = 150;
export const DAILY_CLAIM_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

export const RARITY_META: Record<
  CrateRarity,
  { label: string; color: string; bg: string; border: string }
> = {
  common: {
    label: 'Common',
    color: '#94A3B8',
    bg: 'rgba(148, 163, 184, 0.10)',
    border: 'rgba(148, 163, 184, 0.30)',
  },
  rare: {
    label: 'Rare',
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.10)',
    border: 'rgba(56, 189, 248, 0.35)',
  },
  epic: {
    label: 'Epic',
    color: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.40)',
  },
  legendary: {
    label: 'Legendary',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.45)',
  },
  mythic: {
    label: 'Mythic',
    color: '#F43F5E',
    bg: 'rgba(244, 63, 94, 0.14)',
    border: 'rgba(244, 63, 94, 0.50)',
  },
};

export const PROFILE_FRAMES: ProfileFrameDefinition[] = [
  {
    id: 'steel_bezel',
    name: 'Steel Bezel',
    description: 'Brushed slate metallic double-bezel frame.',
    rarity: 'common',
    primaryColor: '#94A3B8',
    secondaryColor: '#475569',
    duplicateRefund: 60,
    crateSources: ['standard'],
  },
  {
    id: 'frost_wire',
    name: 'Frost Wire',
    description: 'Crisp glacier-blue precision perimeter ring.',
    rarity: 'common',
    primaryColor: '#7DD3FC',
    secondaryColor: '#0284C7',
    duplicateRefund: 60,
    crateSources: ['standard'],
  },
  {
    id: 'crimson_alloy',
    name: 'Crimson Alloy',
    description: 'Anodized crimson bezel with ruby edge highlights.',
    rarity: 'rare',
    primaryColor: '#F43F5E',
    secondaryColor: '#9F1239',
    duplicateRefund: 140,
    crateSources: ['standard', 'phantom'],
  },
  {
    id: 'emerald_circuit',
    name: 'Emerald Circuit',
    description: 'Deep emerald frame with architectural corner ticks.',
    rarity: 'rare',
    primaryColor: '#10B981',
    secondaryColor: '#065F46',
    duplicateRefund: 140,
    crateSources: ['standard', 'phantom'],
  },
  {
    id: 'cobalt_prism',
    name: 'Cobalt Prism',
    description: 'Refractive sapphire-indigo luminous profile frame.',
    rarity: 'epic',
    primaryColor: '#6366F1',
    secondaryColor: '#38BDF8',
    duplicateRefund: 260,
    crateSources: ['standard', 'phantom', 'sovereign'],
  },
  {
    id: 'amethyst_halo',
    name: 'Amethyst Halo',
    description: 'Deep violet obsidian rim with radiant halo aura.',
    rarity: 'epic',
    primaryColor: '#A855F7',
    secondaryColor: '#EC4899',
    duplicateRefund: 280,
    crateSources: ['phantom', 'sovereign'],
  },
  {
    id: 'solaris_gold',
    name: 'Solaris Gold',
    description: 'Molten 24k bullion metallic trim and warm glow.',
    rarity: 'legendary',
    primaryColor: '#F59E0B',
    secondaryColor: '#FEF08A',
    duplicateRefund: 550,
    crateSources: ['standard', 'sovereign'],
  },
  {
    id: 'obsidian_frost',
    name: 'Obsidian Frost',
    description: 'Layered platinum and arctic-cyan crystalline ring.',
    rarity: 'legendary',
    primaryColor: '#38BDF8',
    secondaryColor: '#E2E8F0',
    duplicateRefund: 550,
    crateSources: ['phantom', 'sovereign'],
  },
  {
    id: 'astral_singularity',
    name: 'Astral Singularity',
    description: 'Animated conic aurora shimmer with cosmic perimeter.',
    rarity: 'mythic',
    primaryColor: '#C084FC',
    secondaryColor: '#22D3EE',
    duplicateRefund: 1200,
    crateSources: ['phantom', 'sovereign'],
  },
  {
    id: 'eternal_sovereign',
    name: 'Eternal Sovereign',
    description: 'Animated molten gold and crimson crown aura.',
    rarity: 'mythic',
    primaryColor: '#FBBF24',
    secondaryColor: '#F43F5E',
    duplicateRefund: 1350,
    crateSources: ['sovereign'],
  },
];

export const CRATE_DEFINITIONS: CrateDefinition[] = [
  {
    id: 'standard',
    name: 'Standard Crate',
    tagline: 'Entry crate with reliable frame drops and a 1% Legendary chase.',
    cost: 100,
    accentColor: '#94A3B8',
    lootTable: [
      {
        id: 'credits_50',
        type: 'credits',
        label: '50 Credits Cache',
        rarity: 'common',
        oddsPercent: 38,
        creditsAmount: 50,
      },
      {
        id: 'steel_bezel',
        type: 'frame',
        label: 'Steel Bezel',
        rarity: 'common',
        oddsPercent: 24,
        frameId: 'steel_bezel',
      },
      {
        id: 'frost_wire',
        type: 'frame',
        label: 'Frost Wire',
        rarity: 'common',
        oddsPercent: 18,
        frameId: 'frost_wire',
      },
      {
        id: 'crimson_alloy',
        type: 'frame',
        label: 'Crimson Alloy',
        rarity: 'rare',
        oddsPercent: 10,
        frameId: 'crimson_alloy',
      },
      {
        id: 'emerald_circuit',
        type: 'frame',
        label: 'Emerald Circuit',
        rarity: 'rare',
        oddsPercent: 6,
        frameId: 'emerald_circuit',
      },
      {
        id: 'cobalt_prism',
        type: 'frame',
        label: 'Cobalt Prism',
        rarity: 'epic',
        oddsPercent: 3,
        frameId: 'cobalt_prism',
      },
      {
        id: 'solaris_gold',
        type: 'frame',
        label: 'Solaris Gold',
        rarity: 'legendary',
        oddsPercent: 1,
        frameId: 'solaris_gold',
      },
    ],
  },
  {
    id: 'phantom',
    name: 'Phantom Crate',
    tagline: 'Zero Common frames. Boosted Rare/Epic odds with a Mythic chance.',
    cost: 250,
    accentColor: '#A855F7',
    lootTable: [
      {
        id: 'credits_120',
        type: 'credits',
        label: '120 Credits Cache',
        rarity: 'common',
        oddsPercent: 30,
        creditsAmount: 120,
      },
      {
        id: 'crimson_alloy',
        type: 'frame',
        label: 'Crimson Alloy',
        rarity: 'rare',
        oddsPercent: 22,
        frameId: 'crimson_alloy',
      },
      {
        id: 'emerald_circuit',
        type: 'frame',
        label: 'Emerald Circuit',
        rarity: 'rare',
        oddsPercent: 20,
        frameId: 'emerald_circuit',
      },
      {
        id: 'cobalt_prism',
        type: 'frame',
        label: 'Cobalt Prism',
        rarity: 'epic',
        oddsPercent: 13,
        frameId: 'cobalt_prism',
      },
      {
        id: 'amethyst_halo',
        type: 'frame',
        label: 'Amethyst Halo',
        rarity: 'epic',
        oddsPercent: 9,
        frameId: 'amethyst_halo',
      },
      {
        id: 'obsidian_frost',
        type: 'frame',
        label: 'Obsidian Frost',
        rarity: 'legendary',
        oddsPercent: 4.5,
        frameId: 'obsidian_frost',
      },
      {
        id: 'astral_singularity',
        type: 'frame',
        label: 'Astral Singularity',
        rarity: 'mythic',
        oddsPercent: 1.5,
        frameId: 'astral_singularity',
      },
    ],
  },
  {
    id: 'sovereign',
    name: 'Sovereign Crate',
    tagline: 'High-stakes vault: guaranteed Epic+ frames or 2,500 Credit jackpot.',
    cost: 600,
    accentColor: '#F59E0B',
    lootTable: [
      {
        id: 'credits_300',
        type: 'credits',
        label: '300 Credits Cache',
        rarity: 'rare',
        oddsPercent: 28,
        creditsAmount: 300,
      },
      {
        id: 'cobalt_prism',
        type: 'frame',
        label: 'Cobalt Prism',
        rarity: 'epic',
        oddsPercent: 22,
        frameId: 'cobalt_prism',
      },
      {
        id: 'amethyst_halo',
        type: 'frame',
        label: 'Amethyst Halo',
        rarity: 'epic',
        oddsPercent: 20,
        frameId: 'amethyst_halo',
      },
      {
        id: 'solaris_gold',
        type: 'frame',
        label: 'Solaris Gold',
        rarity: 'legendary',
        oddsPercent: 13,
        frameId: 'solaris_gold',
      },
      {
        id: 'obsidian_frost',
        type: 'frame',
        label: 'Obsidian Frost',
        rarity: 'legendary',
        oddsPercent: 10,
        frameId: 'obsidian_frost',
      },
      {
        id: 'astral_singularity',
        type: 'frame',
        label: 'Astral Singularity',
        rarity: 'mythic',
        oddsPercent: 4,
        frameId: 'astral_singularity',
      },
      {
        id: 'eternal_sovereign',
        type: 'frame',
        label: 'Eternal Sovereign',
        rarity: 'mythic',
        oddsPercent: 2,
        frameId: 'eternal_sovereign',
      },
      {
        id: 'credits_2500',
        type: 'credits',
        label: '2,500 Credits Jackpot',
        rarity: 'mythic',
        oddsPercent: 1,
        creditsAmount: 2500,
      },
    ],
  },
];

export function getCrateById(id: CrateId): CrateDefinition {
  return CRATE_DEFINITIONS.find((c) => c.id === id) || CRATE_DEFINITIONS[0];
}

export function getFrameById(id?: string): ProfileFrameDefinition | null {
  if (!id) return null;
  return PROFILE_FRAMES.find((f) => f.id === id) || null;
}

export function rollCrateLoot(crate: CrateDefinition): CrateLootOption {
  const totalWeight = crate.lootTable.reduce((sum, item) => sum + item.oddsPercent, 0);
  const randBuf = new Uint32Array(1);
  let randomFraction: number;
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(randBuf);
    randomFraction = randBuf[0] / 4294967296;
  } else {
    randomFraction = Math.random();
  }

  let cursor = randomFraction * totalWeight;
  for (const item of crate.lootTable) {
    cursor -= item.oddsPercent;
    if (cursor <= 0) {
      return item;
    }
  }
  return crate.lootTable[crate.lootTable.length - 1];
}
