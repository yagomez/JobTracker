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

