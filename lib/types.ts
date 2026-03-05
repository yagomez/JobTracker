/** How the user learned about the rejection (for analytics and AI insights) */
export type RejectionSource = 'email' | 'ai_generated' | 'portal' | 'other';

export interface Job {
  id: number;
  company: string;
  position: string;
  url?: string;
  date_applied: string;
  status: 'applied' | 'interviewing' | 'rejected' | 'offered';
  last_update: string;
  notes?: string;
  resume_path?: string;
  posting_status: 'active' | 'filled' | 'removed' | 'archived' | 'unknown';
  last_checked?: string;
  status_notes?: string;
  /** When the rejection was received (YYYY-MM-DD); set when status is rejected */
  date_rejected?: string | null;
  /** How the rejection was communicated; set when status is rejected */
  rejection_source?: RejectionSource | null;
  created_at: string;
  updated_at: string;
}

export interface CreateJobInput {
  company: string;
  position: string;
  url?: string;
  date_applied: string;
  status?: 'applied' | 'interviewing' | 'rejected' | 'offered';
  notes?: string;
  posting_status?: 'active' | 'filled' | 'removed' | 'archived' | 'unknown';
  status_notes?: string;
  date_rejected?: string | null;
  rejection_source?: RejectionSource | null;
}

export interface UpdateJobInput {
  company?: string;
  position?: string;
  url?: string;
  date_applied?: string;
  status?: 'applied' | 'interviewing' | 'rejected' | 'offered';
  notes?: string;
  posting_status?: 'active' | 'filled' | 'removed' | 'archived' | 'unknown';
  status_notes?: string;
  date_rejected?: string | null;
  rejection_source?: RejectionSource | null;
}

export interface NoApplyCompany {
  id: number;
  company_name: string;
  reason: string;
  notes?: string | null;
  created_at: string;
}

/** Reviewer perspective for company reviews */
export type ReviewerType = 'prospective_interviewee' | 'employee' | 'ex_employee';

export interface CompanyReview {
  id: number;
  company_name: string;
  reviewer_type: ReviewerType;
  ghost_job_rating: number; // 1-5, 5 = strong ghost job tendency
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyReviewInput {
  company_name: string;
  reviewer_type: ReviewerType;
  ghost_job_rating: number;
  review_text?: string | null;
}

/** Interview question type for cross-reference (e.g. with LeetCode company tags) */
export type InterviewQuestionType = 'tech' | 'behavioral' | 'system_design' | 'other';

export interface InterviewQuestion {
  id: number;
  company_name: string;
  question_text: string;
  question_type: InterviewQuestionType;
  /** Optional: for cross-reference with LeetCode / other sources (e.g. topic slug) */
  leetcode_topic?: string | null;
  /** User indicated this was from their most recent interview (for gamification) */
  is_most_recent: boolean;
  created_at: string;
}

export interface CreateInterviewQuestionInput {
  company_name: string;
  question_text: string;
  question_type: InterviewQuestionType;
  leetcode_topic?: string | null;
  is_most_recent?: boolean;
}

/** How the company responded after the user applied (prospective interviewee feedback) */
export type ResponseChannel = 'recruiter' | 'phone' | 'email' | 'applicant_portal' | 'other';

export interface ApplicationExperience {
  id: number;
  company_name: string;
  /** Days from application to first response; null if no response */
  days_to_response: number | null;
  response_channel: ResponseChannel;
  created_at: string;
}

export interface CreateApplicationExperienceInput {
  company_name: string;
  days_to_response: number | null;
  response_channel: ResponseChannel;
}

/** Advice from someone who was hired; LinkedIn required for future verification */
export type HiredAdviceStatus = 'pending' | 'approved' | 'rejected';

export interface HiredAdvice {
  id: number;
  company_name: string;
  advice_text: string;
  linkedin_url: string;
  status: HiredAdviceStatus;
  created_at: string;
}

export interface CreateHiredAdviceInput {
  company_name: string;
  advice_text: string;
  linkedin_url: string;
}

/** Employee feedback: anonymous ratings + optional text. LinkedIn required for verification (same process as hired advice). */
export type EmployeeFeedbackVisibility = 'public' | 'aggregate_only';

export type EmployeeFeedbackStatus = 'pending' | 'approved' | 'rejected';

export interface EmployeeFeedback {
  id: number;
  company_name: string;
  culture_rating: number;
  management_rating: number;
  work_life_rating: number;
  compensation_rating: number;
  feedback_text: string | null;
  linkedin_url: string;
  visibility: EmployeeFeedbackVisibility;
  status: EmployeeFeedbackStatus;
  created_at: string;
}

export interface CreateEmployeeFeedbackInput {
  company_name: string;
  culture_rating: number;
  management_rating: number;
  work_life_rating: number;
  compensation_rating: number;
  feedback_text?: string | null;
  linkedin_url: string;
  visibility: EmployeeFeedbackVisibility;
}

/** Company-posted salary range (e.g. from careers page) for cross-reference with levels.fyi / market data */
export interface CompanySalaryRange {
  id: number;
  company_name: string;
  role_title: string;
  min_salary: number;
  max_salary: number;
  currency: string;
  source: string;
  created_at: string;
}

export interface CreateSalaryRangeInput {
  company_name: string;
  role_title: string;
  min_salary: number;
  max_salary: number;
  currency?: string;
  source?: string;
}

/** Real-time application insight: when user applied and when they heard back (from job tracker or manual) */
export type RealtimeInsightSource = 'job_tracker' | 'manual';

export interface RealtimeApplicationInsight {
  id: number;
  company_name: string;
  date_applied: string;
  date_heard_back: string | null;
  response_channel: string | null;
  source: RealtimeInsightSource;
  created_at: string;
}

export interface CreateRealtimeInsightInput {
  company_name: string;
  date_applied: string;
  date_heard_back?: string | null;
  response_channel?: string | null;
  source: RealtimeInsightSource;
}

/** User suggestion for what data/info would be helpful for a given view */
export type ViewSuggestionViewName = 'overview' | 'prospective_interviewee' | 'employee' | 'ex_employee';

export interface ViewSuggestion {
  id: number;
  company_name: string | null;
  view_name: ViewSuggestionViewName;
  suggestion_text: string;
  created_at: string;
}

export interface CreateViewSuggestionInput {
  company_name?: string | null;
  view_name: ViewSuggestionViewName;
  suggestion_text: string;
}

/** Ex-employee feedback: LinkedIn-verified; questions only ex-employees can answer */
export type ExEmployeeFeedbackStatus = 'pending' | 'approved' | 'rejected';

export type ParentalLeaveUsed = 'yes' | 'no' | 'na';
export type ParentalLeaveAccommodating = 'yes' | 'no' | 'somewhat' | 'na';

export interface ExEmployeeFeedback {
  id: number;
  company_name: string;
  linkedin_url: string;
  status: ExEmployeeFeedbackStatus;
  /** Years until first promotion (null = not answered, -1 or sentinel = never promoted) */
  years_to_promotion: number | null;
  leadership_rating: number | null;
  leadership_year: number | null;
  benefits_rating: number;
  work_life_rating: number;
  used_parental_leave: ParentalLeaveUsed | null;
  parental_leave_accommodating: ParentalLeaveAccommodating | null;
  feedback_text: string | null;
  created_at: string;
}

export interface CreateExEmployeeFeedbackInput {
  company_name: string;
  linkedin_url: string;
  years_to_promotion: number | null;
  leadership_rating: number | null;
  leadership_year: number | null;
  benefits_rating: number;
  work_life_rating: number;
  used_parental_leave: ParentalLeaveUsed | null;
  parental_leave_accommodating: ParentalLeaveAccommodating | null;
  feedback_text?: string | null;
}