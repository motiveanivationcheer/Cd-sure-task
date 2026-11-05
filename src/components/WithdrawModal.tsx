import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Building2, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NIGERIAN_BANKS = [
  'OPay (PayCom)',
  'PalmPay',
  'Kuda Bank',
  'Moniepoint MFB',
  'Access Bank',
  'Guaranty Trust Bank (GTBank)',
  'Zenith Bank',
  'United Bank for Africa (UBA)',
  'First Bank of Nigeria',
  'Fidelity Bank',
  'Stanbic IBTC Bank',
  'Sterling Bank',
  'Wema Bank / ALAT',
];

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { d1User, requestWithdrawal } = useAuth();
  const [bankName, setBankName] = useState(NIGERIAN_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('1000');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !d1User) return null;

  const currentBalance = d1User.balance || 0;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 500) {
      setErrorMsg('Minimum withdrawal amount is ₦500.');
      return;
    }

    if (numAmount > currentBalance) {
      setErrorMsg(`Insufficient funds. Your available balance is ₦${currentBalance.toLocaleString()}.`);
      return;
    }

    if (accountNumber.trim().length !== 10) {
      setErrorMsg('Nigerian bank account numbers must be 10 digits.');
      return;
    }

    if (!accountName.trim()) {
      setErrorMsg('Please enter account beneficiary name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestWithdrawal(
        numAmount,
        bankName,
        accountNumber.trim(),
        accountName.trim()
      );
      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#00ff88', '#10b981', '#fbbf24'],
        });
        setSuccessMsg(res.message);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      } else {
        setErrorMsg(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#00ff88]/20 text-[#00ff88] flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Withdraw Earnings</h2>
            <p className="text-xs text-slate-400">
              Available Balance:{' '}
              <span className="text-[#00ff88] font-bold">₦{currentBalance.toLocaleString()}</span>
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-[#00ff88]/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00ff88]" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleWithdraw} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Bank / Fintech
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00ff88] appearance-none cursor-pointer"
              >
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b} value={b} className="bg-slate-900 text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Account Number (10 Digits)
            </label>
            <input
              type="text"
              maxLength={10}
              placeholder="e.g. 0123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#00ff88]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Account Holder Name
            </label>
            <input
              type="text"
              placeholder="e.g. Samuel Adekunle"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#00ff88]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Amount (₦)</label>
              <button
                type="button"
                onClick={() => setAmount(String(currentBalance))}
                className="text-[11px] text-[#00ff88] font-semibold hover:underline"
              >
                Max: ₦{currentBalance.toLocaleString()}
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₦</span>
              <input
                type="number"
                min="500"
                step="50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-[#00ff88]"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Min: ₦500. Payouts processed within 24 hours.</p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || currentBalance < 500}
              className="w-2/3 bg-[#00ff88] hover:bg-[#00b248] disabled:opacity-50 text-slate-950 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00ff88]/20"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Submit Withdrawal</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
