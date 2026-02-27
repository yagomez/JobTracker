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
