import { NextResponse } from 'next/server';

/** GET /api/ping — returns immediately. Use to confirm the dev server is responding. */
export function GET() {
  return NextResponse.json({ pong: true, time: new Date().toISOString() });
}
