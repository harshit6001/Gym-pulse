// FitPulse Gym & Fitness Club - Production Clean State & Demo Seed Data

export const INITIAL_SETTINGS = {
  gymName: "FitPulse Gym & Fitness",
  location: "Vijay Nagar, Indore, MP",
  gymStatus: "ACTIVE", // ACTIVE, BLOCKED, MAINTENANCE
  blockReason: "Subscription Unpaid or License Expired. Contact System Admin.",
  noShowThresholdDays: 10,
  renewalReminderDays: [14, 7, 3, 0],
  qrCodeRotateSeconds: 30,
  duplicateScanWindowMinutes: 60,
  autoScanEnabled: true,
  superAdminKey: "admin999", // Secret Master Key for Super Admin Portal
  ownerCredentials: {
    name: "Vikram Malhotra",
    phone: "9876543210",
    password: "owner123"
  },
  adminCredentials: {
    username: "admin",
    pin: "admin999"
  },
  whatsappTemplates: {
    noShow: "Namaste {NAME} ji! Humne aapko FitPulse Gym mein miss kiya. Workout streak continue rakhne ke liye aaj evening session mein zaroor aaiye! 💪",
    renewal: "Hello {NAME} ji! Aapki FitPulse gym membership {EXPIRY_DATE} ko expire ho rahi hai. Special 15% renewal discount unlock karne ke liye yahan tap karein: {LINK}",
    welcome: "Welcome to FitPulse Gym {NAME}! Aapka active plan: {PLAN_NAME}. Happy Workout!"
  }
};

export const INITIAL_GYMS = [
  {
    id: "gym-1",
    gymName: "FitPulse Gym & Fitness (HQ)",
    location: "Vijay Nagar, Indore, MP",
    ownerName: "Vikram Malhotra",
    ownerPhone: "9876543210",
    ownerPassword: "owner123",
    status: "ACTIVE", // ACTIVE, BLOCKED, MAINTENANCE
    blockReason: "Subscription Unpaid or License Expired. Contact System Admin.",
    plan: "Enterprise Pro Suite",
    monthlyFee: 4999,
    membersCount: 142,
    activeSince: "2026-01-15",
    lastLogin: "Today, 10:45 AM"
  },
  {
    id: "gym-2",
    gymName: "Iron Core Fitness Studio",
    location: "Palasia Square, Indore, MP",
    ownerName: "Aman Singhania",
    ownerPhone: "9826022334",
    ownerPassword: "iron2026pass",
    status: "ACTIVE",
    blockReason: "Payment overdue for license renewal.",
    plan: "Standard Growth Suite",
    monthlyFee: 2999,
    membersCount: 88,
    activeSince: "2026-03-01",
    lastLogin: "Yesterday, 06:20 PM"
  },
  {
    id: "gym-3",
    gymName: "Titan Gym & Crossfit Club",
    location: "Bhawarkua Main Road, Indore, MP",
    ownerName: "Deepak Choudhary",
    ownerPhone: "9893044556",
    ownerPassword: "titan99pass",
    status: "BLOCKED",
    blockReason: "Monthly software subscription unpaid (Overdue 14 days).",
    plan: "Pro Retention Suite",
    monthlyFee: 3999,
    membersCount: 110,
    activeSince: "2025-11-20",
    lastLogin: "3 days ago"
  }
];

export const INITIAL_STAFF = [
  { id: "staff-1", name: "Rohan Verma", role: "Front-Desk Executive", phone: "9876511001", pin: "0000", shift: "Morning & Evening", status: "ACTIVE" }
];

export const PLANS = [
  { id: "p-1", name: "1 Month Fitness", durationMonths: 1, basePrice: 1800, discountPercent: 10, finalPrice: 1620, popular: false, benefits: ["Full Gym Access", "Locker Room", "1 Free Trainer Orientation"] },
  { id: "p-2", name: "3 Months Power", durationMonths: 3, basePrice: 4800, discountPercent: 15, finalPrice: 4080, popular: true, benefits: ["Full Access", "Steam Bath Once/Week", "Monthly InBody Scan", "1 Free Diet Chart"] },
  { id: "p-3", name: "6 Months Transformation", durationMonths: 6, basePrice: 9000, discountPercent: 25, finalPrice: 6750, popular: false, benefits: ["All Access", "Unlimited Steam", "Bi-weekly Body Composition", "Free Personal Locker"] },
  { id: "p-4", name: "12 Months Champion", durationMonths: 12, basePrice: 16000, discountPercent: 35, finalPrice: 10400, popular: false, benefits: ["VIP Access", "Free Gym Bag + Shaker", "Monthly Diet Updates", "Guest Pass (2/mo)", "Pause up to 30 Days"] }
];

export const ADD_ONS = [
  { id: "ao-1", category: "Personal Training", name: "10-Session PT Booster (Coach Vikram)", price: 4500, validityDays: 30, stockOrCapacity: 5, trainerId: "tr-1", description: "1-on-1 progressive overload strength coaching.", terms: "Non-refundable after 1st session. 24hr cancellation rule." },
  { id: "ao-2", category: "Diet Plan", name: "Customized High-Protein Indian Diet Chart (Coach Neha)", price: 1499, validityDays: 60, stockOrCapacity: 99, trainerId: "tr-2", description: "Macronutrient breakdown tailored for Veg/Non-Veg & Indian recipes.", terms: "Includes 2 review consultations." },
  { id: "ao-3", category: "Supplements", name: "Optimum Nutrition Gold Standard Whey 1kg (Chocolate)", price: 3200, validityDays: null, stockOrCapacity: 12, trainerId: null, description: "100% Whey Protein Isolate blend. Authentic QR seal.", terms: "Sealed container replacement only on defect." },
  { id: "ao-4", category: "Supplements", name: "Scivation XTEND BCAA Powder (Mango 30 Servings)", price: 1850, validityDays: null, stockOrCapacity: 8, trainerId: null, description: "Intra-workout hydration & muscle recovery blend.", terms: "In-store pickup at front desk." }
];

// Clean Production Defaults (Empty Data)
export const INITIAL_MEMBERS = [];
export const INITIAL_NO_SHOW_CASES = [];
export const INITIAL_ATTENDANCE_LOGS = [];
export const INITIAL_PAYMENTS = [];
export const INITIAL_ADDON_ORDERS = [];
export const INITIAL_AUDIT_LOGS = [
  { id: "log-init", timestamp: "2026-09-27 10:00 AM", actor: "FitPulse System", action: "SYSTEM_INITIALIZED", target: "Production Environment", details: "Clean database initialized." }
];

// Demo Seed Sample Dataset (For 1-click testing if needed)
export const SAMPLE_DEMO_SEED = {
  members: [
    {
      id: "m-1",
      name: "Rahul Sharma",
      phone: "9826011111",
      email: "rahul.sharma@example.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      status: "active",
      membership: { planId: "p-2", planName: "3 Months Power", startDate: "2026-08-10", endDate: "2026-11-10", autoRenew: true, amountPaid: 4080 },
      weeklyGoalDays: 5,
      streak: { current: 12, max: 24, restDaysApprovedThisWeek: 1 },
      lastCheckIn: "2026-09-27 07:15 AM",
      absentDaysCount: 0,
      assignedTrainer: "tr-1",
      communicationConsent: true,
      optedOutWhatsapp: false,
      notes: "Regular morning lifter."
    },
    {
      id: "m-2",
      name: "Priya Verma",
      phone: "9826022222",
      email: "priya.verma@example.com",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      status: "active",
      membership: { planId: "p-1", planName: "1 Month Fitness", startDate: "2026-08-30", endDate: "2026-09-30", autoRenew: false, amountPaid: 1620 },
      weeklyGoalDays: 4,
      streak: { current: 4, max: 8, restDaysApprovedThisWeek: 0 },
      lastCheckIn: "2026-09-26 06:45 PM",
      absentDaysCount: 1,
      assignedTrainer: "tr-2",
      communicationConsent: true,
      optedOutWhatsapp: false,
      notes: "Prefers evening cardio."
    },
    {
      id: "m-3",
      name: "Amit Patel",
      phone: "9826033333",
      email: "amit.patel@example.com",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      status: "active",
      membership: { planId: "p-3", planName: "6 Months Transformation", startDate: "2026-07-01", endDate: "2027-01-01", autoRenew: false, amountPaid: 6750 },
      weeklyGoalDays: 4,
      streak: { current: 0, max: 15, restDaysApprovedThisWeek: 0 },
      lastCheckIn: "2026-09-13 08:30 AM",
      absentDaysCount: 14,
      assignedTrainer: "tr-1",
      communicationConsent: true,
      optedOutWhatsapp: false,
      notes: "Stopped coming post office deadline."
    }
  ],
  noShowCases: [
    { id: "ns-1", memberId: "m-3", memberName: "Amit Patel", phone: "9826033333", absentDays: 14, lastCheckIn: "2026-09-13", status: "OPEN", assignedTrainer: "tr-1", lastFollowUp: null, outcomeHistory: [] }
  ],
  attendanceLogs: [
    { id: "att-101", memberId: "m-1", memberName: "Rahul Sharma", timestamp: "2026-09-27 07:15 AM", method: "QR_SELF", status: "SUCCESS", device: "Member App" }
  ],
  payments: [
    { id: "pay-501", orderId: "ord-881", memberId: "m-1", memberName: "Rahul Sharma", planId: "p-2", planName: "3 Months Power", amount: 4080, provider: "RAZORPAY_UPI", status: "PAID", transactionRef: "pay_N83a71bK9a81", timestamp: "2026-08-10 10:14 AM", idempotencyKey: "ik_renew_m1" }
  ]
};
