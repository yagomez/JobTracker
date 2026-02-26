'use client';

import { Job } from '@/lib/types';
import Link from 'next/link';

interface JobListProps {
  jobs: Job[];
  onDelete: (id: number) => Promise<void>;
  isDeleting?: number | null;
}

const statusColors: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800',
  interviewing: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
  offered: 'bg-green-100 text-green-800',
};

export function JobList({ jobs, onDelete, isDeleting }: JobListProps) {
  return (
    <div className="space-y-4">
      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No jobs yet. Add one to get started!</p>
        </div>
      ) : (
        jobs.map(job => (
          <div key={job.id} className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{job.position}</h3>
                <p className="text-gray-600">{job.company}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[job.status]}`}>
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3 text-sm text-gray-600">
              <div>
                <span className="font-semibold">Applied:</span> {new Date(job.date_applied).toLocaleDateString()}
              </div>
              <div>
                <span className="font-semibold">Updated:</span> {new Date(job.last_update).toLocaleDateString()}
              </div>
            </div>

            {job.url && (
              <div className="mb-3">
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                  View Job Posting →
                </a>
              </div>
            )}

            {job.notes && (
              <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                <span className="font-semibold">Notes:</span> {job.notes}
              </div>
            )}

            <div className="flex gap-2">
              <Link href={`/jobs/${job.id}`} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded">
                Edit
              </Link>
              <button
                onClick={() => onDelete(job.id)}
                disabled={isDeleting === job.id}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-sm rounded"
              >
                {isDeleting === job.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
