import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/reviews/route';

function req(url: string, opts?: { method?: string; body?: unknown }) {
  return new NextRequest(url, {
    method: opts?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
  });
}

describe('Blacklist Inc API - /api/reviews', () => {
  describe('GET', () => {
    it('returns 200 and companies array (empty or with data)', async () => {
      const request = req('http://localhost/api/reviews');
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.companies).toBeDefined();
      expect(Array.isArray(data.companies)).toBe(true);
    });

    it('returns 200 with company and reviews when company param provided', async () => {
      const request = req('http://localhost/api/reviews?company=Acme');
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.company).toBeDefined();
      expect(data.reviews).toBeDefined();
      expect(Array.isArray(data.reviews)).toBe(true);
    });
  });

  describe('POST', () => {
    it('returns 400 when company_name is missing', async () => {
      const request = req('http://localhost/api/reviews', {
        method: 'POST',
        body: {
          reviewer_type: 'prospective_interviewee',
          ghost_job_rating: 3,
        },
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 400 when reviewer_type is invalid', async () => {
      const request = req('http://localhost/api/reviews', {
        method: 'POST',
        body: {
          company_name: 'Test Co',
          reviewer_type: 'invalid_type',
          ghost_job_rating: 3,
        },
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 201 with valid body', async () => {
      const request = req('http://localhost/api/reviews', {
        method: 'POST',
        body: {
          company_name: `Integration Test Co ${Date.now()}`,
          reviewer_type: 'prospective_interviewee',
          ghost_job_rating: 3,
        },
      });
      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.company_name).toBeDefined();
      expect(data.ghost_job_rating).toBe(3);
    });
  });
});
