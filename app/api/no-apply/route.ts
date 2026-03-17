import { NextRequest, NextResponse } from 'next/server';
import { NoApplyCompany } from '@/lib/types';

function isDemoMode(request: NextRequest): boolean {
  return request.headers.get('x-demo-mode') === 'true';
}

const DEMO_NO_APPLY: NoApplyCompany = {
  id: 1,
  company_name: 'Acme Corp',
  reason: 'Sent rejection to my current work email.',
  notes: null,
  created_at: new Date().toISOString(),
};

/**
 * GET /api/no-apply?company=SomeCompany — lookup one company (returns { match }).
 * GET /api/no-apply — return full list (returns { list: NoApplyCompany[] }).
 * Demo mode returns without loading the database.
 */
export async function GET(request: NextRequest) {
  const company = request.nextUrl.searchParams.get('company')?.trim() ?? '';

  if (!company) {
    if (isDemoMode(request)) {
      return NextResponse.json({ list: [DEMO_NO_APPLY] });
    }
    try {
      const { query, getClient } = await import('@/lib/db/client');
      const db = getClient();
      db.exec(`
        CREATE TABLE IF NOT EXISTS no_apply_companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_name TEXT NOT NULL UNIQUE,
          reason TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_no_apply_company_name ON no_apply_companies(company_name);
      `);
      try {
        db.exec('ALTER TABLE no_apply_companies ADD COLUMN notes TEXT');
      } catch {}
      const result = query(
        'SELECT id, company_name, reason, notes, created_at FROM no_apply_companies ORDER BY company_name ASC'
      );
      return NextResponse.json({ list: (result.rows as NoApplyCompany[]) || [] });
    } catch (error) {
      console.error('No-apply list error:', error);
      return NextResponse.json({ list: [] }, { status: 500 });
    }
  }

  if (isDemoMode(request)) {
    const nameLower = company.toLowerCase();
    const demoName = DEMO_NO_APPLY.company_name.toLowerCase();
    if (nameLower === demoName || demoName.includes(nameLower) || nameLower.includes(demoName)) {
      return NextResponse.json({ match: DEMO_NO_APPLY });
    }
    return NextResponse.json({ match: null });
  }

  try {
    const { query, getClient } = await import('@/lib/db/client');
    const db = getClient();
    db.exec(`
      CREATE TABLE IF NOT EXISTS no_apply_companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL UNIQUE,
        reason TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_no_apply_company_name ON no_apply_companies(company_name);
    `);
    try {
      db.exec('ALTER TABLE no_apply_companies ADD COLUMN notes TEXT');
    } catch {}
    const result = query(
      'SELECT id, company_name, reason, notes, created_at FROM no_apply_companies WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(?))',
      [company]
    );
    const row = (result.rows[0] as NoApplyCompany | undefined) ?? null;
    return NextResponse.json({ match: row });
  } catch (error) {
    console.error('No-apply check error:', error);
    return NextResponse.json({ match: null }, { status: 500 });
  }
}

type AddNoApplyBody = { company_name: string; reason: string; notes?: string | null };

export async function POST(request: NextRequest) {
  if (isDemoMode(request)) {
    return NextResponse.json(
      { error: 'Demo mode: changes are not saved. Use the full app to manage your no-apply list.' },
      { status: 403 }
    );
  }
  try {
    const { query, getClient } = await import('@/lib/db/client');
    const db = getClient();
    db.exec(`
      CREATE TABLE IF NOT EXISTS no_apply_companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL UNIQUE,
        reason TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_no_apply_company_name ON no_apply_companies(company_name);
    `);
    try {
      db.exec('ALTER TABLE no_apply_companies ADD COLUMN notes TEXT');
    } catch {}
    const body = (await request.json()) as AddNoApplyBody;
    const company_name = body.company_name?.trim() ?? '';
    const reason = body.reason?.trim() ?? '';
    const notes = body.notes?.trim() || null;
    if (!company_name || !reason) {
      return NextResponse.json(
        { error: 'Company name and reason are required.' },
        { status: 400 }
      );
    }
    const insertResult = query(
      'INSERT INTO no_apply_companies (company_name, reason, notes) VALUES (?, ?, ?)',
      [company_name, reason, notes]
    );
    const insertedRow = insertResult.rows[0] as { id?: number } | undefined;
    const insertedId = insertedRow?.id;
    if (insertedId == null || insertResult.rowCount !== 1) {
      console.error('POST no-apply: insert failed or returned no id', { insertResult });
      return NextResponse.json(
        { error: 'Failed to save to database. Please try again.' },
        { status: 500 }
      );
    }
    const getResult = query(
      'SELECT id, company_name, reason, notes, created_at FROM no_apply_companies WHERE id = ?',
      [insertedId]
    );
    const row = getResult.rows[0] as NoApplyCompany;
    if (!row) {
      return NextResponse.json(
        { error: 'Failed to retrieve saved entry.' },
        { status: 500 }
      );
    }
    return NextResponse.json(row, { status: 201 });
  } catch (error: unknown) {
    const message =
      error && typeof (error as { message?: string }).message === 'string'
        ? (error as { message: string }).message
        : 'Failed to add to no-apply list';
    if (message.includes('UNIQUE')) {
      return NextResponse.json(
        { error: 'That company is already on your no-apply list.' },
        { status: 409 }
      );
    }
    console.error('POST no-apply error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
