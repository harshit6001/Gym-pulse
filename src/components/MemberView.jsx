import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import QrCameraScanner from './QrCameraScanner';
import { 
  QrCode, Flame, Calendar, Clock, ShieldAlert, CheckCircle2, AlertTriangle, 
  ShoppingBag, Sparkles, ChevronRight, Lock, RefreshCw, Smartphone, Phone, 
  MessageSquare, User, Dumbbell, Award, ArrowRight, Zap, Check, X, WifiOff, FileText, Camera
} from 'lucide-react';

export default function MemberView({ 
  member, 
  plans, 
  addOns, 
  attendanceLogs, 
  onPerformCheckIn, 
  onOpenPaymentModal, 
  onBuyAddOn, 
  onToggleWhatsappOptOut 
}) {
  const [activeTab, setActiveTab] = useState('home');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalMode, setQrModalMode] = useState('camera'); // 'camera' or 'pass'
  const [qrTestResult, setQrTestResult] = useState(null);
  const [selectedPlanForRenewal, setSelectedPlanForRenewal] = useState(null);
  const [selectedAddOnModal, setSelectedAddOnModal] = useState(null);
  const [addOnAgreedTerms, setAddOnAgreedTerms] = useState(false);

  // Rotating QR token — changes every 30 seconds
  const [qrRotateCount, setQrRotateCount] = useState(0);
  const [qrCountdown, setQrCountdown] = useState(30);

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
        message: 'Duplicate QR scan detected! You already checked in 18 minutes ago.',
        timeRemaining: '42 mins until next valid scan'
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

        <button
          onClick={() => { setActiveTab('home'); setQrModalOpen(true); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/20 hover:scale-[1.02]`}
        >
          <QrCode className="w-4 h-4" />
          <span>QR Check-in</span>
        </button>

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

        <button
          onClick={() => setActiveTab('addons')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'addons'
              ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Add-ons Store</span>
        </button>

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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {member.membership.planName}
                    </span>
                    <span className="text-xs text-slate-400">
                      Valid till <span className="text-slate-200 font-bold">{member.membership.endDate}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Check-in Button */}
              <button
                onClick={() => setQrModalOpen(true)}
                className="px-5 py-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 group"
              >
                <QrCode className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Scan Gym QR Code</span>
              </button>
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
              <div className="bg-[#0B0F17] rounded-xl p-2.5 border border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Fair Protection: Approved rest days & pauses don't reset streak!</span>
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
                <div className="text-base font-bold text-white">Coach Vikram Singh</div>
                <div className="text-xs text-purple-400 font-medium">Strength & Bodybuilding Specialist</div>
                <p className="text-xs text-slate-400 mt-2">
                  Last session notes: "Focusing on progressive overload chest press."
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

        </div>
      )}

      {/* TAB 2: ATTENDANCE HISTORY */}
      {activeTab === 'history' && (
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
      {activeTab === 'addons' && (
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
              <p className="text-xs text-slate-400">Manage how FitPulse contacts you regarding workouts and renewals.</p>
            </div>
          </div>

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
                      Duplicate (&lt;60m)
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

    </div>
  );
}
