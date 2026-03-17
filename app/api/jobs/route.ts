import { NextRequest, NextResponse } from 'next/server';
import { Job, CreateJobInput } from '@/lib/types';
import { DEMO_JOBS } from '@/lib/demo-data';

function isDemoMode(request: NextRequest): boolean {
  return request.headers.get('x-demo-mode') === 'true';
}

/** GET: return demo data without loading the database. Real data uses dynamic import. */
export async function GET(request: NextRequest) {
  const company = request.nextUrl.searchParams.get('company')?.trim() ?? '';
  if (isDemoMode(request)) {
    const list = company
      ? [...DEMO_JOBS].filter((j) => j.company.toLowerCase().includes(company.toLowerCase()))
      : [...DEMO_JOBS];
    return NextResponse.json(list.sort((a, b) => (b.date_applied > a.date_applied ? 1 : -1)));
  }
  try {
    const { query, getClient } = await import('@/lib/db/client');
    const db = getClient();
    try {
      db.exec('ALTER TABLE jobs ADD COLUMN date_rejected TEXT');
    } catch {
      /* column exists */
    }
    try {
      db.exec('ALTER TABLE jobs ADD COLUMN rejection_source TEXT');
    } catch {
      /* column exists */
    }
    const result = company
      ? query(
          'SELECT * FROM jobs WHERE LOWER(TRIM(company)) = LOWER(TRIM(?)) ORDER BY date_applied DESC',
          [company]
        )
      : query('SELECT * FROM jobs ORDER BY date_applied DESC');
    return NextResponse.json(result.rows as Job[]);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

/** POST: demo returns 403; real data uses dynamic import. */
export async function POST(request: NextRequest) {
  if (isDemoMode(request)) {
    return NextResponse.json(
      { error: 'Demo mode: changes are not saved. Use the full app to add real applications.' },
      { status: 403 }
    );
  }
  try {
    const { query, getClient } = await import('@/lib/db/client');
    const db = getClient();
    try {
      db.exec('ALTER TABLE jobs ADD COLUMN date_rejected TEXT');
    } catch {}
    try {
      db.exec('ALTER TABLE jobs ADD COLUMN rejection_source TEXT');
    } catch {}
    const body: CreateJobInput = await request.json();
    const { company, position, url, date_applied, status = 'applied', notes, date_rejected, rejection_source } = body;
    if (!company || !position || !date_applied) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    query(
      `INSERT INTO jobs (company, position, url, date_applied, status, notes, date_rejected, rejection_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [company, position, url || null, date_applied, status, notes || null, date_rejected || null, rejection_source || null]
    );
    const getResult = query('SELECT * FROM jobs WHERE id = (SELECT last_insert_rowid())');
    return NextResponse.json(getResult.rows[0] as Job, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
