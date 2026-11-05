import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Check, RotateCcw, Image, Zap, Clock, Lock } from 'lucide-react';

interface AdminAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const AdminAuditModal: React.FC<AdminAuditModalProps> = ({ isOpen, onClose, onRefresh }) => {
  const [data, setData] = useState<{ pendingPayments: any[]; activeUsers: any[]; pendingCompletions: any[] }>({
    pendingPayments: [],
    activeUsers: [],
    pendingCompletions: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pending');
      if (res.ok) {
        const d = await res.json();
        setData({
          pendingPayments: d.pendingPayments || [],
          activeUsers: d.activeUsers || [],
          pendingCompletions: d.pendingCompletions || [],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditData();
    }
  }, [isOpen]);

  const handleConfirmPayment = async (uid: string) => {
    try {
      const res = await fetch('/api/admin/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const d = await res.json();
      if (d.success) {
        setActionMsg(d.message);
      }
      await fetchAuditData();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFastForward = async (uid: string) => {
    try {
      const res = await fetch('/api/admin/fast-forward-24h', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const d = await res.json();
      if (d.success) {
        setActionMsg(d.message);
      }
      await fetchAuditData();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetTimer = async (uid: string) => {
    try {
      const res = await fetch('/api/admin/reset-timer-24h', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const d = await res.json();
      if (d.success) {
        setActionMsg(d.message);
      }
      await fetchAuditData();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col p-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00ff88]/20 text-[#00ff88] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Admin Audit & Verification Panel</h2>
              <p className="text-[11px] text-slate-400">Confirm SmartCash payments (8024138981) & manage 24h task unlock</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAuditData}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Refresh"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className="mt-3 p-3 bg-emerald-950/80 border border-[#00ff88]/40 rounded-xl text-emerald-200 text-xs flex items-center justify-between">
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg(null)} className="text-xs text-slate-400 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Section 1: Pending Bank Transfer Payments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending SmartCash Payments Awaiting Confirmation ({data.pendingPayments.length})
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                Admin must confirm before 24h countdown starts
              </span>
            </div>

            {data.pendingPayments.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-950 p-4 rounded-xl border border-slate-800">
                No bank transfer payments currently awaiting admin confirmation.
              </p>
            ) : (
              <div className="space-y-2">
                {data.pendingPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white text-sm">{p.user_name || p.user_email}</div>
                      <div className="text-[11px] font-mono text-[#00ff88] font-semibold mt-0.5">
                        Ref: {p.reference || p.tx_ref || 'No Ref'} • ₦{p.amount || 1500}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Submitted: {new Date(p.date).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {p.proof_screenshot_url && (
                        <button
                          onClick={() => setSelectedImage(p.proof_screenshot_url)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 border border-slate-700"
                        >
                          <Image className="w-3.5 h-3.5 text-[#00ff88]" />
                          <span>View Proof</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleConfirmPayment(p.uid)}
                        className="px-3 py-1.5 bg-[#00ff88] hover:bg-[#00b248] text-slate-950 font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-md active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm & Start 24h Timer</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Active Members & 24h Cooldown Status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Confirmed Users & 24h Verification Status ({data.activeUsers.length})
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                Testing Tools
              </span>
            </div>

            {data.activeUsers.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-950 p-4 rounded-xl border border-slate-800">
                No active confirmed users yet.
              </p>
            ) : (
              <div className="space-y-2">
                {data.activeUsers.map((u) => {
                  const now = new Date().getTime();
                  const unlockTime = u.tasks_available_at ? new Date(u.tasks_available_at).getTime() : 0;
                  const isLocked = unlockTime > now;
                  const diff = unlockTime - now;
                  const hrs = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
                  const mins = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));

                  return (
                    <div
                      key={u.uid}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{u.full_name || u.email}</div>
                        <div className="text-[11px] text-slate-400">
                          {isLocked ? (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              24h Cooldown: ~{hrs}h {mins}m remaining
                            </span>
                          ) : (
                            <span className="text-[#00ff88] font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Tasks Active (24h Elapsed)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isLocked ? (
                          <button
                            onClick={() => handleFastForward(u.uid)}
                            className="px-2.5 py-1 bg-[#00ff88]/20 hover:bg-[#00ff88]/30 text-[#00ff88] font-bold rounded-lg text-[11px] flex items-center gap-1 border border-[#00ff88]/30"
                            title="Unlock tasks immediately for testing"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Fast-Forward 24h</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResetTimer(u.uid)}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg text-[11px] flex items-center gap-1 border border-amber-500/30"
                            title="Re-lock tasks for 24 hours"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Reset 24h Lock</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Recent Task Submissions */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Recent Task Proof Submissions ({data.pendingCompletions.length})
            </h3>
            {data.pendingCompletions.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-950 p-4 rounded-xl border border-slate-800">
                No task submissions recorded today.
              </p>
            ) : (
              <div className="space-y-2">
                {data.pendingCompletions.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{c.task_title}</div>
                      <div className="text-[10px] text-slate-400">
                        {c.user_email} • +₦{c.reward} • {new Date(c.submitted_at).toLocaleTimeString()}
                      </div>
                    </div>
                    {c.proof_screenshot_url && (
                      <button
                        onClick={() => setSelectedImage(c.proof_screenshot_url)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] flex items-center gap-1"
                      >
                        <Image className="w-3 h-3 text-[#00ff88]" />
                        <span>Screenshot</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Image Preview Modal */}
        {selectedImage && (
          <div className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="relative max-w-lg w-full bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white">Proof Screenshot View</span>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img
                src={selectedImage}
                alt="Proof Full View"
                className="max-h-[70vh] w-auto mx-auto rounded-xl object-contain border border-slate-800 shadow-2xl"
              />
              <div className="text-center pt-1">
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
