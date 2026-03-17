import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/interview-questions/route';

function req(url: string, opts?: { method?: string; body?: unknown }) {
  return new NextRequest(url, {
    method: opts?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
  });
}

describe('Blacklist Inc API - /api/interview-questions', () => {
  describe('GET', () => {
    it('returns 400 when company param is missing', async () => {
      const request = req('http://localhost/api/interview-questions');
      const response = await GET(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('company');
    });

    it('returns 200 with company and questions when company provided', async () => {
      const request = req('http://localhost/api/interview-questions?company=Acme');
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.company).toBeDefined();
      expect(data.questions).toBeDefined();
      expect(Array.isArray(data.questions)).toBe(true);
    });
  });

  describe('POST', () => {
    it('returns 400 when company_name is missing', async () => {
      const request = req('http://localhost/api/interview-questions', {
        method: 'POST',
        body: { question_text: 'What is 2+2?', question_type: 'tech' },
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 400 when question_text is missing', async () => {
      const request = req('http://localhost/api/interview-questions', {
        method: 'POST',
        body: { company_name: 'Test Co', question_type: 'tech' },
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 201 with valid body', async () => {
      const request = req('http://localhost/api/interview-questions', {
        method: 'POST',
        body: {
          company_name: `Integration Test Co ${Date.now()}`,
          question_text: 'How do you reverse a linked list?',
          question_type: 'tech',
        },
      });
      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.company_name).toBeDefined();
      expect(data.question_text).toContain('reverse');
    });
  });
});
