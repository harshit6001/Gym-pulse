import React, { useState } from 'react';
import { UserPlus, X, Check, Dumbbell, ShieldCheck, Phone, Mail, Calendar, DollarSign } from 'lucide-react';
import { PLANS, INITIAL_STAFF } from '../data/mockData';

export default function AddMemberModal({ onClose, onAddMember }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [planId, setPlanId] = useState('p-2'); // 3 Months Power by default
  const [assignedTrainer, setAssignedTrainer] = useState('tr-1');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('UPI_GPAY');
  const [weeklyGoalDays, setWeeklyGoalDays] = useState(4);
  const [notes, setNotes] = useState('');

  const selectedPlan = PLANS.find(p => p.id === planId) || PLANS[0];
  const [credentialsSent, setCredentialsSent] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('Please fill in Name and Phone Number.');
      return;
    }

    // Auto-generate a temporary password: last 4 digits of phone + 2 random digits
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const tempPassword = cleanPhone.slice(-4) + String(Math.floor(10 + Math.random() * 90));

    // Compute end date based on plan duration
    const startDateObj = new Date(joiningDate);
    const endDateObj = new Date(startDateObj);
    endDateObj.setMonth(endDateObj.getMonth() + selectedPlan.durationMonths);
    const endDateStr = endDateObj.toISOString().split('T')[0];

    const newMemberId = `m-${Date.now()}`;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0B0F17&color=34d399&size=150`;

    const newMemberData = {
      id: newMemberId,
      name,
      phone: cleanPhone,
      password: tempPassword,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
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
      lastCheckIn: `${joiningDate} 08:00 AM (Initial Registration)`,
      absentDaysCount: 0,
      assignedTrainer,
      communicationConsent: true,
      optedOutWhatsapp: false,
      notes: notes || 'New registration at GymPulse.'
    };

    onAddMember(newMemberData, selectedPlan, paymentMode);

    // Simulate one-time credential delivery to email and phone
    setGeneratedPassword(tempPassword);
    setCredentialsSent(true);

    // Log credential delivery (simulated)
    console.log(`[GymPulse] 📧 Credential delivery simulated for ${name}:`);
    console.log(`  → Email: ${newMemberData.email}`);
    console.log(`  → Phone: ${cleanPhone}`);
    console.log(`  → Temp Password: ${tempPassword}`);
    console.log(`  → Login URL: ${window.location.origin}`);

    // Auto-close after showing credentials for 5 seconds
    setTimeout(() => {
      setCredentialsSent(false);
      setGeneratedPassword('');
      onClose();
    }, 6000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 overflow-y-auto max-h-[90vh]">
        
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
              <p className="text-xs text-slate-400">Credentials have been dispatched (one-time delivery)</p>
            </div>

            <div className="bg-[#0B0F17] border border-emerald-500/30 rounded-2xl p-4 text-left space-y-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Mail className="w-4 h-4" />
                <span>Credential Delivery Report</span>
              </div>

              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Member Name:</span>
                  <span className="font-bold text-white">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-mono font-bold text-emerald-400">{phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Temp Password:</span>
                  <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg">{generatedPassword}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Login URL:</span>
                  <span className="font-mono text-cyan-400 text-[11px] truncate max-w-[200px]">{window.location.origin}</span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-2 space-y-1">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Check className="w-3.5 h-3.5" />
                  <span>📧 Login credentials sent to <strong>{email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <Check className="w-3.5 h-3.5" />
                  <span>📱 SMS with temp password sent to <strong>{phone}</strong></span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">This window will close automatically in a few seconds...</p>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Close Now
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
                placeholder="10-digit mobile number..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                required
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Email & Joining Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Email Address (Optional)</label>
              <input
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
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
              {PLANS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.durationMonths} Months) - ₹{p.finalPrice.toLocaleString('en-IN')} (Reg: ₹{p.basePrice})
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
