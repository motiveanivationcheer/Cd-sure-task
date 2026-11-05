import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, Wallet, LogOut, CheckCircle2, Clock } from 'lucide-react';

interface NavbarProps {
  onOpenWithdraw?: () => void;
  onNavigateAdmin?: () => void;
  showAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenWithdraw, onNavigateAdmin, showAdmin }) => {
  const { d1User, logout, activationStatus } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#0a0e1a]/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#00ff88] flex items-center justify-center shadow-lg shadow-[#00ff88]/20">
            <Zap className="w-6 h-6 text-slate-950 font-black fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">
                CDSure Tasks
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#00ff88]/15 text-[#00ff88] px-2 py-0.5 rounded border border-[#00ff88]/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Paid Daily Tasks Platform</p>
          </div>
        </div>

        {/* User Status and Balances */}
        {d1User && (
          <div className="flex items-center gap-3">
            {/* Activation Pill */}
            <div className="hidden sm:flex items-center">
              {activationStatus === 'active' || d1User.is_activated === 1 ? (
                <div className="flex items-center gap-1.5 text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Earner</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Activation</span>
                </div>
              )}
            </div>

            {/* Balance Pill */}
            {(activationStatus === 'active' || d1User.is_activated === 1) && (
              <button
                onClick={onOpenWithdraw}
                className="flex items-center gap-2 bg-[#0f1526] border border-[#00ff88]/40 hover:border-[#00ff88] transition-all px-3 py-1.5 rounded-xl text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-[#00ff88]/20 text-[#00ff88] flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Balance</div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#00ff88]">
                    ₦{(d1User.balance || 0).toLocaleString()}
                  </div>
                </div>
              </button>
            )}

            {/* Admin Audit Toggle */}
            <button
              onClick={onNavigateAdmin}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-colors ${
                showAdmin
                  ? 'bg-[#00ff88] text-slate-950 border-[#00ff88]'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              Admin Audit
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              title="Log out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {!d1User && (
          <div className="text-xs text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/20 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-[#00ff88]" />
            <span>₦2,000 Activation Fee</span>
          </div>
        )}
      </div>
    </header>
  );
};
