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