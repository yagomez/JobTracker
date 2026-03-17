import { describe, expect, it } from 'vitest';
import { extractConceptsFromJobPosting } from '@/lib/extract-concepts';

describe('extractConceptsFromJobPosting (JobTracker unit)', () => {
  it('returns empty array for empty input', () => {
    expect(extractConceptsFromJobPosting('')).toEqual([]);
    expect(extractConceptsFromJobPosting('   ')).toEqual([]);
  });

  it('returns empty array for null or non-string', () => {
    expect(extractConceptsFromJobPosting(null as any)).toEqual([]);
    expect(extractConceptsFromJobPosting(undefined as any)).toEqual([]);
  });

  it('extracts programming languages', () => {
    const text = 'We use JavaScript, Python, and Java for our backend services.';
    const concepts = extractConceptsFromJobPosting(text);
    expect(concepts).toContain('JavaScript');
    expect(concepts).toContain('Python');
    expect(concepts).toContain('Java');
  });

  it('extracts frameworks and libraries', () => {
    const text = 'Experience with React, Node.js, and Django required.';
    const concepts = extractConceptsFromJobPosting(text);
    expect(concepts).toContain('React');
    expect(concepts).toContain('Node.js');
    expect(concepts).toContain('Django');
  });

  it('extracts tools and platforms', () => {
    const text = 'You will work with AWS, Docker, Kubernetes, and PostgreSQL.';
    const concepts = extractConceptsFromJobPosting(text);
    expect(concepts).toContain('AWS');
    expect(concepts).toContain('Docker');
    expect(concepts).toContain('Kubernetes');
    expect(concepts).toContain('PostgreSQL');
  });

  it('extracts interview concepts', () => {
    const text = 'Candidates should be strong in System Design, Data Structures, and Algorithms.';
    const concepts = extractConceptsFromJobPosting(text);
    expect(concepts).toContain('System Design');
    expect(concepts).toContain('Data Structures');
    expect(concepts).toContain('Algorithms');
  });

  it('does not match Java inside JavaScript', () => {
    const text = 'We use JavaScript and TypeScript.';
    const concepts = extractConceptsFromJobPosting(text);
    expect(concepts).toContain('JavaScript');
    expect(concepts).toContain('TypeScript');
    expect(concepts).not.toContain('Java');
  });

  it('is case-insensitive for matching', () => {
    const text = 'PYTHON, react, and AWS are used.';
    const concepts = extractConceptsFromJobPosting(text);
    expect(concepts.some((c) => c.toLowerCase() === 'python')).toBe(true);
    expect(concepts.some((c) => c.toLowerCase() === 'react')).toBe(true);
    expect(concepts.some((c) => c.toLowerCase() === 'aws')).toBe(true);
  });

  it('returns deduplicated sorted list', () => {
    const text = 'React and React for frontend. React.';
    const concepts = extractConceptsFromJobPosting(text);
    expect(concepts.filter((c) => c === 'React').length).toBe(1);
    expect(concepts).toEqual([...concepts].sort((a, b) => a.localeCompare(b)));
  });
});
