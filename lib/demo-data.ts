import type { Job } from '@/lib/types';

/**
 * Mock jobs for the portfolio demo. Not connected to your real database.
 * Used when visiting /demo or when API receives x-demo-mode: true.
 */
const now = new Date().toISOString();

export const DEMO_JOBS: Job[] = [
  // Monday 2025-03-03 – 13 applications (goal reached)
  { id: 1, company: 'Acme Corp', position: 'Software Engineer', url: 'https://example.com/jobs/1', date_applied: '2025-03-03', status: 'applied', last_update: now, notes: 'Referred by colleague.', posting_status: 'active', created_at: now, updated_at: now },
  { id: 2, company: 'TechStart Inc', position: 'Full Stack Developer', url: 'https://example.com/jobs/2', date_applied: '2025-03-03', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 3, company: 'DataDriven LLC', position: 'Data Engineer', date_applied: '2025-03-03', status: 'applied', last_update: now, posting_status: 'unknown', created_at: now, updated_at: now },
  { id: 4, company: 'CloudNine', position: 'Backend Engineer', url: 'https://example.com/jobs/4', date_applied: '2025-03-03', status: 'phone_screening', last_update: now, notes: 'Phone screen scheduled.', posting_status: 'active', created_at: now, updated_at: now },
  { id: 5, company: 'DesignCo', position: 'Frontend Engineer', date_applied: '2025-03-03', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 6, company: 'FinanceHub', position: 'Software Engineer', url: 'https://example.com/jobs/6', date_applied: '2025-03-03', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 7, company: 'HealthTech', position: 'Full Stack Engineer', date_applied: '2025-03-03', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 8, company: 'EduPlatform', position: 'Backend Developer', url: 'https://example.com/jobs/8', date_applied: '2025-03-03', status: 'rejected', last_update: now, posting_status: 'active', date_rejected: '2025-03-10', rejection_source: 'email', created_at: now, updated_at: now },
  { id: 9, company: 'RetailTech', position: 'Software Engineer', date_applied: '2025-03-03', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 10, company: 'MediaStream', position: 'Product Engineer', url: 'https://example.com/jobs/10', date_applied: '2025-03-03', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 11, company: 'SecurityFirst', position: 'DevOps Engineer', date_applied: '2025-03-03', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 12, company: 'GreenEnergy', position: 'Software Engineer', url: 'https://example.com/jobs/12', date_applied: '2025-03-03', status: 'interviewing', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 13, company: 'LogisticsPro', position: 'Full Stack Developer', date_applied: '2025-03-03', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  // Tuesday 2025-03-04 – 13 applications (goal reached)
  { id: 14, company: 'AI Labs', position: 'ML Engineer', url: 'https://example.com/jobs/14', date_applied: '2025-03-04', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 15, company: 'PaymentsCo', position: 'Backend Engineer', date_applied: '2025-03-04', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 16, company: 'TravelTech', position: 'Software Engineer', url: 'https://example.com/jobs/16', date_applied: '2025-03-04', status: 'offered', last_update: now, notes: 'Offer received.', posting_status: 'archived', created_at: now, updated_at: now },
  { id: 17, company: 'GameStudio', position: 'Engine Developer', date_applied: '2025-03-04', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 18, company: 'LegalTech', position: 'Full Stack Engineer', date_applied: '2025-03-04', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 19, company: 'FoodDelivery', position: 'Backend Developer', url: 'https://example.com/jobs/19', date_applied: '2025-03-04', status: 'interviewing', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 20, company: 'RealEstateTech', position: 'Software Engineer', date_applied: '2025-03-04', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 21, company: 'FitnessApp', position: 'Mobile Engineer', url: 'https://example.com/jobs/21', date_applied: '2025-03-04', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 22, company: 'HRPlatform', position: 'Full Stack Developer', date_applied: '2025-03-04', status: 'rejected', last_update: now, posting_status: 'filled', date_rejected: '2025-03-05', rejection_source: 'ai_generated', created_at: now, updated_at: now },
  { id: 23, company: 'AutoTech', position: 'Software Engineer', date_applied: '2025-03-04', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 24, company: 'InsurTech', position: 'Backend Engineer', url: 'https://example.com/jobs/24', date_applied: '2025-03-04', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 25, company: 'AgriTech', position: 'Data Engineer', date_applied: '2025-03-04', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  { id: 26, company: 'SocialMetrics', position: 'Product Engineer', date_applied: '2025-03-04', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  // Saturday 2025-03-01 – 2 applications (boost)
  { id: 27, company: 'WeekendStartup', position: 'Software Engineer', url: 'https://example.com/jobs/27', date_applied: '2025-03-01', status: 'applied', last_update: now, notes: 'Applied on weekend.', posting_status: 'active', created_at: now, updated_at: now },
  { id: 28, company: 'SideProject Co', position: 'Full Stack Developer', date_applied: '2025-03-01', status: 'applied', last_update: now, posting_status: 'active', created_at: now, updated_at: now },
  // Sunday 2025-03-02 – 1 application (boost)
  { id: 29, company: 'SundayLabs', position: 'Backend Engineer', url: 'https://example.com/jobs/29', date_applied: '2025-03-02', status: 'applied', last_update: now, notes: 'Going above and beyond!', posting_status: 'active', created_at: now, updated_at: now },
  // Other weekdays – variety
  { id: 30, company: 'Olive Labs', position: 'Frontend Engineer', url: 'https://jobs.example.com/olive', date_applied: '2025-02-28', status: 'interviewing', last_update: now, notes: 'Design system focus.', posting_status: 'active', created_at: now, updated_at: now },
  { id: 31, company: 'Grotesque Studios', position: 'Full Stack Engineer', url: 'https://careers.example.com/fullstack', date_applied: '2025-02-25', status: 'offered', last_update: now, posting_status: 'archived', created_at: now, updated_at: now },
  { id: 32, company: 'Righteous Tech', position: 'Software Engineer', date_applied: '2025-02-20', status: 'rejected', last_update: now, posting_status: 'filled', date_rejected: '2025-02-28', rejection_source: 'portal', created_at: now, updated_at: now },
];
