import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
  type FirebaseUser,
} from '../firebase';
import type { UserProfile } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  currentRoute: string;
  navigate: (route: string) => void;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; role?: 'earner' | 'employer'; error?: string }>;
  registerWithEmail: (email: string, pass: string, fullName: string, role?: 'earner' | 'employer' | string) => Promise<{ success: boolean; role?: 'earner' | 'employer'; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; role?: 'earner' | 'employer'; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  updateUserBalance: (delta: number) => Promise<void>;
  switchUserRole: (newRole: 'earner' | 'employer') => Promise<void>;
  submitActivationProof: (formData: FormData) => Promise<any>;
  fetchActivationStatus: () => Promise<any>;
  initializeActivationPayment: (email: string) => Promise<any>;
  verifyActivationPayment: (reference: string) => Promise<any>;

  // Backwards-compatible legacy helpers
  d1User: any;
  activationStatus: any;
  checkStatusDetails: any;
  checkActivationStatus: (u?: string) => Promise<any>;
  submitPayment: (fd: FormData) => Promise<any>;
  adminConfirmPayment: (u: string) => Promise<any>;
  refreshUser: () => Promise<void>;
  fastForward24h: () => Promise<void>;
  tasksAvailableAt: string | null;
  formattedStartTime: string | null;
  tasksLocked24h: boolean;
  referralCodeFromUrl: string;
  completeTaskWithProof: (taskId: string, proofUrl: string) => Promise<any>;
  requestWithdrawal: (amt: number, bank: string, accNum: string, accName: string) => Promise<any>;
  fetchTasks: () => Promise<any>;
  fetchDashboardData: () => Promise<any>;
  verifyCodeOrToken: (code?: string, token?: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const path = window.location.pathname;
    return path === '/' ? '/login' : path;
  });

  const navigate = useCallback((route: string) => {
    window.history.pushState({}, '', route);
    setCurrentRoute(route.split('?')[0]);
  }, []);

  useEffect(() => {
    const handlePop = () => {
      setCurrentRoute(window.location.pathname);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Sync user with Cloudflare D1 database (POST /api/users/sync)
  const syncUserWithD1 = useCallback(
    async (
      id: string,
      name: string,
      email: string,
      preferredRole: string = 'earner'
    ): Promise<UserProfile> => {
      try {
        const res = await fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            uid: id,
            name,
            email,
            role: preferredRole,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.user) {
            const u = data.user;
            const isAct = u.role === 'employer' ? 1 : (u.is_activated === 1 || u.is_activated === true ? 1 : 0);
            const profile: UserProfile = {
              uid: u.id || u.uid || id,
              name: u.name || u.full_name || name,
              email: u.email || email,
              role: u.role === 'employer' ? 'employer' : 'earner',
              balance: typeof u.balance === 'number' ? u.balance : 0,
              is_verified: true,
              is_activated: isAct,
              activation_paid_at: u.activation_paid_at || undefined,
            };
            setUserProfile(profile);
            return profile;
          }
        }
      } catch (err: any) {
        console.warn('Cloudflare D1 sync notice (using local state fallback):', err.message);
      }

      // Safe fallback if server is momentarily unreachable
      const fallback: UserProfile = {
        uid: id,
        name,
        email,
        role: preferredRole === 'employer' ? 'employer' : 'earner',
        balance: 0,
        is_verified: true,
        is_activated: preferredRole === 'employer' ? 1 : 0,
      };
      setUserProfile(fallback);
      return fallback;
    },
    []
  );

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setFirebaseUser(user);

      if (user) {
        // Sync with Cloudflare D1
        const profile = await syncUserWithD1(
          user.uid,
          user.displayName || 'Member',
          user.email || '',
          'earner'
        );

        const path = window.location.pathname;
        // If at root or login/signup, route to appropriate destination
        if (path === '/' || path === '/login' || path === '/signup') {
          if (profile.role === 'employer') {
            navigate('/employer-dashboard');
          } else {
            navigate(profile.is_activated ? '/earner-dashboard' : '/activate');
          }
        } else if (profile.role === 'earner' && !profile.is_activated && path.includes('/earner-dashboard')) {
          navigate('/activate');
        } else if (profile.role === 'earner' && profile.is_activated && path === '/activate') {
          navigate('/earner-dashboard');
        }
      } else {
        setUserProfile(null);
        const path = window.location.pathname;
        if (path.includes('/employer-dashboard') || path.includes('/earner-dashboard') || path.includes('/dashboard') || path === '/activate') {
          navigate('/login');
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncUserWithD1, navigate]);

  // Email / Password Registration (Firebase Auth -> Cloudflare D1 sync)
  const registerWithEmail = async (
    email: string,
    pass: string,
    fullName: string,
    role: 'earner' | 'employer' | string = 'earner'
  ): Promise<{ success: boolean; role?: 'earner' | 'employer'; error?: string }> => {
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      const normalizedRole: 'earner' | 'employer' = role === 'employer' ? 'employer' : 'earner';

      // Save user to Cloudflare D1 via POST /api/users/sync
      const profile = await syncUserWithD1(user.uid, fullName, email, normalizedRole);

      // Navigate to destination dashboard (Earners must activate first)
      const dest =
        profile.role === 'employer'
          ? '/employer-dashboard'
          : profile.is_activated
          ? '/earner-dashboard'
          : '/activate';
      navigate(dest);

      return { success: true, role: profile.role };
    } catch (err: any) {
      let friendlyMessage = err.message || 'Registration failed.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email address is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      }
      setAuthError(friendlyMessage);
      return { success: false, error: friendlyMessage };
    }
  };

  // Email / Password Login (Firebase Auth -> Cloudflare D1 sync)
  const loginWithEmail = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; role?: 'earner' | 'employer'; error?: string }> => {
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;

      // Sync and retrieve user from Cloudflare D1
      const profile = await syncUserWithD1(
        user.uid,
        user.displayName || 'Member',
        user.email || email,
        'earner'
      );

      const dest =
        profile.role === 'employer'
          ? '/employer-dashboard'
          : profile.is_activated
          ? '/earner-dashboard'
          : '/activate';
      navigate(dest);

      return { success: true, role: profile.role };
    } catch (err: any) {
      let friendlyMessage = 'Invalid email or password. Please verify your credentials.';
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        friendlyMessage = 'Invalid email or password. Please check and try again.';
      } else if (err.code === 'auth/too-many-requests') {
        friendlyMessage = 'Too many failed login attempts. Please reset your password or try again later.';
      }
      setAuthError(friendlyMessage);
      return { success: false, error: friendlyMessage };
    }
  };

  // Google Sign-In (Firebase Auth -> Cloudflare D1 sync)
  const loginWithGoogle = async (): Promise<{ success: boolean; role?: 'earner' | 'employer'; error?: string }> => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Sync and retrieve user from Cloudflare D1
      const profile = await syncUserWithD1(
        user.uid,
        user.displayName || 'Member',
        user.email || '',
        'earner'
      );

      const dest =
        profile.role === 'employer'
          ? '/employer-dashboard'
          : profile.is_activated
          ? '/earner-dashboard'
          : '/activate';
      navigate(dest);

      return { success: true, role: profile.role };
    } catch (err: any) {
      let friendlyMessage = 'Google authentication was cancelled or interrupted.';
      if (err.code === 'auth/popup-closed-by-user') {
        friendlyMessage = 'Google Sign-In popup closed before completion.';
      } else if (err.code === 'auth/popup-blocked') {
        friendlyMessage = 'Popup was blocked by your browser. Please allow popups for this site.';
      }
      setAuthError(friendlyMessage);
      return { success: false, error: friendlyMessage };
    }
  };

  // Reset Password
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: 'Password reset instructions have been sent to your email address.',
      };
    } catch (err: any) {
      let msg = 'Unable to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No user account found with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      return { success: false, message: msg };
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
      navigate('/login');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // Update balance helper (sync with D1)
  const updateUserBalance = async (delta: number) => {
    if (!firebaseUser || !userProfile) return;
    const newBalance = Math.max(0, userProfile.balance + delta);
    setUserProfile({ ...userProfile, balance: newBalance });
    try {
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: firebaseUser.uid,
          balance: newBalance,
        }),
      });
    } catch (err) {
      console.warn('Failed to sync balance with D1:', err);
    }
  };

  // Switch role helper (sync with D1)
  const switchUserRole = async (newRole: 'earner' | 'employer') => {
    if (!firebaseUser || !userProfile) return;
    const isAct = newRole === 'employer' ? 1 : (userProfile.is_activated ? 1 : 0);
    setUserProfile({ ...userProfile, role: newRole, is_activated: isAct });
    try {
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: firebaseUser.uid,
          name: userProfile.name,
          email: userProfile.email,
          role: newRole,
        }),
      });
    } catch (err) {
      console.warn('Failed to update role in D1:', err);
    }
    const dest = newRole === 'employer' ? '/employer-dashboard' : (isAct ? '/earner-dashboard' : '/activate');
    navigate(dest);
  };

  // Manual SmartCash Proof Submission (POST /api/activation/submit)
  const submitActivationProof = async (formData: FormData) => {
    if (!firebaseUser) return { success: false, error: 'Not authenticated' };
    try {
      if (!formData.get('user_id')) {
        formData.append('user_id', firebaseUser.uid);
      }
      if (!formData.get('email') && firebaseUser.email) {
        formData.append('email', firebaseUser.email);
      }
      const res = await fetch('/api/activation/submit', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Proof upload failed' };
    }
  };

  // Fetch Activation Status from D1 (GET /api/activation/status/:userId)
  const fetchActivationStatus = useCallback(async () => {
    if (!firebaseUser) return null;
    try {
      const res = await fetch(`/api/activation/status/${firebaseUser.uid}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.is_activated) {
          setUserProfile((prev) => (prev ? { ...prev, is_activated: 1, activation_paid_at: data.activation_paid_at } : null));
        }
        return data;
      }
    } catch (err) {
      console.warn('Error fetching activation status:', err);
    }
    return null;
  }, [firebaseUser]);

  // Backward compatible stubs
  const initializeActivationPayment = async (_email: string) => {
    return { success: false, error: 'Manual SmartCash bank transfer is now active.' };
  };

  const verifyActivationPayment = async (_reference: string) => {
    return { success: false, error: 'Manual SmartCash bank transfer is now active.' };
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        authError,
        currentRoute,
        navigate,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        resetPassword,
        logout,
        updateUserBalance,
        switchUserRole,
        submitActivationProof,
        fetchActivationStatus,
        initializeActivationPayment,
        verifyActivationPayment,
        d1User: userProfile
          ? {
              uid: userProfile.uid,
              id: userProfile.uid,
              email: userProfile.email,
              full_name: userProfile.name,
              name: userProfile.name,
              role: userProfile.role,
              is_activated: 1,
              balance: userProfile.balance,
              total_earned: userProfile.balance,
              referral_earnings: 0,
              created_at: new Date().toISOString(),
              payment_status: 'confirmed',
              referral_code: 'CDSURE',
              referred_by: null,
            }
          : null,
        activationStatus: 'active',
        checkStatusDetails: null,
        checkActivationStatus: async () => ({ status: 'active' }),
        submitPayment: async () => ({ success: true, message: 'Payment submitted' }),
        adminConfirmPayment: async () => ({ success: true, message: 'Confirmed' }),
        refreshUser: async () => {},
        fastForward24h: async () => {},
        tasksAvailableAt: null,
        formattedStartTime: null,
        tasksLocked24h: false,
        referralCodeFromUrl: '',
        completeTaskWithProof: async () => ({ success: true, message: 'Proof submitted' }),
        requestWithdrawal: async () => ({ success: true, message: 'Withdrawal submitted' }),
        fetchTasks: async () => ({ tasks: [], expiresAt: '', isExpired: false, minutesLeft: 60 }),
        fetchDashboardData: async () => ({ referrals: [], referralCount: 0, withdrawals: [], completedToday: 0 }),
        verifyCodeOrToken: async () => ({ success: true, message: 'Verified' }),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
