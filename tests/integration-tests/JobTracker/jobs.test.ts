import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/jobs/route';

function req(url: string, opts?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  return new NextRequest(url, {
    method: opts?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
  });
}

describe('JobTracker API - /api/jobs', () => {
  describe('GET (with x-demo-mode)', () => {
    it('returns 200 and array of jobs with demo header', async () => {
      const request = req('http://localhost/api/jobs', {
        headers: { 'x-demo-mode': 'true' },
      });
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('company');
      expect(data[0]).toHaveProperty('position');
      expect(data[0]).toHaveProperty('status');
    });

    it('filters by company when company param provided', async () => {
      const request = req('http://localhost/api/jobs?company=Acme Corp', {
        headers: { 'x-demo-mode': 'true' },
      });
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      data.forEach((j: { company: string }) =>
        expect(j.company.toLowerCase()).toContain('acme')
      );
    });
  });

  describe('POST (with x-demo-mode)', () => {
    it('returns 403 in demo mode (changes not saved)', async () => {
      const request = req('http://localhost/api/jobs', {
        method: 'POST',
        headers: { 'x-demo-mode': 'true' },
        body: {
          company: 'Test Co',
          position: 'Engineer',
          date_applied: '2025-01-01',
        },
      });
      const response = await POST(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Demo mode');
    });
  });
});
