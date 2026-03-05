import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/client';
import type { RealtimeApplicationInsight, CreateRealtimeInsightInput } from '@/lib/types';

const SOURCES = ['job_tracker', 'manual'] as const;

function ensureTable() {
  const db = getClient();
  db.exec(`
    CREATE TABLE IF NOT EXISTS realtime_application_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      date_applied TEXT NOT NULL,
      date_heard_back TEXT,
      response_channel TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_realtime_insights_company ON realtime_application_insights(company_name);
  `);
}

/** GET /api/realtime-application-insights?company=Name */
export function GET(request: NextRequest) {
  try {
    ensureTable();
    const company = request.nextUrl.searchParams.get('company')?.trim() ?? '';
    if (!company) {
      return NextResponse.json({ error: 'company query required' }, { status: 400 });
    }
    const result = query(
      `SELECT id, company_name, date_applied, date_heard_back, response_channel, source, created_at
       FROM realtime_application_insights
       WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(?))
       ORDER BY date_applied DESC, created_at DESC`,
      [company]
    );
    const insights = (result.rows as RealtimeApplicationInsight[]) || [];
    return NextResponse.json({ company: insights[0]?.company_name ?? company, insights });
  } catch (e) {
    console.error('GET realtime-application-insights error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

/** POST /api/realtime-application-insights — share timeline (from job tracker or manual) */
export async function POST(request: NextRequest) {
  try {
    ensureTable();
    const body = (await request.json()) as CreateRealtimeInsightInput;
    const company_name = body.company_name?.trim() ?? '';
    const date_applied = body.date_applied?.trim() ?? '';
    const date_heard_back = body.date_heard_back?.trim() || null;
    const response_channel = body.response_channel?.trim() || null;
    const source = SOURCES.includes(body.source as any) ? body.source : 'manual';

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }
    if (!date_applied) {
      return NextResponse.json({ error: 'Date applied is required.' }, { status: 400 });
    }

    const insertResult = query(
      `INSERT INTO realtime_application_insights (company_name, date_applied, date_heard_back, response_channel, source)
       VALUES (?, ?, ?, ?, ?)`,
      [company_name, date_applied, date_heard_back, response_channel, source]
    );
    const row = insertResult.rows[0] as { id?: number };
    const id = row?.id;
    if (id == null || insertResult.rowCount !== 1) {
      return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
    }
    const getResult = query(
      `SELECT id, company_name, date_applied, date_heard_back, response_channel, source, created_at
       FROM realtime_application_insights WHERE id = ?`,
      [id]
    );
    const created = getResult.rows[0] as RealtimeApplicationInsight;
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('POST realtime-application-insights error:', e);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
