import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/client';
import type { InterviewPrep, InterviewPrepChecklistItem } from '@/lib/types';
import { DEMO_JOBS } from '@/lib/demo-data';

function isDemoMode(request: NextRequest): boolean {
  return request.headers.get('x-demo-mode') === 'true';
}

function ensureInterviewPrepTable() {
  const db = getClient();
  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_prep (
      job_id INTEGER PRIMARY KEY,
      role_description TEXT DEFAULT '',
      study_topics TEXT DEFAULT '[]',
      leetcode_links TEXT DEFAULT '[]',
      checklist TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `);
}

function parsePrep(row: {
  job_id: number;
  role_description: string | null;
  study_topics: string;
  leetcode_links: string;
  checklist: string;
  updated_at: string;
}): InterviewPrep {
  return {
    job_id: row.job_id,
    role_description: row.role_description || '',
    study_topics: parseJson(row.study_topics, []),
    leetcode_links: parseJson(row.leetcode_links, []),
    checklist: parseJson(row.checklist, []),
    updated_at: row.updated_at,
  };
}

function parseJson<T>(s: string, fallback: T): T {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

const emptyPrep = (jobId: number): InterviewPrep => ({
  job_id: jobId,
  role_description: '',
  study_topics: [],
  leetcode_links: [],
  checklist: [],
  updated_at: new Date().toISOString(),
});

// GET prep for a job
export function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return (async () => {
    try {
      const jobId = parseInt((await params).jobId, 10);
      if (Number.isNaN(jobId)) {
        return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
      }

      if (isDemoMode(request)) {
        const job = DEMO_JOBS.find((j) => j.id === jobId);
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        const isPrepping = job.status === 'phone_screening' || job.status === 'interviewing';
        if (!isPrepping) return NextResponse.json({ error: 'Job is not in phone screening or interviewing' }, { status: 400 });
        return NextResponse.json(emptyPrep(jobId));
      }

      ensureInterviewPrepTable();
      const result = query('SELECT * FROM interview_prep WHERE job_id = ?', [jobId]);

      if (result.rows.length === 0) {
        return NextResponse.json(emptyPrep(jobId));
      }

      return NextResponse.json(parsePrep(result.rows[0] as Parameters<typeof parsePrep>[0]));
    } catch (error) {
      console.error('GET interview-prep error:', error);
      return NextResponse.json({ error: 'Failed to fetch prep' }, { status: 500 });
    }
  })();
}

// PUT upsert prep for a job
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const jobId = parseInt((await params).jobId, 10);
    if (Number.isNaN(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    if (isDemoMode(request)) {
      return NextResponse.json(
        { error: 'Demo mode: changes are not saved.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const role_description = typeof body.role_description === 'string' ? body.role_description : '';
    const study_topics = Array.isArray(body.study_topics) ? body.study_topics : [];
    const leetcode_links = Array.isArray(body.leetcode_links)
      ? body.leetcode_links.filter((l: unknown) => l && typeof l === 'object' && 'url' in l && 'label' in l)
      : [];
    const checklist = Array.isArray(body.checklist)
      ? body.checklist.filter((c: unknown) => c && typeof c === 'object' && 'id' in c && 'label' in c && typeof (c as InterviewPrepChecklistItem).done === 'boolean')
      : [];

    ensureInterviewPrepTable();

    const studyJson = JSON.stringify(study_topics);
    const leetcodeJson = JSON.stringify(leetcode_links);
    const checklistJson = JSON.stringify(checklist);

    // Upsert: insert or update
    const existing = query('SELECT job_id FROM interview_prep WHERE job_id = ?', [jobId]);
    if (existing.rows.length > 0) {
      query(
        `UPDATE interview_prep SET role_description = ?, study_topics = ?, leetcode_links = ?, checklist = ?, updated_at = CURRENT_TIMESTAMP WHERE job_id = ?`,
        [role_description, studyJson, leetcodeJson, checklistJson, jobId]
      );
    } else {
      query(
        `INSERT INTO interview_prep (job_id, role_description, study_topics, leetcode_links, checklist) VALUES (?, ?, ?, ?, ?)`,
        [jobId, role_description, studyJson, leetcodeJson, checklistJson]
      );
    }

    const result = query('SELECT * FROM interview_prep WHERE job_id = ?', [jobId]);
    if (result.rows.length === 0) {
      return NextResponse.json(emptyPrep(jobId));
    }
    return NextResponse.json(parsePrep(result.rows[0] as Parameters<typeof parsePrep>[0]));
  } catch (error) {
    console.error('PUT interview-prep error:', error);
    return NextResponse.json({ error: 'Failed to save prep' }, { status: 500 });
  }
}
