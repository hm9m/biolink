import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { ArrowLeft, ExternalLink, Eye, EyeOff, KeyRound, Mail, RefreshCw } from 'lucide-react';
import { PlatformLogo } from '@/src/components/BrandIcons';
import { auth } from '@/src/lib/firebase';

interface AuthPanelProps {
  user: User | null;
  emailVerified: boolean;
  pendingClaimHandle?: string;
  onGoogleSignIn: () => Promise<void>;
  onVerificationRefreshed: () => Promise<void>;
  onForgotPassword: () => void;
}

type AuthMode = 'signin' | 'signup';

function mapFirebaseAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
    return 'Incorrect email or password.';
  }
  if (raw.includes('auth/user-not-found')) {
    return 'No account found with that email address.';
  }
  if (raw.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (raw.includes('auth/weak-password')) {
    return 'Password must be at least 6 characters long.';
  }
  if (raw.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (raw.includes('auth/operation-not-allowed')) {
    return 'Email/Password authentication is not enabled in Firebase Console yet. Enable it under Authentication → Sign-in method.';
  }
  if (raw.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (raw.includes('auth/popup-closed-by-user')) {
    return 'Google sign-in popup was closed.';
  }
  return raw || 'Authentication failed. Please try again.';
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  user,
  emailVerified,
  pendingClaimHandle,
  onGoogleSignIn,
  onVerificationRefreshed,
  onForgotPassword,
}) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // User can trigger resend from the verification screen
        }
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user || busy) return;
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await sendEmailVerification(user);
      setInfo(`Verification email resent to ${user.email || 'your inbox'}.`);
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshVerification = async () => {
    if (!user || busy) return;
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await onVerificationRefreshed();
      if (!auth.currentUser?.emailVerified) {
        setInfo('Email is not verified yet. Click the link in your inbox, then check again.');
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  if (user && !emailVerified) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <div className="rounded-xl border border-white/12 bg-[#0B0D12] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-white">
            <Mail size={20} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-white">Verify your email</h1>
          <p className="mt-2 text-sm text-zinc-400">
            We sent a verification link to{' '}
            <span className="font-mono text-zinc-200">{user.email}</span>. Verify your email to
            unlock profile creation and editing.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-300 text-left">
              {error}
            </div>
          )}
          {info && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-300 text-left">
              {info}
            </div>
          )}

          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRefreshVerification()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#07080A] hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
              I&apos;ve Verified — Continue
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleResendVerification()}
              className="w-full rounded-lg border border-white/15 bg-[#07080A] px-4 py-2.5 text-xs font-medium text-zinc-200 hover:border-white/30 hover:text-white disabled:opacity-50 cursor-pointer"
            >
              Resend Verification Email
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void signOut(auth)}
              className="w-full rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
            >
              Sign out &amp; use another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-xl border border-white/12 bg-[#0B0D12] p-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-white">
            {mode === 'signup' ? 'Create your account' : 'Sign in to hightier.lol'}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            {pendingClaimHandle
              ? `Sign in to claim hightier.lol/${pendingClaimHandle} and customize your bio.`
              : 'Use your email and password or continue with Google.'}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-[#07080A] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError('');
              setInfo('');
            }}
            className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'signin' ? 'bg-white text-[#07080A]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
              setInfo('');
            }}
            className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'signup' ? 'bg-white text-[#07080A]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={(e) => void handleEmailSubmit(e)} className="mt-5 space-y-3.5">
          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-zinc-300">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-zinc-300">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/15 bg-[#07080A] py-2.5 pr-10 pl-3.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="block text-xs font-medium text-zinc-300"
              >
                Confirm Password
              </label>
              <input
                id="auth-confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={6}
                disabled={busy}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#07080A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-300">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#07080A] transition-colors hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
          >
            <KeyRound size={15} />
            {busy
              ? 'Please wait...'
              : mode === 'signup'
                ? 'Create Account'
                : 'Sign In with Email'}
          </button>

          {mode === 'signin' && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="w-full rounded-lg border border-white/10 bg-[#07080A] px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white cursor-pointer"
            >
              Forgot Password?
            </button>
          )}
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setError('');
            setInfo('');
            void onGoogleSignIn();
          }}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-white/15 bg-[#07080A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/[0.04] disabled:opacity-50 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 5.04c1.64 0 3.12.56 4.28 1.66l3.2-3.2C17.54 1.7 14.98.64 12 .64 7.58.64 3.76 3.18 1.9 6.88l3.73 2.9C6.52 7.06 9.04 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.16 12.26c0-.82-.07-1.6-.21-2.36H12v4.47h6.25c-.27 1.45-1.08 2.68-2.31 3.5l3.56 2.76c2.08-1.92 3.66-4.74 3.66-8.37z"
            />
            <path
              fill="#FBBC05"
              d="M5.63 14.22A7.15 7.15 0 0 1 5.26 12c0-.77.13-1.52.37-2.22L1.9 6.88A11.35 11.35 0 0 0 .64 12c0 1.83.44 3.56 1.26 5.12l3.73-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23.36c3.24 0 5.96-1.07 7.95-2.91l-3.56-2.76c-1.07.72-2.45 1.15-4.39 1.15-2.96 0-5.48-2.02-6.37-4.74L1.9 17.02C3.76 20.82 7.58 23.36 12 23.36z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
};

export const ForgotPasswordView: React.FC<{ onBackToSignIn: () => void }> = ({
  onBackToSignIn,
}) => {
  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="rounded-xl border border-white/12 bg-[#0B0D12] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#5865F2]/35 bg-[#5865F2]/10">
          <PlatformLogo platform="discord" size={24} />
        </div>
        <h1 className="font-display text-2xl font-semibold text-white">Forgot Your Password?</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
          Join the official <span className="font-medium text-white">hightier.lol</span> Discord
          server and open a support ticket for help recovering or resetting your account password.
        </p>

        <div className="mt-6 space-y-2.5">
          <a
            href="https://discord.gg/GP5JHNd6x"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
          >
            <PlatformLogo platform="discord" size={16} />
            Join the Discord for Help
            <ExternalLink size={14} />
          </a>

          <button
            type="button"
            onClick={onBackToSignIn}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#07080A] px-4 py-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/30 hover:text-white cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
