'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Job, NoApplyCompany } from '@/lib/types';
import { JobForm } from '@/components/JobForm';
import { JobList } from '@/components/JobList';
import { ApplicationsCalendar } from '@/components/ApplicationsCalendar';
import { ApplicationsAnalytics } from '@/components/ApplicationsAnalytics';

function demoHeaders(isDemo: boolean): HeadersInit {
  return isDemo ? { 'x-demo-mode': 'true' } : {};
}

export function Dashboard({ isDemo = false }: { isDemo?: boolean }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'analytics' | 'search' | 'no-apply'>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchCompany, setSearchCompany] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [noApplyList, setNoApplyList] = useState<NoApplyCompany[]>([]);
  const [noApplyError, setNoApplyError] = useState<string | null>(null);

  const blacklistedCompanyNames = useMemo(
    () => new Set(noApplyList.map((e) => (e.company_name || '').trim().toLowerCase())),
    [noApplyList]
  );

  const fetchNoApplyList = useCallback(async () => {
    setNoApplyError(null);
    try {
      const res = await fetch('/api/no-apply', { headers: demoHeaders(isDemo) });
      const data = await res.json();
      if (!res.ok) {
        setNoApplyError(data.error || 'Failed to load blacklist.');
        setNoApplyList([]);
        return;
      }
      setNoApplyList(Array.isArray(data.list) ? data.list : []);
    } catch {
      setNoApplyError('Failed to load blacklist.');
      setNoApplyList([]);
    }
  }, [isDemo]);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchNoApplyList();
  }, [fetchNoApplyList]);

  useEffect(() => {
    if (editingJob) {
      document.getElementById('add-edit-form')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [editingJob]);

  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs', { headers: demoHeaders(isDemo) });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError('Unable to load jobs. Please check your database connection and try refreshing the page.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddJob(formData: any) {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...demoHeaders(isDemo) },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add job');
      }
      await fetchJobs();
      alert('Job added successfully!');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to add job');
    }
  }

  async function handleUpdateJob(id: number, formData: any) {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...demoHeaders(isDemo) },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update job');
      }
      await fetchJobs();
      setEditingJob(null);
      alert('Job updated successfully!');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to update job');
    }
  }

  async function handleMarkRejected(id: number): Promise<void> {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...demoHeaders(isDemo) },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update job');
      }
      await fetchJobs();
      alert('Marked as rejected. This will show in Analytics.');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to mark as rejected');
    }
  }

  async function handleDeleteJob(id: number) {
    if (!confirm('Are you sure?')) return;

    setIsDeleting(id);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE', headers: demoHeaders(isDemo) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete job');
      }
      setJobs(jobs.filter((job) => job.id !== id));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete job');
    } finally {
      setIsDeleting(null);
    }
  }

  const jobsOnSelectedDate =
    selectedDate && viewMode === 'calendar'
      ? jobs.filter((job) => job.date_applied === selectedDate)
      : [];

  const formattedSelectedDate =
    selectedDate && viewMode === 'calendar'
      ? new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

  const searchResults =
    viewMode === 'search'
      ? jobs.filter((job) => {
          if (searchCompany && !job.company.toLowerCase().includes(searchCompany.toLowerCase())) {
            return false;
          }
          if (searchTitle && !job.position.toLowerCase().includes(searchTitle.toLowerCase())) {
            return false;
          }
          if (searchDateFrom && job.date_applied < searchDateFrom) {
            return false;
          }
          if (searchDateTo && job.date_applied > searchDateTo) {
            return false;
          }
          return true;
        })
      : [];

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <a
          href="#my-applications"
          className="inline-flex items-center px-4 py-2.5 rounded-lg bg-olive-600 hover:bg-olive-500 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          View My Applications
        </a>
      </div>

      <section id="add-edit-form" className="scroll-mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-olive-900">
            {editingJob ? 'Edit application' : 'Add New Application'}
          </h2>
          {editingJob && (
            <button
              type="button"
              onClick={() => setEditingJob(null)}
              className="text-sm text-olive-600 hover:text-olive-800 underline"
            >
              Cancel (add new instead)
            </button>
          )}
        </div>
        <JobForm
          key={editingJob?.id ?? 'new'}
          initialData={editingJob ?? undefined}
          onSubmit={editingJob ? (data) => handleUpdateJob(editingJob.id, data) : handleAddJob}
          isDemo={isDemo}
          onNoApplyAdded={fetchNoApplyList}
        />
      </section>

      <section id="my-applications" className="scroll-mt-4">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-olive-900">Your Applications</h2>
            <div className="text-sm text-olive-700 mt-0.5">
              Total: {jobs.length} · Applied: {jobs.filter((j) => j.status === 'applied').length} · Interviewing: {jobs.filter((j) => j.status === 'interviewing').length} · Rejected: {jobs.filter((j) => j.status === 'rejected').length} · Offered: {jobs.filter((j) => j.status === 'offered').length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-olive-700">View:</span>
            <div className="inline-flex rounded-lg bg-olive-200/80 p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-olive-600 text-white shadow-sm'
                    : 'text-olive-700 hover:bg-olive-300/70'
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-olive-600 text-white shadow-sm'
                    : 'text-olive-700 hover:bg-olive-300/70'
                }`}
              >
                Calendar
              </button>
              <button
                type="button"
                onClick={() => setViewMode('search')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'search'
                    ? 'bg-olive-600 text-white shadow-sm'
                    : 'text-olive-700 hover:bg-olive-300/70'
                }`}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'analytics'
                    ? 'bg-olive-600 text-white shadow-sm'
                    : 'text-olive-700 hover:bg-olive-300/70'
                }`}
              >
                Analytics
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('no-apply');
                  fetchNoApplyList();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'no-apply'
                    ? 'bg-olive-600 text-white shadow-sm'
                    : 'text-olive-700 hover:bg-olive-300/70'
                }`}
              >
                Blacklist
              </button>
            </div>
          </div>
        </div>
        {isLoading && viewMode !== 'no-apply' ? (
          <div className="text-center py-12">
            <p className="text-olive-600">Loading jobs...</p>
          </div>
        ) : viewMode === 'list' ? (
          <JobList jobs={jobs} onDelete={handleDeleteJob} onEdit={setEditingJob} onMarkRejected={handleMarkRejected} blacklistedCompanyNames={blacklistedCompanyNames} isDeleting={isDeleting} isDemo={isDemo} />
        ) : viewMode === 'calendar' ? (
          <div className="space-y-4">
            <ApplicationsCalendar
              jobs={jobs}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
            />
            <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm">
              {formattedSelectedDate ? (
                <>
                  <h3 className="text-lg font-semibold text-olive-900 mb-2">
                    Applications on {formattedSelectedDate}{' '}
                    <span className="text-sm font-normal text-olive-600">
                      ({jobsOnSelectedDate.length}{' '}
                      {jobsOnSelectedDate.length === 1 ? 'application' : 'applications'})
                    </span>
                  </h3>
                  {jobsOnSelectedDate.length === 0 ? (
                    <p className="text-sm text-olive-600">
                      You didn&apos;t apply to any jobs on this day.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {jobsOnSelectedDate.map((job) => (
                        <li
                          key={job.id}
                          className="border border-olive-200 rounded-lg px-3 py-2 bg-olive-50 text-sm"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-olive-900">
                                {job.position} <span className="text-olive-600">at {job.company}</span>
                              </p>
                              <p className="text-olive-600 text-xs">
                                Status: <span className="font-medium">{job.status}</span>
                              </p>
                            </div>
                            <span className="text-xs text-olive-500">
                              Applied on {new Date(job.date_applied + 'T00:00:00').toLocaleDateString()}
                            </span>
                          </div>
                          {job.url && (
                            <p className="mt-1 text-xs">
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-olive-600 hover:text-olive-800 underline break-all"
                              >
                                Job posting
                              </a>
                            </p>
                          )}
                          {job.notes && (
                            <p className="mt-1 text-xs text-olive-700">Notes: {job.notes}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm text-olive-600">
                  Select a date in the calendar to see which jobs you applied to that day.
                </p>
              )}
            </div>
          </div>
        ) : viewMode === 'search' ? (
          <div className="space-y-4">
            <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-olive-900 font-semibold mb-3 text-base">Search applications</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-olive-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={searchCompany}
                    onChange={(e) => setSearchCompany(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-olive-300 bg-white text-olive-900 text-xs focus:outline-none focus:ring-2 focus:ring-olive-400 focus:border-olive-400 placeholder-olive-400"
                    placeholder="e.g. Google"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-olive-700 mb-1">Role / title</label>
                  <input
                    type="text"
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-olive-300 bg-white text-olive-900 text-xs focus:outline-none focus:ring-2 focus:ring-olive-400 focus:border-olive-400 placeholder-olive-400"
                    placeholder="e.g. Data Engineer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-olive-700 mb-1">Date from</label>
                  <input
                    type="date"
                    value={searchDateFrom}
                    onChange={(e) => setSearchDateFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-olive-300 bg-white text-olive-900 text-xs focus:outline-none focus:ring-2 focus:ring-olive-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-olive-700 mb-1">Date to</label>
                  <input
                    type="date"
                    value={searchDateTo}
                    onChange={(e) => setSearchDateTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-olive-300 bg-white text-olive-900 text-xs focus:outline-none focus:ring-2 focus:ring-olive-400"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-olive-600">
                Combine filters to find exactly where and when you applied. Leave fields blank to see all applications.
              </p>
            </div>
            {searchResults.length === 0 ? (
              <div className="bg-white border border-olive-200 rounded-xl p-4 text-sm text-olive-600">
                No applications match the current search. Try adjusting the company, role, or date range.
              </div>
            ) : (
              <JobList jobs={searchResults} onDelete={handleDeleteJob} onEdit={setEditingJob} onMarkRejected={handleMarkRejected} blacklistedCompanyNames={blacklistedCompanyNames} isDeleting={isDeleting} isDemo={isDemo} />
            )}
          </div>
        ) : viewMode === 'no-apply' ? (
          <div className="space-y-4">
            <p className="text-sm text-olive-600">
              Companies on this list show a warning when you type their name in the job form. Add more via &ldquo;Blacklist an Employer&rdquo; in the form above.
            </p>
            {noApplyError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm flex items-center justify-between gap-2">
                <span>{noApplyError}</span>
                <button
                  type="button"
                  onClick={() => fetchNoApplyList()}
                  className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-900 text-xs font-medium"
                >
                  Retry
                </button>
              </div>
            )}
            {noApplyList.length === 0 && !noApplyError ? (
              <div className="bg-white border border-olive-200 rounded-xl p-6 text-center text-olive-600 text-sm">
                No companies on your blacklist yet. Use &ldquo;Blacklist an Employer&rdquo; in the form above to add one.
              </div>
            ) : noApplyList.length > 0 ? (
              <ul className="space-y-3">
                {noApplyList.map((entry) => (
                  <li
                    key={entry.id}
                    className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="font-semibold text-olive-900">{entry.company_name}</div>
                    <div className="text-sm text-olive-700 mt-1">Reason: {entry.reason}</div>
                    {entry.notes && (
                      <div className="text-sm text-olive-600 mt-1">Details: {entry.notes}</div>
                    )}
                    <div className="text-xs text-olive-500 mt-2">
                      Added {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <ApplicationsAnalytics jobs={jobs} />
        )}
      </section>
    </div>
  );
}
