'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Job, NoApplyCompany } from '@/lib/types';
import { JobForm } from '@/components/JobForm';
import { JobList } from '@/components/JobList';
import { ApplicationsCalendar } from '@/components/ApplicationsCalendar';
import { ApplicationsAnalytics } from '@/components/ApplicationsAnalytics';
import { InterviewPrep } from '@/components/InterviewPrep';

const NAV_ITEMS: { key: 'list' | 'calendar' | 'analytics' | 'search' | 'no-apply' | 'interview-prep'; label: string }[] = [
  { key: 'list', label: 'Jobs' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'search', label: 'Search' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'interview-prep', label: 'Interview Prep' },
  { key: 'no-apply', label: 'Blacklist' },
];

function demoHeaders(isDemo: boolean): HeadersInit {
  return isDemo ? { 'x-demo-mode': 'true' } : {};
}

export function Dashboard({ isDemo: isDemoProp = false }: { isDemo?: boolean }) {
  const searchParams = useSearchParams();
  const [useRealData, setUseRealData] = useState(false);
  const isDemo = !useRealData && (isDemoProp || searchParams?.get('demo') === '1');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'analytics' | 'search' | 'no-apply' | 'interview-prep'>('list');
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('/api/no-apply', {
        headers: demoHeaders(isDemo),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
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
    if (useRealData) {
      setIsLoading(true);
      setError(null);
      fetchJobs();
      fetchNoApplyList();
    }
  }, [useRealData]);

  useEffect(() => {
    fetchNoApplyList();
  }, [fetchNoApplyList]);

  useEffect(() => {
    if (editingJob) {
      document.getElementById('add-edit-form')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [editingJob]);

  useEffect(() => {
    if (viewMode === 'calendar' && selectedDate) {
      document.getElementById('calendar-applications-list')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [viewMode, selectedDate]);

  async function fetchJobs() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/jobs', {
        headers: demoHeaders(isDemo),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setJobs(data);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error && err.name === 'AbortError'
          ? 'Request timed out. The database may be slow or unavailable. Try refreshing, or use the demo link to see sample data.'
          : 'Unable to load jobs. Please check your database connection and try refreshing the page.';
      setError(message);
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

  const viewTitles: Record<ViewMode, string> = {
    list: 'Jobs',
    calendar: 'Calendar',
    search: 'Search',
    analytics: 'Analytics',
    'interview-prep': 'Interview Prep',
    'no-apply': 'Blacklist',
  };

  return (
    <div className="flex min-h-screen">
      {/* Left sidebar - dark with green accent */}
      <aside className="w-56 shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" aria-hidden />
        <div className="p-4 border-b border-zinc-800 relative">
          <Link href="/" className="block" aria-label="Job Tracker home">
            <Image src="/JobTracker_logo.png" alt="Job Tracker" width={200} height={54} className="h-10 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-0.5 relative">
          {NAV_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => key === 'no-apply' ? (setViewMode('no-apply'), fetchNoApplyList()) : setViewMode(key)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === key
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 relative">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/30 p-3">
            <p className="text-xs font-semibold text-emerald-300">Get more from your search</p>
            <p className="text-xs text-zinc-400 mt-1">Track trends and insights in Analytics.</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {isDemo && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
            <span>You&apos;re viewing sample data.</span>
            <button type="button" onClick={() => setUseRealData(true)} className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm">
              Load my data
            </button>
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/30 text-red-200 px-4 py-3 text-sm space-y-2">
            <p>{error}</p>
            {!isDemo && <p><a href="/?demo=1" className="font-medium underline hover:text-red-100">Use demo with sample data</a> to try the app.</p>}
          </div>
        )}

        <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-semibold text-zinc-100">{viewTitles[viewMode]}</h1>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span>{isDemo ? 'Demo' : 'Job Tracker'}</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
          {viewMode === 'list' && (
            <>
              <section id="add-edit-form" className="scroll-mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-zinc-200">{editingJob ? 'Edit application' : 'Add New Application'}</h2>
                  {editingJob && (
                    <button type="button" onClick={() => setEditingJob(null)} className="text-sm text-emerald-400 hover:text-emerald-300 underline">
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
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <a href="#my-applications" className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">
                    View My Applications
                  </a>
                  <span className="text-sm text-zinc-400">
                    Total: {jobs.length} · Applied: {jobs.filter((j) => j.status === 'applied').length} · Rejected: {jobs.filter((j) => j.status === 'rejected').length} · Offered: {jobs.filter((j) => j.status === 'offered').length}
                  </span>
                </div>
                {isLoading ? (
                  <div className="text-center py-12 text-zinc-400 text-sm">
                    Loading jobs… {!isDemo && <a href="/?demo=1" className="text-emerald-400 hover:underline ml-1">Try demo</a>}
                  </div>
                ) : (
                  <JobList jobs={jobs} onDelete={handleDeleteJob} onEdit={setEditingJob} onMarkRejected={handleMarkRejected} blacklistedCompanyNames={blacklistedCompanyNames} isDeleting={isDeleting} isDemo={isDemo} />
                )}
              </section>
            </>
          )}

          {viewMode === 'calendar' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">Click a date to see applications for that day.</p>
              <ApplicationsCalendar jobs={jobs} selectedDate={selectedDate} onSelectDate={(date) => setSelectedDate(date)} />
              <div id="calendar-applications-list" className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 scroll-mt-4">
                {formattedSelectedDate ? (
                  <>
                    <h3 className="text-lg font-semibold text-zinc-200 mb-2">
                      Applications on {formattedSelectedDate}{' '}
                      <span className="text-sm font-normal text-zinc-400">({jobsOnSelectedDate.length} {jobsOnSelectedDate.length === 1 ? 'application' : 'applications'})</span>
                    </h3>
                    {jobsOnSelectedDate.length === 0 ? (
                      <p className="text-sm text-zinc-400">You didn&apos;t apply to any jobs on this day.</p>
                    ) : (
                      <ul className="space-y-2">
                        {jobsOnSelectedDate.map((job) => (
                          <li key={job.id} className="border border-zinc-700 rounded-lg px-3 py-2 bg-zinc-800/50 text-sm">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-zinc-200">{job.position} <span className="text-zinc-400">at {job.company}</span></p>
                                <p className="text-zinc-400 text-xs">Status: <span className="font-medium">{job.status}</span></p>
                              </div>
                              <span className="text-xs text-zinc-500">Applied on {new Date(job.date_applied + 'T00:00:00').toLocaleDateString()}</span>
                            </div>
                            {job.url && <p className="mt-1 text-xs"><a href={job.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline break-all">Job posting</a></p>}
                            {job.notes && <p className="mt-1 text-xs text-zinc-400">Notes: {job.notes}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">Select a date above to see applications.</p>
                )}
              </div>
            </div>
          )}

          {viewMode === 'search' && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
              <h3 className="text-zinc-200 font-semibold mb-3 text-base">Search applications</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Company</label>
                  <input type="text" value={searchCompany} onChange={(e) => setSearchCompany(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-500" placeholder="e.g. Google" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Role / title</label>
                  <input type="text" value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-500" placeholder="e.g. Data Engineer" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Date from</label>
                  <input type="date" value={searchDateFrom} onChange={(e) => setSearchDateFrom(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Date to</label>
                  <input type="date" value={searchDateTo} onChange={(e) => setSearchDateTo(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500">Leave fields blank to see all applications.</p>
            </div>
            {searchResults.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-400">No applications match. Try adjusting filters.</div>
            ) : (
              <JobList jobs={searchResults} onDelete={handleDeleteJob} onEdit={setEditingJob} onMarkRejected={handleMarkRejected} blacklistedCompanyNames={blacklistedCompanyNames} isDeleting={isDeleting} isDemo={isDemo} />
            )}
          </div>
          )}

          {viewMode === 'interview-prep' && <InterviewPrep jobs={jobs} isDemo={isDemo} />}

          {viewMode === 'no-apply' && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Companies on this list show a warning in the job form.</p>
            {noApplyError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-4 text-sm flex items-center justify-between gap-2">
                <span>{noApplyError}</span>
                <button type="button" onClick={() => fetchNoApplyList()} className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-medium">Retry</button>
              </div>
            )}
            {noApplyList.length === 0 && !noApplyError && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 text-center text-zinc-400 text-sm">No companies on your blacklist yet.</div>
            )}
            {noApplyList.length > 0 && (
              <ul className="space-y-3">
                {noApplyList.map((entry) => (
                  <li key={entry.id} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                    <div className="font-semibold text-zinc-200">{entry.company_name}</div>
                    <div className="text-sm text-zinc-400 mt-1">Reason: {entry.reason}</div>
                    {entry.notes && <div className="text-sm text-zinc-500 mt-1">Details: {entry.notes}</div>}
                    <div className="text-xs text-zinc-500 mt-2">Added {new Date(entry.created_at).toLocaleDateString()}</div>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-6 border-t border-zinc-800">
              <a href="/reviews" className="inline-flex items-center px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">
                View Blacklist Inc. User Reviews
              </a>
            </div>
          </div>
          )}

          {viewMode === 'analytics' && <ApplicationsAnalytics jobs={jobs} />}
        </div>
      </div>
    </div>
  );
}
