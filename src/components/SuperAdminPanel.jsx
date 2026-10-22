import React, { useState } from 'react';
import {
  ShieldAlert, Lock, Unlock, RefreshCw, CheckCircle2, AlertOctagon,
  Database, Users, DollarSign, X, Dumbbell, UserCheck, Key, Eye, EyeOff,
  Save, Building, Phone, UserPlus, Search, Filter, Shield, AlertTriangle,
  Copy, Check, Edit3, Trash2, Globe, Clock, Sparkles, FileText, ChevronRight, Mail
} from 'lucide-react';
import { 
  generateUUID, 
  updateOwnerPassword, 
  markEmailVerified, 
  resetAllPlatformDataToClean 
} from '../lib/db';
import { apiSendVerification, apiVerifyEmail } from '../lib/api';
import { 
  SUBSCRIPTION_TIERS, 
  SYSTEM_FEATURES, 
  ALL_FEATURE_IDS, 
  normalizePlanKey, 
  getGymActiveFeatures 
} from '../data/subscriptionPlans';
import SubscriptionFeatureToggles from './SubscriptionFeatureToggles';

const STANDARD_BLOCK_REASONS = [
  'Monthly Subscription Unpaid (Overdue). Contact Administrator to restore.',
  'Monthly Software License Expired. Renewal pending.',
  'Scheduled Server Maintenance in progress. Please check back later.',
  'Terms of Service Policy Violation. Account suspended.',
  'CUSTOM'
];

export default function SuperAdminPanel({
  settings,
  gymsList = [],
  onToggleGymBlock,
  onUpdateGym,
  onAddGym,
  onDeleteGym,
  onUpdateMasterPasscode,
  onSeedDemoData,
  onResetAllData,
  onPurgeDummyData,
  auditLogs = [],
  membersCount = 0,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('gyms'); // gyms, onboard, security, logs, maintenance
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, BLOCKED

  // Passcode Management State
  const [currentMasterKeyInput, setCurrentMasterKeyInput] = useState(settings?.superAdminKey || 'Admin@2026Master#');
  const [newMasterKeyInput, setNewMasterKeyInput] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [masterKeyFeedback, setMasterKeyFeedback] = useState('');

  // Quick Block / Edit Reason Modal State
  const [blockModalGym, setBlockModalGym] = useState(null);
  const [selectedBlockReason, setSelectedBlockReason] = useState('Monthly Subscription Unpaid (Overdue). Contact Administrator to restore.');
  const [customReasonText, setCustomReasonText] = useState('');

  // Edit Gym & Subscription Modal State
  const [editingGym, setEditingGym] = useState(null);
  const [editPlanSelect, setEditPlanSelect] = useState('Standard');
  const [editCustomPlanName, setEditCustomPlanName] = useState('');
  const [editingGymFeatures, setEditingGymFeatures] = useState([]);
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  // Reset Password Modal State (quick action)
  const [resetPassModalGym, setResetPassModalGym] = useState(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [resetFeedbackMsg, setResetFeedbackMsg] = useState('');
  const [isResettingPass, setIsResettingPass] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [verifyingGymId, setVerifyingGymId] = useState(null);
  const [verificationNotice, setVerificationNotice] = useState(null);

  // Clean / Purge Dummy Data Modal State
  const [cleanModalGym, setCleanModalGym] = useState(null); // gym object or 'ALL'
  const [cleanMode, setCleanMode] = useState('test_only'); // 'test_only', 'logs_only', 'all_gym_data'
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanFeedbackMsg, setCleanFeedbackMsg] = useState('');
  const [maintenanceSelectedGymId, setMaintenanceSelectedGymId] = useState('');

  // Onboard New Gym Form State
  const [newGymName, setNewGymName] = useState('');
  const [newGymLocation, setNewGymLocation] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [newGymPlan, setNewGymPlan] = useState('Standard');
  const [newCustomPlan, setNewCustomPlan] = useState('');
  const [newMonthlyFee, setNewMonthlyFee] = useState('4499');
  const [newGymFeatures, setNewGymFeatures] = useState([...SUBSCRIPTION_TIERS.Standard.defaultFeatures]);
  const [onboardFeedback, setOnboardFeedback] = useState('');

  // KPI Computations
  const totalGyms = gymsList.length;
  const activeGyms = gymsList.filter(g => g.status === 'ACTIVE').length;
  const blockedGyms = gymsList.filter(g => g.status === 'BLOCKED' || g.status === 'MAINTENANCE').length;
  const totalEstimatedMembers = gymsList.reduce((acc, g) => acc + (Number(g.membersCount) || 0), 0);
  const totalMonthlyMRR = gymsList.reduce((acc, g) => acc + (Number(g.monthlyFee) || 0), 0);

  // Filtered Gyms List
  const filteredGyms = gymsList.filter(g => {
    const matchesQuery =
      (g.gymName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.ownerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.ownerPhone || '').includes(searchQuery) ||
      (g.plan || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ? true :
      statusFilter === 'ACTIVE' ? g.status === 'ACTIVE' :
      g.status === 'BLOCKED' || g.status === 'MAINTENANCE';

    return matchesQuery && matchesStatus;
  });

  // 1-Click Block / Unblock Quick Handler
  const handleQuickStatusClick = (gym) => {
    if (gym.status === 'ACTIVE') {
      setBlockModalGym(gym);
      setSelectedBlockReason(gym.blockReason || 'Monthly Subscription Unpaid (Overdue). Contact Administrator to restore.');
      setCustomReasonText('');
    } else {
      if (onToggleGymBlock) {
        onToggleGymBlock(gym.id, 'ACTIVE', '');
      }
    }
  };

  // Edit reason on an already blocked gym
  const handleEditBlockReason = (gym) => {
    setBlockModalGym(gym);
    const existingReason = gym.blockReason || '';
    if (STANDARD_BLOCK_REASONS.includes(existingReason)) {
      setSelectedBlockReason(existingReason);
      setCustomReasonText('');
    } else if (existingReason) {
      setSelectedBlockReason('CUSTOM');
      setCustomReasonText(existingReason);
    } else {
      setSelectedBlockReason('Monthly Subscription Unpaid (Overdue). Contact Administrator to restore.');
      setCustomReasonText('');
    }
  };

  const handleConfirmBlock = (e) => {
    e.preventDefault();
    if (!blockModalGym) return;
    const finalReason = selectedBlockReason === 'CUSTOM' ? customReasonText : selectedBlockReason;
    if (onToggleGymBlock) {
      onToggleGymBlock(blockModalGym.id, 'BLOCKED', finalReason || 'Access restricted by Super Admin.');
    }
    setBlockModalGym(null);
  };

  // Open Edit Gym Modal
  const handleOpenEditGym = (gym) => {
    const planKey = normalizePlanKey(gym.plan);
    const tier = SUBSCRIPTION_TIERS[planKey] || SUBSCRIPTION_TIERS.Standard;
    const initialFee = gym.monthlyFee !== undefined ? gym.monthlyFee : (tier.price || 4499);
    const activeFeatures = getGymActiveFeatures(gym);

    setEditingGym({
      ...gym,
      monthlyFee: initialFee,
      plan: gym.plan || tier.name,
      status: gym.status || 'ACTIVE',
      blockReason: gym.blockReason || ''
    });
    setResetPasswordInput('');
    setEditPlanSelect(planKey);
    setEditCustomPlanName(planKey === 'Custom' ? (gym.plan || '') : '');
    setEditingGymFeatures([...activeFeatures]);
  };

  const handlePlanChangeInEdit = (planKey) => {
    setEditPlanSelect(planKey);
    const tier = SUBSCRIPTION_TIERS[planKey];
    if (planKey !== 'Custom' && tier) {
      setEditingGym(prev => ({
        ...prev,
        plan: tier.name,
        monthlyFee: tier.price
      }));
      setEditingGymFeatures([...tier.defaultFeatures]);
    } else {
      setEditingGym(prev => ({
        ...prev,
        plan: 'Custom'
      }));
    }
  };

  const handleToggleEditFeature = (featureId) => {
    setEditingGymFeatures(prev =>
      prev.includes(featureId) ? prev.filter(id => id !== featureId) : [...prev, featureId]
    );
  };

  const handleToggleAllEditFeatures = (enableAll) => {
    setEditingGymFeatures(enableAll ? [...ALL_FEATURE_IDS] : []);
  };

  const handleResetEditFeaturesToDefaults = () => {
    const tier = SUBSCRIPTION_TIERS[editPlanSelect] || SUBSCRIPTION_TIERS.Standard;
    setEditingGymFeatures([...tier.defaultFeatures]);
  };

  const handlePlanChangeInOnboard = (planKey) => {
    setNewGymPlan(planKey);
    const tier = SUBSCRIPTION_TIERS[planKey];
    if (planKey !== 'Custom' && tier) {
      setNewMonthlyFee(String(tier.price));
      setNewGymFeatures([...tier.defaultFeatures]);
    }
  };

  const handleToggleNewGymFeature = (featureId) => {
    setNewGymFeatures(prev =>
      prev.includes(featureId) ? prev.filter(id => id !== featureId) : [...prev, featureId]
    );
  };

  const handleToggleAllNewGymFeatures = (enableAll) => {
    setNewGymFeatures(enableAll ? [...ALL_FEATURE_IDS] : []);
  };

  const handleResetNewGymFeaturesToDefaults = () => {
    const tier = SUBSCRIPTION_TIERS[newGymPlan] || SUBSCRIPTION_TIERS.Standard;
    setNewGymFeatures([...tier.defaultFeatures]);
  };

  // Edit Gym & Subscription Submit
  // Edit Gym & Subscription Submit
  const handleEditGymSubmit = async (e) => {
    e.preventDefault();
    if (!editingGym) return;
    const cleanPhone = (editingGym.ownerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      alert('Owner mobile number must be exactly 10 digits.');
      return;
    }

    const cleanPass = resetPasswordInput.trim();
    if (cleanPass && cleanPass.length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }

    const cleanEmail = (editingGym.ownerEmail || '').trim().toLowerCase();

    const finalPlan = editPlanSelect === 'Custom'
      ? (editCustomPlanName.trim() || 'Custom Plan')
      : editPlanSelect;

    setIsSavingEdit(true);

    const updated = {
      ...editingGym,
      ownerPhone: cleanPhone,
      ownerEmail: cleanEmail || null,
      emailVerified: editingGym.emailVerified === true,
      plan: finalPlan,
      monthlyFee: Number(editingGym.monthlyFee) || (SUBSCRIPTION_TIERS[editPlanSelect]?.price || 4499),
      features: editingGymFeatures,
      settings: {
        ...(editingGym.settings || {}),
        features: editingGymFeatures,
        emailVerified: editingGym.emailVerified === true,
        ownerEmail: cleanEmail || null
      },
      status: editingGym.status || 'ACTIVE',
      blockReason: editingGym.status === 'BLOCKED' ? (editingGym.blockReason || 'Access restricted by Super Admin.') : ''
    };

    if (cleanPass) {
      updated.ownerPassword = cleanPass;
      updated.tempPassword = cleanPass;
      if (!updated.settings) updated.settings = {};
      updated.settings.ownerPassword = cleanPass;
      updated.settings.tempPassword = cleanPass;
      await updateOwnerPassword(editingGym.id, cleanPass);
    }

    if (onUpdateGym) {
      await onUpdateGym(updated);
    }
    setIsSavingEdit(false);
    setEditingGym(null);
    setResetPasswordInput('');
  };

  // Onboard New Gym Submit
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!newGymName.trim() || !newOwnerName.trim() || !newOwnerPhone.trim() || !newOwnerPassword.trim()) {
      alert('Please fill in all mandatory fields.');
      return;
    }
    const cleanOwnerPhone = newOwnerPhone.replace(/\D/g, '');
    if (cleanOwnerPhone.length !== 10) {
      alert('Owner mobile number must be exactly 10 digits.');
      return;
    }

    const cleanPassword = newOwnerPassword.trim();
    if (cleanPassword.length < 4) {
      alert('Owner password must be at least 4 characters long.');
      return;
    }

    const cleanEmail = newOwnerEmail.trim().toLowerCase();

    const finalPlan = newGymPlan === 'Custom'
      ? (newCustomPlan.trim() || 'Custom Plan')
      : newGymPlan;

    const newGymId = generateUUID();

    const newGymObj = {
      id: newGymId,
      gymName: newGymName.trim(),
      location: newGymLocation.trim() || 'Indore, MP',
      ownerName: newOwnerName.trim(),
      ownerPhone: cleanOwnerPhone,
      ownerEmail: cleanEmail || null,
      ownerPassword: cleanPassword,
      tempPassword: cleanPassword,
      status: 'ACTIVE',
      blockReason: '',
      plan: finalPlan,
      monthlyFee: Number(newMonthlyFee) || (SUBSCRIPTION_TIERS[newGymPlan]?.price || 4499),
      features: newGymFeatures,
      settings: {
        gymName: newGymName.trim(),
        location: newGymLocation.trim() || 'Indore, MP',
        ownerName: newOwnerName.trim(),
        ownerPhone: cleanOwnerPhone,
        ownerEmail: cleanEmail || null,
        ownerPassword: cleanPassword,
        tempPassword: cleanPassword,
        plan: finalPlan,
        monthlyFee: Number(newMonthlyFee) || (SUBSCRIPTION_TIERS[newGymPlan]?.price || 4499),
        features: newGymFeatures,
        emailVerified: false,
        ownerCredentials: {
          password: cleanPassword
        }
      },
      membersCount: 0,
      activeSince: new Date().toISOString().split('T')[0],
      lastLogin: 'Never',
      emailVerified: false
    };

    setIsOnboarding(true);
    setOnboardFeedback('⏳ Provisioning new gym license in live database...');

    try {
      let res = null;
      if (onAddGym) {
        res = await onAddGym(newGymObj);
      }
      if (res && res.error) {
        throw new Error(res.error.message || 'Database error while saving new gym.');
      }

      await updateOwnerPassword(newGymId, cleanPassword);

      // Auto dispatch verification code if owner email provided
      if (cleanEmail) {
        apiSendVerification({
          memberId: newGymId,
          role: 'owner',
          email: cleanEmail,
          name: newOwnerName.trim(),
          phone: cleanOwnerPhone
        }).catch(err => console.error('Failed to dispatch owner auto-verification code:', err));
      }

      setNewGymName('');
      setNewGymLocation('');
      setNewOwnerName('');
      setNewOwnerPhone('');
      setNewOwnerEmail('');
      setNewOwnerPassword('');
      setIsOnboarding(false);

      const msg = cleanEmail
        ? `✅ Successfully onboarded "${newGymObj.gymName}"! Unique verification code sent to ${cleanEmail}.`
        : `✅ Successfully onboarded "${newGymObj.gymName}" live in database! Day-1 credentials active.`;
      
      setOnboardFeedback(msg);
      setVerificationNotice(msg);

      // Switch to gyms directory tab so the new gym card is visible immediately
      setTimeout(() => {
        setOnboardFeedback('');
        setActiveTab('gyms');
      }, 700);
    } catch (err) {
      console.error('Onboard error:', err);
      setIsOnboarding(false);
      setOnboardFeedback(`❌ Onboarding error: ${err.message || 'Failed to save to database'}`);
    }
  };

  // Execute Purge of Dummy / Fake Data
  const handleExecutePurge = async () => {
    if (!cleanModalGym) return;
    setIsCleaning(true);
    setCleanFeedbackMsg('');
    try {
      const targetId = cleanModalGym === 'ALL' ? 'ALL' : cleanModalGym.id;
      if (onPurgeDummyData) {
        const res = await onPurgeDummyData(targetId, cleanMode);
        const count = res?.deletedMembersCount || 0;
        const logs = res?.deletedLogsCount || 0;
        setCleanFeedbackMsg(`✅ Purge successful! Cleaned ${count} dummy/test accounts and wiped test logs.`);
        setTimeout(() => {
          setIsCleaning(false);
          setCleanFeedbackMsg('');
          setCleanModalGym(null);
        }, 2200);
      }
    } catch (err) {
      console.error('Error purging dummy data:', err);
      setCleanFeedbackMsg(`❌ Purge error: ${err.message || 'Operation failed'}`);
      setIsCleaning(false);
    }
  };

  // Quick Reset Password Submit (Backend Synced)
  const handleQuickResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const cleanPass = (newTempPassword || '').trim();
    if (!resetPassModalGym || !cleanPass) return;
    if (cleanPass.length < 4) {
      setResetFeedbackMsg('❌ Password must be at least 4 characters long.');
      return;
    }

    setIsResettingPass(true);
    setResetFeedbackMsg('⏳ Updating password in backend database...');

    try {
      const res = await updateOwnerPassword(resetPassModalGym.id, cleanPass);
      if (res && res.error) {
        setResetFeedbackMsg(`❌ Failed to update password in backend: ${res.error}`);
        setIsResettingPass(false);
        return;
      }

      const updated = {
        ...resetPassModalGym,
        ownerPassword: cleanPass,
        tempPassword: cleanPass,
        settings: {
          ...(resetPassModalGym.settings || {}),
          ownerPassword: cleanPass,
          tempPassword: cleanPass,
          ownerCredentials: {
            ...((resetPassModalGym.settings || {}).ownerCredentials || {}),
            password: cleanPass
          }
        }
      };

      if (onUpdateGym) {
        await onUpdateGym(updated);
      }

      setResetFeedbackMsg('✅ Password successfully updated in backend database! Share with owner for immediate login.');
      setTimeout(() => {
        setIsResettingPass(false);
        setResetFeedbackMsg('');
        setResetPassModalGym(null);
        setNewTempPassword('');
      }, 2000);
    } catch (err) {
      setResetFeedbackMsg(`❌ Error updating password: ${err.message || 'Operation failed'}`);
      setIsResettingPass(false);
    }
  };

  // Manual 1-Click Verification for Gym Owner Email (Super Admin Override)
  const handleManualVerifyGymEmail = async (gym) => {
    setVerifyingGymId(gym.id);
    try {
      await markEmailVerified({ id: gym.id, role: 'owner' });
      const updated = {
        ...gym,
        emailVerified: true,
        verificationToken: null,
        settings: {
          ...(gym.settings || {}),
          emailVerified: true,
          verificationToken: null
        }
      };
      if (onUpdateGym) await onUpdateGym(updated);
      setVerificationNotice(`✅ Email for "${gym.gymName}" marked as Verified in backend database.`);
      setTimeout(() => setVerificationNotice(null), 3500);
    } catch (err) {
      alert(`❌ Error verifying email: ${err.message}`);
    } finally {
      setVerifyingGymId(null);
    }
  };

  // Dispatch Verification Code to Gym Owner
  const handleSendGymVerificationCode = async (gym) => {
    const email = (gym.ownerEmail || '').trim();
    if (!email) {
      alert(`No email address configured for "${gym.gymName}". Please click 'Edit Details' to set an owner email address first.`);
      return;
    }
    setVerifyingGymId(gym.id);
    try {
      const res = await apiSendVerification({
        memberId: gym.id,
        role: 'owner',
        email,
        phone: gym.ownerPhone,
        name: gym.ownerName
      });
      if (res?.success) {
        setVerificationNotice(`✅ Verification code ${res.token ? `(${res.token})` : ''} dispatched to ${email}! Token saved to database.`);
        setTimeout(() => setVerificationNotice(null), 4500);
      } else {
        alert(`❌ Could not send verification code: ${res?.error || 'Operation failed'}`);
      }
    } catch (err) {
      alert(`❌ Error sending code: ${err.message}`);
    } finally {
      setVerifyingGymId(null);
    }
  };

  // Save Master Passcode
  const handleSaveMasterKey = (e) => {
    e.preventDefault();
    if (!newMasterKeyInput.trim() || newMasterKeyInput.trim().length < 4) {
      setMasterKeyFeedback('❌ Passcode must be at least 4 characters long.');
      return;
    }
    if (onUpdateMasterPasscode) {
      onUpdateMasterPasscode(newMasterKeyInput.trim());
    }
    setCurrentMasterKeyInput(newMasterKeyInput.trim());
    setNewMasterKeyInput('');
    setMasterKeyFeedback('✅ Master Passcode Updated Successfully!');
    setTimeout(() => setMasterKeyFeedback(''), 3000);
  };

  return (
    <div className={onClose ? "fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-2 sm:p-4 overflow-y-auto" : "w-full"}>
      <div className="bg-[#141C2B] border border-slate-800 rounded-2xl sm:rounded-3xl max-w-5xl w-full p-3 sm:p-6 shadow-2xl space-y-5 sm:space-y-6 relative max-h-[94vh] overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
        
        {/* Close Button if Modal */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors z-10"
            title="Close Admin Panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-gradient-to-tr from-rose-500/20 to-amber-500/20 rounded-2xl text-rose-400 border border-rose-500/30 shadow-inner shrink-0">
              <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight truncate">Super Admin Command Center</h2>
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Root Admin
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Multi-Tenant Software Provider Hub • Subscription Plans, Charges &amp; License Access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('onboard')}
              className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Onboard New Gym</span>
            </button>
          </div>
        </div>

        {/* Platform KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-[#0B0F17] p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Total Gyms</span>
              <Building className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">{totalGyms}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Managed accounts</div>
          </div>

          <div className="bg-[#0B0F17] p-3 rounded-2xl border border-emerald-500/20">
            <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold">
              <span>Active Gyms</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1">{activeGyms}</div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">Operating normally</div>
          </div>

          <div className="bg-[#0B0F17] p-3 rounded-2xl border border-rose-500/20">
            <div className="flex items-center justify-between text-rose-400 text-[11px] font-bold">
              <span>Blocked Gyms</span>
              <Lock className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-400 mt-1">{blockedGyms}</div>
            <div className="text-[10px] text-rose-500/80 mt-0.5">Restricted access</div>
          </div>

          <div className="bg-[#0B0F17] p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-amber-400 text-[11px] font-bold">
              <span>Platform Members</span>
              <Users className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">{totalEstimatedMembers || membersCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Active end users</div>
          </div>

          <div className="bg-[#0B0F17] p-3 rounded-2xl border border-purple-500/30 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-purple-400 text-[11px] font-bold">
              <span>Software MRR</span>
              <DollarSign className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-purple-300 mt-1">₹{totalMonthlyMRR.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Monthly SaaS Revenue</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'gyms', label: `All Gyms & Subscriptions (${gymsList.length})`, icon: Building },
            { id: 'onboard', label: 'Onboard New Gym', icon: UserPlus },
            { id: 'security', label: 'Passcode & Secret Access', icon: Key },
            { id: 'logs', label: `Audit Logs (${auditLogs.length})`, icon: FileText },
            { id: 'maintenance', label: 'Database & Clean Dummy Data', icon: RefreshCw },
          ].map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: ALL GYMS & OWNERS MASTER DIRECTORY ── */}
        {activeTab === 'gyms' && (
          <div className="space-y-4">
            
            {/* Search & Status Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0B0F17] p-3 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by Gym, Owner, Phone, City, Plan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold no-scrollbar">
                {['ALL', 'ACTIVE', 'BLOCKED'].map(filterKey => (
                  <button
                    key={filterKey}
                    onClick={() => setStatusFilter(filterKey)}
                    className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
                      statusFilter === filterKey
                        ? filterKey === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black'
                        : filterKey === 'BLOCKED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black'
                        : 'bg-slate-700 text-white font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {filterKey === 'ALL' ? 'All Gyms' : filterKey === 'ACTIVE' ? '🟢 Active' : '🔴 Blocked'}
                  </button>
                ))}
              </div>
            </div>

            {/* Verification & Action Notice */}
            {verificationNotice && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{verificationNotice}</span>
              </div>
            )}

            {/* Gyms Roster Cards */}
            {filteredGyms.length === 0 ? (
              <div className="p-8 sm:p-12 text-center bg-[#0B0F17] rounded-2xl border border-slate-800 space-y-2">
                <Building className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="font-bold text-slate-300 text-sm">No gyms matched your filter criteria</div>
                <p className="text-xs text-slate-500">Try clearing the search query or onboard a new gym above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGyms.map((gym) => {
                  const isBlocked = gym.status === 'BLOCKED' || gym.status === 'MAINTENANCE';

                  return (
                    <div
                      key={gym.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isBlocked
                          ? 'bg-rose-500/5 border-rose-500/30'
                          : 'bg-[#0B0F17] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* Left: Gym & Owner Info */}
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-white text-base truncate">{gym.gymName}</h3>
                            
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              isBlocked
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                              {isBlocked ? <Lock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                              <span>{gym.status}</span>
                            </span>

                            {/* Subscription Plan & Amount Badge */}
                            {(() => {
                              const tierKey = normalizePlanKey(gym.plan);
                              const tier = SUBSCRIPTION_TIERS[tierKey] || SUBSCRIPTION_TIERS.Custom;
                              const activeFeats = getGymActiveFeatures(gym);
                              return (
                                <>
                                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold border flex items-center gap-1 ${tier.badgeColor}`}>
                                    <span>{tier.name}</span>
                                    <span className="opacity-70 font-normal">({tier.badge})</span>
                                  </span>

                                  <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                                    ₹{(Number(gym.monthlyFee) || tier.price || 4499).toLocaleString('en-IN')}/mo
                                  </span>

                                  <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold" title={`${activeFeats.length} of ${SYSTEM_FEATURES.length} features active`}>
                                    {activeFeats.length}/{SYSTEM_FEATURES.length} Features
                                  </span>
                                </>
                              );
                            })()}
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{gym.location || 'Location Not Set'}</span>
                            </span>
                            <span>•</span>
                            <span>Registered Members: <strong className="text-emerald-400">{gym.membersCount || 0}</strong></span>
                            <span>•</span>
                            <span>Since: <strong className="text-slate-300">{gym.activeSince || '2026'}</strong></span>
                          </div>

                          {/* Owner Credentials & Verification Box */}
                          <div className="bg-[#141C2B] p-3 rounded-xl border border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-3 mt-2">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                              <div>
                                <span className="text-slate-400 text-[11px]">Owner: </span>
                                <strong className="text-white">{gym.ownerName}</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-400 text-[11px]">Login Phone: </span>
                              <strong className="text-slate-200 font-mono">{gym.ownerPhone}</strong>
                            </div>

                            {/* Owner Email & Verification Badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-400 text-[11px]">Email: </span>
                              <span className="text-white font-mono text-[11px]">
                                {gym.ownerEmail ? gym.ownerEmail : <span className="text-slate-500 italic">None</span>}
                              </span>

                              {gym.emailVerified ? (
                                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Verified</span>
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    <span>Unverified</span>
                                  </span>
                                  <button
                                    type="button"
                                    disabled={verifyingGymId === gym.id}
                                    onClick={() => handleManualVerifyGymEmail(gym)}
                                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 transition-colors disabled:opacity-50"
                                    title="Mark email verified in backend database immediately"
                                  >
                                    {verifyingGymId === gym.id ? 'Verifying...' : 'Verify Now'}
                                  </button>
                                  {gym.ownerEmail && (
                                    <button
                                      type="button"
                                      disabled={verifyingGymId === gym.id}
                                      onClick={() => handleSendGymVerificationCode(gym)}
                                      className="text-[10px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30 transition-colors disabled:opacity-50"
                                      title="Dispatch verification code to owner email"
                                    >
                                      Send Code
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Password & Quick Reset */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-400 text-[11px]">Password: </span>
                              <span className="text-[10px] font-mono text-emerald-400 bg-[#0B0F17] px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
                                <Lock className="w-3 h-3 text-emerald-400" />
                                <span>Encrypted</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setResetPassModalGym(gym);
                                  setNewTempPassword('');
                                }}
                                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 flex items-center gap-1 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Reset</span>
                              </button>
                            </div>
                          </div>

                          {/* Block Reason Warning if blocked */}
                          {isBlocked && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span className="truncate"><strong>Active Suspension Reason:</strong> {gym.blockReason || 'Access suspended by Super Admin.'}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleEditBlockReason(gym)}
                                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-lg font-bold text-[11px] shrink-0 self-start sm:self-auto flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit Reason</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Right: 1-Click Action Controls */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                          
                          {/* 1-CLICK BLOCK / UNBLOCK TOGGLE BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleQuickStatusClick(gym)}
                            className={`w-full sm:w-48 py-2.5 px-4 rounded-xl font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                              isBlocked
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 shadow-emerald-950/40'
                                : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 text-white shadow-rose-950/40'
                            }`}
                          >
                            {isBlocked ? (
                              <>
                                <Unlock className="w-4 h-4" />
                                <span>1-Click Restore / Unblock</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4" />
                                <span>1-Click Revoke / Block</span>
                              </>
                            )}
                          </button>

                          {/* Controls Row: Edit Plan & Charge, Clean Dummy Data, Delete */}
                          <div className="flex items-center gap-2 w-full sm:w-48">
                            <button
                              type="button"
                              onClick={() => handleOpenEditGym(gym)}
                              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-[11px] font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                              title="Edit Gym Subscription Type & Monthly Charge"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Edit Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCleanModalGym(gym);
                                setCleanMode('test_only');
                                setCleanFeedbackMsg('');
                              }}
                              title="Remove Dummy / Fake Data & Entries for this Gym"
                              className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>

                            {gymsList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete gym "${gym.gymName}"? All its data will be removed from the registry.`)) {
                                    if (onDeleteGym) onDeleteGym(gym.id);
                                  }
                                }}
                                title="Delete Gym Account"
                                className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ── TAB 2: ONBOARD NEW GYM & OWNER ── */}
        {activeTab === 'onboard' && (
          <form onSubmit={handleOnboardSubmit} className="bg-[#0B0F17] p-4 sm:p-6 rounded-3xl border border-emerald-500/30 space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Onboard &amp; Register New Gym Client</h3>
                  <p className="text-xs text-slate-400">Directly provisions to database. Owner can immediately login using issued credentials.</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30 self-start sm:self-auto">
                Direct Cloud Sync
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Gym / Business Brand Name *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={newGymName}
                    onChange={(e) => setNewGymName(e.target.value)}
                    placeholder="e.g. Gold's Gym Palasia"
                    required
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Gym Location / Address</label>
                <input
                  type="text"
                  value={newGymLocation}
                  onChange={(e) => setNewGymLocation(e.target.value)}
                  placeholder="e.g. Palasia Square, Indore, MP"
                  className="w-full bg-[#141C2B] border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Owner Full Name *</label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="e.g. Rajiv Kapoor"
                    required
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Owner Mobile / Login Phone *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit phone number"
                    maxLength={10}
                    minLength={10}
                    required
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Owner Registered Email (For Verification &amp; Recovery)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    placeholder="e.g. owner@gymbrand.com"
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Initial Temporary Password * (Day 1 Passcode)</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={newOwnerPassword}
                    onChange={(e) => setNewOwnerPassword(e.target.value)}
                    placeholder="Set temporary initial password"
                    required
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-500">The owner can change this password after login.</span>
              </div>

              {/* Subscription Plan Tier Selector (Starter ₹2499, Standard ₹4499, Pro ₹6999, Custom) */}
              <div className="space-y-2 sm:col-span-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <span>Gym Subscription Plan &amp; Tier *</span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">(3 Major Plans + Custom)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Selected: <strong className="text-white">{SUBSCRIPTION_TIERS[newGymPlan]?.displayName || newGymPlan}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.keys(SUBSCRIPTION_TIERS).map((tierKey) => {
                    const tier = SUBSCRIPTION_TIERS[tierKey];
                    const isSelected = newGymPlan === tierKey;
                    return (
                      <button
                        key={tierKey}
                        type="button"
                        onClick={() => handlePlanChangeInOnboard(tierKey)}
                        className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                            : 'bg-[#141C2B] border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-extrabold text-white text-xs">{tier.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${tier.badgeColor}`}>
                              {tier.badge}
                            </span>
                          </div>
                          <div className="text-base font-black text-emerald-400 font-mono">
                            {tier.price ? `₹${tier.price.toLocaleString('en-IN')}` : 'Custom'}
                            {tier.price && <span className="text-[10px] text-slate-400 font-normal">/mo</span>}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                            {tier.description}
                          </p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                          <span className={isSelected ? 'text-emerald-300 font-bold' : 'text-slate-500'}>
                            {tier.defaultFeatures.length} Modules
                          </span>
                          {isSelected ? (
                            <span className="flex items-center gap-0.5 text-emerald-400 font-black">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          ) : (
                            <span className="text-slate-500 hover:text-slate-400">Select</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {newGymPlan === 'Custom' && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-amber-300">Custom Subscription Plan Tier Name *</label>
                    <input
                      type="text"
                      value={newCustomPlan}
                      onChange={(e) => setNewCustomPlan(e.target.value)}
                      placeholder="e.g. Corporate Elite Multi-Branch Plan..."
                      required
                      className="w-full bg-[#141C2B] border border-amber-500/40 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}
              </div>

              {/* Subscription Charge Amount Input */}
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300">Monthly Subscription Fee / Charge (₹) *</label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {[2499, 4499, 6999].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setNewMonthlyFee(String(amt))}
                        className={`px-2.5 py-1 rounded-lg border font-bold transition-colors cursor-pointer ${
                          newMonthlyFee === String(amt)
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        ₹{amt.toLocaleString('en-IN')}/mo
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newMonthlyFee}
                    onChange={(e) => setNewMonthlyFee(e.target.value)}
                    placeholder="Enter monthly subscription fee (e.g. 2499, 4499, 6999)"
                    required
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-8 pr-3 py-3 text-xs text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Feature Modules & Toggles */}
              <div className="sm:col-span-2">
                <SubscriptionFeatureToggles
                  plan={newGymPlan}
                  activeFeatures={newGymFeatures}
                  onToggleFeature={handleToggleNewGymFeature}
                  onToggleAll={handleToggleAllNewGymFeatures}
                  onResetToDefaults={handleResetNewGymFeaturesToDefaults}
                />
              </div>
            </div>

            {onboardFeedback && (
              <div className={`p-3 rounded-xl font-bold text-xs flex items-center gap-2 ${
                onboardFeedback.startsWith('❌')
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              }`}>
                {onboardFeedback.startsWith('❌') ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{onboardFeedback}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isOnboarding}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isOnboarding ? 'Provisioning Gym in Live Database...' : 'Provision Gym, Set Subscription & Issue Day-1 Credentials'}</span>
            </button>
          </form>
        )}

        {/* ── TAB 3: ADMIN MASTER PASSCODE & URL ACCESS ── */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            <form onSubmit={handleSaveMasterKey} className="bg-[#0B0F17] p-4 sm:p-6 rounded-3xl border border-rose-500/30 space-y-5 text-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Super Admin Master Passcode</h3>
                  <p className="text-xs text-slate-400">Manage the secret key used to access this Super Admin Center.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Current Active Master Key:</label>
                  <div className="p-3 bg-[#141C2B] rounded-xl border border-slate-800 text-amber-400 font-mono font-black text-sm flex items-center justify-between">
                    <span>{showMasterKey ? currentMasterKeyInput : '••••••••'}</span>
                    <button
                      type="button"
                      onClick={() => setShowMasterKey(!showMasterKey)}
                      className="text-slate-400 hover:text-slate-200 text-xs font-sans font-bold"
                    >
                      {showMasterKey ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Set New Master Passcode:</label>
                  <input
                    type="password"
                    value={newMasterKeyInput}
                    onChange={(e) => setNewMasterKeyInput(e.target.value)}
                    placeholder="Enter new secret passcode (min 4 chars)..."
                    required
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {masterKeyFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  masterKeyFeedback.includes('✅')
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}>
                  {masterKeyFeedback}
                </div>
              )}

              <button
                type="submit"
                className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save New Master Passcode</span>
              </button>
            </form>

            <div className="bg-[#0B0F17] p-4 sm:p-5 rounded-2xl border border-slate-800 text-xs space-y-3">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>How to Open Admin Panel:</span>
              </h4>
              <ul className="list-disc pl-5 space-y-2 text-slate-400 text-[11px] leading-relaxed">
                <li>
                  <strong>URL Direct Route:</strong> Add <code className="text-amber-300 bg-slate-800 px-2 py-0.5 rounded font-mono font-bold">/#admin</code> to your website URL (e.g. <span className="text-slate-300">https://your-gym-app.vercel.app/#admin</span>). It will immediately prompt for your master password and open this center!
                </li>
                <li>
                  <strong>Keyboard Shortcut:</strong> Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-amber-300">Ctrl + Shift + A</kbd> (or <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-amber-300">Cmd + Shift + A</kbd>) anywhere.
                </li>
                <li>
                  <strong>Secret 5-Tap Gesture:</strong> Tap the Gym Logo 5 times quickly on the login screen or top navbar.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ── TAB 4: AUDIT LOGS HISTORY ── */}
        {activeTab === 'logs' && (
          <div className="bg-[#0B0F17] p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-3 text-xs">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Real-Time Security &amp; Access Logs</span>
            </h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-slate-500 italic py-4 text-center">No log entries found.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-[#141C2B] rounded-xl border border-slate-800 flex items-center justify-between text-xs gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-rose-400 font-mono text-[10px] uppercase bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          {log.action}
                        </span>
                        <strong className="text-white truncate">{log.actor}</strong>
                      </div>
                      <p className="text-slate-400 text-[11px] truncate">{log.details}</p>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono shrink-0 whitespace-nowrap">
                      {typeof log.timestamp === 'string' && log.timestamp.includes('T')
                        ? new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : log.timestamp}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: DATABASE MAINTENANCE & CLEAN DUMMY DATA ── */}
        {activeTab === 'maintenance' && (
          <div className="bg-[#0B0F17] p-4 sm:p-6 rounded-3xl border border-slate-800 space-y-5 text-xs">
            <div>
              <h3 className="font-extrabold text-white text-base">Database &amp; Platform Maintenance</h3>
              <p className="text-xs text-slate-400 mt-1">Clean fake/dummy test entries, manage cloud synchronization, and reset environments safely.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Remove Dummy & Fake Data (Global or Selected Gym) */}
              <div className="p-4 sm:p-5 bg-[#141C2B] rounded-2xl border border-purple-500/40 space-y-3">
                <div className="font-black text-purple-300 flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Remove Dummy / Fake Data / Entries</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Purges test members (matching 'test', 'demo', 'sample', 'dummy', 'fake' or test phone numbers) and test attendance logs. Preserves real owner accounts and subscriptions!
                </p>

                <div className="space-y-2 pt-1">
                  <label className="text-[11px] text-slate-400 font-bold">Select Scope to Clean:</label>
                  <select
                    value={maintenanceSelectedGymId}
                    onChange={(e) => setMaintenanceSelectedGymId(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">🌐 Platform-Wide (All Gyms)</option>
                    {gymsList.map(g => (
                      <option key={g.id} value={g.id}>🏢 {g.gymName} ({g.membersCount || 0} members)</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const target = maintenanceSelectedGymId
                        ? gymsList.find(g => g.id === maintenanceSelectedGymId) || 'ALL'
                        : 'ALL';
                      setCleanModalGym(target);
                      setCleanMode('test_only');
                      setCleanFeedbackMsg('');
                    }}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 transition-transform active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Open Dummy Data Cleaner</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Purge Local Browser Cache */}
              <div className="p-4 sm:p-5 bg-[#141C2B] rounded-2xl border border-sky-500/30 space-y-3">
                <div className="font-black text-sky-300 flex items-center gap-2 text-sm">
                  <RefreshCw className="w-4 h-4 text-sky-400" />
                  <span>Purge Local Browser Cache</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Clears offline local storage cache and forces an immediate reload from live Supabase cloud database.
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    className="w-full py-2.5 px-4 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Clear Cache &amp; Reload Cloud State</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Total Database Reset (Caution) */}
              <div className="p-4 sm:p-5 bg-[#141C2B] rounded-2xl border border-rose-500/30 space-y-3 md:col-span-2">
                <div className="font-black text-rose-300 flex items-center gap-2 text-sm">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Total Platform Wipe to Production Clean State</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cleans all member rosters, check-in history, and orders across the entire database to an empty production state ready for live commercial customers.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('CRITICAL WARNING: This will WIPE ALL members, attendance logs, orders, and dummy records across all gyms from both Supabase live database and storage to an empty production state. Proceed?')) {
                      if (onResetAllData) await onResetAllData();
                      alert('Platform database wiped cleanly to production empty state. All dummy data removed.');
                    }
                  }}
                  className="w-full sm:w-auto py-2.5 px-5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset All Platform Data to Clean Empty State</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ── MODAL: 1-CLICK QUICK BLOCK / EDIT REASON ── */}
        {blockModalGym && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <form onSubmit={handleConfirmBlock} className="bg-[#141C2B] border border-rose-500/40 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setBlockModalGym(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl shrink-0">
                  <Lock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {blockModalGym.status === 'BLOCKED' ? 'Update Suspension Reason' : 'Revoke Gym License Access'}
                  </h3>
                  <p className="text-xs text-slate-400">Gym: <strong className="text-white">{blockModalGym.gymName}</strong></p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-bold text-slate-300">Select Suspension Reason (Displayed to gym owners &amp; members upon access):</label>
                <div className="space-y-1.5">
                  {STANDARD_BLOCK_REASONS.map((reason) => (
                    <label
                      key={reason}
                      onClick={() => setSelectedBlockReason(reason)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        selectedBlockReason === reason
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 font-bold'
                          : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="blockReason"
                        checked={selectedBlockReason === reason}
                        onChange={() => setSelectedBlockReason(reason)}
                        className="accent-rose-500"
                      />
                      <span className="text-[11px]">{reason === 'CUSTOM' ? '✏️ Custom specific message...' : reason}</span>
                    </label>
                  ))}
                </div>

                {selectedBlockReason === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Enter custom restriction message for this gym..."
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    required
                    className="w-full bg-[#0B0F17] border border-rose-500/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBlockModalGym(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  {blockModalGym.status === 'BLOCKED' ? 'Save Suspension Reason' : 'Revoke & Apply Block'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── MODAL: CLEAN / REMOVE DUMMY DATA & TEST ENTRIES ── */}
        {cleanModalGym && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <div className="bg-[#141C2B] border border-purple-500/40 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto text-xs">
              <button
                type="button"
                onClick={() => setCleanModalGym(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl shrink-0">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Clean &amp; Purge Dummy / Fake Data</h3>
                  <p className="text-xs text-slate-400">
                    Target: <strong className="text-purple-300">{cleanModalGym === 'ALL' ? 'Platform-Wide (All Gyms)' : cleanModalGym.gymName}</strong>
                  </p>
                </div>
              </div>

              <p className="text-slate-300 leading-relaxed text-[11px]">
                Select the cleaning depth below. Real registered gyms, owner login accounts, and subscription tiers are always protected.
              </p>

              {/* Cleaning Mode Options */}
              <div className="space-y-2">
                {[
                  {
                    id: 'test_only',
                    title: 'Purge Test & Dummy Accounts Only (Recommended)',
                    desc: 'Scans & removes members with names or emails containing "test", "demo", "sample", "dummy", "fake" or test phone numbers like 9999999999, along with their check-ins and orders.'
                  },
                  {
                    id: 'logs_only',
                    title: 'Clear Attendance & Check-in Logs Only',
                    desc: 'Wipes past check-in test history while keeping all member profiles and subscriptions completely intact.'
                  },
                  ...(cleanModalGym !== 'ALL' ? [{
                    id: 'all_gym_data',
                    title: 'Full Clean Reset for This Gym (Zero State)',
                    desc: 'Removes all members, check-ins, and orders for this specific gym to start fresh. Gym owner credentials & subscription remain intact.'
                  }] : [])
                ].map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => setCleanMode(opt.id)}
                    className={`p-3 rounded-xl border block cursor-pointer transition-all ${
                      cleanMode === opt.id
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                        : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <input
                        type="radio"
                        name="cleanMode"
                        checked={cleanMode === opt.id}
                        onChange={() => setCleanMode(opt.id)}
                        className="accent-purple-500"
                      />
                      <span className={cleanMode === opt.id ? 'text-white' : ''}>{opt.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 pl-5 leading-normal">{opt.desc}</p>
                  </label>
                ))}
              </div>

              {cleanFeedbackMsg && (
                <div className={`p-3 rounded-xl font-bold text-xs ${
                  cleanFeedbackMsg.includes('✅')
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}>
                  {cleanFeedbackMsg}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isCleaning}
                  onClick={() => setCleanModalGym(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isCleaning}
                  onClick={handleExecutePurge}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 text-white font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {isCleaning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isCleaning ? 'Purging Data...' : 'Confirm Purge Data'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: EDIT GYM DETAILS, SUBSCRIPTION TYPE & CHARGE ── */}
        {editingGym && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <form onSubmit={handleEditGymSubmit} className="bg-[#141C2B] border border-slate-700 rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setEditingGym(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl shrink-0">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Edit Gym &amp; Subscription Details</h3>
                  <p className="text-xs text-slate-400">Update subscription plan tier, monthly charges, feature toggles, and owner credentials</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Gym Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Gym Name:</label>
                  <input
                    type="text"
                    value={editingGym.gymName}
                    onChange={(e) => setEditingGym({ ...editingGym, gymName: e.target.value })}
                    required
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Location:</label>
                  <input
                    type="text"
                    value={editingGym.location}
                    onChange={(e) => setEditingGym({ ...editingGym, location: e.target.value })}
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Subscription Plan Tier */}
                <div className="space-y-2 sm:col-span-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <span>Subscription Plan / Tier *</span>
                      <span className="text-[10px] text-purple-400 font-bold uppercase">(Starter, Standard, Pro, Custom)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Current: <strong className="text-white">{SUBSCRIPTION_TIERS[editPlanSelect]?.displayName || editPlanSelect}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {Object.keys(SUBSCRIPTION_TIERS).map((tierKey) => {
                      const tier = SUBSCRIPTION_TIERS[tierKey];
                      const isSelected = editPlanSelect === tierKey;
                      return (
                        <button
                          key={tierKey}
                          type="button"
                          onClick={() => handlePlanChangeInEdit(tierKey)}
                          className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-purple-500/15 border-purple-500 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500'
                              : 'bg-[#0B0F17] border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-extrabold text-white text-xs">{tier.name}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${tier.badgeColor}`}>
                                {tier.badge}
                              </span>
                            </div>
                            <div className="text-base font-black text-purple-400 font-mono">
                              {tier.price ? `₹${tier.price.toLocaleString('en-IN')}` : 'Custom'}
                              {tier.price && <span className="text-[10px] text-slate-400 font-normal">/mo</span>}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                              {tier.description}
                            </p>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                            <span className={isSelected ? 'text-purple-300 font-bold' : 'text-slate-500'}>
                              {tier.defaultFeatures.length} Modules
                            </span>
                            {isSelected ? (
                              <span className="flex items-center gap-0.5 text-purple-400 font-black">
                                <Check className="w-3 h-3" /> Selected
                              </span>
                            ) : (
                              <span className="text-slate-500 hover:text-slate-400">Select</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {editPlanSelect === 'Custom' && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] font-bold text-amber-300">Custom Subscription Plan Tier Name *</label>
                      <input
                        type="text"
                        placeholder="Type custom plan tier name..."
                        value={editCustomPlanName}
                        onChange={(e) => setEditCustomPlanName(e.target.value)}
                        required
                        className="w-full bg-[#0B0F17] border border-amber-500/50 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}
                </div>

                {/* Monthly Subscription Charge Amount */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-300">Monthly Subscription Charge (₹):</label>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {[2499, 4499, 6999].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setEditingGym({ ...editingGym, monthlyFee: amt })}
                          className={`px-2.5 py-1 rounded-lg border font-bold transition-colors cursor-pointer ${
                            Number(editingGym.monthlyFee) === amt
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          ₹{amt.toLocaleString('en-IN')}/mo
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editingGym.monthlyFee}
                      onChange={(e) => setEditingGym({ ...editingGym, monthlyFee: e.target.value })}
                      required
                      className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Feature Modules & Toggles */}
                <div className="sm:col-span-2">
                  <SubscriptionFeatureToggles
                    plan={editPlanSelect}
                    activeFeatures={editingGymFeatures}
                    onToggleFeature={handleToggleEditFeature}
                    onToggleAll={handleToggleAllEditFeatures}
                    onResetToDefaults={handleResetEditFeaturesToDefaults}
                  />
                </div>

                {/* Account Access Status (Active vs Blocked) */}
                <div className="space-y-1 sm:col-span-2 bg-[#0B0F17] p-3 rounded-xl border border-slate-800">
                  <label className="font-bold text-slate-300 block mb-1">Account Access Status:</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-400">
                      <input
                        type="radio"
                        name="accessStatus"
                        checked={editingGym.status === 'ACTIVE'}
                        onChange={() => setEditingGym({ ...editingGym, status: 'ACTIVE', blockReason: '' })}
                        className="accent-emerald-500"
                      />
                      <span>🟢 Active (Operating Normally)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-400">
                      <input
                        type="radio"
                        name="accessStatus"
                        checked={editingGym.status === 'BLOCKED'}
                        onChange={() => setEditingGym({
                          ...editingGym,
                          status: 'BLOCKED',
                          blockReason: editingGym.blockReason || 'Monthly Subscription Unpaid (Overdue). Contact Administrator to restore.'
                        })}
                        className="accent-rose-500"
                      />
                      <span>🔴 Blocked / Suspended</span>
                    </label>
                  </div>

                  {editingGym.status === 'BLOCKED' && (
                    <div className="mt-2.5 space-y-1">
                      <label className="text-[11px] text-rose-300 font-bold">Suspension Reason (Shown to user):</label>
                      <input
                        type="text"
                        value={editingGym.blockReason || ''}
                        onChange={(e) => setEditingGym({ ...editingGym, blockReason: e.target.value })}
                        placeholder="Enter reason for suspension..."
                        required
                        className="w-full bg-[#141C2B] border border-rose-500/40 rounded-xl p-2.5 text-xs text-rose-200 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Owner Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Owner Full Name:</label>
                  <input
                    type="text"
                    value={editingGym.ownerName}
                    onChange={(e) => setEditingGym({ ...editingGym, ownerName: e.target.value })}
                    required
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Owner Phone */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Owner Login Phone:</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    value={editingGym.ownerPhone}
                    onChange={(e) => setEditingGym({ ...editingGym, ownerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    required
                    maxLength={10}
                    minLength={10}
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Owner Email */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Owner Email Address:</label>
                  <input
                    type="email"
                    value={editingGym.ownerEmail || ''}
                    onChange={(e) => setEditingGym({ ...editingGym, ownerEmail: e.target.value })}
                    placeholder="owner@gympulse.in"
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Email Verified Toggle */}
                <div className="space-y-1 flex flex-col justify-end">
                  <label className="font-bold text-slate-300">Email Verification Status:</label>
                  <label className="flex items-center gap-2 p-2.5 bg-[#0B0F17] border border-slate-700 rounded-xl text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingGym.emailVerified === true}
                      onChange={(e) => setEditingGym({ ...editingGym, emailVerified: e.target.checked })}
                      className="accent-emerald-500 w-4 h-4 rounded"
                    />
                    <span className={editingGym.emailVerified ? "text-emerald-400 font-bold" : "text-slate-400 font-bold"}>
                      {editingGym.emailVerified ? "✓ Email Verified" : "✕ Unverified Email"}
                    </span>
                  </label>
                </div>

                {/* Password Reset (Optional) */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-300">Reset Password (Backend Synced):</label>
                  <input
                    type="text"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    placeholder="Leave blank to preserve owner's current password..."
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500">Updating this will immediately sync with Supabase and allow owner to login with the new password.</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGym(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving to Database...' : 'Save Subscription & Details'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── MODAL: QUICK RESET OWNER PASSWORD ── */}
        {resetPassModalGym && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <form onSubmit={handleQuickResetPasswordSubmit} className="bg-[#141C2B] border border-amber-500/40 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 relative">
              <button
                type="button"
                onClick={() => setResetPassModalGym(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl shrink-0">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Reset Owner Password</h3>
                  <p className="text-xs text-slate-400">Gym: <strong className="text-white">{resetPassModalGym.gymName}</strong></p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                As Super Admin, owner passwords are kept private. Issue a new temporary password below to share directly with the owner.
              </p>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">New Temporary Password *</label>
                <input
                  type="text"
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  placeholder="Enter new temporary password..."
                  required
                  autoFocus
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              {resetFeedbackMsg && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold text-xs">
                  {resetFeedbackMsg}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPassModalGym(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPass}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isResettingPass ? 'Saving to Database...' : 'Set Temporary Password'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
