import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Eye,
  X,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface ActivationRecord {
  id: string;
  user_id: string;
  email: string;
  amount: number;
  proof_image: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  admin_note?: string | null;
  created_at: string;
  user_name?: string;
  user_role?: string;
  is_activated?: number;
}

export const AdminActivationsPage: React.FC = () => {
  const { navigate } = useAuth();
  const [activations, setActivations] = useState<ActivationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  // Rejection modal state
  const [rejectModalItem, setRejectModalItem] = useState<ActivationRecord | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Invalid or illegible transfer receipt');
  const [customReason, setCustomReason] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchActivations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/activations');
      if (res.ok) {
        const data = await res.json();
        setActivations(data.activations || []);
      }
    } catch (err: any) {
      console.warn('Failed to load admin activations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivations();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleApprove = async (item: ActivationRecord) => {
    setActionLoadingId(item.id);
    try {
      const res = await fetch('/api/admin/activations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, user_id: item.user_id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Approved activation for ${item.email}`);
        await fetchActivations();
      } else {
        showToast(data.error || 'Approval failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing approval', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    const finalReason = customReason.trim() ? customReason.trim() : rejectReason;
    setActionLoadingId(rejectModalItem.id);

    try {
      const res = await fetch('/api/admin/activations/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rejectModalItem.id,
          user_id: rejectModalItem.user_id,
          reason: finalReason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Rejected activation for ${rejectModalItem.email}`);
        setRejectModalItem(null);
        setCustomReason('');
        await fetchActivations();
      } else {
        showToast(data.error || 'Rejection failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing rejection', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Metrics
  const totalCount = activations.length;
  const pendingCount = activations.filter((a) => a.status === 'pending').length;
  const approvedCount = activations.filter((a) => a.status === 'approved').length;
  const rejectedCount = activations.filter((a) => a.status === 'rejected').length;

  const filteredActivations = activations.filter((item) => {
    const matchesFilter =
      statusFilter === 'all' ? true : item.status === statusFilter;
    const matchesSearch =
      (item.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.user_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/earner-dashboard')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
            title="Back to Earner Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-[#0f172a] leading-none">
                CDSure Admin
              </h1>
              <span className="text-[11px] text-slate-400 font-medium">
                Manual Transfer Activations Review
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchActivations}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Toast Notification */}
        {toastMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-md animate-fade-in ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Header Title & Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0f172a] tracking-tight">
              Earner Activation Payments
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verify ₦1,500 transfers sent to SmartCash <strong>8024138981 (USMAN ABDULLAHI)</strong> and unlock earner accounts.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Submissions
            </span>
            <p className="text-2xl font-black text-[#0f172a] mt-1">{totalCount}</p>
          </div>

          <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200 shadow-xs">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Pending Review
            </span>
            <p className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</p>
          </div>

          <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Approved
            </span>
            <p className="text-2xl font-black text-emerald-900 mt-1">{approvedCount}</p>
          </div>

          <div className="bg-red-50/60 rounded-2xl p-4 border border-red-200 shadow-xs">
            <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
              Rejected
            </span>
            <p className="text-2xl font-black text-red-900 mt-1">{rejectedCount}</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by email, name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#7C3AED] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['all', 'pending', 'approved', 'rejected'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition shrink-0 ${
                  statusFilter === tab
                    ? 'bg-[#7C3AED] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Activations Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold">Loading activations...</p>
            </div>
          ) : filteredActivations.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No activations found</p>
              <p className="text-xs text-slate-400 mt-1">
                {statusFilter !== 'all'
                  ? `No activations with status "${statusFilter}".`
                  : 'No payment proofs have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Earner</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Proof Receipt</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Admin Note</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActivations.map((item) => {
                    const isPending = item.status === 'pending';
                    const isApproved = item.status === 'approved';
                    const isRejected = item.status === 'rejected';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#0f172a] text-xs">
                            {item.user_name || 'Earner User'}
                          </p>
                          <p className="text-slate-500 text-[11px]">{item.email}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {item.user_id.slice(0, 10)}...
                          </span>
                        </td>

                        <td className="py-3 px-4 font-black text-slate-800">
                          ₦{item.amount?.toLocaleString() || '1,500'}
                        </td>

                        <td className="py-3 px-4">
                          {item.proof_image ? (
                            <button
                              type="button"
                              onClick={() => setSelectedProof(item.proof_image)}
                              className="group relative flex items-center gap-1.5 p-1 rounded-lg border border-slate-200 hover:border-[#7C3AED] bg-slate-50 transition"
                            >
                              <img
                                src={item.proof_image}
                                alt="Proof"
                                className="w-10 h-10 object-cover rounded"
                              />
                              <span className="text-[11px] font-semibold text-[#7C3AED] group-hover:underline flex items-center gap-1 pr-1">
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </span>
                            </button>
                          ) : (
                            <span className="text-slate-400 italic">No image</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                        </td>

                        <td className="py-3 px-4">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                              <XCircle className="w-3 h-3" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600 max-w-xs text-[11px]">
                          {item.admin_note || <span className="text-slate-300">—</span>}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                disabled={actionLoadingId === item.id}
                                onClick={() => handleApprove(item)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] shadow-xs active:scale-95 transition disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={actionLoadingId === item.id}
                                onClick={() => setRejectModalItem(item)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-xl text-[11px] shadow-xs active:scale-95 transition disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <div className="inline-flex gap-1.5">
                              {!isApproved && (
                                <button
                                  type="button"
                                  onClick={() => handleApprove(item)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg text-[10px] font-bold border border-slate-200 transition"
                                >
                                  Re-Approve
                                </button>
                              )}
                              {!isRejected && (
                                <button
                                  type="button"
                                  onClick={() => setRejectModalItem(item)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-lg text-[10px] font-bold border border-slate-200 transition"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Enlarged Proof Screenshot Modal */}
      {selectedProof && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedProof(null)}
        >
          <div
            className="bg-white rounded-3xl p-4 max-w-xl w-full max-h-[90vh] flex flex-col relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Transfer Screenshot Proof</h3>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-3 overflow-auto flex-1 flex items-center justify-center bg-slate-950/5 rounded-2xl mt-3">
              <img
                src={selectedProof}
                alt="Enlarged Proof"
                className="max-h-[70vh] object-contain rounded-xl"
              />
            </div>
            <div className="pt-3 text-right">
              <a
                href={selectedProof}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7C3AED] hover:underline"
              >
                <span>Open original image</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">Reject Payment Proof</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Earner: <strong>{rejectModalItem.email}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Choose Rejection Reason:
              </label>
              <div className="space-y-1.5 text-xs">
                {[
                  'Invalid or illegible transfer receipt',
                  'Transfer amount is less than ₦1,500',
                  'Payment not received on SmartCash account 8024138981',
                  'Incorrect narration or sender details',
                  'Duplicate screenshot already used',
                ].map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="reject_reason"
                      checked={rejectReason === reason}
                      onChange={() => setRejectReason(reason)}
                      className="text-[#7C3AED] focus:ring-[#7C3AED]"
                    />
                    <span className="text-slate-700 font-medium">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Feedback Note (optional):
              </label>
              <input
                type="text"
                placeholder="Specific guidance for the earner..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoadingId === rejectModalItem.id}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
