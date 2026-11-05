# CDSure Tasks - Paid Daily Tasks & Referral Platform

A complete Nigerian paid tasks and referral platform built with:
- **Authentication**: Firebase Auth ONLY (Email/Password, Google OAuth)
- **Database**: Cloudflare D1 (Serverless SQLite with zero cold-starts)
- **Backend API**: Cloudflare Worker (`worker.js`) & Express (`server.ts` for local AI Studio environment)
- **Payments**: Paystack Inline Popup integration (₦1,500 one-off activation fee)
- **Frontend**: Responsive mobile-first Single Page App with Tailwind CSS

---

## ⚡ Business Logic & Architecture

1. **₦1,500 Activation Fee (Paystack)**:
   - New registered accounts are marked `is_activated = 0`.
   - Access to daily tasks and bank withdrawals is strictly blocked until activated.
   - Payments are initiated with Paystack Inline popup or direct API.
   - Upon successful verification, `is_activated = 1` is updated in Cloudflare D1.

2. **₦200 Instant Referral Rewards**:
   - Each user gets a unique referral code (`referral_code`) and viral link: `https://yourdomain.com/?ref=USERCODE`.
   - The frontend automatically captures `?ref=` and stores it in `localStorage`.
   - When a referred user pays their ₦1,500 activation fee, the referrer instantly receives **₦200 credited to their balance** in D1 and a record is saved to the `referrals` table.

3. **Daily Tasks**:
   - Tasks reset every 24 hours at 00:00 UTC.
   - Completed tasks are recorded in the `completions` table (`uid`, `task_id`, `date`) to prevent duplicate completions on the same day.
   - Earnings are credited to the user's D1 balance in real time.

4. **Bank Withdrawals**:
   - Direct withdrawals to all Nigerian commercial banks and fintechs (OPay, PalmPay, Kuda, Moniepoint, GTBank, Zenith, Access, etc.).
   - Minimum withdrawal: ₦500.

---

## 🚀 Cloudflare Deployment Guide (GitHub + Cloudflare Pages & Workers)

### 1. Create your Cloudflare D1 Database
```bash
npx wrangler d1 create cdsures-db
```
Copy the generated `database_id` into `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "cdsures-db"
database_id = "YOUR_ACTUAL_D1_DATABASE_ID"
```

### 2. Initialize the Database Schema
```bash
npx wrangler d1 execute cdsures-db --remote --file=./schema.sql
```

### 3. Deploy Cloudflare Worker & Assets
```bash
npx wrangler deploy
```
Or connect your GitHub repository to **Cloudflare Pages** with build command `npm run build` and root directory `/`.

---

## 💻 Local Development in AI Studio
The app includes an Express server with SQLite emulation in `server.ts` that implements the exact Cloudflare Worker endpoints and D1 schema.
```bash
npm run dev
```
Dev server runs on `http://localhost:3000`.
