import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, User, Mail, Lock, Check, AlertCircle, ShieldCheck } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const { registerWithEmail, loginWithGoogle, navigate, authError } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'earner' | 'employer'>('earner');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!fullName.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await registerWithEmail(email.trim(), password, fullName.trim(), role);
      if (!res.success) {
        setLocalError(res.error || 'Could not create your account. Please try again.');
      }
    } catch (_err) {
      setLocalError('CDSure Tasks could not connect. Please check your internet and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLocalError(null);
    setGoogleSubmitting(true);
    try {
      const res = await loginWithGoogle(role);
      if (!res.success) {
        setLocalError(res.error || 'Could not complete Google sign-up. Please try again.');
      }
    } catch (_err) {
      setLocalError('CDSure Tasks could not connect. Please check your internet.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 selection:bg-[#7C3AED] selection:text-white">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-10 h-10 rounded-2xl bg-[#7C3AED] flex items-center justify-center shadow-md shadow-purple-600/25">
            <Check className="w-6 h-6 text-white stroke-[3]" />
          </div>
          <span className="text-2xl font-black text-[#0f172a] tracking-tight">
            CDSure <span className="text-[#7C3AED]">Tasks</span>
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Paid Daily Tasks & Micro-Job Platform
        </p>
      </div>

      {/* Main White Card */}
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-100">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create your CDSure Tasks account
          </p>
        </div>

        {/* Error Alert */}
        {(localError || authError) && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span className="leading-relaxed">{localError || authError}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sanni Lasisi"
                required
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0f172a] placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] focus:bg-white focus:ring-2 focus:ring-[#7C3AED]/15 transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                required
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0f172a] placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] focus:bg-white focus:ring-2 focus:ring-[#7C3AED]/15 transition-all"
              />
            </div>
          </div>

          {/* Password with Show/Hide Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-11 py-2.5 text-sm text-[#0f172a] placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] focus:bg-white focus:ring-2 focus:ring-[#7C3AED]/15 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Must be at least 6 characters</p>
          </div>

          {/* Role Selector: Earner vs Employer */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              I want to:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole('earner')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  role === 'earner'
                    ? 'border-[#7C3AED] bg-purple-50/70 text-[#7C3AED] shadow-sm ring-1 ring-[#7C3AED]'
                    : 'border-slate-200 bg-[#f8fafc] text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-bold">Earn Money</span>
                <span className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  (Earner)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('employer')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  role === 'employer'
                    ? 'border-[#7C3AED] bg-purple-50/70 text-[#7C3AED] shadow-sm ring-1 ring-[#7C3AED]'
                    : 'border-slate-200 bg-[#f8fafc] text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-bold">Hire Workers</span>
                <span className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  (Employer)
                </span>
              </button>
            </div>
          </div>

          {/* Sign Up Button (Purple #7C3AED) */}
          <button
            type="submit"
            disabled={submitting || googleSubmitting}
            className="w-full mt-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 active:scale-[0.99] transition-all disabled:opacity-60"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating your account...</span>
              </div>
            ) : (
              <span>Sign Up</span>
            )}
          </button>

          {/* Under button security trust badge */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-2 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secured by CDSure Tasks</span>
          </div>
        </form>

        {/* Divider OR */}
        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-xs font-semibold text-slate-400 tracking-wider">
            OR
          </span>
        </div>

        {/* Continue with Google Button */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={submitting || googleSubmitting}
          className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2.5 text-xs shadow-sm hover:shadow transition-all disabled:opacity-60"
        >
          {googleSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              <span>Creating your account with Google...</span>
            </div>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Link to Login */}
        <div className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[#7C3AED] font-bold hover:underline"
          >
            Login
          </button>
        </div>
      </div>

      {/* Footer text */}
      <p className="mt-6 text-center text-xs text-slate-400">
        © 2026 CDSure — Paid Daily Tasks Platform
      </p>
    </div>
  );
};
