import { describe, expect, it } from 'vitest';
import {
  DEMO_REVIEWS_COMPANIES,
  getDemoCompanies,
  getDemoDataForCompany,
} from '@/lib/demo-reviews-data';

describe('demo-reviews-data (Blacklist Inc unit)', () => {
  describe('DEMO_REVIEWS_COMPANIES', () => {
    it('has at least 3 demo companies', () => {
      expect(DEMO_REVIEWS_COMPANIES.length).toBeGreaterThanOrEqual(3);
      for (const c of DEMO_REVIEWS_COMPANIES) {
        expect(c).toHaveProperty('name');
        expect(c).toHaveProperty('reviewCount');
        expect(c).toHaveProperty('avgGhostRating');
      }
    });
  });

  describe('getDemoCompanies', () => {
    it('returns all companies when search is empty', () => {
      const list = getDemoCompanies('');
      expect(list.length).toBe(DEMO_REVIEWS_COMPANIES.length);
    });

    it('filters by search term (case-insensitive)', () => {
      const list = getDemoCompanies('acme');
      expect(list.length).toBeGreaterThan(0);
      expect(list.every((c) => c.name.toLowerCase().includes('acme'))).toBe(true);
    });

    it('returns empty when no match', () => {
      const list = getDemoCompanies('xyznonexistent123');
      expect(list).toEqual([]);
    });
  });

  describe('getDemoDataForCompany', () => {
    it('returns full prep data for known demo company', () => {
      const company = DEMO_REVIEWS_COMPANIES[0].name;
      const data = getDemoDataForCompany(company);
      expect(data).toHaveProperty('reviews');
      expect(data).toHaveProperty('interviewQuestions');
      expect(data).toHaveProperty('applicationExperiences');
      expect(data).toHaveProperty('hiredAdvice');
      expect(data).toHaveProperty('employeeFeedbackData');
      expect(data).toHaveProperty('salaryRanges');
      expect(data).toHaveProperty('exEmployeeData');
      expect(data).toHaveProperty('realtimeInsights');
      expect(data).toHaveProperty('jobTrackerJobs');
      expect(Array.isArray(data.reviews)).toBe(true);
      expect(Array.isArray(data.interviewQuestions)).toBe(true);
      expect(Array.isArray(data.applicationExperiences)).toBe(true);
      expect(Array.isArray(data.jobTrackerJobs)).toBe(true);
    });

    it('is case-insensitive for company lookup', () => {
      const company = DEMO_REVIEWS_COMPANIES[0].name;
      const data1 = getDemoDataForCompany(company);
      const data2 = getDemoDataForCompany(company.toLowerCase());
      expect(data1.reviews.length).toBe(data2.reviews.length);
      expect(data1.reviews[0]?.company_name).toBeDefined();
    });

    it('returns same data for same company (cached)', () => {
      const company = 'Acme Corp';
      const data1 = getDemoDataForCompany(company);
      const data2 = getDemoDataForCompany(company);
      expect(data1).toBe(data2);
    });
  });
});
