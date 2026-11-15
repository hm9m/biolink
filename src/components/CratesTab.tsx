import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Coins,
  Gift,
  Lock,
  PackageOpen,
  Sparkles,
} from 'lucide-react';
import { FramedAvatar } from '@/src/components/FramedAvatar';
import {
  CRATE_DEFINITIONS,
  DAILY_CLAIM_AMOUNT,
  DAILY_CLAIM_COOLDOWN_MS,
  getCrateById,
  getFrameById,
  PROFILE_FRAMES,
  RARITY_META,
  STARTER_CREDITS,
} from '@/src/lib/crates';
import {
  claimDailyCredits,
  equipProfileFrame,
  initializeStarterCredits,
  openCrateGamble,
  subscribeUserCrateRolls,
  type CrateOpenResult,
} from '@/src/lib/firestoreService';
import type {
  CrateDefinition,
  CrateId,
  CrateLootOption,
  CrateRollRecord,
  Profile,
} from '@/src/types/comboss';
import type { User } from 'firebase/auth';

interface CratesTabProps {
  user: User;
  profile: Profile;
  isLocked: boolean;
  equippedFrame: string;
  onFrameEquipped: (frameId: string) => void;
  onFeedback: (msg: string, isError?: boolean) => void;
}

const SLOT_WIDTH = 116;
const SLOT_GAP = 8;
const SLOT_STRIDE = SLOT_WIDTH + SLOT_GAP;
const WINNING_INDEX = 31;
const TOTAL_REEL_SLOTS = 40;

function formatCooldown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildDisplayReel(
  crate: CrateDefinition,
  winningItem?: CrateLootOption
): CrateLootOption[] {
  const expandedPool: CrateLootOption[] = [];
  for (const item of crate.lootTable) {
    const copies = Math.max(1, Math.round(item.oddsPercent));
    for (let i = 0; i < copies; i++) {
      expandedPool.push(item);
    }
  }

  const slots: CrateLootOption[] = [];
  for (let i = 0; i < TOTAL_REEL_SLOTS; i++) {
    if (winningItem && i === WINNING_INDEX) {
      slots.push(winningItem);
    } else {
      const pick = expandedPool[(i * 7 + 3) % expandedPool.length];
      slots.push(pick);
    }
  }
  return slots;
}

function getCrateRaritySpan(crate: CrateDefinition): string {
  const order = ['common', 'rare', 'epic', 'legendary', 'mythic'];
  let minIdx = order.length - 1;
  let maxIdx = 0;
  for (const item of crate.lootTable) {
    const idx = order.indexOf(item.rarity);
    if (idx >= 0) {
      minIdx = Math.min(minIdx, idx);
      maxIdx = Math.max(maxIdx, idx);
    }
  }
  return `${RARITY_META[order[minIdx] as keyof typeof RARITY_META].label} to ${
    RARITY_META[order[maxIdx] as keyof typeof RARITY_META].label
  }`;
}

export const CratesTab: React.FC<CratesTabProps> = ({
  user,
  profile,
  isLocked,
  equippedFrame,
  onFrameEquipped,
  onFeedback,
}) => {
  const [selectedCrateId, setSelectedCrateId] = useState<CrateId>('standard');
  const [instantOpen, setInstantOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [reelAnimated, setReelAnimated] = useState(false);
  const [reelOffset, setReelOffset] = useState(0);
  const [reelSlots, setReelSlots] = useState<CrateLootOption[]>(() =>
    buildDisplayReel(CRATE_DEFINITIONS[0])
  );
  const [lastResult, setLastResult] = useState<CrateOpenResult | null>(null);
  const [rolls, setRolls] = useState<CrateRollRecord[]>([]);
  const [claimingBusy, setClaimingBusy] = useState(false);
  const [equipBusyId, setEquipBusyId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const reelViewportRef = useRef<HTMLDivElement | null>(null);
  const spinTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const needsStarterInit = profile.credits === undefined;
  const credits = profile.credits ?? 0;
  const unlockedFrames = useMemo(
    () => (Array.isArray(profile.unlockedFrames) ? profile.unlockedFrames : []),
    [profile.unlockedFrames]
  );

  const selectedCrate = getCrateById(selectedCrateId);
  const lastClaimAt = profile.lastDailyClaimAt || 0;
  const cooldownRemaining =
    lastClaimAt > 0 ? Math.max(0, DAILY_CLAIM_COOLDOWN_MS - (nowMs - lastClaimAt)) : 0;
  const canClaimDaily = !needsStarterInit && cooldownRemaining === 0;

  useEffect(() => {
    const unsub = subscribeUserCrateRolls(user.uid, setRolls);
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [cooldownRemaining]);

  useEffect(() => {
    if (!spinning) {
      setReelAnimated(false);
      setReelOffset(0);
      setReelSlots(buildDisplayReel(selectedCrate));
    }
  }, [selectedCrate, spinning]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current !== null) window.clearTimeout(spinTimerRef.current);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleInitStarter = async () => {
    if (isLocked || claimingBusy) return;
    setClaimingBusy(true);
    try {
      await initializeStarterCredits(user.uid);
      onFeedback(`Initialized vault with ${STARTER_CREDITS} starter credits.`);
    } catch (err) {
      onFeedback(
        err instanceof Error ? err.message : 'Unable to initialize starter credits.',
        true
      );
    } finally {
      setClaimingBusy(false);
    }
  };

  const handleClaimDaily = async () => {
    if (isLocked || claimingBusy || !canClaimDaily) return;
    setClaimingBusy(true);
    try {
      await claimDailyCredits(profile);
      setNowMs(Date.now());
      onFeedback(`Claimed +${DAILY_CLAIM_AMOUNT} daily credits.`);
    } catch (err) {
      onFeedback(err instanceof Error ? err.message : 'Unable to claim daily credits.', true);
    } finally {
      setClaimingBusy(false);
    }
  };

  const handleOpenCrate = async () => {
    if (isLocked || spinning || needsStarterInit) return;
    if (credits < selectedCrate.cost) {
      onFeedback(`Need ${selectedCrate.cost} credits to open ${selectedCrate.name}.`, true);
      return;
    }

    setSpinning(true);
    setLastResult(null);

    try {
      const result = await openCrateGamble(profile, selectedCrate.id);
      const nextReel = buildDisplayReel(selectedCrate, result.loot);

      if (instantOpen) {
        setReelAnimated(false);
        setReelSlots(nextReel);
        const viewportW = reelViewportRef.current?.clientWidth || 560;
        const centerTarget = -(WINNING_INDEX * SLOT_STRIDE + SLOT_WIDTH / 2 - viewportW / 2);
        setReelOffset(centerTarget);
        setLastResult(result);
        setSpinning(false);
        return;
      }

      setReelAnimated(false);
      setReelOffset(0);
      setReelSlots(nextReel);

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = window.requestAnimationFrame(() => {
          const viewportW = reelViewportRef.current?.clientWidth || 560;
          const jitter = Math.floor(Math.random() * 52) - 26;
          const targetOffset = -(
            WINNING_INDEX * SLOT_STRIDE +
            SLOT_WIDTH / 2 +
            jitter -
            viewportW / 2
          );
          setReelAnimated(true);
          setReelOffset(targetOffset);
        });
      });

      spinTimerRef.current = window.setTimeout(() => {
        setLastResult(result);
        setSpinning(false);
      }, 2650);
    } catch (err) {
      setSpinning(false);
      onFeedback(err instanceof Error ? err.message : 'Failed to open crate.', true);
    }
  };

  const handleEquipFrame = async (targetFrameId: string) => {
    if (isLocked || equipBusyId !== null) return;
    const nextId = equippedFrame === targetFrameId ? '' : targetFrameId;
    setEquipBusyId(targetFrameId);
    try {
      await equipProfileFrame(user.uid, nextId);
      onFrameEquipped(nextId);
      const def = getFrameById(nextId);
      onFeedback(
        nextId
          ? `Equipped "${def?.name || nextId}" profile frame.`
          : 'Unequipped profile frame.'
      );
    } catch (err) {
      onFeedback(err instanceof Error ? err.message : 'Unable to update frame.', true);
    } finally {
      setEquipBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Credits Vault & Daily Drop Header */}
      <div className="rounded-xl border border-white/10 bg-[#0B0D12] p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Credit Balance
            </div>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className="font-mono text-3xl font-semibold text-white tabular-nums">
                {needsStarterInit ? '—' : credits.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-zinc-400">credits</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Wager credits on crates for credit jackpots and crate-exclusive profile frames.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {needsStarterInit ? (
              <button
                type="button"
                disabled={isLocked || claimingBusy}
                onClick={() => void handleInitStarter()}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-[#07080A] hover:bg-zinc-200 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                <Gift size={14} />
                {claimingBusy ? 'Claiming...' : `Claim ${STARTER_CREDITS} Starter Credits`}
              </button>
            ) : (
              <button
                type="button"
                disabled={isLocked || claimingBusy || !canClaimDaily}
                onClick={() => void handleClaimDaily()}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  canClaimDaily
                    ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25 cursor-pointer'
                    : 'border-white/10 bg-[#07080A] text-zinc-400 cursor-not-allowed'
                }`}
              >
                {canClaimDaily ? <Coins size={14} /> : <Clock size={14} />}
                {canClaimDaily
                  ? `Claim +${DAILY_CLAIM_AMOUNT} Daily Drop`
                  : `Daily Drop in ${formatCooldown(cooldownRemaining)}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Crate Selection + Gambling Spinner + Odds Table */}
      <div className="rounded-xl border border-white/10 bg-[#0B0D12] p-6 space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-base font-semibold text-white">Crate Gambling</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Select a crate tier to inspect full drop odds and spin for profile frames.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={instantOpen}
              onChange={(e) => setInstantOpen(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-[#07080A] accent-white"
            />
            Instant Open
          </label>
        </div>

        {/* 3 Crate Tier Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          {CRATE_DEFINITIONS.map((crate) => {
            const isSelected = crate.id === selectedCrate.id;
            return (
              <button
                key={crate.id}
                type="button"
                disabled={spinning}
                onClick={() => {
                  setSelectedCrateId(crate.id);
                  setLastResult(null);
                }}
                className={`rounded-xl border p-4 text-left transition-colors cursor-pointer disabled:opacity-60 ${
                  isSelected
                    ? 'border-white/45 bg-white/[0.07]'
                    : 'border-white/10 bg-[#07080A] hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="font-display text-sm font-semibold text-white"
                    style={{ color: isSelected ? crate.accentColor : undefined }}
                  >
                    {crate.name}
                  </span>
                  <span className="font-mono text-xs font-semibold text-white tabular-nums">
                    {crate.cost} cr
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
                  {crate.tagline}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px] text-zinc-400">
                  <span>{getCrateRaritySpan(crate)}</span>
                  <span className="font-mono tabular-nums">{crate.lootTable.length} drops</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Roulette Viewport */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#07080A] p-4">
          <div
            ref={reelViewportRef}
            className="relative h-32 w-full overflow-hidden rounded-lg border border-white/10 bg-[#090B0F]"
          >
            {/* Center Needle */}
            <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 z-20 w-[2px] -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#090B0F] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#090B0F] to-transparent" />

            {/* Moving Slots Track */}
            <div
              className="flex h-full items-center gap-2 will-change-transform"
              style={{
                transform: `translate3d(${reelOffset}px, 0, 0)`,
                transition: reelAnimated
                  ? 'transform 2600ms cubic-bezier(0.12, 0.85, 0.22, 1)'
                  : 'none',
              }}
            >
              {reelSlots.map((slot, idx) => {
                const rarity = RARITY_META[slot.rarity];
                return (
                  <div
                    key={`${slot.id}-${idx}`}
                    className="flex h-24 shrink-0 flex-col items-center justify-center rounded-lg border bg-[#0D1017] px-2 text-center"
                    style={{
                      width: `${SLOT_WIDTH}px`,
                      borderColor: rarity.border,
                    }}
                  >
                    {slot.type === 'frame' && slot.frameId ? (
                      <FramedAvatar
                        src={profile.avatarUrl}
                        alt={slot.label}
                        fallbackLabel={profile.displayName}
                        frameId={slot.frameId}
                        forcePreview
                        sizeClass="h-10 w-10"
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg border"
                        style={{ borderColor: rarity.border, backgroundColor: rarity.bg }}
                      >
                        <Coins size={18} style={{ color: rarity.color }} />
                      </div>
                    )}
                    <div className="mt-1.5 w-full truncate text-[11px] font-medium text-white">
                      {slot.label}
                    </div>
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: rarity.color }}
                    >
                      {rarity.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="text-xs text-zinc-400">
              Duplicate frame pulls convert automatically into bonus credits.
            </div>
            <button
              type="button"
              disabled={isLocked || spinning || needsStarterInit || credits < selectedCrate.cost}
              onClick={() => void handleOpenCrate()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-[#07080A] hover:bg-zinc-200 disabled:opacity-45 whitespace-nowrap cursor-pointer"
            >
              <PackageOpen size={15} />
              {spinning
                ? 'Spinning...'
                : `Open ${selectedCrate.name} (${selectedCrate.cost} cr)`}
            </button>
          </div>

          {/* Win Reveal Banner */}
          {lastResult && (
            <div
              className="flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center"
              style={{
                borderColor: RARITY_META[lastResult.loot.rarity].border,
                backgroundColor: RARITY_META[lastResult.loot.rarity].bg,
              }}
            >
              <div className="flex items-center gap-3.5">
                {lastResult.loot.type === 'frame' && lastResult.loot.frameId ? (
                  <FramedAvatar
                    src={profile.avatarUrl}
                    alt={lastResult.rewardLabel}
                    fallbackLabel={profile.displayName}
                    frameId={lastResult.loot.frameId}
                    forcePreview
                    sizeClass="h-14 w-14"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 bg-[#07080A]">
                    <Coins size={24} style={{ color: RARITY_META[lastResult.loot.rarity].color }} />
                  </div>
                )}
                <div>
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: RARITY_META[lastResult.loot.rarity].color }}
                  >
                    {RARITY_META[lastResult.loot.rarity].label} Drop ·{' '}
                    {lastResult.rewardType === 'frame'
                      ? 'New Profile Frame Unlocked'
                      : lastResult.rewardType === 'duplicate_refund'
                        ? 'Duplicate Converted to Credits'
                        : 'Credits Won'}
                  </div>
                  <div className="mt-0.5 font-display text-base font-semibold text-white">
                    {lastResult.rewardLabel}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-zinc-300 tabular-nums">
                    Net change: {lastResult.creditsDelta >= 0 ? '+' : ''}
                    {lastResult.creditsDelta} cr · Balance: {lastResult.nextCredits.toLocaleString()} cr
                  </div>
                </div>
              </div>

              {lastResult.unlockedNewFrameId && (
                <button
                  type="button"
                  disabled={equipBusyId !== null}
                  onClick={() => void handleEquipFrame(lastResult.unlockedNewFrameId!)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-[#07080A] hover:bg-zinc-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles size={13} />
                  {equippedFrame === lastResult.unlockedNewFrameId ? 'Equipped' : 'Equip Frame'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Full Odds Range Table */}
        <div>
          <div className="mb-2.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-white">
              {selectedCrate.name} · Drop Odds Breakdown
            </span>
            <span className="font-mono text-zinc-400 tabular-nums">
              Total: 100%
            </span>
          </div>
          <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#07080A]">
            {selectedCrate.lootTable.map((item) => {
              const rarity = RARITY_META[item.rarity];
              const frameDef = item.frameId ? getFrameById(item.frameId) : null;
              const isOwned = Boolean(item.frameId && unlockedFrames.includes(item.frameId));
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {item.type === 'frame' && item.frameId ? (
                      <FramedAvatar
                        src={profile.avatarUrl}
                        alt={item.label}
                        fallbackLabel={profile.displayName}
                        frameId={item.frameId}
                        forcePreview
                        sizeClass="h-8 w-8"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0B0D12]">
                        <Coins size={14} style={{ color: rarity.color }} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-white">{item.label}</span>
                        {isOwned && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <Check size={11} /> Owned
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        <span style={{ color: rarity.color }}>{rarity.label}</span>
                        {' · '}
                        {item.type === 'frame'
                          ? `Frame (Dupe: +${frameDef?.duplicateRefund || 0} cr)`
                          : 'Instant Credit Payout'}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-xs font-semibold text-white tabular-nums">
                    {item.oddsPercent}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Crate-Exclusive Profile Frames Wardrobe */}
      <div className="rounded-xl border border-white/10 bg-[#0B0D12] p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Profile Frames ({unlockedFrames.length}/{PROFILE_FRAMES.length} Unlocked)
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Profile frames are crate-exclusive and cannot be purchased directly.
            </p>
          </div>
          {equippedFrame && (
            <button
              type="button"
              disabled={isLocked || equipBusyId !== null}
              onClick={() => void handleEquipFrame(equippedFrame)}
              className="rounded-lg border border-white/15 bg-[#07080A] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-white/30 hover:text-white whitespace-nowrap cursor-pointer"
            >
              Unequip Current Frame
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {PROFILE_FRAMES.map((frame) => {
            const owned = unlockedFrames.includes(frame.id);
            const equipped = equippedFrame === frame.id && owned;
            const rarity = RARITY_META[frame.rarity];
            const sourcesLabel = frame.crateSources
              .map((cid) => getCrateById(cid).name.replace(' Crate', ''))
              .join(' · ');

            return (
              <div
                key={frame.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${
                  equipped
                    ? 'border-white/45 bg-white/[0.06]'
                    : owned
                      ? 'border-white/15 bg-[#07080A]'
                      : 'border-white/8 bg-[#07080A]/60 opacity-75'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <FramedAvatar
                    src={profile.avatarUrl}
                    alt={frame.name}
                    fallbackLabel={profile.displayName}
                    frameId={frame.id}
                    forcePreview
                    sizeClass="h-14 w-14"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-sm font-semibold text-white">
                        {frame.name}
                      </span>
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: rarity.color }}
                      >
                        {rarity.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">{frame.description}</p>
                    <div className="mt-1 text-[11px] text-zinc-500">
                      Won in: {sourcesLabel}
                    </div>
                  </div>
                </div>

                {owned ? (
                  <button
                    type="button"
                    disabled={isLocked || equipBusyId !== null}
                    onClick={() => void handleEquipFrame(frame.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      equipped
                        ? 'bg-white text-[#07080A] hover:bg-zinc-200'
                        : 'border border-white/20 bg-white/[0.05] text-white hover:bg-white/10'
                    }`}
                  >
                    {equipBusyId === frame.id ? 'Saving...' : equipped ? 'Equipped' : 'Equip'}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 whitespace-nowrap shrink-0">
                    <Lock size={12} /> Crate Only
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Rolls Ledger */}
      <div className="rounded-xl border border-white/10 bg-[#0B0D12] p-6">
        <h2 className="font-display text-base font-semibold text-white">Recent Crate Rolls</h2>
        {rolls.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">
            No crates opened yet. Spin a crate above to start unlocking profile frames.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#07080A]">
            {rolls.map((roll, idx) => {
              const rarity = RARITY_META[roll.rarity] || RARITY_META.common;
              return (
                <div
                  key={roll.id || idx}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{roll.rewardLabel}</div>
                    <div className="text-[11px] text-zinc-500">
                      {getCrateById(roll.crateId).name} ·{' '}
                      <span style={{ color: rarity.color }}>{rarity.label}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-semibold tabular-nums ${
                        roll.creditsDelta >= 0 ? 'text-emerald-400' : 'text-zinc-300'
                      }`}
                    >
                      {roll.creditsDelta >= 0 ? '+' : ''}
                      {roll.creditsDelta} cr
                    </div>
                    <div className="font-mono text-[10px] text-zinc-500 tabular-nums">
                      {roll.createdAt?.toDate
                        ? roll.createdAt.toDate().toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Just now'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
