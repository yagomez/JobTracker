# JobTracker - Setup & Quick Start Guide

## ✅ Project Created

Your Job Tracker is now set up and pushed to GitHub: https://github.com/yagomez/JobTracker

## 📋 What's Included

### Frontend (Next.js 14)
- Clean, minimal dashboard UI
- Job form for adding applications
- Job list with status tracking
- Edit/Delete functionality
- Responsive design (Tailwind CSS)

### Backend (API Routes)
- RESTful API endpoints
- CRUD operations for jobs
- PostgreSQL integration

### Database Schema
- Jobs table with all fields you need
- Status tracking (applied, interviewing, rejected, offered)
- Date tracking (applied, updated)
- Notes section for each job

## 🚀 Next Steps

### 1. Set Up Your Database

**Option A: PostgreSQL on macOS**
```bash
# Install PostgreSQL (if not already installed)
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb job_tracker

# Load schema
psql job_tracker < lib/db/schema.sql
```

**Option B: Use Docker**
```bash
docker run -d \
  --name job-tracker-db \
  -e POSTGRES_DB=job_tracker \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15
```

### 2. Configure Environment Variables

```bash
# Copy template
cp .env.example .env.local

# Edit .env.local with your database credentials:
# For local PostgreSQL:
# DATABASE_URL=postgresql://youruser:password@localhost:5432/job_tracker
```

### 3. Install Dependencies & Run

```bash
cd /Users/yarellygomez/Desktop/GitHub/job-tracker

npm install

npm run dev
```

Open http://localhost:3000 - your dashboard is live!

## 🎯 Features Overview

### Add Jobs
- Company name
- Position title
- Job posting URL
- Date applied
- Current status
- Additional notes

### Track Status
- **Applied**: Initial submission
- **Interviewing**: Phone/Video/In-person rounds
- **Rejected**: Application declined
- **Offered**: Offer received

### Dashboard Stats
- Total applications
- Applications by status
- Quick edit/delete actions

## 📊 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL |
| ORM | Direct SQL (simple approach) |

## 🔧 Project Structure

```
job-tracker/
├── app/
│   ├── api/jobs/          ← API endpoints
│   ├── page.tsx           ← Main dashboard
│   └── layout.tsx         ← App layout
├── components/
│   ├── JobForm.tsx        ← Add/edit form
│   └── JobList.tsx        ← Jobs display
├── lib/
│   ├── db/                ← Database config
│   └── types.ts           ← TypeScript types
└── README.md              ← Full documentation
```

## 🚢 Deployment Options

### Vercel (Easiest)
1. Push code to GitHub
2. Connect repo to Vercel
3. Add `DATABASE_URL` environment variable
4. Deploy!

### Self-Hosted VPS
1. Set up PostgreSQL on server
2. Deploy Node.js app
3. Set up reverse proxy (nginx)

## 📝 Common Tasks

### Add a Job
1. Fill out form on dashboard
2. Submit
3. Job appears in list instantly

### Edit a Job
1. Click "Edit" on job card
2. Note: Edit page not yet built - for now update via delete + re-add

### Delete a Job
1. Click "Delete" on job card
2. Confirm deletion

## 🐛 Troubleshooting

**Database connection error?**
- Check `DATABASE_URL` in `.env.local`
- Verify PostgreSQL is running: `pg_isready`
- Ensure database exists: `psql -l | grep job_tracker`

**Port 3000 already in use?**
```bash
npm run dev -- -p 3001  # Use different port
```

**Missing table?**
```bash
psql job_tracker < lib/db/schema.sql  # Reload schema
```

## 🎓 Next Enhancement Ideas

1. **Edit Job Page** - Dedicated page for editing
2. **Filters** - Filter by status, date range
3. **Search** - Search companies/positions
4. **Analytics** - Charts showing application trends
5. **Reminders** - Email reminders for follow-ups
6. **Export** - Download as CSV/PDF
7. **Dark Mode** - Toggle theme

## 💡 Tips

- Keep notes detailed for follow-up
- Update status immediately when you hear back
- Use URLs to easily reference postings
- Review monthly to track progress

---

**Ready to go!** Your job tracker is fully functional. Start adding those applications! 🎯
