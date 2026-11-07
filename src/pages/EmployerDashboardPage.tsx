import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  Check,
  Bell,
  X,
  Plus,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Briefcase,
  Users,
  LogOut,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Clock,
  Layers,
  FileCheck,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

interface EmployerTask {
  id: string;
  title: string;
  category: string;
  reward: number; // Gross price
  workersNeeded: number;
  workersDone: number;
  deadline: string;
  instructions: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
}

interface ConfirmModalState {
  title: string;
  gross: number;
  fee: number;
  net: number;
  recipientText: string;
  onConfirm: () => Promise<void> | void;
  isSubmitting?: boolean;
}

export const EmployerDashboardPage: React.FC = () => {
  const {
    userProfile,
    logout,
    switchUserRole,
    navigate,
    depositToWallet,
    withdrawFromWallet,
    fetchWalletData,
  } = useAuth();

  // Tasks state
  const [tasks, setTasks] = useState<EmployerTask[]>(() => {
    const saved = localStorage.getItem('cdsure_employer_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 't-1',
        title: 'Subscribe to YouTube & Like 3 Recent Videos',
        category: 'Social Media',
        reward: 1200,
        workersNeeded: 50,
        workersDone: 14,
        deadline: '2 days left',
        instructions: 'Subscribe to our YouTube channel, watch 2 minutes and like 3 videos.',
        status: 'active',
      },
      {
        id: 't-2',
        title: 'Download App & Leave a 5-Star Play Store Review',
        category: 'App Testing',
        reward: 2500,
        workersNeeded: 30,
        workersDone: 28,
        deadline: '1 day left',
        instructions: 'Download app, test for 5 minutes, give 5 stars and helpful comment.',
        status: 'active',
      },
    ];
  });

  // Submissions state
  const [submissions, setSubmissions] = useState<any[]>(() => {
    const saved = localStorage.getItem('cdsure_submissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'sub-1',
        workerName: 'Adeola Johnson',
        taskTitle: 'Download App & Leave a 5-Star Play Store Review',
        proofLink: 'https://play.google.com/review?id=8382',
        submittedAt: '10 mins ago',
        reward: 2500,
      },
    ];
  });

  // Wallet and transactions state
  const [walletStats, setWalletStats] = useState<{
    balance: number;
    total_deposited: number;
    total_fees_paid: number;
  }>({
    balance: userProfile?.balance || 0,
    total_deposited: 0,
    total_fees_paid: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);

  // Navigation Modals
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [postTaskModalOpen, setPostTaskModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Wallet Modal Sub-Tab: 'overview' | 'deposit' | 'withdraw'
  const [walletTab, setWalletTab] = useState<'overview' | 'deposit' | 'withdraw'>('overview');

  // Confirmation Popup State (30% Platform Charge confirmation modal)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  // Deposit Form
  const [depositAmountInput, setDepositAmountInput] = useState<string>('10000');
  const [depositSubmitting, setDepositSubmitting] = useState<boolean>(false);

  // Withdraw Form
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<string>('20000');
  const [withdrawBank, setWithdrawBank] = useState<string>('SmartCash');
  const [withdrawAccount, setWithdrawAccount] = useState<string>('8024138981');
  const [withdrawAccountName, setWithdrawAccountName] = useState<string>('USMAN ABDULLAHI');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState<boolean>(false);

  // Post Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('Social Media');
  const [taskReward, setTaskReward] = useState('1500');
  const [taskWorkers, setTaskWorkers] = useState('20');
  const [taskInstructions, setTaskInstructions] = useState('');

  // Toast / feedback message
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // 30% Fee Calculation Helper (Formula: Fee = Amount * 0.30, Net = Amount - Fee)
  const getFeeBreakdown = (amount: number) => {
    const gross = Math.max(0, Math.round(Number(amount || 0) * 100) / 100);
    const fee = Math.round(gross * 0.30 * 100) / 100;
    const net = Math.round((gross - fee) * 100) / 100;
    return { gross, fee, net };
  };

  // Load wallet data and transactions from backend
  const loadWallet = async () => {
    if (userProfile?.uid) {
      try {
        const res = await fetchWalletData(userProfile.uid);
        if (res && res.wallet) {
          setWalletStats({
            balance: res.wallet.balance || 0,
            total_deposited: res.wallet.total_deposited || 0,
            total_fees_paid: res.wallet.total_fees_paid || 0,
          });
          if (res.transactions) {
            setTransactions(res.transactions);
          }
        }
      } catch (e) {
        console.warn('Could not load wallet data:', e);
      }
    }
  };

  useEffect(() => {
    loadWallet();
  }, [userProfile?.uid]);

  // Persist tasks & submissions
  useEffect(() => {
    localStorage.setItem('cdsure_employer_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('cdsure_submissions', JSON.stringify(submissions));
  }, [submissions]);

  // 1. DEPOSIT FLOW (EMPLOYER) - 30% CDSure Platform Charge
  const handleInitiateDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(depositAmountInput);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid deposit amount', 'error');
      return;
    }

    const { gross, fee, net } = getFeeBreakdown(amountNum);

    // Open Confirm Popup
    setConfirmModal({
      title: 'Confirm Escrow Deposit',
      gross,
      fee,
      net,
      recipientText: 'Your Escrow Wallet will receive',
      onConfirm: async () => {
        setDepositSubmitting(true);
        try {
          const res = await depositToWallet(gross, 'employer');
          if (res && res.success) {
            showToast(`Deposit successful! ₦${fee.toLocaleString()} (30% CDSure fee) deducted. ₦${net.toLocaleString()} credited to your wallet.`);
            setConfirmModal(null);
            setDepositAmountInput('10000');
            await loadWallet();
          } else {
            showToast(res?.error || 'Deposit failed. Please try again.', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'Deposit failed', 'error');
        } finally {
          setDepositSubmitting(false);
        }
      },
    });
  };

  // 2. WITHDRAWAL FLOW (EMPLOYER) - 30% CDSure Platform Charge
  const handleInitiateWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmountInput);
    if (isNaN(amountNum) || amountNum < 500) {
      showToast('Minimum withdrawal amount is ₦500', 'error');
      return;
    }

    const currentBal = userProfile?.balance || walletStats.balance || 0;
    if (currentBal < amountNum) {
      showToast(`Insufficient balance. You have ₦${currentBal.toLocaleString()} in wallet, but ₦${amountNum.toLocaleString()} is required.`, 'error');
      return;
    }

    const { gross, fee, net } = getFeeBreakdown(amountNum);

    // Open Confirm Popup
    setConfirmModal({
      title: 'Confirm Employer Withdrawal',
      gross,
      fee,
      net,
      recipientText: 'Your Bank will receive',
      onConfirm: async () => {
        setWithdrawSubmitting(true);
        try {
          const res = await withdrawFromWallet(
            gross,
            'employer',
            withdrawBank,
            withdrawAccount,
            withdrawAccountName
          );
          if (res && res.success) {
            showToast(`Withdrawal submitted! ₦${fee.toLocaleString()} (30% CDSure fee) deducted. ₦${net.toLocaleString()} sent to ${withdrawBank}.`);
            setConfirmModal(null);
            setWithdrawAmountInput('10000');
            await loadWallet();
          } else {
            showToast(res?.error || 'Withdrawal failed. Please check your balance.', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'Withdrawal failed', 'error');
        } finally {
          setWithdrawSubmitting(false);
        }
      },
    });
  };

  // 3. POST TASK FLOW - 30% Platform Charge Breakdown
  const handleInitiateCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const rewardNum = parseFloat(taskReward) || 1000;
    const workersNum = parseInt(taskWorkers, 10) || 10;
    const totalBudget = rewardNum * workersNum;
    const { gross, fee, net } = getFeeBreakdown(totalBudget);

    // Confirm popup before publishing
    setConfirmModal({
      title: 'Confirm Task Creation & Escrow Budget',
      gross,
      fee,
      net,
      recipientText: 'Workers Will Receive (Total Net)',
      onConfirm: async () => {
        const newTask: EmployerTask = {
          id: 't-' + Date.now(),
          title: taskTitle.trim(),
          category: taskCategory,
          reward: rewardNum,
          workersNeeded: workersNum,
          workersDone: 0,
          deadline: '3 days left',
          instructions: taskInstructions || 'Follow all stated steps and provide verifiable screenshot.',
          status: 'active',
        };

        setTasks([newTask, ...tasks]);
        setPostTaskModalOpen(false);
        setConfirmModal(null);
        setTaskTitle('');
        setTaskInstructions('');

        try {
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employer_id: userProfile?.uid || 'emp-demo',
              title: newTask.title,
              description: newTask.instructions,
              category: newTask.category,
              price: newTask.reward,
              deadline: newTask.deadline,
            }),
          });
        } catch (_err) {}

        showToast(`Task published! CDSure 30% platform fee: ₦${fee.toLocaleString()}. Net worker reward pool: ₦${net.toLocaleString()}.`);
        await loadWallet();
      },
    });
  };

  // 4. APPROVE WORKER SUBMISSION FLOW - Single 30% Charge on Employer Side
  const handleApproveSubmission = (sub: any) => {
    const gross = sub.reward || 2500;
    const { fee, net } = getFeeBreakdown(gross);

    // Open Confirm Popup
    setConfirmModal({
      title: 'Approve Submission & Release Payout',
      gross,
      fee,
      net,
      recipientText: 'Worker will receive (70% Net)',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/submissions/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submissionId: sub.id,
              employerId: userProfile?.uid || 'emp-demo',
            }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setSubmissions(submissions.filter((s) => s.id !== sub.id));
            setConfirmModal(null);
            showToast(`Submission approved! ₦${fee.toLocaleString()} (30% CDSure fee) deducted. Worker received ₦${net.toLocaleString()} net.`);
            await loadWallet();
          } else {
            // Local state approval fallback
            setSubmissions(submissions.filter((s) => s.id !== sub.id));
            setConfirmModal(null);
            showToast(`Submission approved! Worker received ₦${net.toLocaleString()} net (₦${fee.toLocaleString()} 30% fee deducted).`);
          }
        } catch (_err) {
          setSubmissions(submissions.filter((s) => s.id !== sub.id));
          setConfirmModal(null);
          showToast(`Submission approved! Worker received ₦${net.toLocaleString()} net.`);
        }
      },
    });
  };

  // 5. REJECT SUBMISSION FLOW
  const handleRejectSubmission = async (id: string) => {
    try {
      await fetch('/api/submissions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id }),
      });
    } catch (_err) {}
    setSubmissions(submissions.filter((s) => s.id !== id));
    showToast('Submission rejected.', 'error');
  };

  // 6. CANCEL TASK & REFUND NET (70%) - CDSure keeps 30% fee
  const handleCancelTask = (task: EmployerTask) => {
    const { gross, fee, net } = getFeeBreakdown(task.reward * (task.workersNeeded - task.workersDone));

    setConfirmModal({
      title: 'Cancel Task & Refund Net (70%)',
      gross,
      fee,
      net,
      recipientText: 'Refund to your wallet (Net 70%)',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/tasks/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: task.id,
              employerId: userProfile?.uid || 'emp-demo',
            }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: 'cancelled' } : t)));
            setConfirmModal(null);
            showToast(`Task cancelled. Net ₦${net.toLocaleString()} refunded to your wallet. CDSure retained 30% platform fee (₦${fee.toLocaleString()}).`);
            await loadWallet();
          } else {
            setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: 'cancelled' } : t)));
            setConfirmModal(null);
            showToast(`Task cancelled. Net ₦${net.toLocaleString()} refunded to your wallet.`);
          }
        } catch (_err) {
          setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: 'cancelled' } : t)));
          setConfirmModal(null);
          showToast(`Task cancelled.`);
        }
      },
    });
  };

  const activeTasksCount = tasks.filter((t) => t.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex justify-center selection:bg-[#7C3AED] selection:text-white">
      {/* Mobile-first Container (Max width 420px, Centered) */}
      <div className="w-full max-w-[420px] min-h-screen bg-[#f8fafc] flex flex-col relative pb-10 border-x border-slate-200 shadow-sm">
        {/* 1. HEADER (Top white bar, 52px height) */}
        <header className="h-[52px] bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setSideMenuOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Logo purple square #7C3AED with white checkmark + CDSure bold black */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7C3AED] flex items-center justify-center shadow-sm">
              <Check className="w-4 h-4 text-white stroke-[3]" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-[#0f172a]">
              CDSure
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-[#7C3AED]">
              Employer
            </span>
          </div>

          <button
            type="button"
            onClick={() => switchUserRole('earner')}
            className="text-xs font-bold text-[#7C3AED] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition-colors"
            title="Switch to Earner Mode"
          >
            Worker Mode
          </button>
        </header>

        {/* Global Toast Alert */}
        {feedbackMsg && (
          <div
            className={`mx-4 mt-3 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
              feedbackMsg.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* 2. BALANCE CARD (Dark navy #0f172a) */}
        <div className="mx-4 mt-4 bg-[#0f172a] rounded-[22px] p-5 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center text-lg">
                💰
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                  ESCROW BALANCE
                </p>
                <p className="text-2xl font-extrabold text-white tracking-tight">
                  ₦{(userProfile?.balance ?? walletStats.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadWallet}
              className="w-10 h-10 rounded-full bg-[#1e293b] hover:bg-[#334155] flex items-center justify-center text-slate-300 transition-colors"
              title="Refresh Wallet"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* 30% Policy Indicator */}
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block">Total Deposited</span>
              <span className="font-bold text-slate-200">
                ₦{(walletStats.total_deposited || 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-purple-400 block">Total Fees Paid (30%)</span>
              <span className="font-bold text-purple-300">
                ₦{(walletStats.total_fees_paid || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div
            onClick={() => setWalletModalOpen(true)}
            className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 cursor-pointer hover:text-white transition-colors"
          >
            <span className="font-medium">Tap to open wallet</span>
            <span className="flex items-center gap-1 font-semibold text-[#7C3AED]">
              Deposit • Withdraw (30% Fee)
            </span>
          </div>
        </div>

        {/* 3. POST TASK BUTTON (Full width, #7C3AED) */}
        <div className="mx-4 mt-3.5">
          <button
            type="button"
            onClick={() => setPostTaskModalOpen(true)}
            className="w-full h-[52px] bg-[#7C3AED] hover:bg-[#6D28D9] rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 active:scale-[0.99] transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Post New Task</span>
          </button>
        </div>

        {/* 4. USER CARD */}
        <div
          onClick={() => setAccountModalOpen(true)}
          className="mx-4 mt-3 bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-[#7C3AED] font-extrabold flex items-center justify-center text-sm">
              {(userProfile?.name || 'Sanni Lasisi').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-sm text-[#0f172a] leading-tight">
                {userProfile?.name || 'Sanni Lasisi'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-slate-500 font-medium">
                  Verified Employer Account
                </span>
              </div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {/* 5. TITLE & SUBTITLE */}
        <div className="mx-4 mt-6">
          <h2 className="text-xl font-extrabold text-[#0f172a] tracking-tight">
            Employer Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Manage micro-tasks, review proofs, track escrow, and fund wallet with 30% platform charge.
          </p>
        </div>

        {/* 6. STATS ROW */}
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Active Tasks</p>
            <p className="text-3xl font-black text-[#0f172a] mt-1">{activeTasksCount}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              Currently running
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Submissions</p>
            <p className="text-3xl font-black text-[#7C3AED] mt-1">
              {submissions.length}
            </p>
            <button
              onClick={() => setReviewModalOpen(true)}
              className="text-[11px] text-[#7C3AED] font-bold hover:underline mt-1 block"
            >
              Review now →
            </button>
          </div>
        </div>

        {/* 7. QUICK ACTION BUTTONS */}
        <div className="mx-4 mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setReviewModalOpen(true)}
            className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5 hover:border-slate-300 text-left transition-all shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#7C3AED] flex items-center justify-center shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Review Proofs</p>
              <p className="text-[10px] text-slate-500">{submissions.length} pending</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setWalletModalOpen(true)}
            className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5 hover:border-slate-300 text-left transition-all shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Wallet & Escrow</p>
              <p className="text-[10px] text-slate-500">Fund or withdraw</p>
            </div>
          </button>
        </div>

        {/* 8. LIST OF POSTED TASKS */}
        <div className="mx-4 mt-6">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-bold text-[#0f172a]">Your Posted Tasks</h3>
            <span className="text-xs text-slate-400 font-medium">
              {tasks.length} total
            </span>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => {
              const { fee, net } = getFeeBreakdown(task.reward);
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded-full mb-1">
                        {task.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {task.title}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 block">
                        ₦{task.reward.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Net worker: ₦{net.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress & 30% Charge Notice */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>
                      Progress: <strong className="text-slate-800">{task.workersDone}</strong> / {task.workersNeeded}
                    </span>
                    <span className="font-medium text-amber-600">{task.deadline}</span>
                  </div>

                  {/* Task Status & Refund Action */}
                  <div className="pt-2 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        task.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {task.status}
                    </span>

                    {task.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => handleCancelTask(task)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Cancel & Refund 70%</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONFIRMATION POPUP MODAL (30% Platform Charge) */}
      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl relative animate-fade-in border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#7C3AED] flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="font-extrabold text-lg text-center text-slate-900">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-center text-slate-500 mt-1 font-semibold">
              CDSure will deduct 30% charge. Continue?
            </p>

            {/* Breakdown Box */}
            <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Amount</span>
                <span className="font-bold text-slate-900">
                  ₦{confirmModal.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-purple-700 font-semibold">
                <span>CDSure Charge (30%)</span>
                <span>
                  - ₦{confirmModal.fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-extrabold text-slate-900">
                <span>{confirmModal.recipientText}</span>
                <span className="text-emerald-600 font-black">
                  ₦{confirmModal.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={confirmModal.isSubmitting}
                onClick={() => setConfirmModal(null)}
                className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmModal.isSubmitting}
                onClick={confirmModal.onConfirm}
                className="py-3 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-extrabold text-xs shadow-md shadow-purple-600/25 flex items-center justify-center gap-1.5 transition"
              >
                {confirmModal.isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Confirm & Proceed</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDE NAVIGATION DRAWER */}
      {sideMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSideMenuOpen(false)}
          />
          <div className="relative w-[300px] max-w-[80%] bg-white h-full shadow-2xl flex flex-col z-10 animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
                  <Check className="w-5 h-5 text-white stroke-[3]" />
                </div>
                <span className="font-extrabold text-base text-[#0f172a]">CDSure Tasks</span>
              </div>
              <button
                type="button"
                onClick={() => setSideMenuOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Snippet */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <p className="font-bold text-sm text-[#0f172a]">
                {userProfile?.name || 'Sanni Lasisi'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{userProfile?.email}</p>
              <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] bg-purple-100 px-2 py-0.5 rounded">
                Employer Mode
              </span>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <button
                onClick={() => setSideMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm bg-purple-50 text-[#7C3AED]"
              >
                <Layers className="w-4 h-4" />
                <span>Employer Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setSideMenuOpen(false);
                  setPostTaskModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-4 h-4" />
                <span>Post New Task</span>
              </button>

              <button
                onClick={() => {
                  setSideMenuOpen(false);
                  setReviewModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-700 hover:bg-slate-50"
              >
                <FileCheck className="w-4 h-4" />
                <span>Review Worker Submissions</span>
              </button>

              <button
                onClick={() => {
                  setSideMenuOpen(false);
                  setWalletModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-700 hover:bg-slate-50"
              >
                <Wallet className="w-4 h-4" />
                <span>Wallet & Escrow Funds</span>
              </button>

              <div className="my-2 border-t border-slate-100" />

              <button
                onClick={() => {
                  setSideMenuOpen(false);
                  switchUserRole('earner');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-[#7C3AED] bg-purple-50 hover:bg-purple-100"
              >
                <Briefcase className="w-4 h-4" />
                <span>Switch to Worker Mode</span>
              </button>

              <button
                onClick={() => {
                  setSideMenuOpen(false);
                  setAccountModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-700 hover:bg-slate-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Account Settings</span>
              </button>
            </div>

            {/* Logout Button in Sidebar */}
            <div className="p-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSideMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POST TASK (With live 30% Platform Charge breakdown) */}
      {postTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-lg text-slate-900">Post a Micro-Task</h3>
              <button
                onClick={() => setPostTaskModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Follow CDSure on Twitter & Retweet Pinned"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="Social Media">Social Media</option>
                  <option value="Review & Rating">Review & Rating</option>
                  <option value="App Testing">App Testing</option>
                  <option value="Surveys">Surveys</option>
                  <option value="Content Creation">Content Creation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reward per Worker (₦)
                  </label>
                  <input
                    type="number"
                    value={taskReward}
                    onChange={(e) => setTaskReward(e.target.value)}
                    required
                    min={500}
                    step={100}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Workers Needed
                  </label>
                  <input
                    type="number"
                    value={taskWorkers}
                    onChange={(e) => setTaskWorkers(e.target.value)}
                    required
                    min={1}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instructions & Proof Guidelines
                </label>
                <textarea
                  value={taskInstructions}
                  onChange={(e) => setTaskInstructions(e.target.value)}
                  placeholder="Detail step-by-step what the worker must do and screenshot proof needed..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              {/* Exact 30% Fee Breakdown Preview */}
              {(() => {
                const total = (parseFloat(taskReward) || 0) * (parseInt(taskWorkers, 10) || 0);
                const { gross, fee, net } = getFeeBreakdown(total);
                const perWorker = getFeeBreakdown(parseFloat(taskReward) || 0);

                return (
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs space-y-1.5">
                    <p className="font-bold text-purple-900 uppercase tracking-wide text-[11px]">
                      Escrow & 30% Fee Breakdown
                    </p>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Gross Budget:</span>
                      <span className="font-bold text-slate-900">₦{gross.toLocaleString()}.00</span>
                    </div>
                    <div className="flex justify-between text-purple-700 font-semibold">
                      <span>CDSure Charge (30%):</span>
                      <span>- ₦{fee.toLocaleString()}.00</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-purple-200">
                      <span>Workers Will Receive (Total):</span>
                      <span>₦{net.toLocaleString()}.00</span>
                    </div>
                    <p className="text-[10px] text-slate-500 pt-1">
                      Per worker: ₦{perWorker.gross.toLocaleString()} gross → CDSure 30% fee (-₦{perWorker.fee.toLocaleString()}) → Worker receives ₦{perWorker.net.toLocaleString()} net.
                    </p>
                  </div>
                );
              })()}

              <button
                type="submit"
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-purple-600/25 transition-all text-sm"
              >
                Publish Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVIEW SUBMISSIONS (With 30% Fee on Employer Side) */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-lg text-slate-900">Worker Submissions</h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submissions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                No pending worker submissions to review.
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub) => {
                  const { gross, fee, net } = getFeeBreakdown(sub.reward || 2500);
                  return (
                    <div
                      key={sub.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{sub.workerName}</span>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 block">
                            ₦{gross.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold block">
                            Net to worker: ₦{net.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{sub.taskTitle}</p>
                      <div className="text-[11px] text-slate-500">
                        Proof Link:{' '}
                        <a
                          href={sub.proofLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#7C3AED] underline font-semibold"
                        >
                          {sub.proofLink}
                        </a>
                      </div>

                      {/* 30% Breakdown Badge */}
                      <div className="p-2.5 rounded-xl bg-purple-50 text-[11px] text-purple-900 space-y-0.5 border border-purple-100">
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-bold">₦{gross.toLocaleString()}.00</span>
                        </div>
                        <div className="flex justify-between text-purple-700">
                          <span>CDSure Charge (30%):</span>
                          <span>- ₦{fee.toLocaleString()}.00</span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-bold border-t border-purple-200 pt-0.5">
                          <span>Worker will receive:</span>
                          <span>₦{net.toLocaleString()}.00</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleApproveSubmission(sub)}
                          className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          Approve & Pay
                        </button>
                        <button
                          onClick={() => handleRejectSubmission(sub.id)}
                          className="py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: WALLET & ESCROW FUNDS (Both Deposit & Withdrawal with 30% Platform Charge) */}
      {walletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-lg text-slate-900">Employer Wallet & Escrow</h3>
              <button
                onClick={() => setWalletModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wallet Stats Card */}
            <div className="p-4 rounded-2xl bg-[#0f172a] text-white mb-4 space-y-3">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                  Available Balance
                </p>
                <p className="text-3xl font-black text-white mt-0.5">
                  ₦{(userProfile?.balance ?? walletStats.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Deposited</span>
                  <span className="font-bold text-slate-200">
                    ₦{(walletStats.total_deposited || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-purple-400 block text-[11px]">Total Fees Paid (30%)</span>
                  <span className="font-bold text-purple-300">
                    ₦{(walletStats.total_fees_paid || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-tabs: Overview, Deposit, Withdraw */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setWalletTab('overview')}
                className={`flex-1 py-2 rounded-lg transition ${
                  walletTab === 'overview'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setWalletTab('deposit')}
                className={`flex-1 py-2 rounded-lg transition ${
                  walletTab === 'deposit'
                    ? 'bg-white text-[#7C3AED] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Fund Wallet
              </button>
              <button
                type="button"
                onClick={() => setWalletTab('withdraw')}
                className={`flex-1 py-2 rounded-lg transition ${
                  walletTab === 'withdraw'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Withdraw
              </button>
            </div>

            {/* SUB-TAB 1: OVERVIEW & RECENT TRANSACTIONS */}
            {walletTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalletTab('deposit')}
                    className="p-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#7C3AED] text-left transition"
                  >
                    <ArrowDownLeft className="w-5 h-5 mb-1" />
                    <p className="font-bold text-xs">Deposit Funds</p>
                    <p className="text-[10px] text-purple-700">30% CDSure fee applies</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalletTab('withdraw')}
                    className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-left transition"
                  >
                    <ArrowUpRight className="w-5 h-5 mb-1" />
                    <p className="font-bold text-xs">Withdraw Money</p>
                    <p className="text-[10px] text-emerald-600">Bank payout (30% fee)</p>
                  </button>
                </div>

                {/* Transaction History */}
                <div>
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                    Recent Wallet Transactions
                  </h4>
                  {transactions.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                      No wallet transactions recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-slate-800 capitalize">
                              {tx.type.replace('_', ' ')}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Gross: ₦{Number(tx.grossAmount || 0).toLocaleString()} • 30% Fee: -₦{Number(tx.feeAmount || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-slate-900 block">
                              ₦{Number(tx.netAmount || 0).toLocaleString()}
                            </span>
                            <span className="text-[9px] font-bold uppercase text-emerald-600">
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: DEPOSIT (30% Charge Breakdown) */}
            {walletTab === 'deposit' && (
              <form onSubmit={handleInitiateDeposit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deposit Amount (₦)
                  </label>
                  <input
                    type="number"
                    value={depositAmountInput}
                    onChange={(e) => setDepositAmountInput(e.target.value)}
                    required
                    min={500}
                    step={100}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                {/* Live Breakdown Box */}
                {(() => {
                  const { gross, fee, net } = getFeeBreakdown(parseFloat(depositAmountInput) || 0);
                  return (
                    <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Amount:</span>
                        <span className="font-bold text-slate-900">
                          ₦{gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-purple-700 font-semibold">
                        <span>CDSure Charge (30%):</span>
                        <span>
                          - ₦{fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-black border-t border-purple-200 pt-1">
                        <span>You will receive in wallet:</span>
                        <span>
                          ₦{net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={depositSubmitting}
                  className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl text-sm shadow-md transition disabled:opacity-60"
                >
                  Deposit Funds
                </button>
              </form>
            )}

            {/* SUB-TAB 3: WITHDRAWAL (30% Charge Breakdown) */}
            {walletTab === 'withdraw' && (
              <form onSubmit={handleInitiateWithdrawal} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Withdrawal Amount (₦)
                  </label>
                  <input
                    type="number"
                    value={withdrawAmountInput}
                    onChange={(e) => setWithdrawAmountInput(e.target.value)}
                    required
                    min={500}
                    step={100}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination Bank
                  </label>
                  <select
                    value={withdrawBank}
                    onChange={(e) => setWithdrawBank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="SmartCash">SmartCash PSB</option>
                    <option value="OPay">OPay</option>
                    <option value="Palmpay">Palmpay</option>
                    <option value="Kuda Bank">Kuda Bank</option>
                    <option value="Access Bank">Access Bank</option>
                    <option value="GTBank">Guaranty Trust Bank</option>
                    <option value="Zenith Bank">Zenith Bank</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={withdrawAccount}
                      onChange={(e) => setWithdrawAccount(e.target.value)}
                      required
                      placeholder="8024138981"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={withdrawAccountName}
                      onChange={(e) => setWithdrawAccountName(e.target.value)}
                      required
                      placeholder="USMAN ABDULLAHI"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                </div>

                {/* Live Breakdown Box */}
                {(() => {
                  const { gross, fee, net } = getFeeBreakdown(parseFloat(withdrawAmountInput) || 0);
                  return (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Amount:</span>
                        <span className="font-bold text-slate-900">
                          ₦{gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-purple-700 font-semibold">
                        <span>CDSure Charge (30%):</span>
                        <span>
                          - ₦{fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-800 font-black border-t border-emerald-200 pt-1">
                        <span>Bank will receive:</span>
                        <span>
                          ₦{net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={withdrawSubmitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition disabled:opacity-60"
                >
                  Withdraw to Bank
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ACCOUNT SETTINGS */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-lg text-slate-900">Account Settings</h3>
              <button
                onClick={() => setAccountModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Name</p>
                <p className="font-bold text-slate-900">{userProfile?.name || 'Sanni Lasisi'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-bold text-slate-900">{userProfile?.email}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Platform Charge Rate</p>
                <p className="font-extrabold text-[#7C3AED]">30% on all deposits, payouts & withdrawals</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAccountModalOpen(false);
                  switchUserRole('earner');
                }}
                className="w-full py-2.5 bg-purple-50 text-[#7C3AED] hover:bg-purple-100 rounded-xl font-bold text-xs"
              >
                Switch to Worker Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
