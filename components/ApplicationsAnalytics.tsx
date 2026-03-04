'use client';

import { useMemo, useState } from 'react';
import type { Job } from '@/lib/types';

type DateRange = 'all' | '7d' | '30d' | '90d';

interface ApplicationsAnalyticsProps {
  jobs: Job[];
}

function parseDate(dateStr: string): Date | null {
  const d = new Date(dateStr + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ApplicationsAnalytics({ jobs }: ApplicationsAnalyticsProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const now = new Date();

  const { filteredJobs, uniqueCompanies, uniqueRoles } = useMemo(() => {
    const companies = new Set<string>();
    const roles = new Set<string>();

    for (const job of jobs) {
      if (job.company) companies.add(job.company);
      if (job.position) roles.add(job.position);
    }

    const cutoff = (() => {
      if (dateRange === 'all') return null;
      const d = new Date(now);
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      d.setDate(d.getDate() - days);
      return d;
    })();

    const filtered = jobs.filter((job) => {
      const d = parseDate(job.date_applied);
      if (!d) return false;
      if (cutoff && d < cutoff) return false;
      if (companyFilter !== 'all' && job.company !== companyFilter) return false;
      if (roleFilter !== 'all' && job.position !== roleFilter) return false;
      return true;
    });

    return {
      filteredJobs: filtered,
      uniqueCompanies: Array.from(companies).sort(),
      uniqueRoles: Array.from(roles).sort(),
    };
  }, [jobs, dateRange, companyFilter, roleFilter, now]);

  const statusStats = useMemo(() => {
    const counts: Record<Job['status'], number> = {
      applied: 0,
      interviewing: 0,
      rejected: 0,
      offered: 0,
    };
    for (const job of filteredJobs) {
      counts[job.status] = (counts[job.status] || 0) + 1;
    }
    return counts;
  }, [filteredJobs]);

  const companyStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const job of filteredJobs) {
      if (!job.company) continue;
      map[job.company] = (map[job.company] || 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredJobs]);

  const timelineStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const job of filteredJobs) {
      const key = job.date_applied;
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [filteredJobs]);

  const rejectionStats = useMemo(() => {
    const rejected = filteredJobs.filter((j) => j.status === 'rejected');
    const bySource: Record<string, number> = {
      email: 0,
      ai_generated: 0,
      portal: 0,
      other: 0,
      unknown: 0,
    };
    const dateRejectedCounts: Record<string, number> = {};
    for (const job of rejected) {
      const source = job.rejection_source && ['email', 'ai_generated', 'portal', 'other'].includes(job.rejection_source)
        ? job.rejection_source
        : 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
      if (job.date_rejected) {
        dateRejectedCounts[job.date_rejected] = (dateRejectedCounts[job.date_rejected] || 0) + 1;
      }
    }
    const totalWithDate = rejected.filter((j) => j.date_rejected).length;
    const totalWithSource = rejected.filter((j) => j.rejection_source).length;
    return {
      totalRejected: rejected.length,
      bySource,
      dateRejectedCounts: Object.entries(dateRejectedCounts).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
      totalWithDateRejected: totalWithDate,
      totalWithRejectionSource: totalWithSource,
    };
  }, [filteredJobs]);

  /** Rejected jobs that still show as active = possible ghost posts. Use all jobs so we don't miss older rejections. */
  const ghostPostList = useMemo(() => {
    const today = now.toISOString().slice(0, 10);
    const list = jobs
      .filter((j) => j.status === 'rejected' && (j.posting_status === 'active' || j.posting_status === 'unknown'))
      .map((job) => {
        const refDate = job.date_rejected || job.date_applied;
        const ref = parseDate(refDate);
        const daysSinceRef = ref ? Math.floor((now.getTime() - ref.getTime()) / (24 * 60 * 60 * 1000)) : 0;
        const applied = parseDate(job.date_applied);
        const daysSinceApplication = applied ? Math.floor((now.getTime() - applied.getTime()) / (24 * 60 * 60 * 1000)) : 0;
        return {
          ...job,
          daysSinceRejection: daysSinceRef,
          daysSinceApplication,
          referenceDate: job.date_rejected || job.date_applied,
        };
      })
      .sort((a, b) => b.daysSinceRejection - a.daysSinceRejection);
    return list;
  }, [jobs, now]);

  /** Rejections over time (for trends). Key by date_rejected when available, else date_applied. */
  const rejectionTimelineStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const job of filteredJobs) {
      if (job.status !== 'rejected') continue;
      const key = job.date_rejected || job.date_applied;
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [filteredJobs]);

  /** Simple trend: applications and rejections in current period vs previous period (same length). */
  const trendsSummary = useMemo(() => {
    const cutoff = (() => {
      if (dateRange === 'all') return null;
      const d = new Date(now);
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      d.setDate(d.getDate() - days);
      return d;
    })();
    if (!cutoff) return null;
    const current = filteredJobs;
    const periodStart = new Date(cutoff);
    const periodLength = now.getTime() - periodStart.getTime();
    const previousStart = new Date(periodStart.getTime() - periodLength);
    const previous = jobs.filter((job) => {
      const d = parseDate(job.date_applied);
      if (!d) return false;
      return d >= previousStart && d < periodStart;
    });
    const currentRejections = current.filter((j) => j.status === 'rejected').length;
    const previousRejections = previous.filter((j) => j.status === 'rejected').length;
    return {
      currentApplications: current.length,
      previousApplications: previous.length,
      applicationDelta: current.length - previous.length,
      currentRejections,
      previousRejections,
      rejectionDelta: currentRejections - previousRejections,
    };
  }, [filteredJobs, jobs, dateRange, now]);

  const totalApplications = filteredJobs.length;
  const totalCompanies = new Set(filteredJobs.map((j) => j.company)).size;
  const totalRoles = new Set(filteredJobs.map((j) => j.position)).size;

  const maxTimelineCount = timelineStats.reduce(
    (max, [, count]) => (count > max ? count : max),
    0,
  );

  const maxCompanyCount = companyStats.reduce(
    (max, [, count]) => (count > max ? count : max),
    0,
  );

  const maxRejectionTimelineCount = rejectionTimelineStats.reduce(
    (max, [, count]) => (count > max ? count : max),
    0,
  );

  async function handleGenerateInsights() {
    setAiLoading(true);
    setAiError(null);
    try {
      const payload = {
        filters: {
          dateRange,
          companyFilter,
          roleFilter,
        },
        stats: {
          totalApplications,
          totalCompanies,
          totalRoles,
          statusStats,
          timelineStats,
          companyStats,
          rejectionStats,
          rejectionTimelineStats,
          trendsSummary,
          ghostPostStats: {
            count: ghostPostList.length,
            jobs: ghostPostList.slice(0, 20).map((j) => ({
              company: j.company,
              position: j.position,
              date_applied: j.date_applied,
              date_rejected: j.date_rejected ?? null,
              daysSinceRejection: j.daysSinceRejection,
              daysSinceApplication: j.daysSinceApplication,
              last_checked: j.last_checked ?? null,
            })),
          },
        },
      };

      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate AI insights.');
      }

      const data = await res.json();
      setAiInsights(data.insights || null);
    } catch (error) {
      console.error(error);
      setAiError(
        error instanceof Error ? error.message : 'Failed to generate AI insights.',
      );
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-olive-700 mb-1">Date range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-2.5 py-1.5 rounded-lg border border-olive-300 bg-white text-olive-900 text-xs focus:outline-none focus:ring-2 focus:ring-olive-400"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-olive-700 mb-1">Company</label>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-olive-300 bg-white text-olive-900 text-xs focus:outline-none focus:ring-2 focus:ring-olive-400"
          >
            <option value="all">All companies</option>
            {uniqueCompanies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-olive-700 mb-1">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-olive-300 bg-white text-olive-900 text-xs focus:outline-none focus:ring-2 focus:ring-olive-400"
          >
            <option value="all">All roles</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-olive-600 mb-1">Total applications</p>
          <p className="text-2xl font-semibold text-olive-900">{totalApplications}</p>
        </div>
        <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-olive-600 mb-1">Companies applied to</p>
          <p className="text-2xl font-semibold text-olive-900">{totalCompanies}</p>
        </div>
        <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-olive-600 mb-1">Distinct roles</p>
          <p className="text-2xl font-semibold text-olive-900">{totalRoles}</p>
        </div>
      </div>

      {/* Trends: this period vs previous period */}
      {trendsSummary && (
        <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-olive-900 font-semibold mb-2 text-base">Trends (this period vs previous)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-olive-600">Applications now</p>
              <p className="font-semibold text-olive-900">{trendsSummary.currentApplications}</p>
              <p className="text-xs text-olive-600">vs {trendsSummary.previousApplications} previous</p>
              {trendsSummary.applicationDelta !== 0 && (
                <p className={`text-xs font-medium ${trendsSummary.applicationDelta > 0 ? 'text-green-700' : 'text-amber-700'}`}>
                  {trendsSummary.applicationDelta > 0 ? '+' : ''}{trendsSummary.applicationDelta}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-olive-600">Rejections now</p>
              <p className="font-semibold text-olive-900">{trendsSummary.currentRejections}</p>
              <p className="text-xs text-olive-600">vs {trendsSummary.previousRejections} previous</p>
              {trendsSummary.rejectionDelta !== 0 && (
                <p className={`text-xs font-medium ${trendsSummary.rejectionDelta > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                  {trendsSummary.rejectionDelta > 0 ? '+' : ''}{trendsSummary.rejectionDelta}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ghost posts: rejected but still listed as active */}
      {ghostPostList.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-olive-900 font-semibold mb-1 text-base">Rejected but still listed as active (possible ghost posts)</h3>
          <p className="text-xs text-olive-700 mb-3">
            You were rejected from these roles but the posting still shows as active. In the current job market many postings stay up after filling. Use &ldquo;Check Posting&rdquo; on the list view to refresh status.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs font-medium text-olive-700 border-b border-amber-200">
                  <th className="py-2 pr-2">Company</th>
                  <th className="py-2 pr-2">Role</th>
                  <th className="py-2 pr-2">Applied</th>
                  <th className="py-2 pr-2">Rejected</th>
                  <th className="py-2 pr-2">Days listed since rejection</th>
                  <th className="py-2 pr-2">Last checked</th>
                </tr>
              </thead>
              <tbody>
                {ghostPostList.slice(0, 15).map((j) => (
                  <tr key={j.id} className="border-b border-amber-100">
                    <td className="py-1.5 pr-2 text-olive-900">{j.company}</td>
                    <td className="py-1.5 pr-2 text-olive-800">{j.position}</td>
                    <td className="py-1.5 pr-2 text-olive-600">{j.date_applied}</td>
                    <td className="py-1.5 pr-2 text-olive-600">{j.date_rejected ?? '—'}</td>
                    <td className="py-1.5 pr-2 font-medium text-amber-800">{j.daysSinceRejection} days</td>
                    <td className="py-1.5 pr-2 text-olive-600">{j.last_checked ? new Date(j.last_checked).toLocaleDateString() : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ghostPostList.length > 15 && (
            <p className="text-xs text-olive-600 mt-2">Showing 15 of {ghostPostList.length}. Use list view to &ldquo;Check Posting&rdquo; and update status.</p>
          )}
        </div>
      )}

      {/* Status distribution */}
      <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-olive-900 font-semibold mb-2 text-base">Status breakdown</h3>
        {['applied', 'interviewing', 'rejected', 'offered'].map((status) => {
          const key = status as Job['status'];
          const count = statusStats[key];
          const pct = totalApplications ? Math.round((count / totalApplications) * 100) : 0;
          return (
            <div key={status}>
              <div className="flex justify-between text-xs text-olive-700 mb-1">
                <span className="capitalize">{status}</span>
                <span>{count} ({pct}%)</span>
              </div>
              <div className="h-2 bg-olive-100 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-olive-500 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Rejection insights (when there are rejected applications) */}
      {rejectionStats.totalRejected > 0 && (
        <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="text-olive-900 font-semibold mb-2 text-base">Rejection insights</h3>
          <p className="text-olive-600 text-xs mb-2">
            {rejectionStats.totalWithDateRejected} of {rejectionStats.totalRejected} rejected applications have a date; {rejectionStats.totalWithRejectionSource} have a source. Add these in the job form when marking as rejected for better AI suggestions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-olive-700 mb-1">By how you heard</p>
              <ul className="space-y-1 text-xs text-olive-700">
                {(['email', 'ai_generated', 'portal', 'other', 'unknown'] as const).map((src) => (
                  <li key={src}>
                    {src === 'ai_generated' ? 'AI generated' : src === 'unknown' ? 'Not specified' : src.charAt(0).toUpperCase() + src.slice(1)}: {rejectionStats.bySource[src] ?? 0}
                  </li>
                ))}
              </ul>
            </div>
            {rejectionStats.dateRejectedCounts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-olive-700 mb-1">Rejections by date received</p>
                <ul className="space-y-1 text-xs text-olive-700 max-h-24 overflow-y-auto">
                  {rejectionStats.dateRejectedCounts.slice(0, 10).map(([date, count]) => (
                    <li key={date}>
                      {new Date(date + 'T00:00:00').toLocaleDateString()}: {count}
                    </li>
                  ))}
                  {rejectionStats.dateRejectedCounts.length > 10 && (
                    <li className="text-olive-500">+{rejectionStats.dateRejectedCounts.length - 10} more dates</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Applications over time */}
      <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-olive-900 font-semibold mb-2 text-base">Applications over time</h3>
        {timelineStats.length === 0 ? (
          <p className="text-olive-600 text-sm">No applications in this range.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {timelineStats.map(([date, count]) => {
              const pct = maxTimelineCount ? Math.max(8, (count / maxTimelineCount) * 100) : 0;
              return (
                <div key={date}>
                  <div className="flex justify-between text-xs text-olive-700 mb-1">
                    <span>{new Date(date + 'T00:00:00').toLocaleDateString()}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 bg-olive-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-olive-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejections over time */}
      <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-olive-900 font-semibold mb-2 text-base">Rejections over time</h3>
        <p className="text-xs text-olive-600 mb-2">By date you were rejected (or application date if rejection date not set).</p>
        {rejectionTimelineStats.length === 0 ? (
          <p className="text-olive-600 text-sm">No rejections in this range, or add &ldquo;Date rejected&rdquo; when marking roles as rejected.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {rejectionTimelineStats.map(([date, count]) => {
              const pct = maxRejectionTimelineCount ? Math.max(8, (count / maxRejectionTimelineCount) * 100) : 0;
              return (
                <div key={date}>
                  <div className="flex justify-between text-xs text-olive-700 mb-1">
                    <span>{new Date(date + 'T00:00:00').toLocaleDateString()}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-red-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top companies */}
      <div className="bg-white border border-olive-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-olive-900 font-semibold mb-2 text-base">Top companies by applications</h3>
        {companyStats.length === 0 ? (
          <p className="text-olive-600 text-sm">No company data for this filter.</p>
        ) : (
          <div className="space-y-2">
            {companyStats.map(([company, count]) => {
              const pct = maxCompanyCount ? Math.max(10, (count / maxCompanyCount) * 100) : 0;
              return (
                <div key={company}>
                  <div className="flex justify-between text-xs text-olive-700 mb-1">
                    <span className="truncate max-w-[60%]">{company}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 bg-olive-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-olive-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI insights */}
      <div className="bg-white border border-dashed border-olive-300 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-olive-900 font-semibold mb-1 text-base">AI insights</h3>
            <p className="text-olive-600 text-xs">
              Uses the current filters and charts above to summarize what your data is telling you.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateInsights}
            disabled={aiLoading || totalApplications === 0}
            className="px-3 py-1.5 rounded-lg bg-olive-600 hover:bg-olive-500 disabled:bg-olive-200 disabled:text-olive-500 text-xs font-semibold text-white transition-colors"
          >
            {aiLoading ? 'Analyzing…' : 'Generate insights'}
          </button>
        </div>
        {aiError && (
          <p className="text-xs text-red-600">{aiError}</p>
        )}
        {aiInsights ? (
          <div className="mt-1 text-olive-700 text-sm whitespace-pre-wrap leading-relaxed">
            {aiInsights}
          </div>
        ) : !aiLoading && !aiError ? (
          <p className="text-olive-500 text-xs">
            Run the analysis to get a summary of patterns (e.g., which companies or roles respond most,
            how your interview rate is trending, and where to focus next).
          </p>
        ) : null}
      </div>
    </div>
  );
}

