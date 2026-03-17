import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/application-experiences/route';

function req(url: string, opts?: { method?: string; body?: unknown }) {
  return new NextRequest(url, {
    method: opts?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
  });
}

describe('Blacklist Inc API - /api/application-experiences', () => {
  describe('GET', () => {
    it('returns 400 when company param is missing', async () => {
      const request = req('http://localhost/api/application-experiences');
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('returns 200 with company and experiences when company provided', async () => {
      const request = req('http://localhost/api/application-experiences?company=Acme');
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.company).toBeDefined();
      expect(data.experiences).toBeDefined();
      expect(Array.isArray(data.experiences)).toBe(true);
    });
  });

  describe('POST', () => {
    it('returns 400 when company_name is missing', async () => {
      const request = req('http://localhost/api/application-experiences', {
        method: 'POST',
        body: { days_to_response: 5, response_channel: 'email' },
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 201 with valid body', async () => {
      const request = req('http://localhost/api/application-experiences', {
        method: 'POST',
        body: {
          company_name: `Integration Test Co ${Date.now()}`,
          days_to_response: 7,
          response_channel: 'recruiter',
        },
      });
      const response = await POST(request);
      expect(response.status).toBe(201);
    });
  });
});
