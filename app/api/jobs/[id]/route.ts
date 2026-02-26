import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { Job, UpdateJobInput } from '@/lib/types';

// GET single job
export function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
