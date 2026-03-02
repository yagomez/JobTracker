'use client';

import { Job } from '@/lib/types';
import { useState } from 'react';

export function JobList({
  jobs,
  onDelete,
}: {
  jobs: Job[];
  onDelete: (id: number) => void;
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
        return 'bg-olive-500/50 text-white';
      case 'filled':
        return 'bg-olive-400/60 text-white';
      case 'removed':
        return 'bg-red-900/60 text-red-100';
      case 'archived':
        return 'bg-olive-800 text-olive-200';
      default:
        return 'bg-olive-600/70 text-white';
    }
  };

  if (jobs.length === 0) {
    return <div className="text-center py-8 text-olive-200">No jobs applied to yet. Start adding your applications above!</div>;
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const status = updatedStatuses[job.id] || job;
        return (
          <div key={job.id} className="bg-olive-700/90 p-6 rounded-lg shadow-lg border-l-4 border-olive-400 border border-olive-600">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-semibold text-white">{job.position}</h3>
                <p className="text-olive-200">{job.company}</p>
              </div>
              <div className="flex gap-2">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-olive-600 text-white">{job.status}</span>
                {status.posting_status && (
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPostingStatusColor(status.posting_status)}`}>{status.posting_status}</span>
                )}
              </div>
            </div>

            {job.url && (
              <div className="mb-3">
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-olive-200 hover:text-white hover:underline text-sm break-all">{job.url}</a>
              </div>
            )}

            {status.status_notes && (
              <div className="mb-3 p-2 bg-olive-800/60 rounded text-sm text-olive-100">
                <strong className="text-white">Status:</strong> {status.status_notes}
              </div>
            )}

            {status.last_checked && (
              <div className="text-xs text-olive-300 mb-3">
                Last checked: {new Date(status.last_checked).toLocaleString()}
              </div>
            )}

            {job.notes && (
              <div className="mb-4 p-3 bg-olive-800/60 rounded border-l-2 border-olive-400">
                <p className="text-sm text-olive-100">{job.notes}</p>
              </div>
            )}

            {status.resume_path && (
              <div className="mb-4 p-3 bg-olive-800/60 rounded border-l-2 border-olive-400 flex items-center justify-between">
                <span className="text-sm text-olive-100">📄 Resume attached</span>
                <a
                  href={status.resume_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-olive-200 hover:text-white font-medium"
                >
                  Download
                </a>
              </div>
            )}

            <div className="text-xs text-olive-300 mb-4">
              Applied: {new Date(job.date_applied).toLocaleDateString()}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => handleCheckPosting(job.id, job.url)} 
                disabled={checkingId === job.id} 
                className="px-4 py-2 text-sm bg-olive-600 text-white rounded hover:bg-olive-500 disabled:bg-olive-800 disabled:text-olive-400"
              >
                {checkingId === job.id ? 'Checking...' : 'Check Posting'}
              </button>
              <button 
                onClick={() => onDelete(job.id)} 
                className="px-4 py-2 text-sm bg-red-800/80 text-white rounded hover:bg-red-700 border border-red-600"
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
