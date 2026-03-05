import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/client';
import type { HiredAdvice, CreateHiredAdviceInput } from '@/lib/types';

function ensureTable() {
  const db = getClient();
  db.exec(`
    CREATE TABLE IF NOT EXISTS hired_advice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      advice_text TEXT NOT NULL,
      linkedin_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_hired_advice_company ON hired_advice(company_name);
    CREATE INDEX IF NOT EXISTS idx_hired_advice_status ON hired_advice(status);
  `);
}

function isValidLinkedInUrl(url: string): boolean {
  const u = url.trim();
  return u.length > 0 && (u.startsWith('https://www.linkedin.com/') || u.startsWith('https://linkedin.com/') || /^https?:\/\/[^/]*linkedin\.com\//i.test(u));
}

/** GET /api/hired-advice?company=Name — returns only approved advice */
export function GET(request: NextRequest) {
  try {
    ensureTable();
    const company = request.nextUrl.searchParams.get('company')?.trim() ?? '';
    if (!company) {
      return NextResponse.json({ error: 'company query required' }, { status: 400 });
    }
    const result = query(
      `SELECT id, company_name, advice_text, linkedin_url, status, created_at
       FROM hired_advice
       WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(?)) AND status = 'approved'
       ORDER BY created_at DESC`,
      [company]
    );
    const list = (result.rows as HiredAdvice[]) || [];
    return NextResponse.json({ company: list[0]?.company_name ?? company, advice: list });
  } catch (e) {
    console.error('GET hired-advice error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

/** POST /api/hired-advice — submit with LinkedIn; status = pending until verified */
export async function POST(request: NextRequest) {
  try {
    ensureTable();
    const body = (await request.json()) as CreateHiredAdviceInput;
    const company_name = body.company_name?.trim() ?? '';
    const advice_text = body.advice_text?.trim() ?? '';
    const linkedin_url = body.linkedin_url?.trim() ?? '';

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }
    if (!advice_text) {
      return NextResponse.json({ error: 'Advice text is required.' }, { status: 400 });
    }
    if (!isValidLinkedInUrl(linkedin_url)) {
      return NextResponse.json({ error: 'A valid LinkedIn profile URL is required. We verify submissions before they appear.' }, { status: 400 });
    }

    const insertResult = query(
      `INSERT INTO hired_advice (company_name, advice_text, linkedin_url, status) VALUES (?, ?, ?, 'pending')`,
      [company_name, advice_text, linkedin_url]
    );
    const row = insertResult.rows[0] as { id?: number };
    const id = row?.id;
    if (id == null || insertResult.rowCount !== 1) {
      return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
    }
    const getResult = query(
      `SELECT id, company_name, advice_text, linkedin_url, status, created_at FROM hired_advice WHERE id = ?`,
      [id]
    );
    const created = getResult.rows[0] as HiredAdvice;
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('POST hired-advice error:', e);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
