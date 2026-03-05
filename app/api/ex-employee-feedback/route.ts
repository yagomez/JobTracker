import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/client';
import type { ExEmployeeFeedback, CreateExEmployeeFeedbackInput } from '@/lib/types';

const PARENTAL_LEAVE_USED = ['yes', 'no', 'na'] as const;
const PARENTAL_LEAVE_ACCOMMODATING = ['yes', 'no', 'somewhat', 'na'] as const;

function ensureTable() {
  const db = getClient();
  db.exec(`
    CREATE TABLE IF NOT EXISTS ex_employee_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      linkedin_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      years_to_promotion REAL,
      leadership_rating INTEGER,
      leadership_year INTEGER,
      benefits_rating INTEGER NOT NULL,
      work_life_rating INTEGER NOT NULL,
      used_parental_leave TEXT,
      parental_leave_accommodating TEXT,
      feedback_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ex_employee_feedback_company ON ex_employee_feedback(company_name);
    CREATE INDEX IF NOT EXISTS idx_ex_employee_feedback_status ON ex_employee_feedback(status);
  `);
}

function isValidLinkedInUrl(url: string): boolean {
  const u = url.trim();
  return u.length > 0 && (u.startsWith('https://www.linkedin.com/') || u.startsWith('https://linkedin.com/') || /^https?:\/\/[^/]*linkedin\.com\//i.test(u));
}

function clampRating(n: number): number {
  return Math.min(5, Math.max(1, Math.round(Number(n)) || 1));
}

/** GET /api/ex-employee-feedback?company=Name — aggregate stats from approved only */
export function GET(request: NextRequest) {
  try {
    ensureTable();
    const company = request.nextUrl.searchParams.get('company')?.trim() ?? '';
    if (!company) {
      return NextResponse.json({ error: 'company query required' }, { status: 400 });
    }
    const norm = company.toLowerCase().trim();

    const result = query(
      `SELECT years_to_promotion, leadership_rating, leadership_year, benefits_rating, work_life_rating, used_parental_leave, parental_leave_accommodating, feedback_text
       FROM ex_employee_feedback
       WHERE LOWER(TRIM(company_name)) = ? AND status = 'approved'`,
      [norm]
    );
    const rows = (result.rows as any[]) || [];
    const count = rows.length;

    let sumYearsToPromo = 0;
    let countYearsToPromo = 0;
    let sumLeadership = 0;
    let countLeadership = 0;
    let sumBenefits = 0;
    let sumWorkLife = 0;
    const parentalLeaveYes = { count: 0, accommodating: { yes: 0, no: 0, somewhat: 0 } };
    const snippets: string[] = [];

    rows.forEach((r) => {
      if (r.years_to_promotion != null && r.years_to_promotion >= 0) {
        sumYearsToPromo += r.years_to_promotion;
        countYearsToPromo += 1;
      }
      if (r.leadership_rating != null && r.leadership_rating >= 1 && r.leadership_rating <= 5) {
        sumLeadership += r.leadership_rating;
        countLeadership += 1;
      }
      sumBenefits += r.benefits_rating ?? 0;
      sumWorkLife += r.work_life_rating ?? 0;
      if (r.used_parental_leave === 'yes') {
        parentalLeaveYes.count += 1;
        if (r.parental_leave_accommodating === 'yes') parentalLeaveYes.accommodating.yes += 1;
        else if (r.parental_leave_accommodating === 'no') parentalLeaveYes.accommodating.no += 1;
        else if (r.parental_leave_accommodating === 'somewhat') parentalLeaveYes.accommodating.somewhat += 1;
      }
      if (r.feedback_text && r.feedback_text.trim()) snippets.push(r.feedback_text.trim());
    });

    const aggregateStats = count
      ? {
          response_count: count,
          avg_years_to_promotion: countYearsToPromo ? Math.round((sumYearsToPromo / countYearsToPromo) * 10) / 10 : null,
          count_years_to_promotion: countYearsToPromo,
          avg_leadership: countLeadership ? Math.round((sumLeadership / countLeadership) * 10) / 10 : null,
          count_leadership: countLeadership,
          avg_benefits: Math.round((sumBenefits / count) * 10) / 10,
          avg_work_life: Math.round((sumWorkLife / count) * 10) / 10,
          parental_leave: {
            used_yes_count: parentalLeaveYes.count,
            accommodating_yes: parentalLeaveYes.accommodating.yes,
            accommodating_no: parentalLeaveYes.accommodating.no,
            accommodating_somewhat: parentalLeaveYes.accommodating.somewhat,
          },
        }
      : null;

    return NextResponse.json({
      company: rows[0] ? company : company,
      aggregateStats,
      overallFeedbackSnippets: snippets,
    });
  } catch (e) {
    console.error('GET ex-employee-feedback error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

/** POST /api/ex-employee-feedback — submit with LinkedIn; status = pending until verified */
export async function POST(request: NextRequest) {
  try {
    ensureTable();
    const body = (await request.json()) as CreateExEmployeeFeedbackInput;
    const company_name = body.company_name?.trim() ?? '';
    const linkedin_url = body.linkedin_url?.trim() ?? '';
    const years_to_promotion = body.years_to_promotion != null && body.years_to_promotion >= 0 ? Number(body.years_to_promotion) : null;
    const leadership_rating = body.leadership_rating != null && body.leadership_rating >= 1 && body.leadership_rating <= 5 ? body.leadership_rating : null;
    const leadership_year = body.leadership_year != null && body.leadership_year >= 1990 && body.leadership_year <= 2030 ? body.leadership_year : null;
    const benefits_rating = clampRating(body.benefits_rating ?? 3);
    const work_life_rating = clampRating(body.work_life_rating ?? 3);
    const used_parental_leave = PARENTAL_LEAVE_USED.includes(body.used_parental_leave as any) ? body.used_parental_leave : null;
    const parental_leave_accommodating = PARENTAL_LEAVE_ACCOMMODATING.includes(body.parental_leave_accommodating as any) ? body.parental_leave_accommodating : null;
    const feedback_text = body.feedback_text?.trim() || null;

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }
    if (!isValidLinkedInUrl(linkedin_url)) {
      return NextResponse.json({ error: 'A valid LinkedIn profile URL is required. We verify ex-employee status before publishing (same process as other sections).' }, { status: 400 });
    }

    const insertResult = query(
      `INSERT INTO ex_employee_feedback (company_name, linkedin_url, status, years_to_promotion, leadership_rating, leadership_year, benefits_rating, work_life_rating, used_parental_leave, parental_leave_accommodating, feedback_text)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_name, linkedin_url, years_to_promotion, leadership_rating, leadership_year, benefits_rating, work_life_rating, used_parental_leave, parental_leave_accommodating, feedback_text]
    );
    const row = insertResult.rows[0] as { id?: number };
    const id = row?.id;
    if (id == null || insertResult.rowCount !== 1) {
      return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
    }
    const getResult = query(
      `SELECT id, company_name, linkedin_url, status, years_to_promotion, leadership_rating, leadership_year, benefits_rating, work_life_rating, used_parental_leave, parental_leave_accommodating, feedback_text, created_at
       FROM ex_employee_feedback WHERE id = ?`,
      [id]
    );
    const created = getResult.rows[0] as ExEmployeeFeedback;
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('POST ex-employee-feedback error:', e);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
