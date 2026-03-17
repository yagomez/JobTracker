import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

function req(url: string, opts?: { headers?: Record<string, string>; method?: string; body?: string }) {
  return new NextRequest(url, {
    method: opts?.method ?? 'GET',
    headers: opts?.headers,
    body: opts?.body,
  });
}

describe('JobTracker API - /api/interview-prep/[jobId]', () => {
  describe('GET (with x-demo-mode)', () => {
    it('returns 200 and empty prep for job in phone_screening', async () => {
      const { GET } = await import('@/app/api/interview-prep/[jobId]/route');
      const request = req('http://localhost/api/interview-prep/4', {
        headers: { 'x-demo-mode': 'true' },
      });
      const response = await GET(request, { params: Promise.resolve({ jobId: '4' }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.job_id).toBe(4);
      expect(data.role_description).toBe('');
      expect(Array.isArray(data.study_topics)).toBe(true);
      expect(Array.isArray(data.leetcode_links)).toBe(true);
      expect(Array.isArray(data.checklist)).toBe(true);
    });

    it('returns 200 for job in interviewing status', async () => {
      const { GET } = await import('@/app/api/interview-prep/[jobId]/route');
      const request = req('http://localhost/api/interview-prep/12', {
        headers: { 'x-demo-mode': 'true' },
      });
      const response = await GET(request, { params: Promise.resolve({ jobId: '12' }) });
      expect(response.status).toBe(200);
    });

    it('returns 400 when job is not in phone_screening or interviewing', async () => {
      const { GET } = await import('@/app/api/interview-prep/[jobId]/route');
      const request = req('http://localhost/api/interview-prep/1', {
        headers: { 'x-demo-mode': 'true' },
      });
      const response = await GET(request, { params: Promise.resolve({ jobId: '1' }) });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('phone screening');
    });

    it('returns 404 for non-existent job in demo', async () => {
      const { GET } = await import('@/app/api/interview-prep/[jobId]/route');
      const request = req('http://localhost/api/interview-prep/99999', {
        headers: { 'x-demo-mode': 'true' },
      });
      const response = await GET(request, { params: Promise.resolve({ jobId: '99999' }) });
      expect(response.status).toBe(404);
    });

    it('returns 400 for invalid job ID', async () => {
      const { GET } = await import('@/app/api/interview-prep/[jobId]/route');
      const request = req('http://localhost/api/interview-prep/abc', {
        headers: { 'x-demo-mode': 'true' },
      });
      const response = await GET(request, { params: Promise.resolve({ jobId: 'abc' }) });
      expect(response.status).toBe(400);
    });
  });

  describe('PUT (with x-demo-mode)', () => {
    it('returns 403 in demo mode', async () => {
      const { PUT } = await import('@/app/api/interview-prep/[jobId]/route');
      const r = req('http://localhost/api/interview-prep/4', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-demo-mode': 'true' },
        body: JSON.stringify({
          role_description: 'Test',
          study_topics: [],
          leetcode_links: [],
          checklist: [],
        }),
      });
      const response = await PUT(r, { params: Promise.resolve({ jobId: '4' }) });
      expect(response.status).toBe(403);
    });
  });
});
