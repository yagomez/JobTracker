/**
 * Mock data for Blacklist Inc. reviews / company insights demo (portfolio).
 * Used when /reviews?demo=1 or /reviews/demo. Keeps shapes aligned with API responses.
 */

import { DEMO_JOBS } from '@/lib/demo-data';

const now = new Date().toISOString();
const year = new Date().getFullYear();

export const DEMO_REVIEWS_COMPANIES = [
  { name: 'Acme Corp', reviewCount: 12, avgGhostRating: 3.4 },
  { name: 'TechStart Inc', reviewCount: 8, avgGhostRating: 2.8 },
  { name: 'CloudNine', reviewCount: 5, avgGhostRating: 4.0 },
];

function makeReviews(company: string) {
  return [
    { id: 1, company_name: company, reviewer_type: 'prospective_interviewee' as const, ghost_job_rating: 4, review_text: 'Applied twice; posting stayed up for months with no response.', created_at: `${year}-01-15T12:00:00Z`, updated_at: now },
    { id: 2, company_name: company, reviewer_type: 'prospective_interviewee' as const, ghost_job_rating: 3, review_text: 'Heard back in 2 weeks for one role.', created_at: `${year}-02-01T12:00:00Z`, updated_at: now },
    { id: 3, company_name: company, reviewer_type: 'employee' as const, ghost_job_rating: 3, review_text: 'Hiring is slow; some roles stay open a long time.', created_at: `${year}-02-10T12:00:00Z`, updated_at: now },
    { id: 4, company_name: company, reviewer_type: 'ex_employee' as const, ghost_job_rating: 5, review_text: 'Many listings were not actually hiring when I left.', created_at: `${year}-03-01T12:00:00Z`, updated_at: now },
    { id: 5, company_name: company, reviewer_type: 'prospective_interviewee' as const, ghost_job_rating: 2, review_text: null, created_at: `${year}-01-20T12:00:00Z`, updated_at: now },
  ];
}

function makeInterviewQuestions(company: string) {
  return [
    { id: 1, company_name: company, question_text: 'Implement a function to reverse a linked list.', question_type: 'tech' as const, leetcode_topic: 'linked-list', is_most_recent: true, created_at: now },
    { id: 2, company_name: company, question_text: 'Tell me about a time you disagreed with a manager.', question_type: 'behavioral' as const, leetcode_topic: null, is_most_recent: false, created_at: now },
    { id: 3, company_name: company, question_text: 'Design a rate limiter for an API.', question_type: 'system_design' as const, leetcode_topic: null, is_most_recent: false, created_at: now },
  ];
}

function makeApplicationExperiences(company: string) {
  return [
    { id: 1, company_name: company, days_to_response: 5, response_channel: 'recruiter' as const, created_at: now },
    { id: 2, company_name: company, days_to_response: 12, response_channel: 'email' as const, created_at: now },
    { id: 3, company_name: company, days_to_response: 3, response_channel: 'recruiter' as const, created_at: now },
    { id: 4, company_name: company, days_to_response: null, response_channel: 'other' as const, created_at: now },
    { id: 5, company_name: company, days_to_response: 25, response_channel: 'applicant_portal' as const, created_at: now },
    { id: 6, company_name: company, days_to_response: 8, response_channel: 'phone' as const, created_at: now },
  ];
}

function makeHiredAdvice(company: string) {
  return [
    { id: 1, company_name: company, advice_text: 'Prepare for system design; they move fast after the first call.', created_at: now },
    { id: 2, company_name: company, advice_text: 'Brush up on behavioral questions—they weight culture fit highly.', created_at: now },
  ];
}

function makeEmployeeFeedbackData(company: string) {
  return {
    publicFeedback: [
      { id: 1, culture_rating: 4, management_rating: 3, work_life_rating: 4, compensation_rating: 3, feedback_text: 'Solid team; promotion process is slow.', created_at: now },
    ],
    aggregateStats: {
      response_count: 6,
      avg_culture: 3.8,
      avg_management: 3.5,
      avg_work_life: 3.7,
      avg_compensation: 3.2,
    },
    overallFeedbackSnippets: [
      'Good benefits; 401k match could be better.',
      'Remote-friendly but some teams are still hybrid.',
      'Leadership is transparent about company direction.',
    ],
  };
}

function makeSalaryRanges(company: string) {
  return [
    { id: 1, role_title: 'Senior Software Engineer', min_salary: 160000, max_salary: 220000, currency: 'USD', source: 'careers_page', created_at: now },
    { id: 2, role_title: 'Software Engineer', min_salary: 120000, max_salary: 170000, currency: 'USD', source: 'careers_page', created_at: now },
  ];
}

function makeExEmployeeData(company: string) {
  return {
    aggregateStats: {
      response_count: 4,
      avg_years_to_promotion: 2.3,
      count_years_to_promotion: 4,
      avg_leadership: 3.5,
      count_leadership: 4,
      avg_benefits: 3.8,
      avg_work_life: 3.5,
      parental_leave: { used_yes_count: 2, accommodating_yes: 1, accommodating_no: 0, accommodating_somewhat: 1 },
    },
    overallFeedbackSnippets: [
      'Took 2 years to get promoted; process was clear but slow.',
      'Parental leave was approved; team was supportive.',
    ],
  };
}

function makeRealtimeInsights(company: string) {
  return [
    { id: 1, date_applied: '2025-01-10', date_heard_back: '2025-01-18', response_channel: 'Email', source: 'job_tracker', created_at: now },
    { id: 2, date_applied: '2025-02-01', date_heard_back: null, response_channel: null, source: 'manual', created_at: now },
    { id: 3, date_applied: '2025-01-25', date_heard_back: '2025-02-05', response_channel: 'Recruiter', source: 'job_tracker', created_at: now },
  ];
}

/** Normalize company name for lookup (lowercase trim) */
function norm(company: string): string {
  return company.toLowerCase().trim();
}

// Avoid circular type reference errors: getDemoDataForCompany populates this map,
// so using ReturnType<typeof getDemoDataForCompany> in the map type creates a self reference.
const DEMO_BY_COMPANY: Record<string, any> = {};

export function getDemoDataForCompany(company: string) {
  const key = norm(company);
  if (DEMO_BY_COMPANY[key]) return DEMO_BY_COMPANY[key];
  const jobTrackerJobs = DEMO_JOBS.filter((j) => norm(j.company) === key).map((j) => ({
    id: j.id,
    company: j.company,
    position: j.position,
    date_applied: j.date_applied,
    status: j.status,
    date_rejected: j.date_rejected ?? null,
    last_update: j.last_update,
  }));
  const data = {
    reviews: makeReviews(company),
    interviewQuestions: makeInterviewQuestions(company),
    applicationExperiences: makeApplicationExperiences(company),
    hiredAdvice: makeHiredAdvice(company),
    employeeFeedbackData: makeEmployeeFeedbackData(company),
    salaryRanges: makeSalaryRanges(company),
    exEmployeeData: makeExEmployeeData(company),
    realtimeInsights: makeRealtimeInsights(company),
    jobTrackerJobs,
  };
  DEMO_BY_COMPANY[key] = data;
  return data;
}

/** For search suggestions in demo: return demo companies that match query. Empty search returns all (so focus can show list). */
export function getDemoCompanies(search: string): { name: string; reviewCount: number; avgGhostRating: number }[] {
  const q = search.toLowerCase().trim();
  if (!q) return [...DEMO_REVIEWS_COMPANIES];
  return DEMO_REVIEWS_COMPANIES.filter((c) => c.name.toLowerCase().includes(q));
}
