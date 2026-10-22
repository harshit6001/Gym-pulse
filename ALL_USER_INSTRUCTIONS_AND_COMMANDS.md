# GymPulse by Harshit — Master Log of All User Instructions, Commands & Changes

This document contains a complete, chronological, and categorized record of **all instructions, commands, requested updates, feature removals, and bug fixes** provided across the entire project lifecycle, along with the exact technical resolution and implementation details.

---

## Quick Navigation Index

1. [Chronological Log of All User Commands (Full History)](#1-chronological-log-of-all-user-commands)
2. [Categorized Breakdown of Requirements](#2-categorized-breakdown-of-requirements)
   - [A. Branding, Login Page & Authentication](#a-branding-login-page--authentication)
   - [B. Email Verification & Harshit.email Domain (Resend API)](#b-email-verification--harshitemail-domain-resend-api)
   - [C. Super Admin Panel & Multi-Tenancy Engine](#c-super-admin-panel--multi-tenancy-engine)
   - [D. Subscription Plans & Tiered Feature Access (Starter, Standard, Pro, Custom)](#d-subscription-plans--tiered-feature-access-starter-standard-pro-custom)
   - [E. Gym Owner Dashboard & Operations](#e-gym-owner-dashboard--operations)
   - [F. Member Portal & Mobile Experience](#f-member-portal--mobile-experience)
   - [G. Front Desk Terminal & Attendance Rules](#g-front-desk-terminal--attendance-rules)
   - [H. Data Cleanliness & Zero Dummy Data Policy](#h-data-cleanliness--zero-dummy-data-policy)
3. [Current Subscription Tier Matrix](#3-current-subscription-tier-matrix)
4. [Master File Mapping](#4-master-file-mapping)

---

## 1. Chronological Log of All User Commands

### Phase 1: Prototype Foundation & Architecture (Sep 27 – Sep 28, 2026)

#### Command 1.1 (Sep 27, 2026)
> *"Build a mobile-first Gym Retention App prototype for a local Indian gym. Primary business goal: Detect and prevent member drop-offs (churn) before subscriptions expire using a Red-List board, automated Hinglish messaging, and simple check-in tracking."*
- **Implementation**: Created the single-page prototype with tabs for Owner Churn Board, Member Portal, and Front Desk check-in.

#### Command 1.2 (Sep 27, 2026)
> *"i uploaded this on vercel, i found some errors, issues: 1. qr code not working 2. There is a single website for all owner, member, front desk"*
- **Implementation**: Separated authentication flows with distinct roles (Owner, Front Desk, Member), and integrated HTML5 QR scanner with fallback manual lookup.

#### Command 1.3 (Sep 27, 2026)
> *"clear all dummy data, and for owner also add login details and owner give the access to front desk"*
- **Implementation**: Removed static demo arrays, created owner authentication, and gave the gym owner the ability to provision front-desk staff accounts.

#### Command 1.4 (Sep 27 – Sep 28, 2026)
> *"user cant access to the owner data, add backend to save 10000+ users data there some bugs resolve them"*
> *"my this project is live on vercel and uploaded on github now, i dont want dummy data i want real data"*
- **Implementation**: Integrated live Supabase PostgreSQL backend (`members`, `gyms`, `staff`, `attendance_logs`, `payments`, `no_show_cases`), added indexing on phone numbers, and implemented secure tenant isolation via `gym_id`.

#### Command 1.5 (Sep 28, 2026)
> *"this is not working on iphone 13 safari analyze the issue and resolve it & make the screen oriented properly"*
- **Implementation**: Added iOS Safari viewport fixes, camera constraints (`facingMode: "environment"`), and safe-area padding (`pb-safe`) for notched devices.

#### Command 1.6 (Sep 28, 2026)
> *"gym owner ka registration sirf admin krega, owner k pas uske name, password and details change krne ka option rhega"*
- **Implementation**: Restricted gym tenant creation exclusively to Super Admin. Gym owners only receive credentials from Super Admin and can manage their profile in Settings.

---

### Phase 2: Super Admin System & Database Security (Oct 9, 2026)

#### Command 2.1 (Oct 9, 2026)
> *"admin panel is managed by me only with some secret way to enter and authenticate in admin panel, in admin panel there is list of gym owners and their details like number, name, address, active/pending/blocked status, and block access with reason"*
- **Implementation**: Built `SuperAdminPanel.jsx`, created gym accounts registry with status badges, and built block-reason modal.

#### Command 2.2 (Oct 9, 2026)
> *"make admin panel from the main url like in main url we press /#admin and then it asks for password and then only allows enter"*
- **Implementation**: Added `#admin` and `/#/admin` hash auto-detection on login screen + keyboard shortcut `Ctrl + Shift + A` (or `Cmd + Shift + A`) opening `SecretAdminAuthModal.jsx`.

#### Command 2.3 (Oct 9, 2026)
> *"this is showing, i want if any owner/gym access is revoked then after entering their respective credentials it shows the access is revoked with reason and contact support/admin prompt"*
- **Implementation**: Built the Access Revoked / Gym Suspended screen showing the exact admin-specified reason and contact support button.

#### Command 2.4 (Oct 9, 2026)
> *"Failed to run sql query: ERROR: 42804: foreign key constraint members_gym_id_fkey cannot be implemented"*
- **Implementation**: Resolved UUID vs TEXT column type mismatch in Supabase schema and updated `smartUpsert` in `db.js`.

---

### Phase 3: Login UX, Member Controls & Strict Attendance Rules (Oct 18 – Oct 19, 2026)

#### Command 3.1 (Oct 18, 2026)
> *"fix all these perfectly - (login page):*
> *1. Replace 'Fit pulse Gym OS' with 'Gym Pulse by harshit' - on login page/main page*
> *2. on login window remove gym name, gym name shows only after login*
> *3. Remove 'gym owner portal' prompt*
> *4. Add password forget button for members and owner only*
> *5. In password section keep dark or remove hover from password hide button*
> *6. remove last line 'FitPulse Gym OS. Multi-Tenant platform'*
> *7. For members all required password and add a forget password button*
> *8. remove 'new member register' button from login page*
> *9. remove 'front desk staff terminal' prompt"*
- **Implementation**: Rebranded login screen to "GymPulse by Harshit", cleaned up cluttered prompts, removed public self-registration (members can only be enrolled by Owner/Staff), and styled dark eye-toggle buttons.

#### Command 3.2 (Oct 18, 2026)
> *"fix all these perfectly:*
> *1. Forget button added but not working it shows prompt only*
> *2. Replace 'Gym pulse by harshit' to 'GymPulse by Harshit'*
> *3. Add 'new member or register new member' button to owner panel and front desk panel*
> *4. After registration of a new member a password or login link delivers to his registered email and phone number one time only*
> *5. New member data updates on backend immediately & also shown on owner panel and front desk panel in registered users/members section."*
- **Implementation**: Added `AddMemberModal.jsx` to Owner and Front Desk panels, synced newly added members live to Supabase, and added credential delivery via WhatsApp/SMS/Email.

#### Command 3.3 (Oct 18, 2026)
> *"fix all these perfectly:*
> *1. No login link delivers to registered email and phone number*
> *2. in owners panel there is a section of add new member and in there is a option of date and in that the calendar toggle is not visible*
> *3. new gym member data is not updates on backend and visible on backend as well as owner panel and front desk panel*
> *4. add members data on front desk panel*
> *5. add proper otp authentication for forget password*
> *6. owner change their subscription type and amount & update all necessary things related to them"*
- **Implementation**: Fixed date input calendar picker, unified multi-panel member sync, and added live database triggers.

#### Command 3.4 (Oct 18, 2026)
> *"fix all these perfectly:*
> *1. new gym members, all members data is not shown on owners dashboard*
> *2. add otp authentication for forget password and otp must be delivers to the registered email and phone number*
> *3. owner have the access of changing the gym fees.*
> *4. remove check in spam via qr and manually, shows the list of last entry detail of each member individually*
> *5. remove 'Click icon to pick' line from owner and front desk panel*
> *6. temp password or permanent password not shown to front desk or owner, it must be confidential*
> *7. In front desk panel remove word 'reason:' inside todays verified gate logs*
> *8. remove 'Gym subscription & billing tier' edit access from owners dashboard it only shows the current subscription plan & other plans only nothing else*
> *9. All members list is not showing on owners panel*
> *10. backend data, front desk data and owners data does not linking properly and fetching properly - these are not showing the correct data, details like today's visit, active members, renewal collection, etc*
> *11. add a 'total members' number on owners panel near 'Active members' & also add it on front desk panel*
> *12. remove dummy data & dont use local storage & stop using it*
> *13. Owner have the access of changing gym fees and their title"*
- **Implementation**:
  - Enforced strict 24-hour duplicate check-in prevention.
  - Added total registered members counter.
  - Made member passwords confidential (hashed/masked).
  - Made gym plans editable in Owner panel (pricing plans).
  - Locked gym subscription billing tier from owner self-upgrades (view-only).
  - Cleaned redundant UI strings ("Click icon to pick", "reason:").

#### Command 3.5 (Oct 18, 2026)
> *"fix this properly, i want on every password forget send a direct email or sms via whatsapp or text directly to their registered email and phone number automatically, dont show otp here.*
> *& for every gym there is their own rules, prices, earnings and members, remove data spamming and false data, dont mix data of different gyms."*
- **Implementation**: Multi-tenant data segregation enforced with `gym_id` on all queries.

---

### Phase 4: Production Email Pipeline & Resend Integration (Oct 19 – Oct 20, 2026)

#### Command 4.1 (Oct 19, 2026)
> *"remove forget button from login page"*
> *"fix all these perfectly: 1. remove forget password from login page and all their related code and files if not needed anymore 2. remove 'verify registered email address' button from login page, it verifies only at the time of account registration or whenever necessary only"*
- **Implementation**: Removed public forget password buttons and public verification buttons from the login screen.

#### Command 4.2 (Oct 19, 2026)
> *"fix all these perfectly:*
> *1. compulsory to enter 10 digit number only, not less or greater*
> *2. on new member registration make email requirement compulsory, not optional*
> *3. on registration of new member there is a button of send email make them work with single tap like sms & whatsapp"*
- **Implementation**:
  - Enforced exact 10-digit numeric phone validation (`^[0-9]{10}$`).
  - Marked email as a required input (`required`) on member registration.
  - Added single-tap `mailto:` credential dispatch alongside WhatsApp and SMS.

#### Command 4.3 (Oct 19, 2026)
> *"Delete all temporary code, unuseful code and files. Fix all these perfectly:*
> *1. After pressing send email my chrome browser in mac open 2 tabs immediately for sending mail one on the current tab and second a new tab*
> *2. in email remove 'Email verification link' whole line*
> *3. Only owner have the access of reset any member password*
> *4. Owner have the right to delete any user along with pause and unpause*
> *5. Qr code scanning or manual only 1 in every 24 hours strictly and owner & front desk have special calendar to add holidays, sundays then that day automatically a streak add to member or dont break their streaks because of these days, also show that special days, dates to members*
> *6. In owner dashboard there is a filter to check the stats, filter like 24 hours, 7 days, 30 days, etc*
> *7. Make everything works perfectly and fluently without any blunder or issue in my whole project"*
- **Implementation**:
  - Prevented duplicate tab opening on email button click.
  - Removed "Email verification link" line from welcome email copies.
  - Gave Owner permanent Delete Member capability with confirmation dialog.
  - Created Special Calendar with auto-streak preservation on Sundays and holidays.
  - Added 24h / 7d / 30d / All-Time analytics filter on Owner dashboard.

#### Command 4.4 (Oct 20, 2026)
> *"Just now i bought a Harshit.email domain so that i send mails via resend without any issue, problem and hustle so implement it perfectly and tell me what should i do now, and dont change other things, for now i just want to deliver forget mails, & want my whole projects live/works via vercel link"*
- **Implementation**:
  - Configured Resend serverless endpoints (`api/send-verification.js`, `api/reset-password.js`, `api/verify-email.js`).
  - Configured sender identity `onboarding@harshit.email` / `GymPulse <support@harshit.email>`.
  - Provided DNS records (DKIM, SPF, MX) for `harshit.email`.

#### Command 4.5 (Oct 21, 2026)
> *"password reset link 24 hrs baad bhi expire nhi ho rhi h and i want ki link only single time use rhe & 60 min baad link automatically expire ho jaye"*
- **Implementation**: Built cryptographic timestamped tokens expiring after strictly 60 minutes (`exp = Date.now() + 60 * 60 * 1000`) and marked as single-use upon successful reset.

---

### Phase 5: Super Admin Multi-Tier Subscription Engine (Oct 21 – Oct 22, 2026)

#### Command 5.1 (Oct 21, 2026)
> *"Some work in admin panel now: in old gym as well as in new gym there is a option to edit the gym subscription type, account/access block with a reason, remove dummy/fake data/enteries, along with a feature to the change the subscription charge/amount & make whole project proper responsive"*
- **Implementation**:
  - Added Edit Gym modal in Super Admin (plan tier, custom price, feature toggles).
  - Built Data Purge / Clean Dummy Data tool.
  - Fully mobile-responsive table and card layouts across the Super Admin panel.

#### Command 5.2 (Oct 21, 2026)
> *"verify all email ids via sending unique code at the time of registration and for old users they can verify it anytime & in owner and members/clients panel there is a option to change password permanently that updates on backend immediately. in gym owner remove the option of 'reset pass' for members/clients"*
- **Implementation**:
  - Generated unique 6-digit verification code (`Math.floor(100000 + Math.random() * 900000)`).
  - Removed member password reset modal from Owner panel (members manage their own credentials).
  - Added Change Password cards in both Owner and Member settings.

#### Command 5.3 (Oct 22, 2026)
> *"in admin panel, there is 3 major subscription plan ie starter, standard and pro & their amount is 2499, 4499, 6999 respectively & 1 another custom, also for custom plan there is option that feature i want to provides with a single toggle on & off, & in starter, standard and pro there is features according to the plan and also add a toggle to enable and disable features"*
- **Implementation**:
  - Created `src/data/subscriptionPlans.js` defining:
    - **Starter** (₹2,499/mo)
    - **Standard** (₹4,499/mo)
    - **Pro** (₹6,999/mo)
    - **Custom** (Custom monthly charge)
  - Built `SubscriptionFeatureToggles.jsx` component allowing single-click granular toggling of modules.

#### Command 5.4 (Oct 22, 2026)
> *"there are many errors resolve all them, some of the errors are - in admin panel the reset button is not working properly the reset pass will not update in the backend, same with the new gym onboarding, email verification is not working properly in admin panel as well as other panels. Remove all the dummy data, and make it ready for use"*
> *"onboard new gyms doesnt save/created successfully, they are not updating on admin panel as well as backend"*
- **Implementation**:
  - Fixed `db.js` `updateOwnerPassword` to update both `owner_password` column and JSONB settings.
  - Fixed gym onboarding to immediately insert to Supabase `gyms` table with fallback UUID mapping.
  - Fixed email verification endpoint parsing and status updates in Supabase.

#### Command 5.5 (Oct 22, 2026)
> *"do these changes and updates:*
> *1. for new gym members create a random password and it's length min 6 and max 10.*
> *2. after registration a new member, after pressing send email it opens on a new tap not on the same.*
> *3. for new members only, verification of email is at the time of first time login and the email verify code is send at the time of registration or similar.*
> *4. features available to the members, owner, front desk if applicable according to the subscription plan by the gym owner.*
> *5. in owner panel, in 'Gym Subscription & Billing Tier' shows only starter, standard and pro and custom if applicable, and dont show the 'Provisioned Modules & Feature Access'*
> *6. in owner and member panels after verify the email, dont show the option to verify their email again and again, it shows only if anyone updates/changes their email and after verification of email remove this and add change email option.*
> *do it perfectly and check other features that it works perfectly if not update them accordingly"*
- **Implementation**:
  1. Implemented random password generator between 6 and 10 characters (`generateRandomPassword()`).
  2. Forced email links to open with `target="_blank" rel="noopener noreferrer"`.
  3. Enforced email verification gate on **first-time member login**: members enter their 6-digit code dispatched upon registration before accessing their dashboard.
  4. Enforced plan-based feature provisioning dynamically across Member, Owner, and Front Desk views.
  5. Cleaned Owner Dashboard subscription card to only show tier badge, pricing, and status without the modules list.
  6. Email verification state: Once verified, the verify button disappears and is replaced by a verified badge and a **Change Email** modal.

#### Command 5.6 (Oct 22, 2026)
> *"tell me which features are available in starter, standard & pro"*
- **Implementation**: Provided comprehensive tier breakdown and comparison matrix.

#### Command 5.7 (Oct 22, 2026)
> *"do some updates:*
> *in starter pack - there is only 2 panels, owner and members there is no front desk*
> *- user streaks is only via owner manual tap*
> *in standard pack - no whatsapp automation & reminders*
> *and tell me best features or something to update anything*
> *and check every feature of my project that it works perfectly without any issue and bug, resolve if found any*
> *in admin panels everything is not linked perfectly from backend or from other panels like members, details, etc"*
- **Implementation**:
  - **Starter Pack**: Blocked staff login and front-desk terminal; QR scan logs attendance but does not auto-advance streak; added `🔥 +1 Streak` manual tap button on Owner member cards.
  - **Standard Pack**: Removed `whatsapp_reminders` from Standard; hidden all WhatsApp actions in Red-List board, Add Member modal, and Member portal.
  - **Super Admin Linking**:
    - Connected platform-wide live data loading (`fetchMembers(null)`, `fetchStaff(null)`, `fetchPayments(null)`).
    - Added **Members Directory** tab in Super Admin with search and gym filter.
    - Added **Inspect Gym & Members** modal with Members Roster, Staff Accounts, and Check-In History tabs.
    - Added **Open Owner Dashboard** one-click administrative login.
    - Added member pause/unpause and permanent delete actions in Super Admin.
    - Cascade deletion in `deleteGymFromDb` to eliminate foreign-key database errors.

---

## 2. Categorized Breakdown of Requirements

### A. Branding, Login Page & Authentication
- **Project Brand**: "GymPulse by Harshit" across all headers, titles, and email templates.
- **Login Screen UI**:
  - Clean segment switcher for **Member**, **Owner**, **Staff**.
  - All roles require their registered **10-digit phone number** and **password / PIN**.
  - No public registration buttons (all accounts are provisioned by Admin/Owner).
  - No public forgot password buttons on the main page.
  - Hidden Super Admin entrance via `/#admin` URL hash or `Ctrl + Shift + A`.
- **Password Security**:
  - Random passwords generated automatically on member creation (length 6 to 10 chars).
  - Members and owners can change their password securely inside Settings.
  - Passwords masked by default with dark non-hover eye icon.

### B. Email Verification & Harshit.email Domain (Resend API)
- **Domain**: Powered by `harshit.email` via official Resend API integration.
- **Dispatch**: Unique 6-digit verification code sent at the time of member/gym registration.
- **Verification Workflow**:
  - For new members, verification is required **at first-time login** before the member dashboard opens.
  - Once verified, the prompt disappears permanently and displays a green `✓ Verified` badge.
  - If the user changes their email address, the verification status resets to unverified and a new 6-digit code is dispatched.
  - Single-use 60-minute expiry on password reset links.

### C. Super Admin Panel & Multi-Tenancy Engine
- **Access**: Master Passcode protected (`Admin@2026Master#` by default, customizable in Security tab).
- **Gym Lifecycle**:
  - Onboard new gym with name, owner name, phone, email, temporary password, plan tier, and monthly fee.
  - Edit existing gym subscription tier, individual feature flags, and fee.
  - Revoke/block gym access with custom or pre-set reason (unpaid fees, policy violations).
  - One-click temporary password reset for gym owners.
  - Safe gym deletion that cleans up all related tenant records in Supabase.
- **Cross-Panel Live Data Linking**:
  - Live member count per gym queried directly from PostgreSQL `members` table.
  - Platform-wide **Members Directory** with live search by name, phone, email, and gym filter.
  - **Inspect Gym Modal** with sub-tabs for Members Roster, Staff Accounts, and Check-In History.
  - One-click administrative login into any tenant's Owner Dashboard.
  - Platform data refresh button syncing live database state on demand.

### D. Subscription Plans & Tiered Feature Access
- **Starter Plan (₹2,499/mo)**:
  - strictly **2 panels only**: Owner Dashboard and Member Portal.
  - **NO front desk** terminal access and **NO staff accounts**.
  - Member workout streaks are **ONLY incremented via Owner manual tap** (`🔥 +1 Streak`).
  - No WhatsApp automation.
- **Standard Plan (₹4,499/mo)**:
  - Includes Owner, Member, and Front Desk panels with staff PIN accounts.
  - Automatic streak increment on QR check-in.
  - Churn detection Red-List board and growth analytics.
  - **NO WhatsApp automation & reminders**.
- **Pro Suite (₹6,999/mo)**:
  - All features from Standard.
  - **Full WhatsApp Automation & Reminders** (1-click Hinglish messaging, expiry reminders).
  - Custom WhatsApp / message templates.
  - Personal Training (PT) session tracker, supplement store POS, and platform audit logs.
- **Custom Plan**:
  - Customizable tier title and monthly charge.
  - Granular on/off toggle for each individual system feature.

### E. Gym Owner Dashboard & Operations
- **Subscription Overview**: Displays active plan badge, monthly fee, and active status without displaying provisioned module internals.
- **Member Management**:
  - Add new members with 10-digit phone, mandatory email, plan, and initial payment.
  - Manual streak tap button (`🔥 +1 Streak ({streak}d)`) to verify and award streak days.
  - Membership Pause and Unpause with custom medical/travel notes.
  - Permanent Member Delete with safety confirmation.
- **Red-List Churn Retention Board**:
  - Automatically flags members absent for $\ge 10$ consecutive days.
  - Direct call action (`tel:`) and Mark Outcome workflow.
  - WhatsApp button displayed strictly on Pro / Custom plans.
- **Analytics**: Performance KPI cards with 24 Hours, 7 Days, 30 Days, and All-Time filters.
- **Special Calendar**: Add Sundays and holidays with automatic streak preservation so member streaks don't break on gym closed days.

### F. Member Portal & Mobile Experience
- **Digital ID Card**: Live QR code for scanning at gym entry, membership countdown, and streak counter.
- **Verification & Settings**:
  - Email verification code entry on first-time login.
  - Permanent password update inside settings.
  - Change email option that re-triggers verification.
  - WhatsApp motivation opt-in/opt-out toggle (gated to Pro plans).

### G. Front Desk Terminal & Attendance Rules
- **Access Guard**: Available only on Standard and Pro plans; completely locked on Starter.
- **Strict 24-Hour Anti-Duplicate Rule**: A member can only check in once per 24-hour window across all methods.
- **Live Terminal Logs**: Displays verified gate check-ins with timestamps and member photos.

### H. Data Cleanliness & Zero Dummy Data Policy
- Zero static dummy records in production.
- Pure multi-tenant Supabase PostgreSQL synchronization.
- Super Admin Purge tool to clean test/demo entries safely.

---

## 3. Current Subscription Tier Matrix

| Feature / Module | Starter (₹2,499) | Standard (₹4,499) | Pro (₹6,999) | Custom |
| :--- | :---: | :---: | :---: | :---: |
| **Owner Dashboard** | ✅ | ✅ | ✅ | Optional Toggle |
| **Member Portal** | ✅ | ✅ | ✅ | Optional Toggle |
| **Front Desk Terminal** | ❌ (No) | ✅ | ✅ | Optional Toggle |
| **Staff PIN Logins** | ❌ (No) | ✅ | ✅ | Optional Toggle |
| **Streak Increment Mode** | 🖐️ **Owner Tap Only** | ⚡ **Auto (QR Scan)** | ⚡ **Auto (QR Scan)** | Configurable |
| **No-Show Churn Board** | ❌ | ✅ | ✅ | Optional Toggle |
| **WhatsApp Automation** | ❌ | ❌ | ✅ | Optional Toggle |
| **Custom Templates** | ❌ | ❌ | ✅ | Optional Toggle |
| **PT Session Tracker** | ❌ | ❌ | ✅ | Optional Toggle |
| **Add-On Store POS** | ❌ | ❌ | ✅ | Optional Toggle |
| **Full Audit Trail Logs** | ❌ | ❌ | ✅ | Optional Toggle |

---

## 4. Master File Mapping

| File Path | Core Responsibility |
| :--- | :--- |
| [`src/App.jsx`](file:///Users/harshitagarwal/Downloads/gym%20project/src/App.jsx) | Root state, routing guards (Starter frontdesk block), manual streak handler, platform data fetching |
| [`src/components/SuperAdminPanel.jsx`](file:///Users/harshitagarwal/Downloads/gym%20project/src/components/SuperAdminPanel.jsx) | Multi-tenant gym management, Members Directory, Inspect Gym modal, live stats |
| [`src/components/OwnerDashboard.jsx`](file:///Users/harshitagarwal/Downloads/gym%20project/src/components/OwnerDashboard.jsx) | Owner KPI stats, manual streak increment tap, member list, Pro-gated WhatsApp triggers |
| [`src/components/MemberView.jsx`](file:///Users/harshitagarwal/Downloads/gym%20project/src/components/MemberView.jsx) | Member digital QR pass, streak stats, email verification gate, change password/email |
| [`src/components/FrontDeskView.jsx`](file:///Users/harshitagarwal/Downloads/gym%20project/src/components/FrontDeskView.jsx) | Receptionist gate check-in terminal, 24h duplicate scanner block, special calendar |
| [`src/components/AddMemberModal.jsx`](file:///Users/harshitagarwal/Downloads/gym%20project/src/components/AddMemberModal.jsx) | Member enrollment, random password generator (6-10 chars), new-tab email dispatch |
| [`src/components/AuthScreen.jsx`](file:///Users/harshitagarwal/Downloads/gym%20project/src/components/AuthScreen.jsx) | Role login switcher (Member/Owner/Staff), first-time login verification gate, secret `#admin` entry |
| [`src/data/subscriptionPlans.js`](file:///Users/harshitagarwal/Downloads/gym%20project/src/data/subscriptionPlans.js) | Canonical definition of Starter, Standard, Pro, Custom tiers and module feature keys |
| [`src/lib/db.js`](file:///Users/harshitagarwal/Downloads/gym%20project/src/lib/db.js) | Supabase queries, staff login plan enforcement, live member count aggregation, cascade deletes |
| [`api/send-verification.js`](file:///Users/harshitagarwal/Downloads/gym%20project/api/send-verification.js) | Resend API serverless endpoint for dispatching 6-digit verification codes via `harshit.email` |
| [`api/verify-email.js`](file:///Users/harshitagarwal/Downloads/gym%20project/api/verify-email.js) | Verification endpoint validating 6-digit code and updating database verification status |
| [`api/reset-password.js`](file:///Users/harshitagarwal/Downloads/gym%20project/api/reset-password.js) | 60-minute single-use secure password reset token generation and handling |

---
*Maintained and logged automatically for GymPulse by Harshit.*
