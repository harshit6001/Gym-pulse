import React, { useState } from 'react';
import { Cpu, ShieldCheck, AlertOctagon, CheckCircle2, Play, RefreshCw, Key, Database, FileText } from 'lucide-react';

export default function AutomationsAndAuditView({
  settings,
  members,
  noShowCases,
  payments,
  attendanceLogs,
  addOns,
  auditLogs,
  onRunDailyScan
}) {
  const [activeEngineTab, setActiveEngineTab] = useState('automations'); // automations, dataquality, audit

  // Run Data Quality Checks
  const dataQualityAlerts = [];

  // Check 1: Missing expiry dates
  members.forEach(m => {
    if (!m.membership.endDate) {
      dataQualityAlerts.push({ id: `dq-1-${m.id}`, severity: 'CRITICAL', title: 'Missing Expiry Date', desc: `Member ${m.name} (${m.id}) lacks a valid membership end date.` });
    }
  });

  // Check 2: Unverified paid state (Payments marked paid without transactionRef)
  payments.forEach(p => {
    if (p.status === 'PAID' && !p.transactionRef) {
      dataQualityAlerts.push({ id: `dq-2-${p.id}`, severity: 'HIGH', title: 'Unverified Paid State', desc: `Payment order ${p.orderId} is marked PAID without provider transactionRef!` });
    }
  });

  // Check 3: Assisted Check-ins missing mandatory reason
  attendanceLogs.forEach(a => {
    if (a.method === 'ASSISTED' && !a.reason) {
      dataQualityAlerts.push({ id: `dq-3-${a.id}`, severity: 'MEDIUM', title: 'Assisted Check-In Without Reason', desc: `Check-in ${a.id} for ${a.memberName} was manually logged without staff reason.` });
    }
  });

  // Check 4: Negative stock / capacity
  addOns.forEach(item => {
    if (item.stockOrCapacity !== null && item.stockOrCapacity < 0) {
      dataQualityAlerts.push({ id: `dq-4-${item.id}`, severity: 'HIGH', title: 'Negative Add-On Stock', desc: `Item ${item.name} has negative inventory (${item.stockOrCapacity}).` });
    }
  });

  return (
    <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Automations & Data Quality Engine</h2>
            <p className="text-xs text-slate-400">6 System Automations • Idempotency Keys • Data Integrity Guardrails</p>
          </div>
        </div>

        <button
          onClick={onRunDailyScan}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Execute Daily Scan Engine Now</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveEngineTab('automations')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeEngineTab === 'automations' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          6 System Automations
        </button>

        <button
          onClick={() => setActiveEngineTab('dataquality')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeEngineTab === 'dataquality' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Data Quality Alerts</span>
          <span className="bg-slate-900 text-amber-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {dataQualityAlerts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveEngineTab('audit')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeEngineTab === 'audit' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          System Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: 6 SYSTEM AUTOMATIONS */}
      {activeEngineTab === 'automations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">Automation #1: Daily No-Show Scan</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Active (04:00 AM)</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Scans all member attendance. If absent ≥ {settings.noShowThresholdDays} days & not paused/frozen/expired, idempotently creates one open risk case in <strong className="text-white">NoShowCases</strong>.
            </p>
          </div>

          <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">Automation #2: Valid QR Auto-Resolution</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Real-Time Trigger</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Upon valid QR scan, records visit in <strong className="text-white">Attendance</strong>, updates streak, and automatically resolves open risk case to <strong className="text-emerald-400 font-bold">RESOLVED_RETURNED</strong>.
            </p>
          </div>

          <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">Automation #3: Renewal Reminder Schedule</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Schedule: 14, 7, 3, 0 Days</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Triggers friendly WhatsApp/SMS prompts at 14, 7, 3 & 0 days before expiry. Stops immediately once renewed or opted out.
            </p>
          </div>

          <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">Automation #4: Single Payment Extension</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Idempotency Protected</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Validates provider callback. Updates status to <strong className="text-white">PAID</strong>, extends membership endDate exactly once, and generates receipt log.
            </p>
          </div>

          <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">Automation #5: Daily Owner Summary Digest</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Cron: 09:00 PM</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Compiles check-ins, new risk cases, follow-up outcomes, renewal collection & add-on revenue into owner report.
            </p>
          </div>

          <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">Automation #6: Data Quality Guard Engine</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Continuous Monitoring</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Audits database integrity for missing expiry dates, unverified payments, manual check-ins lacking reason & stock anomalies.
            </p>
          </div>

        </div>
      )}

      {/* TAB 2: DATA QUALITY ALERTS */}
      {activeEngineTab === 'dataquality' && (
        <div className="space-y-3">
          {dataQualityAlerts.length === 0 ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>All Data Quality Audits PASSED cleanly! No anomalies detected in current database.</span>
            </div>
          ) : (
            dataQualityAlerts.map((alert) => (
              <div key={alert.id} className="bg-[#0B0F17] p-4 rounded-2xl border border-amber-500/30 flex items-start gap-3 text-xs">
                <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{alert.title}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.2 rounded-full font-bold">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-slate-300 mt-1">{alert.desc}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: SYSTEM AUDIT LOGS */}
      {activeEngineTab === 'audit' && (
        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono text-[11px] text-slate-400">{log.timestamp}</span> • <strong className="text-cyan-400">{log.actor}</strong>
                <div className="font-bold text-slate-200 mt-0.5">{log.action}: {log.target}</div>
                <div className="text-slate-400 text-[11px] mt-0.5">{log.details}</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                {log.id}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
