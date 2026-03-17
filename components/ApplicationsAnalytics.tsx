'use client';

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
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
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [aiSuggestedReading, setAiSuggestedReading] = useState<Array<{ title: string; url: string }> | null>(null);
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
      phone_screening: 0,
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

  /** Chart data for "Insights at a glance" (when AI insights are shown). */
  const statusPieData = useMemo(() => {
    const labels: Record<Job['status'], string> = {
      applied: 'Applied',
      phone_screening: 'Phone screening',
      interviewing: 'Interviewing',
      rejected: 'Rejected',
      offered: 'Offered',
    };
    return (['applied', 'phone_screening', 'interviewing', 'rejected', 'offered'] as const)
      .filter((s) => (statusStats[s] ?? 0) > 0)
      .map((status) => ({ name: labels[status], value: statusStats[status] ?? 0 }));
  }, [statusStats]);

  const timelineChartData = useMemo(
    () =>
      timelineStats.map(([date, count]) => ({
        date: new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }),
        applications: count,
        fullDate: date,
      })),
    [timelineStats],
  );

  const rejectionSourceChartData = useMemo(() => {
    if (rejectionStats.totalRejected === 0) return [];
    const labels: Record<string, string> = {
      email: 'Email',
      ai_generated: 'AI generated',
      portal: 'Portal',
      other: 'Other',
      unknown: 'Not specified',
    };
    return (['email', 'ai_generated', 'portal', 'other', 'unknown'] as const)
      .filter((src) => (rejectionStats.bySource[src] ?? 0) > 0)
      .map((src) => ({ name: labels[src], count: rejectionStats.bySource[src] ?? 0 }));
  }, [rejectionStats]);

  const CHART_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669'];

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
      setAiModel(data.model || null);
      setAiSuggestedReading(Array.isArray(data.suggestedReading) ? data.suggestedReading : null);
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
    <div className="min-h-full rounded-2xl overflow-hidden bg-zinc-900/50 border border-zinc-700">
      {/* Analytics header: dark bar with filters */}
      <header className="bg-zinc-800/80 px-4 py-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-700">
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Analytics</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="rounded-lg border border-zinc-600 bg-zinc-700 text-zinc-200 text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Company</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="rounded-lg border border-zinc-600 bg-zinc-700 text-zinc-200 text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All companies</option>
              {uniqueCompanies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-zinc-600 bg-zinc-700 text-zinc-200 text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
      </header>

      <div className="p-4 sm:p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Total applications</p>
            <p className="text-3xl font-bold text-emerald-400 tabular-nums">{totalApplications}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Companies applied to</p>
            <p className="text-3xl font-bold text-emerald-400 tabular-nums">{totalCompanies}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Distinct roles</p>
            <p className="text-3xl font-bold text-emerald-400 tabular-nums">{totalRoles}</p>
          </div>
        </div>

        {/* Trends: this period vs previous period */}
        {trendsSummary && (
          <div className="bg-zinc-800 rounded-xl border border-zinc-700/80 shadow-sm p-5">
            <h3 className="text-zinc-100 font-semibold text-sm uppercase tracking-wider mb-4">Trends (this period vs previous)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider">Applications now</p>
                <p className="text-xl font-bold text-zinc-100 tabular-nums mt-0.5">{trendsSummary.currentApplications}</p>
                <p className="text-xs text-zinc-400">vs {trendsSummary.previousApplications} previous</p>
                {trendsSummary.applicationDelta !== 0 && (
                  <p className={`text-xs font-semibold mt-0.5 ${trendsSummary.applicationDelta > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {trendsSummary.applicationDelta > 0 ? '+' : ''}{trendsSummary.applicationDelta}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider">Rejections now</p>
                <p className="text-xl font-bold text-zinc-100 tabular-nums mt-0.5">{trendsSummary.currentRejections}</p>
                <p className="text-xs text-zinc-400">vs {trendsSummary.previousRejections} previous</p>
                {trendsSummary.rejectionDelta !== 0 && (
                  <p className={`text-xs font-semibold mt-0.5 ${trendsSummary.rejectionDelta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {trendsSummary.rejectionDelta > 0 ? '+' : ''}{trendsSummary.rejectionDelta}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ghost posts: rejected but still listed as active */}
        {ghostPostList.length > 0 && (
          <div className="bg-amber-50/90 rounded-xl border border-amber-200/80 shadow-sm p-5">
            <h3 className="text-zinc-100 font-semibold text-sm uppercase tracking-wider mb-1">Rejected but still listed as active (possible ghost posts)</h3>
            <p className="text-xs text-zinc-400 mb-4">
              You were rejected from these roles but the posting still shows as active. Use &ldquo;Check Posting&rdquo; on the list view to refresh status.
            </p>
            <div className="overflow-x-auto rounded-lg border border-amber-200/60">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider bg-amber-100/60 border-b border-amber-200/60">
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Applied</th>
                    <th className="py-2.5 px-3">Rejected</th>
                    <th className="py-2.5 px-3">Days listed since rejection</th>
                    <th className="py-2.5 px-3">Last checked</th>
                  </tr>
                </thead>
                <tbody>
                  {ghostPostList.slice(0, 15).map((j) => (
                    <tr key={j.id} className="border-b border-amber-100/80 bg-white/50">
                      <td className="py-2 px-3 text-zinc-100 font-medium">{j.company}</td>
                      <td className="py-2 px-3 text-zinc-200">{j.position}</td>
                      <td className="py-2 px-3 text-zinc-400">{j.date_applied}</td>
                      <td className="py-2 px-3 text-zinc-400">{j.date_rejected ?? '—'}</td>
                      <td className="py-2 px-3 font-semibold text-amber-700">{j.daysSinceRejection} days</td>
                      <td className="py-2 px-3 text-zinc-400">{j.last_checked ? new Date(j.last_checked).toLocaleDateString() : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ghostPostList.length > 15 && (
              <p className="text-xs text-zinc-400 mt-3">Showing 15 of {ghostPostList.length}.</p>
            )}
          </div>
        )}

        {/* Charts grid: 2 columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status distribution */}
          <div className="bg-zinc-800 rounded-xl border border-zinc-700/80 shadow-sm p-5">
            <h3 className="text-zinc-100 font-semibold text-sm uppercase tracking-wider mb-4">Status breakdown</h3>
            <div className="space-y-4">
              {['applied', 'phone_screening', 'interviewing', 'rejected', 'offered'].map((status) => {
                const key = status as Job['status'];
                const count = statusStats[key] ?? 0;
                const pct = totalApplications ? Math.round((count / totalApplications) * 100) : 0;
                const label = status === 'phone_screening' ? 'Phone Screening' : status.charAt(0).toUpperCase() + status.slice(1);
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                      <span className="font-medium">{label}</span>
                      <span className="tabular-nums">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Applications over time */}
          <div className="bg-zinc-800 rounded-xl border border-zinc-700/80 shadow-sm p-5">
            <h3 className="text-zinc-100 font-semibold text-sm uppercase tracking-wider mb-4">Applications over time</h3>
            {timelineStats.length === 0 ? (
              <p className="text-zinc-400 text-sm">No applications in this range.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {timelineStats.map(([date, count]) => {
                  const pct = maxTimelineCount ? Math.max(8, (count / maxTimelineCount) * 100) : 0;
                  return (
                    <div key={date}>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>{new Date(date + 'T00:00:00').toLocaleDateString()}</span>
                        <span className="tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rejection insights + Rejections over time: 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rejectionStats.totalRejected > 0 && (
            <div className="bg-zinc-800 rounded-xl border border-zinc-700/80 shadow-sm p-5 space-y-4">
              <h3 className="text-zinc-100 font-semibold text-sm uppercase tracking-wider">Rejection insights</h3>
              <p className="text-zinc-400 text-xs">
                {rejectionStats.totalWithDateRejected} of {rejectionStats.totalRejected} rejected have a date; {rejectionStats.totalWithRejectionSource} have a source.
              </p>
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">By how you heard</p>
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  {(['email', 'ai_generated', 'portal', 'other', 'unknown'] as const).map((src) => (
                    <li key={src} className="flex justify-between">
                      <span>{src === 'ai_generated' ? 'AI generated' : src === 'unknown' ? 'Not specified' : src.charAt(0).toUpperCase() + src.slice(1)}</span>
                      <span className="tabular-nums font-medium">{rejectionStats.bySource[src] ?? 0}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {rejectionStats.dateRejectedCounts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Rejections by date</p>
                  <ul className="space-y-1 text-xs text-zinc-400 max-h-24 overflow-y-auto">
                    {rejectionStats.dateRejectedCounts.slice(0, 10).map(([date, count]) => (
                      <li key={date}>{new Date(date + 'T00:00:00').toLocaleDateString()}: {count}</li>
                    ))}
                    {rejectionStats.dateRejectedCounts.length > 10 && (
                      <li className="text-zinc-400">+{rejectionStats.dateRejectedCounts.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="bg-zinc-800 rounded-xl border border-zinc-700/80 shadow-sm p-5">
            <h3 className="text-zinc-100 font-semibold text-sm uppercase tracking-wider mb-1">Rejections over time</h3>
            <p className="text-xs text-zinc-400 mb-4">By date rejected (or application date if not set).</p>
            {rejectionTimelineStats.length === 0 ? (
              <p className="text-zinc-400 text-sm">No rejections in this range.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {rejectionTimelineStats.map(([date, count]) => {
                  const pct = maxRejectionTimelineCount ? Math.max(8, (count / maxRejectionTimelineCount) * 100) : 0;
                  return (
                    <div key={date}>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>{new Date(date + 'T00:00:00').toLocaleDateString()}</span>
                        <span className="tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                        <div className="h-2 rounded-full bg-red-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top companies */}
        <div className="bg-zinc-800 rounded-xl border border-zinc-700/80 shadow-sm p-5">
          <h3 className="text-zinc-100 font-semibold text-sm uppercase tracking-wider mb-4">Top companies by applications</h3>
          {companyStats.length === 0 ? (
            <p className="text-zinc-400 text-sm">No company data for this filter.</p>
          ) : (
            <div className="space-y-3">
              {companyStats.map(([company, count]) => {
                const pct = maxCompanyCount ? Math.max(10, (count / maxCompanyCount) * 100) : 0;
                return (
                  <div key={company}>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span className="truncate max-w-[70%] font-medium text-zinc-200">{company}</span>
                      <span className="tabular-nums">{count}</span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI insights */}
        <div className="bg-zinc-800 rounded-xl border border-zinc-700/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-zinc-100 font-semibold text-sm uppercase tracking-wider mb-1">AI insights</h3>
              <p className="text-zinc-400 text-xs">
                Summarizes your data using the current filters.
                {aiModel && (
                  <span className="block mt-1 text-zinc-400">
                    Model: {aiModel.replace(/^[^/]+\//, '')}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateInsights}
              disabled={aiLoading || jobs.length === 0}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-600 disabled:text-zinc-400 text-xs font-semibold text-white transition-colors"
            >
              {aiLoading ? 'Analyzing…' : 'Generate insights'}
            </button>
          </div>
          {aiError && (
            <p className="text-xs text-red-600">{aiError}</p>
          )}
          {aiInsights ? (
            <>
              {/* Insights at a glance: charts in one row (dashboard-style) */}
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50/80 p-4">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-4">Insights at a glance</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-zinc-700/60 shadow-sm min-h-[200px] flex flex-col">
                    <p className="text-xs font-medium text-zinc-400 mb-2">Status breakdown</p>
                    {statusPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={statusPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {statusPieData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [value, 'Applications']} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-zinc-400">No status data</p>
                    )}
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-zinc-700/60 shadow-sm min-h-[200px] flex flex-col">
                    <p className="text-xs font-medium text-zinc-400 mb-2">Applications over time</p>
                    {timelineChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={timelineChartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                          <Tooltip
                            formatter={(value: number) => [value, 'Applications']}
                            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate && new Date(payload[0].payload.fullDate + 'T12:00:00').toLocaleDateString()}
                          />
                          <Area type="monotone" dataKey="applications" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={1.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-zinc-400">No timeline data</p>
                    )}
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-zinc-700/60 shadow-sm min-h-[200px] flex flex-col">
                    <p className="text-xs font-medium text-zinc-400 mb-2">Rejections by source</p>
                    {rejectionSourceChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={rejectionSourceChartData} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value: number) => [value, 'Rejections']} />
                          <Bar dataKey="count" fill="#34d399" radius={[0, 4, 4, 0]} name="Rejections" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-zinc-400">No rejection source data</p>
                    )}
                  </div>
                </div>
              </div>
              {/* Insight cards + Related reading: 2-col grid so cards line up side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const normalized = aiInsights.replace(/\n{3,}/g, '\n\n').trim();
                  const sections = normalized
                    .split(/(?=^### )|(?=\n\n[A-Z][^\n]{2,120}:)/m)
                    .map((block) => block.trim())
                    .filter(Boolean);
                  const mdComponents = {
                    h4: ({ children }: { children?: React.ReactNode }) => <h4 className="text-sm font-semibold text-zinc-100 mt-3 mb-1.5 first:mt-0">{children}</h4>,
                    p: ({ children }: { children?: React.ReactNode }) => <p className="text-sm text-zinc-300 leading-relaxed mb-3 last:mb-0">{children}</p>,
                    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1.5 mb-3 ml-1">{children}</ul>,
                    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside text-sm text-zinc-300 space-y-1.5 mb-3 ml-1">{children}</ol>,
                    li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed mb-1">{children}</li>,
                    strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
                  };
                  return sections.map((block, i) => {
                    const firstLineEnd = block.indexOf('\n');
                    const firstLine = firstLineEnd > 0 ? block.slice(0, firstLineEnd) : block;
                    const isMarkdownHeader = /^###\s+/.test(firstLine);
                    const isColonHeader = /^[A-Z][^\n]{2,100}:$/.test(firstLine.trim());
                    const title = isMarkdownHeader
                      ? firstLine.replace(/^###\s*/, '').trim()
                      : isColonHeader
                        ? firstLine.trim().replace(/:$/, '')
                        : '';
                    const body = (isMarkdownHeader || isColonHeader) && firstLineEnd > 0
                      ? block.slice(firstLineEnd).trim()
                      : block;
                    const bodyWithSubheadings = body.replace(
                      /^([A-Z][^\n]{3,80}:)\s*$/gm,
                      (_, line) => `#### ${line.replace(/:$/, '')}`,
                    );
                    return (
                      <div key={i} className="bg-zinc-800 rounded-xl border border-zinc-700/80 p-4 shadow-sm min-h-[140px]">
                        {title && <h3 className="text-sm font-semibold text-zinc-100 mb-3 pb-2 border-b border-zinc-700">{title}</h3>}
                        <div className="insights-prose">
                          <ReactMarkdown components={mdComponents}>{bodyWithSubheadings}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  });
                })()}
                {aiSuggestedReading && aiSuggestedReading.length > 0 && (
                  <div className="bg-zinc-800 rounded-xl border border-zinc-700/80 p-4 shadow-sm min-h-[140px]">
                    <h3 className="text-sm font-semibold text-zinc-100 mb-2 pb-2 border-b border-zinc-700">Related reading</h3>
                    <p className="text-xs text-zinc-400 mb-3">News and policy context relevant to your insights.</p>
                    <ul className="space-y-2">
                      {aiSuggestedReading.map((item, i) => (
                        <li key={i}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-zinc-200 hover:text-zinc-400 underline"
                          >
                            {item.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : !aiLoading && !aiError ? (
            <p className="text-zinc-400 text-xs">
              Run the analysis to get a summary of patterns and recommendations.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

