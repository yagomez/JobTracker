-- SQLite Schema for Job Tracker
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  url TEXT,
  date_applied TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  posting_status TEXT DEFAULT 'unknown',
  last_checked DATETIME,
  status_notes TEXT,
  resume_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_date_applied ON jobs(date_applied);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_posting_status ON jobs(posting_status);

-- No-apply list: companies you do not want to apply to (reason + optional notes)
CREATE TABLE IF NOT EXISTS no_apply_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_no_apply_company_name ON no_apply_companies(company_name);
