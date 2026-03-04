# Job Tracker

A simple, straightforward job application tracker built with Next.js, React, and PostgreSQL.

## Features

- 📝 Add job applications with company, position, date applied
- 🏷️ Track application status (Applied, Interviewing, Rejected, Offered)
- 📌 Add notes for each application
- 🔗 Store job posting URLs
- 📊 View all applications in one dashboard
- 🗑️ Delete applications

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **Deployment**: Vercel / Self-hosted

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yagomez/JobTracker.git
cd JobTracker
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### (Optional) AI insights setup

To enable the AI-powered insights in the **Analytics** view, add an OpenAI API key:

```bash
cp .env.example .env.local   # if you have an example file
```

Then set:

```bash
OPENAI_API_KEY=your_api_key_here
```

Restart the dev server after changing environment variables.

### Seeding demo data (for GitHub demos)

By default, the app uses a local SQLite database at `data/job_tracker.db`. Database files are **not committed** to Git to keep your personal applications private.

If you want to show a filled-out demo (locally or in a deployment), you can seed fake data:

```bash
npm run seed:demo
```

Notes:
- The seed script will **create the DB and tables if they do not exist**.
- If the `jobs` table already has rows, it will **skip seeding** to avoid mixing with real data.
- For your personal tracker, just don’t run the seed command; use the UI normally to add your own applications.

### No-apply list

When you type a company name in the job form, the app checks a **Do Not Apply** list. If the company is on that list, a warning appears with the reason (e.g. "Sent rejection to my work email").

**Adding companies to the list:** The table is created automatically on first use. Add entries via SQLite:

```bash
sqlite3 data/job_tracker.db "INSERT INTO no_apply_companies (company_name, reason) VALUES ('Company Name', 'Sent rejection to work email.');"
```

Matching is **case-insensitive** and trims spaces. You can still submit the form; the warning is informational.

## Project Structure

```
job-tracker/
├── app/
│   ├── api/
│   │   └── jobs/              # API endpoints
│   │       ├── route.ts       # GET all, POST create
│   │       └── [id]/route.ts  # GET, PUT, DELETE
│   ├── page.tsx               # Dashboard
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── components/
│   ├── JobForm.tsx            # Form to add/edit jobs
│   └── JobList.tsx            # List of jobs
├── lib/
│   ├── db/
│   │   ├── client.ts          # Database connection
│   │   └── schema.sql         # Database schema
│   └── types.ts               # TypeScript types
└── package.json
```

## Database Schema

```sql
jobs (
  id SERIAL PRIMARY KEY,
  company VARCHAR(255),
  position VARCHAR(255),
  url VARCHAR(1024),
  date_applied DATE,
  status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## API Endpoints

- `GET /api/jobs` - Get all jobs
- `POST /api/jobs` - Create new job
- `GET /api/jobs/[id]` - Get single job
- `PUT /api/jobs/[id]` - Update job
- `DELETE /api/jobs/[id]` - Delete job

## Building for Production

```bash
npm run build
npm run start
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repo to Vercel
3. Add `DATABASE_URL` environment variable
4. Deploy!

### Self-hosted

1. Set up a VPS with PostgreSQL
2. Build: `npm run build`
3. Run: `npm run start`
4. Set up reverse proxy (nginx/Apache)

## Future Enhancements

- [ ] Email notifications
- [ ] Interview scheduling
- [ ] Salary tracking
- [ ] Statistics/analytics
- [ ] CSV import/export
- [ ] Dark mode
- [ ] Mobile app

## License

MIT
