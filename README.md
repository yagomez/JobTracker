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

3. Set up your database:

```bash
# Create a PostgreSQL database
createdb job_tracker

# Run the schema
psql job_tracker < lib/db/schema.sql
```

4. Configure environment variables:

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your database credentials
# DATABASE_URL=postgresql://username:password@localhost:5432/job_tracker
```

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

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
