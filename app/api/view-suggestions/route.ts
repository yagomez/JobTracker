import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/client';
import type { ViewSuggestion, CreateViewSuggestionInput } from '@/lib/types';

const VIEW_NAMES = ['overview', 'prospective_interviewee', 'employee', 'ex_employee'] as const;

function ensureTable() {
  const db = getClient();
  db.exec(`
    CREATE TABLE IF NOT EXISTS view_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT,
      view_name TEXT NOT NULL,
      suggestion_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_view_suggestions_view ON view_suggestions(view_name);
    CREATE INDEX IF NOT EXISTS idx_view_suggestions_company ON view_suggestions(company_name);
  `);
}

/** POST /api/view-suggestions — submit a suggestion for what data would be helpful for a view */
export async function POST(request: NextRequest) {
  try {
    ensureTable();
    const body = (await request.json()) as CreateViewSuggestionInput;
    const company_name = body.company_name?.trim() || null;
    const view_name = VIEW_NAMES.includes(body.view_name as any) ? body.view_name : 'overview';
    const suggestion_text = body.suggestion_text?.trim() ?? '';

    if (!suggestion_text) {
      return NextResponse.json({ error: 'Suggestion text is required.' }, { status: 400 });
    }

    const insertResult = query(
      `INSERT INTO view_suggestions (company_name, view_name, suggestion_text) VALUES (?, ?, ?)`,
      [company_name, view_name, suggestion_text]
    );
    const row = insertResult.rows[0] as { id?: number };
    const id = row?.id;
    if (id == null || insertResult.rowCount !== 1) {
      return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
    }
    const getResult = query(
      `SELECT id, company_name, view_name, suggestion_text, created_at FROM view_suggestions WHERE id = ?`,
      [id]
    );
    const created = getResult.rows[0] as ViewSuggestion;
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('POST view-suggestions error:', e);
    return NextResponse.json({ error: 'Failed to submit suggestion' }, { status: 500 });
  }
}
