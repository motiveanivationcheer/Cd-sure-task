import React, { useState } from 'react';
import type { Task } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, Upload, CheckCircle2, AlertCircle, ExternalLink, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskSubmissionModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isExpired: boolean;
  minutesLeft: number;
}

export const TaskSubmissionModal: React.FC<TaskSubmissionModalProps> = ({
  task,
  isOpen,
  onClose,
  onSuccess,
  isExpired,
  minutesLeft,
}) => {
  const { completeTaskWithProof, tasksLocked24h, formattedStartTime } = useAuth();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Screenshot file size must be less than 5MB.');
        return;
      }
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tasksLocked24h) {
      setErrorMsg(
        `Admin has confirmed your payment, but you need to wait 24 hours before tasks begin. Your start time is ${formattedStartTime || 'tomorrow'}.`
      );
      return;
    }
    if (isExpired) {
      setErrorMsg('Task Expired - Come back tomorrow! Submissions close 1 hour before daily midnight UTC.');
      return;
    }

    if (!proofPreview) {
      setErrorMsg('Screenshot proof of completion is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await completeTaskWithProof(task.id, proofPreview);
      if (res.success) {
        confetti({
          particleCount: 90,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00ff88', '#10b981', '#fbbf24'],
        });
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Task Title and Reward */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30 px-2 py-0.5 rounded-full">
              +₦{task.reward} Reward
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{Math.floor(minutesLeft / 60)}h {minutesLeft % 60}m left</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-white">{task.title}</h2>
          <p className="text-xs text-slate-400 mt-1">{task.instructions}</p>
        </div>

        {/* 1-Hour Expiry Rule Warning */}
        <div className={`p-3 rounded-xl border text-xs mb-4 flex items-start gap-2.5 ${
          isExpired
            ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
            : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
        }`}>
          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              {isExpired ? 'Task Expired - Submissions Closed' : '1-Hour Expiry Rule Active'}
            </p>
            <p className="text-[11px] opacity-90 mt-0.5">
              {isExpired
                ? 'Tasks expire 1 hour before midnight UTC. Please come back tomorrow.'
                : 'Tasks reset daily at 12:00 AM UTC. You must submit your proof screenshot at least 1 hour before expiry.'}
            </p>
          </div>
        </div>

        {/* External Link Action if required */}
        {task.link && (
          <div className="mb-4">
            <a
              href={task.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <span>1. Open Official Task Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Screenshot Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              2. Upload Screenshot Proof of Completion <span className="text-rose-400">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-700 hover:border-[#00ff88] rounded-2xl p-4 text-center bg-slate-950/60 transition-colors relative cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                required
                disabled={isExpired}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              {proofPreview ? (
                <div className="space-y-2">
                  <img
                    src={proofPreview}
                    alt="Task proof"
                    className="max-h-36 mx-auto rounded-lg object-contain border border-slate-700"
                  />
                  <p className="text-[11px] text-[#00ff88] font-semibold">Screenshot attached. Click to change.</p>
                </div>
              ) : (
                <div className="py-3 space-y-1">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-medium text-slate-300">Tap to upload task screenshot</p>
                  <p className="text-[10px] text-slate-500">JPG or PNG, max 5MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isExpired || !proofPreview}
              className="w-2/3 bg-[#00ff88] hover:bg-[#00b248] text-slate-950 font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00ff88]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : isExpired ? (
                <span>Task Expired</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Proof for ₦{task.reward}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
