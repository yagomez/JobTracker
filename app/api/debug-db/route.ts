import { NextResponse } from 'next/server';

/**
 * GET /api/debug-db — quick check that the app is using your local DB.
 * Returns job count from the database the server is actually connected to.
 * Remove or ignore this route in production.
 */
export async function GET() {
  const out: { ok: boolean; jobCount?: number; error?: string; hint?: string } = { ok: false };

  try {
    const { query } = await import('@/lib/db/client');
    const result = query('SELECT COUNT(*) as count FROM jobs');
    const count = (result.rows[0] as { count: number })?.count ?? 0;
    out.ok = true;
    out.jobCount = count;
    return NextResponse.json(out);
  } catch (err) {
    out.error = err instanceof Error ? err.message : String(err);
    out.hint = 'Check DATABASE_URL in .env.local and that the file path exists. Restart the dev server after changing .env.local.';
    console.error('debug-db error:', err);
    return NextResponse.json(out, { status: 200 });
  }
}
