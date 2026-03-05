import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/client';
import type { CompanySalaryRange, CreateSalaryRangeInput } from '@/lib/types';

function ensureTable() {
  const db = getClient();
  db.exec(`
    CREATE TABLE IF NOT EXISTS salary_ranges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      role_title TEXT NOT NULL,
      min_salary REAL NOT NULL,
      max_salary REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      source TEXT NOT NULL DEFAULT 'careers_page',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_salary_ranges_company ON salary_ranges(company_name);
  `);
}

/** GET /api/salary-ranges?company=Name */
export function GET(request: NextRequest) {
  try {
    ensureTable();
    const company = request.nextUrl.searchParams.get('company')?.trim() ?? '';
    if (!company) {
      return NextResponse.json({ error: 'company query required' }, { status: 400 });
    }
    const result = query(
      `SELECT id, company_name, role_title, min_salary, max_salary, currency, source, created_at
       FROM salary_ranges
       WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(?))
       ORDER BY role_title ASC, created_at DESC`,
      [company]
    );
    const ranges = (result.rows as CompanySalaryRange[]) || [];
    return NextResponse.json({ company: ranges[0]?.company_name ?? company, ranges });
  } catch (e) {
    console.error('GET salary-ranges error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

/** POST /api/salary-ranges — submit a range (e.g. from careers page) */
export async function POST(request: NextRequest) {
  try {
    ensureTable();
    const body = (await request.json()) as CreateSalaryRangeInput;
    const company_name = body.company_name?.trim() ?? '';
    const role_title = body.role_title?.trim() ?? '';
    const min_salary = Number(body.min_salary);
    const max_salary = Number(body.max_salary);
    const currency = (body.currency?.trim() || 'USD').toUpperCase().slice(0, 3);
    const source = body.source?.trim() || 'careers_page';

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }
    if (!role_title) {
      return NextResponse.json({ error: 'Role title is required.' }, { status: 400 });
    }
    if (!Number.isFinite(min_salary) || min_salary < 0) {
      return NextResponse.json({ error: 'Valid min salary is required.' }, { status: 400 });
    }
    if (!Number.isFinite(max_salary) || max_salary < min_salary) {
      return NextResponse.json({ error: 'Valid max salary (≥ min) is required.' }, { status: 400 });
    }

    const insertResult = query(
      `INSERT INTO salary_ranges (company_name, role_title, min_salary, max_salary, currency, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [company_name, role_title, min_salary, max_salary, currency, source]
    );
    const row = insertResult.rows[0] as { id?: number };
    const id = row?.id;
    if (id == null || insertResult.rowCount !== 1) {
      return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
    }
    const getResult = query(
      `SELECT id, company_name, role_title, min_salary, max_salary, currency, source, created_at
       FROM salary_ranges WHERE id = ?`,
      [id]
    );
    const created = getResult.rows[0] as CompanySalaryRange;
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('POST salary-ranges error:', e);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
