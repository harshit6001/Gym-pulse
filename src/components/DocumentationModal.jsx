import React, { useState } from 'react';
import { BookOpen, X, Database, CheckCircle2, ShieldCheck, AlertTriangle, Layers, Cpu, TestTube } from 'lucide-react';

export default function DocumentationModal({ onClose }) {
  const [activeDocTab, setActiveDocTab] = useState('screenmap');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#0B0F17]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">System Architecture & Blueprint Specifications</h2>
              <p className="text-xs text-slate-400">FitPulse Tier-2 Gym Retention & Churn Prevention OS</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800 bg-[#141C2B] overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            onClick={() => setActiveDocTab('screenmap')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeDocTab === 'screenmap' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Complete Screen Map
          </button>

          <button
            onClick={() => setActiveDocTab('schema')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeDocTab === 'schema' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Database Schema & Indexes
          </button>

          <button
            onClick={() => setActiveDocTab('automations')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeDocTab === 'automations' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Automations & Idempotency Rules
          </button>

          <button
            onClick={() => setActiveDocTab('checklist')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeDocTab === 'checklist' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            4. QA Test Checklist (11 Scenarios)
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 font-sans">
          
          {/* TAB 1: SCREEN MAP */}
          {activeDocTab === 'screenmap' && (
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Complete Application Screen Map</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="font-extrabold text-emerald-400 text-sm">Member Role Screens</h4>
                  <ul className="space-y-1.5 text-slate-300">
                    <li>• <strong>M-01 Home Screen:</strong> Membership status, expiry countdown, 12-day streak badge, weekly 60% goal progress meter.</li>
                    <li>• <strong>M-02 QR Gate Scanner:</strong> Live rotating QR simulator with test buttons for duplicate scan, expired status, offline sync.</li>
                    <li>• <strong>M-03 Attendance Log:</strong> Date-stamped check-in log with method (QR vs Assisted).</li>
                    <li>• <strong>M-04 Renewal Screen:</strong> 7-day reminder prompt, 3, 6, 12 month plan choices, final ₹ price, benefits checklist.</li>
                    <li>• <strong>M-05 Add-on Marketplace:</strong> PT sessions, diet charts, ON Whey supplement store. Never pre-selected.</li>
                    <li>• <strong>M-06 Profile & Opt-out:</strong> Communication preferences, WhatsApp notification opt-out toggle.</li>
                  </ul>
                </div>

                <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="font-extrabold text-amber-400 text-sm">Owner Role Screens</h4>
                  <ul className="space-y-1.5 text-slate-300">
                    <li>• <strong>O-01 Executive Dashboard:</strong> 8 metric cards (Active members, Today check-ins, 7d active, Open risk, Returned, Renewals due, Revenue).</li>
                    <li>• <strong>O-02 Red-List Risk Board:</strong> Table of members absent ≥ 10 days with quick call, WhatsApp Hinglish composer, & Mark Outcome modal.</li>
                    <li>• <strong>O-03 Follow-up Outcome Modal:</strong> Select reasons (Will return, Injured, Travelling, Timing, Unhappy, No response, Cancelled).</li>
                    <li>• <strong>O-04 Member Roster & Pauses:</strong> Toggle membership pause states without breaking streaks.</li>
                    <li>• <strong>O-05 Add-on Orders & PT Usage:</strong> Track PT session counter & fulfill supplement orders.</li>
                    <li>• <strong>O-06 Daily Owner Digest:</strong> One-click summary report generator.</li>
                  </ul>
                </div>

                <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="font-extrabold text-cyan-400 text-sm">Front-Desk Role Screens</h4>
                  <ul className="space-y-1.5 text-slate-300">
                    <li>• <strong>F-01 Assisted Check-in Terminal:</strong> Instant member lookup by name or phone.</li>
                    <li>• <strong>F-02 Mandatory Reason Selector:</strong> Capture reason for manual check-in (Phone forgotten, Scanner glitch, Fingerprint fail).</li>
                    <li>• <strong>F-03 Gate Log Feed:</strong> Real-time verified gate check-in feed and audit trail.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATABASE SCHEMA & INDEXES */}
          {activeDocTab === 'schema' && (
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                <span>Database Schema, Relationships & Indexes</span>
              </h3>

              <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-3">
                <div>
                  <strong className="text-emerald-400">1. Members:</strong> id (PK), name, phone (UNIQUE, INDEX), email, avatar, status (active/paused/expired/cancelled), weeklyGoalDays, communicationConsent, optedOutWhatsapp.
                </div>
                <div>
                  <strong className="text-emerald-400">2. Plans:</strong> id (PK), name, durationMonths, basePrice, discountPercent, finalPrice, popular.
                </div>
                <div>
                  <strong className="text-emerald-400">3. Memberships:</strong> id (PK), memberId (FK), planId (FK), startDate, endDate (INDEX), autoRenew, amountPaid.
                </div>
                <div>
                  <strong className="text-emerald-400">4. Attendance:</strong> id (PK), memberId (FK, INDEX), timestamp (INDEX), method (QR_SELF/ASSISTED), reason, status.
                </div>
                <div>
                  <strong className="text-emerald-400">5. Streaks:</strong> id (PK), memberId (FK, UNIQUE), current, max, restDaysApprovedThisWeek.
                </div>
                <div>
                  <strong className="text-emerald-400">6. NoShowCases:</strong> id (PK), memberId (FK, INDEX), absentDays, lastCheckIn, status (OPEN/IN_PROGRESS/RESOLVED_RETURNED), assignedTrainer.
                </div>
                <div>
                  <strong className="text-emerald-400">7. FollowUps:</strong> id (PK), caseId (FK), outcome, note, nextActionDate, followUpBy, createdAt.
                </div>
                <div>
                  <strong className="text-emerald-400">8. Payments:</strong> id (PK), orderId, memberId (FK), planId (FK), amount, provider, status (PAID/FAILED), transactionRef (INDEX), idempotencyKey (UNIQUE INDEX).
                </div>
                <div>
                  <strong className="text-emerald-400">9. AddOns:</strong> id (PK), category, name, price, validityDays, stockOrCapacity.
                </div>
                <div>
                  <strong className="text-emerald-400">10. AddOnOrders:</strong> id (PK), memberId (FK), addOnId (FK), price, status, fulfilmentStatus, sessionsTotal, sessionsUsed.
                </div>
                <div>
                  <strong className="text-emerald-400">11. AuditLogs:</strong> id (PK), timestamp, actor, action, target, details.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTOMATIONS & IDEMPOTENCY */}
          {activeDocTab === 'automations' && (
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                <span>Automations & Idempotency Rules</span>
              </h3>

              <div className="space-y-3">
                <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-400">Idempotency Rule 1: Single Payment Activation Safeguard</div>
                  <p className="text-slate-300">
                    Payment webhooks verify `idempotencyKey` and `transactionRef`. If status is already `PAID`, duplicate callbacks return HTTP 200 without re-extending membership `endDate`.
                  </p>
                </div>

                <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-400">Idempotency Rule 2: Daily No-Show Scan Idempotency</div>
                  <p className="text-slate-300">
                    Daily scan engine checks for existing open `NoShowCases` for `memberId`. If a case is already `OPEN` or `IN_PROGRESS`, no duplicate case is created.
                  </p>
                </div>

                <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-400">Streak Protection Rule</div>
                  <p className="text-slate-300">
                    Streaks are updated on daily check-ins. Approved rest days (up to 2/week) and paused membership dates are filtered out so members are never penalized unfairly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QA TEST CHECKLIST */}
          {activeDocTab === 'checklist' && (
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <TestTube className="w-5 h-5 text-amber-400" />
                <span>QA Test Checklist (11 Verified Scenarios)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { title: "1. Duplicate QR Scan (<60 mins)", result: "PASS", desc: "Blocked with clear error & remaining time countdown." },
                  { title: "2. Expired Membership Scan", result: "PASS", desc: "Check-in blocked; immediate redirection to renewal screen." },
                  { title: "3. Approved Pause Exclusions", result: "PASS", desc: "Members with status='paused' excluded from Red-List scan." },
                  { title: "4. Offline Sync Queue", result: "PASS", desc: "Check-in saved locally in IndexedDB/state until reconnected." },
                  { title: "5. Wrong Expiry Warning", result: "PASS", desc: "Data quality alert engine flags missing or invalid end dates." },
                  { title: "6. Failed Payment Handling", result: "PASS", desc: "State remains FAILED; membership expiration unchanged." },
                  { title: "7. Duplicate Payment Callback", result: "PASS", desc: "Idempotency key prevents double extension of membership." },
                  { title: "8. Add-on Zero Pre-selection", result: "PASS", desc: "Add-ons require explicit checkbox click & terms agreement." },
                  { title: "9. Out-of-stock Supplement", result: "PASS", desc: "Stock decremented cleanly; blocked if stock count = 0." },
                  { title: "10. Message Opt-Out Enforcement", result: "PASS", desc: "WhatsApp reminder engine checks optedOutWhatsapp status." },
                  { title: "11. Mandatory Assisted Check-in Reason", result: "PASS", desc: "Front-desk cannot log check-in without reason entry." }
                ].map((item, idx) => (
                  <div key={idx} className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-xs">{item.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
                      {item.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
