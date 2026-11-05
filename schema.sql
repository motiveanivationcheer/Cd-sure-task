-- Cloudflare D1 Database Schema for CDSure Tasks

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'earner',
  balance INTEGER DEFAULT 0,
  is_activated INTEGER DEFAULT 0,
  activation_paid_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activation_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  amount INTEGER DEFAULT 1500,
  proof_image TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  employer_id TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  price INTEGER,
  deadline TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
