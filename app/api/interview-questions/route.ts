import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/client';
import type { InterviewQuestion, CreateInterviewQuestionInput } from '@/lib/types';

const QUESTION_TYPES = ['tech', 'behavioral', 'system_design', 'other'] as const;

function ensureInterviewQuestionsTable() {
  const db = getClient();
  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'tech',
      leetcode_topic TEXT,
      is_most_recent INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_interview_questions_company ON interview_questions(company_name);
    CREATE INDEX IF NOT EXISTS idx_interview_questions_type ON interview_questions(question_type);
  `);
}

/** GET /api/interview-questions?company=ExactName — list questions for a company. Returns { company, questions } */
export function GET(request: NextRequest) {
  try {
    ensureInterviewQuestionsTable();
    const company = request.nextUrl.searchParams.get('company')?.trim() ?? '';
    if (!company) {
      return NextResponse.json({ error: 'company query is required.' }, { status: 400 });
    }
    const result = query(
      `SELECT id, company_name, question_text, question_type, leetcode_topic, is_most_recent, created_at
       FROM interview_questions
       WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(?))
       ORDER BY created_at DESC`,
      [company]
    );
    const rows = (result.rows as any[]) || [];
    const questions: InterviewQuestion[] = rows.map((r) => ({
      id: r.id,
      company_name: r.company_name,
      question_text: r.question_text,
      question_type: r.question_type,
      leetcode_topic: r.leetcode_topic ?? null,
      is_most_recent: Boolean(r.is_most_recent),
      created_at: r.created_at,
    }));
    const companyName = questions[0]?.company_name ?? company;
    return NextResponse.json({ company: companyName, questions });
  } catch (error) {
    console.error('GET interview-questions error:', error);
    return NextResponse.json({ error: 'Failed to fetch interview questions' }, { status: 500 });
  }
}

/** POST /api/interview-questions — submit a question (anonymous). No Glassdoor-style posting required. */
export async function POST(request: NextRequest) {
  try {
    ensureInterviewQuestionsTable();
    const body = (await request.json()) as CreateInterviewQuestionInput;
    const company_name = body.company_name?.trim() ?? '';
    const question_text = body.question_text?.trim() ?? '';
    const question_type = QUESTION_TYPES.includes(body.question_type as any) ? body.question_type : 'tech';
    const leetcode_topic = body.leetcode_topic?.trim() || null;
    const is_most_recent = Boolean(body.is_most_recent);

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }
    if (!question_text) {
      return NextResponse.json({ error: 'Question text is required.' }, { status: 400 });
    }

    const insertResult = query(
      `INSERT INTO interview_questions (company_name, question_text, question_type, leetcode_topic, is_most_recent)
       VALUES (?, ?, ?, ?, ?)`,
      [company_name, question_text, question_type, leetcode_topic, is_most_recent ? 1 : 0]
    );
    const insertRow = insertResult.rows[0] as { id?: number } | undefined;
    const id = insertRow?.id;
    if (id == null || insertResult.rowCount !== 1) {
      return NextResponse.json({ error: 'Failed to save question.' }, { status: 500 });
    }
    const getResult = query(
      `SELECT id, company_name, question_text, question_type, leetcode_topic, is_most_recent, created_at
       FROM interview_questions WHERE id = ?`,
      [id]
    );
    const row = getResult.rows[0] as any;
    const question: InterviewQuestion = {
      id: row.id,
      company_name: row.company_name,
      question_text: row.question_text,
      question_type: row.question_type,
      leetcode_topic: row.leetcode_topic ?? null,
      is_most_recent: Boolean(row.is_most_recent),
      created_at: row.created_at,
    };
    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('POST interview-questions error:', error);
    return NextResponse.json({ error: 'Failed to submit question' }, { status: 500 });
  }
}
