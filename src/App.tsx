import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ActivatePage } from './pages/ActivatePage';
import { EmployerDashboardPage } from './pages/EmployerDashboardPage';
import { EarnerDashboardPage } from './pages/EarnerDashboardPage';
import { AdminActivationsPage } from './pages/AdminActivationsPage';
import { Check } from 'lucide-react';

function AppContent() {
  const { firebaseUser, userProfile, loading, currentRoute } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#7C3AED] flex items-center justify-center shadow-lg shadow-purple-600/30 mb-4 animate-bounce">
          <Check className="w-6 h-6 text-white stroke-[3]" />
        </div>
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-extrabold text-[#0f172a]">CDSure Tasks</p>
        <p className="text-xs text-slate-400 mt-0.5">Connecting to Cloudflare D1...</p>
      </div>
    );
  }

  // Routing with strict Auth Guard and Earner Activation Rule
  const renderPage = () => {
    // Admin Activations Portal
    if (currentRoute === '/admin/activations' || currentRoute === '/admin') {
      return <AdminActivationsPage />;
    }

    // 1. Forgot Password Route
    if (currentRoute === '/forgot-password') {
      return <ForgotPasswordPage />;
    }

    // 2. Signup Route
    if (currentRoute === '/signup') {
      if (firebaseUser) {
        if (userProfile?.role === 'employer') {
          return <EmployerDashboardPage />;
        }
        return userProfile?.is_activated ? <EarnerDashboardPage /> : <ActivatePage />;
      }
      return <SignupPage />;
    }

    // 3. Login Route
    if (currentRoute === '/login') {
      if (firebaseUser) {
        if (userProfile?.role === 'employer') {
          return <EmployerDashboardPage />;
        }
        return userProfile?.is_activated ? <EarnerDashboardPage /> : <ActivatePage />;
      }
      return <LoginPage />;
    }

    // 4. Must be authenticated for all remaining routes
    if (!firebaseUser) {
      return <LoginPage />;
    }

    // 5. Activation Route
    if (currentRoute === '/activate') {
      if (userProfile?.role === 'employer') {
        return <EmployerDashboardPage />;
      }
      if (userProfile?.is_activated) {
        return <EarnerDashboardPage />;
      }
      return <ActivatePage />;
    }

    // 6. Employer Dashboard
    if (currentRoute === '/employer-dashboard' || userProfile?.role === 'employer') {
      return <EmployerDashboardPage />;
    }

    // 7. Earner Dashboard: EARNER MUST BE ACTIVATED
    // If not paid activation, block Earner Dashboard and render Activation Page!
    if (!userProfile?.is_activated) {
      return <ActivatePage />;
    }

    // Default for activated earner
    return <EarnerDashboardPage />;
  };

  return <>{renderPage()}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
