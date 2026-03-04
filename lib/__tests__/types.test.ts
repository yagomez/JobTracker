import { describe, expect, it } from 'vitest';
import type { Job, CreateJobInput, UpdateJobInput } from '@/lib/types';

/**
 * These tests enforce that Job and related types keep the fields
 * used by JobForm, JobList, and API routes. Removing url or resume_path
 * from Job (or similar regressions) will cause type errors here and in CI.
 */
describe('Job types', () => {
  it('Job has url and resume_path for forms and API', () => {
    const job: Job = {
      id: 1,
      company: 'Acme',
      position: 'Engineer',
      url: 'https://example.com/job',
      date_applied: '2024-01-01',
      status: 'applied',
      last_update: '2024-01-01',
      posting_status: 'active',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      resume_path: '/uploads/resume.pdf',
    };
    expect(job.url).toBe('https://example.com/job');
    expect(job.resume_path).toBe('/uploads/resume.pdf');
  });

  it('CreateJobInput and UpdateJobInput allow optional url', () => {
    const create: CreateJobInput = {
      company: 'Co',
      position: 'Dev',
      date_applied: '2024-01-01',
      url: 'https://example.com',
    };
    const update: UpdateJobInput = { url: 'https://updated.com' };
    expect(create.url).toBeDefined();
    expect(update.url).toBeDefined();
  });
});
