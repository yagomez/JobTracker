import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { Job, CreateJobInput, UpdateJobInput } from '@/lib/types';

// GET all jobs
export async function GET() {
  try {
    const result = await query(
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

    const result = await query(
      `INSERT INTO jobs (company, position, url, date_applied, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [company, position, url || null, date_applied, status, notes || null]
    );

    return NextResponse.json(result.rows[0] as Job, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
