import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  Check,
  Bell,
  X,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  ShieldCheck,
  LogOut,
  Upload,
  ExternalLink,
  ChevronRight,
  Building,
  Sparkles,
  Layers,
  Briefcase,
  AlertCircle,
  HelpCircle,
  Lock,
} from 'lucide-react';


interface TaskItem {
  id: string;
  title: string;
  category: string;
  reward: number;
  deadline: string;
  employerName: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  steps: string[];
  proofRequired: string;
}

interface AcceptedTask {
  id: string;
  taskId: string;
  title: string;
  reward: number;
  employerName: string;
  status: 'Accepted' | 'In Progress' | 'Submitted' | 'Approved' | 'Rejected';
  proofUrl?: string;
  proofNote?: string;
  submittedAt?: string;
}

const DEFAULT_AVAILABLE_TASKS: TaskItem[] = [
  {
    id: 't-101',
    title: 'Follow @CDSureTasks on X (Twitter) & Retweet Pinned Post',
    category: 'Social Media',
    reward: 1200,
    deadline: '24 hours',
    employerName: 'CDSure Official',
    difficulty: 'Easy',
    description: 'Help amplify our community by following our official Twitter page and retweeting our latest announcement.',
    steps: [
      'Open the official Twitter page @CDSureTasks',
      'Click Follow and ensure notifications are on',
      'Like and Retweet the pinned post with a short comment',
      'Take a screenshot showing your profile follow state and retweet'
    ],
    proofRequired: 'Screenshot showing follow button says "Following" and your retweet.'
  },
  {
    id: 't-102',
    title: 'Download FinTech App & Complete Free KYC Verification',
    category: 'App Testing',
    reward: 3500,
    deadline: '2 days',
    employerName: 'SmartPay Global',
    difficulty: 'Medium',
    description: 'Download and test the new SmartPay wallet app on Google Play. Register an account and reach verification tier 1.',
    steps: [
      'Download the app from the provided store link',
      'Create a new account with your valid phone number',
      'Complete Tier 1 basic verification',
      'Screenshot the "Account Verified" success screen'
    ],
    proofRequired: 'Screenshot of the in-app verified profile badge with your username visible.'
  },
  {
    id: 't-103',
    title: 'Write 5-Star Honest Review on Google Maps for Business',
    category: 'Review & Rating',
    reward: 2000,
    deadline: '3 days',
    employerName: 'Apex Logistics Ltd',
    difficulty: 'Easy',
    description: 'Leave a thoughtful, positive 5-star review on Google Maps highlighting friendly customer service and fast delivery.',
    steps: [
      'Search Apex Logistics on Google Maps or click the task link',
      'Rate 5 stars',
      'Write a genuine review with at least 2 sentences',
      'Submit the review and screenshot your published review'
    ],
    proofRequired: 'Screenshot of your published review with your Google username.'
  },
  {
    id: 't-104',
    title: 'Complete 3-Minute Consumer Behavior Survey for Nigeria',
    category: 'Surveys',
    reward: 1800,
    deadline: '1 day',
    employerName: 'Lagos Research Lab',
    difficulty: 'Easy',
    description: 'Answer 12 quick questions about daily mobile banking and utility bill payments in Nigerian cities.',
    steps: [
      'Open the survey link',
      'Answer all 12 questions truthfully',
      'Submit the questionnaire',
      'Screenshot the final "Thank You for Participating" page'
    ],
    proofRequired: 'Screenshot of the completion confirmation screen with completion code.'
  },
  {
    id: 't-105',
    title: 'Post 15s TikTok Video using Brand Audio Clip',
    category: 'Content Creation',
    reward: 5000,
    deadline: '4 days',
    employerName: 'Naija Beats Media',
    difficulty: 'Hard',
    description: 'Create a creative, clean 15-second TikTok video utilizing the trending promotional sound clip.',
    steps: [
      'Use the official sound in your TikTok creation',
      'Add hashtags #CDSureTasks #NaijaEarners in caption',
      'Keep video public for at least 48 hours',
      'Provide your TikTok video link and profile screenshot'
    ],
    proofRequired: 'Direct URL to public TikTok video + screenshot showing view count.'
  }
];

export const EarnerDashboardPage: React.FC = () => {
  const { userProfile, logout, switchUserRole, navigate } = useAuth();
  const isActivated = userProfile?.role === 'employer' || userProfile?.is_activated === 1 || userProfile?.is_activated === true;

  // Navigation tabs within Earner mode
  const [activeTab, setActiveTab] = useState<'browse' | 'my-tasks' | 'wallet'>('browse');

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'newest' | 'price' | 'deadline'>('newest');

  // Interactive Modals
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [submitProofTask, setSubmitProofTask] = useState<AcceptedTask | null>(null);
  const [proofUrlInput, setProofUrlInput] = useState('');
  const [proofNoteInput, setProofNoteInput] = useState('');
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Withdrawal form
  const [withdrawBank, setWithdrawBank] = useState('Opay');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawName, setWithdrawName] = useState(userProfile?.name || '');
  const [withdrawAmount, setWithdrawAmount] = useState('2000');

  // Persisted state in localStorage
  const [acceptedTasks, setAcceptedTasks] = useState<AcceptedTask[]>(() => {
    const saved = localStorage.getItem('cdsure_earner_accepted');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'acc-1',
        taskId: 't-101',
        title: 'Follow @CDSureTasks on X (Twitter) & Retweet Pinned Post',
        reward: 1200,
        employerName: 'CDSure Official',
        status: 'In Progress',
      },
      {
        id: 'acc-2',
        taskId: 't-103',
        title: 'Write 5-Star Honest Review on Google Maps for Business',
        reward: 2000,
        employerName: 'Apex Logistics Ltd',
        status: 'Submitted',
        proofUrl: 'https://maps.google.com/review?id=99281',
        submittedAt: '1 hour ago',
      },
    ];
  });

  const [notifications, setNotifications] = useState<any[]>([
    {
      id: 'n-1',
      title: 'Task Approved! ₦2,000 Credited',
      desc: 'Your Google Maps review for Apex Logistics was verified and approved.',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: 'n-2',
      title: 'Welcome to CDSure Earner Mode',
      desc: 'Browse available tasks and start earning instant rewards daily.',
      time: '1 day ago',
      unread: false,
    },
  ]);

  const [earningsHistory, setEarningsHistory] = useState<any[]>([
    { id: 'eh-1', title: 'Task Approved - Apex Logistics Review', amount: 2000, date: 'Today, 2:30 PM', status: 'Credited' },
    { id: 'eh-2', title: 'Daily Login Reward Bonus', amount: 150, date: 'Yesterday, 9:00 AM', status: 'Credited' },
  ]);

  // Persist state
  useEffect(() => {
    localStorage.setItem('cdsure_earner_accepted', JSON.stringify(acceptedTasks));
  }, [acceptedTasks]);

  // Calculations
  const completedCount = acceptedTasks.filter((t) => t.status === 'Approved').length;
  const pendingEarnings = acceptedTasks
    .filter((t) => t.status === 'Submitted' || t.status === 'In Progress' || t.status === 'Accepted')
    .reduce((acc, t) => acc + t.reward, 0);
  const totalEarned = (userProfile?.balance || 0) + 2150;

  // Filter tasks
  const filteredTasks = DEFAULT_AVAILABLE_TASKS.filter((task) => {
    if (selectedCategory !== 'All' && task.category !== selectedCategory) return false;
    if (task.reward < minPrice) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price') return b.reward - a.reward;
    if (sortBy === 'deadline') return a.deadline.localeCompare(b.deadline);
    return 0;
  });

  // Handle Accept Task (Syncs to Cloudflare D1)
  const handleAcceptTask = async (task: TaskItem) => {
    if (!isActivated) {
      alert('Account Activation Required: Please pay the ₦1,500 activation fee to unlock tasks.');
      setSelectedTask(null);
      navigate('/activate');
      return;
    }

    const alreadyAccepted = acceptedTasks.some((t) => t.taskId === task.id);
    if (alreadyAccepted) {
      alert('You have already accepted this task. Check "My Active Tasks" tab.');
      setSelectedTask(null);
      return;
    }

    const newAccepted: AcceptedTask = {
      id: 'acc-' + Date.now(),
      taskId: task.id,
      title: task.title,
      reward: task.reward,
      employerName: task.employerName,
      status: 'In Progress',
    };

    setAcceptedTasks([newAccepted, ...acceptedTasks]);
    setSelectedTask(null);
    setActiveTab('my-tasks');

    // Sync application to Cloudflare D1
    try {
      await fetch('/api/tasks/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: task.id,
          earner_id: userProfile?.uid || 'earner-demo',
        }),
      });
    } catch (err) {
      console.warn('D1 application sync notice:', err);
    }

    alert(`Task accepted! You can now complete the steps and submit proof.`);
  };

  // Handle Proof Submit (Syncs to Cloudflare D1 & R2)
  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitProofTask) return;

    if (!proofUrlInput.trim() && !proofImagePreview) {
      alert('Please provide a screenshot or proof link.');
      return;
    }

    const resolvedProof = proofUrlInput.trim() || proofImagePreview || 'Uploaded Screenshot';

    setAcceptedTasks((prev) =>
      prev.map((t) =>
        t.id === submitProofTask.id
          ? {
              ...t,
              status: 'Submitted',
              proofUrl: resolvedProof,
              proofNote: proofNoteInput.trim(),
              submittedAt: 'Just now',
            }
          : t
      )
    );

    setNotifications([
      {
        id: 'n-' + Date.now(),
        title: 'Proof Submitted',
        desc: `Proof for "${submitProofTask.title}" submitted. Employer will review within 24h.`,
        time: 'Just now',
        unread: true,
      },
      ...notifications,
    ]);

    // Sync submission to Cloudflare D1 and R2
    try {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: submitProofTask.taskId,
          earner_id: userProfile?.uid || 'earner-demo',
          proof_link: resolvedProof,
          proof_text: proofNoteInput.trim(),
        }),
      });
    } catch (err) {
      console.warn('D1 submission sync notice:', err);
    }

    setSubmitProofTask(null);
    setProofUrlInput('');
    setProofNoteInput('');
    setProofImagePreview(null);
    alert('Proof submitted successfully! The employer will review your submission.');
  };

  // Handle Image File
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProofImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Withdrawal
  const handleWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 500) {
      alert('Minimum withdrawal amount is ₦500.');
      return;
    }
    setWithdrawModalOpen(false);
    alert(`Withdrawal request of ₦${amt.toLocaleString()} submitted to ${withdrawBank} (${withdrawAccount})! Processing within 24 hours.`);
  };

  const unreadNotifsCount = notifications.filter((n) => n.unread).length;

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
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
              Worker
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotifModalOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 relative transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => switchUserRole('employer')}
              className="text-xs font-bold text-[#7C3AED] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded-lg transition-colors"
              title="Switch to Employer Mode"
            >
              Hire Mode
            </button>
          </div>
        </header>

        {/* 2. TOP STATS CARDS (Total Earned, Pending Earnings, Available Tasks, Completed Tasks) */}
        <div className="mx-4 mt-4 grid grid-cols-2 gap-2.5">
          {/* Card 1: Total Earned */}
          <div className="bg-[#0f172a] rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                Total Earned
              </p>
              <span className="text-base">💰</span>
            </div>
            <p className="text-xl font-extrabold text-white mt-1">
              ₦{totalEarned.toLocaleString()}.00
            </p>
            <p className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Available balance</span>
            </p>
          </div>

          {/* Card 2: Pending Earnings */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Pending
              </p>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-extrabold text-amber-600 mt-1">
              ₦{pendingEarnings.toLocaleString()}.00
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Awaiting employer review
            </p>
          </div>

          {/* Card 3: Available Tasks */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Available
              </p>
              <Briefcase className="w-4 h-4 text-[#7C3AED]" />
            </div>
            <p className="text-xl font-extrabold text-[#0f172a] mt-1">
              {DEFAULT_AVAILABLE_TASKS.length}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Ready to accept today
            </p>
          </div>

          {/* Card 4: Completed Tasks */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Completed
              </p>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">
              {completedCount}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Approved & paid tasks
            </p>
          </div>
        </div>

        {/* 3. TABS SWITCHER (Browse Tasks | My Active Tasks | Wallet) */}
        <div className="mx-4 mt-4 bg-slate-200/60 p-1 rounded-xl flex items-center text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`flex-1 py-2 rounded-lg text-center transition-all ${
              activeTab === 'browse'
                ? 'bg-white text-[#7C3AED] shadow-sm font-extrabold'
                : 'hover:text-slate-900'
            }`}
          >
            Browse Tasks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my-tasks')}
            className={`flex-1 py-2 rounded-lg text-center transition-all relative ${
              activeTab === 'my-tasks'
                ? 'bg-white text-[#7C3AED] shadow-sm font-extrabold'
                : 'hover:text-slate-900'
            }`}
          >
            <span>My Active ({acceptedTasks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 py-2 rounded-lg text-center transition-all ${
              activeTab === 'wallet'
                ? 'bg-white text-[#7C3AED] shadow-sm font-extrabold'
                : 'hover:text-slate-900'
            }`}
          >
            Wallet & History
          </button>
        </div>

        {/* TAB 1: BROWSE TASKS */}
        {activeTab === 'browse' && (
          <div className="mx-4 mt-4 space-y-3.5">
            {/* Filter controls */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span>Category Filter</span>
                </span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="All">All Categories</option>
                  <option value="Social Media">Social Media</option>
                  <option value="App Testing">App Testing</option>
                  <option value="Review & Rating">Review & Rating</option>
                  <option value="Surveys">Surveys</option>
                  <option value="Content Creation">Content Creation</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <span className="font-semibold text-slate-500">Min Reward:</span>
                <div className="flex items-center gap-1.5">
                  {[0, 1000, 2500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setMinPrice(amt)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        minPrice === amt
                          ? 'bg-[#7C3AED] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {amt === 0 ? 'Any' : `₦${amt}+`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tasks list */}
            <div className="space-y-3">
              {!isActivated && (
                <div className="bg-gradient-to-r from-purple-900 to-[#0f172a] text-white rounded-2xl p-4 shadow-md border border-purple-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                      Account Activation Required
                    </span>
                    <p className="font-extrabold text-xs text-white mt-0.5">
                      Pay ₦1,500 one-time fee to unlock and accept tasks
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/activate')}
                    className="px-3 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl text-xs shrink-0 shadow-sm transition"
                  >
                    Pay ₦1,500 to Unlock
                  </button>
                </div>
              )}

              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:border-[#7C3AED]/40 transition-all cursor-pointer"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded-full">
                          {task.category}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          by {task.employerName}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {task.title}
                      </h4>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-emerald-600 block">
                        ₦{task.reward.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-medium text-amber-600">
                        {task.deadline}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 font-medium">
                      Difficulty: <strong className="text-slate-700">{task.difficulty}</strong>
                    </span>

                    {!isActivated ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/activate');
                        }}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Pay ₦1,500 to Unlock</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        className="text-xs font-bold text-[#7C3AED] hover:underline flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 2: MY ACTIVE TASKS */}
        {activeTab === 'my-tasks' && (
          <div className="mx-4 mt-4 space-y-3">
            {acceptedTasks.length === 0 ? (
              <div className="py-12 bg-white rounded-2xl border border-slate-200/80 text-center p-6">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">No Active Tasks</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto">
                  Browse the task catalog and click "Accept Task" to start working.
                </p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="mt-4 px-4 py-2 bg-[#7C3AED] text-white text-xs font-bold rounded-xl"
                >
                  Browse Available Tasks
                </button>
              </div>
            ) : (
              acceptedTasks.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 ${
                          item.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'Submitted'
                            ? 'bg-amber-100 text-amber-700'
                            : item.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-purple-100 text-[#7C3AED]'
                        }`}
                      >
                        Status: {item.status}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Employer: {item.employerName}
                      </p>
                    </div>

                    <span className="text-sm font-black text-emerald-600 shrink-0">
                      ₦{item.reward.toLocaleString()}
                    </span>
                  </div>

                  {item.status === 'Submitted' && (
                    <div className="p-2.5 rounded-xl bg-amber-50 text-[11px] text-amber-800 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Proof submitted ({item.submittedAt || 'Recently'}). Awaiting employer confirmation.</span>
                    </div>
                  )}

                  {item.status === 'In Progress' && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">Ready to submit?</span>
                      <button
                        type="button"
                        onClick={() => setSubmitProofTask(item)}
                        className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Submit Proof</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: WALLET & HISTORY */}
        {activeTab === 'wallet' && (
          <div className="mx-4 mt-4 space-y-4">
            {/* Balance Card */}
            <div className="bg-[#0f172a] rounded-2xl p-5 text-white shadow-lg">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Available Wallet Balance
              </p>
              <p className="text-3xl font-black text-white mt-1">
                ₦{totalEarned.toLocaleString()}.00
              </p>
              <p className="text-xs text-emerald-400 font-medium mt-1">
                Instant withdrawal available
              </p>

              <button
                type="button"
                onClick={() => setWithdrawModalOpen(true)}
                className="w-full mt-4 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdraw to Nigerian Bank</span>
              </button>
            </div>

            {/* Earnings History */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
              <h4 className="font-bold text-sm text-slate-900 mb-3">Earnings History</h4>
              <div className="space-y-2.5">
                {earningsHistory.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-none text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{h.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{h.date}</p>
                    </div>
                    <span className="font-extrabold text-emerald-600">
                      +₦{h.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: TASK DETAILS */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded-full mb-1 inline-block">
                  {selectedTask.category}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reward Highlight */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-emerald-700 font-semibold">Reward for completion:</span>
                <p className="text-xl font-black text-emerald-800">
                  ₦{selectedTask.reward.toLocaleString()}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <span>Deadline:</span>
                <p className="font-bold text-slate-800">{selectedTask.deadline}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 text-xs text-slate-600">
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Task Overview</h4>
                <p className="leading-relaxed">{selectedTask.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1.5">Steps to Complete:</h4>
                <ul className="space-y-1.5 list-decimal list-inside pl-1 text-slate-700">
                  {selectedTask.steps.map((st, i) => (
                    <li key={i} className="leading-relaxed">
                      {st}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                <h4 className="font-bold text-[#7C3AED] mb-1">Mandatory Proof Required:</h4>
                <p className="text-slate-700">{selectedTask.proofRequired}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 space-y-2">
              {isActivated ? (
                <button
                  type="button"
                  onClick={() => handleAcceptTask(selectedTask)}
                  className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Apply / Accept Task</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTask(null);
                    navigate('/activate');
                  }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Pay ₦1,500 to Unlock Task</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT PROOF */}
      {submitProofTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-extrabold text-base text-slate-900">Submit Task Proof</h3>
              <button
                onClick={() => setSubmitProofTask(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
              Task: <strong className="text-slate-800">{submitProofTask.title}</strong>
            </p>

            <form onSubmit={handleProofSubmit} className="space-y-4 text-xs">
              {/* Screenshot Upload */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Upload Screenshot / Image Proof
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFile}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-[#7C3AED] hover:file:bg-purple-100 cursor-pointer"
                />
                {proofImagePreview && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 max-h-36">
                    <img
                      src={proofImagePreview}
                      alt="Proof preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Link Input */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Proof Link (URL / Social Profile / Review Link)
                </label>
                <input
                  type="url"
                  value={proofUrlInput}
                  onChange={(e) => setProofUrlInput(e.target.value)}
                  placeholder="https://twitter.com/yourhandle or https://maps.google.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              {/* Note Input */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Worker Notes / Comments (Optional)
                </label>
                <textarea
                  value={proofNoteInput}
                  onChange={(e) => setProofNoteInput(e.target.value)}
                  placeholder="Mention your username or additional details for the employer..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl text-sm shadow-md"
              >
                Submit Proof for Verification
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: WITHDRAWAL */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-base text-slate-900">
                Withdraw Earnings to Bank
              </h3>
              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Bank</label>
                <select
                  value={withdrawBank}
                  onChange={(e) => setWithdrawBank(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="Opay">Opay Digital Services</option>
                  <option value="Palmpay">Palmpay</option>
                  <option value="Kuda Bank">Kuda Microfinance Bank</option>
                  <option value="Moniepoint">Moniepoint MFB</option>
                  <option value="SmartCash PSB">SmartCash PSB (Airtel)</option>
                  <option value="GTBank">Guaranty Trust Bank (GTBank)</option>
                  <option value="Zenith Bank">Zenith Bank Plc</option>
                  <option value="Access Bank">Access Bank</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  10-Digit Account Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  placeholder="8024138981"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Name</label>
                <input
                  type="text"
                  value={withdrawName}
                  onChange={(e) => setWithdrawName(e.target.value)}
                  placeholder="Account Holder Full Name"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  min={500}
                  step={100}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#7C3AED]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Min. withdrawal: ₦500</p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl text-sm shadow-md"
              >
                Confirm Bank Withdrawal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: NOTIFICATIONS */}
      {notifModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-base text-slate-900">Notifications</h3>
              <button
                onClick={() => setNotifModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-2xl border text-xs ${
                    n.unread
                      ? 'bg-purple-50/60 border-purple-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <p className="font-bold text-slate-900">{n.title}</p>
                  <p className="text-slate-600 mt-0.5">{n.desc}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                </div>
              ))}
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

            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <p className="font-bold text-sm text-[#0f172a]">
                {userProfile?.name || 'Worker'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{userProfile?.email}</p>
              <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Worker Mode
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <button
                onClick={() => {
                  setSideMenuOpen(false);
                  setActiveTab('browse');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm ${
                  activeTab === 'browse'
                    ? 'bg-purple-50 text-[#7C3AED]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Browse Tasks</span>
              </button>

              <button
                onClick={() => {
                  setSideMenuOpen(false);
                  setActiveTab('my-tasks');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm ${
                  activeTab === 'my-tasks'
                    ? 'bg-purple-50 text-[#7C3AED]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>My Active Tasks</span>
              </button>

              <button
                onClick={() => {
                  setSideMenuOpen(false);
                  setActiveTab('wallet');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm ${
                  activeTab === 'wallet'
                    ? 'bg-purple-50 text-[#7C3AED]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Earnings & Wallet</span>
              </button>

              <div className="my-2 border-t border-slate-100" />

              {!isActivated && (
                <button
                  onClick={() => {
                    setSideMenuOpen(false);
                    navigate('/activate');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                >
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Activate Account (₦1,500)</span>
                </button>
              )}

              <button
                onClick={() => {
                  setSideMenuOpen(false);
                  navigate('/admin/activations');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-purple-700 bg-purple-50/50 hover:bg-purple-100/60"
              >
                <ShieldCheck className="w-4 h-4 text-[#7C3AED]" />
                <span>Admin Activations Review</span>
              </button>

              <button
                onClick={() => {
                  setSideMenuOpen(false);
                  switchUserRole('employer');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-[#7C3AED] bg-purple-50 hover:bg-purple-100"
              >
                <Layers className="w-4 h-4" />
                <span>Switch to Employer Mode</span>
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

      {/* MODAL 5: ACCOUNT SETTINGS */}
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
                <p className="font-bold text-slate-900">{userProfile?.name || 'Worker'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-bold text-slate-900">{userProfile?.email}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Active Mode</p>
                <p className="font-bold text-emerald-700">Registered Worker / Earner</p>
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
