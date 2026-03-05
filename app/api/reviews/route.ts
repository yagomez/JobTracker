import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/client';
import type { CompanyReview, CreateCompanyReviewInput } from '@/lib/types';

function ensureCompanyReviewsTable() {
  const db = getClient();
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      reviewer_type TEXT NOT NULL,
      ghost_job_rating INTEGER NOT NULL,
      review_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_company_reviews_company_name ON company_reviews(company_name);
    CREATE INDEX IF NOT EXISTS idx_company_reviews_reviewer_type ON company_reviews(reviewer_type);
  `);
}

/** GET /api/reviews?search=... — list companies (with optional search). Returns { companies: { name, reviewCount, avgGhostRating }[] } */
/** GET /api/reviews?company=ExactName — get all reviews for one company. Returns { company, reviews } */
export function GET(request: NextRequest) {
  try {
    ensureCompanyReviewsTable();
    const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';
    const company = request.nextUrl.searchParams.get('company')?.trim() ?? '';

    if (company) {
      const result = query(
        'SELECT id, company_name, reviewer_type, ghost_job_rating, review_text, created_at, updated_at FROM company_reviews WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(?)) ORDER BY created_at DESC',
        [company]
      );
      const reviews = (result.rows as CompanyReview[]) || [];
      const companyName = reviews[0]?.company_name ?? company;
      return NextResponse.json({ company: companyName, reviews });
    }

    let sql = `
      SELECT company_name, COUNT(*) as review_count, AVG(ghost_job_rating) as avg_rating
      FROM company_reviews
    `;
    const params: (string | number)[] = [];
    if (search) {
      sql += ' WHERE LOWER(TRIM(company_name)) LIKE ?';
      params.push(`%${search.toLowerCase()}%`);
    }
    sql += ' GROUP BY LOWER(TRIM(company_name)) ORDER BY company_name ASC';

    const result = query(sql, params.length ? params : undefined);
    const companies = (result.rows as { company_name: string; review_count: number; avg_rating: number }[]).map((row) => ({
      name: row.company_name,
      reviewCount: row.review_count,
      avgGhostRating: Math.round((row.avg_rating || 0) * 10) / 10,
    }));
    return NextResponse.json({ companies });
  } catch (error) {
    console.error('GET reviews error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

/** POST /api/reviews — create a company review */
export async function POST(request: NextRequest) {
  try {
    ensureCompanyReviewsTable();
    const body = (await request.json()) as CreateCompanyReviewInput;
    const company_name = body.company_name?.trim() ?? '';
    const reviewer_type = body.reviewer_type ?? 'prospective_interviewee';
    const ghost_job_rating = Math.min(5, Math.max(1, Number(body.ghost_job_rating) || 1));
    const review_text = body.review_text?.trim() || null;

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }
    const validTypes = ['prospective_interviewee', 'employee', 'ex_employee'];
    if (!validTypes.includes(reviewer_type)) {
      return NextResponse.json({ error: 'Invalid reviewer type.' }, { status: 400 });
    }

    const insertResult = query(
      'INSERT INTO company_reviews (company_name, reviewer_type, ghost_job_rating, review_text) VALUES (?, ?, ?, ?)',
      [company_name, reviewer_type, ghost_job_rating, review_text]
    );
    const insertRow = insertResult.rows[0] as { id?: number } | undefined;
    const id = insertRow?.id;
    if (id == null || insertResult.rowCount !== 1) {
      return NextResponse.json({ error: 'Failed to save review.' }, { status: 500 });
    }
    const getResult = query(
      'SELECT id, company_name, reviewer_type, ghost_job_rating, review_text, created_at, updated_at FROM company_reviews WHERE id = ?',
      [id]
    );
    const row = getResult.rows[0] as CompanyReview;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('POST reviews error:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
