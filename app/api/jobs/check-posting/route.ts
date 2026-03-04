import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { Job } from '@/lib/types';
import { DEMO_JOBS } from '@/lib/demo-data';

function isDemoMode(request: NextRequest): boolean {
  return request.headers.get('x-demo-mode') === 'true';
}

export async function POST(request: NextRequest) {
  const jobId = parseInt(request.nextUrl.searchParams.get('id') ?? '', 10);
  if (Number.isNaN(jobId)) {
    return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
  }

  try {
    if (isDemoMode(request)) {
      const job = DEMO_JOBS.find((j) => j.id === jobId);
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      return NextResponse.json({
        id: jobId,
        posting_status: job.posting_status,
        last_checked: new Date().toISOString(),
        status_notes: job.status_notes ?? 'Demo – no live check',
      });
    }
    const result = query('SELECT * FROM jobs WHERE id = ?', [jobId]);
    const job = result.rows[0] as Job | undefined;
    
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(job.url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
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