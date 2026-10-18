import React, { useState, useEffect } from 'react';
import { ShieldAlert, Key, Eye, EyeOff, Lock, X, AlertOctagon } from 'lucide-react';

export default function SecretAdminAuthModal({
  isOpen,
  onClose,
  onAuthenticate,
  adminMasterKey = 'Admin@2026Master#'
}) {
  const [passcode, setPasscode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setErrorMsg('');
      setShowPass(false);
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsVerifying(true);

    const cleanInput = passcode.trim();
    const validKey = (adminMasterKey || 'Admin@2026Master#').trim();

    if (cleanInput && cleanInput === validKey) {
      onAuthenticate();
      onClose();
    } else {
      setErrorMsg('Access Denied: Incorrect Master Passcode.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#141C2B] border border-rose-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl shadow-rose-950/50 space-y-5 relative">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 shadow-inner">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase text-rose-400 font-bold">Confidential Access</div>
            <h3 className="font-black text-white text-lg">Super Admin Gateway</h3>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Platform Administrator Control Portal. Authorized personnel only. Enter your confidential master passcode to unlock root system commands.
        </p>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-xs">
            <label className="font-bold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-rose-400" />
              <span>Master Passcode</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Enter secret master passcode..."
                value={passcode}
                onChange={(e) => { setPasscode(e.target.value); setErrorMsg(''); }}
                required
                autoFocus
                className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3 py-3 pr-10 text-xs text-white font-mono focus:border-rose-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-rose-950/40 transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{isVerifying ? 'Verifying...' : 'Authenticate & Unlock Control Center'}</span>
          </button>
        </form>

      </div>
    </div>
  );
}
