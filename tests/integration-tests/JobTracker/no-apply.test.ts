import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/no-apply/route';

function req(url: string, opts?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  return new NextRequest(url, {
    method: opts?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
  });
}

describe('JobTracker API - /api/no-apply', () => {
  describe('GET (with x-demo-mode)', () => {
    it('returns 200 and list when no company param', async () => {
      const request = req('http://localhost/api/no-apply', { headers: { 'x-demo-mode': 'true' } });
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.list).toBeDefined();
      expect(Array.isArray(data.list)).toBe(true);
      expect(data.list.length).toBeGreaterThan(0);
      expect(data.list[0]).toHaveProperty('company_name');
      expect(data.list[0]).toHaveProperty('reason');
    });

    it('returns 200 and match when company matches demo', async () => {
      const request = req('http://localhost/api/no-apply?company=Acme Corp', { headers: { 'x-demo-mode': 'true' } });
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.match).toBeDefined();
      expect(data.match.company_name).toBe('Acme Corp');
    });

    it('returns 200 and null match when company not in demo', async () => {
      const request = req('http://localhost/api/no-apply?company=UnknownCo', { headers: { 'x-demo-mode': 'true' } });
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.match).toBeNull();
    });
  });

  describe('POST (with x-demo-mode)', () => {
    it('returns 403 in demo mode', async () => {
      const request = req('http://localhost/api/no-apply', {
        method: 'POST',
        headers: { 'x-demo-mode': 'true' },
        body: { company_name: 'Test', reason: 'Test reason' },
      });
      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });
});
