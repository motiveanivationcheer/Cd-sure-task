import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export const VerifyPage: React.FC = () => {
  const { verifyCodeOrToken, navigate } = useAuth();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setErrorMsg('No verification token found in URL.');
      setLoading(false);
      return;
    }

    const doVerify = async () => {
      try {
        const res = await verifyCodeOrToken(undefined, token);
        if (res.success) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00C853', '#10b981', '#ffffff'],
          });
          setSuccess(true);
        } else {
          setErrorMsg(res.message);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Verification failed.');
      } finally {
        setLoading(false);
      }
    };

    doVerify();
  }, [verifyCodeOrToken]);

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative">
        {loading ? (
          <div className="py-8 space-y-4">
            <div className="w-10 h-10 border-4 border-[#00C853] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-white">Verifying your CDSure activation...</p>
          </div>
        ) : success ? (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#00C853]/20 text-[#00C853] flex items-center justify-center mx-auto shadow-xl shadow-[#00C853]/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Account Activated!</h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your email confirmation token is verified. Welcome to CDSure Tasks.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 w-full bg-[#00C853] hover:bg-[#00b248] text-slate-950 font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-950/40 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h1 className="text-xl font-bold text-white">Verification Failed</h1>
            <p className="text-xs text-rose-300">{errorMsg}</p>
            <button
              onClick={() => navigate('/activate')}
              className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs"
            >
              Back to Activation Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
