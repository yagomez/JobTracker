'use client';

import { Job } from '@/lib/types';
import { useState } from 'react';

export function JobList({
  jobs,
  onDelete,
  onEdit,
  onMarkRejected,
  blacklistedCompanyNames,
  isDeleting,
  isDemo = false,
}: {
  jobs: Job[];
  onDelete: (id: number) => void;
  onEdit?: (job: Job) => void;
  onMarkRejected?: (id: number) => void;
  blacklistedCompanyNames?: Set<string>;
  isDeleting?: number | null;
  isDemo?: boolean;
}) {
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [updatedStatuses, setUpdatedStatuses] = useState<Record<number, any>>({});

  const handleCheckPosting = async (jobId: number, url?: string) => {
    if (!url) {
      alert('No URL provided');
      return;
    }

    setCheckingId(jobId);
    try {
      const response = await fetch(`/api/jobs/check-posting?id=${jobId}`, {
        method: 'POST',
        headers: isDemo ? { 'x-demo-mode': 'true' } : undefined,
      });

      const data = await response.json();
      setUpdatedStatuses(prev => ({ ...prev, [jobId]: data }));
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to check posting status');
    } finally {
      setCheckingId(null);
    }
  };

  const getPostingStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-400';
      case 'filled':
        return 'bg-emerald-200 text-emerald-400';
      case 'removed':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-emerald-200 text-zinc-400';
      default:
        return 'bg-emerald-100 text-zinc-400';
    }
  };

  if (jobs.length === 0) {
    return <div className="text-center py-10 text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-xl">No jobs applied to yet. Start adding your applications above!</div>;
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const status = updatedStatuses[job.id] || job;
        const isBlacklisted = blacklistedCompanyNames?.has((job.company || '').trim().toLowerCase());
        return (
          <div key={job.id} className="bg-zinc-800 p-5 rounded-xl shadow-sm border border-zinc-700 border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">{job.position}</h3>
                <p className="text-zinc-300 text-sm">{job.company}</p>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0 justify-end">
                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-400">{job.status}</span>
                {status.posting_status && (
                  <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium ${getPostingStatusColor(status.posting_status)}`}>{status.posting_status}</span>
                )}
                {isBlacklisted && (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                    Blacklisted Company
                  </span>
                )}
              </div>
            </div>

            {job.url && (
              <div className="mb-3">
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-emerald-400 hover:underline text-sm break-all">{job.url}</a>
              </div>
            )}

            {status.status_notes && (
              <div className="mb-3 p-2 bg-zinc-800/50 rounded-lg text-sm text-zinc-400">
                <strong className="text-zinc-100">Status:</strong> {status.status_notes}
              </div>
            )}

            {status.last_checked && (
              <div className="text-xs text-zinc-500 mb-3">
                Last checked: {new Date(status.last_checked).toLocaleString()}
              </div>
            )}

            {job.notes && (
              <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg border-l-2 border-zinc-600">
                <p className="text-sm text-zinc-400">{job.notes}</p>
              </div>
            )}

            {status.resume_path && (
              <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg border-l-2 border-zinc-600 flex items-center justify-between">
                <span className="text-sm text-zinc-400">📄 Resume attached</span>
                <a
                  href={status.resume_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-300 hover:text-emerald-400 font-medium"
                >
                  Download
                </a>
              </div>
            )}

            <div className="text-xs text-zinc-500 mb-4">
              Applied: {new Date(job.date_applied).toLocaleDateString()}
            </div>

            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(job)}
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                >
                  Update
                </button>
              )}
              {onMarkRejected && job.status !== 'rejected' && (
                <button
                  onClick={async () => {
                    setRejectingId(job.id);
                    try {
                      await onMarkRejected(job.id);
                    } finally {
                      setRejectingId(null);
                    }
                  }}
                  disabled={rejectingId === job.id}
                  className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:bg-amber-200 disabled:text-amber-800 transition-colors"
                >
                  {rejectingId === job.id ? 'Saving…' : 'Mark as rejected'}
                </button>
              )}
              <button 
                onClick={() => handleCheckPosting(job.id, job.url)} 
                disabled={checkingId === job.id} 
                className="px-3 py-1.5 text-sm bg-zinc-700 text-white rounded-lg hover:bg-emerald-400 disabled:bg-zinc-600 disabled:text-zinc-500 transition-colors"
              >
                {checkingId === job.id ? 'Checking...' : 'Check Posting'}
              </button>
              <button 
                onClick={() => onDelete(job.id)} 
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 border border-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
