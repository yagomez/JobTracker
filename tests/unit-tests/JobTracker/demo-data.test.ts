import { describe, expect, it } from 'vitest';
import { DEMO_JOBS } from '@/lib/demo-data';

describe('DEMO_JOBS (JobTracker unit)', () => {
  it('has valid job shape for all entries', () => {
    expect(DEMO_JOBS.length).toBeGreaterThan(0);
    for (const job of DEMO_JOBS) {
      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('company');
      expect(job).toHaveProperty('position');
      expect(job).toHaveProperty('date_applied');
      expect(job).toHaveProperty('status');
      expect(job).toHaveProperty('last_update');
      expect(typeof job.id).toBe('number');
      expect(typeof job.company).toBe('string');
      expect(typeof job.position).toBe('string');
      expect(typeof job.status).toBe('string');
      expect(['applied', 'phone_screening', 'interviewing', 'rejected', 'offered']).toContain(job.status);
    }
  });

  it('has at least one phone_screening or interviewing job for demo', () => {
    const prepping = DEMO_JOBS.filter(
      (j) => j.status === 'phone_screening' || j.status === 'interviewing'
    );
    expect(prepping.length).toBeGreaterThan(0);
  });
});
