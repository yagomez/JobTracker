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
  date_rejected TEXT,
  rejection_source TEXT,
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

-- Company reviews (Glassdoor-style): ghost job ratings and feedback by perspective
CREATE TABLE IF NOT EXISTS company_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  reviewer_type TEXT NOT NULL,
  ghost_job_rating INTEGER NOT NULL,
  review_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_company_reviews_company_name ON company_reviews(company_name);
CREATE INDEX IF NOT EXISTS idx_company_reviews_reviewer_type ON company_reviews(reviewer_type);

-- Interview questions: exact questions users were asked (anonymous). No full review required like Glassdoor.
-- is_most_recent supports gamification; leetcode_topic enables cross-reference with LeetCode company tags.
CREATE TABLE IF NOT EXISTS interview_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'tech',
  leetcode_topic TEXT,
  is_most_recent INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_interview_questions_company ON interview_questions(company_name);
CREATE INDEX IF NOT EXISTS idx_interview_questions_type ON interview_questions(question_type);

-- Prospective interviewee: time to respond + how they respond (user-submitted)
CREATE TABLE IF NOT EXISTS application_experiences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  days_to_response INTEGER,
  response_channel TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_application_experiences_company ON application_experiences(company_name);

-- Advice from people who got hired; LinkedIn required for future agent verification
CREATE TABLE IF NOT EXISTS hired_advice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  advice_text TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hired_advice_company ON hired_advice(company_name);
CREATE INDEX IF NOT EXISTS idx_hired_advice_status ON hired_advice(status);

-- Employee feedback: anonymous ratings + optional text; LinkedIn required for verification
-- visibility: 'public' = posted publicly; 'aggregate_only' = used for graphs + Overall feedback (anonymous)
CREATE TABLE IF NOT EXISTS employee_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  culture_rating INTEGER NOT NULL,
  management_rating INTEGER NOT NULL,
  work_life_rating INTEGER NOT NULL,
  compensation_rating INTEGER NOT NULL,
  feedback_text TEXT,
  linkedin_url TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'aggregate_only',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_employee_feedback_company ON employee_feedback(company_name);
CREATE INDEX IF NOT EXISTS idx_employee_feedback_status ON employee_feedback(status);
CREATE INDEX IF NOT EXISTS idx_employee_feedback_visibility ON employee_feedback(visibility);

-- Company-posted salary ranges (careers page) for comparison with levels.fyi / market data
CREATE TABLE IF NOT EXISTS salary_ranges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  min_salary REAL NOT NULL,
  max_salary REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT NOT NULL DEFAULT 'careers_page',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_salary_ranges_company ON salary_ranges(company_name);

-- User suggestions for what data/info would be helpful per view
CREATE TABLE IF NOT EXISTS view_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT,
  view_name TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_view_suggestions_view ON view_suggestions(view_name);
CREATE INDEX IF NOT EXISTS idx_view_suggestions_company ON view_suggestions(company_name);

-- Ex-employee feedback: LinkedIn-verified; questions only ex-employees can answer
CREATE TABLE IF NOT EXISTS ex_employee_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  years_to_promotion REAL,
  leadership_rating INTEGER,
  leadership_year INTEGER,
  benefits_rating INTEGER NOT NULL,
  work_life_rating INTEGER NOT NULL,
  used_parental_leave TEXT,
  parental_leave_accommodating TEXT,
  feedback_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ex_employee_feedback_company ON ex_employee_feedback(company_name);
CREATE INDEX IF NOT EXISTS idx_ex_employee_feedback_status ON ex_employee_feedback(status);

-- Real-time application insights: applied → heard back (from job tracker or manual share)
CREATE TABLE IF NOT EXISTS realtime_application_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  date_applied TEXT NOT NULL,
  date_heard_back TEXT,
  response_channel TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_realtime_insights_company ON realtime_application_insights(company_name);
