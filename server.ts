import express, { Request, Response } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCOmIA6jTV6rmYMdM4x_YvvqkDCKeS1TpA';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cloudflare R2 bucket simulation storage folder
const uploadDir = path.resolve(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const cleanName = `proof_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, cleanName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use('/uploads', express.static(uploadDir));

// SQLite Database
const dbPath = path.resolve(__dirname, 'cdsure.db');
const db = new Database(dbPath);

// Ensure base tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    is_activated INTEGER DEFAULT 0,
    activation_payment_reference TEXT,
    activation_screenshot_url TEXT,
    referral_code TEXT,
    referred_by TEXT,
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    referral_earnings INTEGER DEFAULT 0,
    created_at TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    admin_confirmed_at TEXT,
    tasks_available_at TEXT
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    uid TEXT,
    amount INTEGER DEFAULT 2000,
    gateway TEXT DEFAULT 'bank_transfer',
    reference TEXT,
    tx_ref TEXT,
    status TEXT DEFAULT 'pending',
    proof_screenshot_url TEXT,
    r2_bucket TEXT DEFAULT 'cdsure-proofs',
    date TEXT,
    admin_confirmed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_uid TEXT,
    referred_uid TEXT,
    bonus INTEGER DEFAULT 200,
    date TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    reward INTEGER,
    link TEXT,
    instructions TEXT,
    category TEXT DEFAULT 'Social',
    expires_at TEXT
  );

  CREATE TABLE IF NOT EXISTS completions (
    id TEXT PRIMARY KEY,
    uid TEXT,
    task_id TEXT,
    proof_screenshot_url TEXT,
    status TEXT DEFAULT 'approved',
    submitted_at TEXT,
    reviewed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    uid TEXT,
    amount INTEGER,
    status TEXT DEFAULT 'pending',
    bank_name TEXT,
    account_number TEXT,
    account_name TEXT,
    date TEXT
  );

  CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY,
    uid TEXT,
    code TEXT,
    link_token TEXT,
    expires_at TEXT,
    verified INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    earner_id TEXT,
    status TEXT DEFAULT 'accepted',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    earner_id TEXT,
    proof_link TEXT,
    proof_text TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wallet (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,
    balance INTEGER DEFAULT 0,
    escrow_locked INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    task_id TEXT,
    amount INTEGER,
    type TEXT,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activation_payments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    email TEXT,
    amount INTEGER DEFAULT 1500,
    reference TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT 'paystack',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Ensure all required columns exist in SQLite tables
try { db.prepare('ALTER TABLE users ADD COLUMN id TEXT').run(); } catch (_) {}
try { db.prepare('ALTER TABLE users ADD COLUMN name TEXT').run(); } catch (_) {}
try { db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'earner'").run(); } catch (_) {}
try { db.prepare('ALTER TABLE users ADD COLUMN is_activated INTEGER DEFAULT 0').run(); } catch (_) {}
try { db.prepare('ALTER TABLE users ADD COLUMN activation_paid_at TEXT').run(); } catch (_) {}
try { db.prepare('ALTER TABLE tasks ADD COLUMN employer_id TEXT').run(); } catch (_) {}
try { db.prepare('ALTER TABLE tasks ADD COLUMN description TEXT').run(); } catch (_) {}
try { db.prepare('ALTER TABLE tasks ADD COLUMN price INTEGER DEFAULT 1000').run(); } catch (_) {}
try { db.prepare('ALTER TABLE tasks ADD COLUMN deadline TEXT').run(); } catch (_) {}
try { db.prepare("ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'open'").run(); } catch (_) {}
try { db.prepare('ALTER TABLE tasks ADD COLUMN created_at TEXT').run(); } catch (_) {}
try { db.prepare('ALTER TABLE users ADD COLUMN admin_confirmed_at TEXT').run(); } catch (_) {}
try { db.prepare('ALTER TABLE users ADD COLUMN tasks_available_at TEXT').run(); } catch (_) {}
try { db.prepare("ALTER TABLE users ADD COLUMN payment_status TEXT DEFAULT 'unpaid'").run(); } catch (_) {}
try { db.prepare('ALTER TABLE payments ADD COLUMN reference TEXT').run(); } catch (_) {}
try { db.prepare('ALTER TABLE payments ADD COLUMN admin_confirmed_at TEXT').run(); } catch (_) {}
try { db.prepare("ALTER TABLE payments ADD COLUMN r2_bucket TEXT DEFAULT 'cdsure-proofs'").run(); } catch (_) {}
try { db.prepare('ALTER TABLE activation_payments ADD COLUMN proof_image TEXT').run(); } catch (_) {}
try { db.prepare('ALTER TABLE activation_payments ADD COLUMN admin_note TEXT').run(); } catch (_) {}


function generateId() {
  return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

function generate6CharReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getTodayMidnightUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
}

function formatTime12h(isoStr?: string | null): string {
  if (!isoStr) return 'tomorrow';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (_) {
    return isoStr;
  }
}

function formatDateTimeNice(isoStr?: string | null): string {
  if (!isoStr) return 'tomorrow';
  try {
    const d = new Date(isoStr);
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `${date} at ${time}`;
  } catch (_) {
    return isoStr;
  }
}

// ================= API ENDPOINTS =================

// Helper to find a user by username, email, referral_code, or uid
function findUserByAnyIdentifier(identifier: string) {
  if (!identifier) return null;
  const clean = identifier.trim();
  return db
    .prepare(
      'SELECT * FROM users WHERE full_name = ? OR email = ? OR referral_code = ? OR uid = ?'
    )
    .get(clean, clean, clean.toUpperCase(), clean);
}

// 0A. GET /check-status?username=USERNAME (Also GET /api/check-status)
const handleCheckStatus = (req: Request, res: Response) => {
  try {
    const rawUsername = (req.query.username as string || req.query.uid as string || req.query.email as string || '').trim();
    if (!rawUsername) {
      return res.json({ status: 'not_found' });
    }

    const user: any = findUserByAnyIdentifier(rawUsername);
    if (!user) {
      return res.json({ status: 'not_found' });
    }

    // Check payment records in payments table
    const approvedPayment: any = db
      .prepare("SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified') ORDER BY date DESC LIMIT 1")
      .get(user.uid);

    const pendingPayment: any = db
      .prepare("SELECT * FROM payments WHERE uid = ? AND status IN ('pending', 'pending_admin', 'pending_approval') ORDER BY date DESC LIMIT 1")
      .get(user.uid);

    const now = new Date();
    const tasksAvailableAt = user.tasks_available_at ? new Date(user.tasks_available_at) : null;
    const isLocked24h = tasksAvailableAt ? now.getTime() < tasksAvailableAt.getTime() : false;

    // 1. Check if user is confirmed and waiting 24h OR fully active
    if (user.is_activated === 1 || approvedPayment) {
      if (isLocked24h) {
        return res.json({
          status: 'confirmed_waiting_24h',
          user,
          tasks_available_at: user.tasks_available_at,
          remaining_ms: tasksAvailableAt ? tasksAvailableAt.getTime() - now.getTime() : 0,
          formatted_start_time: formatDateTimeNice(user.tasks_available_at),
          same_time_tomorrow: formatTime12h(user.tasks_available_at),
          message: `Your payment is confirmed! Your account will be active for tasks after 24 hours. Please come back tomorrow at ${formatTime12h(user.tasks_available_at)}. This is for security verification.`,
        });
      }

      return res.json({
        status: 'active',
        user,
        balance: user.balance,
        total_earned: user.total_earned,
        referral_earnings: user.referral_earnings,
      });
    }

    // 2. Check if user has submitted payment proof awaiting admin confirmation
    if (
      pendingPayment ||
      user.payment_status === 'pending_approval' ||
      user.payment_status === 'pending_admin' ||
      user.activation_screenshot_url ||
      user.activation_payment_reference
    ) {
      const txId =
        pendingPayment?.reference ||
        pendingPayment?.tx_ref ||
        user.activation_payment_reference ||
        `CDS-${user.uid.slice(0, 8).toUpperCase()}`;

      const screenshot =
        pendingPayment?.proof_screenshot_url ||
        user.activation_screenshot_url ||
        null;

      return res.json({
        status: 'pending_approval',
        user,
        transaction_id: txId,
        screenshot_url: screenshot,
        amount: pendingPayment?.amount || 2000,
        submitted_at: pendingPayment?.date || user.created_at,
        message: 'We received your proof. Admin will verify within 2 hours. You will be notified.',
      });
    }

    // 3. User found but has not paid
    return res.json({
      status: 'not_found',
      user,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

app.get('/check-status', handleCheckStatus);
app.get('/api/check-status', handleCheckStatus);

// 0B. POST /submit-payment (Also POST /api/submit-payment)
// Handles FormData { username, screenshot (file/string), amount }
const handleSubmitPayment = (req: Request, res: Response) => {
  try {
    const rawUsername = (req.body.username || req.body.email || req.body.uid || '').trim();
    const rawAmount = parseInt(req.body.amount, 10);
    const amountPaid = isNaN(rawAmount) || rawAmount <= 0 ? 2000 : rawAmount;

    let screenshotUrl = '';
    const r2Bucket = 'cdsure-proofs';

    if (req.file) {
      screenshotUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.screenshot) {
      screenshotUrl = req.body.screenshot;
    }

    if (!rawUsername) {
      return res.status(400).json({ error: 'Username is required' });
    }

    let user: any = findUserByAnyIdentifier(rawUsername);
    const nowIso = new Date().toISOString();
    const transactionId = `CDS-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!user) {
      const newUid = `u_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const refCode = generate6CharReferralCode();
      const sanitizedEmail = rawUsername.includes('@')
        ? rawUsername.toLowerCase()
        : `${rawUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}@cdsure.com`;

      db.prepare(`
        INSERT INTO users (uid, email, full_name, is_activated, activation_payment_reference, activation_screenshot_url, referral_code, balance, total_earned, referral_earnings, created_at, payment_status)
        VALUES (?, ?, ?, 0, ?, ?, ?, 0, 0, 0, ?, 'pending_approval')
      `).run(newUid, sanitizedEmail, rawUsername, transactionId, screenshotUrl, refCode, nowIso);

      user = db.prepare('SELECT * FROM users WHERE uid = ?').get(newUid);
    } else {
      db.prepare(`
        UPDATE users 
        SET activation_payment_reference = ?,
            activation_screenshot_url = ?,
            payment_status = 'pending_approval'
        WHERE uid = ?
      `).run(transactionId, screenshotUrl, user.uid);
    }

    // Insert or update payment in D1 payments table
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT INTO payments (id, uid, amount, gateway, reference, tx_ref, status, proof_screenshot_url, r2_bucket, date)
      VALUES (?, ?, ?, 'bank_transfer', ?, ?, 'pending', ?, ?, ?)
    `).run(paymentId, user.uid, amountPaid, transactionId, transactionId, screenshotUrl, r2Bucket, nowIso);

    console.log(`[PAYMENT SUBMITTED] User: ${user.full_name || user.email} | TxId: ${transactionId} | Amount: ₦${amountPaid} | R2: ${r2Bucket}`);

    return res.json({
      success: true,
      status: 'pending_approval',
      transaction_id: transactionId,
      screenshot_url: screenshotUrl,
      r2_bucket: r2Bucket,
      amount: amountPaid,
      message: 'We received your proof. Admin will verify within 2 hours. You will be notified.',
      user,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

app.post('/submit-payment', upload.single('screenshot'), handleSubmitPayment);
app.post('/api/submit-payment', upload.single('screenshot'), handleSubmitPayment);

// Cloudflare D1 APIs
// 1. POST /api/users/sync
app.post('/api/users/sync', (req: Request, res: Response) => {
  try {
    const id = req.body.id || req.body.uid;
    const name = req.body.name || req.body.displayName || req.body.fullName || 'Member';
    const email = req.body.email || '';
    const role = req.body.role === 'employer' ? 'employer' : 'earner';

    if (!id) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    let existing: any = db.prepare('SELECT * FROM users WHERE id = ? OR uid = ?').get(id, id);
    if (existing) {
      let wallet: any = db.prepare('SELECT * FROM wallet WHERE user_id = ?').get(id);
      if (!wallet) {
        db.prepare('INSERT INTO wallet (id, user_id, balance, escrow_locked) VALUES (?, ?, ?, 0)').run(
          generateId(),
          id,
          existing.balance || 0
        );
      }

      // Employer never needs activation fee; Earners need payment unless already paid
      const isActivated = existing.role === 'employer' ? 1 : (existing.is_activated ? 1 : 0);

      return res.json({
        success: true,
        user: {
          id: existing.id || existing.uid,
          name: existing.name || existing.full_name || name,
          email: existing.email || email,
          role: existing.role || role,
          balance: existing.balance || 0,
          is_activated: isActivated,
          activation_paid_at: existing.activation_paid_at || null,
        },
        created: false,
      });
    }

    const nowIso = new Date().toISOString();
    // Employer active immediately; Earner must pay ₦1500 activation fee
    const initialActivation = role === 'employer' ? 1 : 0;

    db.prepare(`
      INSERT INTO users (id, uid, name, full_name, email, role, balance, is_activated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, id, name, name, email, role, initialActivation, nowIso);

    db.prepare('INSERT INTO wallet (id, user_id, balance, escrow_locked) VALUES (?, ?, 0, 0)').run(
      generateId(),
      id
    );

    return res.json({
      success: true,
      user: {
        id,
        name,
        email,
        role,
        balance: 0,
        is_activated: initialActivation,
      },
      created: true,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Manual SmartCash Activation APIs (₦1,500 Earner Activation Fee)
// POST /api/activation/submit
app.post('/api/activation/submit', upload.single('proof'), (req: Request, res: Response) => {
  try {
    const userId = req.body.user_id || req.body.userId;
    const email = req.body.email;
    let proofImageUrl = req.body.proof_image || req.body.proof || '';

    if (req.file) {
      proofImageUrl = `/uploads/${req.file.filename}`;
    }

    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing user_id or email' });
    }

    if (!proofImageUrl) {
      return res.status(400).json({ error: 'Please upload a proof of payment screenshot' });
    }

    const nowIso = new Date().toISOString();
    const paymentId = 'act_' + generateId();

    const existing: any = db.prepare('SELECT id FROM activation_payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);

    if (existing) {
      db.prepare(`
        UPDATE activation_payments
        SET proof_image = ?, status = 'pending', admin_note = NULL, created_at = ?
        WHERE id = ?
      `).run(proofImageUrl, nowIso, existing.id);
    } else {
      db.prepare(`
        INSERT INTO activation_payments (id, user_id, email, amount, proof_image, status, admin_note, created_at)
        VALUES (?, ?, ?, 1500, ?, 'pending', NULL, ?)
      `).run(paymentId, userId, email, proofImageUrl, nowIso);
    }

    return res.json({
      success: true,
      message: 'Proof submitted successfully. Awaiting admin approval.',
      proof_image: proofImageUrl,
      status: 'pending',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Submission failed' });
  }
});

// GET /api/activation/status/:userId
app.get('/api/activation/status/:userId', (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    const user: any = db.prepare('SELECT id, role, is_activated, activation_paid_at FROM users WHERE id = ? OR uid = ?').get(userId, userId);
    const payment: any = db.prepare('SELECT id, amount, proof_image, status, admin_note, created_at FROM activation_payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);

    const isActivated = (user && (user.role === 'employer' || user.is_activated === 1 || user.is_activated === true)) || (payment && payment.status === 'approved');

    return res.json({
      success: true,
      is_activated: isActivated,
      role: user ? user.role : 'earner',
      activation_paid_at: user ? user.activation_paid_at : (payment?.status === 'approved' ? payment?.created_at : null),
      payment_status: payment ? payment.status : 'not_submitted',
      proof_image: payment ? payment.proof_image : null,
      admin_note: payment ? payment.admin_note : null,
      created_at: payment ? payment.created_at : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Activations APIs
// GET /api/admin/activations
app.get('/api/admin/activations', (_req: Request, res: Response) => {
  try {
    const activations = db.prepare(`
      SELECT p.id, p.user_id, p.email, p.amount, p.proof_image, p.status, p.admin_note, p.created_at,
             u.name as user_name, u.role as user_role, u.is_activated
      FROM activation_payments p
      LEFT JOIN users u ON p.user_id = u.id OR p.user_id = u.uid
      ORDER BY p.created_at DESC
    `).all();

    return res.json({
      success: true,
      activations: activations || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/activations/approve
app.post('/api/admin/activations/approve', (req: Request, res: Response) => {
  try {
    const { id, user_id } = req.body;
    if (!id && !user_id) {
      return res.status(400).json({ error: 'Missing activation id or user_id' });
    }

    const nowIso = new Date().toISOString();

    if (id) {
      db.prepare("UPDATE activation_payments SET status = 'approved', admin_note = 'Approved by Admin' WHERE id = ?").run(id);
    } else if (user_id) {
      db.prepare("UPDATE activation_payments SET status = 'approved', admin_note = 'Approved by Admin' WHERE user_id = ?").run(user_id);
    }

    const payment: any = id
      ? db.prepare('SELECT user_id, email FROM activation_payments WHERE id = ?').get(id)
      : db.prepare('SELECT user_id, email FROM activation_payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(user_id);

    const targetUserId = user_id || payment?.user_id;

    if (targetUserId) {
      const userExists: any = db.prepare('SELECT id FROM users WHERE id = ? OR uid = ?').get(targetUserId, targetUserId);
      if (userExists) {
        db.prepare('UPDATE users SET is_activated = 1, activation_paid_at = ? WHERE id = ? OR uid = ?').run(nowIso, targetUserId, targetUserId);
      } else {
        const email = payment?.email || '';
        const name = email.split('@')[0] || 'Earner';
        db.prepare(`
          INSERT INTO users (id, uid, name, full_name, email, role, balance, is_activated, activation_paid_at, created_at)
          VALUES (?, ?, ?, ?, ?, 'earner', 0, 1, ?, ?)
        `).run(targetUserId, targetUserId, name, name, email, nowIso, nowIso);
      }
    }

    return res.json({
      success: true,
      message: 'Payment approved. Earner account activated successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/activations/reject
app.post('/api/admin/activations/reject', (req: Request, res: Response) => {
  try {
    const { id, user_id, reason } = req.body;
    if (!id && !user_id) {
      return res.status(400).json({ error: 'Missing activation id or user_id' });
    }

    const note = reason || 'Payment proof verification failed. Please check details and re-upload valid proof.';

    if (id) {
      db.prepare("UPDATE activation_payments SET status = 'rejected', admin_note = ? WHERE id = ?").run(note, id);
    } else if (user_id) {
      db.prepare("UPDATE activation_payments SET status = 'rejected', admin_note = ? WHERE user_id = ?").run(note, user_id);
    }

    const payment: any = id ? db.prepare('SELECT user_id FROM activation_payments WHERE id = ?').get(id) : null;
    const targetUserId = user_id || payment?.user_id;

    if (targetUserId) {
      db.prepare('UPDATE users SET is_activated = 0 WHERE id = ? OR uid = ?').run(targetUserId, targetUserId);
    }

    return res.json({
      success: true,
      message: 'Payment rejected. Earner notified with feedback note.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});



// 2. GET & POST /api/tasks
app.get('/api/tasks', (_req: Request, res: Response) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
    return res.json({ success: true, tasks: tasks || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', (req: Request, res: Response) => {
  try {
    const { employer_id, title, description = '', category = 'Social Media', price = 1000, deadline = '3 days' } = req.body;
    if (!title || !employer_id) {
      return res.status(400).json({ error: 'Missing title or employer ID' });
    }
    const taskId = 't-' + generateId().slice(0, 8);
    const numPrice = parseInt(price, 10) || 1000;
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO tasks (id, employer_id, title, description, category, price, deadline, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)
    `).run(taskId, employer_id, title, description, category, numPrice, deadline, nowIso);

    const task = {
      id: taskId,
      employer_id,
      title,
      description,
      category,
      price: numPrice,
      deadline,
      status: 'open',
      created_at: nowIso,
    };
    return res.json({ success: true, task });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/tasks/apply
app.post('/api/tasks/apply', (req: Request, res: Response) => {
  try {
    const { task_id, earner_id } = req.body;
    if (!task_id || !earner_id) {
      return res.status(400).json({ error: 'Missing task_id or earner_id' });
    }

    const existing: any = db.prepare('SELECT * FROM applications WHERE task_id = ? AND earner_id = ?').get(task_id, earner_id);
    if (existing) {
      return res.json({ success: true, application: existing, message: 'Already accepted' });
    }

    const appId = 'app-' + generateId().slice(0, 8);
    const nowIso = new Date().toISOString();
    db.prepare('INSERT INTO applications (id, task_id, earner_id, status, created_at) VALUES (?, ?, ?, "accepted", ?)').run(appId, task_id, earner_id, nowIso);

    return res.json({
      success: true,
      application: { id: appId, task_id, earner_id, status: 'accepted', created_at: nowIso }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. POST & GET /api/submissions
app.get('/api/submissions', (req: Request, res: Response) => {
  try {
    const { task_id, earner_id } = req.query;
    let query = 'SELECT * FROM submissions ORDER BY created_at DESC';
    let params: any[] = [];
    if (task_id) {
      query = 'SELECT * FROM submissions WHERE task_id = ? ORDER BY created_at DESC';
      params = [task_id];
    } else if (earner_id) {
      query = 'SELECT * FROM submissions WHERE earner_id = ? ORDER BY created_at DESC';
      params = [earner_id];
    }
    const submissions = db.prepare(query).all(...params);
    return res.json({ success: true, submissions: submissions || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/submissions', upload.single('file'), (req: Request, res: Response) => {
  try {
    const taskId = req.body.task_id;
    const earnerId = req.body.earner_id;
    let proofLink = req.body.proof_link || '';
    const proofText = req.body.proof_text || '';

    if (req.file) {
      proofLink = `/uploads/${req.file.filename}`;
    }

    if (!taskId || !earnerId) {
      return res.status(400).json({ error: 'Missing task_id or earner_id' });
    }

    const subId = 'sub-' + generateId().slice(0, 8);
    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT INTO submissions (id, task_id, earner_id, proof_link, proof_text, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(subId, taskId, earnerId, proofLink, proofText, nowIso);

    db.prepare('UPDATE applications SET status = "submitted" WHERE task_id = ? AND earner_id = ?').run(taskId, earnerId);

    return res.json({
      success: true,
      submission: {
        id: subId,
        task_id: taskId,
        earner_id: earnerId,
        proof_link: proofLink,
        proof_text: proofText,
        status: 'pending',
        created_at: nowIso,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/wallet/:userId
app.get('/api/wallet/:userId', (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    let wallet: any = db.prepare('SELECT * FROM wallet WHERE user_id = ?').get(userId);
    if (!wallet) {
      const user: any = db.prepare('SELECT balance FROM users WHERE id = ? OR uid = ?').get(userId, userId);
      const userBalance = user?.balance || 0;
      const walletId = generateId();
      db.prepare('INSERT INTO wallet (id, user_id, balance, escrow_locked) VALUES (?, ?, ?, 0)').run(walletId, userId, userBalance);
      wallet = {
        id: walletId,
        user_id: userId,
        balance: userBalance,
        escrow_locked: 0,
      };
    }

    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(userId);

    return res.json({
      success: true,
      wallet,
      transactions: transactions || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 1. POST /api/auth/login - Auth User Ingest / Sync
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { idToken, mockUid, mockEmail, fullName, referredBy } = req.body;
    let uid = mockUid || null;
    let email = mockEmail || '';

    if (idToken && idToken !== 'demo-token') {
      try {
        const verifyRes = await fetch(
          `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          }
        );
        const verifyData: any = await verifyRes.json();
        if (verifyData.users && verifyData.users.length > 0) {
          uid = verifyData.users[0].localId;
          email = verifyData.users[0].email || email;
        }
      } catch (err: any) {
        console.warn('Firebase auth verification error:', err.message);
      }
    }

    if (!uid) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    let user: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);

    if (!user) {
      let referralCode = generate6CharReferralCode();
      const existing = db.prepare('SELECT uid FROM users WHERE referral_code = ?').get(referralCode);
      if (existing) referralCode = generate6CharReferralCode();

      const createdAt = new Date().toISOString();
      let sanitizedReferredBy = null;

      if (referredBy && typeof referredBy === 'string' && referredBy.trim() !== '') {
        const refCode = referredBy.trim().toUpperCase();
        const referrer: any = db
          .prepare('SELECT uid FROM users WHERE referral_code = ? OR uid = ?')
          .get(refCode, referredBy.trim());

        if (referrer && referrer.uid !== uid) {
          sanitizedReferredBy = referrer.uid;
        }
      }

      db.prepare(
        `INSERT INTO users (uid, email, full_name, is_activated, referral_code, referred_by, balance, total_earned, referral_earnings, created_at)
         VALUES (?, ?, ?, 0, ?, ?, 0, 0, 0, ?)`
      ).run(uid, email, fullName || 'CDSure Member', referralCode, sanitizedReferredBy, createdAt);

      user = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
    }

    // Check payment approval status
    const approvedPayment: any = db
      .prepare("SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified') ORDER BY date DESC LIMIT 1")
      .get(uid);

    const pendingPayment: any = db
      .prepare("SELECT * FROM payments WHERE uid = ? AND status IN ('pending', 'pending_admin') ORDER BY date DESC LIMIT 1")
      .get(uid);

    const now = new Date();
    const tasksAvailableAt = user.tasks_available_at ? new Date(user.tasks_available_at) : null;
    const isLocked24h = tasksAvailableAt ? now.getTime() < tasksAvailableAt.getTime() : false;
    const formattedStartTime = tasksAvailableAt ? formatDateTimeNice(user.tasks_available_at) : null;

    return res.json({
      user,
      hasApprovedPayment: !!approvedPayment,
      hasPendingPayment: !!pendingPayment,
      isFullyActivated: !!(user.is_activated && approvedPayment),
      paymentStatus: user.payment_status || (approvedPayment ? 'confirmed' : pendingPayment ? 'pending_admin' : 'unpaid'),
      tasksLocked24h: isLocked24h,
      tasksAvailableAt: user.tasks_available_at,
      formattedStartTime,
      startTimeMessage: isLocked24h
        ? `Admin has confirmed your payment, but you need to wait 24 hours before tasks begin. Your start time is ${formattedStartTime}.`
        : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. POST /api/upload-proof (SUBMIT TRANSACTION REFERENCE & PROOF SCREENSHOT)
app.post('/api/upload-proof', (req: Request, res: Response) => {
  try {
    const { proof_base64, reference, transaction_id, uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const txRef = (reference || transaction_id || '').trim();
    if (!txRef) {
      return res.status(400).json({
        error: 'Transaction reference is required. Please enter your bank transfer reference or session ID.',
      });
    }

    if (!proof_base64) {
      return res.status(400).json({
        error: 'Screenshot proof of payment is required.',
      });
    }

    const user: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
    if (!user) {
      return res.status(404).json({ error: 'User record not found' });
    }

    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Check if there is an existing payment record
    const existingPayment: any = db
      .prepare('SELECT * FROM payments WHERE uid = ? ORDER BY date DESC LIMIT 1')
      .get(uid);

    if (existingPayment) {
      db.prepare(`
        UPDATE payments 
        SET status = 'pending_admin', gateway = 'bank_transfer', proof_screenshot_url = ?, tx_ref = ?, reference = ?, date = ?
        WHERE id = ?
      `).run(proof_base64, txRef, txRef, nowIso, existingPayment.id);
    } else {
      db.prepare(`
        INSERT INTO payments (id, uid, amount, gateway, reference, tx_ref, status, proof_screenshot_url, date)
        VALUES (?, ?, 1500, 'bank_transfer', ?, ?, 'pending_admin', ?, ?)
      `).run(paymentId, uid, txRef, txRef, proof_base64, nowIso);
    }

    // Update user record with submitted proof and pending status
    db.prepare(`
      UPDATE users 
      SET activation_screenshot_url = ?, 
          activation_payment_reference = ?, 
          payment_status = 'pending_admin' 
      WHERE uid = ?
    `).run(proof_base64, txRef, uid);

    // Generate optional 6-digit backup code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO email_verifications (id, uid, code, link_token, expires_at, verified)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(`EV_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, uid, code, token, expiresAt);

    console.log(`[PROOF SUBMITTED] User: ${user.email} | Ref: ${txRef} | Bank: SmartCash PSB 8024138981`);

    return res.json({
      success: true,
      message: 'We received your proof. Admin will confirm your payment to 8024138981 shortly.',
      paymentStatus: 'pending_admin',
      reference: txRef,
      code,
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/admin/confirm-payment (ADMIN CONFIRMS PAYMENT & STARTS 24-HOUR COUNTDOWN)
const handleAdminConfirmPayment = (req: Request, res: Response) => {
  try {
    const rawTarget = (req.body.uid || req.body.username || '').trim();
    if (!rawTarget) {
      return res.status(400).json({ error: 'User ID or username is required' });
    }

    const user: any = findUserByAnyIdentifier(rawTarget);
    if (!user) {
      return res.status(404).json({ error: 'User record not found' });
    }

    const uid = user.uid;
    const now = new Date();
    const nowIso = now.toISOString();
    // User must wait 24 hours before starting any task
    const tasksAvailableAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // 1. Approve latest payment
    const payment: any = db
      .prepare('SELECT * FROM payments WHERE uid = ? ORDER BY date DESC LIMIT 1')
      .get(uid);

    if (payment) {
      db.prepare("UPDATE payments SET status = 'approved', admin_confirmed_at = ? WHERE id = ?").run(
        nowIso,
        payment.id
      );
    } else {
      const paymentId = `PAY_ADM_${Date.now()}`;
      db.prepare(`
        INSERT INTO payments (id, uid, amount, gateway, reference, tx_ref, status, admin_confirmed_at, date)
        VALUES (?, ?, 2000, 'bank_transfer', 'ADMIN_CONFIRMED', 'ADMIN_CONFIRMED', 'approved', ?, ?)
      `).run(paymentId, uid, nowIso, nowIso);
    }

    // 2. Activate user and set 24hr availability timer
    db.prepare(`
      UPDATE users 
      SET is_activated = 1, 
          payment_status = 'confirmed', 
          admin_confirmed_at = ?, 
          tasks_available_at = ? 
      WHERE uid = ?
    `).run(nowIso, tasksAvailableAt, uid);

    // 3. Credit referrer ₦200 instant bonus if exists
    let referrerRewarded = false;
    if (user.referred_by) {
      const existingRef: any = db.prepare('SELECT id FROM referrals WHERE referred_uid = ?').get(uid);
      if (!existingRef) {
        const referrerUid = user.referred_by;
        const refBonusId = generateId();

        db.prepare(`
          UPDATE users 
          SET balance = balance + 200, 
              referral_earnings = referral_earnings + 200, 
              total_earned = total_earned + 200 
          WHERE uid = ?
        `).run(referrerUid);

        db.prepare(`
          INSERT INTO referrals (id, referrer_uid, referred_uid, bonus, date)
          VALUES (?, ?, ?, 200, ?)
        `).run(refBonusId, referrerUid, uid, nowIso);

        referrerRewarded = true;
        console.log(`[REFERRAL BONUS] ₦200 credited to referrer ${referrerUid}`);
      }
    }

    const updatedUser: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
    const sameTimeTomorrowStr = formatTime12h(tasksAvailableAt);
    const formattedStartTime = formatDateTimeNice(tasksAvailableAt);

    const message = `Your payment is confirmed! Your account will be active for tasks after 24 hours. Please come back tomorrow at ${sameTimeTomorrowStr}. This is for security verification.`;

    console.log(`[PAYMENT CONFIRMED] User: ${user.email} | Tasks start at: ${tasksAvailableAt}`);

    return res.json({
      success: true,
      status: 'confirmed_waiting_24h',
      message,
      user: updatedUser,
      tasksAvailableAt,
      formattedStartTime,
      sameTimeTomorrowStr,
      referrerRewarded,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

app.post('/api/admin/confirm-payment', handleAdminConfirmPayment);
app.post('/admin/confirm-payment', handleAdminConfirmPayment);

// Admin Fast-Forward 24H (For instant testing of active tasks without waiting a real 24 hours)
const handleAdminFastForward = (req: Request, res: Response) => {
  try {
    const rawTarget = (req.body.uid || req.body.username || '').trim();
    if (!rawTarget) return res.status(400).json({ error: 'User ID or username is required' });

    const user: any = findUserByAnyIdentifier(rawTarget);
    if (!user) return res.status(404).json({ error: 'User record not found' });

    const pastIso = new Date(Date.now() - 60000).toISOString();
    db.prepare('UPDATE users SET tasks_available_at = ? WHERE uid = ?').run(pastIso, user.uid);

    const updatedUser: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(user.uid);
    return res.json({
      success: true,
      status: 'active',
      message: '24-hour waiting period bypassed for testing. Tasks are now ACTIVE!',
      user: updatedUser,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

app.post('/api/admin/fast-forward-24h', handleAdminFastForward);
app.post('/admin/fast-forward-24h', handleAdminFastForward);

// Admin Reset 24H Cooldown (Re-locks tasks for 24h testing)
app.post('/api/admin/reset-timer-24h', (req: Request, res: Response) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'User ID is required' });

    const futureIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET tasks_available_at = ? WHERE uid = ?').run(futureIso, uid);

    const updatedUser: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
    return res.json({
      success: true,
      message: '24-hour security countdown reset to 24 hours.',
      user: updatedUser,
      tasksAvailableAt: futureIso,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Reset User Status (Allows testing Deposit, Pending, 24h, or Active states)
const handleAdminResetStatus = (req: Request, res: Response) => {
  try {
    const rawTarget = (req.body.uid || req.body.username || '').trim();
    const targetStatus = req.body.targetStatus || 'not_found'; // 'not_found' | 'pending_approval' | 'confirmed_waiting_24h' | 'active'
    if (!rawTarget) return res.status(400).json({ error: 'User ID or username is required' });

    const user: any = findUserByAnyIdentifier(rawTarget);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (targetStatus === 'not_found') {
      db.prepare(`
        UPDATE users 
        SET is_activated = 0, 
            payment_status = 'unpaid', 
            activation_payment_reference = NULL, 
            activation_screenshot_url = NULL, 
            admin_confirmed_at = NULL, 
            tasks_available_at = NULL 
        WHERE uid = ?
      `).run(user.uid);
      db.prepare("DELETE FROM payments WHERE uid = ?").run(user.uid);
    } else if (targetStatus === 'pending_approval') {
      db.prepare(`
        UPDATE users 
        SET is_activated = 0, 
            payment_status = 'pending_approval', 
            activation_payment_reference = 'CDS-TEST-PROOF', 
            activation_screenshot_url = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80', 
            admin_confirmed_at = NULL, 
            tasks_available_at = NULL 
        WHERE uid = ?
      `).run(user.uid);
    }

    const updatedUser: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(user.uid);
    return res.json({
      success: true,
      status: targetStatus,
      user: updatedUser,
      message: `User status reset to ${targetStatus}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

app.post('/api/admin/reset-status', handleAdminResetStatus);
app.post('/admin/reset-status', handleAdminResetStatus);

// 4. GET /api/admin/pending (ADMIN AUDIT QUEUE)
app.get('/api/admin/pending', (_req: Request, res: Response) => {
  try {
    const pendingPayments = db
      .prepare(`
        SELECT p.*, u.full_name as user_name, u.email as user_email, u.activation_payment_reference as user_ref
        FROM payments p 
        LEFT JOIN users u ON p.uid = u.uid 
        WHERE p.status IN ('pending', 'pending_admin') 
        ORDER BY p.date DESC
      `)
      .all();

    const activeUsers = db
      .prepare(`
        SELECT uid, email, full_name, is_activated, admin_confirmed_at, tasks_available_at, balance 
        FROM users 
        WHERE is_activated = 1 
        ORDER BY admin_confirmed_at DESC 
        LIMIT 20
      `)
      .all();

    const pendingCompletions = db
      .prepare(`
        SELECT c.*, t.title as task_title, t.reward, u.email as user_email 
        FROM completions c 
        LEFT JOIN tasks t ON c.task_id = t.id 
        LEFT JOIN users u ON c.uid = u.uid 
        ORDER BY c.submitted_at DESC 
        LIMIT 20
      `)
      .all();

    return res.json({
      pendingPayments,
      activeUsers,
      pendingCompletions,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. POST /api/verify-code (CODE CONFIRMATION CHECK)
app.post('/api/verify-code', (req: Request, res: Response) => {
  try {
    const { uid, code, token } = req.body;

    if (!code && !token) {
      return res.status(400).json({ error: 'Confirmation code or token is required' });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    let verQuery = 'SELECT * FROM email_verifications WHERE expires_at > ? AND verified = 0';
    const params: any[] = [nowIso];

    if (code) {
      verQuery += ' AND code = ?';
      params.push(code.trim());
    } else if (token) {
      verQuery += ' AND link_token = ?';
      params.push(token.trim());
    }

    if (uid) {
      verQuery += ' AND uid = ?';
      params.push(uid);
    }

    const verification: any = db.prepare(verQuery).get(...params);
    const targetUid = verification ? verification.uid : uid;

    if (!targetUid) {
      return res.status(400).json({
        error: 'Invalid or expired confirmation code.',
      });
    }

    if (verification) {
      db.prepare('UPDATE email_verifications SET verified = 1 WHERE id = ?').run(verification.id);
    }

    // Call confirm payment logic
    const tasksAvailableAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare("UPDATE payments SET status = 'approved', admin_confirmed_at = ? WHERE uid = ?").run(
      nowIso,
      targetUid
    );
    db.prepare(`
      UPDATE users 
      SET is_activated = 1, 
          payment_status = 'confirmed', 
          admin_confirmed_at = ?, 
          tasks_available_at = ? 
      WHERE uid = ?
    `).run(nowIso, tasksAvailableAt, targetUid);

    const user: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(targetUid);
    const sameTimeTomorrowStr = formatTime12h(tasksAvailableAt);

    return res.json({
      success: true,
      message: `Your payment is confirmed! Your account will be active for tasks after 24 hours. Please come back tomorrow at ${sameTimeTomorrowStr}. This is for security verification.`,
      user,
      tasksAvailableAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Also support legacy /api/activate-with-proof route
app.post('/api/activate-with-proof', async (req: Request, res: Response) => {
  const { uid, bank_ref, proof_base64, verification_code, verification_token } = req.body;
  req.body = {
    reference: bank_ref,
    uid,
    proof_base64,
  };
  return (app._router.handle as any)(req, res);
});

// 5. GET /api/dashboard?uid= (STRICT PAYMENT CHECK - APPROVAL MANDATORY)
app.get('/api/dashboard', (req: Request, res: Response) => {
  try {
    const uid = req.query.uid as string;
    if (!uid) return res.status(400).json({ error: 'uid is required' });

    const user: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // STRICT CHECK: Payment record MUST have status = 'approved' or 'verified'
    const approvedPayment: any = db
      .prepare("SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified') ORDER BY date DESC LIMIT 1")
      .get(uid);

    const pendingPayment: any = db
      .prepare("SELECT * FROM payments WHERE uid = ? AND status IN ('pending', 'pending_admin') ORDER BY date DESC LIMIT 1")
      .get(uid);

    if (!user.is_activated || !approvedPayment) {
      return res.status(403).json({
        locked: true,
        error: pendingPayment
          ? 'We received your proof. Admin will confirm your payment to 8024138981 shortly.'
          : 'Pay ₦1,500 to SmartCash 8024138981 USMAN ABDULLAHI, use your username as narration.',
        is_activated: user.is_activated,
        paymentStatus: pendingPayment ? 'pending_admin' : 'unpaid',
        hasApprovedPayment: !!approvedPayment,
        hasPendingPayment: !!pendingPayment,
      });
    }

    const now = new Date();
    const tasksAvailableAt = user.tasks_available_at ? new Date(user.tasks_available_at) : null;
    const isLocked24h = tasksAvailableAt ? now.getTime() < tasksAvailableAt.getTime() : false;
    const formattedStartTime = tasksAvailableAt ? formatDateTimeNice(user.tasks_available_at) : null;

    const referrals: any[] = db
      .prepare(
        `SELECT r.id, r.bonus, r.date, u.email as referred_email, u.full_name as referred_name 
         FROM referrals r 
         LEFT JOIN users u ON r.referred_uid = u.uid 
         WHERE r.referrer_uid = ? 
         ORDER BY r.date DESC`
      )
      .all(uid);

    const withdrawals: any[] = db
      .prepare('SELECT * FROM withdrawals WHERE uid = ? ORDER BY date DESC LIMIT 10')
      .all(uid);

    const startOfTodayIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const countRes: any = db
      .prepare('SELECT COUNT(*) as count FROM completions WHERE uid = ? AND submitted_at >= ?')
      .get(uid, startOfTodayIso);

    return res.json({
      user,
      referrals,
      referralCount: referrals.length,
      withdrawals,
      completedToday: countRes?.count || 0,
      approvedPayment,
      tasksLocked24h: isLocked24h,
      tasksAvailableAt: user.tasks_available_at,
      formattedStartTime,
      sameTimeTomorrowStr: tasksAvailableAt ? formatTime12h(user.tasks_available_at) : null,
      securityMessage: isLocked24h
        ? `Your payment is confirmed! Your account will be active for tasks after 24 hours. Please come back tomorrow at ${tasksAvailableAt ? formatTime12h(user.tasks_available_at) : 'the same time'}. This is for security verification.`
        : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. GET /api/tasks?uid= (STRICTLY LOCKED BEFORE ADMIN CONFIRMATION + 24 HOURS)
app.get('/api/tasks', (req: Request, res: Response) => {
  try {
    const uid = req.query.uid as string;
    if (!uid) return res.status(400).json({ error: 'uid is required' });

    const user: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
    const approvedPayment: any = db
      .prepare("SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified')")
      .get(uid);

    if (!user || !user.is_activated || !approvedPayment) {
      return res.status(403).json({
        error: 'Pay ₦1,500 to SmartCash 8024138981 USMAN ABDULLAHI, use your username as narration.',
        locked: true,
      });
    }

    const now = new Date();
    const tasksAvailableAt = user.tasks_available_at ? new Date(user.tasks_available_at) : null;
    const isLocked24h = tasksAvailableAt ? now.getTime() < tasksAvailableAt.getTime() : false;
    const formattedStartTime = tasksAvailableAt ? formatDateTimeNice(user.tasks_available_at) : 'tomorrow';
    const lockMessage = `Admin has confirmed your payment, but you need to wait 24 hours before tasks begin. Your start time is ${formattedStartTime}.`;

    const expiresAtDate = getTodayMidnightUtc();
    const expiresAtIso = expiresAtDate.toISOString();

    const oneHourBeforeExpiry = new Date(expiresAtDate.getTime() - 60 * 60 * 1000);
    const isExpired = now.getTime() >= oneHourBeforeExpiry.getTime();
    const minutesLeft = Math.max(0, Math.floor((expiresAtDate.getTime() - now.getTime()) / 60000));

    const tasks: any[] = db.prepare('SELECT id, title, reward, link, instructions FROM tasks').all();

    const startOfTodayIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const completions: any[] = db
      .prepare('SELECT task_id, status, proof_screenshot_url FROM completions WHERE uid = ? AND submitted_at >= ?')
      .all(uid, startOfTodayIso);

    const completionMap = new Map();
    completions.forEach((c) => completionMap.set(c.task_id, c));

    const tasksWithStatus = tasks.map((t) => {
      const comp = completionMap.get(t.id);
      return {
        ...t,
        expires_at: expiresAtIso,
        completed: !!comp,
        completionStatus: comp ? comp.status : null,
        proof_screenshot_url: comp ? comp.proof_screenshot_url : null,
        locked24h: isLocked24h,
        tasksAvailableAt: user.tasks_available_at,
        startTimeMessage: lockMessage,
      };
    });

    return res.json({
      tasks: tasksWithStatus,
      tasksLocked24h: isLocked24h,
      tasksAvailableAt: user.tasks_available_at,
      startTimeMessage: isLocked24h ? lockMessage : null,
      formattedStartTime,
      expiresAt: expiresAtIso,
      serverTime: now.toISOString(),
      isExpired,
      minutesLeft,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. POST /api/complete-task (TASK SUBMISSION WITH STRICT 24-HOUR RULE & SCREENSHOT)
app.post('/api/complete-task', (req: Request, res: Response) => {
  try {
    const { uid, taskId, proofScreenshotUrl } = req.body;

    if (!uid || !taskId) return res.status(400).json({ error: 'uid and taskId are required' });
    if (!proofScreenshotUrl) return res.status(400).json({ error: 'Screenshot proof is required' });

    const user: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
    const approvedPayment: any = db
      .prepare("SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified')")
      .get(uid);

    if (!user || !user.is_activated || !approvedPayment) {
      return res.status(403).json({ error: 'Pay ₦1,500 to SmartCash 8024138981 USMAN ABDULLAHI, use your username as narration.' });
    }

    // STRICT 24-HOUR ACTIVATION RULE:
    // DO NOT allow tasks to start before admin confirmation + 24 hours.
    const now = new Date();
    const tasksAvailableAt = user.tasks_available_at ? new Date(user.tasks_available_at) : null;
    if (tasksAvailableAt && now.getTime() < tasksAvailableAt.getTime()) {
      const formattedStartTime = formatDateTimeNice(user.tasks_available_at);
      return res.status(403).json({
        error: `Admin has confirmed your payment, but you need to wait 24 hours before tasks begin. Your start time is ${formattedStartTime}.`,
        tasksLocked24h: true,
        tasksAvailableAt: user.tasks_available_at,
        formattedStartTime,
      });
    }

    const task: any = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // 1-HOUR EXPIRY RULE
    const expiresAtDate = getTodayMidnightUtc();
    const oneHourBeforeExpiry = new Date(expiresAtDate.getTime() - 60 * 60 * 1000);

    if (now.getTime() >= oneHourBeforeExpiry.getTime()) {
      return res.status(400).json({
        error: 'Task Expired - Come back tomorrow! Submissions close 1 hour before midnight UTC.',
      });
    }

    // Double submission check
    const startOfTodayIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const existing: any = db
      .prepare('SELECT id FROM completions WHERE uid = ? AND task_id = ? AND submitted_at >= ?')
      .get(uid, taskId, startOfTodayIso);

    if (existing) {
      return res.status(400).json({
        error: 'You have already submitted this task today. Resets daily at midnight UTC.',
      });
    }

    const completionId = generateId();
    const submittedAt = now.toISOString();

    db.prepare(
      `INSERT INTO completions (id, uid, task_id, proof_screenshot_url, status, submitted_at, reviewed_at)
       VALUES (?, ?, ?, ?, 'approved', ?, ?)`
    ).run(completionId, uid, taskId, proofScreenshotUrl, submittedAt, submittedAt);

    db.prepare(
      `UPDATE users 
       SET balance = balance + ?, 
           total_earned = total_earned + ? 
       WHERE uid = ?`
    ).run(task.reward, task.reward, uid);

    const updatedUser: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);

    return res.json({
      success: true,
      message: `Proof accepted! ₦${task.reward} added to your CDSure balance.`,
      reward: task.reward,
      balance: updatedUser.balance,
      total_earned: updatedUser.total_earned,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. POST /api/withdraw (WITHDRAW TO BANK)
app.post('/api/withdraw', (req: Request, res: Response) => {
  try {
    const { uid, amount, bankName = 'Commercial Bank', accountNumber = '', accountName = '' } = req.body;
    const numAmount = parseInt(amount, 10);

    if (!uid || isNaN(numAmount) || numAmount < 500) {
      return res.status(400).json({ error: 'Minimum withdrawal is ₦500' });
    }

    const user: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
    const approvedPayment: any = db
      .prepare("SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified')")
      .get(uid);

    if (!user || !user.is_activated || !approvedPayment) {
      return res.status(403).json({ error: 'Only members with approved payment can withdraw.' });
    }

    if (user.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const withdrawalId = generateId();
    const dateStr = new Date().toISOString();

    db.prepare('UPDATE users SET balance = balance - ? WHERE uid = ?').run(numAmount, uid);
    db.prepare(
      `INSERT INTO withdrawals (id, uid, amount, status, bank_name, account_number, account_name, date)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`
    ).run(withdrawalId, uid, numAmount, bankName, accountNumber, accountName, dateStr);

    const updatedUser: any = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);

    return res.json({
      success: true,
      message: `Withdrawal request of ₦${numAmount.toLocaleString()} submitted! Processing within 24 hours.`,
      balance: updatedUser.balance,
      withdrawal: {
        id: withdrawalId,
        amount: numAmount,
        status: 'pending',
        date: dateStr,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reset daily tasks for test review
app.post('/api/dev/reset-daily', (req: Request, res: Response) => {
  const { uid } = req.body;
  if (uid) {
    db.prepare('DELETE FROM completions WHERE uid = ?').run(uid);
  } else {
    db.prepare('DELETE FROM completions').run();
  }
  return res.json({ success: true, message: 'Completions reset for testing.' });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`CDSure Tasks server running on port ${PORT}`);
  });
}

startServer();
