import React from 'react';
import { Sliders, Zap, Check, X, Shield, Sparkles } from 'lucide-react';
import { SYSTEM_FEATURES, SUBSCRIPTION_TIERS, ALL_FEATURE_IDS } from '../data/subscriptionPlans';

export default function SubscriptionFeatureToggles({
  plan = 'Standard',
  activeFeatures = [],
  onToggleFeature,
  onToggleAll,
  onResetToDefaults,
  readOnly = false
}) {
  const currentPlanTier = SUBSCRIPTION_TIERS[plan] || SUBSCRIPTION_TIERS.Custom;
  const isCustom = plan === 'Custom';
  const allEnabled = activeFeatures.length === SYSTEM_FEATURES.length;

  return (
    <div className="bg-[#0B0F17] p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-3">
      {/* Header with Title and Master Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <h4 className="font-black text-white text-xs">Subscription Features &amp; Modules</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
              {activeFeatures.length} / {SYSTEM_FEATURES.length} Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isCustom
              ? 'Custom Plan: Toggle any individual module ON or OFF, or use the master switch.'
              : `${currentPlanTier.displayName}: Pre-configured with plan defaults. Toggle any module ON or OFF as needed.`}
          </p>
        </div>

        {/* Master Toggle Controls */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            {isCustom ? (
              <button
                type="button"
                onClick={() => onToggleAll && onToggleAll(!allEnabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                  allEnabled
                    ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                }`}
                title="Single toggle to enable or disable all features at once"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{allEnabled ? 'Disable All Features' : 'Master Toggle: Enable All Features'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                {onResetToDefaults && (
                  <button
                    type="button"
                    onClick={onResetToDefaults}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    title="Reset to default features for this plan"
                  >
                    Reset Defaults
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onToggleAll && onToggleAll(!allEnabled)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                >
                  {allEnabled ? 'Turn All Off' : 'Turn All On'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid of Feature Toggle Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {SYSTEM_FEATURES.map((feat) => {
          const isEnabled = activeFeatures.includes(feat.id);
          return (
            <div
              key={feat.id}
              onClick={() => {
                if (!readOnly && onToggleFeature) {
                  onToggleFeature(feat.id);
                }
              }}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                readOnly ? 'cursor-default' : 'cursor-pointer'
              } ${
                isEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                  : 'bg-[#141C2B] border-slate-800 opacity-60 hover:opacity-85'
              }`}
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`font-extrabold text-[11px] truncate ${isEnabled ? 'text-white' : 'text-slate-300'}`}>
                    {feat.name}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                    isEnabled
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {feat.category}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate leading-tight">
                  {feat.desc}
                </p>
              </div>

              {/* iOS Style Slide Switch */}
              {!readOnly ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleFeature) onToggleFeature(feat.id);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                  aria-pressed={isEnabled}
                  title={isEnabled ? 'Feature is Enabled (Click to Disable)' : 'Feature is Disabled (Click to Enable)'}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              ) : (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {isEnabled ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-500" />}
                  <span>{isEnabled ? 'Active' : 'Locked'}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
