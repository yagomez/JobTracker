import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { Job, CreateJobInput } from '@/lib/types';

// GET all jobs
export function GET() {
  try {
    const result = query(
      'SELECT * FROM jobs ORDER BY date_applied DESC'
    );
    return NextResponse.json(result.rows as Job[]);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST create new job
export async function POST(request: NextRequest) {
  try {
    const body: CreateJobInput = await request.json();
    
    const { company, position, url, date_applied, status = 'applied', notes } = body;

    if (!company || !position || !date_applied) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = query(
      `INSERT INTO jobs (company, position, url, date_applied, status, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [company, position, url || null, date_applied, status, notes || null]
    );

    // Get the inserted job
    const getResult = query(
      'SELECT * FROM jobs WHERE id = (SELECT last_insert_rowid())'
    );

    return NextResponse.json(getResult.rows[0] as Job, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
