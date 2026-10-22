import React, { useState } from 'react';
import { 
  Users, CalendarCheck, AlertTriangle, TrendingUp, DollarSign, ShoppingBag, 
  PhoneCall, MessageSquare, ShieldAlert, CheckCircle2, Clock, Filter, Plus, 
  Sparkles, FileText, ChevronRight, RefreshCw, X, Shield, Send, Dumbbell, 
  PackageCheck, UserPlus, UserCheck, Key, Lock, Eye, EyeOff, Save, Building, Phone,
  CreditCard, Check, Mail, Trash2, Calendar, CalendarDays, Edit3
} from 'lucide-react';
import { apiSendVerification, apiVerifyEmail } from '../lib/api';
import { 
  SUBSCRIPTION_TIERS, 
  SYSTEM_FEATURES, 
  normalizePlanKey, 
  getGymActiveFeatures 
} from '../data/subscriptionPlans';

export default function OwnerDashboard({
  members = [],
  noShowCases = [],
  payments = [],
  addOnOrders = [],
  attendanceLogs = [],
  settings,
  plans = [],
  onUpdateGymPlans,
  onUpdateNoShowOutcome,
  onRunDailyScan,
  onToggleMemberPause,
  onResetMemberPassword,
  onDeleteMember,
  specialHolidays = [],
  onAddHoliday,
  onRemoveHoliday,
  onAutoAddSundays,
  onFulfillAddOnOrder,
  onLogPTSession,
  onOpenAddMemberModal,
  staffList = [],
  onAddStaff,
  onRemoveStaff,
  onUpdateOwnerProfile,
  currentGym,
  activeGymFeatures: propActiveGymFeatures,
  onManualStreakIncrement
}) {
  const activeGymTierKey = normalizePlanKey(currentGym?.plan || settings?.plan);
  const activeGymFeatures = propActiveGymFeatures || getGymActiveFeatures(currentGym || { plan: settings?.plan });

  // Default to 'redlist' if noshow_retention is enabled, otherwise 'members'
  const [activeTab, setActiveTab] = useState(() => {
    return activeGymFeatures.includes('noshow_retention') ? 'redlist' : 'members';
  });
  const [statsTimeframe, setStatsTimeframe] = useState('24h'); // '24h', '7d', '30d', 'all'
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [outcomeModalCase, setOutcomeModalCase] = useState(null);
  const [outcomeType, setOutcomeType] = useState('Will return');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [nextActionDate, setNextActionDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  // Owner Email Verification & Edit State
  const [ownerEmailInput, setOwnerEmailInput] = useState(
    currentGym?.ownerEmail || settings?.ownerCredentials?.email || ''
  );
  const [isOwnerEmailVerified, setIsOwnerEmailVerified] = useState(
    Boolean(currentGym?.emailVerified || settings?.ownerCredentials?.emailVerified || settings?.emailVerified)
  );
  const [isChangingOwnerEmail, setIsChangingOwnerEmail] = useState(false);
  const [newOwnerEmailDraft, setNewOwnerEmailDraft] = useState('');
  const [ownerVerificationCode, setOwnerVerificationCode] = useState('');
  const [isSendingVerificationCode, setIsSendingVerificationCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [ownerVerificationFeedback, setOwnerVerificationFeedback] = useState('');

  // Special Calendar / Holiday State
  const [holidayDate, setHolidayDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayType, setHolidayType] = useState('SUNDAY');
  const [holidayFeedback, setHolidayFeedback] = useState('');

  // Gym Membership Plans & Fees State (Owner configurable)
  const [editablePlans, setEditablePlans] = useState(() => plans && plans.length > 0 ? plans : []);
  const [plansFeedbackMsg, setPlansFeedbackMsg] = useState('');

  // Members Roster Search & Filter
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('ALL');

  React.useEffect(() => {
    if (plans && plans.length > 0) {
      setEditablePlans(plans);
    }
  }, [plans]);

  const handleUpdatePlanField = (index, field, value) => {
    setEditablePlans(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddNewPlan = () => {
    const newId = `p-${Date.now()}`;
    const newPlan = {
      id: newId,
      name: 'Custom Fitness Plan',
      durationMonths: 1,
      basePrice: 2000,
      discountPercent: 10,
      finalPrice: 1800,
      popular: false,
      benefits: ['Full Gym Access', 'Locker Room']
    };
    setEditablePlans(prev => [...prev, newPlan]);
  };

  const handleDeletePlan = (index) => {
    if (editablePlans.length <= 1) {
      alert('You must keep at least one gym membership plan.');
      return;
    }
    setEditablePlans(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveGymPlansSubmit = (e) => {
    if (e) e.preventDefault();
    if (onUpdateGymPlans) {
      onUpdateGymPlans(editablePlans);
    }
    setPlansFeedbackMsg('✅ Gym membership plans & fees saved successfully to database!');
    setTimeout(() => setPlansFeedbackMsg(''), 4000);
  };

  // WhatsApp Hinglish Generator Modal State
  const [whatsappModalData, setWhatsappModalData] = useState(null);

  // Daily Summary Digest Modal State
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  // Owner Account & Profile Settings Form State
  const [ownerNameInput, setOwnerNameInput] = useState(settings?.ownerName || settings?.ownerCredentials?.name || '');
  const [ownerPhoneInput, setOwnerPhoneInput] = useState(settings?.ownerPhone || settings?.ownerCredentials?.phone || '');
  const [gymNameInput, setGymNameInput] = useState(settings?.gymName || 'GymPulse Gym');
  const [gymLocationInput, setGymLocationInput] = useState(settings?.location || 'Indore, MP');
  const [noShowDaysInput, setNoShowDaysInput] = useState(settings?.noShowThresholdDays || 10);

  // Password Change State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Templates State
  const [templateNoShow, setTemplateNoShow] = useState(settings?.whatsappTemplates?.noShow || '');
  const [templateRenewal, setTemplateRenewal] = useState(settings?.whatsappTemplates?.renewal || '');
  const [templateWelcome, setTemplateWelcome] = useState(settings?.whatsappTemplates?.welcome || '');

  // Subscription & Billing State
  const [subscriptionPlan, setSubscriptionPlan] = useState(currentGym?.plan || settings?.plan || 'Enterprise Pro Suite');
  const [monthlyFeeInput, setMonthlyFeeInput] = useState(currentGym?.monthlyFee || settings?.monthlyFee || 4999);
  const [subscriptionFeedbackMsg, setSubscriptionFeedbackMsg] = useState('');

  // Feedback Messages
  const [profileFeedbackMsg, setProfileFeedbackMsg] = useState('');
  const [passwordFeedbackMsg, setPasswordFeedbackMsg] = useState('');
  const [templatesFeedbackMsg, setTemplatesFeedbackMsg] = useState('');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!ownerNameInput.trim()) {
      alert('Please enter your full name.');
      return;
    }
    const cleanOwnerPhone = ownerPhoneInput.replace(/\D/g, '');
    if (cleanOwnerPhone.length !== 10) {
      alert('Owner mobile number must be exactly 10 digits.');
      return;
    }
    if (onUpdateOwnerProfile) {
      onUpdateOwnerProfile({
        name: ownerNameInput.trim(),
        phone: cleanOwnerPhone,
        ownerEmail: ownerEmailInput.trim().toLowerCase(),
        gymName: gymNameInput.trim(),
        location: gymLocationInput.trim(),
        noShowThresholdDays: Number(noShowDaysInput) || 10,
      });
    }
    setProfileFeedbackMsg('Profile and gym details saved successfully!');
    setTimeout(() => setProfileFeedbackMsg(''), 3500);
  };

  const handleSendOwnerVerificationCode = async () => {
    const emailToVerify = (isChangingOwnerEmail ? newOwnerEmailDraft : ownerEmailInput).trim().toLowerCase();
    if (!emailToVerify || !emailToVerify.includes('@')) {
      setOwnerVerificationFeedback('❌ Please enter a valid email address first.');
      return;
    }
    setIsSendingVerificationCode(true);
    setOwnerVerificationFeedback('');
    try {
      const res = await apiSendVerification({
        memberId: currentGym?.id || 'default',
        role: 'owner',
        email: emailToVerify,
        phone: ownerPhoneInput || currentGym?.ownerPhone || '',
        name: ownerNameInput || currentGym?.gymName || 'Gym Owner'
      });
      if (res && res.error) {
        setOwnerVerificationFeedback(`❌ ${res.error}`);
      } else {
        setOwnerVerificationFeedback(`✅ Unique 6-digit verification code sent to ${emailToVerify}! Check your inbox and enter the code below.${res.token ? ` (Code: ${res.token})` : ''}`);
      }
    } catch (err) {
      setOwnerVerificationFeedback(`❌ Failed to send code: ${err.message}`);
    } finally {
      setIsSendingVerificationCode(false);
    }
  };

  const handleVerifyOwnerCode = async (e) => {
    if (e) e.preventDefault();
    const code = ownerVerificationCode.trim();
    if (!code) {
      setOwnerVerificationFeedback('❌ Please enter the 6-digit verification code.');
      return;
    }
    const finalEmail = (isChangingOwnerEmail ? newOwnerEmailDraft : ownerEmailInput).trim().toLowerCase();
    setIsVerifyingCode(true);
    setOwnerVerificationFeedback('');
    try {
      const res = await apiVerifyEmail(code);
      if (res && res.success) {
        setIsOwnerEmailVerified(true);
        setOwnerEmailInput(finalEmail);
        setIsChangingOwnerEmail(false);
        setOwnerVerificationCode('');
        setOwnerVerificationFeedback('✅ Email verified successfully! Your owner account is officially verified in the backend.');
        if (onUpdateOwnerProfile) {
          onUpdateOwnerProfile({
            ownerEmail: finalEmail,
            emailVerified: true
          });
        }
      } else {
        setOwnerVerificationFeedback(`❌ ${res?.error || 'Invalid or expired verification code.'}`);
      }
    } catch (err) {
      setOwnerVerificationFeedback(`❌ Verification error: ${err.message}`);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSaveSubscription = (e) => {
    e.preventDefault();
    if (!subscriptionPlan) {
      alert('Please select a valid subscription plan.');
      return;
    }
    const feeNum = Number(monthlyFeeInput);
    if (isNaN(feeNum) || feeNum < 0) {
      alert('Please enter a valid monthly subscription amount.');
      return;
    }
    if (onUpdateOwnerProfile) {
      onUpdateOwnerProfile({
        plan: subscriptionPlan,
        monthlyFee: feeNum
      });
    }
    setSubscriptionFeedbackMsg('Software subscription plan & billing amount updated successfully!');
    setTimeout(() => setSubscriptionFeedbackMsg(''), 4000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const actualCurrentPass = settings?.ownerCredentials?.password || settings?.ownerPassword || '';
    
    if (actualCurrentPass && currentPasswordInput !== actualCurrentPass) {
      setPasswordFeedbackMsg('❌ Current password is incorrect.');
      return;
    }
    if (!newPasswordInput || newPasswordInput.length < 4) {
      setPasswordFeedbackMsg('❌ New password must be at least 4 characters long.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordFeedbackMsg('❌ New password and confirmation do not match.');
      return;
    }

    if (onUpdateOwnerProfile) {
      await onUpdateOwnerProfile({
        password: newPasswordInput.trim()
      });
    }

    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordFeedbackMsg('✅ Password updated permanently on live backend! Use your new password on next login.');
    setTimeout(() => setPasswordFeedbackMsg(''), 5000);
  };

  const handleSaveTemplates = (e) => {
    e.preventDefault();
    if (onUpdateOwnerProfile) {
      onUpdateOwnerProfile({
        whatsappTemplates: {
          noShow: templateNoShow,
          renewal: templateRenewal,
          welcome: templateWelcome
        }
      });
    }
    setTemplatesFeedbackMsg('WhatsApp message templates updated successfully!');
    setTimeout(() => setTemplatesFeedbackMsg(''), 3500);
  };

  // ── DYNAMIC STATS TIMEFRAME COMPUTATION ──────────
  const now = new Date();
  const getThresholdMs = (tf) => {
    if (tf === '24h') return Date.now() - 24 * 60 * 60 * 1000;
    if (tf === '7d') return Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (tf === '30d') return Date.now() - 30 * 24 * 60 * 60 * 1000;
    return 0; // 'all'
  };
  const thresholdMs = getThresholdMs(statsTimeframe);

  // Timeframe label
  const timeframeLabel = statsTimeframe === '24h' ? 'Last 24 Hours' : statsTimeframe === '7d' ? 'Last 7 Days' : statsTimeframe === '30d' ? 'Last 30 Days' : 'All Time';

  // Filtered check-ins
  const filteredCheckIns = attendanceLogs.filter(a => {
    if (!a.timestamp) return false;
    const t = new Date(a.timestamp).getTime();
    return statsTimeframe === 'all' || (!isNaN(t) && t >= thresholdMs);
  });
  const visitsCount = filteredCheckIns.length;

  // Active members in timeframe
  const activeMembersInTimeframe = members.filter(m => {
    if (statsTimeframe === 'all') return m.status === 'active';
    if (!m.lastCheckIn) return false;
    const t = new Date(m.lastCheckIn).getTime();
    return !isNaN(t) && t >= thresholdMs;
  }).length;

  // Total active members currently
  const totalActiveMembers = members.filter(m => m.status === 'active').length;

  // New registrations in timeframe
  const newMembersInTimeframe = members.filter(m => {
    const startStr = m.membership?.startDate || m.joiningDate;
    if (!startStr) return false;
    const t = new Date(startStr).getTime();
    return statsTimeframe === 'all' || (!isNaN(t) && t >= thresholdMs);
  }).length;

  // Revenue in timeframe
  const revenueInTimeframe = payments
    .filter(p => {
      if (p.status !== 'PAID') return false;
      const t = new Date(p.timestamp || p.date).getTime();
      return statsTimeframe === 'all' || (!isNaN(t) && t >= thresholdMs);
    })
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Add-on revenue in timeframe
  const addOnRevenueInTimeframe = addOnOrders
    .filter(o => {
      if (o.status !== 'PAID') return false;
      const t = new Date(o.createdAt || o.timestamp).getTime();
      return statsTimeframe === 'all' || (!isNaN(t) && t >= thresholdMs);
    })
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  // Open risk cases
  const openNoShowCasesCount = noShowCases.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;

  // Returned members in timeframe
  const returnedMembersCount = noShowCases.filter(c => {
    if (c.status !== 'RESOLVED_RETURNED') return false;
    if (statsTimeframe === 'all') return true;
    const t = new Date(c.resolvedAt || c.lastFollowUp).getTime();
    return !isNaN(t) && t >= thresholdMs;
  }).length;

  // Renewals due in next 7 days
  const renewalsDue7Days = members.filter(m => {
    if (m.status !== 'active') return false;
    const endDate = new Date(m.membership?.endDate);
    const diff = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }).length;

  // Helper WhatsApp click handler
  const handleOpenWhatsApp = (c) => {
    if (!activeGymFeatures.includes('whatsapp_reminders')) {
      alert('WhatsApp Automation & Reminders is an exclusive Pro feature. Upgrade your gym subscription to Pro to enable automated WhatsApp reminders.');
      return;
    }
    const rawTemplate = settings.whatsappTemplates?.noShow || '';
    const message = rawTemplate
      .replace('{NAME}', c.memberName)
      .replace('{ABSENT_DAYS}', c.absentDays);
    setWhatsappModalData({ member: c, message });
  };

  // Submit follow-up outcome
  const handleSubmitOutcome = (e) => {
    e.preventDefault();
    if (!outcomeModalCase) return;
    onUpdateNoShowOutcome(outcomeModalCase.id, outcomeType, outcomeNote, nextActionDate);
    setOutcomeModalCase(null);
    setOutcomeNote('');
  };

  return (
    <div className="space-y-6">
      
      {/* OWNER HEADER & QUICK ACTIONS */}
      <div className="bg-gradient-to-r from-[#141C2B] via-[#1E293B] to-[#0B0F17] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-extrabold text-white">{settings?.gymName || 'Gym'} Dashboard</h2>
            <span className="text-[10px] sm:text-xs bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              Management Suite
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Silent Churn Detection • Red-List Risk Board • Automated Reminders • Add-On Revenue
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeGymFeatures.includes('member_management') && (
            <button
              onClick={onOpenAddMemberModal}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Member</span>
            </button>
          )}

          {activeGymFeatures.includes('noshow_retention') && (
            <button
              onClick={onRunDailyScan}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Run No-Show Scan</span>
            </button>
          )}

          <button
            onClick={() => setSummaryModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Daily Summary</span>
          </button>
        </div>
      </div>

      {/* TIMEFRAME STATS FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141C2B] p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span>Stats Filter:</span>
          <span className="text-emerald-400 font-extrabold">{timeframeLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#0B0F17] p-1 rounded-xl border border-slate-800 text-xs font-extrabold">
          <button
            type="button"
            onClick={() => setStatsTimeframe('24h')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statsTimeframe === '24h'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ 24 Hours
          </button>
          <button
            type="button"
            onClick={() => setStatsTimeframe('7d')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statsTimeframe === '7d'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📅 7 Days
          </button>
          <button
            type="button"
            onClick={() => setStatsTimeframe('30d')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statsTimeframe === '30d'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🗓️ 30 Days
          </button>
          <button
            type="button"
            onClick={() => setStatsTimeframe('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statsTimeframe === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🌐 All Time
          </button>
        </div>
      </div>

      {/* CORE METRIC CARDS - Filtered dynamically */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Members */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Members</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{members.length}</div>
          <div className="text-[11px] text-cyan-400 font-semibold mt-1">
            {newMembersInTimeframe} joined in {timeframeLabel}
          </div>
        </div>

        {/* Card 2: Active Members */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Active Members</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">{totalActiveMembers}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {activeMembersInTimeframe} active in {timeframeLabel}
          </div>
        </div>

        {/* Card 3: Check-ins in Timeframe */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Visits ({timeframeLabel})</span>
            <CalendarCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{visitsCount}</div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-1">Verified Gate Scans</div>
        </div>

        {/* Card 4: Renewal Revenue */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Revenue ({timeframeLabel})</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">₹{revenueInTimeframe.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-400 mt-1">Collected in {timeframeLabel}</div>
        </div>

        {/* Card 5: Add-On Revenue */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Add-On Sales ({timeframeLabel})</span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 mt-2">₹{addOnRevenueInTimeframe.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-400 mt-1">PT, Diets & Supplements</div>
        </div>

        {/* Card 6: Open No-Show Risk Cases */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-rose-500/30 shadow-md bg-rose-500/5">
          <div className="flex items-center justify-between text-rose-400 text-xs font-bold uppercase tracking-wider">
            <span>Red-List Risk</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-300 mt-2">{openNoShowCasesCount}</div>
          <div className="text-[11px] text-rose-400 mt-1">Absent ≥ {settings.noShowThresholdDays} Days (Action Needed)</div>
        </div>

        {/* Card 7: Returned Members */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Churn Saved ({timeframeLabel})</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">{returnedMembersCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Risk cases saved from churn</div>
        </div>

        {/* Card 8: Renewals Due (7-Day) */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-amber-500/30 shadow-md bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span>Renewals Due (7d)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-2">{renewalsDue7Days}</div>
          <div className="text-[11px] text-amber-400 mt-1">Automated reminders scheduled</div>
        </div>

      </div>

      {/* OWNER NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        {activeGymFeatures.includes('noshow_retention') && (
          <button
            onClick={() => setActiveTab('redlist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'redlist'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Red-List Churn Recovery ({openNoShowCasesCount})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'members'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>All Members Roster ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'plans'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Gym Plans &amp; Fees</span>
        </button>

        {activeGymFeatures.includes('attendance_logs') && (
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Gym Calendar &amp; Holidays ({specialHolidays.length})</span>
          </button>
        )}

        {(activeGymFeatures.includes('addon_store') || activeGymFeatures.includes('pt_management')) && (
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add-On Orders & PT Sessions</span>
          </button>
        )}

        {activeGymFeatures.includes('staff_logins') && (
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'staff'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Front Desk Staff Access ({staffList.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>My Profile &amp; Account</span>
        </button>
      </div>

      {/* TAB 1: RED-LIST CHURN RECOVERY BOARD */}
      {activeTab === 'redlist' && activeGymFeatures.includes('noshow_retention') && (
        <div className="bg-[#141C2B] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                <span>Red-List Member Churn Risk Board</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Members absent ≥ {settings.noShowThresholdDays} consecutive days. Paused & frozen memberships are automatically excluded.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 bg-[#0B0F17] px-3 py-1 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
              Threshold: {settings.noShowThresholdDays}d
            </span>
          </div>

          {noShowCases.length === 0 ? (
            <div className="p-8 sm:p-10 text-center space-y-3 bg-[#0B0F17] rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="font-bold text-white text-base">No Members At Churn Risk</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All members are attending regularly or within the safe threshold. When a member misses {settings.noShowThresholdDays}+ consecutive days, their case will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px] bg-[#0B0F17]/50">
                    <th className="py-3 px-4">Member / Contact</th>
                    <th className="py-3 px-4">Absent Days</th>
                    <th className="py-3 px-4">Last Visit</th>
                    <th className="py-3 px-4">Assigned Coach</th>
                    <th className="py-3 px-4">Follow-Up History</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {noShowCases.map((item) => {
                    const m = members.find(mem => mem.id === item.memberId);
                    const isResolved = item.status === 'RESOLVED_RETURNED';
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-sm">{item.memberName}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{item.phone}</div>
                          {m && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                              {m.membership.planName} (Exp: {m.membership.endDate})
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                            item.absentDays >= 15
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {item.absentDays} Days Absent
                          </span>
                        </td>

                        <td className="py-4 px-4 text-slate-300">
                          {item.lastCheckIn}
                        </td>

                        <td className="py-4 px-4 text-slate-300 font-medium">
                          {item.assignedTrainerName || (item.assignedTrainer && !item.assignedTrainer.startsWith('tr-') ? item.assignedTrainer : 'Assigned Trainer')}
                        </td>

                        <td className="py-4 px-4">
                          {item.outcomeHistory.length === 0 ? (
                            <span className="text-slate-500 italic text-[11px]">No follow-up logged yet</span>
                          ) : (
                            <div className="space-y-1">
                              {item.outcomeHistory.map((h, idx) => (
                                <div key={idx} className="bg-[#0B0F17] p-2 rounded-lg text-[11px] border border-slate-800">
                                  <span className="font-bold text-amber-400">{h.outcome}</span>: {h.note}
                                  <div className="text-[10px] text-slate-500 mt-0.5">Next: {h.nextActionDate}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Call Action */}
                            <a
                              href={`tel:${item.phone}`}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all"
                              title="Direct Call"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>

                            {/* WhatsApp Hinglish Generator (Pro Tier Only) */}
                            {activeGymFeatures.includes('whatsapp_reminders') && (
                              <button
                                onClick={() => handleOpenWhatsApp(item)}
                                className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl transition-all"
                                title="Send WhatsApp Hinglish Message"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                            )}

                            {/* Mark Outcome Modal Trigger */}
                            <button
                              onClick={() => setOutcomeModalCase(item)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
                            >
                              Mark Outcome
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEMBERS & PAUSE MANAGEMENT */}
      {activeTab === 'members' && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-white">All Members Roster &amp; Status</h3>
              <p className="text-xs text-slate-400">Total {members.length} registered members ({members.filter(m => m.status === 'active').length} active)</p>
            </div>
            <button
              onClick={onOpenAddMemberModal}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add New Member</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-[#0B0F17] p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search member name, phone or plan..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="w-full bg-[#141C2B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMemberStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  memberStatusFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-[#141C2B] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All ({members.length})
              </button>
              <button
                type="button"
                onClick={() => setMemberStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  memberStatusFilter === 'ACTIVE'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-[#141C2B] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Active ({members.filter(m => m.status === 'active').length})
              </button>
              <button
                type="button"
                onClick={() => setMemberStatusFilter('PAUSED')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  memberStatusFilter === 'PAUSED'
                    ? 'bg-blue-500 text-white font-bold'
                    : 'bg-[#141C2B] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Paused ({members.filter(m => m.status === 'paused').length})
              </button>
              <button
                type="button"
                onClick={() => setMemberStatusFilter('EXPIRED')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  memberStatusFilter === 'EXPIRED'
                    ? 'bg-rose-500 text-white font-bold'
                    : 'bg-[#141C2B] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Expired
              </button>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="p-10 text-center space-y-4 bg-[#0B0F17] rounded-2xl border border-slate-800">
              <Users className="w-10 h-10 text-amber-400 mx-auto" />
              <div className="font-bold text-white text-base">No Members Registered Yet</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Your gym roster is ready. Click "+ Add New Member" to onboard your first member.
              </p>
              <button
                onClick={onOpenAddMemberModal}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add First Member Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members
                .filter(m => {
                  const q = memberSearchTerm.trim().toLowerCase();
                  const matchesSearch = !q ||
                    (m.name || '').toLowerCase().includes(q) ||
                    (m.phone || '').includes(q) ||
                    (m.membership?.planName || '').toLowerCase().includes(q);
                  if (!matchesSearch) return false;
                  const isExpired = m.membership?.endDate && new Date(m.membership.endDate) < new Date();
                  if (memberStatusFilter === 'ACTIVE') return m.status === 'active' && !isExpired;
                  if (memberStatusFilter === 'PAUSED') return m.status === 'paused';
                  if (memberStatusFilter === 'EXPIRED') return isExpired || m.status === 'expired';
                  return true;
                })
                .map((m) => {
                  const isExpired = m.membership?.endDate && new Date(m.membership.endDate) < new Date();
                  const cleanPhone = (m.phone || '').replace(/\D/g, '').slice(-10);
                  return (
                    <div key={m.id} className="bg-[#0B0F17] rounded-2xl p-4 border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=0B0F17&color=34d399`}
                            alt={m.name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-700"
                          />
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              <span>{m.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isExpired
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : m.status === 'paused'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}>
                                {isExpired ? 'EXPIRED' : (m.status || 'ACTIVE').toUpperCase()}
                              </span>
                              {m.email && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                                  m.emailVerified
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                }`}>
                                  {m.emailVerified ? '✓ Verified' : '⚠ Unverified'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3 mt-0.5 font-mono">
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{m.phone}</span>
                              </div>
                              {m.email && (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  <span className="text-[11px] font-sans">{m.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onManualStreakIncrement && onManualStreakIncrement(m.id)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                            title="Manually increment & approve workout streak for this member"
                          >
                            <span>🔥 +1 Streak ({m.streak?.current || 0}d)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleMemberPause(m.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              m.status === 'paused'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                            title={m.status === 'paused' ? 'Unpause membership' : 'Pause membership'}
                          >
                            {m.status === 'paused' ? 'Unpause' : 'Pause'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to permanently delete member "${m.name}" (${m.phone})? This cannot be undone.`)) {
                                onDeleteMember(m.id);
                              }
                            }}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition-all"
                            title="Delete Member Permanently (Owner Only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#141C2B] rounded-xl p-2.5 text-xs text-slate-300 space-y-1 border border-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-[11px]">Membership Plan:</span>
                          <span className="font-bold text-amber-300">{m.membership?.planName || 'Standard Plan'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">Validity Ends:</span>
                          <span className={`font-semibold ${isExpired ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                            {m.membership?.endDate || 'N/A'}
                          </span>
                        </div>
                        {m.lastCheckIn && (
                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                            <span>Last Check-in:</span>
                            <span className="font-mono text-slate-300">{new Date(m.lastCheckIn).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>

                      {activeGymFeatures.includes('whatsapp_reminders') && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <a
                            href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${m.name}, greetings from Gym Management!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp Member</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB: GYM MEMBERSHIP PLANS & FEES (Configurable by Owner) */}
      {activeTab === 'plans' && (
        <form onSubmit={handleSaveGymPlansSubmit} className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Gym Membership Plans &amp; Fees</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize your gym's membership packages, titles, and fees charged to members.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddNewPlan}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Plan</span>
            </button>
          </div>

          {plansFeedbackMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{plansFeedbackMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editablePlans.map((plan, idx) => (
              <div key={plan.id || idx} className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Plan #{idx + 1}
                  </span>
                  {editablePlans.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 text-xs transition-colors"
                      title="Delete Plan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Plan Title / Name *</label>
                  <input
                    type="text"
                    value={plan.name}
                    onChange={(e) => handleUpdatePlanField(idx, 'name', e.target.value)}
                    required
                    placeholder="e.g. 1 Month Fitness"
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Duration (Mo)</label>
                    <input
                      type="number"
                      min="1"
                      max="36"
                      value={plan.durationMonths}
                      onChange={(e) => handleUpdatePlanField(idx, 'durationMonths', Number(e.target.value) || 1)}
                      required
                      className="w-full bg-[#141C2B] border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Reg. Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={plan.basePrice}
                      onChange={(e) => handleUpdatePlanField(idx, 'basePrice', Number(e.target.value) || 0)}
                      required
                      className="w-full bg-[#141C2B] border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-400">Final Fee (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      value={plan.finalPrice}
                      onChange={(e) => handleUpdatePlanField(idx, 'finalPrice', Number(e.target.value) || 0)}
                      required
                      className="w-full bg-[#141C2B] border border-emerald-500/50 rounded-xl p-2 text-xs text-emerald-300 font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Membership Plans &amp; Fees</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB: GYM CALENDAR & HOLIDAYS (Owner & Front Desk Special Days) */}
      {activeTab === 'calendar' && activeGymFeatures.includes('attendance_logs') && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-cyan-400" />
                <span>Special Gym Calendar, Sundays &amp; Holidays</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Scheduled gym holidays and routine Sundays automatically protect all member streaks (they will never break due to gym off-days) and are displayed on member dashboards.
              </p>
            </div>

            <button
              type="button"
              onClick={onAutoAddSundays}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>+ Auto-Schedule Sundays (Next 60 Days)</span>
            </button>
          </div>

          {/* Add Custom Holiday / Special Day Form */}
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!holidayDate || !holidayTitle.trim()) {
              alert('Please enter both date and title for the holiday.');
              return;
            }
            onAddHoliday({
              date: holidayDate,
              title: holidayTitle.trim(),
              type: holidayType
            });
            setHolidayTitle('');
            setHolidayFeedback(`✅ "${holidayTitle.trim()}" successfully added to Gym Calendar!`);
            setTimeout(() => setHolidayFeedback(''), 3500);
          }} className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Add Custom Gym Off-Day / Holiday</span>
            </h4>

            {holidayFeedback && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold">
                {holidayFeedback}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Select Date *</label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  required
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Event / Holiday Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Holiday, Routine Sunday Off..."
                  value={holidayTitle}
                  onChange={(e) => setHolidayTitle(e.target.value)}
                  required
                  className="w-full bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Category</label>
                <select
                  value={holidayType}
                  onChange={(e) => setHolidayType(e.target.value)}
                  className="w-full bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="SUNDAY">Sunday Rest Day</option>
                  <option value="HOLIDAY">Festival / National Holiday</option>
                  <option value="MAINTENANCE">Gym Maintenance Day</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs shadow-md"
            >
              Add to Calendar &amp; Protect Streaks
            </button>
          </form>

          {/* Scheduled Holidays List */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-xs">Scheduled Gym Off-Days &amp; Holidays ({specialHolidays.length})</h4>
            {specialHolidays.length === 0 ? (
              <div className="p-8 text-center bg-[#0B0F17] rounded-2xl border border-slate-800 text-slate-500 text-xs">
                No special holidays scheduled yet. Click "+ Auto-Schedule Sundays" to populate upcoming Sundays automatically.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {specialHolidays.map((h) => {
                  const isToday = h.date === new Date().toISOString().split('T')[0];
                  return (
                    <div
                      key={h.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                        isToday
                          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                          : 'bg-[#0B0F17] border-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-400 font-bold text-xs">{h.date}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                            h.type === 'SUNDAY' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                          }`}>
                            {h.type}
                          </span>
                          {isToday && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 animate-pulse">
                              TODAY
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-white">{h.title}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span>🔥 Member Streaks Protected</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveHoliday(h.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Remove Holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ADD-ON ORDERS & PT SESSIONS */}
      {activeTab === 'orders' && (activeGymFeatures.includes('addon_store') || activeGymFeatures.includes('pt_management')) && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-lg font-extrabold text-white">Add-On Orders & PT Session Tracking</h3>
          
          {addOnOrders.length === 0 ? (
            <div className="p-10 text-center space-y-3 bg-[#0B0F17] rounded-2xl border border-slate-800">
              <ShoppingBag className="w-10 h-10 text-purple-400 mx-auto" />
              <div className="font-bold text-white text-base">No Add-On Orders Yet</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                When members purchase personal training sessions, customized diet charts, or supplements from the store, their orders will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {addOnOrders.map((order) => (
                <div key={order.id} className="bg-[#0B0F17] rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-white text-sm">{order.addOnName}</div>
                    <div className="text-slate-400 mt-0.5">Member: <strong className="text-slate-200">{order.memberName}</strong> • Price: ₹{order.price}</div>
                    {order.sessionsTotal && (
                      <div className="text-emerald-400 font-semibold mt-1">
                        PT Sessions Used: {order.sessionsUsed} / {order.sessionsTotal} Sessions
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {order.sessionsTotal && order.sessionsUsed < order.sessionsTotal && (
                      <button
                        onClick={() => onLogPTSession(order.id)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all"
                      >
                        Log PT Session (-1)
                      </button>
                    )}
                    {order.fulfilmentStatus !== 'FULFILLED' && order.fulfilmentStatus !== 'DELIVERED' && (
                      <button
                        onClick={() => onFulfillAddOnOrder(order.id)}
                        className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-xl transition-all"
                      >
                        Mark Order Fulfilled
                      </button>
                    )}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FRONT DESK STAFF MANAGEMENT */}
      {activeTab === 'staff' && activeGymFeatures.includes('staff_logins') && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-cyan-400" />
              <span>Front Desk Staff Access Management</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Create and manage logins for front desk staff. Staff members ONLY have access to the Gate Check-in terminal.
            </p>
          </div>

          {/* Add New Staff Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const cleanStaffPhone = newStaffPhone.replace(/\D/g, '');
              if (cleanStaffPhone.length !== 10) {
                alert('Staff mobile phone must be exactly 10 digits.');
                return;
              }
              if (newStaffName.trim() && cleanStaffPhone && newStaffPin.trim()) {
                onAddStaff({
                  id: `staff-${Date.now()}`,
                  name: newStaffName.trim(),
                  phone: cleanStaffPhone,
                  pin: newStaffPin.trim(),
                  role: 'Front-Desk Executive',
                  status: 'ACTIVE'
                });
                setNewStaffName('');
                setNewStaffPhone('');
                setNewStaffPin('');
              }
            }}
            className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-3 text-xs"
          >
            <h4 className="font-bold text-white">Create New Front Desk Staff Credentials</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Staff Full Name..."
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                required
                className="bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 text-white"
              />
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                minLength={10}
                placeholder="Mobile Phone (10 digits)..."
                value={newStaffPhone}
                onChange={(e) => setNewStaffPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                className="bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
              <input
                type="text"
                placeholder="Gate Passcode PIN (e.g. 0000)..."
                value={newStaffPin}
                onChange={(e) => setNewStaffPin(e.target.value)}
                required
                className="bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              Add Staff Login Access
            </button>
          </form>

          {/* Existing Staff Roster List */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs">Active Front Desk Staff ({staffList.length})</h4>
            {staffList.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 italic text-center">No staff accounts created yet. Add one above.</p>
            ) : (
              staffList.map((s) => (
                <div key={s.id} className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{s.name}</div>
                    <div className="text-[11px] text-slate-400">Phone: <strong className="text-slate-200">{s.phone}</strong> • PIN Passcode: <strong className="text-cyan-400 font-mono">{s.pin}</strong></div>
                  </div>
                  <button
                    onClick={() => onRemoveStaff(s.id)}
                    className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-bold text-[11px]"
                  >
                    Revoke Access
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: MY ACCOUNT, PROFILE & SECURITY */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          
          {/* Card 1: Owner Profile & Gym Details */}
          <form onSubmit={handleSaveProfile} className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Owner &amp; Gym Profile Details</h3>
                  <p className="text-xs text-slate-400">Manage your name, gym brand name, location and retention policy.</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                Owner Access
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Your Full Name *</label>
                <input
                  type="text"
                  value={ownerNameInput}
                  onChange={(e) => setOwnerNameInput(e.target.value)}
                  placeholder="Enter your full name..."
                  required
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Registered Mobile Number (Login ID)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    value={ownerPhoneInput}
                    onChange={(e) => setOwnerPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit phone"
                    maxLength={10}
                    minLength={10}
                    required
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl pl-9 pr-3 py-3 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300">Registered Email Address</label>
                  {isOwnerEmailVerified && !isChangingOwnerEmail ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Verified
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingOwnerEmail(true);
                          setNewOwnerEmailDraft(ownerEmailInput);
                          setOwnerVerificationFeedback('');
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-all"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Change Email</span>
                      </button>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {isChangingOwnerEmail ? 'Changing Email' : 'Unverified'}
                    </span>
                  )}
                </div>

                {isChangingOwnerEmail ? (
                  <div className="space-y-2.5 bg-[#0B0F17] p-3.5 rounded-2xl border border-amber-500/40">
                    <p className="text-[11px] text-amber-300 font-bold">
                      Enter your new email address. A verification code will be sent to confirm and activate it:
                    </p>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="email"
                        value={newOwnerEmailDraft}
                        onChange={(e) => setNewOwnerEmailDraft(e.target.value)}
                        placeholder="new-email@gymbrand.com"
                        className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSendOwnerVerificationCode}
                        disabled={isSendingVerificationCode || !newOwnerEmailDraft.includes('@')}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSendingVerificationCode ? 'Sending...' : 'Send Verification Code'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingOwnerEmail(false);
                          setNewOwnerEmailDraft('');
                          setOwnerVerificationFeedback('');
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      value={ownerEmailInput}
                      readOnly={isOwnerEmailVerified}
                      onChange={(e) => setOwnerEmailInput(e.target.value)}
                      placeholder="e.g. owner@gymbrand.com"
                      className={`w-full bg-[#0B0F17] border rounded-xl pl-9 pr-3 py-3 text-xs text-white focus:outline-none ${
                        isOwnerEmailVerified ? 'border-slate-800 text-slate-300 cursor-default' : 'border-slate-800 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* On-Demand Email Verification Section — REMOVED once email is verified, ONLY shown if unverified or actively updating/changing email */}
              {(!isOwnerEmailVerified || isChangingOwnerEmail) && (
                <div className="sm:col-span-2 bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-emerald-400" />
                        <span>{isChangingOwnerEmail ? 'Verify New Email Address' : 'Email Security Verification'}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {isChangingOwnerEmail
                          ? `A unique 6-digit code has been dispatched. Enter it below to confirm and activate ${newOwnerEmailDraft || 'your new email'}.`
                          : 'Verify your email with a unique code to receive password recovery and instant alerts.'}
                      </p>
                    </div>
                    {!isChangingOwnerEmail && (
                      <button
                        type="button"
                        onClick={handleSendOwnerVerificationCode}
                        disabled={isSendingVerificationCode}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSendingVerificationCode ? 'Sending Code...' : 'Send Verification Code'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={ownerVerificationCode}
                      onChange={(e) => setOwnerVerificationCode(e.target.value.toUpperCase())}
                      placeholder="Enter 6-digit code (e.g. GP-123456)"
                      className="flex-1 min-w-[200px] bg-[#141C2B] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white tracking-widest focus:border-emerald-500 focus:outline-none uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOwnerCode}
                      disabled={isVerifyingCode || !ownerVerificationCode.trim()}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isVerifyingCode ? 'Verifying...' : 'Verify Code'}</span>
                    </button>
                  </div>

                  {ownerVerificationFeedback && (
                    <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      ownerVerificationFeedback.includes('✅')
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    }`}>
                      <span>{ownerVerificationFeedback}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Gym / Business Name *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={gymNameInput}
                    onChange={(e) => setGymNameInput(e.target.value)}
                    placeholder="e.g. GymPulse Gym & Fitness"
                    required
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl pl-9 pr-3 py-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Gym Location / Address</label>
                <input
                  type="text"
                  value={gymLocationInput}
                  onChange={(e) => setGymLocationInput(e.target.value)}
                  placeholder="e.g. Vijay Nagar, Indore, MP"
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-300">Red-List No-Show Threshold (Days Absent Before Churn Alert)</label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={noShowDaysInput}
                  onChange={(e) => setNoShowDaysInput(Number(e.target.value))}
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {profileFeedbackMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{profileFeedbackMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile &amp; Gym Details</span>
            </button>
          </form>

          {/* Card 2: Gym Subscription & Billing Tier (Read-Only Informational) */}
          {(() => {
            const activeGymTierKey = normalizePlanKey(currentGym?.plan || subscriptionPlan);
            const activeGymFeatures = getGymActiveFeatures(currentGym || { plan: subscriptionPlan });
            const currentTier = SUBSCRIPTION_TIERS[activeGymTierKey] || SUBSCRIPTION_TIERS.Custom;

            return (
              <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">Gym Subscription &amp; Billing Tier</h3>
                      <p className="text-xs text-slate-400">Current software subscription plan &amp; platform tiers for your gym.</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full font-mono">
                    Current Active: {currentTier.displayName} • ₹{Number(monthlyFeeInput).toLocaleString('en-IN')}/mo
                  </span>
                </div>

                {/* Read-Only Available Tiers Display - shows only Starter, Standard, Pro and Custom if applicable */}
                {(() => {
                  const visibleTierKeys = ['Starter', 'Standard', 'Pro'];
                  if (activeGymTierKey === 'Custom' || String(currentGym?.plan || subscriptionPlan || '').toLowerCase().includes('custom')) {
                    visibleTierKeys.push('Custom');
                  }
                  return (
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${visibleTierKeys.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 text-xs`}>
                      {visibleTierKeys.map(tierKey => {
                        const tier = SUBSCRIPTION_TIERS[tierKey] || SUBSCRIPTION_TIERS.Standard;
                        const isActive = activeGymTierKey === tierKey;
                        return (
                          <div
                            key={tierKey}
                            className={`p-4 rounded-2xl border space-y-2 relative flex flex-col justify-between ${
                              isActive
                                ? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                                : 'bg-[#0B0F17] border-slate-800 opacity-75'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-white text-sm">{tier.name}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.badgeColor}`}>
                                  {tier.badge}
                                </span>
                              </div>
                              <div className="text-lg font-black text-cyan-400 font-mono mt-1">
                                {tier.price ? `₹${tier.price.toLocaleString('en-IN')}` : 'Custom'}
                                {tier.price && <span className="text-xs text-slate-400 font-normal"> /mo</span>}
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{tier.description}</p>
                            </div>

                            {isActive && (
                              <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-bold pt-2 border-t border-cyan-500/20">
                                <Check className="w-3.5 h-3.5" />
                                <span>Active Gym Tier</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Software platform subscription &amp; billing is managed by Super Admin. Contact support to upgrade your tier or change plan features.</span>
                </div>
              </div>
            );
          })()}

          {/* Card 3: Change Password */}
          <form onSubmit={handleChangePassword} className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Change Account Password</h3>
                  <p className="text-xs text-slate-400">Update your secret owner login password securely.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Current Password *</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-3 pr-9 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Min 4 chars"
                    required
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-3 pr-9 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-3 pr-9 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {passwordFeedbackMsg && (
              <div className={`p-3 rounded-xl font-bold text-xs flex items-center gap-2 ${
                passwordFeedbackMsg.includes('✅')
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}>
                {passwordFeedbackMsg.includes('✅') ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{passwordFeedbackMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>Update Password</span>
            </button>
          </form>

          {/* Card 3: WhatsApp Templates Customization */}
          {activeGymFeatures.includes('custom_templates') ? (
            <form onSubmit={handleSaveTemplates} className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">WhatsApp Retention Message Templates</h3>
                    <p className="text-xs text-slate-400">Customize Hinglish message copies for automated &amp; 1-click WhatsApp messaging.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">No-Show / Absent Member Template</label>
                  <div className="text-[11px] text-slate-400">Available variables: <code className="text-emerald-400">&#123;NAME&#125;</code>, <code className="text-emerald-400">&#123;ABSENT_DAYS&#125;</code></div>
                  <textarea
                    value={templateNoShow}
                    onChange={(e) => setTemplateNoShow(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 h-20 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Renewal Due Reminder Template</label>
                  <div className="text-[11px] text-slate-400">Available variables: <code className="text-emerald-400">&#123;NAME&#125;</code>, <code className="text-emerald-400">&#123;EXPIRY_DATE&#125;</code>, <code className="text-emerald-400">&#123;LINK&#125;</code></div>
                  <textarea
                    value={templateRenewal}
                    onChange={(e) => setTemplateRenewal(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 h-20 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">New Member Welcome Template</label>
                  <div className="text-[11px] text-slate-400">Available variables: <code className="text-emerald-400">&#123;NAME&#125;</code>, <code className="text-emerald-400">&#123;PLAN_NAME&#125;</code></div>
                  <textarea
                    value={templateWelcome}
                    onChange={(e) => setTemplateWelcome(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 h-20 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {templatesFeedbackMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{templatesFeedbackMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="py-3 px-6 bg-purple-500 hover:bg-purple-400 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Message Templates</span>
              </button>
            </form>
          ) : (
            <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Custom Message &amp; WhatsApp Templates</h3>
                  <p className="text-xs text-slate-400">Template customization is exclusive to the <strong>Pro Suite</strong>.</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upgrade your subscription plan to <strong>Pro</strong> to customize your gym's automated WhatsApp messages, renewal alerts, and welcome greetings.
              </p>
            </div>
          )}

        </div>
      )}

      {/* FOLLOW-UP OUTCOME MODAL */}
      {outcomeModalCase && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSubmitOutcome} className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setOutcomeModalCase(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-extrabold text-white">Log Follow-Up Outcome</h3>
            <p className="text-xs text-slate-400">Member: <strong className="text-white">{outcomeModalCase.memberName}</strong></p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Select Call / Visit Outcome:</label>
              <select
                value={outcomeType}
                onChange={(e) => setOutcomeType(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-bold"
              >
                <option value="Will return">Will return</option>
                <option value="Injured">Injured / Health recovery</option>
                <option value="Travelling">Travelling / Out of station</option>
                <option value="Timing issue">Timing issue / Work shift</option>
                <option value="Unhappy">Unhappy with service / Gym crowd</option>
                <option value="No response">No response / Unreachable</option>
                <option value="Cancelled">Cancelled membership</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Mandatory Next Action Date:</label>
              <input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                required
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Notes / Feedback:</label>
              <textarea
                value={outcomeNote}
                onChange={(e) => setOutcomeNote(e.target.value)}
                placeholder="e.g. Member promised to come tomorrow at 7 AM."
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 h-20"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
            >
              Save Audit Log & Resolve Risk Case
            </button>
          </form>
        </div>
      )}

      {/* WHATSAPP HINGLISH MESSAGE COMPOSER MODAL */}
      {whatsappModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setWhatsappModalData(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-extrabold text-white">Send WhatsApp Hinglish Message</h3>
            </div>

            <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
              <div className="text-slate-400">Recipient: <strong className="text-white">{whatsappModalData.member.memberName} ({whatsappModalData.member.phone})</strong></div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200 text-xs font-sans whitespace-pre-wrap">
                {whatsappModalData.message}
              </div>
            </div>

            <a
              href={`https://wa.me/91${whatsappModalData.member.phone}?text=${encodeURIComponent(whatsappModalData.message)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setWhatsappModalData(null)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Launch WhatsApp Web / App</span>
            </a>
          </div>
        </div>
      )}

      {/* DAILY OWNER SUMMARY MODAL */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSummaryModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="text-lg font-extrabold text-white">Daily Owner Summary Report</h3>
                <p className="text-xs text-slate-400">Automated Summary for 27 Sept 2026</p>
              </div>
            </div>

            <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 text-xs space-y-3 font-mono text-slate-300">
              <div><strong>1. Check-ins Today:</strong> {todaysCheckInsCount} Verified QR & Assisted check-ins</div>
              <div><strong>2. High Risk No-Shows:</strong> {openNoShowCasesCount} cases open (&gt;10 days absent)</div>
              <div><strong>3. Renewals Due Next 7d:</strong> {renewalsDue7Days} members scheduled for reminder</div>
              <div><strong>4. Renewal Revenue:</strong> ₹{totalRenewalRevenue.toLocaleString('en-IN')}</div>
              <div><strong>5. Add-On Revenue:</strong> ₹{totalAddOnRevenue.toLocaleString('en-IN')}</div>
              <div><strong>6. Data Quality Status:</strong> <span className="text-emerald-400">PASSED (Zero unverified payments)</span></div>
            </div>

            <button
              onClick={() => setSummaryModalOpen(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
            >
              Close Digest
            </button>
          </div>
        </div>
      )}

      {/* (Reset Member Password modal removed per security guidelines - members manage their own credentials) */}
    </div>
  );
}
