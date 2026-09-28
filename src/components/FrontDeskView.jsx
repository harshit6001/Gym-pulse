import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Search, UserCheck, ShieldAlert, CheckCircle2, Clock, Dumbbell, AlertTriangle, FileText, QrCode, Zap, Check, Monitor, Smartphone } from 'lucide-react';

export default function FrontDeskView({ members, attendanceLogs, onPerformCheckIn }) {
  const [deskTab, setDeskTab] = useState('assisted'); // 'assisted' or 'gate_qr'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [mandatoryReason, setMandatoryReason] = useState('Phone forgotten / battery dead');
  const [customReasonText, setCustomReasonText] = useState('');
  const [checkInResult, setCheckInResult] = useState(null);
  
  // Rotating Gate Entrance Token
  const [gateToken, setGateToken] = useState(1);
  const [gateCountdown, setGateCountdown] = useState(30);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const timer = setInterval(() => {
      setGateCountdown(prev => {
        if (prev <= 1) {
          setGateToken(t => t + 1);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Quick Gate Scanner Input
  const [qrPayloadInput, setQrPayloadInput] = useState('');

  // Handle Gate QR Payload Scan
  const handleScanQrPayload = (payload) => {
    // Format: FITPULSE:CHECKIN:<memberId>:<date> or memberId directly
    let targetMemberId = payload.trim();
    if (payload.includes('FITPULSE:CHECKIN:')) {
      const parts = payload.split(':');
      targetMemberId = parts[2];
    }

    const m = members.find(mem => mem.id === targetMemberId || mem.phone === targetMemberId);
    if (!m) {
      setCheckInResult({
        status: 'INVALID_QR',
        message: `Invalid QR Payload! Member ID "${targetMemberId}" not found in gym database.`
      });
      return;
    }

    const res = onPerformCheckIn(m.id, 'QR_GATE_SCANNER', 'Scanned at Front Desk Gate Terminal');
    setCheckInResult(res);
    setQrPayloadInput('');
  };

  // Filter members by name or phone
  const filteredMembers = searchTerm.trim() === ''
    ? []
    : members.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.phone.includes(searchTerm)
      );

  const handleAssistedSubmit = (e) => {
    e.preventDefault();
    if (!selectedMember) return;

    const finalReason = mandatoryReason === 'Other' ? customReasonText : mandatoryReason;
    if (!finalReason) return;

    const res = onPerformCheckIn(selectedMember.id, 'ASSISTED', finalReason);
    setCheckInResult(res);
    setSelectedMember(null);
    setSearchTerm('');
  };

  return (
    <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Front Desk Operations Terminal</h2>
            <p className="text-xs text-slate-400">Gate Entrance QR Stand • Scanner Gun • Manual Assisted Check-in</p>
          </div>
        </div>

        {/* Tab switcher: Assisted vs Gate QR Display */}
        <div className="flex bg-[#0B0F17] p-1 rounded-2xl border border-slate-800 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setDeskTab('assisted')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              deskTab === 'assisted'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Assisted Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => setDeskTab('gate_qr')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              deskTab === 'gate_qr'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Live Gate QR Stand</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: LIVE GATE ENTRANCE QR STAND (TABLET / MONITOR DISPLAY) */}
      {deskTab === 'gate_qr' && (
        <div className="bg-[#0B0F17] p-8 rounded-3xl border border-cyan-500/30 text-center space-y-6 flex flex-col items-center justify-center max-w-xl mx-auto shadow-2xl">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
              Live Entrance Turnstile Stand
            </span>
            <h3 className="text-2xl font-black text-white mt-2">Scan with FitPulse App to Enter</h3>
            <p className="text-xs text-slate-400">Point your smartphone camera at this screen</p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-cyan-500/10 border-4 border-cyan-500/40">
            <QRCodeSVG
              value={`FITPULSE:GATE:GYM-1:${todayStr}:T${gateToken}`}
              size={240}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="space-y-2 w-full max-w-sm">
            <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
                Rotating Security Token:
              </span>
              <span className="font-bold text-cyan-400">Session #{gateToken}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Token refreshes in:</span>
              <span className={`font-bold ${gateCountdown <= 5 ? 'text-rose-400' : 'text-cyan-400'}`}>
                {gateCountdown}s
              </span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all"
                style={{ width: `${(gateCountdown / 30) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-xs text-cyan-200">
            💡 <strong>Front Desk Tip:</strong> Keep this tab open on a tablet or monitor at the gym reception desk for members to scan on arrival.
          </div>
        </div>
      )}

      {/* VIEW 2: ASSISTED CHECK-IN TERMINAL */}
      {deskTab === 'assisted' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Search & Check-in Panel */}
        <div className="bg-[#0B0F17] p-5 rounded-2xl border border-slate-800 space-y-4">
          
          {/* Gate QR Scanner Input Box */}
          <div className="bg-[#141C2B] p-4 rounded-xl border border-cyan-500/30 space-y-2">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-sm">Gate Scanner Payload / Barcode Gun</h3>
            </div>
            <p className="text-[11px] text-slate-400">Scan member app pass with barcode gun or paste QR payload</p>
            
            <form onSubmit={(e) => { e.preventDefault(); if (qrPayloadInput) handleScanQrPayload(qrPayloadInput); }} className="flex gap-2">
              <input
                type="text"
                placeholder={`Scan or paste payload (e.g. FITPULSE:CHECKIN:m-1:${todayStr})...`}
                value={qrPayloadInput}
                onChange={(e) => setQrPayloadInput(e.target.value)}
                className="flex-1 bg-[#0B0F17] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all"
              >
                Verify
              </button>
            </form>

            {/* Quick 1-click test scan buttons */}
            <div className="pt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
              <span className="text-slate-400 font-medium">Quick Test Scans:</span>
              {members.slice(0, 3).map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleScanQrPayload(`FITPULSE:CHECKIN:${m.id}:${todayStr}`)}
                  className="px-2 py-1 bg-[#0B0F17] hover:bg-slate-800 text-cyan-300 border border-cyan-500/20 rounded-lg truncate"
                >
                  Scan {m.name}
                </button>
              ))}
            </div>
          </div>

          <h3 className="font-bold text-white text-sm pt-2 border-t border-slate-800">Find Member for Manual Assisted Check-in</h3>
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Enter name or mobile number (e.g. 9826011111)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Filtered Search Results */}
          {filteredMembers.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
              {filteredMembers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMember(m)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                    selectedMember?.id === m.id
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
                      : 'bg-[#141C2B] border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white">{m.name}</div>
                    <div className="text-[11px] text-slate-400">{m.phone} • Plan: {m.membership.planName}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                    Select
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Selected Member Check-in Form */}
          {selectedMember && (
            <form onSubmit={handleAssistedSubmit} className="bg-[#141C2B] p-4 rounded-xl border border-cyan-500/40 space-y-3">
              <div className="flex items-center gap-3">
                <img src={selectedMember.avatar} alt={selectedMember.name} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <div className="font-bold text-white text-sm">{selectedMember.name}</div>
                  <div className="text-xs text-emerald-400 font-semibold">Active Plan till {selectedMember.membership.endDate}</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Mandatory Audit Reason for Assisted Check-in:</label>
                <select
                  value={mandatoryReason}
                  onChange={(e) => setMandatoryReason(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2 text-xs text-slate-100 font-semibold"
                >
                  <option value="Phone forgotten / battery dead">Phone forgotten / battery dead</option>
                  <option value="QR code scanner broken/glitch">QR code scanner broken/glitch</option>
                  <option value="Fingerprint reader fail">Fingerprint reader fail</option>
                  <option value="New registration first visit">New registration first visit</option>
                  <option value="Other">Other (Custom explanation)</option>
                </select>
              </div>

              {mandatoryReason === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter explicit reason..."
                  value={customReasonText}
                  onChange={(e) => setCustomReasonText(e.target.value)}
                  required
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
              >
                Log Assisted Check-in to Audit Trail
              </button>
            </form>
          )}

          {/* Feedback banner */}
          {checkInResult && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{checkInResult.message}</span>
            </div>
          )}
        </div>

        {/* Live Today's Log Feed */}
        <div className="bg-[#0B0F17] p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="font-bold text-white text-sm flex items-center justify-between">
            <span>Today's Verified Gate Logs</span>
            <span className="text-xs text-slate-400 font-mono">Real-time Feed</span>
          </h3>

          <div className="space-y-2 max-h-[350px] overflow-y-auto no-scrollbar">
            {attendanceLogs.map((log) => (
              <div key={log.id} className="bg-[#141C2B] p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">{log.memberName}</div>
                  <div className="text-[11px] text-slate-400">{log.timestamp} • Method: <strong className="text-cyan-400">{log.method}</strong></div>
                  {log.reason && <div className="text-[10px] text-amber-300 italic mt-0.5">Reason: "{log.reason}"</div>}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Verified
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
