import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/client';
import type { ApplicationExperience, CreateApplicationExperienceInput } from '@/lib/types';

const CHANNELS = ['recruiter', 'phone', 'email', 'applicant_portal', 'other'] as const;

function ensureTable() {
  const db = getClient();
  db.exec(`
    CREATE TABLE IF NOT EXISTS application_experiences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      days_to_response INTEGER,
      response_channel TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_application_experiences_company ON application_experiences(company_name);
  `);
}

/** GET /api/application-experiences?company=Name */
export function GET(request: NextRequest) {
  try {
    ensureTable();
    const company = request.nextUrl.searchParams.get('company')?.trim() ?? '';
    if (!company) {
      return NextResponse.json({ error: 'company query required' }, { status: 400 });
    }
    const result = query(
      `SELECT id, company_name, days_to_response, response_channel, created_at
       FROM application_experiences
       WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(?))
       ORDER BY created_at DESC`,
      [company]
    );
    const questions = (result.rows as ApplicationExperience[]) || [];
    return NextResponse.json({ company: questions[0]?.company_name ?? company, experiences: questions });
  } catch (e) {
    console.error('GET application-experiences error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

/** POST /api/application-experiences */
export async function POST(request: NextRequest) {
  try {
    ensureTable();
    const body = (await request.json()) as CreateApplicationExperienceInput;
    const company_name = body.company_name?.trim() ?? '';
    const days_to_response = body.days_to_response == null ? null : Math.max(0, Math.min(365, Number(body.days_to_response)));
    const response_channel = CHANNELS.includes(body.response_channel as any) ? body.response_channel : 'other';

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }

    const insertResult = query(
      `INSERT INTO application_experiences (company_name, days_to_response, response_channel) VALUES (?, ?, ?)`,
      [company_name, days_to_response, response_channel]
    );
    const row = insertResult.rows[0] as { id?: number };
    const id = row?.id;
    if (id == null || insertResult.rowCount !== 1) {
      return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
    }
    const getResult = query(
      `SELECT id, company_name, days_to_response, response_channel, created_at FROM application_experiences WHERE id = ?`,
      [id]
    );
    const created = getResult.rows[0] as ApplicationExperience;
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('POST application-experiences error:', e);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
