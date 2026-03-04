import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/client';
import { Job, UpdateJobInput } from '@/lib/types';
import { DEMO_JOBS } from '@/lib/demo-data';

function isDemoMode(request: NextRequest): boolean {
  return request.headers.get('x-demo-mode') === 'true';
}

function ensureJobsRejectionColumns() {
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
}

// GET single job
export function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (isDemoMode(request)) {
      const id = parseInt(params.id, 10);
      const job = DEMO_JOBS.find((j) => j.id === id);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json(job);
    }
    ensureJobsRejectionColumns();
    const result = query(
      'SELECT * FROM jobs WHERE id = ?',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0] as Job);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

// PUT update job
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (isDemoMode(request)) {
      return NextResponse.json(
        { error: 'Demo mode: changes are not saved.' },
        { status: 403 }
      );
    }
    const body: UpdateJobInput = await request.json();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.company !== undefined) {
      updates.push(`company = ?`);
      values.push(body.company);
    }
    if (body.position !== undefined) {
      updates.push(`position = ?`);
      values.push(body.position);
    }
    if (body.url !== undefined) {
      updates.push(`url = ?`);
      values.push(body.url);
    }
    if (body.date_applied !== undefined) {
      updates.push(`date_applied = ?`);
      values.push(body.date_applied);
    }
    if (body.status !== undefined) {
      updates.push(`status = ?`);
      values.push(body.status);
    }
    if (body.notes !== undefined) {
      updates.push(`notes = ?`);
      values.push(body.notes);
    }
    if (body.date_rejected !== undefined) {
      updates.push(`date_rejected = ?`);
      values.push(body.date_rejected);
    }
    if (body.rejection_source !== undefined) {
      updates.push(`rejection_source = ?`);
      values.push(body.rejection_source);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(params.id);

    query(
      `UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated job
    const result = query(
      'SELECT * FROM jobs WHERE id = ?',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0] as Job);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// DELETE job
export function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (isDemoMode(request)) {
      return NextResponse.json(
        { error: 'Demo mode: changes are not saved.' },
        { status: 403 }
      );
    }
    const result = query(
      'DELETE FROM jobs WHERE id = ?',
      [params.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
