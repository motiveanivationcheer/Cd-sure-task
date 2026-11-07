export interface D1User {
  uid: string;
  email: string;
  full_name?: string;
  is_activated: number; // 0 or 1
  activation_payment_reference?: string | null;
  activation_screenshot_url?: string | null;
  admin_confirmed_at?: string | null;
  tasks_available_at?: string | null;
  payment_status?: 'unpaid' | 'pending_admin' | 'confirmed';
  referral_code: string;
  referred_by: string | null;
  balance: number;
  total_earned: number;
  referral_earnings: number;
  created_at: string;
}

export type ActivationStatusType = 'not_found' | 'pending_approval' | 'confirmed_waiting_24h' | 'active';

export interface CheckStatusResponse {
  status: ActivationStatusType;
  message?: string;
  transaction_id?: string;
  screenshot_url?: string;
  amount?: number;
  submitted_at?: string;
  tasks_available_at?: string;
  remaining_ms?: number;
  formatted_start_time?: string;
  same_time_tomorrow?: string;
  user?: D1User;
  balance?: number;
  total_earned?: number;
  referral_earnings?: number;
}

export interface Task {
  id: string;
  title: string;
  reward: number;
  link: string;
  instructions?: string;
  expires_at?: string;
  completed?: boolean;
  completionStatus?: 'pending_review' | 'approved' | 'rejected';
  proof_screenshot_url?: string;
  locked24h?: boolean;
  tasksAvailableAt?: string;
  startTimeMessage?: string;
}

export interface ReferralRecord {
  id: string;
  referrer_uid: string;
  referred_uid?: string;
  referred_email?: string;
  referred_name?: string;
  bonus: number;
  date: string;
}

export interface WithdrawalRecord {
  id: string;
  uid: string;
  amount: number;
  status: 'pending' | 'paid';
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  date: string;
}

export interface PaymentRecord {
  id: string;
  uid: string;
  amount: number;
  gateway: 'bank_transfer' | string;
  tx_ref?: string;
  reference?: string;
  transaction_id?: string;
  status: 'approved' | 'verified' | 'pending_admin' | 'pending' | 'failed';
  proof_screenshot_url?: string;
  admin_confirmed_at?: string;
  verified_at?: string;
  date: string;
}

export interface CompletionRecord {
  id: string;
  uid: string;
  task_id: string;
  task_title?: string;
  user_email?: string;
  proof_screenshot_url: string;
  status: 'pending_review' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reward?: number;
}

export interface EmailVerification {
  id: string;
  uid: string;
  code: string;
  link_token: string;
  expires_at: string;
  verified: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'earner' | 'employer';
  balance: number;
  is_verified: boolean;
  is_activated?: boolean | number;
  activation_paid_at?: string;
  total_fees_paid?: number;
  total_deposited?: number;
  createdAt?: any;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  role: 'employer' | 'earner';
  type: 'deposit' | 'task_payment' | 'withdrawal' | 'refund' | 'task_earning';
  grossAmount: number;
  feePercent: number; // 30
  feeAmount: number;
  netAmount: number;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
  reference?: string;
  description?: string;
}

export interface PlatformEarningRecord {
  id: string;
  transactionId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  role: 'employer' | 'earner';
  feeAmount: number;
  grossAmount?: number;
  source: string;
  createdAt: string;
}

export interface PlatformEarningsSummary {
  totalCombined: number;
  totalEmployer: number;
  totalEarner: number;
  recentEarnings: PlatformEarningRecord[];
}


