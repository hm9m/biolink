import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  KeyRound,
  Mail,
  Plus,
  Search,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { BadgeGlyph, ResilientImage } from '@/src/components/BrandIcons';
import {
  adminChangeHandle,
  adminCreateAndAssignCustomBadge,
  adminGrantCredits,
  adminModerateProfile,
  adminSendPasswordReset,
  adminToggleBadge,
  createCustomBadge,
  deleteCustomBadge,
  sanitizeHandle,
  subscribeAllProfilesAdmin,
  subscribeAllUsersPrivateAdmin,
  subscribeModerationLogs,
} from '@/src/lib/firestoreService';
import type {
  BadgeDefinition,
  BadgeIconKey,
  ModerationLog,
  ModerationStatus,
  Profile,
  UserPrivateRecord,
} from '@/src/types/comboss';
import type { User } from 'firebase/auth';

interface AdminPanelViewProps {
  user: User;
  badgeCatalog: BadgeDefinition[];
  onOpenBio: (handle: string) => void;
}

type AdminTab = 'users' | 'directory' | 'badges' | 'logs';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  user,
  badgeCatalog,
  onOpenBio,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [usersPrivateByUid, setUsersPrivateByUid] = useState<Record<string, UserPrivateRecord>>({});
  const [copiedRecoveryUid, setCopiedRecoveryUid] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ModerationStatus>('all');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Moderation action form inside inspector
  const [modReason, setModReason] = useState('');
  const [suspendHours, setSuspendHours] = useState(24);
  const [creditAmount, setCreditAmount] = useState(500);
  const [creditReason, setCreditReason] = useState('');
  const [adminNewHandle, setAdminNewHandle] = useState('');
  const [busyAction, setBusyAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  // Custom badge creation form (Catalog tab & inline user modal)
  const [badgeId, setBadgeId] = useState('');
  const [badgeName, setBadgeName] = useState('');
  const [badgeDesc, setBadgeDesc] = useState('');
  const [badgeColor, setBadgeColor] = useState('#38BDF8');
  const [badgeIcon, setBadgeIcon] = useState<BadgeIconKey>('bolt');
  const [badgeFeedback, setBadgeFeedback] = useState('');

  const [quickBadgeName, setQuickBadgeName] = useState('');
  const [quickBadgeDesc, setQuickBadgeDesc] = useState('');
  const [quickBadgeColor, setQuickBadgeColor] = useState('#38BDF8');
  const [quickBadgeIcon, setQuickBadgeIcon] = useState<BadgeIconKey>('bolt');

  useEffect(() => {
    const unsubProfiles = subscribeAllProfilesAdmin(setProfiles);
    const unsubLogs = subscribeModerationLogs(setLogs);
    const unsubPrivate = subscribeAllUsersPrivateAdmin(setUsersPrivateByUid);
    return () => {
      unsubProfiles();
      unsubLogs();
      unsubPrivate();
    };
  }, []);

  const selectedProfile = profiles.find((p) => p.ownerUid === selectedUid) || null;
  const selectedPrivate = selectedProfile ? usersPrivateByUid[selectedProfile.ownerUid] : undefined;

  const filteredProfiles = profiles.filter((p) => {
    if (statusFilter !== 'all' && p.moderationStatus !== statusFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const priv = usersPrivateByUid[p.ownerUid];
    return (
      p.handle.toLowerCase().includes(q) ||
      p.displayName.toLowerCase().includes(q) ||
      p.ownerUid.toLowerCase().includes(q) ||
      Boolean(priv?.recoveryId?.toLowerCase().includes(q)) ||
      Boolean(priv?.email?.toLowerCase().includes(q))
    );
  });

  const stats = {
    total: profiles.length,
    active: profiles.filter((p) => p.moderationStatus === 'active').length,
    warned: profiles.filter((p) => p.moderationStatus === 'warned').length,
    restricted: profiles.filter(
      (p) => p.moderationStatus === 'suspended' || p.moderationStatus === 'banned'
    ).length,
  };

  const handleToggleBadge = async (target: Profile, bId: string) => {
    setBusyAction(true);
    setActionFeedback('');
    try {
      await adminToggleBadge(user.uid, target, bId);
      setActionFeedback(`Updated badge "${bId}" for @${target.handle}.`);
    } catch (err) {
      setActionFeedback(err instanceof Error ? err.message : 'Failed to update badge.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleModerate = async (
    target: Profile,
    action: 'warn' | 'remove_warning' | 'clear_warnings' | 'suspend' | 'ban' | 'unban'
  ) => {
    setBusyAction(true);
    setActionFeedback('');
    try {
      await adminModerateProfile({
        moderatorUid: user.uid,
        target,
        action,
        reason: modReason,
        durationHours: suspendHours,
      });
      setModReason('');
      setActionFeedback(`Action "${action}" applied to @${target.handle}.`);
    } catch (err) {
      setActionFeedback(err instanceof Error ? err.message : 'Moderation action failed.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleQuickCustomBadge = async (e: React.FormEvent, target: Profile) => {
    e.preventDefault();
    if (!quickBadgeName.trim()) return;
    setBusyAction(true);
    setActionFeedback('');
    try {
      const assignedId = await adminCreateAndAssignCustomBadge(user.uid, target, {
        name: quickBadgeName.trim(),
        description: quickBadgeDesc.trim() || `Custom badge for @${target.handle}`,
        color: quickBadgeColor,
        iconKey: quickBadgeIcon,
      });
      setQuickBadgeName('');
      setQuickBadgeDesc('');
      setActionFeedback(`Created & gave custom badge "${assignedId}" to @${target.handle}.`);
    } catch (err) {
      setActionFeedback(err instanceof Error ? err.message : 'Failed to create/assign custom badge.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleGrantCredits = async (e: React.FormEvent, target: Profile) => {
    e.preventDefault();
    setBusyAction(true);
    setActionFeedback('');
    try {
      await adminGrantCredits(user.uid, target, creditAmount, creditReason);
      setCreditReason('');
      setActionFeedback(
        `Applied ${creditAmount > 0 ? '+' : ''}${creditAmount} credits to @${target.handle}.`
      );
    } catch (err) {
      setActionFeedback(err instanceof Error ? err.message : 'Failed to update credits.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleSendPasswordReset = async (target: Profile, email?: string) => {
    if (!email) return;
    setBusyAction(true);
    setActionFeedback('');
    try {
      await adminSendPasswordReset(user.uid, target, email, modReason);
      setActionFeedback(`Password reset email sent to ${email} for @${target.handle}.`);
    } catch (err) {
      setActionFeedback(err instanceof Error ? err.message : 'Failed to send password reset.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleAdminChangeHandle = async (e: React.FormEvent, target: Profile) => {
    e.preventDefault();
    const clean = sanitizeHandle(adminNewHandle);
    if (!clean) return;
    setBusyAction(true);
    setActionFeedback('');
    try {
      const updated = await adminChangeHandle(user.uid, target, clean, modReason);
      setAdminNewHandle('');
      setActionFeedback(`Changed @${target.handle}'s username to @${updated}.`);
    } catch (err) {
      setActionFeedback(err instanceof Error ? err.message : 'Failed to update username.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleCreateBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    setBadgeFeedback('');
    try {
      await createCustomBadge({
        id: badgeId,
        name: badgeName,
        description: badgeDesc,
        color: badgeColor,
        iconKey: badgeIcon,
      });
      setBadgeId('');
      setBadgeName('');
      setBadgeDesc('');
      setBadgeFeedback('Custom badge created.');
    } catch (err) {
      setBadgeFeedback(err instanceof Error ? err.message : 'Failed to create badge.');
    }
  };

  const renderStatusBadge = (status: ModerationStatus) => {
    switch (status) {
      case 'banned':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
            <Ban size={13} /> Banned
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
            <AlertTriangle size={13} /> Suspended
          </span>
        );
      case 'warned':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-300">
            <AlertTriangle size={13} /> Warned
          </span>
        );
      case 'active':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 size={13} /> Active
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">
            Administration & Moderation
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Assign verified badges, issue warnings, suspend or ban profiles, and inspect audit logs.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0B0D12] p-1">
          {(
            [
              { id: 'users', label: 'Users & Moderation' },
              { id: 'directory', label: 'Directory' },
              { id: 'badges', label: 'Badge Catalog' },
              { id: 'logs', label: 'Audit Log' },
            ] as { id: AdminTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'bg-white text-[#07080A]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 lg:grid-cols-4">
        <div className="bg-[#0B0D12] p-5">
          <div className="text-xs text-zinc-400">Total Profiles</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-white tabular-nums">
            {stats.total}
          </div>
        </div>
        <div className="bg-[#0B0D12] p-5">
          <div className="text-xs text-zinc-400">Active</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-emerald-400 tabular-nums">
            {stats.active}
          </div>
        </div>
        <div className="bg-[#0B0D12] p-5">
          <div className="text-xs text-zinc-400">Warned</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-yellow-300 tabular-nums">
            {stats.warned}
          </div>
        </div>
        <div className="bg-[#0B0D12] p-5">
          <div className="text-xs text-zinc-400">Suspended / Banned</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-red-400 tabular-nums">
            {stats.restricted}
          </div>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="mt-8">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-lg border border-white/12 bg-[#0B0D12] px-3 py-2 sm:w-80">
              <Search size={15} className="text-zinc-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search @handle, name, UID, email, or recovery ID..."
                className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-[#0B0D12] p-1">
              {(['all', 'active', 'warned', 'suspended', 'banned'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-white text-[#07080A]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0B0D12]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-[#090B0F] text-xs text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Recovery ID</th>
                  <th className="px-4 py-3 font-medium">Badges</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Warnings</th>
                  <th className="px-4 py-3 text-right font-medium">Views</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                      No profiles found.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((prof) => {
                    const priv = usersPrivateByUid[prof.ownerUid];
                    return (
                    <tr key={prof.ownerUid} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#12151E]">
                            <ResilientImage
                              src={prof.avatarUrl}
                              alt={prof.displayName}
                              className="h-full w-full object-cover"
                              fallbackLabel={prof.displayName}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-white">
                              {prof.displayName}
                            </div>
                            <div className="truncate font-mono text-xs text-zinc-400">
                              @{prof.handle}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {priv?.recoveryId ? (
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(priv.recoveryId).then(() => {
                                setCopiedRecoveryUid(prof.ownerUid);
                                window.setTimeout(() => setCopiedRecoveryUid(null), 1800);
                              });
                            }}
                            title="Copy Recovery ID"
                            className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-[#07080A] px-2 py-1 font-mono text-xs text-zinc-200 hover:border-white/25 hover:text-white cursor-pointer"
                          >
                            {priv.recoveryId}
                            {copiedRecoveryUid === prof.ownerUid ? (
                              <Check size={11} className="text-emerald-400" />
                            ) : (
                              <Copy size={11} className="text-zinc-500" />
                            )}
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {prof.badges.length === 0 ? (
                            <span className="text-xs text-zinc-600">None</span>
                          ) : (
                            prof.badges.map((id) => {
                              const def = badgeCatalog.find((b) => b.id === id);
                              if (!def) return null;
                              return (
                                <span key={id} title={def.name}>
                                  <BadgeGlyph
                                    iconKey={def.iconKey}
                                    color={def.color}
                                    size={14}
                                  />
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{renderStatusBadge(prof.moderationStatus)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300 tabular-nums">
                        {prof.warningCount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300 tabular-nums">
                        {prof.views.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {prof.moderationStatus !== 'active' && (
                            <button
                              type="button"
                              disabled={busyAction}
                              onClick={() => void handleModerate(prof, 'unban')}
                              className="rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25 cursor-pointer whitespace-nowrap"
                            >
                              Unsuspend
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenBio(prof.handle)}
                            className="rounded-md border border-white/10 p-1.5 text-zinc-400 hover:border-white/25 hover:text-white cursor-pointer"
                            title="Open public bio"
                          >
                            <ExternalLink size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUid(prof.ownerUid);
                              setActionFeedback('');
                            }}
                            className="rounded-md border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 cursor-pointer whitespace-nowrap"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'directory' && (
        <div className="mt-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Admin Profile Directory
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Browse all {profiles.length} profiles registered on hightier.lol.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/12 bg-[#0B0D12] px-3 py-2 sm:w-80">
              <Search size={15} className="text-zinc-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search handle, name, or bio..."
                className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProfiles.map((prof) => {
              const badgeMap = new Map(badgeCatalog.map((b) => [b.id, b]));
              const badges = prof.badges
                .map((id) => badgeMap.get(id))
                .filter((b): b is BadgeDefinition => Boolean(b));

              return (
                <div
                  key={prof.ownerUid}
                  className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0B0D12] p-5"
                >
                  <div>
                    <div className="flex items-center gap-3.5">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-[#12151E]">
                        <ResilientImage
                          src={prof.avatarUrl}
                          alt={prof.displayName}
                          className="h-full w-full object-cover"
                          fallbackLabel={prof.displayName}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-display text-base font-semibold text-white">
                            {prof.displayName}
                          </span>
                          {badges.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              {badges.slice(0, 4).map((b) => (
                                <BadgeGlyph
                                  key={b.id}
                                  iconKey={b.iconKey}
                                  color={b.color}
                                  size={13}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                        <div className="truncate font-mono text-xs text-zinc-400">
                          hightier.lol/{prof.handle}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-zinc-400">
                      {prof.bio || 'No bio provided.'}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                    <span className="font-mono text-zinc-500 tabular-nums">
                      {prof.links.filter((l) => l.visible).length} links ·{' '}
                      {prof.views.toLocaleString()} views
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenBio(prof.handle)}
                        className="text-zinc-300 hover:text-white cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUid(prof.ownerUid);
                          setActionFeedback('');
                        }}
                        className="rounded border border-white/15 bg-white/[0.04] px-2.5 py-1 text-white hover:bg-white/10 cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProfiles.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 py-12 text-center text-sm text-zinc-500">
              No profiles match "{searchQuery}".
            </div>
          )}
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <form
            onSubmit={(e) => void handleCreateBadge(e)}
            className="space-y-4 rounded-xl border border-white/10 bg-[#0B0D12] p-6 lg:col-span-5"
          >
            <h2 className="font-display text-base font-semibold text-white">
              Create Custom Badge
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-300">Badge ID</label>
                <input
                  type="text"
                  value={badgeId}
                  onChange={(e) => setBadgeId(sanitizeHandle(e.target.value))}
                  placeholder="og_member"
                  required
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 font-mono text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300">Display Name</label>
                <input
                  type="text"
                  maxLength={32}
                  value={badgeName}
                  onChange={(e) => setBadgeName(e.target.value)}
                  placeholder="OG Member"
                  required
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">Description</label>
              <input
                type="text"
                maxLength={160}
                value={badgeDesc}
                onChange={(e) => setBadgeDesc(e.target.value)}
                placeholder="Early hightier.lol creator from launch week."
                required
                className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-300">Icon Glyph</label>
                <select
                  value={badgeIcon}
                  onChange={(e) => setBadgeIcon(e.target.value as BadgeIconKey)}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="bolt">Bolt</option>
                  <option value="award">Award</option>
                  <option value="star">Star</option>
                  <option value="gem">Gem</option>
                  <option value="crown">Crown</option>
                  <option value="shield">Shield</option>
                  <option value="heart">Heart</option>
                  <option value="bug">Bug</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300">Color</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-white/15 bg-[#07080A] px-2.5 py-1.5">
                  <input
                    type="color"
                    value={badgeColor}
                    onChange={(e) => setBadgeColor(e.target.value)}
                    className="h-5 w-5 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    maxLength={7}
                    value={badgeColor}
                    onChange={(e) => setBadgeColor(e.target.value)}
                    className="w-full bg-transparent font-mono text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {badgeFeedback && (
              <p className="text-xs text-zinc-300">{badgeFeedback}</p>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#07080A] hover:bg-zinc-200 cursor-pointer"
            >
              <Plus size={14} />
              Create Badge
            </button>
          </form>

          <div className="space-y-3 lg:col-span-7">
            {badgeCatalog.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0B0D12] px-5 py-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#12151E]">
                    <BadgeGlyph iconKey={b.iconKey} color={b.color} size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-semibold text-white">
                        {b.name}
                      </span>
                      <span className="font-mono text-xs text-zinc-500">{b.id}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">{b.description}</p>
                  </div>
                </div>
                {!b.isSystem ? (
                  <button
                    type="button"
                    onClick={() => void deleteCustomBadge(b.id)}
                    className="rounded p-2 text-zinc-400 hover:bg-red-500/15 hover:text-red-400 cursor-pointer"
                    title="Delete custom badge"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <span className="text-xs text-zinc-500">System</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="mt-8 overflow-x-auto rounded-xl border border-white/10 bg-[#0B0D12]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-[#090B0F] text-xs text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 text-right font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No moderation events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={log.id || i}>
                    <td className="px-4 py-3 font-mono text-xs text-white">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                      @{log.targetHandle}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{log.details}</td>
                    <td className="px-4 py-3 text-xs text-zinc-300">{log.reason}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500 tabular-nums">
                      {log.createdAt?.toDate
                        ? log.createdAt.toDate().toLocaleString()
                        : 'Just now'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* User Inspection & Moderation Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0B0D12] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/15">
                  <ResilientImage
                    src={selectedProfile.avatarUrl}
                    alt={selectedProfile.displayName}
                    className="h-full w-full object-cover"
                    fallbackLabel={selectedProfile.displayName}
                  />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">
                    {selectedProfile.displayName}
                  </h2>
                  <div className="font-mono text-xs text-zinc-400 tabular-nums">
                    @{selectedProfile.handle} · {(selectedProfile.credits ?? 0).toLocaleString()} cr ·{' '}
                    {selectedProfile.unlockedFrames?.length ?? 0} frames
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUid(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {actionFeedback && (
              <div className="mt-4 rounded-lg border border-white/15 bg-white/[0.05] px-3.5 py-2 text-xs text-white">
                {actionFeedback}
              </div>
            )}

            {/* Account & Recovery Details */}
            <div className="mt-5 grid gap-3 rounded-xl border border-white/10 bg-[#07080A] p-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <KeyRound size={12} />
                  Recovery ID
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-white">
                    {selectedPrivate?.recoveryId || 'Not yet synced'}
                  </span>
                  {selectedPrivate?.recoveryId && (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(selectedPrivate.recoveryId)
                          .then(() => {
                            setCopiedRecoveryUid(selectedProfile.ownerUid);
                            window.setTimeout(() => setCopiedRecoveryUid(null), 1800);
                          });
                      }}
                      className="inline-flex items-center gap-1 rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:text-white cursor-pointer"
                    >
                      {copiedRecoveryUid === selectedProfile.ownerUid ? (
                        <Check size={10} className="text-emerald-400" />
                      ) : (
                        <Copy size={10} />
                      )}
                      {copiedRecoveryUid === selectedProfile.ownerUid ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Account Email / UID
                </div>
                <div className="mt-1 truncate font-mono text-xs text-zinc-200">
                  {selectedPrivate?.email || '—'}
                </div>
                <div className="truncate font-mono text-[11px] text-zinc-500">
                  {selectedProfile.ownerUid}
                </div>
              </div>
            </div>

            {/* Password Reset & Username Controls */}
            <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-[#07080A] p-4 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Reset Account Password
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Sends a Firebase password reset link to{' '}
                  <span className="font-mono text-zinc-300">
                    {selectedPrivate?.email || 'no synced email'}
                  </span>
                  .
                </p>
                <button
                  type="button"
                  disabled={busyAction || !selectedPrivate?.email}
                  onClick={() =>
                    void handleSendPasswordReset(selectedProfile, selectedPrivate?.email)
                  }
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/12 disabled:opacity-40 cursor-pointer"
                >
                  <Mail size={13} />
                  Send Password Reset Email
                </button>
              </div>

              <form onSubmit={(e) => void handleAdminChangeHandle(e, selectedProfile)}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Change Username (@{selectedProfile.handle})
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 items-center rounded-lg border border-white/15 bg-[#0B0D12] px-2.5 py-1.5">
                    <span className="font-mono text-xs text-zinc-500">@</span>
                    <input
                      type="text"
                      maxLength={24}
                      value={adminNewHandle}
                      onChange={(e) => setAdminNewHandle(sanitizeHandle(e.target.value))}
                      placeholder="new_username"
                      className="ml-1 min-w-0 flex-1 bg-transparent font-mono text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={
                      busyAction ||
                      !adminNewHandle.trim() ||
                      adminNewHandle === selectedProfile.handle
                    }
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#07080A] hover:bg-zinc-200 disabled:opacity-40 whitespace-nowrap cursor-pointer"
                  >
                    Rename
                  </button>
                </div>
              </form>
            </div>

            {/* Badges Assignment */}
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Assign / Remove Badges (Core & Custom)
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {badgeCatalog.map((b) => {
                  const has = selectedProfile.badges.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      disabled={busyAction}
                      onClick={() => void handleToggleBadge(selectedProfile, b.id)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                        has
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/10 bg-[#07080A] text-zinc-400 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <BadgeGlyph iconKey={b.iconKey} color={b.color} size={14} />
                        <span className="truncate font-medium">{b.name}</span>
                        {!b.isSystem && (
                          <span className="font-mono text-[9px] text-zinc-400">custom</span>
                        )}
                      </span>
                      <span className="font-mono text-[10px]">{has ? 'ON' : 'OFF'}</span>
                    </button>
                  );
                })}

                {/* Any assigned custom badge IDs whose definition was removed */}
                {selectedProfile.badges
                  .filter((id) => !badgeCatalog.some((b) => b.id === id))
                  .map((orphanId) => (
                    <button
                      key={orphanId}
                      type="button"
                      disabled={busyAction}
                      onClick={() => void handleToggleBadge(selectedProfile, orphanId)}
                      className="flex items-center justify-between rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2.5 text-left text-xs text-amber-200 hover:bg-amber-400/20 cursor-pointer"
                    >
                      <span className="truncate font-mono">{orphanId}</span>
                      <span className="font-mono text-[10px]">REMOVE</span>
                    </button>
                  ))}
              </div>

              {/* Inline Create & Give Custom Badge */}
              <form
                onSubmit={(e) => void handleQuickCustomBadge(e, selectedProfile)}
                className="mt-4 rounded-xl border border-white/10 bg-[#07080A] p-3.5"
              >
                <div className="text-xs font-medium text-zinc-300">
                  Create & Give New Custom Badge to @{selectedProfile.handle}
                </div>
                <div className="mt-2.5 grid gap-2 sm:grid-cols-12">
                  <input
                    type="text"
                    maxLength={32}
                    value={quickBadgeName}
                    onChange={(e) => setQuickBadgeName(e.target.value)}
                    placeholder="Badge Name (e.g. VIP)"
                    className="rounded-lg border border-white/15 bg-[#0B0D12] px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none sm:col-span-4"
                  />
                  <input
                    type="text"
                    maxLength={160}
                    value={quickBadgeDesc}
                    onChange={(e) => setQuickBadgeDesc(e.target.value)}
                    placeholder="Short description..."
                    className="rounded-lg border border-white/15 bg-[#0B0D12] px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none sm:col-span-4"
                  />
                  <select
                    value={quickBadgeIcon}
                    onChange={(e) => setQuickBadgeIcon(e.target.value as BadgeIconKey)}
                    className="rounded-lg border border-white/15 bg-[#0B0D12] px-2 py-1.5 text-xs text-white focus:outline-none sm:col-span-2"
                  >
                    <option value="bolt">Bolt</option>
                    <option value="award">Award</option>
                    <option value="star">Star</option>
                    <option value="gem">Gem</option>
                    <option value="crown">Crown</option>
                    <option value="shield">Shield</option>
                    <option value="heart">Heart</option>
                    <option value="bug">Bug</option>
                  </select>
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <input
                      type="color"
                      value={quickBadgeColor}
                      onChange={(e) => setQuickBadgeColor(e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border border-white/15 bg-transparent"
                      aria-label="Custom badge color"
                    />
                    <button
                      type="submit"
                      disabled={busyAction || !quickBadgeName.trim()}
                      className="flex-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-[#07080A] hover:bg-zinc-200 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                    >
                      Give
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Credit Grants & Balance Adjustment */}
            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Credits & Economy
                </h3>
                <span className="font-mono text-xs font-semibold text-white tabular-nums">
                  Balance: {(selectedProfile.credits ?? 0).toLocaleString()} cr
                </span>
              </div>

              <form
                onSubmit={(e) => void handleGrantCredits(e, selectedProfile)}
                className="mt-3 rounded-xl border border-white/10 bg-[#07080A] p-3.5"
              >
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  {[100, 500, 1000, 2500, -250].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCreditAmount(preset)}
                      className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-colors tabular-nums cursor-pointer ${
                        creditAmount === preset
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/10 bg-[#0B0D12] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {preset > 0 ? `+${preset}` : preset} cr
                    </button>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-12">
                  <input
                    type="number"
                    step={50}
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                    className="rounded-lg border border-white/15 bg-[#0B0D12] px-2.5 py-1.5 font-mono text-xs text-white focus:outline-none sm:col-span-3 tabular-nums"
                    aria-label="Credit delta amount"
                  />
                  <input
                    type="text"
                    maxLength={200}
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="Reason (e.g. Event prize, refund)..."
                    className="rounded-lg border border-white/15 bg-[#0B0D12] px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none sm:col-span-6"
                  />
                  <button
                    type="submit"
                    disabled={busyAction || !creditAmount}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#07080A] hover:bg-zinc-200 disabled:opacity-40 cursor-pointer whitespace-nowrap sm:col-span-3"
                  >
                    <Coins size={13} />
                    Apply Credits
                  </button>
                </div>
              </form>
            </div>

            {/* Moderation Actions */}
            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Moderation Actions
                </h3>
                {renderStatusBadge(selectedProfile.moderationStatus)}
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400">Reason / Notice</label>
                  <input
                    type="text"
                    maxLength={300}
                    value={modReason}
                    onChange={(e) => setModReason(e.target.value)}
                    placeholder="Reason for warning, suspension, or ban..."
                    className="mt-1 w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={() => void handleModerate(selectedProfile, 'warn')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3.5 py-2 text-xs font-medium text-yellow-200 hover:bg-yellow-400/20 cursor-pointer"
                  >
                    <AlertTriangle size={13} />
                    Warn ({selectedProfile.warningCount})
                  </button>

                  {(selectedProfile.warningCount > 0 ||
                    selectedProfile.moderationStatus === 'warned') && (
                    <>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => void handleModerate(selectedProfile, 'remove_warning')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-400/30 bg-zinc-400/10 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-400/20 cursor-pointer"
                      >
                        -1 Warning
                      </button>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => void handleModerate(selectedProfile, 'clear_warnings')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 cursor-pointer"
                      >
                        Clear Warnings
                      </button>
                    </>
                  )}

                  <div className="flex items-center gap-1.5">
                    <select
                      value={suspendHours}
                      onChange={(e) => setSuspendHours(Number(e.target.value))}
                      className="rounded-lg border border-white/15 bg-[#07080A] px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value={24}>24 Hours</option>
                      <option value={72}>3 Days</option>
                      <option value={168}>7 Days</option>
                      <option value={720}>30 Days</option>
                    </select>
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => void handleModerate(selectedProfile, 'suspend')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/20 cursor-pointer"
                    >
                      Suspend
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={() => void handleModerate(selectedProfile, 'ban')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/15 px-3.5 py-2 text-xs font-medium text-red-200 hover:bg-red-500/25 cursor-pointer"
                  >
                    <Ban size={13} />
                    Ban User
                  </button>

                  {selectedProfile.moderationStatus !== 'active' && (
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => void handleModerate(selectedProfile, 'unban')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3.5 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25 cursor-pointer"
                    >
                      <UserCheck size={13} />
                      Restore / Unban
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
