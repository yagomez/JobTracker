import { describe, expect, it } from 'vitest';
import { filterUsCompanies } from '@/lib/us-companies';

describe('filterUsCompanies (Blacklist Inc unit)', () => {
  it('returns array', () => {
    const result = filterUsCompanies('tech');
    expect(Array.isArray(result)).toBe(true);
  });

  it('filters by prefix/search', () => {
    const result = filterUsCompanies('google');
    expect(result.some((n) => n.toLowerCase().includes('google'))).toBe(true);
  });

  it('respects limit parameter', () => {
    const result = filterUsCompanies('a', 5);
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
