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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('Please fill in Name and Phone Number.');
      return;
    }

    // Compute end date based on plan duration
    const startDateObj = new Date(joiningDate);
    const endDateObj = new Date(startDateObj);
    endDateObj.setMonth(endDateObj.getMonth() + selectedPlan.durationMonths);
    const endDateStr = endDateObj.toISOString().split('T')[0];

    const newMemberId = `m-${Date.now()}`;
    const avatarList = [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
    ];
    const randomAvatar = avatarList[Math.floor(Math.random() * avatarList.length)];

    const newMemberData = {
      id: newMemberId,
      name,
      phone,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      avatar: randomAvatar,
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
      notes: notes || 'New registration at FitPulse Gym.'
    };

    onAddMember(newMemberData, selectedPlan, paymentMode);
    onClose();
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
                placeholder="e.g. Vikram Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Mobile Phone (WhatsApp) *</label>
              <input
                type="text"
                placeholder="10 Digits (e.g. 9826099111)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                <option value="tr-1">Coach Vikram Singh (Strength Coach)</option>
                <option value="tr-2">Coach Neha Sharma (Sports Nutritionist)</option>
                <option value="tr-3">Coach Karan Malhotra (Functional Fitness)</option>
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
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Add Member to Gym Database</span>
          </button>
        </form>

      </div>
    </div>
  );
}
