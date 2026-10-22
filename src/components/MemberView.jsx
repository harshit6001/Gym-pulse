import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import QrCameraScanner from './QrCameraScanner';
import { 
  QrCode, Flame, Calendar, Clock, ShieldAlert, CheckCircle2, AlertTriangle, 
  ShoppingBag, Sparkles, ChevronRight, Lock, RefreshCw, Smartphone, Phone, 
  MessageSquare, User, Dumbbell, Award, ArrowRight, Zap, Check, X, WifiOff, FileText, Camera,
  Mail, ShieldCheck, Key, Eye, EyeOff, Edit3, Send
} from 'lucide-react';
import { apiVerifyEmail, apiSendVerification } from '../lib/api';

export default function MemberView({ 
  member, 
  plans, 
  addOns, 
  attendanceLogs, 
  onPerformCheckIn, 
  onOpenPaymentModal, 
  onBuyAddOn, 
  onToggleWhatsappOptOut,
  onEmailVerified,
  onUpdateMemberEmail,
  onChangePassword,
  specialHolidays = [],
  activeGymFeatures = []
}) {
  const [activeTab, setActiveTab] = useState('home');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalMode, setQrModalMode] = useState('camera'); // 'camera' or 'pass'
  const [qrTestResult, setQrTestResult] = useState(null);
  const [selectedPlanForRenewal, setSelectedPlanForRenewal] = useState(null);
  const [selectedAddOnModal, setSelectedAddOnModal] = useState(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState({ type: '', text: '' });
  const [isLocallyVerified, setIsLocallyVerified] = useState(member?.emailVerified === true);

  // Email Change State
  const [isChangingMemberEmail, setIsChangingMemberEmail] = useState(false);
  const [newMemberEmailDraft, setNewMemberEmailDraft] = useState('');
  const [isSendingMemberCode, setIsSendingMemberCode] = useState(false);
  const [memberEmailChangeFeedback, setMemberEmailChangeFeedback] = useState('');

  useEffect(() => {
    setIsLocallyVerified(member?.emailVerified === true);
  }, [member?.emailVerified]);
  const [addOnAgreedTerms, setAddOnAgreedTerms] = useState(false);

  // Rotating QR token — changes every 30 seconds
  const [qrRotateCount, setQrRotateCount] = useState(0);
  const [qrCountdown, setQrCountdown] = useState(30);

  // Member Permanent Password Change State
  const [currentMemberPassword, setCurrentMemberPassword] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [confirmMemberPassword, setConfirmMemberPassword] = useState('');
  const [showMemberCurrentPass, setShowMemberCurrentPass] = useState(false);
  const [showMemberNewPass, setShowMemberNewPass] = useState(false);
  const [showMemberConfirmPass, setShowMemberConfirmPass] = useState(false);
  const [isChangingMemberPassword, setIsChangingMemberPassword] = useState(false);
  const [memberPasswordFeedback, setMemberPasswordFeedback] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!qrModalOpen) return;
    setQrCountdown(30);
    const interval = setInterval(() => {
      setQrCountdown(prev => {
        if (prev <= 1) {
          setQrRotateCount(c => c + 1);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qrModalOpen]);

  const handleSendVerificationEmail = async () => {
    setVerifyLoading(true);
    setVerifyMessage({ type: '', text: '' });
    const targetEmail = (isChangingMemberEmail ? newMemberEmailDraft : (member.email || '')).trim().toLowerCase();
    try {
      const res = await apiSendVerification({
        memberId: member.id,
        role: 'member',
        email: targetEmail,
        phone: member.phone,
        name: member.name
      });
      if (res && res.success) {
        setVerifyMessage({
          type: 'success',
          text: `Unique 6-digit verification code sent to ${targetEmail || 'your email'}! Check your inbox and enter the code below.${res.token ? ` (Code: ${res.token})` : ''}`
        });
      } else {
        setVerifyMessage({ type: 'error', text: res?.error || 'Failed to generate verification token.' });
      }
    } catch {
      setVerifyMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSendNewMemberEmailCode = async () => {
    const cleanNewEmail = newMemberEmailDraft.trim().toLowerCase();
    if (!cleanNewEmail || !cleanNewEmail.includes('@')) {
      setMemberEmailChangeFeedback('❌ Please enter a valid email address.');
      return;
    }
    setIsSendingMemberCode(true);
    setMemberEmailChangeFeedback('');
    try {
      const res = await apiSendVerification({
        memberId: member.id,
        role: 'member',
        email: cleanNewEmail,
        phone: member.phone,
        name: member.name
      });
      if (res && res.success) {
        setVerifyCodeInput('');
        setVerifyMessage({
          type: 'success',
          text: `Verification code sent to ${cleanNewEmail}! Enter the 6-digit code below to confirm and activate.${res.token ? ` (Code: ${res.token})` : ''}`
        });
        setVerifyModalOpen(true);
      } else {
        setMemberEmailChangeFeedback(`❌ ${res?.error || 'Failed to send verification code.'}`);
      }
    } catch (err) {
      setMemberEmailChangeFeedback(`❌ Error sending code: ${err.message}`);
    } finally {
      setIsSendingMemberCode(false);
    }
  };

  const handleChangeMemberPasswordSubmit = async (e) => {
    e.preventDefault();
    setMemberPasswordFeedback({ type: '', text: '' });

    const actualCurrentPass = member.password || '';
    if (actualCurrentPass && currentMemberPassword !== actualCurrentPass) {
      setMemberPasswordFeedback({ type: 'error', text: 'Current password is incorrect.' });
      return;
    }

    const cleanNewPass = newMemberPassword.trim();
    if (!cleanNewPass || cleanNewPass.length < 4) {
      setMemberPasswordFeedback({ type: 'error', text: 'New password must be at least 4 characters long.' });
      return;
    }

    if (cleanNewPass !== confirmMemberPassword.trim()) {
      setMemberPasswordFeedback({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setIsChangingMemberPassword(true);
    try {
      if (onChangePassword) {
        const res = await onChangePassword(member.id, cleanNewPass);
        if (res && res.success) {
          setCurrentMemberPassword('');
          setNewMemberPassword('');
          setConfirmMemberPassword('');
          setMemberPasswordFeedback({
            type: 'success',
            text: 'Password updated permanently on backend! Use your new password on next login.'
          });
          setTimeout(() => setMemberPasswordFeedback({ type: '', text: '' }), 5000);
        } else {
          setMemberPasswordFeedback({ type: 'error', text: res?.error || 'Failed to update password.' });
        }
      }
    } catch (err) {
      setMemberPasswordFeedback({ type: 'error', text: err.message || 'Error updating password.' });
    } finally {
      setIsChangingMemberPassword(false);
    }
  };

  const handleVerifyCodeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!verifyCodeInput.trim()) return;
    setVerifyLoading(true);
    setVerifyMessage({ type: '', text: '' });
    try {
      const res = await apiVerifyEmail(verifyCodeInput.trim());
      if (res.success) {
        setIsLocallyVerified(true);
        const finalEmail = (isChangingMemberEmail ? newMemberEmailDraft : (member.email || '')).trim().toLowerCase();
        if (onUpdateMemberEmail && isChangingMemberEmail && finalEmail) {
          await onUpdateMemberEmail(member.id, finalEmail);
        }
        setIsChangingMemberEmail(false);
        setNewMemberEmailDraft('');
        setVerifyMessage({ type: 'success', text: res.message || 'Email verified successfully!' });
        if (onEmailVerified) onEmailVerified(member.id);
        setTimeout(() => {
          setVerifyModalOpen(false);
          setVerifyCodeInput('');
        }, 1500);
      } else {
        setVerifyMessage({ type: 'error', text: res.error || 'Invalid or expired verification code.' });
      }
    } catch {
      setVerifyMessage({ type: 'error', text: 'Network error verifying code.' });
    } finally {
      setVerifyLoading(false);
    }
  };

  // Guard against null/empty member state in clean production database
  if (!member || !member.membership) {
    return (
      <div className="bg-[#141C2B] rounded-3xl p-8 border border-slate-800 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
          <User className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">No Member Account Found</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Please log in with your registered mobile number or register a new membership plan.
        </p>
      </div>
    );
  }

  // Helper date calculations — always use real current time
  const todayStr = new Date().toISOString().split('T')[0];
  const endDate = new Date(member.membership.endDate);
  endDate.setHours(23, 59, 59, 999); // count the full last day
  const now = new Date();
  const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 7;
  const isExpired = daysRemaining < 0 || member.status === 'expired';

  // Today Holiday & Rest Day status
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayHoliday = (specialHolidays || []).find(h => h.date === todayDateStr);
  const isTodaySunday = new Date().getDay() === 0;

  // Member's attendance history
  const memberAttendance = attendanceLogs.filter(a => a.memberId === member.id);

  // QR Test Action simulation
  const handleSimulateQRScan = (type) => {
    if (type === 'valid') {
      const res = onPerformCheckIn(member.id, 'QR_SELF', 'Valid Scanner Scan');
      setQrTestResult(res);
    } else if (type === 'duplicate') {
      setQrTestResult({
        status: 'DUPLICATE_SCAN',
        message: 'Check-in blocked! Only 1 check-in allowed every 24 hours strictly. You already checked in recently.',
        timeRemaining: 'Strict 24-hour scan lock active'
      });
    } else if (type === 'invalid') {
      setQrTestResult({
        status: 'INVALID_QR',
        message: 'Invalid or expired QR code payload. Please scan the current gym screen QR.',
      });
    } else if (type === 'expired') {
      setQrTestResult({
        status: 'EXPIRED_MEMBERSHIP',
        message: 'Check-in blocked! Your membership expired on ' + member.membership.endDate,
      });
    } else if (type === 'offline') {
      setQrTestResult({
        status: 'OFFLINE_SYNC_PENDING',
        message: 'Offline mode active. Check-in saved locally & queued for cloud sync.',
      });
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Today Gym Holiday / Sunday Off-Day Streak Shield Banner */}
      {(todayHoliday || isTodaySunday) && (
        <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm">
                  {todayHoliday ? `🎉 Today's Gym Off-Day: ${todayHoliday.title}` : `🌟 Sunday Routine Rest Day`}
                </span>
                <span className="text-[10px] font-extrabold bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full">
                  Streak Auto-Protected 🛡️
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Enjoy your rest day! Your {member.streak?.current || 1}-day gym streak is preserved automatically by gym management.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('calendar')}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/30 transition-all flex items-center gap-1 shrink-0"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>View Calendar ({specialHolidays.length})</span>
          </button>
        </div>
      )}

      {/* Expiry Warning Banner (Show if 7 days or fewer remaining) */}
      {isExpiringSoon && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-transparent border border-amber-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm">Membership Expiring Soon!</span>
                <span className="text-[10px] font-extrabold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                  {daysRemaining === 0 ? 'Expires Today' : `${daysRemaining} Days Left`}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Renew now to keep your {member.streak.current}-day gym streak intact and unlock 15% discount.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('renew')}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>Renew Membership</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Paused Membership Banner */}
      {member.status === 'paused' && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-100 text-sm">Membership Paused (Freeze Active)</div>
              <p className="text-xs text-slate-400">Reason: {member.pauseReason || 'Approved Leave'}. Pause active until {member.pauseUntil}. Streak is protected!</p>
            </div>
          </div>
        </div>
      )}

      {/* Member Main Navigation Tabs */}
      <div className="flex items-center gap-1 bg-[#141C2B] p-1.5 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'home'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        {(activeGymFeatures.length === 0 || activeGymFeatures.includes('qr_attendance')) && (
          <button
            onClick={() => { setActiveTab('home'); setQrModalOpen(true); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/20 hover:scale-[1.02]`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Check-in</span>
          </button>
        )}

        {(activeGymFeatures.length === 0 || activeGymFeatures.includes('attendance_logs')) && (
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Attendance</span>
          </button>
        )}

        {(activeGymFeatures.length === 0 || activeGymFeatures.includes('attendance_logs')) && (
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Gym Calendar ({specialHolidays.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('renew')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'renew'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Renew Plan</span>
        </button>

        {(activeGymFeatures.length === 0 || activeGymFeatures.includes('addon_store')) && (
          <button
            onClick={() => setActiveTab('addons')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'addons'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add-ons Store</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Settings & Opt-out</span>
        </button>
      </div>

      {/* TAB 1: HOME DASHBOARD */}
      {activeTab === 'home' && (
        <div className="space-y-5">
          
          {/* Member Card Header */}
          <div className="bg-gradient-to-br from-[#141C2B] via-[#1E293B] to-[#0B0F17] rounded-3xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-lg"
                  />
                  {member.status === 'active' && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#141C2B] flex items-center justify-center">
                      <Check className="w-3 h-3 text-slate-950 font-bold" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-white tracking-tight">{member.name}</h2>
                    <span className="text-xs text-slate-400">({member.phone})</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {member.membership.planName}
                    </span>
                    <span className="text-xs text-slate-400">
                      Valid till <span className="text-slate-200 font-bold">{member.membership.endDate}</span>
                    </span>
                    {isLocallyVerified ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Email Verified</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setVerifyModalOpen(true); setVerifyMessage({ type: '', text: '' }); }}
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Unverified Email — Verify</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Check-in Button */}
              {(activeGymFeatures.length === 0 || activeGymFeatures.includes('qr_attendance')) && (
                <button
                  onClick={() => setQrModalOpen(true)}
                  className="px-5 py-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 group"
                >
                  <QrCode className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>Scan Gym QR Code</span>
                </button>
              )}
            </div>
          </div>

          {/* Key Member Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Streak & Fair Rest Protection */}
            <div className="bg-[#141C2B] rounded-3xl p-5 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gym Streak</span>
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
              </div>

              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{member.streak.current}</span>
                  <span className="text-sm font-semibold text-slate-400">Days Active</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Personal Best: <span className="text-emerald-400 font-bold">{member.streak.max} Days</span>
                </p>
              </div>

              {/* Fair Streak Protection Callout */}
              <div className="bg-[#0B0F17] rounded-xl p-2.5 border border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Fair Streak Shield: Sundays &amp; Holidays protected!</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('calendar')}
                  className="text-emerald-400 hover:underline font-bold text-[10px] shrink-0"
                >
                  View ({specialHolidays.length})
                </button>
              </div>
            </div>

            {/* Weekly Goal Progress */}
            <div className="bg-[#141C2B] rounded-3xl p-5 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Weekly Goal</span>
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              <div className="my-3">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-extrabold text-white">3 / {member.weeklyGoalDays} Days</span>
                  <span className="text-xs font-bold text-emerald-400">60% Completed</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-[60%] transition-all duration-500" />
                </div>
              </div>

              <p className="text-xs text-slate-400">
                2 more workouts needed this week to achieve target.
              </p>
            </div>

            {/* Assigned Trainer & PT Status */}
            <div className="bg-[#141C2B] rounded-3xl p-5 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Coach</span>
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                  <Dumbbell className="w-5 h-5" />
                </div>
              </div>

              <div className="my-3">
                <div className="text-base font-bold text-white">{member?.assignedTrainer || 'Personal Fitness Coach'}</div>
                <div className="text-xs text-purple-400 font-medium">Strength &amp; Conditioning Coach</div>
                <p className="text-xs text-slate-400 mt-2">
                  Personalized workout guidance and progressive training plans.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('addons')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <span>Book PT Session / Diet</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* Recent Attendance Highlights */}
          <div className="bg-[#141C2B] rounded-3xl p-5 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Recent Gym Visits</span>
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs text-emerald-400 font-bold hover:underline"
              >
                View Full Log ({memberAttendance.length})
              </button>
            </div>

            {memberAttendance.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No check-ins logged yet today.</p>
            ) : (
              <div className="space-y-2">
                {memberAttendance.slice(0, 3).map((log) => (
                  <div key={log.id} className="bg-[#0B0F17] rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                        QR
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">{log.timestamp}</div>
                        <div className="text-[11px] text-slate-400">{log.method === 'QR_SELF' ? 'Self QR Scan' : `Assisted Check-in (${log.reason || 'Staff Verified'})`}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                      Verified
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Gym Holidays & Streak Shield Preview */}
          <div className="bg-[#141C2B] rounded-3xl p-5 border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Upcoming Gym Holidays &amp; Rest Days</h4>
                  <p className="text-[10px] text-slate-400">Official off-days when your streak is automatically shielded</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className="text-xs text-emerald-400 font-bold hover:underline"
              >
                Full Calendar ({specialHolidays.length})
              </button>
            </div>

            {specialHolidays.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 text-center">No upcoming gym holidays scheduled.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {specialHolidays.slice(0, 3).map((h) => {
                  const isToday = h.date === todayDateStr;
                  const dateObj = new Date(h.date);
                  const formattedDay = !isNaN(dateObj)
                    ? dateObj.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
                    : h.date;

                  return (
                    <div
                      key={h.id}
                      className={`p-3 rounded-2xl border text-xs flex flex-col justify-between space-y-2 ${
                        isToday
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-[#0B0F17] border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-slate-300">{formattedDay}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          h.type === 'SUNDAY'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {h.type === 'SUNDAY' ? 'Sunday Off' : 'Holiday'}
                        </span>
                      </div>
                      <div className="font-bold text-white text-xs">{h.title}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Streak Shielded</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: ATTENDANCE HISTORY */}
      {activeTab === 'history' && (activeGymFeatures.length === 0 || activeGymFeatures.includes('attendance_logs')) && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white">Attendance History</h3>
              <p className="text-xs text-slate-400">Complete verified check-in audit trail for {member.name}</p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              Total Visits: {memberAttendance.length}
            </div>
          </div>

          <div className="space-y-3">
            {memberAttendance.map((log) => (
              <div key={log.id} className="bg-[#0B0F17] rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-100 text-sm">{log.timestamp}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Method: <strong className="text-slate-200">{log.method}</strong></span>
                      {log.device && <span>• Device: {log.device}</span>}
                      {log.staffName && <span>• Verified by: {log.staffName}</span>}
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-amber-300/80 italic mt-1">Reason: "{log.reason}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30">
                    Attendance Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RENEWAL SCREEN */}
      {activeTab === 'renew' && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Guaranteed Best Rate Renewal
            </span>
            <h3 className="text-2xl font-black text-white">Choose Your Membership Renewal</h3>
            <p className="text-xs text-slate-400">
              Extend active plan safely. Payments are verified instantly via UPI / Card with automatic receipt generation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.filter(p => p.durationMonths >= 3).map((plan) => {
              const isSelected = selectedPlanForRenewal?.id === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanForRenewal(plan)}
                  className={`rounded-3xl p-6 border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500 shadow-2xl shadow-emerald-500/10 scale-[1.02]'
                      : 'bg-[#0B0F17] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-[10px] uppercase px-3 py-0.5 rounded-full shadow-md">
                      Most Popular Tier
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-extrabold text-white text-lg">{plan.name}</h4>
                      <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {plan.discountPercent}% OFF
                      </span>
                    </div>

                    <div className="my-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">₹{plan.finalPrice.toLocaleString('en-IN')}</span>
                        <span className="text-sm line-through text-slate-500">₹{plan.basePrice.toLocaleString('en-IN')}</span>
                      </div>
                      <span className="text-xs text-slate-400">Valid for {plan.durationMonths} Months</span>
                    </div>

                    <ul className="space-y-2.5 my-5 text-xs text-slate-300">
                      {plan.benefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPaymentModal(member, plan);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed to UPI Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Payment Terms & Single Execution Safeguard Note */}
          <div className="bg-[#0B0F17] rounded-2xl p-4 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
            <Lock className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-200">Strict Single-Execution State Guarantee:</span>
              <p className="mt-0.5">Membership extension is triggered ONLY when provider payment is status = PAID. Duplicate callbacks are idempotently ignored.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ADD-ONS MARKETPLACE */}
      {activeTab === 'addons' && (activeGymFeatures.length === 0 || activeGymFeatures.includes('addon_store')) && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-extrabold text-white">Add-On Marketplace</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Personal Training, Nutrition Charts & Authentic Supplements. Add-ons are NEVER pre-selected.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {addOns.map((item) => (
              <div
                key={item.id}
                className="bg-[#0B0F17] rounded-2xl p-5 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                      <h4 className="font-bold text-white text-base mt-2">{item.name}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-emerald-400">₹{item.price}</div>
                      {item.stockOrCapacity !== null && (
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          Stock/Slots: <span className="text-amber-400 font-bold">{item.stockOrCapacity} left</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-3">{item.description}</p>

                  <div className="bg-[#141C2B] rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 mt-3 space-y-1">
                    <div><strong>Validity / Terms:</strong> {item.terms}</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedAddOnModal(item);
                    setAddOnAgreedTerms(false);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>View Details & Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PROFILE & OPT-OUT CONTROLS */}
      {activeTab === 'profile' && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-slate-300" />
            <div>
              <h3 className="text-lg font-extrabold text-white">Communication Preferences & Opt-Out</h3>
              <p className="text-xs text-slate-400">Manage how GymPulse contacts you regarding workouts and renewals.</p>
            </div>
          </div>

          {activeGymFeatures.includes('whatsapp_reminders') && (
            <div className="bg-[#0B0F17] rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-100 text-sm">WhatsApp Motivation & Attendance Reminders</div>
                  <p className="text-xs text-slate-400 max-w-md">
                    Receive friendly Hinglish workout reminders if you miss 3+ days and renewal alerts.
                  </p>
                </div>

                <button
                  onClick={() => onToggleWhatsappOptOut(member.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    member.optedOutWhatsapp
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {member.optedOutWhatsapp ? 'Opted Out (Disabled)' : 'Subscribed (Active)'}
                </button>
              </div>
            </div>
          )}

          {/* Email Verification Status & Actions */}
          <div className="bg-[#0B0F17] rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Email Verification</span>
                </div>
                <p className="text-xs text-slate-400 max-w-md mt-0.5">
                  Registered Email: <span className="font-mono text-white font-bold">{member.email || 'No email registered'}</span>
                </p>
                <div className="mt-2">
                  {isLocallyVerified && !isChangingMemberEmail ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <Check className="w-3.5 h-3.5" />
                      <span>Email Verified &amp; Active</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{isChangingMemberEmail ? 'Updating Email Address' : 'Unverified Email Address'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons: When verified, show "Change Email". Only when unverified, show "Verify Email Now" */}
              {isLocallyVerified && !isChangingMemberEmail ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingMemberEmail(true);
                    setNewMemberEmailDraft(member.email || '');
                    setMemberEmailChangeFeedback('');
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>
              ) : !isChangingMemberEmail ? (
                <button
                  type="button"
                  onClick={() => { setVerifyModalOpen(true); setVerifyMessage({ type: '', text: '' }); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Verify Email Now</span>
                </button>
              ) : null}
            </div>

            {/* Change Email Inline Form — Shown only when member clicked Change Email */}
            {isChangingMemberEmail && (
              <div className="pt-3 border-t border-slate-800 space-y-3 bg-[#141C2B] p-4 rounded-xl border border-amber-500/30">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200">New Email Address</label>
                  <p className="text-[11px] text-slate-400">
                    A unique 6-digit verification code will be dispatched to this new address. Your account will update once verified.
                  </p>
                  <input
                    type="email"
                    value={newMemberEmailDraft}
                    onChange={(e) => setNewMemberEmailDraft(e.target.value)}
                    placeholder="Enter new email address (e.g. member@gmail.com)"
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {memberEmailChangeFeedback && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
                    {memberEmailChangeFeedback}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSendNewMemberEmailCode}
                    disabled={isSendingMemberCode || !newMemberEmailDraft.includes('@')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingMemberCode ? 'Sending Code...' : 'Send Verification Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingMemberEmail(false);
                      setNewMemberEmailDraft('');
                      setMemberEmailChangeFeedback('');
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card: Change Account Password Permanently */}
          <form onSubmit={handleChangeMemberPasswordSubmit} className="bg-[#0B0F17] rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">Change Password Permanently</h4>
                  <p className="text-[11px] text-slate-400">Update your member login password. Saves directly to live database.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Current Password</label>
                <div className="relative">
                  <input
                    type={showMemberCurrentPass ? 'text' : 'password'}
                    value={currentMemberPassword}
                    onChange={(e) => setCurrentMemberPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 pr-8 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMemberCurrentPass(!showMemberCurrentPass)}
                    className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showMemberCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">New Password *</label>
                <div className="relative">
                  <input
                    type={showMemberNewPass ? 'text' : 'password'}
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    required
                    className="w-full bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 pr-8 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMemberNewPass(!showMemberNewPass)}
                    className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showMemberNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showMemberConfirmPass ? 'text' : 'password'}
                    value={confirmMemberPassword}
                    onChange={(e) => setConfirmMemberPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 pr-8 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMemberConfirmPass(!showMemberConfirmPass)}
                    className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showMemberConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {memberPasswordFeedback.text && (
              <div className={`p-2.5 rounded-xl font-bold text-xs flex items-center gap-2 ${
                memberPasswordFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}>
                {memberPasswordFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{memberPasswordFeedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isChangingMemberPassword}
              className="py-2.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isChangingMemberPassword ? 'Updating Password...' : 'Save New Password Permanently'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB: GYM CALENDAR & SPECIAL HOLIDAYS */}
      {activeTab === 'calendar' && (activeGymFeatures.length === 0 || activeGymFeatures.includes('attendance_logs')) && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white">Gym Calendar &amp; Streak Shields</h3>
                  <p className="text-xs text-slate-400">Official scheduled holidays &amp; Sundays set by gym management</p>
                </div>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Streak Protection Active</span>
            </div>
          </div>

          {/* Info callout */}
          <div className="bg-[#0B0F17] rounded-2xl p-4 border border-slate-800/80 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <span className="font-bold text-white">How Gym Off-Days Protect Your Streak:</span>
              <p className="text-slate-400">
                On all scheduled gym holidays and Sundays listed below, the gym recognizes an official rest day. You will <strong className="text-emerald-400">never lose your gym streak</strong> for missing on these dates. Whenever a special holiday is scheduled, an automatic streak credit protects your active progress!
              </p>
            </div>
          </div>

          {/* Calendar List */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider text-slate-400">
              Scheduled Off-Days ({specialHolidays.length})
            </h4>

            {specialHolidays.length === 0 ? (
              <div className="text-center py-12 bg-[#0B0F17] rounded-2xl border border-slate-800 text-slate-400 text-xs">
                No holidays or off-days scheduled by gym management at this time. Standard training schedule is active.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {specialHolidays.map((h) => {
                  const isToday = h.date === todayDateStr;
                  const isPast = h.date < todayDateStr;
                  const dateObj = new Date(h.date);
                  const formattedDay = !isNaN(dateObj)
                    ? dateObj.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
                    : h.date;

                  return (
                    <div
                      key={h.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isToday
                          ? 'bg-gradient-to-r from-emerald-500/15 via-[#141C2B] to-[#0B0F17] border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                          : isPast
                          ? 'bg-[#0B0F17]/50 border-slate-800/60 opacity-60'
                          : 'bg-[#0B0F17] border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg ${
                          isToday ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {formattedDay}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 animate-pulse">
                              Active Today
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            h.type === 'SUNDAY'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          }`}>
                            {h.type === 'SUNDAY' ? 'Sunday Routine Off' : 'Special Holiday'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="font-extrabold text-white text-sm">{h.title}</div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {h.type === 'SUNDAY'
                            ? 'Scheduled weekly recovery day for muscle rebuild.'
                            : 'Official gym holiday observed by management.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Streak Shield Guaranteed</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {isPast ? 'Completed' : isToday ? 'Today' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR SCANNER & PASS MODAL */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
            
            <button
              onClick={() => { setQrModalOpen(false); setQrTestResult(null); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-white flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <span>Gym Gate Check-in</span>
              </h3>
              <p className="text-xs text-slate-400">Scan entrance QR code or present your digital pass</p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-[#0B0F17] p-1 rounded-2xl border border-slate-800 text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => { setQrModalMode('camera'); setQrTestResult(null); }}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  qrModalMode === 'camera'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Gym QR</span>
              </button>

              <button
                type="button"
                onClick={() => { setQrModalMode('pass'); setQrTestResult(null); }}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  qrModalMode === 'pass'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Show My Pass</span>
              </button>
            </div>

            {/* MODE 1: CAMERA SCANNER */}
            {qrModalMode === 'camera' && (
              <div className="space-y-4">
                <QrCameraScanner
                  onScanSuccess={(decoded) => {
                    handleSimulateQRScan('valid');
                  }}
                  onScanError={() => {}}
                />

                <div className="text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateQRScan('valid')}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Instant 1-Tap Check-In (Quick Verification)</span>
                  </button>
                  <p className="text-[11px] text-slate-500">
                    Works automatically when near the entrance gate.
                  </p>
                </div>
              </div>
            )}

            {/* MODE 2: DIGITAL MEMBER PASS */}
            {qrModalMode === 'pass' && (
              <div className="space-y-4">
                <div className="bg-[#0B0F17] p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
                    <QRCodeSVG
                      value={`FITPULSE:CHECKIN:${member.id}:${todayStr}:T${qrRotateCount}`}
                      size={170}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Member Pass: {member.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ID: {member.id} · Token Session: T{qrRotateCount}</div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono w-full">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span>Rotates in <strong className={`${qrCountdown <= 5 ? 'text-rose-400' : 'text-emerald-400'}`}>{qrCountdown}s</strong></span>
                    <div className="ml-auto w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(qrCountdown / 30) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Test Simulation Controls */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Test Gate Scanner Responses:</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                    <button
                      onClick={() => handleSimulateQRScan('valid')}
                      className="py-2 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl"
                    >
                      Valid Entry
                    </button>
                    <button
                      onClick={() => handleSimulateQRScan('duplicate')}
                      className="py-2 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl"
                    >
                      Duplicate (&lt;24h)
                    </button>
                    <button
                      onClick={() => handleSimulateQRScan('expired')}
                      className="py-2 px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl"
                    >
                      Expired Plan
                    </button>
                    <button
                      onClick={() => handleSimulateQRScan('offline')}
                      className="py-2 px-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl"
                    >
                      Offline Queue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Test Result Display */}
            {qrTestResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
                qrTestResult.status === 'SUCCESS'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : qrTestResult.status === 'DUPLICATE_SCAN'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              }`}>
                <div className="font-bold flex items-center gap-2 text-sm">
                  {qrTestResult.status === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>Result: {qrTestResult.status}</span>
                </div>
                <p>{qrTestResult.message}</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ADD-ON ORDER CONFIRMATION MODAL */}
      {selectedAddOnModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedAddOnModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                {selectedAddOnModal.category}
              </span>
              <h3 className="text-xl font-extrabold text-white mt-2">{selectedAddOnModal.name}</h3>
              <div className="text-lg font-black text-emerald-400">Total Price: ₹{selectedAddOnModal.price}</div>
            </div>

            <div className="bg-[#0B0F17] rounded-2xl p-4 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div><strong>Description:</strong> {selectedAddOnModal.description}</div>
              <div><strong>Cancellation Terms:</strong> {selectedAddOnModal.terms}</div>
            </div>

            {/* Explicit Selection Rule */}
            <div className="flex items-start gap-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 text-xs">
              <input
                type="checkbox"
                id="addon-agree"
                checked={addOnAgreedTerms}
                onChange={(e) => setAddOnAgreedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 accent-purple-500 rounded cursor-pointer"
              />
              <label htmlFor="addon-agree" className="text-purple-200 cursor-pointer">
                I explicitly select this add-on and accept the cancellation policy terms. (Add-ons are never pre-selected).
              </label>
            </div>

            <button
              disabled={!addOnAgreedTerms}
              onClick={() => {
                onBuyAddOn(member.id, selectedAddOnModal);
                setSelectedAddOnModal(null);
              }}
              className={`w-full py-3 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                addOnAgreedTerms
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>Confirm & Pay ₹{selectedAddOnModal.price}</span>
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── EMAIL VERIFICATION MODAL ── */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-center">
            
            <button
              onClick={() => { setVerifyModalOpen(false); setVerifyMessage({ type: '', text: '' }); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
              <Mail className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Email Verification</h3>
              <p className="text-xs text-slate-400">
                Verify <span className="text-white font-mono font-bold">{(isChangingMemberEmail ? newMemberEmailDraft : member.email) || 'your email'}</span> to protect your gym membership account.
              </p>
            </div>

            {verifyMessage.text && (
              <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 text-left border ${
                verifyMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {verifyMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{verifyMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleVerifyCodeSubmit} className="space-y-3 text-left">
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Enter 6-Character Code or Token</label>
                <input
                  type="text"
                  placeholder="e.g. GP-A1B2C3"
                  value={verifyCodeInput}
                  onChange={(e) => setVerifyCodeInput(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-center tracking-wider text-sm font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={verifyLoading || !verifyCodeInput.trim()}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {verifyLoading ? <span>Verifying...</span> : <span>Verify Code</span>}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={verifyLoading}
                onClick={handleSendVerificationEmail}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resend / Request Verification Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
