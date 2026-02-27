export interface Job {
  id: number;
  company: string;
  position: string;
  url?: string;
  date_applied: string;
  status: 'applied' | 'interviewing' | 'rejected' | 'offered';
  last_update: string;
  notes?: string;
  posting_status: 'active' | 'filled' | 'removed' | 'archived' | 'unknown';
  last_checked?: string;
  status_notes?: string;
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
}