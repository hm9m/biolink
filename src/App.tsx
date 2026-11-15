import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { AdminPanelView } from '@/src/components/AdminPanelView';
import { AuthPanel, ForgotPasswordView } from '@/src/components/AuthPanel';
import { BioView } from '@/src/components/BioView';
import { DiscordStaffBadge, PlatformLogo } from '@/src/components/BrandIcons';
import { DashboardView } from '@/src/components/DashboardView';
import { LandingView } from '@/src/components/LandingView';
import { CORE_BADGES, SHOWCASE_PROFILE } from '@/src/lib/constants';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import {
  checkIsAdmin,
  getProfileByHandle,
  sanitizeHandle,
  subscribeBadges,
  syncPrivateUser,
} from '@/src/lib/firestoreService';
import type { BadgeDefinition, Profile } from '@/src/types/comboss';

type RouteState =
  | { view: 'home' }
  | { view: 'dashboard' }
  | { view: 'admin' }
  | { view: 'forgot-password' }
  | { view: 'bio'; handle: string };

function parsePath(pathname: string): RouteState {
  const clean = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!clean) return { view: 'home' };
  if (clean === 'dashboard') return { view: 'dashboard' };
  if (clean === 'admin') return { view: 'admin' };
  if (clean === 'forgot-password') return { view: 'forgot-password' };
  return { view: 'bio', handle: sanitizeHandle(clean) || '_' };
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#07080A] px-6 text-center text-white">
          <div className="max-w-md rounded-xl border border-white/15 bg-[#0B0D12] p-8">
            <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-xs text-zinc-400 break-words">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="mt-5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#07080A] cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => parsePath(window.location.pathname));
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [ownProfile, setOwnProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [badgeCatalog, setBadgeCatalog] = useState<BadgeDefinition[]>(CORE_BADGES);
  const [pendingClaimHandle, setPendingClaimHandle] = useState('');
  const [authError, setAuthError] = useState('');

  // Public bio route state
  const [bioProfile, setBioProfile] = useState<Profile | null>(null);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioNotFound, setBioNotFound] = useState(false);

  const navigate = (path: string, hash?: string) => {
    window.history.pushState({}, '', path + (hash ? `#${hash}` : ''));
    setRoute(parsePath(path));
    if (hash) {
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0 });
    }
  };

  useEffect(() => {
    const onPop = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setEmailVerified(Boolean(nextUser?.emailVerified));
      setAuthReady(true);
      if (nextUser && nextUser.emailVerified) {
        try {
          await syncPrivateUser(nextUser);
          setIsAdmin(checkIsAdmin(nextUser));
        } catch (err) {
          console.error(err);
        }
      } else {
        setIsAdmin(false);
        setOwnProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // Own profile realtime subscription
  useEffect(() => {
    if (!authReady || !user) return;
    const path = `profiles/${user.uid}`;
    const unsub = onSnapshot(
      doc(db, 'profiles', user.uid),
      (snap) => {
        setOwnProfile(snap.exists() ? (snap.data() as Profile) : null);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return () => unsub();
  }, [authReady, user]);

  // Badge catalog subscription
  useEffect(() => {
    const unsubBadges = subscribeBadges(setBadgeCatalog);
    return () => {
      unsubBadges();
    };
  }, []);

  // Resolve public bio page when route.view === 'bio'
  useEffect(() => {
    if (route.view !== 'bio') return;
    let cancelled = false;
    setBioLoading(true);
    setBioNotFound(false);

    void getProfileByHandle(route.handle)
      .then((found) => {
        if (cancelled) return;
        if (found) {
          setBioProfile(found);
          setBioNotFound(false);
        } else if (route.handle === '_') {
          setBioProfile(SHOWCASE_PROFILE);
          setBioNotFound(false);
        } else {
          setBioProfile(null);
          setBioNotFound(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (route.handle === '_') {
          setBioProfile(SHOWCASE_PROFILE);
          setBioNotFound(false);
        } else {
          setBioNotFound(true);
        }
      })
      .finally(() => {
        if (!cancelled) setBioLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [route]);

  const handleGoogleSignIn = async (redirectAfter = false) => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
      if (redirectAfter) {
        navigate('/dashboard');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in cancelled or failed.');
    }
  };

  const handleRefreshVerification = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const verified = Boolean(auth.currentUser.emailVerified);
    setUser(auth.currentUser);
    setEmailVerified(verified);
    if (verified) {
      await syncPrivateUser(auth.currentUser);
      setIsAdmin(checkIsAdmin(auth.currentUser));
    }
  };

  const handleClaimHandle = (handle: string) => {
    setPendingClaimHandle(handle);
    navigate('/dashboard');
  };

  // Full-screen Public Bio Page
  if (route.view === 'bio') {
    if (bioLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#07080A] font-mono text-xs text-zinc-400">
          Loading hightier.lol/{route.handle}...
        </div>
      );
    }

    if (bioNotFound || !bioProfile) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#07080A] px-6 text-center">
          <h1 className="font-display text-2xl font-semibold text-white">
            @{route.handle} is unclaimed
          </h1>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            No bio profile exists at hightier.lol/{route.handle} yet.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
            >
              Back Home
            </button>
            <button
              type="button"
              onClick={() => handleClaimHandle(route.handle)}
              className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#07080A] hover:bg-zinc-200 cursor-pointer"
            >
              Claim @{route.handle}
            </button>
          </div>
        </div>
      );
    }

    return (
      <ErrorBoundary>
        <BioView
          profile={bioProfile}
          badgeCatalog={badgeCatalog}
          canIncrementView={Boolean(user && user.emailVerified)}
          onNavigateHome={() => navigate('/')}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#07080A] text-[#F2F4F8]">
        {/* Top Bar Contract: 3 zones separated by gap-8 */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07080A]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-6 py-3.5">
            {/* Zone 1: Single text element wordmark */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="font-display text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              hightier.lol
            </button>

            {/* Zone 2: 4–5 concise single-line nav links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
              <button
                type="button"
                onClick={() => navigate('/', 'showcase')}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Showcase
              </button>
              <a
                href="https://discord.gg/GP5JHNd6x"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <PlatformLogo platform="discord" size={14} />
                Discord
              </a>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className={`inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    route.view === 'admin' ? 'text-white' : 'hover:text-white'
                  }`}
                >
                  <DiscordStaffBadge size={15} className="shrink-0" />
                  Admin Panel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/_')}
                  className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Demo Bio
                </button>
              )}
              {user && (
                <button
                  type="button"
                  onClick={() => void signOut(auth).then(() => navigate('/'))}
                  className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </nav>

            {/* Zone 3: Big Dashboard CTA */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="rounded-xl bg-white px-7 py-3 text-base font-bold tracking-tight text-[#07080A] shadow-lg shadow-white/10 transition-all hover:scale-[1.02] hover:bg-zinc-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Dashboard
              </button>
            </div>
          </div>
        </header>

        {authError && (
          <div className="mx-auto mt-4 max-w-[1280px] px-6">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
              {authError}
            </div>
          </div>
        )}

        {/* Mobile Quick Sub-Nav */}
        <div className="flex items-center gap-4 overflow-x-auto border-b border-white/10 px-6 py-2.5 text-xs text-zinc-400 md:hidden">
          <button type="button" onClick={() => navigate('/')} className="whitespace-nowrap hover:text-white">
            Home
          </button>
          <a
            href="https://discord.gg/GP5JHNd6x"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 whitespace-nowrap text-zinc-300 hover:text-white"
          >
            <PlatformLogo platform="discord" size={12} />
            Discord
          </a>
          <button type="button" onClick={() => navigate('/_')} className="whitespace-nowrap hover:text-white">
            Demo Bio
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="whitespace-nowrap hover:text-white">
            Dashboard
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1 whitespace-nowrap hover:text-white"
            >
              <DiscordStaffBadge size={13} className="shrink-0" />
              Admin Panel
            </button>
          )}
          {user && (
            <button
              type="button"
              onClick={() => void signOut(auth).then(() => navigate('/'))}
              className="whitespace-nowrap hover:text-white"
            >
              Sign Out
            </button>
          )}
        </div>

        {route.view === 'home' && (
          <LandingView
            badgeCatalog={badgeCatalog}
            isSignedIn={Boolean(user)}
            hasOwnProfile={Boolean(ownProfile)}
            onClaimHandle={handleClaimHandle}
            onOpenBio={(h) => navigate(`/${h}`)}
            onSignIn={() => navigate('/dashboard')}
            onGoDashboard={() => navigate('/dashboard')}
          />
        )}

        {route.view === 'dashboard' && (
          <>
            {!authReady ? (
              <div className="py-24 text-center font-mono text-xs text-zinc-400">
                Initializing session...
              </div>
            ) : !user || !emailVerified ? (
              <AuthPanel
                user={user}
                emailVerified={emailVerified}
                pendingClaimHandle={pendingClaimHandle}
                onGoogleSignIn={() => handleGoogleSignIn(false)}
                onVerificationRefreshed={handleRefreshVerification}
                onForgotPassword={() => navigate('/forgot-password')}
              />
            ) : (
              <DashboardView
                user={user}
                profile={ownProfile}
                isAdmin={isAdmin}
                badgeCatalog={badgeCatalog}
                pendingClaimHandle={pendingClaimHandle}
                onProfileCreated={(created) => setOwnProfile(created)}
                onOpenBio={(h) => navigate(`/${h}`)}
              />
            )}
          </>
        )}

        {route.view === 'forgot-password' && (
          <ForgotPasswordView onBackToSignIn={() => navigate('/dashboard')} />
        )}

        {route.view === 'admin' && (
          <>
            {!authReady ? (
              <div className="py-24 text-center font-mono text-xs text-zinc-400">
                Checking permissions...
              </div>
            ) : !user || !isAdmin ? (
              <div className="mx-auto max-w-md px-6 py-24 text-center">
                <div className="rounded-xl border border-white/12 bg-[#0B0D12] p-8">
                  <h1 className="font-display text-xl font-semibold text-white">
                    Staff Access Required
                  </h1>
                  <p className="mt-2 text-sm text-zinc-400">
                    The Admin Panel is restricted to verified hightier.lol owners and staff
                    moderators.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="mt-6 rounded-lg border border-white/15 px-4 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
                  >
                    Return Home
                  </button>
                </div>
              </div>
            ) : (
              <AdminPanelView
                user={user}
                badgeCatalog={badgeCatalog}
                onOpenBio={(h) => navigate(`/${h}`)}
              />
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
