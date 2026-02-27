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
        return 'bg-green-100 text-green-800';
      case 'filled':
        return 'bg-blue-100 text-blue-800';
      case 'removed':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (jobs.length === 0) {
    return <div className="text-center py-8 text-gray-500">No jobs applied to yet. Start adding your applications above!</div>;
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const status = updatedStatuses[job.id] || job;
        return (
          <div key={job.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{job.position}</h3>
                <p className="text-gray-600">{job.company}</p>
              </div>
              <div className="flex gap-2">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">{job.status}</span>
                {status.posting_status && (
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPostingStatusColor(status.posting_status)}`}>{status.posting_status}</span>
                )}
              </div>
            </div>

            {job.url && (
              <div className="mb-3">
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">{job.url}</a>
              </div>
            )}

            {status.status_notes && (
              <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                <strong>Status:</strong> {status.status_notes}
              </div>
            )}

            {status.last_checked && (
              <div className="text-xs text-gray-500 mb-3">
                Last checked: {new Date(status.last_checked).toLocaleString()}
              </div>
            )}

            {job.notes && (
              <div className="mb-4 p-3 bg-yellow-50 rounded border-l-2 border-yellow-400">
                <p className="text-sm text-gray-700">{job.notes}</p>
              </div>
            )}

            {status.resume_path && (
              <div className="mb-4 p-3 bg-blue-50 rounded border-l-2 border-blue-400 flex items-center justify-between">
                <span className="text-sm text-gray-700">📄 Resume attached</span>
                <a
                  href={status.resume_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Download
                </a>
              </div>
            )}

            <div className="text-xs text-gray-500 mb-4">
              Applied: {new Date(job.date_applied).toLocaleDateString()}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => handleCheckPosting(job.id, job.url)} 
                disabled={checkingId === job.id} 
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {checkingId === job.id ? 'Checking...' : 'Check Posting'}
              </button>
              <button 
                onClick={() => onDelete(job.id)} 
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
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
