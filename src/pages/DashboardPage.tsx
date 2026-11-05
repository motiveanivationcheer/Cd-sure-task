import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  TrendingUp,
  Users,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  Clock,
  Sparkles,
  ArrowUpRight,
  Gift,
  Building,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import type { Task, ReferralRecord, WithdrawalRecord } from '../types';
import { WithdrawModal } from '../components/WithdrawModal';
import { TaskSubmissionModal } from '../components/TaskSubmissionModal';
import { Lock, Zap, ShieldCheck } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    d1User,
    fetchTasks,
    fetchDashboardData,
    refreshUser,
    tasksLocked24h,
    tasksAvailableAt,
    formattedStartTime,
    fastForward24h,
  } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isExpired, setIsExpired] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [completedTodayCount, setCompletedTodayCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'tasks' | 'referrals' | 'withdrawals'>('tasks');

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedTaskForSubmission, setSelectedTaskForSubmission] = useState<Task | null>(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [securityLockAlert, setSecurityLockAlert] = useState<string | null>(null);

  // UTC countdown until midnight
  const [countdownStr, setCountdownStr] = useState<string>('');

  // 24-hour cooldown timer
  const [cooldown24hStr, setCooldown24hStr] = useState<string>('');

  const targetUnlockIso = tasksAvailableAt || d1User?.tasks_available_at;

  useEffect(() => {
    if (!targetUnlockIso) {
      setCooldown24hStr('');
      return;
    }

    const update24hTimer = () => {
      const now = new Date().getTime();
      const target = new Date(targetUnlockIso).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCooldown24hStr('00h 00m 00s (Tasks Unlocked!)');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setCooldown24hStr(
          `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
        );
      }
    };

    update24hTimer();
    const interval = setInterval(update24hTimer, 1000);
    return () => clearInterval(interval);
  }, [targetUnlockIso]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const midnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      const diff = midnightUtc.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownStr(`${hours}h ${mins}m ${secs}s`);

      // 1 hour before midnight rule
      if (diff <= 60 * 60 * 1000) {
        setIsExpired(true);
      } else {
        setIsExpired(false);
      }
      setMinutesLeft(Math.max(0, Math.floor(diff / 60000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    if (!d1User?.uid) return;
    const taskRes = await fetchTasks();
    setTasks(taskRes.tasks);
    setIsExpired(taskRes.isExpired);
    setMinutesLeft(taskRes.minutesLeft);

    const dash = await fetchDashboardData();
    setReferrals(dash.referrals);
    setReferralCount(dash.referralCount);
    setWithdrawals(dash.withdrawals);
    setCompletedTodayCount(dash.completedToday);
  };

  useEffect(() => {
    loadData();
  }, [d1User?.uid]);

  const referralCode = d1User?.referral_code || d1User?.uid?.substring(0, 8).toUpperCase() || '';
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `⚡ Earn daily cash completing quick sponsor tasks on CDSure Tasks! Instant bank withdrawals.\n\nJoin with my referral link: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const targetTimeStr = targetUnlockIso
    ? new Date(targetUnlockIso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : 'the same time';

  const fullStartDateTime = formattedStartTime || (targetUnlockIso
    ? `${new Date(targetUnlockIso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${targetTimeStr}`
    : 'Tomorrow');

  const handleTaskClick = (task: Task) => {
    if (tasksLocked24h) {
      setSecurityLockAlert(
        `Admin has confirmed your payment, but you need to wait 24 hours before tasks begin. Your start time is ${fullStartDateTime}.`
      );
      return;
    }
    setSelectedTaskForSubmission(task);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Security Alert Toast if clicked before 24h */}
      {securityLockAlert && (
        <div className="p-4 rounded-2xl bg-amber-950/80 border-2 border-amber-500/60 text-amber-200 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-2xl animate-fade-in">
          <div className="flex items-start gap-2.5">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-white text-sm">Security Verification in Progress</p>
              <p className="mt-1 leading-relaxed">{securityLockAlert}</p>
            </div>
          </div>
          <button
            onClick={() => setSecurityLockAlert(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 shrink-0 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 24-Hour Cooldown Top Banner */}
      {tasksLocked24h && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/40 border-2 border-[#00ff88]/50 text-white space-y-2 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00ff88]/20 text-[#00ff88] text-xs font-bold border border-[#00ff88]/30">
              <ShieldCheck className="w-4 h-4" />
              <span>Payment Confirmed by Admin</span>
            </span>
            <span className="font-mono text-xs font-extrabold text-[#00ff88] bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              Tasks unlock in: {cooldown24hStr || '24h 00m 00s'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-relaxed pt-1">
            "Your payment is confirmed! Your account will be active for tasks after 24 hours. Please come back tomorrow at <span className="text-[#00ff88] font-bold">{targetTimeStr}</span>. This is for security verification."
          </p>
        </div>
      )}

      {/* 1. Header Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="bg-slate-900 border border-[#00ff88]/40 rounded-2xl p-5 relative overflow-hidden shadow-lg shadow-[#00ff88]/10">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#00ff88]">
              Available Balance
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#00ff88]/20 text-[#00ff88] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white tracking-tight">
            ₦{(d1User?.balance || 0).toLocaleString()}
          </div>
          <div className="mt-3">
            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="w-full bg-[#00ff88] hover:bg-[#00b248] text-slate-950 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <span>Withdraw to Bank</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Total Earned */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Total Earned
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white tracking-tight">
            ₦{(d1User?.total_earned || 0).toLocaleString()}
          </div>
          <p className="mt-2 text-xs text-slate-400">Tasks & referral payouts combined</p>
        </div>

        {/* Referral Bonus */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Referral Bonus
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-400 tracking-tight">
            ₦{(d1User?.referral_earnings || 0).toLocaleString()}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {referralCount} friends activated • ₦200 each
          </p>
        </div>

        {/* Today's Tasks */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Today's Tasks
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white tracking-tight">
            {completedTodayCount} <span className="text-slate-500 text-lg font-normal">/ {tasks.length || 4}</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Expires in: <strong className="text-slate-300 font-mono">{countdownStr}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Referral Link Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-[#00ff88]/40 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/20 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Earn ₦200 Per Friend</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Share Your Referral Link
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Whenever a friend registers with your link and activates their CDSure membership,
              you instantly earn <span className="text-[#00ff88] font-bold">₦200 credited to your balance</span>.
            </p>
          </div>

          <div className="w-full lg:w-auto space-y-3 bg-slate-950 border border-slate-800 p-4 rounded-2xl shrink-0 min-w-[320px]">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Your Referral Code</span>
                <span className="font-mono text-[#00ff88] font-bold">{referralCode}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200">
                <span className="truncate flex-1 font-mono text-[11px] text-slate-400">{referralLink}</span>
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 bg-[#00ff88]/20 hover:bg-[#00ff88]/30 text-[#00ff88] rounded-lg transition-colors shrink-0"
                  title="Copy Link"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleCopyCode}
                className="py-2 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="py-2 px-3 rounded-xl bg-[#00ff88] hover:bg-[#00b248] text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-[#00ff88]/20"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'tasks'
              ? 'border-[#00ff88] text-[#00ff88]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Daily Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'referrals'
              ? 'border-[#00ff88] text-[#00ff88]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>My Referrals ({referralCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'withdrawals'
              ? 'border-[#00ff88] text-[#00ff88]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Withdrawals ({withdrawals.length})</span>
        </button>
      </div>

      {/* 1-Hour Expiry Alert Banner */}
      <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm border ${
        isExpired
          ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          : 'bg-slate-900 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-2.5">
          <Clock className={`w-5 h-5 shrink-0 ${isExpired ? 'text-rose-400' : 'text-[#00ff88]'}`} />
          <div>
            <span className="font-bold">
              {isExpired ? 'Task Expired - Come back tomorrow' : 'Daily 1-Hour Expiry Rule:'}
            </span>{' '}
            <span className="text-slate-400">
              {isExpired
                ? 'Tasks closed 1 hour before midnight UTC. Next tasks refresh at 12:00 AM UTC.'
                : 'Submissions must be uploaded at least 1 hour before midnight UTC with screenshot proof.'}
            </span>
          </div>
        </div>
        <div className="font-mono text-xs font-bold text-white shrink-0 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
          {countdownStr}
        </div>
      </div>

      {/* TAB 1: DAILY TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* If 24-Hour Cooldown is Active */}
          {tasksLocked24h && (
            <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 text-center space-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  24-Hour Security Verification in Progress
                </h3>
                <p className="text-xs sm:text-sm text-amber-200/90 max-w-xl mx-auto font-semibold leading-relaxed">
                  "Admin has confirmed your payment, but you need to wait 24 hours before tasks begin. Your start time is <span className="text-[#00ff88] font-bold">{fullStartDateTime}</span>."
                </p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Tasks DO NOT start immediately after payment. This mandatory 24-hour period protects network integrity and verifies sponsor ad campaigns.
                </p>
              </div>

              <div className="py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Countdown to Task Activation
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#00ff88] tracking-widest bg-slate-950 px-5 py-2.5 rounded-xl border border-slate-800 inline-block shadow-inner">
                  {cooldown24hStr || '24h 00m 00s'}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  onClick={async () => {
                    await fastForward24h();
                    await loadData();
                  }}
                  className="px-4 py-2.5 bg-[#00ff88]/15 hover:bg-[#00ff88]/25 text-[#00ff88] font-bold text-xs rounded-xl border border-[#00ff88]/40 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Zap className="w-4 h-4" />
                  <span>Fast-Forward 24h (Admin Test Bypass)</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-5 rounded-2xl border transition-all ${
                  task.completed
                    ? 'bg-slate-950/70 border-slate-800/80 opacity-75'
                    : tasksLocked24h
                    ? 'bg-slate-900/60 border-slate-800/90'
                    : 'bg-slate-900/90 border-slate-800 hover:border-[#00ff88]/40 shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-base">{task.title}</span>
                      {task.completed && (
                        <span className="text-[10px] font-bold text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Submitted
                        </span>
                      )}
                      {tasksLocked24h && !task.completed && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="w-3 h-3" /> 24h Lock
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{task.instructions}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Reward</div>
                    <div className="text-lg font-black text-[#00ff88]">+₦{task.reward}</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {task.completed
                      ? 'Proof recorded'
                      : tasksLocked24h
                      ? `Starts: ${targetTimeStr}`
                      : 'Screenshot proof required'}
                  </span>

                  <button
                    onClick={() => handleTaskClick(task)}
                    disabled={task.completed || isExpired}
                    className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      task.completed
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : isExpired
                        ? 'bg-rose-950/50 text-rose-400 border border-rose-500/30 cursor-not-allowed'
                        : tasksLocked24h
                        ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                        : 'bg-[#00ff88] hover:bg-[#00b248] text-slate-950 shadow-md shadow-[#00ff88]/20 active:scale-95'
                    }`}
                  >
                    {task.completed ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#00ff88]" />
                        <span>Completed Today</span>
                      </>
                    ) : isExpired ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Task Expired</span>
                      </>
                    ) : tasksLocked24h ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Locked: 24h Cooldown</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Submit Proof</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MY REFERRALS */}
      {activeTab === 'referrals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Referral Rewards</h3>
              <p className="text-xs text-slate-400">
                You earn ₦200 automatically whenever an invited user activates their account.
              </p>
            </div>
            <div className="text-xs text-[#00ff88] font-bold bg-[#00ff88]/10 border border-[#00ff88]/20 px-3 py-1.5 rounded-xl">
              Earned: ₦{(referralCount * 200).toLocaleString()}
            </div>
          </div>

          {referrals.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">No Referrals Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Share your link on WhatsApp, Twitter, or Telegram to start earning ₦200 per invite!
              </p>
              <button
                onClick={handleShareWhatsApp}
                className="mt-2 inline-flex items-center gap-2 bg-[#00ff88] hover:bg-[#00b248] text-slate-950 text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg"
              >
                <Share2 className="w-4 h-4" />
                <span>Share on WhatsApp</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Referred Member</th>
                      <th className="py-3 px-4">Bonus</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {referrals.map((ref) => (
                      <tr key={ref.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-medium text-white">
                          {ref.referred_email || ref.referred_name || 'Invited User'}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#00ff88]">+₦{ref.bonus}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(ref.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded-full border border-[#00ff88]/30">
                            Credited ✓
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WITHDRAWAL HISTORY */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Withdrawal Requests</h3>
              <p className="text-xs text-slate-400">
                Direct payouts to OPay, PalmPay, Kuda, Moniepoint, or any Nigerian bank.
              </p>
            </div>
            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="bg-[#00ff88] hover:bg-[#00b248] text-slate-950 text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-md"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>

          {withdrawals.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">No Withdrawals Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Complete daily sponsor tasks to build your balance, then cash out to your bank account!
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Bank / Account</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white">₦{w.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-300">
                          {w.bank_name || 'Bank'} {w.account_number ? `(${w.account_number})` : ''}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(w.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                            {w.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Proof Submission Modal */}
      <TaskSubmissionModal
        task={selectedTaskForSubmission}
        isOpen={!!selectedTaskForSubmission}
        onClose={() => setSelectedTaskForSubmission(null)}
        onSuccess={() => {
          loadData();
          refreshUser();
        }}
        isExpired={isExpired}
        minutesLeft={minutesLeft}
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={() => {
          loadData();
          refreshUser();
        }}
      />
    </div>
  );
};
