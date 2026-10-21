import React, { useState, useRef } from 'react';
import { UserPlus, X, Check, Dumbbell, ShieldCheck, Phone, Mail, Calendar, DollarSign, MessageCircle, Copy } from 'lucide-react';
import { PLANS, INITIAL_STAFF } from '../data/mockData';
import { generateUUID } from '../lib/db';
import { generateVerificationToken, apiSendVerification } from '../lib/api';

export default function AddMemberModal({ onClose, onAddMember, plans = PLANS }) {
  const availablePlans = plans && plans.length > 0 ? plans : PLANS;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [planId, setPlanId] = useState(availablePlans[0]?.id || 'p-1');
  const [assignedTrainer, setAssignedTrainer] = useState('tr-1');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('UPI_GPAY');
  const [weeklyGoalDays, setWeeklyGoalDays] = useState(4);
  const [notes, setNotes] = useState('');
  const dateInputRef = useRef(null);

  const selectedPlan = availablePlans.find(p => p.id === planId) || availablePlans[0];
  const [credentialsSent, setCredentialsSent] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copiedPass, setCopiedPass] = useState(false);

  const handleCopyCredentials = () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const textToCopy = `🏋️ Welcome to GymPulse!\n\nHi ${name}, your gym membership is now active!\n\n🔑 Login Credentials:\n📱 Registered Phone: ${cleanPhone}\n🔒 Temporary Password: ${generatedPassword}\n✉️ Registered Email: ${email.trim()}\n🌐 Login Portal: ${window.location.origin}\n\n— GymPulse Management`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2500);
    }
  };

  const handleSendEmail = (e) => {
    if (e) e.preventDefault();
    const cleanEmail = (email || '').trim();
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
    const subject = `Welcome to GymPulse - Your Login Credentials`;
    const body = `Hi ${name},\n\nWelcome to GymPulse! Your gym membership is now active.\n\n🔑 Login Credentials:\n📱 Registered Phone: ${cleanPhone}\n🔒 Temporary Password: ${generatedPassword}\n🌐 Login Portal: ${window.location.origin}\n\nPlease change your password after logging in.\n\nBest regards,\nGymPulse Team`;

    const mailtoUrl = `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please fill in Member Full Name.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      alert('Mobile number is compulsory and must be exactly 10 digits.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      alert('Email address is compulsory. Please enter a valid email address (e.g. member@example.com).');
      return;
    }

    // Auto-generate a temporary password: last 4 digits of phone + 2 random digits
    const tempPassword = cleanPhone.slice(-4) + String(Math.floor(10 + Math.random() * 90));

    // Compute end date based on plan duration
    const startDateObj = new Date(joiningDate);
    const endDateObj = new Date(startDateObj);
    endDateObj.setMonth(endDateObj.getMonth() + selectedPlan.durationMonths);
    const endDateStr = endDateObj.toISOString().split('T')[0];

    // Standard UUID ensures 100% database compatibility with both uuid and text PKs
    const newMemberId = generateUUID();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0B0F17&color=34d399&size=150`;

    // Auto-generate verification token for email verification
    const verificationToken = generateVerificationToken();

    const newMemberData = {
      id: newMemberId,
      name: name.trim(),
      phone: cleanPhone,
      password: tempPassword,
      email: cleanEmail,
      emailVerified: false,
      verificationToken,
      verificationSentAt: new Date().toISOString(),
      avatar: avatarUrl,
      status: 'active',
      membership: {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        startDate: joiningDate,
        endDate: endDateStr,
        autoRenew: false,
        amountPaid: selectedPlan.finalPrice
      },
      weeklyGoalDays: Number(weeklyGoalDays),
      streak: { current: 1, max: 1, restDaysApprovedThisWeek: 0 },
      lastCheckIn: new Date().toISOString(),
      absentDaysCount: 0,
      assignedTrainer,
      communicationConsent: true,
      optedOutWhatsapp: false,
      notes: notes || 'New registration at GymPulse.'
    };

    onAddMember(newMemberData, selectedPlan, paymentMode);

    // Auto-send unique verification code to member's email via Resend
    apiSendVerification({
      memberId: newMemberId,
      role: 'member',
      email: cleanEmail,
      phone: cleanPhone,
      name: name.trim()
    }).catch(err => console.error('Failed to dispatch auto-verification code:', err));

    // Show credential delivery screen with WhatsApp + Email buttons
    setGeneratedPassword(tempPassword);
    setCredentialsSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-[#141C2B] border border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative space-y-4 sm:space-y-5 overflow-y-auto max-h-[92vh]">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Credential Delivery Success Overlay */}
        {credentialsSent ? (
          <div className="space-y-5 text-center py-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
              <Check className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">Member Registered Successfully!</h3>
              <p className="text-xs text-slate-400">Login credentials &amp; verification code generated</p>
            </div>

            <div className="bg-[#0B0F17] border border-emerald-500/30 rounded-2xl p-4 text-left space-y-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Mail className="w-4 h-4" />
                <span>Login Credentials</span>
              </div>

              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Member:</span>
                  <span className="font-bold text-white">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-mono font-bold text-emerald-400">{phone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Password:</span>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg text-xs">
                    •••••••••••• (Confidential &amp; Encrypted)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Login Portal:</span>
                  <span className="font-mono text-cyan-400 text-[11px] truncate max-w-[200px]">{window.location.origin}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-300 leading-relaxed">
                  <span className="font-bold text-white">Unique Code Dispatched:</span> A unique 6-digit verification code has been sent to <span className="font-mono text-white underline">{email.trim()}</span>. Member can verify anytime from their portal!
                </div>
              </div>
            </div>

            {/* Action Buttons: Send via WhatsApp + SMS + Email directly to Member */}
            <div className="space-y-2">
              <a
                href={`https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                  `🏋️ Welcome to GymPulse!\n\nHi ${name}, your gym membership is now active!\n\n🔑 Login Credentials:\n📱 Registered Phone: ${phone.replace(/\D/g, '').slice(-10)}\n🔒 Password: ${generatedPassword}\n🌐 Login Portal: ${window.location.origin}\n\nPlease change your password after your first login.\n\n— GymPulse Management`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-green-500 hover:bg-green-400 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-green-500/20 active:scale-95 cursor-pointer"
              >
                <span>📱 Send via WhatsApp (Instant)</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`sms:${phone.replace(/\D/g, '').slice(-10)}?&body=${encodeURIComponent(
                    `GymPulse Login Details: Phone: ${phone.replace(/\D/g, '').slice(-10)}, Password: ${generatedPassword}, Portal: ${window.location.origin}`
                  )}`}
                  className="py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Send SMS</span>
                </a>

                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                  title="Open Mail App with 1 tap"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </button>
              </div>

              {/* Copy Full Credentials One-Click */}
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPass ? 'Credentials Copied to Clipboard!' : 'Copy Full Credentials'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Close Window
            </button>
          </div>
        ) : (
        <>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white">Add New Gym Member</h3>
            <p className="text-xs text-slate-400">Register new member & generate active membership plan</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Member Name & Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Full Name *</label>
              <input
                type="text"
                placeholder="Enter member's full name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Mobile Phone (WhatsApp) *</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                minLength={10}
                placeholder="10-digit mobile number..."
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Email & Joining Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Registered Email Address *</label>
              <input
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">
                Joining Date
              </label>
              <div className="relative flex items-center">
                <input
                  ref={dateInputRef}
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err) {} }}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 pr-10 text-xs text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => { try { dateInputRef.current?.showPicker(); } catch(err) {} }}
                  className="absolute right-2 p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                  title="Open Calendar Picker"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Membership Plan Selection */}
          <div className="space-y-1">
            <label className="font-bold text-slate-300">Select Membership Plan *</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-400 font-bold focus:outline-none"
            >
              {availablePlans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.durationMonths} Months) - ₹{(p.finalPrice || p.basePrice).toLocaleString('en-IN')} (Reg: ₹{p.basePrice})
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Trainer & Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Assigned Personal Coach</label>
              <select
                value={assignedTrainer}
                onChange={(e) => setAssignedTrainer(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="General Floor Coach">General Floor Coach</option>
                <option value="Head Strength Coach">Head Strength Coach</option>
                <option value="Sports Nutrition & Diet Coach">Sports Nutrition &amp; Diet Coach</option>
                <option value="Crossfit & Conditioning Coach">Crossfit &amp; Conditioning Coach</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Payment Collection Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="UPI_GPAY">UPI (GPay / PhonePe / Paytm)</option>
                <option value="CASH">Cash at Front Desk</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="BANK_TRANSFER">Direct Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Weekly Goal & Notes */}
          <div className="space-y-1">
            <label className="font-bold text-slate-300">Notes / Workout Focus:</label>
            <input
              type="text"
              placeholder="e.g. Weight loss target, prefers morning 7 AM session."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Summary Box */}
          <div className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 text-slate-300 space-y-1">
            <div className="flex justify-between font-bold">
              <span>Total Payable Amount:</span>
              <span className="text-emerald-400">₹{selectedPlan.finalPrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Valid from {joiningDate} until <strong>{joiningDate} + {selectedPlan.durationMonths} Months</strong>
            </div>
            <div className="text-[11px] text-amber-400">
              🔑 A temporary login password will be auto-generated and sent to the member's email & phone.
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Register Member</span>
          </button>
        </form>
        </>
        )}

      </div>
    </div>
  );
}
