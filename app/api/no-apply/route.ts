import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { NoApplyCompany } from '@/lib/types';
import { getClient } from '@/lib/db/client';

function isDemoMode(request: NextRequest): boolean {
  return request.headers.get('x-demo-mode') === 'true';
}

// Demo-mode stub: one fake no-apply so the UI can be tried
const DEMO_NO_APPLY = {
  id: 1,
  company_name: 'Acme Corp',
  reason: 'Sent rejection to my current work email.',
  notes: null as string | null,
  created_at: new Date().toISOString(),
};

// Ensure no_apply_companies table exists and has notes column (for existing DBs)
function ensureNoApplyTable() {
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
  } catch {
    // Column already exists
  }
}

/**
 * GET /api/no-apply?company=SomeCompany — lookup one company (returns { match }).
 * GET /api/no-apply — return full list (returns { list: NoApplyCompany[] }).
 */
export function GET(request: NextRequest) {
  try {
    const company = request.nextUrl.searchParams.get('company')?.trim() ?? '';

    // Full list (no company param)
    if (!company) {
      if (isDemoMode(request)) {
        return NextResponse.json({ list: [DEMO_NO_APPLY] });
      }
      ensureNoApplyTable();
      const result = query(
        'SELECT id, company_name, reason, notes, created_at FROM no_apply_companies ORDER BY company_name ASC'
      );
      return NextResponse.json({ list: (result.rows as NoApplyCompany[]) || [] });
    }

    // Lookup single company
    if (isDemoMode(request)) {
      const nameLower = company.toLowerCase();
      const demoName = DEMO_NO_APPLY.company_name.toLowerCase();
      if (nameLower === demoName || demoName.includes(nameLower) || nameLower.includes(demoName)) {
        return NextResponse.json({ match: DEMO_NO_APPLY });
      }
      return NextResponse.json({ match: null });
    }

    ensureNoApplyTable();
    const result = query(
      'SELECT id, company_name, reason, notes, created_at FROM no_apply_companies WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(?))',
      [company]
    );
    const row = (result.rows[0] as NoApplyCompany | undefined) ?? null;
    return NextResponse.json({ match: row });
  } catch (error) {
    console.error('No-apply check error:', error);
    const isList = !request.nextUrl.searchParams.get('company')?.trim();
    return NextResponse.json(isList ? { list: [] } : { match: null }, { status: 500 });
  }
}

/** Body for adding a company to the no-apply list */
type AddNoApplyBody = { company_name: string; reason: string; notes?: string | null };

/**
 * POST /api/no-apply
 * Add a company to the no-apply list. Body: { company_name, reason, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    if (isDemoMode(request)) {
      return NextResponse.json(
        { error: 'Demo mode: changes are not saved. Use the full app to manage your no-apply list.' },
        { status: 403 }
      );
    }

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

    ensureNoApplyTable();
    query(
      'INSERT INTO no_apply_companies (company_name, reason, notes) VALUES (?, ?, ?)',
      [company_name, reason, notes]
    );
    const getResult = query(
      'SELECT id, company_name, reason, notes, created_at FROM no_apply_companies WHERE id = (SELECT last_insert_rowid())'
    );
    const row = getResult.rows[0] as NoApplyCompany;
    return NextResponse.json(row, { status: 201 });
  } catch (error: unknown) {
    const message = error && typeof (error as { message?: string }).message === 'string'
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
