// FitPulse Gym & Fitness Club - Comprehensive Indian Tier-2 Gym Sample Dataset

export const INITIAL_SETTINGS = {
  gymName: "FitPulse Gym & Fitness",
  location: "Vijay Nagar, Indore, MP",
  noShowThresholdDays: 10,
  renewalReminderDays: [14, 7, 3, 0],
  qrCodeRotateSeconds: 30,
  duplicateScanWindowMinutes: 60,
  autoScanEnabled: true,
  whatsappTemplates: {
    noShow: "Namaste {NAME} ji! Humne aapko FitPulse Gym mein miss kiya. Workout streak continue rakhne ke liye aaj evening session mein zaroor aaiye! 💪",
    renewal: "Hello {NAME} ji! Aapki FitPulse gym membership {EXPIRY_DATE} ko expire ho rahi hai. Special 15% renewal discount unlock karne ke liye yahan tap karein: {LINK}",
    welcome: "Welcome to FitPulse Gym {NAME}! Aapka active plan: {PLAN_NAME}. Happy Workout!"
  }
};

export const STAFF = [
  { id: "staff-1", name: "Rohan Verma", role: "Front-Desk Executive", phone: "+91 98765 11001", shift: "Morning & Evening" },
  { id: "tr-1", name: "Coach Vikram Singh", role: "Head Trainer (Strength & Bodybuilding)", phone: "+91 98260 22002", certs: "NSCA Certified", activeClients: 12, capacity: 15 },
  { id: "tr-2", name: "Coach Neha Sharma", role: "Sports Nutritionist & Wellness", phone: "+91 98260 33003", certs: "M.Sc Nutrition", activeClients: 8, capacity: 10 },
  { id: "tr-3", name: "Coach Karan Malhotra", role: "Functional & HIIT Coach", phone: "+91 98260 44004", certs: "CrossFit L-2", activeClients: 9, capacity: 12 }
];

export const PLANS = [
  { id: "p-1", name: "1 Month Fitness", durationMonths: 1, basePrice: 1800, discountPercent: 10, finalPrice: 1620, popular: false, benefits: ["Full Gym Access", "Locker Room", "1 Free Trainer Orientation"] },
  { id: "p-2", name: "3 Months Power", durationMonths: 3, basePrice: 4800, discountPercent: 15, finalPrice: 4080, popular: true, benefits: ["Full Access", "Steam Bath Once/Week", "Monthly InBody Scan", "1 Free Diet Chart"] },
  { id: "p-3", name: "6 Months Transformation", durationMonths: 6, basePrice: 9000, discountPercent: 25, finalPrice: 6750, popular: false, benefits: ["All Access", "Unlimited Steam", "Bi-weekly Body Composition", "Free Personal Locker"] },
  { id: "p-4", name: "12 Months Champion", durationMonths: 12, basePrice: 16000, discountPercent: 35, finalPrice: 10400, popular: false, benefits: ["VIP Access", "Free Gym Bag + Shaker", "Monthly Diet Updates", "Guest Pass (2/mo)", "Pause up to 30 Days"] }
];

export const ADD_ONS = [
  { id: "ao-1", category: "Personal Training", name: "10-Session PT Booster (Coach Vikram)", price: 4500, validityDays: 30, stockOrCapacity: 4, trainerId: "tr-1", description: "1-on-1 progressive overload strength coaching.", terms: "Non-refundable after 1st session. 24hr cancellation rule." },
  { id: "ao-2", category: "Diet Plan", name: "Customized High-Protein Indian Diet Chart (Coach Neha)", price: 1499, validityDays: 60, stockOrCapacity: 99, trainerId: "tr-2", description: "Macronutrient breakdown tailored for Veg/Non-Veg & Indian recipes.", terms: "Includes 2 review consultations." },
  { id: "ao-3", category: "Supplements", name: "Optimum Nutrition Gold Standard Whey 1kg (Chocolate)", price: 3200, validityDays: null, stockOrCapacity: 12, trainerId: null, description: "100% Whey Protein Isolate blend. Authentic QR seal.", terms: "Sealed container replacement only on defect." },
  { id: "ao-4", category: "Supplements", name: "Scivation XTEND BCAA Powder (Mango 30 Servings)", price: 1850, validityDays: null, stockOrCapacity: 6, trainerId: null, description: "Intra-workout hydration & muscle recovery blend.", terms: "In-store pickup at front desk." }
];

// Helper date generator relative to current date (2026-09-27)
const now = new Date("2026-09-27T10:00:00+05:30");
const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString().split('T')[0];
const daysAhead = (d) => new Date(now.getTime() + d * 86400000).toISOString().split('T')[0];

export const INITIAL_MEMBERS = [
  // 1. Rahul Sharma - Active, high streak
  {
    id: "m-1",
    name: "Rahul Sharma",
    phone: "9826011111",
    email: "rahul.sharma@example.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "active", // active, paused, expired, cancelled
    membership: {
      planId: "p-2",
      planName: "3 Months Power",
      startDate: daysAgo(45),
      endDate: daysAhead(45),
      autoRenew: true,
      amountPaid: 4080
    },
    weeklyGoalDays: 5,
    streak: { current: 12, max: 24, restDaysApprovedThisWeek: 1 },
    lastCheckIn: daysAgo(0) + " 07:15 AM",
    absentDaysCount: 0,
    assignedTrainer: "tr-1",
    communicationConsent: true,
    optedOutWhatsapp: false,
    notes: "Regular morning lifter. Focuses on bench press."
  },

  // 2. Priya Verma - Expiring in 3 days (Renewal prompt candidate)
  {
    id: "m-2",
    name: "Priya Verma",
    phone: "9826022222",
    email: "priya.verma@example.com",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    status: "active",
    membership: {
      planId: "p-1",
      planName: "1 Month Fitness",
      startDate: daysAgo(27),
      endDate: daysAhead(3),
      autoRenew: false,
      amountPaid: 1620
    },
    weeklyGoalDays: 4,
    streak: { current: 4, max: 8, restDaysApprovedThisWeek: 0 },
    lastCheckIn: daysAgo(1) + " 06:45 PM",
    absentDaysCount: 1,
    assignedTrainer: "tr-2",
    communicationConsent: true,
    optedOutWhatsapp: false,
    notes: "Prefers evening cardio and diet consultation."
  },

  // 3. Amit Patel - High Churn Risk (14 Days Absent -> On Red List)
  {
    id: "m-3",
    name: "Amit Patel",
    phone: "9826033333",
    email: "amit.patel@example.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    status: "active",
    membership: {
      planId: "p-3",
      planName: "6 Months Transformation",
      startDate: daysAgo(60),
      endDate: daysAhead(120),
      autoRenew: false,
      amountPaid: 6750
    },
    weeklyGoalDays: 4,
    streak: { current: 0, max: 15, restDaysApprovedThisWeek: 0 },
    lastCheckIn: daysAgo(14) + " 08:30 AM",
    absentDaysCount: 14,
    assignedTrainer: "tr-1",
    communicationConsent: true,
    optedOutWhatsapp: false,
    notes: "Stopped coming post office project deadline."
  },

  // 4. Ananya Roy - Expiring in 2 days
  {
    id: "m-4",
    name: "Ananya Roy",
    phone: "9826044444",
    email: "ananya.roy@example.com",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    status: "active",
    membership: {
      planId: "p-2",
      planName: "3 Months Power",
      startDate: daysAgo(88),
      endDate: daysAhead(2),
      autoRenew: false,
      amountPaid: 4080
    },
    weeklyGoalDays: 3,
    streak: { current: 1, max: 6, restDaysApprovedThisWeek: 0 },
    lastCheckIn: daysAgo(2) + " 07:00 AM",
    absentDaysCount: 2,
    assignedTrainer: "tr-3",
    communicationConsent: true,
    optedOutWhatsapp: false,
    notes: "Wants to switch to morning batch."
  },

  // 5. Vikramaditya Singh - High Churn Risk (18 Days Absent -> On Red List)
  {
    id: "m-5",
    name: "Vikramaditya Singh",
    phone: "9826055555",
    email: "vikram.singh@example.com",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    status: "active",
    membership: {
      planId: "p-4",
      planName: "12 Months Champion",
      startDate: daysAgo(90),
      endDate: daysAhead(275),
      autoRenew: true,
      amountPaid: 10400
    },
    weeklyGoalDays: 5,
    streak: { current: 0, max: 32, restDaysApprovedThisWeek: 0 },
    lastCheckIn: daysAgo(18) + " 06:15 PM",
    absentDaysCount: 18,
    assignedTrainer: "tr-1",
    communicationConsent: true,
    optedOutWhatsapp: false,
    notes: "Has PT package. Minor knee stiffness."
  },

  // 6. Deepa Kulkarni - Approved Pause state (Not on Red List!)
  {
    id: "m-6",
    name: "Deepa Kulkarni",
    phone: "9826066666",
    email: "deepa.k@example.com",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    status: "paused",
    pauseReason: "Out of station / Business travel",
    pauseUntil: daysAhead(10),
    membership: {
      planId: "p-3",
      planName: "6 Months Transformation",
      startDate: daysAgo(30),
      endDate: daysAhead(150),
      autoRenew: true,
      amountPaid: 6750
    },
    weeklyGoalDays: 4,
    streak: { current: 5, max: 14, restDaysApprovedThisWeek: 0 },
    lastCheckIn: daysAgo(12) + " 07:30 AM",
    absentDaysCount: 12,
    assignedTrainer: "tr-2",
    communicationConsent: true,
    optedOutWhatsapp: false,
    notes: "Pause approved till next week."
  },

  // 7. Sanjay Gupta - High Churn Risk (11 Days Absent -> On Red List)
  {
    id: "m-7",
    name: "Sanjay Gupta",
    phone: "9826077777",
    email: "sanjay.g@example.com",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    status: "active",
    membership: {
      planId: "p-2",
      planName: "3 Months Power",
      startDate: daysAgo(40),
      endDate: daysAhead(50),
      autoRenew: false,
      amountPaid: 4080
    },
    weeklyGoalDays: 3,
    streak: { current: 0, max: 10, restDaysApprovedThisWeek: 0 },
    lastCheckIn: daysAgo(11) + " 08:00 AM",
    absentDaysCount: 11,
    assignedTrainer: "tr-3",
    communicationConsent: true,
    optedOutWhatsapp: false,
    notes: "Business owner, frequent travel."
  },

  // 8. Neha Agarwal - Active, regular
  {
    id: "m-8",
    name: "Neha Agarwal",
    phone: "9826088888",
    email: "neha.a@example.com",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    status: "active",
    membership: {
      planId: "p-4",
      planName: "12 Months Champion",
      startDate: daysAgo(120),
      endDate: daysAhead(245),
      autoRenew: true,
      amountPaid: 10400
    },
    weeklyGoalDays: 5,
    streak: { current: 18, max: 20, restDaysApprovedThisWeek: 1 },
    lastCheckIn: daysAgo(0) + " 06:30 AM",
    absentDaysCount: 0,
    assignedTrainer: "tr-2",
    communicationConsent: true,
    optedOutWhatsapp: false,
    notes: "Zumba & Strength enthusiast."
  },

  // 9. Rohan Mehta - High Risk (15 Days Absent)
  {
    id: "m-9",
    name: "Rohan Mehta",
    phone: "9826099999",
    email: "rohan.m@example.com",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    status: "active",
    membership: {
      planId: "p-1",
      planName: "1 Month Fitness",
      startDate: daysAgo(20),
      endDate: daysAhead(10),
      autoRenew: false,
      amountPaid: 1620
    },
    weeklyGoalDays: 4,
    streak: { current: 0, max: 5, restDaysApprovedThisWeek: 0 },
    lastCheckIn: daysAgo(15) + " 07:45 AM",
    absentDaysCount: 15,
    assignedTrainer: "tr-1",
    communicationConsent: true,
    optedOutWhatsapp: false,
    notes: "Needs coach check-in."
  },

  // 10. Kavita Jain - Expiring in 6 days
  {
    id: "m-10",
    name: "Kavita Jain",
    phone: "9826010101",
    email: "kavita.j@example.com",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
    status: "active",
    membership: {
      planId: "p-2",
      planName: "3 Months Power",
      startDate: daysAgo(84),
      endDate: daysAhead(6),
      autoRenew: false,
      amountPaid: 4080
    },
    weeklyGoalDays: 4,
    streak: { current: 3, max: 9, restDaysApprovedThisWeek: 0 },
    lastCheckIn: daysAgo(1) + " 05:30 PM",
    absentDaysCount: 1,
    assignedTrainer: "tr-2",
    communicationConsent: true,
    optedOutWhatsapp: false,
    notes: "Interested in 6-month upgrade."
  },

  // Additional 20 realistic Indian members to make 30 total
  { id: "m-11", name: "Manish Tiwari", phone: "9826010102", email: "manish.t@example.com", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-3", planName: "6 Months Transformation", startDate: daysAgo(10), endDate: daysAhead(170), autoRenew: true, amountPaid: 6750 }, weeklyGoalDays: 4, streak: { current: 8, max: 8 }, lastCheckIn: daysAgo(0) + " 07:00 AM", absentDaysCount: 0, assignedTrainer: "tr-1", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-12", name: "Sneha Reddi", phone: "9826010103", email: "sneha.r@example.com", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-1", planName: "1 Month Fitness", startDate: daysAgo(25), endDate: daysAhead(5), autoRenew: false, amountPaid: 1620 }, weeklyGoalDays: 3, streak: { current: 2, max: 4 }, lastCheckIn: daysAgo(1) + " 06:00 PM", absentDaysCount: 1, assignedTrainer: "tr-2", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-13", name: "Gaurav Joshi", phone: "9826010104", email: "gaurav.j@example.com", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-2", planName: "3 Months Power", startDate: daysAgo(70), endDate: daysAhead(20), autoRenew: true, amountPaid: 4080 }, weeklyGoalDays: 5, streak: { current: 15, max: 30 }, lastCheckIn: daysAgo(0) + " 08:15 AM", absentDaysCount: 0, assignedTrainer: "tr-3", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-14", name: "Pooja Deshmukh", phone: "9826010105", email: "pooja.d@example.com", avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-4", planName: "12 Months Champion", startDate: daysAgo(200), endDate: daysAhead(165), autoRenew: true, amountPaid: 10400 }, weeklyGoalDays: 4, streak: { current: 9, max: 21 }, lastCheckIn: daysAgo(0) + " 07:45 AM", absentDaysCount: 0, assignedTrainer: "tr-2", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-15", name: "Tarun Saxena", phone: "9826010106", email: "tarun.s@example.com", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-3", planName: "6 Months Transformation", startDate: daysAgo(50), endDate: daysAhead(130), autoRenew: false, amountPaid: 6750 }, weeklyGoalDays: 4, streak: { current: 0, max: 12 }, lastCheckIn: daysAgo(16) + " 06:45 PM", absentDaysCount: 16, assignedTrainer: "tr-1", communicationConsent: true, optedOutWhatsapp: false }, // High Risk #5
  { id: "m-16", name: "Ritu Singhal", phone: "9826010107", email: "ritu.s@example.com", avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-2", planName: "3 Months Power", startDate: daysAgo(85), endDate: daysAhead(5), autoRenew: false, amountPaid: 4080 }, weeklyGoalDays: 3, streak: { current: 1, max: 7 }, lastCheckIn: daysAgo(2) + " 05:00 PM", absentDaysCount: 2, assignedTrainer: "tr-2", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-17", name: "Alok Kumar", phone: "9826010108", email: "alok.k@example.com", avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-4", planName: "12 Months Champion", startDate: daysAgo(150), endDate: daysAhead(215), autoRenew: true, amountPaid: 10400 }, weeklyGoalDays: 5, streak: { current: 22, max: 40 }, lastCheckIn: daysAgo(0) + " 06:15 AM", absentDaysCount: 0, assignedTrainer: "tr-3", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-18", name: "Megha Nambiar", phone: "9826010109", email: "megha.n@example.com", avatar: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-1", planName: "1 Month Fitness", startDate: daysAgo(15), endDate: daysAhead(15), autoRenew: false, amountPaid: 1620 }, weeklyGoalDays: 4, streak: { current: 5, max: 5 }, lastCheckIn: daysAgo(0) + " 07:15 AM", absentDaysCount: 0, assignedTrainer: "tr-2", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-19", name: "Varun Bajaj", phone: "9826010110", email: "varun.b@example.com", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-2", planName: "3 Months Power", startDate: daysAgo(30), endDate: daysAhead(60), autoRenew: false, amountPaid: 4080 }, weeklyGoalDays: 4, streak: { current: 0, max: 11 }, lastCheckIn: daysAgo(19) + " 08:00 AM", absentDaysCount: 19, assignedTrainer: "tr-1", communicationConsent: true, optedOutWhatsapp: false }, // High Risk #6
  { id: "m-20", name: "Kritika Saini", phone: "9826010111", email: "kritika.s@example.com", avatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-3", planName: "6 Months Transformation", startDate: daysAgo(89), endDate: daysAhead(1), autoRenew: false, amountPaid: 6750 }, weeklyGoalDays: 4, streak: { current: 6, max: 12 }, lastCheckIn: daysAgo(0) + " 06:45 AM", absentDaysCount: 0, assignedTrainer: "tr-2", communicationConsent: true, optedOutWhatsapp: false }, // Expiring in 1 day (#5)
  { id: "m-21", name: "Deepak Chouhan", phone: "9826010112", email: "deepak.c@example.com", avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-4", planName: "12 Months Champion", startDate: daysAgo(100), endDate: daysAhead(265), autoRenew: true, amountPaid: 10400 }, weeklyGoalDays: 5, streak: { current: 14, max: 28 }, lastCheckIn: daysAgo(0) + " 07:30 AM", absentDaysCount: 0, assignedTrainer: "tr-1", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-22", name: "Simran Kaur", phone: "9826010113", email: "simran.k@example.com", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-2", planName: "3 Months Power", startDate: daysAgo(10), endDate: daysAhead(80), autoRenew: true, amountPaid: 4080 }, weeklyGoalDays: 4, streak: { current: 7, max: 7 }, lastCheckIn: daysAgo(0) + " 05:45 PM", absentDaysCount: 0, assignedTrainer: "tr-3", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-23", name: "Abhishek Pandey", phone: "9826010114", email: "abhishek.p@example.com", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-1", planName: "1 Month Fitness", startDate: daysAgo(5), endDate: daysAhead(25), autoRenew: false, amountPaid: 1620 }, weeklyGoalDays: 3, streak: { current: 3, max: 3 }, lastCheckIn: daysAgo(0) + " 08:30 AM", absentDaysCount: 0, assignedTrainer: "tr-1", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-24", name: "Bhavna Mishra", phone: "9826010115", email: "bhavna.m@example.com", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-3", planName: "6 Months Transformation", startDate: daysAgo(75), endDate: daysAhead(105), autoRenew: true, amountPaid: 6750 }, weeklyGoalDays: 4, streak: { current: 11, max: 15 }, lastCheckIn: daysAgo(0) + " 06:15 PM", absentDaysCount: 0, assignedTrainer: "tr-2", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-25", name: "Nitin Bhasin", phone: "9826010116", email: "nitin.b@example.com", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-4", planName: "12 Months Champion", startDate: daysAgo(300), endDate: daysAhead(65), autoRenew: true, amountPaid: 10400 }, weeklyGoalDays: 5, streak: { current: 35, max: 45 }, lastCheckIn: daysAgo(0) + " 07:00 AM", absentDaysCount: 0, assignedTrainer: "tr-3", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-26", name: "Payal Dutt", phone: "9826010117", email: "payal.d@example.com", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-2", planName: "3 Months Power", startDate: daysAgo(15), endDate: daysAhead(75), autoRenew: false, amountPaid: 4080 }, weeklyGoalDays: 3, streak: { current: 4, max: 6 }, lastCheckIn: daysAgo(1) + " 07:30 AM", absentDaysCount: 1, assignedTrainer: "tr-2", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-27", name: "Kunal Kapoor", phone: "9826010118", email: "kunal.k@example.com", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-1", planName: "1 Month Fitness", startDate: daysAgo(12), endDate: daysAhead(18), autoRenew: false, amountPaid: 1620 }, weeklyGoalDays: 4, streak: { current: 2, max: 4 }, lastCheckIn: daysAgo(1) + " 08:00 AM", absentDaysCount: 1, assignedTrainer: "tr-1", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-28", name: "Divya Nanda", phone: "9826010119", email: "divya.n@example.com", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-3", planName: "6 Months Transformation", startDate: daysAgo(40), endDate: daysAhead(140), autoRenew: true, amountPaid: 6750 }, weeklyGoalDays: 5, streak: { current: 16, max: 20 }, lastCheckIn: daysAgo(0) + " 06:45 AM", absentDaysCount: 0, assignedTrainer: "tr-2", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-29", name: "Yashvardhan Rathore", phone: "9826010120", email: "yash.r@example.com", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-4", planName: "12 Months Champion", startDate: daysAgo(80), endDate: daysAhead(285), autoRenew: true, amountPaid: 10400 }, weeklyGoalDays: 5, streak: { current: 29, max: 30 }, lastCheckIn: daysAgo(0) + " 07:15 AM", absentDaysCount: 0, assignedTrainer: "tr-3", communicationConsent: true, optedOutWhatsapp: false },
  { id: "m-30", name: "Isha Wadhwa", phone: "9826010121", email: "isha.w@example.com", avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80", status: "active", membership: { planId: "p-2", planName: "3 Months Power", startDate: daysAgo(5), endDate: daysAhead(85), autoRenew: false, amountPaid: 4080 }, weeklyGoalDays: 4, streak: { current: 3, max: 3 }, lastCheckIn: daysAgo(0) + " 06:00 PM", absentDaysCount: 0, assignedTrainer: "tr-2", communicationConsent: true, optedOutWhatsapp: false }
];

export const INITIAL_NO_SHOW_CASES = [
  { id: "ns-1", memberId: "m-3", memberName: "Amit Patel", phone: "9826033333", absentDays: 14, lastCheckIn: daysAgo(14), status: "OPEN", assignedTrainer: "tr-1", lastFollowUp: null, outcomeHistory: [] },
  { id: "ns-2", memberId: "m-5", memberName: "Vikramaditya Singh", phone: "9826055555", absentDays: 18, lastCheckIn: daysAgo(18), status: "IN_PROGRESS", assignedTrainer: "tr-1", lastFollowUp: daysAgo(2), outcomeHistory: [{ date: daysAgo(2), outcome: "Injured", note: "Mild knee strain. Returning next week.", nextActionDate: daysAhead(3), followUpBy: "Coach Vikram" }] },
  { id: "ns-3", memberId: "m-7", memberName: "Sanjay Gupta", phone: "9826077777", absentDays: 11, lastCheckIn: daysAgo(11), status: "OPEN", assignedTrainer: "tr-3", lastFollowUp: null, outcomeHistory: [] },
  { id: "ns-4", memberId: "m-9", memberName: "Rohan Mehta", phone: "9826099999", absentDays: 15, lastCheckIn: daysAgo(15), status: "OPEN", assignedTrainer: "tr-1", lastFollowUp: null, outcomeHistory: [] },
  { id: "ns-5", memberId: "m-15", memberName: "Tarun Saxena", phone: "9826010106", absentDays: 16, lastCheckIn: daysAgo(16), status: "OPEN", assignedTrainer: "tr-1", lastFollowUp: null, outcomeHistory: [] },
  { id: "ns-6", memberId: "m-19", memberName: "Varun Bajaj", phone: "9826010110", absentDays: 19, lastCheckIn: daysAgo(19), status: "OPEN", assignedTrainer: "tr-1", lastFollowUp: null, outcomeHistory: [] }
];

export const INITIAL_ATTENDANCE_LOGS = [
  { id: "att-101", memberId: "m-1", memberName: "Rahul Sharma", timestamp: daysAgo(0) + " 07:15 AM", method: "QR_SELF", status: "SUCCESS", device: "Member iPhone" },
  { id: "att-102", memberId: "m-8", memberName: "Neha Agarwal", timestamp: daysAgo(0) + " 06:30 AM", method: "QR_SELF", status: "SUCCESS", device: "Member Android" },
  { id: "att-103", memberId: "m-11", memberName: "Manish Tiwari", timestamp: daysAgo(0) + " 07:00 AM", method: "QR_SELF", status: "SUCCESS", device: "Member Android" },
  { id: "att-104", memberId: "m-13", memberName: "Gaurav Joshi", timestamp: daysAgo(0) + " 08:15 AM", method: "ASSISTED", reason: "Phone battery dead", staffId: "staff-1", staffName: "Rohan Verma", status: "SUCCESS" },
  { id: "att-105", memberId: "m-17", memberName: "Alok Kumar", timestamp: daysAgo(0) + " 06:15 AM", method: "QR_SELF", status: "SUCCESS", device: "Member iPhone" },
  { id: "att-106", memberId: "m-20", memberName: "Kritika Saini", timestamp: daysAgo(0) + " 06:45 AM", method: "QR_SELF", status: "SUCCESS", device: "Member Android" },
  { id: "att-107", memberId: "m-21", memberName: "Deepak Chouhan", timestamp: daysAgo(0) + " 07:30 AM", method: "QR_SELF", status: "SUCCESS", device: "Member Android" }
];

export const INITIAL_PAYMENTS = [
  { id: "pay-501", orderId: "ord-881", memberId: "m-1", memberName: "Rahul Sharma", planId: "p-2", planName: "3 Months Power", amount: 4080, provider: "RAZORPAY_UPI", status: "PAID", transactionRef: "pay_N83a71bK9a81", timestamp: daysAgo(45) + " 10:14 AM", idempotencyKey: "ik_renew_m1_45d" },
  { id: "pay-502", orderId: "ord-882", memberId: "m-8", memberName: "Neha Agarwal", planId: "p-4", planName: "12 Months Champion", amount: 10400, provider: "PHONEPE_UPI", status: "PAID", transactionRef: "T260927110091", timestamp: daysAgo(120) + " 04:30 PM", idempotencyKey: "ik_renew_m8_120d" },
  { id: "pay-503", orderId: "ord-883", memberId: "m-2", memberName: "Priya Verma", planId: "p-1", planName: "1 Month Fitness", amount: 1620, provider: "GPAY_UPI", status: "PAID", transactionRef: "UPI-992182738192", timestamp: daysAgo(27) + " 11:20 AM", idempotencyKey: "ik_renew_m2_27d" }
];

export const INITIAL_ADDON_ORDERS = [
  { id: "aoo-1", memberId: "m-1", memberName: "Rahul Sharma", addOnId: "ao-1", addOnName: "10-Session PT Booster (Coach Vikram)", price: 4500, status: "PAID", fulfilmentStatus: "ACTIVE", sessionsTotal: 10, sessionsUsed: 3, orderDate: daysAgo(10) },
  { id: "aoo-2", memberId: "m-8", memberName: "Neha Agarwal", addOnId: "ao-2", addOnName: "Customized High-Protein Diet Chart", price: 1499, status: "PAID", fulfilmentStatus: "DELIVERED", orderDate: daysAgo(15) },
  { id: "aoo-3", memberId: "m-17", memberName: "Alok Kumar", addOnId: "ao-3", addOnName: "ON Gold Standard Whey 1kg", price: 3200, status: "PAID", fulfilmentStatus: "FULFILLED", orderDate: daysAgo(5) }
];

export const INITIAL_AUDIT_LOGS = [
  { id: "log-1", timestamp: daysAgo(0) + " 08:15 AM", actor: "Rohan Verma (Front-Desk)", action: "ASSISTED_CHECKIN", target: "Gaurav Joshi (m-13)", details: "Reason: Phone battery dead. Mandatory reason logged." },
  { id: "log-2", timestamp: daysAgo(1) + " 05:00 PM", actor: "System Automation", action: "DAILY_NOSHOW_SCAN", target: "NoShowScan Engine", details: "Scanned 30 members. Identified 6 active risk cases >= 10 days." },
  { id: "log-3", timestamp: daysAgo(2) + " 06:10 PM", actor: "Coach Vikram", action: "FOLLOWUP_OUTCOME_LOGGED", target: "Vikramaditya Singh (m-5)", details: "Outcome: Injured. Next call scheduled for 3 days." }
];
