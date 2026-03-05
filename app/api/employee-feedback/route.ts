import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/client';
import type { EmployeeFeedback, CreateEmployeeFeedbackInput } from '@/lib/types';

const VISIBILITY = ['public', 'aggregate_only'] as const;

function ensureTable() {
  const db = getClient();
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      culture_rating INTEGER NOT NULL,
      management_rating INTEGER NOT NULL,
      work_life_rating INTEGER NOT NULL,
      compensation_rating INTEGER NOT NULL,
      feedback_text TEXT,
      linkedin_url TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'aggregate_only',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_employee_feedback_company ON employee_feedback(company_name);
    CREATE INDEX IF NOT EXISTS idx_employee_feedback_status ON employee_feedback(status);
    CREATE INDEX IF NOT EXISTS idx_employee_feedback_visibility ON employee_feedback(visibility);
  `);
}

function isValidLinkedInUrl(url: string): boolean {
  const u = url.trim();
  return u.length > 0 && (u.startsWith('https://www.linkedin.com/') || u.startsWith('https://linkedin.com/') || /^https?:\/\/[^/]*linkedin\.com\//i.test(u));
}

function clampRating(n: number): number {
  return Math.min(5, Math.max(1, Math.round(Number(n)) || 1));
}

/** GET /api/employee-feedback?company=Name
 *  Returns: publicFeedback (approved + public), aggregateStats (from all approved), overallFeedbackSnippets (anonymized text from aggregate_only)
 */
export function GET(request: NextRequest) {
  try {
    ensureTable();
    const company = request.nextUrl.searchParams.get('company')?.trim() ?? '';
    if (!company) {
      return NextResponse.json({ error: 'company query required' }, { status: 400 });
    }
    const norm = company.toLowerCase().trim();

    // Public feedback: approved + visibility = public (no linkedin_url in response for privacy)
    const publicResult = query(
      `SELECT id, company_name, culture_rating, management_rating, work_life_rating, compensation_rating, feedback_text, visibility, status, created_at
       FROM employee_feedback
       WHERE LOWER(TRIM(company_name)) = ? AND status = 'approved' AND visibility = 'public'
       ORDER BY created_at DESC`,
      [norm]
    );
    const publicRows = (publicResult.rows as any[]) || [];
    const publicFeedback = publicRows.map((r) => ({
      id: r.id,
      company_name: r.company_name,
      culture_rating: r.culture_rating,
      management_rating: r.management_rating,
      work_life_rating: r.work_life_rating,
      compensation_rating: r.compensation_rating,
      feedback_text: r.feedback_text,
      visibility: r.visibility,
      created_at: r.created_at,
    }));

    // All approved for aggregate stats
    const allApproved = query(
      `SELECT culture_rating, management_rating, work_life_rating, compensation_rating, feedback_text, visibility
       FROM employee_feedback
       WHERE LOWER(TRIM(company_name)) = ? AND status = 'approved'`,
      [norm]
    );
    const rows = (allApproved.rows as any[]) || [];
    const count = rows.length;
    const sums = { culture: 0, management: 0, work_life: 0, compensation: 0 };
    const snippets: string[] = [];
    rows.forEach((r) => {
      sums.culture += r.culture_rating;
      sums.management += r.management_rating;
      sums.work_life += r.work_life_rating;
      sums.compensation += r.compensation_rating;
      if (r.visibility === 'aggregate_only' && r.feedback_text && r.feedback_text.trim()) {
        snippets.push(r.feedback_text.trim());
      }
    });
    const aggregateStats = count
      ? {
          response_count: count,
          avg_culture: Math.round((sums.culture / count) * 10) / 10,
          avg_management: Math.round((sums.management / count) * 10) / 10,
          avg_work_life: Math.round((sums.work_life / count) * 10) / 10,
          avg_compensation: Math.round((sums.compensation / count) * 10) / 10,
        }
      : null;

    return NextResponse.json({
      company: publicFeedback[0]?.company_name ?? company,
      publicFeedback,
      aggregateStats,
      overallFeedbackSnippets: snippets,
    });
  } catch (e) {
    console.error('GET employee-feedback error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

/** POST /api/employee-feedback — anonymous submission; LinkedIn required for verification (same process as hired advice) */
export async function POST(request: NextRequest) {
  try {
    ensureTable();
    const body = (await request.json()) as CreateEmployeeFeedbackInput;
    const company_name = body.company_name?.trim() ?? '';
    const culture_rating = clampRating(body.culture_rating);
    const management_rating = clampRating(body.management_rating);
    const work_life_rating = clampRating(body.work_life_rating);
    const compensation_rating = clampRating(body.compensation_rating);
    const feedback_text = body.feedback_text?.trim() || null;
    const linkedin_url = body.linkedin_url?.trim() ?? '';
    const visibility = VISIBILITY.includes(body.visibility as any) ? body.visibility : 'aggregate_only';

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }
    if (!isValidLinkedInUrl(linkedin_url)) {
      return NextResponse.json({ error: 'A valid LinkedIn profile URL is required. We verify you worked there before using your feedback (same process as other verified sections).' }, { status: 400 });
    }

    const insertResult = query(
      `INSERT INTO employee_feedback (company_name, culture_rating, management_rating, work_life_rating, compensation_rating, feedback_text, linkedin_url, visibility, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [company_name, culture_rating, management_rating, work_life_rating, compensation_rating, feedback_text, linkedin_url, visibility]
    );
    const row = insertResult.rows[0] as { id?: number };
    const id = row?.id;
    if (id == null || insertResult.rowCount !== 1) {
      return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
    }
    const getResult = query(
      `SELECT id, company_name, culture_rating, management_rating, work_life_rating, compensation_rating, feedback_text, linkedin_url, visibility, status, created_at
       FROM employee_feedback WHERE id = ?`,
      [id]
    );
    const created = getResult.rows[0] as EmployeeFeedback;
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('POST employee-feedback error:', e);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
