// Simple demo seed script for Job Tracker
// Inserts fake jobs into the current database if it's empty.

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function getDbPath() {
  // Reproduce the same logic as lib/db/client.ts
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
    return process.env.DATABASE_URL.replace('file:', '');
  }
  return path.join(process.cwd(), 'data/job_tracker.db');
}

function ensureSchema(db) {
  const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

function seedDemoJobs() {
  const dbPath = getDbPath();
  console.log(`Using database at: ${dbPath}`);

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  ensureSchema(db);

  const countRow = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
  if (countRow.count > 0) {
    console.log('Database already has jobs; skipping demo seed to avoid mixing with real data.');
    db.close();
    return;
  }

  const insert = db.prepare(`
    INSERT INTO jobs (
      company,
      position,
      url,
      date_applied,
      status,
      notes,
      posting_status,
      status_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(today.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const demoJobs = [
    {
      company: 'Olive Labs',
      position: 'Frontend Engineer',
      url: 'https://jobs.example.com/olive-frontend',
      date_applied: daysAgo(2),
      status: 'applied',
      notes: 'Excited about the design system and frontend focus.',
      posting_status: 'active',
      status_notes: 'Posting still live as of last check.',
    },
    {
      company: 'Grotesque Studios',
      position: 'Full Stack Engineer',
      url: 'https://careers.example.com/fullstack',
      date_applied: daysAgo(7),
      status: 'interviewing',
      notes: 'Completed initial screening; portfolio walkthrough next week.',
      posting_status: 'active',
      status_notes: 'Recruiter confirmed role is still open.',
    },
    {
      company: 'Righteous Tech',
      position: 'Software Engineer',
      url: 'https://jobs.example.com/righteous-se',
      date_applied: daysAgo(14),
      status: 'rejected',
      notes: 'Good practice interview, will reapply next cycle.',
      posting_status: 'filled',
      status_notes: 'Posting updated to “position filled”.',
    },
    {
      company: 'Bubbles Inc.',
      position: 'Product Engineer',
      url: 'https://example.com/jobs/product-engineer',
      date_applied: daysAgo(21),
      status: 'offered',
      notes: 'Received verbal offer; waiting on written details.',
      posting_status: 'archived',
      status_notes: 'Posting archived shortly after offer.',
    },
    {
      company: 'Job Tracker Demo Co.',
      position: 'Demo Role',
      url: 'https://demo.example.com/job-tracker',
      date_applied: daysAgo(1),
      status: 'applied',
      notes: 'This is demo data for showcasing the app.',
      posting_status: 'unknown',
      status_notes: 'Not checked yet.',
    },
  ];

  const tx = db.transaction(() => {
    for (const job of demoJobs) {
      insert.run(
        job.company,
        job.position,
        job.url,
        job.date_applied,
        job.status,
        job.notes,
        job.posting_status,
        job.status_notes
      );
    }
  });

  tx();

  const finalCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;
  console.log(`Seeded ${finalCount} demo jobs.`);

  db.close();
}

seedDemoJobs();

