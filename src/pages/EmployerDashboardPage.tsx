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
  Wallet,
  Clock,
  Layers,
  FileCheck,
} from 'lucide-react';

interface EmployerTask {
  id: string;
  title: string;
  category: string;
  reward: number;
  workersNeeded: number;
  workersDone: number;
  deadline: string;
  instructions: string;
  status: 'active' | 'completed' | 'paused';
}

export const EmployerDashboardPage: React.FC = () => {
  const { userProfile, logout, switchUserRole, navigate } = useAuth();

  // Storage key for employer tasks
  const [tasks, setTasks] = useState<EmployerTask[]>(() => {
    const saved = localStorage.getItem('cdsure_employer_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
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

  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [postTaskModalOpen, setPostTaskModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('Social Media');
  const [taskReward, setTaskReward] = useState('1500');
  const [taskWorkers, setTaskWorkers] = useState('20');
  const [taskInstructions, setTaskInstructions] = useState('');

  // Persist tasks
  useEffect(() => {
    localStorage.setItem('cdsure_employer_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('cdsure_submissions', JSON.stringify(submissions));
  }, [submissions]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const rewardNum = parseFloat(taskReward) || 1000;
    const workersNum = parseInt(taskWorkers, 10) || 10;

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
    setTaskTitle('');
    setTaskInstructions('');

    // Save task to Cloudflare D1
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
    } catch (err) {
      console.warn('D1 task sync notice:', err);
    }
  };

  const handleApproveSubmission = (id: string) => {
    setSubmissions(submissions.filter((s) => s.id !== id));
    alert('Submission approved! Reward credited to the earner.');
  };

  const handleRejectSubmission = (id: string) => {
    setSubmissions(submissions.filter((s) => s.id !== id));
    alert('Submission rejected.');
  };

  const totalSpent = tasks.reduce((acc, t) => acc + t.reward * t.workersDone, 0);
  const activeTasksCount = tasks.filter((t) => t.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex justify-center selection:bg-[#7C3AED] selection:text-white">
      {/* Mobile-first Container (Max width 420px, Centered) */}
      <div className="w-full max-w-[420px] min-h-screen bg-[#f8fafc] flex flex-col relative pb-10 border-x border-slate-200 shadow-sm">
        {/* 1. HEADER (Top white bar, 50px height) */}
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

        {/* 2. BALANCE CARD (Dark navy #0f172a) */}
        <div className="mx-4 mt-4 bg-[#0f172a] rounded-[22px] p-5 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center text-lg">
                💰
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                  BALANCE
                </p>
                <p className="text-2xl font-extrabold text-white tracking-tight">
                  ₦{(userProfile?.balance || 0).toLocaleString()}.00
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert('No new employer notifications.')}
              className="w-10 h-10 rounded-full bg-[#1e293b] hover:bg-[#334155] flex items-center justify-center text-slate-300 transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>

          <div
            onClick={() => setWalletModalOpen(true)}
            className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 cursor-pointer hover:text-white transition-colors"
          >
            <span className="font-medium">Tap to open wallet</span>
            <span className="flex items-center gap-1 font-semibold text-[#7C3AED]">
              Secure • Instant Escrow
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
            Manage your tasks, review submissions, track disputes, and monitor spending.
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
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm"
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
                  <span className="text-sm font-black text-emerald-600 shrink-0">
                    ₦{task.reward.toLocaleString()}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>
                    Progress: <strong className="text-slate-800">{task.workersDone}</strong> / {task.workersNeeded}
                  </span>
                  <span className="font-medium text-amber-600">{task.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                onClick={() => {
                  setSideMenuOpen(false);
                }}
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

      {/* MODAL: POST TASK */}
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

            <form onSubmit={handleCreateTask} className="space-y-4">
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

              <div className="p-3 rounded-xl bg-purple-50 text-xs text-[#7C3AED]">
                Total Estimated Escrow Budget:{' '}
                <strong>
                  ₦
                  {(
                    (parseFloat(taskReward) || 0) * (parseInt(taskWorkers, 10) || 0)
                  ).toLocaleString()}
                </strong>
              </div>

              <button
                type="submit"
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-600/25"
              >
                Publish Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVIEW SUBMISSIONS */}
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
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{sub.workerName}</span>
                      <span className="text-xs font-black text-emerald-600">₦{sub.reward}</span>
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
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => handleApproveSubmission(sub.id)}
                        className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                      >
                        Approve & Pay
                      </button>
                      <button
                        onClick={() => handleRejectSubmission(sub.id)}
                        className="py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: WALLET & ESCROW */}
      {walletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-lg text-slate-900">Employer Wallet</h3>
              <button
                onClick={() => setWalletModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] text-white mb-4">
              <p className="text-xs text-slate-400 uppercase font-bold">Escrow Balance</p>
              <p className="text-2xl font-black text-white mt-1">
                ₦{(userProfile?.balance || 0).toLocaleString()}.00
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">
                Funds held securely for task rewards
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  alert('Bank transfer details for escrow funding: SmartCash PSB 8024138981 (USMAN ABDULLAHI)');
                }}
                className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl text-sm"
              >
                Fund Escrow via Bank Transfer
              </button>
              <button
                onClick={() => setWalletModalOpen(false)}
                className="w-full py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
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
                <p className="text-xs text-slate-500">Active Mode</p>
                <p className="font-bold text-[#7C3AED]">Verified Employer</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAccountModalOpen(false);
                  logout();
                }}
                className="w-full mt-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
