'use client';

import { useEffect, useState } from 'react';
import { Job } from '@/lib/types';
import { JobForm } from '@/components/JobForm';
import { JobList } from '@/components/JobList';
import Link from 'next/link';

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError('Failed to load jobs. Check your database connection.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddJob(formData: any) {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to add job');
      await fetchJobs();
      // Reset form would go here if we had a ref
      alert('Job added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to add job');
    }
  }

  async function handleDeleteJob(id: number) {
    if (!confirm('Are you sure?')) return;

    setIsDeleting(id);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete job');
      setJobs(jobs.filter(job => job.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete job');
    } finally {
      setIsDeleting(null);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Application</h2>
        <JobForm onSubmit={handleAddJob} />
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Your Applications</h2>
          <div className="text-sm text-gray-600">
            Total: {jobs.length} | Applied: {jobs.filter(j => j.status === 'applied').length} | Interviewing: {jobs.filter(j => j.status === 'interviewing').length} | Offered: {jobs.filter(j => j.status === 'offered').length}
          </div>
        </div>
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading jobs...</p>
          </div>
        ) : (
          <JobList jobs={jobs} onDelete={handleDeleteJob} isDeleting={isDeleting} />
        )}
      </section>
    </div>
  );
}
