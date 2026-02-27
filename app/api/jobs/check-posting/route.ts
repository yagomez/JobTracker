import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = parseInt(params.id);

  try {
    const result = query('SELECT * FROM jobs WHERE id = ?', [jobId]);
    const job = result.rows[0];
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!job.url) {
      return NextResponse.json(
        { error: 'No URL provided for this job' },
        { status: 400 }
      );
    }

    let postingStatus = 'unknown';
    let statusNotes = '';
    
    try {
      const response = await fetch(job.url, { 
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });
      
      if (response.status === 200) {
        postingStatus = 'active';
        statusNotes = 'URL is accessible';
      } else if (response.status === 404) {
        postingStatus = 'removed';
        statusNotes = 'Page returned 404 - likely removed';
      } else if (response.status >= 400) {
        postingStatus = 'unknown';
        statusNotes = `HTTP ${response.status} - Status unclear`;
      }
    } catch (error) {
      postingStatus = 'unknown';
      statusNotes = 'Could not reach URL (network error)';
    }

    const now = new Date().toISOString();
    query(
      'UPDATE jobs SET posting_status = ?, last_checked = ?, status_notes = ?, updated_at = ? WHERE id = ?',
      [postingStatus, now, statusNotes, now, jobId]
    );

    return NextResponse.json({
      id: jobId,
      posting_status: postingStatus,
      last_checked: now,
      status_notes: statusNotes,
    });
  } catch (error) {
    console.error('Error checking posting:', error);
    return NextResponse.json(
      { error: 'Failed to check posting status' },
      { status: 500 }
    );
  }
}