'use client';

import { Job } from '@/lib/types';
import { useState } from 'react';

export function JobList({
  jobs,
  onDelete,
  onEdit,
  isDeleting,
  isDemo = false,
}: {
  jobs: Job[];
  onDelete: (id: number) => void;
  onEdit?: (job: Job) => void;
  isDeleting?: number | null;
  isDemo?: boolean;
}) {
  const [checkingId, setCheckingId] = useState<number | null>(null);
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
        return 'bg-olive-100 text-olive-800';
      case 'filled':
        return 'bg-olive-200 text-olive-800';
      case 'removed':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-olive-200 text-olive-700';
      default:
        return 'bg-olive-100 text-olive-700';
    }
  };

  if (jobs.length === 0) {
    return <div className="text-center py-10 text-olive-600 bg-white border border-olive-200 rounded-xl">No jobs applied to yet. Start adding your applications above!</div>;
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const status = updatedStatuses[job.id] || job;
        return (
          <div key={job.id} className="bg-white p-5 rounded-xl shadow-sm border border-olive-200 border-l-4 border-l-olive-500">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold text-olive-900">{job.position}</h3>
                <p className="text-olive-600 text-sm">{job.company}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-olive-100 text-olive-800">{job.status}</span>
                {status.posting_status && (
                  <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium ${getPostingStatusColor(status.posting_status)}`}>{status.posting_status}</span>
                )}
              </div>
            </div>

            {job.url && (
              <div className="mb-3">
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-olive-600 hover:text-olive-800 hover:underline text-sm break-all">{job.url}</a>
              </div>
            )}

            {status.status_notes && (
              <div className="mb-3 p-2 bg-olive-50 rounded-lg text-sm text-olive-700">
                <strong className="text-olive-900">Status:</strong> {status.status_notes}
              </div>
            )}

            {status.last_checked && (
              <div className="text-xs text-olive-500 mb-3">
                Last checked: {new Date(status.last_checked).toLocaleString()}
              </div>
            )}

            {job.notes && (
              <div className="mb-4 p-3 bg-olive-50 rounded-lg border-l-2 border-olive-300">
                <p className="text-sm text-olive-700">{job.notes}</p>
              </div>
            )}

            {status.resume_path && (
              <div className="mb-4 p-3 bg-olive-50 rounded-lg border-l-2 border-olive-300 flex items-center justify-between">
                <span className="text-sm text-olive-700">📄 Resume attached</span>
                <a
                  href={status.resume_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-olive-600 hover:text-olive-800 font-medium"
                >
                  Download
                </a>
              </div>
            )}

            <div className="text-xs text-olive-500 mb-4">
              Applied: {new Date(job.date_applied).toLocaleDateString()}
            </div>

            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(job)}
                  className="px-3 py-1.5 text-sm bg-olive-600 text-white rounded-lg hover:bg-olive-500 transition-colors"
                >
                  Edit
                </button>
              )}
              <button 
                onClick={() => handleCheckPosting(job.id, job.url)} 
                disabled={checkingId === job.id} 
                className="px-3 py-1.5 text-sm bg-olive-500 text-white rounded-lg hover:bg-olive-400 disabled:bg-olive-200 disabled:text-olive-500 transition-colors"
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
