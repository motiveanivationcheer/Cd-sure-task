import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { compressImage, type CompressionResult } from '../utils/imageCompressor';
import confetti from 'canvas-confetti';
import {
  Lock,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  UploadCloud,
  FileImage,
  RefreshCw,
  ArrowRight,
  Briefcase,
  LogOut,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const ActivatePage: React.FC = () => {
  const {
    firebaseUser,
    userProfile,
    requestPresignedUploadUrl,
    uploadToPresignedUrl,
    submitActivationProof,
    fetchActivationStatus,
    navigate,
    logout,
    switchUserRole,
  } = useAuth();

  // Status state: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  const [paymentStatus, setPaymentStatus] = useState<string>('not_submitted');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);

  // Form state
  const [senderName, setSenderName] = useState<string>('');
  const [txRef, setTxRef] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [compressionProgress, setCompressionProgress] = useState<number>(0);
  const [compressionStatus, setCompressionStatus] = useState<string>('');
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    reductionPercentage: number;
  } | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userEmail = firebaseUser?.email || userProfile?.email || '';
  const narrationText = `CDSure Activation + ${userEmail}`;

  // Redirect employers immediately or activated earners
  useEffect(() => {
    if (userProfile?.role === 'employer') {
      navigate('/employer-dashboard');
    } else if (userProfile?.is_activated === 1 || userProfile?.is_activated === true) {
      navigate('/earner-dashboard');
    }
  }, [userProfile, navigate]);

  // Load current activation & payment status
  const loadStatus = async () => {
    setLoadingStatus(true);
    setErrorMsg(null);
    try {
      const data = await fetchActivationStatus();
      if (data) {
        if (data.is_activated) {
          setPaymentStatus('approved');
        } else if (data.payment_status) {
          setPaymentStatus(data.payment_status);
        }
        if (data.proof_image) setProofImage(data.proof_image);
        if (data.admin_note) setAdminNote(data.admin_note);
      }
    } catch (err: any) {
      console.warn('Could not load status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [firebaseUser]);

  const copyToClipboard = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
      setCompressing(true);
      setCompressionProgress(10);
      setCompressionStatus('Reading screenshot...');

      try {
        const result = await compressImage(file, {
          maxWidth: 1080,
          quality: 0.7,
          maxSizeKB: 800,
          onProgress: (msg, pct) => {
            setCompressionStatus(msg);
            setCompressionProgress(pct);
          },
        });

        setCompressedBlob(result.blob);
        setPreviewUrl(result.previewUrl);
        setCompressionStats({
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          reductionPercentage: result.reductionPercentage,
        });
      } catch (err: any) {
        console.warn('Compression fallback to original file:', err);
        setCompressedBlob(file);
        setPreviewUrl(URL.createObjectURL(file));
        setCompressionStats(null);
      } finally {
        setCompressing(false);
      }
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!compressedBlob && !selectedFile && !previewUrl) {
      setErrorMsg('Please select a screenshot or image proof of your transfer.');
      return;
    }

    if (!firebaseUser) {
      setErrorMsg('You must be signed in to submit proof.');
      return;
    }

    setSubmitting(true);

    try {
      let finalProofUrl = '';
      const payloadBlob = compressedBlob || selectedFile;

      // Fast Presigned URL direct upload flow
      if (payloadBlob) {
        const ext = selectedFile?.name?.split('.').pop() || 'jpg';
        const filename = `proof_${Date.now()}.${ext}`;
        const presigned = await requestPresignedUploadUrl(filename, 'image/jpeg', 'activation');

        if (presigned.success && presigned.uploadUrl && presigned.publicUrl) {
          // Upload directly to R2 / storage endpoint with PUT
          const uploadRes = await uploadToPresignedUrl(
            presigned.uploadUrl,
            payloadBlob,
            'image/jpeg'
          );

          if (uploadRes.success) {
            finalProofUrl = presigned.publicUrl;
          }
        }
      }

      // Confirm upload with CDSure Tasks backend
      let res: any;
      if (finalProofUrl) {
        res = await submitActivationProof({
          user_id: firebaseUser.uid,
          email: userEmail,
          proof_image: finalProofUrl,
          sender_name: senderName.trim(),
          reference: txRef.trim(),
        });
      } else {
        // Safe fallback using multipart form data
        const formData = new FormData();
        formData.append('user_id', firebaseUser.uid);
        formData.append('email', userEmail);
        if (selectedFile) {
          formData.append('proof', payloadBlob || selectedFile);
        }
        formData.append('sender_name', senderName.trim());
        formData.append('reference', txRef.trim());
        res = await submitActivationProof(formData);
      }

      if (res && res.success) {
        setPaymentStatus('pending');
        if (res.proof_image) setProofImage(res.proof_image);
        setSuccessMsg('Payment proof received! Admin is reviewing your transfer.');
        setSelectedFile(null);
        setCompressedBlob(null);
        setPreviewUrl(null);
        setCompressionStats(null);
        await loadStatus();
      } else {
        setErrorMsg(res?.error || 'Could not upload proof. Please try again.');
      }
    } catch (_err) {
      setErrorMsg('Could not upload proof. Please check your internet and try again.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 selection:bg-[#7C3AED] selection:text-white">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-[#7C3AED] flex items-center justify-center shadow-md shadow-purple-600/25">
            <Check className="w-6 h-6 text-white stroke-[3]" />
          </div>
          <span className="text-2xl font-black text-[#0f172a] tracking-tight">
            CDSure <span className="text-[#7C3AED]">Tasks</span>
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Verified Earner Activation Portal
        </p>
      </div>

      {/* Main Activation Container */}
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/70 border border-slate-100 relative">
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-50 text-[#7C3AED] border border-purple-100 mb-3 shadow-inner">
            <Lock className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight">
            Activate Your Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Pay ₦1,500 one-time fee to unlock all tasks and start earning daily
          </p>
        </div>

        {/* Global Feedback Banners */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-relaxed font-semibold">{successMsg}</span>
          </div>
        )}

        {/* =========================================================================
            STATUS DISPLAY: APPROVED
        ========================================================================== */}
        {paymentStatus === 'approved' && (
          <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-900">Account Activated!</h2>
              <p className="text-xs text-emerald-700 mt-1">
                Welcome to CDSure Tasks. All tasks are unlocked and ready.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/earner-dashboard')}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-sm flex items-center justify-center gap-2 transition"
            >
              <span>Go to Tasks Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =========================================================================
            STATUS DISPLAY: PENDING REVIEW
        ========================================================================== */}
        {paymentStatus === 'pending' && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-amber-900">Payment Under Review</h2>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  We received your proof. Admin is verifying your payment of <strong>₦1,500</strong> to <strong>8024138981</strong>. This takes 5–30 minutes.
                </p>
              </div>
            </div>

            {proofImage && (
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-amber-900 mb-1">Your Submitted Proof:</p>
                <div className="relative rounded-xl overflow-hidden border border-amber-200 max-h-48 bg-black/5 flex items-center justify-center">
                  <img
                    src={proofImage}
                    alt="Proof of Payment"
                    className="w-full object-contain max-h-48"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={loadStatus}
                disabled={loadingStatus}
                className="flex-1 py-2.5 px-3 bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-900 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
                <span>{loadingStatus ? 'Checking your activation...' : 'Refresh Status'}</span>
              </button>


              <button
                type="button"
                onClick={() => setPaymentStatus('not_submitted')}
                className="py-2.5 px-3 text-amber-800 hover:text-amber-900 font-medium text-xs underline"
              >
                Re-upload New Proof
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATUS DISPLAY: REJECTED
        ========================================================================== */}
        {paymentStatus === 'rejected' && (
          <div className="mb-6 p-5 rounded-2xl bg-red-50 border border-red-200 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-red-900">Payment Rejected</h2>
                <p className="text-xs text-red-800 mt-1 leading-relaxed">
                  Reason: <span className="font-semibold">{adminNote || 'Payment verification failed. Please review details and submit valid proof.'}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPaymentStatus('not_submitted');
                setPreviewUrl(null);
                setSelectedFile(null);
              }}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
            >
              <span>Re-upload Proof</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            PAYMENT INSTRUCTIONS & PROOF FORM (When not approved & not pending)
        ========================================================================== */}
        {paymentStatus !== 'approved' && paymentStatus !== 'pending' && (
          <div className="space-y-6">
            {/* STEP 1 - Transfer Details Box */}
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7C3AED] text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="font-bold text-[#0f172a] text-sm tracking-tight">
                    Bank Transfer Details
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                  Manual Transfer
                </span>
              </div>

              {/* Bank Name */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 font-medium">Bank</span>
                <span className="font-bold text-slate-800 text-sm">SmartCash</span>
              </div>

              {/* Account Number with Copy */}
              <div className="flex items-center justify-between text-xs py-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-500 text-[11px] block">Account Number</span>
                  <span className="font-black text-[#0f172a] text-base tracking-wider">
                    8024138981
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('8024138981', 'accNum')}
                  className="px-3 py-1.5 bg-white hover:bg-purple-50 text-slate-700 hover:text-[#7C3AED] border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  {copiedKey === 'accNum' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Account Name with Copy */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 font-medium">Account Name</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">USMAN ABDULLAHI</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('USMAN ABDULLAHI', 'accName')}
                    className="text-slate-400 hover:text-[#7C3AED] transition p-1"
                    title="Copy Account Name"
                  >
                    {copiedKey === 'accName' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Amount with Copy */}
              <div className="flex items-center justify-between text-xs py-1 bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
                <div>
                  <span className="text-purple-700 text-[11px] block font-medium">Amount to Pay</span>
                  <span className="font-black text-[#7C3AED] text-lg">₦1,500</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('1500', 'amount')}
                  className="px-3 py-1.5 bg-white hover:bg-purple-100/50 text-[#7C3AED] border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  {copiedKey === 'amount' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Narration with Copy */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 font-medium">Narration</span>
                <div className="flex items-center gap-2 max-w-[240px] text-right">
                  <span className="font-semibold text-slate-700 truncate" title={narrationText}>
                    {narrationText}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(narrationText, 'narration')}
                    className="text-slate-400 hover:text-[#7C3AED] transition p-1 shrink-0"
                    title="Copy Narration"
                  >
                    {copiedKey === 'narration' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* STEP 2 - Proof Upload Box */}
            <form onSubmit={handleSubmitProof} className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7C3AED] text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h2 className="font-bold text-[#0f172a] text-sm tracking-tight">
                    Upload Payment Proof
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400">Screenshot / Receipt</span>
              </div>

              {/* File Upload Drop Area */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Live Compression Progress Indicator */}
                {compressing && (
                  <div className="mb-3 p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-bold text-purple-900">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                        <span>{compressionStatus || 'Optimizing screenshot...'}</span>
                      </div>
                      <span className="text-[#7C3AED] font-black">{compressionProgress}%</span>
                    </div>
                    <div className="w-full bg-purple-200/60 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#7C3AED] h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${compressionProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-purple-700 mt-1.5 font-medium">
                      Resizing to max 1080px width & 70% quality for lightning-fast submission.
                    </p>
                  </div>
                )}

                {previewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-purple-200 bg-slate-50 p-2.5 flex flex-col items-center">
                    <img
                      src={previewUrl}
                      alt="Selected Screenshot"
                      className="max-h-52 w-auto object-contain rounded-xl shadow-sm"
                    />

                    {/* Compression Optimization Stats Badge */}
                    {compressionStats && (
                      <div className="mt-2.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                        <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-500 shrink-0" />
                        <span>
                          Optimized: {(compressionStats.originalSize / 1024 / 1024).toFixed(1)}MB → {(compressionStats.compressedSize / 1024).toFixed(0)}KB{' '}
                          <strong className="text-emerald-900 font-bold">({compressionStats.reductionPercentage}% smaller)</strong> — Ready for instant upload!
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-[#7C3AED] hover:underline"
                      >
                        Change Image
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setCompressedBlob(null);
                          setPreviewUrl(null);
                          setCompressionStats(null);
                        }}
                        className="text-xs font-semibold text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-purple-400 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/60 hover:bg-purple-50/20 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-100/60 text-[#7C3AED] flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      Click to upload transfer screenshot
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG, WebP — auto-optimized under 800KB for fast upload
                    </p>
                  </div>
                )}
              </div>

              {/* Sender Name Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sender Account Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. your bank account name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 outline-none text-xs text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Transaction Ref Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Reference / Session ID <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  placeholder="e.g. 090267... or transaction ref"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 outline-none text-xs text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Submit Button (Purple #7C3AED) */}
              <button
                type="submit"
                disabled={submitting || compressing}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 active:scale-[0.99] transition-all disabled:opacity-60 text-sm"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading your proof to CDSure Tasks...</span>
                  </div>
                ) : compressing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Optimizing proof image...</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>I Have Paid - Upload Proof</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Benefits List */}
        <div className="mt-6 bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
          <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
            Earner Activation Benefits:
          </p>
          <div className="flex items-center gap-2 text-slate-700">
            <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
            <span className="font-medium">Access to all tasks & high-paying gigs</span>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
            <span className="font-medium">Instant withdrawals to Nigerian banks</span>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
            <span className="font-medium">Verified earner badge & instant support</span>
          </div>
        </div>

        {/* Support Link */}
        <div className="mt-5 text-center">
          <p className="text-[11px] text-slate-400">
            Need payment help? Contact{' '}
            <a
              href="mailto:support@cdsure.com"
              className="text-[#7C3AED] font-semibold hover:underline"
            >
              support@cdsure.com
            </a>
          </p>
        </div>

        {/* Switcher & Logout */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => switchUserRole('employer')}
            className="text-slate-500 hover:text-[#7C3AED] font-semibold flex items-center gap-1.5 transition"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Switch to Employer</span>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-slate-400 font-medium">
        © 2026 CDSure — Paid Daily Tasks Platform
      </p>
    </div>
  );
};
