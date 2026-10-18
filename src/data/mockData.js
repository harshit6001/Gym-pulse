// FitPulse Gym OS — Production Clean State & Configurations

export const INITIAL_SETTINGS = {
  gymName: "GymPulse Gym",
  location: "Indore, MP",
  gymStatus: "ACTIVE", // ACTIVE, BLOCKED, MAINTENANCE
  blockReason: "",
  noShowThresholdDays: 10,
  renewalReminderDays: [14, 7, 3, 0],
  qrCodeRotateSeconds: 30,
  duplicateScanWindowMinutes: 60,
  autoScanEnabled: true,
  superAdminKey: "Admin@2026Master#", // Secret Master Key for Super Admin Portal
  ownerCredentials: null,
  adminCredentials: null,
  whatsappTemplates: {
    noShow: "Namaste {NAME} ji! Humne aapko gym mein miss kiya. Workout streak continue rakhne ke liye aaj evening session mein zaroor aaiye! 💪",
    renewal: "Hello {NAME} ji! Aapki gym membership {EXPIRY_DATE} ko expire ho rahi hai. Special renewal discount unlock karne ke liye yahan tap karein: {LINK}",
    welcome: "Welcome to {GYM_NAME} {NAME}! Aapka active plan: {PLAN_NAME}. Happy Workout!"
  }
};

// Clean Production Defaults (Zero mock or dummy data)
export const INITIAL_GYMS = [];
export const INITIAL_STAFF = [];
export const INITIAL_MEMBERS = [];
export const INITIAL_NO_SHOW_CASES = [];
export const INITIAL_ATTENDANCE_LOGS = [];
export const INITIAL_PAYMENTS = [];
export const INITIAL_ADDON_ORDERS = [];
export const INITIAL_AUDIT_LOGS = [];

export const PLANS = [
  { id: "p-1", name: "1 Month Fitness", durationMonths: 1, basePrice: 1800, discountPercent: 10, finalPrice: 1620, popular: false, benefits: ["Full Gym Access", "Locker Room", "1 Free Trainer Orientation"] },
  { id: "p-2", name: "3 Months Power", durationMonths: 3, basePrice: 4800, discountPercent: 15, finalPrice: 4080, popular: true, benefits: ["Full Access", "Steam Bath Once/Week", "Monthly InBody Scan", "1 Free Diet Chart"] },
  { id: "p-3", name: "6 Months Transformation", durationMonths: 6, basePrice: 9000, discountPercent: 25, finalPrice: 6750, popular: false, benefits: ["All Access", "Unlimited Steam", "Bi-weekly Body Composition", "Free Personal Locker"] },
  { id: "p-4", name: "12 Months Champion", durationMonths: 12, basePrice: 16000, discountPercent: 35, finalPrice: 10400, popular: false, benefits: ["VIP Access", "Free Gym Bag + Shaker", "Monthly Diet Updates", "Guest Pass (2/mo)", "Pause up to 30 Days"] }
];

export const ADD_ONS = [
  { id: "ao-1", category: "Personal Training", name: "10-Session PT Booster (Personal Coach)", price: 4500, validityDays: 30, stockOrCapacity: 10, trainerId: "coach-main", description: "1-on-1 progressive overload strength coaching.", terms: "Non-refundable after 1st session. 24hr cancellation rule." },
  { id: "ao-2", category: "Diet Plan", name: "Customized High-Protein Indian Diet Chart", price: 1499, validityDays: 60, stockOrCapacity: 99, trainerId: "coach-nutrition", description: "Macronutrient breakdown tailored for Veg/Non-Veg & Indian recipes.", terms: "Includes 2 review consultations." },
  { id: "ao-3", category: "Supplements", name: "Optimum Nutrition Gold Standard Whey 1kg (Chocolate)", price: 3200, validityDays: null, stockOrCapacity: 15, trainerId: null, description: "100% Whey Protein Isolate blend. Authentic QR seal.", terms: "Sealed container replacement only on defect." },
  { id: "ao-4", category: "Supplements", name: "Scivation XTEND BCAA Powder (Mango 30 Servings)", price: 1850, validityDays: null, stockOrCapacity: 12, trainerId: null, description: "Intra-workout hydration & muscle recovery blend.", terms: "In-store pickup at front desk." }
];
