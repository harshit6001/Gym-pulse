import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Search, UserCheck, ShieldAlert, CheckCircle2, Clock, Dumbbell, AlertTriangle, FileText, QrCode, Zap, Check, Monitor, Smartphone, UserPlus, Users, Phone, Calendar, Flame, MessageSquare, Trash2, Plus, Sparkles } from 'lucide-react';

export default function FrontDeskView({ 
  members = [], 
  attendanceLogs = [], 
  onPerformCheckIn, 
  onOpenAddMemberModal,
  specialHolidays = [],
  onAddHoliday,
  onRemoveHoliday,
  onAutoAddSundays,
  activeGymFeatures = []
}) {
  const [deskTab, setDeskTab] = useState('assisted'); // 'assisted', 'members', 'gate_qr', 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [mandatoryReason, setMandatoryReason] = useState('Phone forgotten / battery dead');
  const [customReasonText, setCustomReasonText] = useState('');
  const [checkInResult, setCheckInResult] = useState(null);
  const [membersSearch, setMembersSearch] = useState('');
  const [memberFilterStatus, setMemberFilterStatus] = useState('ALL');
  
  // Rotating Gate Entrance Token
  const [gateToken, setGateToken] = useState(1);
  const [gateCountdown, setGateCountdown] = useState(30);

  // Holiday Form State
  const [holidayDate, setHolidayDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayType, setHolidayType] = useState('SUNDAY');
  const [holidayFeedback, setHolidayFeedback] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayHoliday = specialHolidays.find(h => h.date === todayStr);

  // Get latest entry detail for each member individually (prevents check-in spam in feed)
  const individualMemberLastEntries = React.useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const log of attendanceLogs) {
      const key = log.memberId || log.memberName;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(log);
      }
    }
    return result;
  }, [attendanceLogs]);

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

  // Filter members for Assisted Check-in
  const filteredMembers = searchTerm.trim() === ''
    ? []
    : members.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.phone.includes(searchTerm)
      );

  // Filter members for the Members Directory Tab
  const directoryMembers = members.filter(m => {
    const matchesSearch = membersSearch.trim() === '' ||
      m.name.toLowerCase().includes(membersSearch.toLowerCase()) ||
      m.phone.includes(membersSearch) ||
      (m.membership?.planName || '').toLowerCase().includes(membersSearch.toLowerCase());

    if (!matchesSearch) return false;

    const isExpired = m.membership?.endDate && new Date(m.membership.endDate) < new Date();
    if (memberFilterStatus === 'ACTIVE') return m.status === 'active' && !isExpired;
    if (memberFilterStatus === 'EXPIRED') return isExpired || m.status === 'expired';
    if (memberFilterStatus === 'PAUSED') return m.status === 'paused';
    return true;
  });

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

  const handleDirectCheckIn = (member) => {
    const res = onPerformCheckIn(member.id, 'ASSISTED', '1-Click Front Desk Directory Check-in');
    setCheckInResult(res);
    // Switch to assisted view or show banner
  };

  return (
    <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Front Desk Operations</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
              <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700 font-bold">
                Total Members: <strong className="text-white">{members.length}</strong>
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                Active Members: <strong className="text-emerald-300">{members.filter(m => m.status === 'active').length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Tab switcher: Assisted vs Members Directory vs Gate QR Display */}
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
            <span>Assisted Check-in</span>
          </button>

          {(activeGymFeatures.length === 0 || activeGymFeatures.includes('member_management')) && (
            <button
              type="button"
              onClick={() => setDeskTab('members')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                deskTab === 'members'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Members Roster ({members.length})</span>
            </button>
          )}

          {(activeGymFeatures.length === 0 || activeGymFeatures.includes('qr_attendance')) && (
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
          )}

          {(activeGymFeatures.length === 0 || activeGymFeatures.includes('attendance_logs')) && (
            <button
              type="button"
              onClick={() => setDeskTab('calendar')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                deskTab === 'calendar'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Gym Calendar ({specialHolidays.length})</span>
            </button>
          )}
        </div>

        {/* Register New Member Button */}
        {onOpenAddMemberModal && (activeGymFeatures.length === 0 || activeGymFeatures.includes('member_management')) && (
          <button
            type="button"
            onClick={onOpenAddMemberModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg hover:from-emerald-400 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Member</span>
          </button>
        )}
      </div>

      {/* VIEW 1: LIVE GATE ENTRANCE QR STAND (TABLET / MONITOR DISPLAY) */}
      {deskTab === 'gate_qr' && (activeGymFeatures.length === 0 || activeGymFeatures.includes('qr_attendance')) && (
        <div className="bg-[#0B0F17] p-8 rounded-3xl border border-cyan-500/30 text-center space-y-6 flex flex-col items-center justify-center max-w-xl mx-auto shadow-2xl">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
              Live Entrance Turnstile Stand
            </span>
            <h3 className="text-2xl font-black text-white mt-2">Scan with GymPulse App to Enter</h3>
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

        {/* Live Today's Log Feed - Shows individual last entry per member */}
        <div className="bg-[#0B0F17] p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="font-bold text-white text-sm flex items-center justify-between">
            <span>Today's Verified Gate Logs</span>
            <span className="text-xs text-slate-400 font-mono">Last Entry Per Member ({individualMemberLastEntries.length})</span>
          </h3>

          <div className="space-y-2 max-h-[350px] overflow-y-auto no-scrollbar">
            {individualMemberLastEntries.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No check-ins logged yet today.
              </div>
            ) : (
              individualMemberLastEntries.map((log) => (
                <div key={log.id} className="bg-[#141C2B] p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-200">{log.memberName}</div>
                    <div className="text-[11px] text-slate-400">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''} • Method: <strong className="text-cyan-400">{log.method}</strong></div>
                    {log.reason && <div className="text-[10px] text-amber-300 italic mt-0.5">"{log.reason}"</div>}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Verified
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
      )}

      {/* VIEW 3: REGISTERED MEMBERS DIRECTORY */}
      {deskTab === 'members' && (activeGymFeatures.length === 0 || activeGymFeatures.includes('member_management')) && (
        <div className="space-y-4">
          {/* Search & Filter Header */}
          <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search member name, phone or plan..."
                value={membersSearch}
                onChange={(e) => setMembersSearch(e.target.value)}
                className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMemberFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  memberFilterStatus === 'ALL'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-[#141C2B] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All ({members.length})
              </button>
              <button
                type="button"
                onClick={() => setMemberFilterStatus('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  memberFilterStatus === 'ACTIVE'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-[#141C2B] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setMemberFilterStatus('EXPIRED')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  memberFilterStatus === 'EXPIRED'
                    ? 'bg-rose-500 text-white font-bold'
                    : 'bg-[#141C2B] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Expired
              </button>
              <button
                type="button"
                onClick={() => setMemberFilterStatus('PAUSED')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  memberFilterStatus === 'PAUSED'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-[#141C2B] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Paused
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {checkInResult && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{checkInResult.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setCheckInResult(null)}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Members List Cards */}
          {directoryMembers.length === 0 ? (
            <div className="p-10 text-center space-y-3 bg-[#0B0F17] rounded-2xl border border-slate-800">
              <Users className="w-10 h-10 text-cyan-400 mx-auto" />
              <div className="font-bold text-white text-sm">No Gym Members Found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {membersSearch ? 'No members matched your search filter.' : 'No members registered yet in this gym.'}
              </p>
              {onOpenAddMemberModal && (
                <button
                  type="button"
                  onClick={onOpenAddMemberModal}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register First Member</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {directoryMembers.map((m) => {
                const isExpired = m.membership?.endDate && new Date(m.membership.endDate) < new Date();
                const cleanPhone = (m.phone || '').replace(/\D/g, '').slice(-10);

                return (
                  <div
                    key={m.id}
                    className="bg-[#0B0F17] rounded-2xl p-4 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                  >
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
                            {m.streak?.current > 0 && (
                              <span className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                                <Flame className="w-3 h-3 text-amber-400" />
                                <span>{m.streak.current}d streak</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{m.phone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          isExpired
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : m.status === 'paused'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {isExpired ? 'EXPIRED' : (m.status || 'ACTIVE').toUpperCase()}
                      </span>
                    </div>

                    {/* Plan Details & Validity */}
                    <div className="bg-[#141C2B] rounded-xl p-2.5 text-xs text-slate-300 space-y-1 border border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-[11px]">Membership Plan:</span>
                        <span className="font-bold text-cyan-300">{m.membership?.planName || 'Standard Fitness'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Valid Until:</span>
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

                    {/* Action Buttons: WhatsApp Message + 1-Click Check-In */}
                    <div className="flex items-center gap-2 pt-1">
                      {activeGymFeatures.includes('whatsapp_reminders') && (
                        <a
                          href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${m.name}, greetings from GymPulse Front Desk!`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl transition-all"
                          title="Chat on WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDirectCheckIn(m)}
                        className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Check In Now</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* TAB: GYM CALENDAR & HOLIDAYS (Front Desk View) */}
      {deskTab === 'calendar' && (activeGymFeatures.length === 0 || activeGymFeatures.includes('attendance_logs')) && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <span>Special Gym Calendar, Sundays &amp; Off-Days</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Days scheduled here automatically preserve member workout streaks. Members will see these off-days on their dashboard.
              </p>
            </div>

            {onAutoAddSundays && (
              <button
                type="button"
                onClick={onAutoAddSundays}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>+ Auto-Schedule Sundays (Next 60 Days)</span>
              </button>
            )}
          </div>

          {/* Add Holiday Form */}
          {onAddHoliday && (
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
              setHolidayFeedback(`✅ "${holidayTitle.trim()}" added to Gym Calendar!`);
              setTimeout(() => setHolidayFeedback(''), 3500);
            }} className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Add Gym Off-Day / Sunday</span>
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
                    <option value="HOLIDAY">Festival / Holiday</option>
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
          )}

          {/* Holiday List */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-xs">Scheduled Off-Days ({specialHolidays.length})</h4>
            {specialHolidays.length === 0 ? (
              <div className="p-8 text-center bg-[#0B0F17] rounded-2xl border border-slate-800 text-slate-500 text-xs">
                No special holidays scheduled yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {specialHolidays.map((h) => {
                  const isToday = h.date === todayStr;
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

                      {onRemoveHoliday && (
                        <button
                          type="button"
                          onClick={() => onRemoveHoliday(h.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Remove Holiday"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
