/**
 * GymPulse Software Subscription Plans & Feature Registry
 * 3 Major Plans: Starter (₹2499), Standard (₹4499), Pro (₹6999) + Custom
 */

export const SYSTEM_FEATURES = [
  {
    id: 'member_management',
    name: 'Member Profiles & Registration',
    desc: 'Digital registration, active/paused status, ID cards & member records',
    category: 'Core'
  },
  {
    id: 'qr_attendance',
    name: 'Dynamic QR Check-in & Scanner',
    desc: 'Anti-fraud rotating 30s QR codes & front-desk camera scanner',
    category: 'Core'
  },
  {
    id: 'attendance_logs',
    name: 'Real-Time Attendance History',
    desc: 'Live check-in logging, daily attendance count & check-in calendar',
    category: 'Core'
  },
  {
    id: 'member_portal',
    name: 'Member Self-Service Portal',
    desc: 'Member view with digital ID card, renewal status & attendance history',
    category: 'Core'
  },
  {
    id: 'noshow_retention',
    name: 'Automated Red-List Churn Alerts',
    desc: 'Automatic detection of members absent 3+ days with churn risk score',
    category: 'Retention'
  },
  {
    id: 'whatsapp_reminders',
    name: 'WhatsApp Automation & Reminders',
    desc: '1-click personalized WhatsApp messages for renewals & absent members',
    category: 'Retention'
  },
  {
    id: 'staff_logins',
    name: 'Staff & Receptionist Logins',
    desc: 'Dedicated staff logins with 4-digit PIN for front-desk attendants',
    category: 'Operations'
  },
  {
    id: 'analytics_reports',
    name: 'Financial & Growth Analytics',
    desc: 'MRR tracking, collection stats, plan breakdown & member trends',
    category: 'Analytics'
  },
  {
    id: 'pt_management',
    name: 'Personal Trainer (PT) Tracking',
    desc: 'PT session counter, trainer package tracking & session logs',
    category: 'Advanced'
  },
  {
    id: 'addon_store',
    name: 'Add-On Store & Supplement POS',
    desc: 'Energy drinks, protein powder & merchandise billing with order fulfillment',
    category: 'Advanced'
  },
  {
    id: 'custom_templates',
    name: 'Custom WhatsApp & Message Templates',
    desc: 'Ability to customize welcome, renewal & no-show WhatsApp text templates',
    category: 'Advanced'
  },
  {
    id: 'audit_logs',
    name: 'Live Security Audit Logs',
    desc: 'Real-time database tracking of password changes, deletes & admin actions',
    category: 'Security'
  }
];

export const ALL_FEATURE_IDS = SYSTEM_FEATURES.map(f => f.id);

export const SUBSCRIPTION_TIERS = {
  Starter: {
    id: 'Starter',
    name: 'Starter',
    displayName: 'Starter Tier',
    price: 2499,
    badge: 'Starter',
    badgeColor: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
    description: 'Essential gym management with digital member rosters & QR attendance',
    defaultFeatures: [
      'member_management',
      'qr_attendance',
      'attendance_logs',
      'member_portal'
    ]
  },
  Standard: {
    id: 'Standard',
    name: 'Standard',
    displayName: 'Standard Tier',
    price: 4499,
    badge: 'Popular',
    badgeColor: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    description: 'Automated retention alerts, WhatsApp integration & front-desk staff logins',
    defaultFeatures: [
      'member_management',
      'qr_attendance',
      'attendance_logs',
      'member_portal',
      'noshow_retention',
      'whatsapp_reminders',
      'staff_logins',
      'analytics_reports'
    ]
  },
  Pro: {
    id: 'Pro',
    name: 'Pro',
    displayName: 'Pro Suite',
    price: 6999,
    badge: 'Enterprise',
    badgeColor: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
    description: 'Complete gym operating system with PT tracking, store POS, and audit logs',
    defaultFeatures: [
      'member_management',
      'qr_attendance',
      'attendance_logs',
      'member_portal',
      'noshow_retention',
      'whatsapp_reminders',
      'staff_logins',
      'analytics_reports',
      'pt_management',
      'addon_store',
      'custom_templates',
      'audit_logs'
    ]
  },
  Custom: {
    id: 'Custom',
    name: 'Custom',
    displayName: 'Custom Enterprise Plan',
    price: null,
    badge: 'Custom',
    badgeColor: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    description: 'Fully tailor-made subscription with custom price and customizable features',
    defaultFeatures: [
      'member_management',
      'qr_attendance',
      'attendance_logs',
      'member_portal'
    ]
  }
};

/**
 * Normalizes legacy or custom plan names into a known tier key: 'Starter' | 'Standard' | 'Pro' | 'Custom'
 */
export function normalizePlanKey(planName) {
  if (!planName) return 'Standard';
  const clean = String(planName).toLowerCase().trim();
  if (clean.includes('starter')) return 'Starter';
  if (clean.includes('standard') || clean.includes('growth')) return 'Standard';
  if (clean.includes('pro') || clean.includes('enterprise')) return 'Pro';
  if (clean.includes('custom')) return 'Custom';
  return 'Custom';
}

/**
 * Returns the effective list of enabled feature IDs for a gym
 */
export function getGymActiveFeatures(gym) {
  if (!gym) return SUBSCRIPTION_TIERS.Standard.defaultFeatures;
  // If explicitly specified in gym.features (array)
  if (Array.isArray(gym.features) && gym.features.length > 0) {
    return gym.features;
  }
  // If specified in gym.settings?.features
  if (Array.isArray(gym.settings?.features) && gym.settings.features.length > 0) {
    return gym.settings.features;
  }
  // Otherwise resolve from plan default
  const tierKey = normalizePlanKey(gym.plan);
  const tier = SUBSCRIPTION_TIERS[tierKey] || SUBSCRIPTION_TIERS.Standard;
  return tier.defaultFeatures || [];
}

/**
 * Checks whether a specific feature is enabled for a given gym
 */
export function isGymFeatureActive(gym, featureId) {
  const activeFeatures = getGymActiveFeatures(gym);
  return activeFeatures.includes(featureId);
}
