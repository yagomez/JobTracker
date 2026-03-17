'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type {
  CompanyReview,
  ReviewerType,
  InterviewQuestion,
  InterviewQuestionType,
  ApplicationExperience,
  ResponseChannel,
  HiredAdvice,
  EmployeeFeedbackVisibility,
  ParentalLeaveUsed,
  ParentalLeaveAccommodating,
} from '@/lib/types';
import { filterUsCompanies } from '@/lib/us-companies';
import { getDemoDataForCompany, getDemoCompanies } from '@/lib/demo-reviews-data';
import mainframeArt from '@/app/images/mainframe_art.png';

// Prevent SSG/prerender issues with `useSearchParams` in this page and others.
export const dynamic = 'force-dynamic';

type CompanySummary = { name: string; reviewCount: number; avgGhostRating: number };

const REVIEWER_LABELS: Record<ReviewerType, string> = {
  prospective_interviewee: 'Prospective Interviewee',
  employee: 'Employee',
  ex_employee: 'Ex-Employee',
};

type ViewAsOption = 'overview' | ReviewerType;

const VIEW_AS_LABELS: Record<ViewAsOption, string> = {
  overview: 'Overview',
  ...REVIEWER_LABELS,
};

const GHOST_RATING_LABELS: Record<number, string> = {
  1: '1 — Rarely',
  2: '2',
  3: '3',
  4: '4',
  5: '5 — Very often',
};

const PIE_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] as const; // 1 (green) -> 5 (red)

const QUESTION_TYPE_LABELS: Record<InterviewQuestionType, string> = {
  tech: 'Tech',
  behavioral: 'Behavioral',
  system_design: 'System design',
  other: 'Other',
};

const RESPONSE_CHANNEL_LABELS: Record<ResponseChannel, string> = {
  recruiter: 'Recruiter',
  phone: 'Phone',
  email: 'Email',
  applicant_portal: 'Applicant portal',
  other: 'Other',
};

const RESPONSE_TIME_BUCKETS = [
  { key: '0-7', label: '0–7 days', min: 0, max: 7 },
  { key: '8-14', label: '8–14 days', min: 8, max: 14 },
  { key: '15-30', label: '15–30 days', min: 15, max: 30 },
  { key: '31+', label: '31+ days', min: 31, max: Infinity },
  { key: 'none', label: 'No response', min: -1, max: -1 },
] as const;

/** Tooltip that renders with position:fixed so it isn't clipped by overflow-auto scroll containers */
function GhostRatingChartTooltip({
  active,
  payload,
  coordinate,
  chartWrapperRef,
}: {
  active?: boolean;
  // Recharts may pass a readonly payload array; accept it to avoid TS build failures.
  payload?: readonly { name: string; value: number }[];
  coordinate?: { x: number; y: number };
  chartWrapperRef?: React.RefObject<HTMLDivElement | null>;
}) {
  if (!active || !payload?.length || !coordinate) return null;
  const p = payload[0];
  const total = payload.reduce((s, i) => s + (i.value ?? 0), 0);
  const pct = total ? Math.round((p.value / total) * 100) : 0;
  const rect = chartWrapperRef?.current?.getBoundingClientRect();
  const left = rect ? rect.left + coordinate.x : coordinate.x;
  const top = rect ? rect.top + coordinate.y - 48 : coordinate.y - 48;
  const maxLeft = typeof window !== 'undefined' ? window.innerWidth - 180 : left;
  const minTop = 8;
  return (
    <div
      className="fixed z-50 px-3 py-2 rounded-lg border border-white/10 bg-zinc-900 shadow-xl text-sm text-zinc-200 whitespace-nowrap"
      style={{
        left: Math.min(left, maxLeft),
        top: Math.max(minTop, top),
      }}
    >
      <div className="font-medium text-white">{p.name}</div>
      <div className="text-zinc-400">
        {p.value} review{p.value !== 1 ? 's' : ''} ({pct}%)
      </div>
    </div>
  );
}

function GhostJobPieChart({ distribution }: { distribution: Record<number, number> }) {
  const total = ( [1, 2, 3, 4, 5] as const ).reduce((s, r) => s + (distribution[r] ?? 0), 0);
  if (total === 0) return null;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  let startAngle = -Math.PI / 2; // start at top
  const segments = ( [1, 2, 3, 4, 5] as const ).map((rating) => {
    const count = distribution[rating] ?? 0;
    const pct = count / total;
    const endAngle = startAngle + pct * 2 * Math.PI;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = pct > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return { rating, d, color: PIE_COLORS[rating - 1] };
  });
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden>
      {segments.map(({ rating, d, color }) => (
        <path key={rating} d={d} fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
      ))}
    </svg>
  );
}

function GhostStars({ rating }: { rating: number }) {
  const r = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span className="inline-flex items-center gap-0.5" title={`Ghost job rating: ${rating}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= r ? 'text-white' : 'text-zinc-600'}>★</span>
      ))}
      <span className="ml-1 text-xs text-zinc-500">({rating}/5)</span>
    </span>
  );
}

const SUGGESTIONS_DEBOUNCE_MS = 200;

export default function CompanyReviewsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<CompanySummary[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formCompany, setFormCompany] = useState('');
  const [formReviewerType, setFormReviewerType] = useState<ReviewerType>('prospective_interviewee');
  const [formRating, setFormRating] = useState(3);
  const [formText, setFormText] = useState('');
  const [viewAsPerspective, setViewAsPerspective] = useState<ViewAsOption>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [companyLogoFailed, setCompanyLogoFailed] = useState(false);
  const [ghostChartYear, setGhostChartYear] = useState<number>(new Date().getFullYear());
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionFormText, setQuestionFormText] = useState('');
  const [questionFormType, setQuestionFormType] = useState<InterviewQuestionType>('tech');
  const [questionFormLeetcodeTopic, setQuestionFormLeetcodeTopic] = useState('');
  const [questionFormMostRecent, setQuestionFormMostRecent] = useState(false);
  const [questionMessage, setQuestionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [applicationExperiences, setApplicationExperiences] = useState<ApplicationExperience[]>([]);
  const [hiredAdvice, setHiredAdvice] = useState<HiredAdvice[]>([]);
  const [loadingProspective, setLoadingProspective] = useState(false);
  const [showAppExperienceForm, setShowAppExperienceForm] = useState(false);
  const [appExpDays, setAppExpDays] = useState<string>('');
  const [appExpChannel, setAppExpChannel] = useState<ResponseChannel>('recruiter');
  const [appExpMessage, setAppExpMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingAppExp, setSubmittingAppExp] = useState(false);
  const [showHiredAdviceForm, setShowHiredAdviceForm] = useState(false);
  const [hiredAdviceText, setHiredAdviceText] = useState('');
  const [hiredAdviceLinkedIn, setHiredAdviceLinkedIn] = useState('');
  const [hiredAdviceMessage, setHiredAdviceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingHiredAdvice, setSubmittingHiredAdvice] = useState(false);
  const [employeeFeedbackData, setEmployeeFeedbackData] = useState<{
    publicFeedback: Array<{ id: number; culture_rating: number; management_rating: number; work_life_rating: number; compensation_rating: number; feedback_text: string | null; created_at: string }>;
    aggregateStats: { response_count: number; avg_culture: number; avg_management: number; avg_work_life: number; avg_compensation: number } | null;
    overallFeedbackSnippets: string[];
  } | null>(null);
  const [loadingEmployeeFeedback, setLoadingEmployeeFeedback] = useState(false);
  const [showEmployeeFeedbackForm, setShowEmployeeFeedbackForm] = useState(false);
  const [empCulture, setEmpCulture] = useState(3);
  const [empManagement, setEmpManagement] = useState(3);
  const [empWorkLife, setEmpWorkLife] = useState(3);
  const [empCompensation, setEmpCompensation] = useState(3);
  const [empFeedbackText, setEmpFeedbackText] = useState('');
  const [empLinkedIn, setEmpLinkedIn] = useState('');
  const [empVisibility, setEmpVisibility] = useState<EmployeeFeedbackVisibility>('aggregate_only');
  const [employeeFeedbackMessage, setEmployeeFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingEmployeeFeedback, setSubmittingEmployeeFeedback] = useState(false);
  const [salaryRanges, setSalaryRanges] = useState<Array<{ id: number; role_title: string; min_salary: number; max_salary: number; currency: string; source: string; created_at: string }>>([]);
  const [loadingSalaryRanges, setLoadingSalaryRanges] = useState(false);
  const [showSalaryRangeForm, setShowSalaryRangeForm] = useState(false);
  const [salaryRole, setSalaryRole] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('USD');
  const [salaryRangeMessage, setSalaryRangeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingSalaryRange, setSubmittingSalaryRange] = useState(false);
  const [viewSuggestionText, setViewSuggestionText] = useState('');
  const [viewSuggestionMessage, setViewSuggestionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingViewSuggestion, setSubmittingViewSuggestion] = useState(false);
  const [realtimeInsights, setRealtimeInsights] = useState<Array<{ id: number; date_applied: string; date_heard_back: string | null; response_channel: string | null; source: string; created_at: string }>>([]);
  const [loadingRealtimeInsights, setLoadingRealtimeInsights] = useState(false);
  const [jobTrackerJobs, setJobTrackerJobs] = useState<Array<{ id: number; company: string; position: string; date_applied: string; status: string; date_rejected?: string | null; last_update: string }>>([]);
  const [loadingJobTrackerJobs, setLoadingJobTrackerJobs] = useState(false);
  const [showRealtimeManualForm, setShowRealtimeManualForm] = useState(false);
  const [manualDateApplied, setManualDateApplied] = useState('');
  const [manualDateHeardBack, setManualDateHeardBack] = useState('');
  const [manualResponseChannel, setManualResponseChannel] = useState('');
  const [realtimeMessage, setRealtimeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingRealtime, setSubmittingRealtime] = useState(false);
  const [exEmployeeData, setExEmployeeData] = useState<{
    aggregateStats: {
      response_count: number;
      avg_years_to_promotion: number | null;
      count_years_to_promotion: number;
      avg_leadership: number | null;
      count_leadership: number;
      avg_benefits: number;
      avg_work_life: number;
      parental_leave: { used_yes_count: number; accommodating_yes: number; accommodating_no: number; accommodating_somewhat: number };
    } | null;
    overallFeedbackSnippets: string[];
  } | null>(null);
  const [loadingExEmployee, setLoadingExEmployee] = useState(false);
  const [showExEmployeeForm, setShowExEmployeeForm] = useState(false);
  const [exYearsToPromo, setExYearsToPromo] = useState('');
  const [exLeadershipRating, setExLeadershipRating] = useState<string>('');
  const [exLeadershipYear, setExLeadershipYear] = useState('');
  const [exBenefitsRating, setExBenefitsRating] = useState(3);
  const [exWorkLifeRating, setExWorkLifeRating] = useState(3);
  const [exUsedParentalLeave, setExUsedParentalLeave] = useState<ParentalLeaveUsed | ''>('');
  const [exParentalLeaveAccommodating, setExParentalLeaveAccommodating] = useState<ParentalLeaveAccommodating | ''>('');
  const [exFeedbackText, setExFeedbackText] = useState('');
  const [exLinkedIn, setExLinkedIn] = useState('');
  const [exEmployeeMessage, setExEmployeeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingExEmployee, setSubmittingExEmployee] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghostChartWrapperRef = useRef<HTMLDivElement>(null);

  const isDemo = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('demo') === '1';
  }, []);

  /** Years that have at least one review (for this company, from current reviews in state) */
  const reviewYears = useMemo(() => {
    const years = new Set<number>();
    reviews.forEach((r) => {
      const y = new Date(r.created_at).getFullYear();
      if (Number.isInteger(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [reviews]);

  /** Ghost job rating distribution for the selected year: { 1: n, 2: n, ... 5: n } */
  const ghostRatingByYear = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const y = new Date(r.created_at).getFullYear();
      if (y === ghostChartYear && r.ghost_job_rating >= 1 && r.ghost_job_rating <= 5) {
        counts[r.ghost_job_rating] = (counts[r.ghost_job_rating] || 0) + 1;
      }
    });
    return counts;
  }, [reviews, ghostChartYear]);

  const ghostChartTotal = useMemo(
    () => (Object.values(ghostRatingByYear) as number[]).reduce((a, b) => a + b, 0),
    [ghostRatingByYear]
  );

  /** Prospective interviewee: response time bucket counts and channel counts for charts */
  const { responseTimeBuckets, channelCounts, responseTimeTotal } = useMemo(() => {
    const buckets: Record<string, number> = { '0-7': 0, '8-14': 0, '15-30': 0, '31+': 0, none: 0 };
    const channels: Record<ResponseChannel, number> = {
      recruiter: 0,
      phone: 0,
      email: 0,
      applicant_portal: 0,
      other: 0,
    };
    applicationExperiences.forEach((e) => {
      if (e.days_to_response == null) buckets.none += 1;
      else if (e.days_to_response <= 7) buckets['0-7'] += 1;
      else if (e.days_to_response <= 14) buckets['8-14'] += 1;
      else if (e.days_to_response <= 30) buckets['15-30'] += 1;
      else buckets['31+'] += 1;
      channels[e.response_channel] = (channels[e.response_channel] ?? 0) + 1;
    });
    const total = applicationExperiences.length;
    return {
      responseTimeBuckets: buckets,
      channelCounts: channels,
      responseTimeTotal: total,
    };
  }, [applicationExperiences]);

  /** Recharts: ghost rating pie data (filter zeros); keep rating for color index */
  const ghostPieData = useMemo(
    () =>
      ([1, 2, 3, 4, 5] as const)
        .map((r) => ({ name: GHOST_RATING_LABELS[r], value: ghostRatingByYear[r] ?? 0, rating: r }))
        .filter((d) => d.value > 0),
    [ghostRatingByYear]
  );

  /** Recharts: response time bar data */
  const responseTimeBarData = useMemo(
    () =>
      RESPONSE_TIME_BUCKETS.map((b) => ({
        name: b.label,
        count: responseTimeBuckets[b.key] ?? 0,
      })),
    [responseTimeBuckets]
  );

  /** Recharts: response channel pie data (filter zeros) */
  const channelPieData = useMemo(
    () =>
      (Object.keys(RESPONSE_CHANNEL_LABELS) as ResponseChannel[]).map((ch) => ({
        name: RESPONSE_CHANNEL_LABELS[ch],
        value: channelCounts[ch] ?? 0,
      })).filter((d) => d.value > 0),
    [channelCounts]
  );

  const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#6b7280'];

  /** Recharts: employee aggregate ratings bar data (1–5 scale) */
  const employeeBarData = useMemo(() => {
    const s = employeeFeedbackData?.aggregateStats;
    if (!s) return [];
    return [
      { name: 'Culture', value: s.avg_culture },
      { name: 'Management', value: s.avg_management },
      { name: 'Work-life', value: s.avg_work_life },
      { name: 'Compensation', value: s.avg_compensation },
    ];
  }, [employeeFeedbackData?.aggregateStats]);

  /** Recharts: ex-employee aggregate bar data (mix of years and 1–5) */
  const exEmployeeBarData = useMemo(() => {
    const s = exEmployeeData?.aggregateStats;
    if (!s) return [];
    const items: { name: string; value: number }[] = [];
    if (s.avg_years_to_promotion != null) items.push({ name: 'Avg. years to promotion', value: s.avg_years_to_promotion });
    if (s.avg_leadership != null) items.push({ name: 'Leadership (1–5)', value: s.avg_leadership });
    items.push({ name: 'Benefits (1–5)', value: s.avg_benefits });
    items.push({ name: 'Work-life (1–5)', value: s.avg_work_life });
    return items;
  }, [exEmployeeData?.aggregateStats]);

  /** Derive a likely domain from company name for logo lookup (e.g. "Acme Corp" -> "acme.com") */
  const companyToDomain = (name: string): string => {
    const slug = name
      .replace(/\s+(inc\.?|corp\.?|ltd\.?|llc|co\.?|company)\s*$/i, '')
      .replace(/[^a-z0-9]+/gi, '')
      .toLowerCase()
      .slice(0, 30);
    return slug ? `${slug}.com` : '';
  };

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    try {
      const res = await fetch(`/api/reviews?search=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      const fromApi = res.ok ? (data.companies ?? []) : [];
      if (fromApi.length > 0) {
        setSuggestions(fromApi);
      } else {
        const fallbackNames = filterUsCompanies(query.trim(), 15);
        setSuggestions(
          fallbackNames.map((name) => ({ name, reviewCount: 0, avgGhostRating: 0 }))
        );
      }
    } catch {
      const fallbackNames = filterUsCompanies(query.trim(), 15);
      setSuggestions(
        fallbackNames.map((name) => ({ name, reviewCount: 0, avgGhostRating: 0 }))
      );
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchInput.trim()) {
      if (isDemo) {
        setSuggestions(getDemoCompanies(''));
        setSelectedIndex(-1);
      } else {
        setSuggestions([]);
        setSuggestionsOpen(false);
        setSelectedIndex(-1);
      }
      return;
    }
    if (isDemo) {
      const list = getDemoCompanies(searchInput);
      setSuggestions(list);
      setSuggestionsOpen(true);
      setSelectedIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(searchInput);
      setSuggestionsOpen(true);
      setSelectedIndex(-1);
    }, SUGGESTIONS_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, fetchSuggestions, isDemo]);

  const fetchReviews = useCallback(async (company: string) => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/reviews?company=${encodeURIComponent(company)}`);
      const data = await res.json();
      if (res.ok) setReviews(data.reviews ?? []);
      else setReviews([]);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  const fetchInterviewQuestions = useCallback(async (company: string) => {
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/interview-questions?company=${encodeURIComponent(company)}`);
      const data = await res.json();
      if (res.ok) setInterviewQuestions(data.questions ?? []);
      else setInterviewQuestions([]);
    } catch {
      setInterviewQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  const fetchProspectiveData = useCallback(async (company: string) => {
    setLoadingProspective(true);
    try {
      const [expRes, adviceRes, insightsRes] = await Promise.all([
        fetch(`/api/application-experiences?company=${encodeURIComponent(company)}`),
        fetch(`/api/hired-advice?company=${encodeURIComponent(company)}`),
        fetch(`/api/realtime-application-insights?company=${encodeURIComponent(company)}`),
      ]);
      const expData = await expRes.json();
      const adviceData = await adviceRes.json();
      const insightsData = await insightsRes.json();
      setApplicationExperiences(expRes.ok ? expData.experiences ?? [] : []);
      setHiredAdvice(adviceRes.ok ? adviceData.advice ?? [] : []);
      setRealtimeInsights(insightsRes.ok ? insightsData.insights ?? [] : []);
    } catch {
      setApplicationExperiences([]);
      setHiredAdvice([]);
      setRealtimeInsights([]);
    } finally {
      setLoadingProspective(false);
    }
  }, []);

  const fetchJobTrackerJobsForCompany = useCallback(async (company: string) => {
    setLoadingJobTrackerJobs(true);
    try {
      const res = await fetch(`/api/jobs?company=${encodeURIComponent(company)}`);
      const data = await res.json();
      setJobTrackerJobs(Array.isArray(data) ? data : []);
    } catch {
      setJobTrackerJobs([]);
    } finally {
      setLoadingJobTrackerJobs(false);
    }
  }, []);

  const fetchEmployeeFeedback = useCallback(async (company: string) => {
    setLoadingEmployeeFeedback(true);
    try {
      const res = await fetch(`/api/employee-feedback?company=${encodeURIComponent(company)}`);
      const data = await res.json();
      if (res.ok) {
        setEmployeeFeedbackData({
          publicFeedback: data.publicFeedback ?? [],
          aggregateStats: data.aggregateStats ?? null,
          overallFeedbackSnippets: data.overallFeedbackSnippets ?? [],
        });
      } else {
        setEmployeeFeedbackData(null);
      }
    } catch {
      setEmployeeFeedbackData(null);
    } finally {
      setLoadingEmployeeFeedback(false);
    }
  }, []);

  const fetchSalaryRanges = useCallback(async (company: string) => {
    setLoadingSalaryRanges(true);
    try {
      const res = await fetch(`/api/salary-ranges?company=${encodeURIComponent(company)}`);
      const data = await res.json();
      setSalaryRanges(res.ok ? data.ranges ?? [] : []);
    } catch {
      setSalaryRanges([]);
    } finally {
      setLoadingSalaryRanges(false);
    }
  }, []);

  const fetchExEmployeeFeedback = useCallback(async (company: string) => {
    setLoadingExEmployee(true);
    try {
      const res = await fetch(`/api/ex-employee-feedback?company=${encodeURIComponent(company)}`);
      const data = await res.json();
      if (res.ok) {
        setExEmployeeData({
          aggregateStats: data.aggregateStats ?? null,
          overallFeedbackSnippets: data.overallFeedbackSnippets ?? [],
        });
      } else {
        setExEmployeeData(null);
      }
    } catch {
      setExEmployeeData(null);
    } finally {
      setLoadingExEmployee(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedCompany) {
      setReviews([]);
      setInterviewQuestions([]);
      setApplicationExperiences([]);
      setHiredAdvice([]);
      setEmployeeFeedbackData(null);
      setSalaryRanges([]);
      setExEmployeeData(null);
      setRealtimeInsights([]);
      setJobTrackerJobs([]);
      setFormCompany('');
      return;
    }
    setFormCompany(selectedCompany);
    setCompanyLogoFailed(false);
    if (isDemo) {
      const d = getDemoDataForCompany(selectedCompany);
      setReviews(d.reviews);
      setInterviewQuestions(d.interviewQuestions);
      setApplicationExperiences(d.applicationExperiences);
      setHiredAdvice(d.hiredAdvice);
      setEmployeeFeedbackData(d.employeeFeedbackData);
      setSalaryRanges(d.salaryRanges);
      setExEmployeeData(d.exEmployeeData);
      setRealtimeInsights(d.realtimeInsights);
      setJobTrackerJobs(d.jobTrackerJobs ?? []);
      setLoadingReviews(false);
      setLoadingQuestions(false);
      setLoadingProspective(false);
      setLoadingEmployeeFeedback(false);
      setLoadingSalaryRanges(false);
      setLoadingExEmployee(false);
      setLoadingRealtimeInsights(false);
      setLoadingJobTrackerJobs(false);
      return;
    }
    fetchReviews(selectedCompany);
    fetchInterviewQuestions(selectedCompany);
    fetchProspectiveData(selectedCompany);
    fetchEmployeeFeedback(selectedCompany);
    fetchSalaryRanges(selectedCompany);
    fetchExEmployeeFeedback(selectedCompany);
  }, [selectedCompany, isDemo, fetchReviews, fetchInterviewQuestions, fetchProspectiveData, fetchEmployeeFeedback, fetchSalaryRanges, fetchExEmployeeFeedback]);

  useEffect(() => {
    if (isDemo) return;
    if (selectedCompany && viewAsPerspective === 'prospective_interviewee') {
      fetchJobTrackerJobsForCompany(selectedCompany);
    } else {
      setJobTrackerJobs([]);
    }
  }, [selectedCompany, viewAsPerspective, fetchJobTrackerJobsForCompany, isDemo]);

  const handleSelectCompany = useCallback((name: string) => {
    setSelectedCompany(name);
    setSearchInput(name);
    setSuggestionsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!suggestionsOpen || suggestions.length === 0) {
        if (e.key === 'Enter' && searchInput.trim()) {
          handleSelectCompany(searchInput.trim());
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectCompany(suggestions[selectedIndex].name);
        } else if (searchInput.trim()) {
          handleSelectCompany(searchInput.trim());
        }
      } else if (e.key === 'Escape') {
        setSuggestionsOpen(false);
        setSelectedIndex(-1);
      }
    },
    [suggestionsOpen, suggestions, selectedIndex, searchInput, handleSelectCompany]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const company = formCompany.trim();
    if (!company) {
      setMessage({ type: 'error', text: 'Company name is required.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company,
          reviewer_type: formReviewerType,
          ghost_job_rating: formRating,
          review_text: formText.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to submit review.' });
        return;
      }
      setMessage({ type: 'success', text: 'Review submitted. Thank you!' });
      setFormText('');
      setShowAddForm(false);
      if (selectedCompany && company.toLowerCase() === selectedCompany.toLowerCase()) {
        fetchReviews(selectedCompany);
      }
      fetchSuggestions(searchInput);
    } catch {
      setMessage({ type: 'error', text: 'Failed to submit review.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitQuestion(e: React.FormEvent) {
    e.preventDefault();
    setQuestionMessage(null);
    const company = selectedCompany?.trim();
    const text = questionFormText.trim();
    if (!company) {
      setQuestionMessage({ type: 'error', text: 'Select a company first.' });
      return;
    }
    if (!text) {
      setQuestionMessage({ type: 'error', text: 'Question text is required.' });
      return;
    }
    setSubmittingQuestion(true);
    try {
      const res = await fetch('/api/interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company,
          question_text: text,
          question_type: questionFormType,
          leetcode_topic: questionFormLeetcodeTopic.trim() || null,
          is_most_recent: questionFormMostRecent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuestionMessage({ type: 'error', text: data.error || 'Failed to submit question.' });
        return;
      }
      setQuestionMessage({ type: 'success', text: 'Question submitted. Thank you! Submitting your most recent question helps us reward contributors.' });
      setQuestionFormText('');
      setQuestionFormLeetcodeTopic('');
      setQuestionFormMostRecent(false);
      setShowQuestionForm(false);
      if (selectedCompany) fetchInterviewQuestions(selectedCompany);
    } catch {
      setQuestionMessage({ type: 'error', text: 'Failed to submit question.' });
    } finally {
      setSubmittingQuestion(false);
    }
  }

  async function handleSubmitAppExperience(e: React.FormEvent) {
    e.preventDefault();
    setAppExpMessage(null);
    const company = selectedCompany?.trim();
    if (!company) {
      setAppExpMessage({ type: 'error', text: 'Select a company first.' });
      return;
    }
    const daysRaw = appExpDays.trim();
    const days_to_response = daysRaw === '' || daysRaw.toLowerCase() === 'none' ? null : Math.max(0, Math.min(365, parseInt(daysRaw, 10) || 0));
    setSubmittingAppExp(true);
    try {
      const res = await fetch('/api/application-experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company,
          days_to_response,
          response_channel: appExpChannel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAppExpMessage({ type: 'error', text: data.error || 'Failed to submit.' });
        return;
      }
      setAppExpMessage({ type: 'success', text: 'Thanks! Your response helps other applicants.' });
      setAppExpDays('');
      setShowAppExperienceForm(false);
      if (selectedCompany) fetchProspectiveData(selectedCompany);
    } catch {
      setAppExpMessage({ type: 'error', text: 'Failed to submit.' });
    } finally {
      setSubmittingAppExp(false);
    }
  }

  async function handleSubmitHiredAdvice(e: React.FormEvent) {
    e.preventDefault();
    setHiredAdviceMessage(null);
    const company = selectedCompany?.trim();
    const text = hiredAdviceText.trim();
    const linkedin = hiredAdviceLinkedIn.trim();
    if (!company) {
      setHiredAdviceMessage({ type: 'error', text: 'Select a company first.' });
      return;
    }
    if (!text) {
      setHiredAdviceMessage({ type: 'error', text: 'Advice is required.' });
      return;
    }
    if (!linkedin || !/linkedin\.com/i.test(linkedin)) {
      setHiredAdviceMessage({ type: 'error', text: 'A valid LinkedIn profile URL is required.' });
      return;
    }
    setSubmittingHiredAdvice(true);
    try {
      const res = await fetch('/api/hired-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: company, advice_text: text, linkedin_url: linkedin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHiredAdviceMessage({ type: 'error', text: data.error || 'Failed to submit.' });
        return;
      }
      setHiredAdviceMessage({ type: 'success', text: 'Submitted. We’ll verify your LinkedIn before publishing—thank you!' });
      setHiredAdviceText('');
      setHiredAdviceLinkedIn('');
      setShowHiredAdviceForm(false);
      if (selectedCompany) fetchProspectiveData(selectedCompany);
    } catch {
      setHiredAdviceMessage({ type: 'error', text: 'Failed to submit.' });
    } finally {
      setSubmittingHiredAdvice(false);
    }
  }

  async function handleSubmitEmployeeFeedback(e: React.FormEvent) {
    e.preventDefault();
    setEmployeeFeedbackMessage(null);
    const company = selectedCompany?.trim();
    const linkedin = empLinkedIn.trim();
    if (!company) {
      setEmployeeFeedbackMessage({ type: 'error', text: 'Select a company first.' });
      return;
    }
    if (!linkedin || !/linkedin\.com/i.test(linkedin)) {
      setEmployeeFeedbackMessage({ type: 'error', text: 'A valid LinkedIn profile URL is required. We verify you worked there (same process as other sections).' });
      return;
    }
    setSubmittingEmployeeFeedback(true);
    try {
      const res = await fetch('/api/employee-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company,
          culture_rating: empCulture,
          management_rating: empManagement,
          work_life_rating: empWorkLife,
          compensation_rating: empCompensation,
          feedback_text: empFeedbackText.trim() || null,
          linkedin_url: linkedin,
          visibility: empVisibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmployeeFeedbackMessage({ type: 'error', text: data.error || 'Failed to submit.' });
        return;
      }
      setEmployeeFeedbackMessage({ type: 'success', text: 'Thank you. We’ll verify your LinkedIn before using your feedback. You can choose to post publicly or keep it in aggregated data only.' });
      setEmpFeedbackText('');
      setEmpLinkedIn('');
      setShowEmployeeFeedbackForm(false);
      if (selectedCompany) fetchEmployeeFeedback(selectedCompany);
    } catch {
      setEmployeeFeedbackMessage({ type: 'error', text: 'Failed to submit.' });
    } finally {
      setSubmittingEmployeeFeedback(false);
    }
  }

  async function handleSubmitSalaryRange(e: React.FormEvent) {
    e.preventDefault();
    setSalaryRangeMessage(null);
    const company = selectedCompany?.trim();
    const role = salaryRole.trim();
    const min = Number(salaryMin.replace(/[^0-9.]/g, ''));
    const max = Number(salaryMax.replace(/[^0-9.]/g, ''));
    if (!company) {
      setSalaryRangeMessage({ type: 'error', text: 'Select a company first.' });
      return;
    }
    if (!role) {
      setSalaryRangeMessage({ type: 'error', text: 'Role title is required.' });
      return;
    }
    if (!Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max < min) {
      setSalaryRangeMessage({ type: 'error', text: 'Enter valid min and max salary (numbers, max ≥ min).' });
      return;
    }
    setSubmittingSalaryRange(true);
    try {
      const res = await fetch('/api/salary-ranges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company,
          role_title: role,
          min_salary: min,
          max_salary: max,
          currency: salaryCurrency,
          source: 'careers_page',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSalaryRangeMessage({ type: 'error', text: data.error || 'Failed to submit.' });
        return;
      }
      setSalaryRangeMessage({ type: 'success', text: 'Range added. Compare with market data below.' });
      setSalaryRole('');
      setSalaryMin('');
      setSalaryMax('');
      setShowSalaryRangeForm(false);
      if (selectedCompany) fetchSalaryRanges(selectedCompany);
    } catch {
      setSalaryRangeMessage({ type: 'error', text: 'Failed to submit.' });
    } finally {
      setSubmittingSalaryRange(false);
    }
  }

  async function shareJobTrackerTimeline(job: { id: number; company: string; date_applied: string; status: string; date_rejected?: string | null; last_update: string }) {
    const date_heard_back = job.status === 'rejected' && job.date_rejected
      ? job.date_rejected
      : (job.status === 'interviewing' || job.status === 'offered') ? (job.last_update?.slice(0, 10) || null) : null;
    setRealtimeMessage(null);
    try {
      const res = await fetch('/api/realtime-application-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: job.company,
          date_applied: job.date_applied,
          date_heard_back,
          response_channel: null,
          source: 'job_tracker',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRealtimeMessage({ type: 'error', text: data.error || 'Failed to share.' });
        return;
      }
      setRealtimeMessage({ type: 'success', text: 'Timeline shared. Thank you!' });
      if (selectedCompany) fetchProspectiveData(selectedCompany);
    } catch {
      setRealtimeMessage({ type: 'error', text: 'Failed to share.' });
    }
  }

  async function handleSubmitRealtimeManual(e: React.FormEvent) {
    e.preventDefault();
    setRealtimeMessage(null);
    const company = selectedCompany?.trim();
    const date_applied = manualDateApplied.trim();
    if (!company) {
      setRealtimeMessage({ type: 'error', text: 'Select a company first.' });
      return;
    }
    if (!date_applied) {
      setRealtimeMessage({ type: 'error', text: 'Date applied is required.' });
      return;
    }
    setSubmittingRealtime(true);
    try {
      const res = await fetch('/api/realtime-application-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company,
          date_applied,
          date_heard_back: manualDateHeardBack.trim() || null,
          response_channel: manualResponseChannel.trim() || null,
          source: 'manual',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRealtimeMessage({ type: 'error', text: data.error || 'Failed to submit.' });
        return;
      }
      setRealtimeMessage({ type: 'success', text: 'Timeline added. Thank you!' });
      setManualDateApplied('');
      setManualDateHeardBack('');
      setManualResponseChannel('');
      setShowRealtimeManualForm(false);
      if (selectedCompany) fetchProspectiveData(selectedCompany);
    } catch {
      setRealtimeMessage({ type: 'error', text: 'Failed to submit.' });
    } finally {
      setSubmittingRealtime(false);
    }
  }

  async function handleSubmitExEmployeeFeedback(e: React.FormEvent) {
    e.preventDefault();
    setExEmployeeMessage(null);
    const company = selectedCompany?.trim();
    const linkedin = exLinkedIn.trim();
    if (!company) {
      setExEmployeeMessage({ type: 'error', text: 'Select a company first.' });
      return;
    }
    if (!linkedin || !/linkedin\.com/i.test(linkedin)) {
      setExEmployeeMessage({ type: 'error', text: 'A valid LinkedIn profile URL is required. We verify ex-employee status (same process as other sections).' });
      return;
    }
    const yearsToPromoRaw = exYearsToPromo.trim().toLowerCase();
    const years_to_promotion = yearsToPromoRaw === '' || yearsToPromoRaw === 'never' || yearsToPromoRaw === 'n/a'
      ? null
      : Math.max(0, parseFloat(yearsToPromoRaw) ?? 0);
    const leadership_rating = exLeadershipRating.trim() === '' ? null : Math.min(5, Math.max(1, parseInt(exLeadershipRating, 10) || 0));
    const leadership_year = exLeadershipYear.trim() === '' ? null : (parseInt(exLeadershipYear, 10) || null);
    setSubmittingExEmployee(true);
    try {
      const res = await fetch('/api/ex-employee-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company,
          linkedin_url: linkedin,
          years_to_promotion: years_to_promotion,
          leadership_rating: leadership_rating ?? null,
          leadership_year: leadership_year && leadership_year >= 1990 && leadership_year <= 2030 ? leadership_year : null,
          benefits_rating: exBenefitsRating,
          work_life_rating: exWorkLifeRating,
          used_parental_leave: exUsedParentalLeave || null,
          parental_leave_accommodating: exParentalLeaveAccommodating || null,
          feedback_text: exFeedbackText.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExEmployeeMessage({ type: 'error', text: data.error || 'Failed to submit.' });
        return;
      }
      setExEmployeeMessage({ type: 'success', text: 'Thank you. We’ll verify your LinkedIn before publishing (same process as other sections).' });
      setExYearsToPromo('');
      setExLeadershipRating('');
      setExLeadershipYear('');
      setExFeedbackText('');
      setExLinkedIn('');
      setExUsedParentalLeave('');
      setExParentalLeaveAccommodating('');
      setShowExEmployeeForm(false);
      if (selectedCompany) fetchExEmployeeFeedback(selectedCompany);
    } catch {
      setExEmployeeMessage({ type: 'error', text: 'Failed to submit.' });
    } finally {
      setSubmittingExEmployee(false);
    }
  }

  async function handleSubmitViewSuggestion(e: React.FormEvent) {
    e.preventDefault();
    setViewSuggestionMessage(null);
    const text = viewSuggestionText.trim();
    if (!text) {
      setViewSuggestionMessage({ type: 'error', text: 'Please enter a suggestion.' });
      return;
    }
    setSubmittingViewSuggestion(true);
    try {
      const res = await fetch('/api/view-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: selectedCompany?.trim() || null,
          view_name: viewAsPerspective,
          suggestion_text: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setViewSuggestionMessage({ type: 'error', text: data.error || 'Failed to submit.' });
        return;
      }
      setViewSuggestionMessage({ type: 'success', text: 'Thanks! Your suggestion helps us prioritize what to add.' });
      setViewSuggestionText('');
    } catch {
      setViewSuggestionMessage({ type: 'error', text: 'Failed to submit.' });
    } finally {
      setSubmittingViewSuggestion(false);
    }
  }

  /** Slug for levels.fyi company URL (e.g. "Acme Corp" -> "acme-corp") */
  const levelsFyiSlug = useMemo(() => {
    if (!selectedCompany) return '';
    return selectedCompany
      .replace(/\s+(inc\.?|corp\.?|ltd\.?|llc|co\.?|company)\s*$/i, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .replace(/^-|-$/g, '');
  }, [selectedCompany]);

  const showSuggestionsDropdown = suggestionsOpen && (searchInput.trim().length > 0 || (isDemo && suggestions.length > 0));

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-10">
      {/* Hero: centered question + search — vertically centered when no company selected */}
      <div
        className={
          selectedCompany
            ? 'flex flex-col items-center text-center pt-4 pb-8'
            : 'flex-1 flex flex-col items-center justify-center text-center min-h-0'
        }
      >
        <div className="mb-6">
          <Image
            src={mainframeArt}
            alt=""
            width={400}
            height={200}
            className="w-full max-w-md mx-auto h-auto object-contain"
            priority
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-6">
          Which company are you inquiring about?
        </h1>
        <div ref={searchContainerRef} className="w-full max-w-xl relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => {
              if (isDemo) {
                setSuggestions(getDemoCompanies(searchInput));
                setSuggestionsOpen(true);
              } else if (searchInput.trim()) setSuggestionsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Start typing company name..."
            className="w-full px-4 py-3.5 rounded-full border border-white/20 bg-white/5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 text-base"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showSuggestionsDropdown}
            aria-controls="suggestions-list"
            id="company-search"
          />
          {/* Google-style suggestions dropdown */}
          {showSuggestionsDropdown && (
            <ul
              id="suggestions-list"
              role="listbox"
              className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-white/10 bg-zinc-900 shadow-xl py-1 max-h-72 overflow-y-auto z-10"
            >
              {suggestionsLoading ? (
                <li className="px-4 py-3 text-zinc-500 text-sm">Searching...</li>
              ) : suggestions.length === 0 ? (
                <li role="option">
                  <button
                    type="button"
                    onClick={() => handleSelectCompany(searchInput.trim())}
                    className="w-full text-left px-4 py-3 text-zinc-400 hover:bg-white/5 hover:text-white text-sm transition-colors"
                  >
                    No companies found. Add the first review for &ldquo;{searchInput.trim()}&rdquo;
                  </button>
                </li>
              ) : (
                suggestions.map((c, i) => (
                  <li key={c.name} role="option" aria-selected={i === selectedIndex}>
                    <button
                      type="button"
                      onClick={() => handleSelectCompany(c.name)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                        i === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <span className="font-medium text-white">{c.name}</span>
                      <span className="text-xs text-zinc-400 shrink-0">
                        {c.reviewCount > 0 ? (
                          <>{c.reviewCount} review{c.reviewCount !== 1 ? 's' : ''} · <GhostStars rating={c.avgGhostRating} /></>
                        ) : (
                          'No reviews yet'
                        )}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Company view: left sidebar + main (overview + reviews) */}
      {selectedCompany && (
        <div className="flex flex-1 min-h-0 gap-0 rounded-lg border border-white/10 bg-zinc-900/50 overflow-hidden">
          {/* Left collapsible sidebar — View as perspective */}
          <aside
            className={`flex flex-col border-r border-white/10 bg-zinc-900 transition-[width] duration-200 ${
              sidebarCollapsed ? 'w-12 min-w-[3rem]' : 'w-52 min-w-[13rem]'
            }`}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="flex items-center justify-center h-11 border-b border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <span className="text-lg" aria-hidden>→</span>
              ) : (
                <span className="text-sm font-medium">View as</span>
              )}
            </button>
            {!sidebarCollapsed && (
              <nav className="p-2 flex flex-col gap-0.5" aria-label="View as">
                {(['overview', 'prospective_interviewee', 'employee', 'ex_employee'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setViewAsPerspective(option)}
                    className={`text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      viewAsPerspective === option
                        ? 'bg-white/15 text-white'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {VIEW_AS_LABELS[option]}
                  </button>
                ))}
              </nav>
            )}
          </aside>

          {/* Main: company overview + reviews */}
          <div className="flex-1 flex flex-col min-w-0 overflow-auto">
            {isDemo && (
              <div className="shrink-0 px-4 py-2 bg-amber-500/20 border-b border-amber-500/30 flex items-center gap-2">
                <span className="text-amber-400 font-medium">Demo</span>
                <span className="text-zinc-400 text-sm">Sample data for portfolio. No real API or database.</span>
              </div>
            )}
            {/* Company overview card */}
            <div className="p-4 sm:p-6 border-b border-white/10">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-16 h-16 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center overflow-hidden shrink-0">
                    {companyToDomain(selectedCompany) && !companyLogoFailed ? (
                      <Image
                        src={`https://logo.clearbit.com/${companyToDomain(selectedCompany)}`}
                        alt=""
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                        unoptimized
                        onError={() => setCompanyLogoFailed(true)}
                      />
                    ) : null}
                    <span
                      className="text-2xl font-bold text-white/80 w-full h-full items-center justify-center flex"
                      style={{
                        display: !companyToDomain(selectedCompany) || companyLogoFailed ? 'flex' : 'none',
                      }}
                    >
                      {selectedCompany.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedCompany}</h2>
                    <dl className="mt-2 space-y-1 text-sm">
                      <div className="flex gap-2">
                        <dt className="text-zinc-500 shrink-0">CEO</dt>
                        <dd className="text-zinc-300">—</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-zinc-500 shrink-0">Glassdoor</dt>
                        <dd className="text-zinc-300">—</dd>
                      </div>
                    </dl>
                  </div>
                </div>
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-3 py-1.5 rounded-md border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    {showAddForm ? 'Cancel' : 'Add your review'}
                  </button>
                </div>
              </div>
              <p className="text-zinc-400 text-sm mt-3">
                Reviews below {viewAsPerspective === 'overview' ? 'show all perspectives.' : `are filtered by “${VIEW_AS_LABELS[viewAsPerspective]}”.`} More company details (CEO, Glassdoor, etc.) can be added later.
              </p>

              {/* Ghost job rating pie chart by year */}
              <div className="mt-6 pt-6 border-t border-white/10 overflow-visible">
                <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-2">
                  Ghost job rating by year
                </h3>
                <p className="text-zinc-500 text-sm mb-3">
                  Based on user feedback: how often this company is reported to post ghost jobs (roles that stay up but are never filled). Add your review or connect your Job Tracker to contribute and feed into AI insights.
                </p>
                <div className="flex flex-wrap items-start gap-6 justify-center">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="ghost-chart-year" className="text-xs text-zinc-500">
                      Year
                    </label>
                    <select
                      id="ghost-chart-year"
                      value={ghostChartYear}
                      onChange={(e) => setGhostChartYear(Number(e.target.value))}
                      className="rounded-md border border-white/10 bg-black/50 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/30"
                    >
                      {Array.from(new Set([new Date().getFullYear(), ...reviewYears])).sort((a, b) => b - a).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap justify-center">
                    {ghostChartTotal === 0 ? (
                      <p className="text-zinc-500 text-sm">No ratings yet for {ghostChartYear}. Be the first to add a review.</p>
                    ) : (
                      <>
                        <div ref={ghostChartWrapperRef} className="w-[240px] h-[240px] shrink-0 flex items-center justify-center overflow-visible">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
                              <Pie
                                data={ghostPieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={72}
                                paddingAngle={2}
                              >
                                {ghostPieData.map((entry, i) => (
                                  <Cell key={i} fill={PIE_COLORS[entry.rating - 1]} />
                                ))}
                              </Pie>
                              <Tooltip
                                content={({ active, payload, coordinate }) => (
                                  <GhostRatingChartTooltip
                                    active={active}
                                    payload={payload}
                                    coordinate={coordinate}
                                    chartWrapperRef={ghostChartWrapperRef}
                                  />
                                )}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <GhostJobPieChart distribution={ghostRatingByYear} />
                        <ul className="flex flex-col gap-1 text-sm">
                          {( [1, 2, 3, 4, 5] as const ).map((rating) => {
                            const n = ghostRatingByYear[rating] ?? 0;
                            const pct = ghostChartTotal ? Math.round((n / ghostChartTotal) * 100) : 0;
                            return (
                              <li key={rating} className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-sm shrink-0"
                                  style={{ backgroundColor: PIE_COLORS[rating - 1] }}
                                />
                                <span className="text-zinc-400">{GHOST_RATING_LABELS[rating]}</span>
                                <span className="text-zinc-500 tabular-nums">{n} ({pct}%)</span>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Interview questions: submit exact questions without a full review (unlike Glassdoor). Gamification + LeetCode cross-reference. */}
            <div className="p-4 sm:p-6 border-b border-white/10">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Interview questions
              </h3>
              <p className="text-zinc-500 text-sm mb-3">
                Share the exact questions you were asked—no full review required. Submit your most recent question to help others and earn rewards. We cross-reference tech questions with company-tagged problems on LeetCode when available.
              </p>
              {showQuestionForm ? (
                <form onSubmit={handleSubmitQuestion} className="space-y-3 mb-4 p-3 rounded-lg border border-white/10 bg-black/30">
                  {questionMessage && (
                    <div
                      className={`p-2 rounded text-sm ${
                        questionMessage.type === 'success'
                          ? 'bg-white/10 text-green-300 border border-green-500/30'
                          : 'bg-red-950/50 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {questionMessage.text}
                    </div>
                  )}
                  <input type="hidden" value={selectedCompany ?? ''} readOnly aria-hidden />
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Question you were asked *</label>
                    <textarea
                      value={questionFormText}
                      onChange={(e) => setQuestionFormText(e.target.value)}
                      required
                      rows={2}
                      placeholder="e.g. Implement a function to reverse a linked list."
                      className="w-full px-3 py-2 rounded-md border border-white/10 bg-black/50 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30 resize-none text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Type</label>
                      <select
                        value={questionFormType}
                        onChange={(e) => setQuestionFormType(e.target.value as InterviewQuestionType)}
                        className="rounded-md border border-white/10 bg-black/50 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/30"
                      >
                        {(Object.keys(QUESTION_TYPE_LABELS) as InterviewQuestionType[]).map((t) => (
                          <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-[140px]">
                      <label className="block text-xs font-medium text-zinc-400 mb-1">LeetCode topic (optional)</label>
                      <input
                        type="text"
                        value={questionFormLeetcodeTopic}
                        onChange={(e) => setQuestionFormLeetcodeTopic(e.target.value)}
                        placeholder="e.g. two-pointers"
                        className="w-full px-3 py-2 rounded-md border border-white/10 bg-black/50 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={questionFormMostRecent}
                      onChange={(e) => setQuestionFormMostRecent(e.target.checked)}
                      className="rounded border-white/20 bg-black/50 text-white focus:ring-white/30"
                    />
                    This was from my most recent interview (helps you earn rewards)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submittingQuestion}
                      className="px-3 py-2 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
                    >
                      {submittingQuestion ? 'Submitting…' : 'Submit question'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuestionForm(false)}
                      className="px-3 py-2 rounded-md border border-white/20 text-zinc-400 text-sm hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowQuestionForm(true)}
                  className="mb-3 px-3 py-2 rounded-md border border-white/20 text-white text-sm font-medium hover:bg-white/10"
                >
                  Submit a question you were asked
                </button>
              )}
              {loadingQuestions ? (
                <p className="text-zinc-500 text-sm">Loading questions…</p>
              ) : interviewQuestions.length === 0 ? (
                <p className="text-zinc-500 text-sm">No questions submitted yet. Be the first to add one.</p>
              ) : (
                <ul className="space-y-2">
                  {interviewQuestions.map((q) => (
                    <li key={q.id} className="border-l-2 border-white/10 pl-3 py-1.5 text-sm">
                      <p className="text-zinc-300">{q.question_text}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-zinc-500 text-xs">{QUESTION_TYPE_LABELS[q.question_type]}</span>
                        {q.leetcode_topic && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">
                            LeetCode: {q.leetcode_topic}
                          </span>
                        )}
                        {q.is_most_recent && (
                          <span className="text-xs text-amber-400">Recent</span>
                        )}
                        <span className="text-zinc-500 text-xs">{new Date(q.created_at).toLocaleDateString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Prospective Interviewee view: response time, response channel, advice from hired */}
            {viewAsPerspective === 'prospective_interviewee' && (
              <div className="p-4 sm:p-6 border-b border-white/10 space-y-6">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                  For applicants
                </h3>
                <p className="text-zinc-500 text-sm">
                  Based on user feedback from people who applied. Help others by submitting your experience below.
                </p>

                {loadingProspective ? (
                  <p className="text-zinc-500 text-sm">Loading…</p>
                ) : (
                  <>
                    {/* Time to respond after applying */}
                    <div>
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">How long until they respond?</h4>
                      {responseTimeTotal === 0 ? (
                        <p className="text-zinc-500 text-sm mb-2">No data yet. Be the first to submit your experience.</p>
                      ) : (
                        <>
                          <div className="w-full h-[220px] mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={responseTimeBarData} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} allowDecimals={false} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: 'rgb(24 24 27)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                                  labelStyle={{ color: '#e4e4e7' }}
                                  formatter={(value: number | undefined) => [value ?? 0, 'Responses']}
                                />
                                <Bar dataKey="count" fill="rgba(255,255,255,0.25)" radius={[4, 4, 0, 0]} name="Responses" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex items-end gap-1 h-28 mb-2">
                            {(() => {
                              const maxCount = Math.max(1, ...RESPONSE_TIME_BUCKETS.map((b) => responseTimeBuckets[b.key] ?? 0));
                              return RESPONSE_TIME_BUCKETS.map((b) => {
                                const n = responseTimeBuckets[b.key] ?? 0;
                                const heightPct = maxCount ? (n / maxCount) * 100 : 0;
                                return (
                                  <div key={b.key} className="flex-1 flex flex-col items-center gap-1">
                                    <div
                                      className="w-full bg-white/25 rounded-t min-h-[4px] transition-all"
                                      style={{ height: `${Math.max(4, heightPct)}%` }}
                                    />
                                    <span className="text-zinc-500 text-xs text-center leading-tight">{b.label}</span>
                                    <span className="text-zinc-400 text-xs tabular-nums">{n}</span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </>
                      )}
                      {!showAppExperienceForm ? (
                        <button
                          type="button"
                          onClick={() => setShowAppExperienceForm(true)}
                          className="text-sm text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 px-2 py-1 rounded"
                        >
                          + Submit your experience
                        </button>
                      ) : (
                        <form onSubmit={handleSubmitAppExperience} className="mt-2 p-3 rounded-lg border border-white/10 bg-black/30 space-y-2 max-w-sm">
                          {appExpMessage && (
                            <p className={`text-sm ${appExpMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                              {appExpMessage.text}
                            </p>
                          )}
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">Days until first response (or leave blank if no response)</label>
                            <input
                              type="text"
                              value={appExpDays}
                              onChange={(e) => setAppExpDays(e.target.value)}
                              placeholder="e.g. 5 or leave empty for none"
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">How did they respond?</label>
                            <select
                              value={appExpChannel}
                              onChange={(e) => setAppExpChannel(e.target.value as ResponseChannel)}
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                            >
                              {(Object.keys(RESPONSE_CHANNEL_LABELS) as ResponseChannel[]).map((ch) => (
                                <option key={ch} value={ch}>{RESPONSE_CHANNEL_LABELS[ch]}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" disabled={submittingAppExp} className="px-2 py-1 rounded bg-white text-black text-sm disabled:opacity-50">
                              {submittingAppExp ? 'Submitting…' : 'Submit'}
                            </button>
                            <button type="button" onClick={() => setShowAppExperienceForm(false)} className="px-2 py-1 rounded border border-white/20 text-zinc-400 text-sm">
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* How they respond - pie / bar */}
                    <div>
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">How do they respond?</h4>
                      {responseTimeTotal === 0 ? (
                        <p className="text-zinc-500 text-sm">No data yet.</p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-6">
                          {channelPieData.length > 0 && (
                            <div className="w-[200px] h-[200px] shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={channelPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                  >
                                    {channelPieData.map((_, i) => (
                                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    contentStyle={{ backgroundColor: 'rgb(24 24 27)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                                    labelStyle={{ color: '#e4e4e7' }}
                                    formatter={(value: number | undefined) => [value ?? 0, 'Responses']}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                          <div className="flex gap-1">
                            {(Object.keys(RESPONSE_CHANNEL_LABELS) as ResponseChannel[]).map((ch) => {
                              const n = channelCounts[ch] ?? 0;
                              const pct = responseTimeTotal ? (n / responseTimeTotal) * 100 : 0;
                              const hue = (Object.keys(RESPONSE_CHANNEL_LABELS).indexOf(ch) * 60) % 360;
                              return (
                                <div
                                  key={ch}
                                  className="w-8 h-8 rounded flex items-center justify-center text-xs text-white font-medium"
                                  style={{ backgroundColor: `hsl(${hue}, 50%, 40%)` }}
                                  title={`${RESPONSE_CHANNEL_LABELS[ch]}: ${n} (${Math.round(pct)}%)`}
                                >
                                  {n}
                                </div>
                              );
                            })}
                          </div>
                          <ul className="text-sm text-zinc-400 space-y-0.5">
                            {(Object.keys(RESPONSE_CHANNEL_LABELS) as ResponseChannel[]).map((ch) => {
                              const n = channelCounts[ch] ?? 0;
                              const pct = responseTimeTotal ? Math.round((n / responseTimeTotal) * 100) : 0;
                              return (
                                <li key={ch}>
                                  {RESPONSE_CHANNEL_LABELS[ch]}: {n} ({pct}%)
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Advice from people who got hired - LinkedIn verified */}
                    <div>
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">Advice from people who got hired</h4>
                      <p className="text-zinc-500 text-sm mb-2">
                        Submissions require your LinkedIn profile. We’ll verify it before publishing (automated check coming soon).
                      </p>
                      {!showHiredAdviceForm ? (
                        <button
                          type="button"
                          onClick={() => setShowHiredAdviceForm(true)}
                          className="text-sm text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 px-2 py-1 rounded"
                        >
                          + Share advice (LinkedIn required)
                        </button>
                      ) : (
                        <form onSubmit={handleSubmitHiredAdvice} className="mt-2 p-3 rounded-lg border border-white/10 bg-black/30 space-y-2 max-w-lg">
                          {hiredAdviceMessage && (
                            <p className={`text-sm ${hiredAdviceMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                              {hiredAdviceMessage.text}
                            </p>
                          )}
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">Your advice for applicants *</label>
                            <textarea
                              value={hiredAdviceText}
                              onChange={(e) => setHiredAdviceText(e.target.value)}
                              required
                              rows={3}
                              placeholder="e.g. Prepare for system design; they move fast after the first call."
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">Your LinkedIn profile URL * (we verify before publishing)</label>
                            <input
                              type="url"
                              value={hiredAdviceLinkedIn}
                              onChange={(e) => setHiredAdviceLinkedIn(e.target.value)}
                              required
                              placeholder="https://www.linkedin.com/in/..."
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" disabled={submittingHiredAdvice} className="px-2 py-1 rounded bg-white text-black text-sm disabled:opacity-50">
                              {submittingHiredAdvice ? 'Submitting…' : 'Submit'}
                            </button>
                            <button type="button" onClick={() => setShowHiredAdviceForm(false)} className="px-2 py-1 rounded border border-white/20 text-zinc-400 text-sm">
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                      {hiredAdvice.length === 0 ? (
                        <p className="text-zinc-500 text-sm mt-2">No verified advice yet. Submit yours above.</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {hiredAdvice.map((a) => (
                            <li key={a.id} className="border-l-2 border-white/10 pl-3 py-1 text-sm text-zinc-300">
                              {a.advice_text}
                              <span className="text-zinc-500 text-xs block mt-0.5">{new Date(a.created_at).toLocaleDateString()}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Real-time application insights: from job tracker or manual (applied → heard back) */}
                    <div>
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">Real-time application insights</h4>
                      <p className="text-zinc-500 text-sm mb-2">
                        When users applied and when they heard back—from Job Tracker app users or manual shares. Helps applicants see current response patterns.
                      </p>
                      {realtimeInsights.length === 0 && !loadingRealtimeInsights ? (
                        <p className="text-zinc-500 text-sm mb-2">No shared timelines yet.</p>
                      ) : (
                        <ul className="space-y-1.5 mb-3">
                          {realtimeInsights.map((ins) => (
                            <li key={ins.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                              <span className="text-zinc-400">Applied {new Date(ins.date_applied).toLocaleDateString()}</span>
                              <span className="text-zinc-500">→</span>
                              {ins.date_heard_back ? (
                                <span className="text-zinc-300">Heard back {new Date(ins.date_heard_back).toLocaleDateString()}</span>
                              ) : (
                                <span className="text-zinc-500">No response yet</span>
                              )}
                              {ins.response_channel && <span className="text-zinc-500 text-xs">({ins.response_channel})</span>}
                              <span className="text-zinc-500 text-xs">{ins.source === 'job_tracker' ? 'Job Tracker' : 'Manual'}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* From your job tracker */}
                      <div className="mb-3">
                        <p className="text-xs text-zinc-500 mb-1.5">From your Job Tracker</p>
                        {loadingJobTrackerJobs ? (
                          <p className="text-zinc-500 text-sm">Loading…</p>
                        ) : jobTrackerJobs.length === 0 ? (
                          <p className="text-zinc-500 text-sm">No applications at this company in your Job Tracker. Add jobs on the main app, then share here.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {jobTrackerJobs.map((job) => (
                              <li key={job.id} className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="text-zinc-400">{job.position}</span>
                                <span className="text-zinc-500 text-xs">Applied {new Date(job.date_applied).toLocaleDateString()}</span>
                                <span className="text-zinc-500 text-xs">{job.status}</span>
                                <button
                                  type="button"
                                  onClick={() => shareJobTrackerTimeline(job)}
                                  className="text-xs px-2 py-0.5 rounded border border-white/20 text-zinc-400 hover:text-white hover:bg-white/10"
                                >
                                  Share this timeline
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Add manually */}
                      {!showRealtimeManualForm ? (
                        <button
                          type="button"
                          onClick={() => setShowRealtimeManualForm(true)}
                          className="text-sm text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 px-2 py-1 rounded"
                        >
                          + Add timeline manually (no Job Tracker)
                        </button>
                      ) : (
                        <form onSubmit={handleSubmitRealtimeManual} className="p-3 rounded-lg border border-white/10 bg-black/30 space-y-2 max-w-sm">
                          {realtimeMessage && (
                            <p className={`text-sm ${realtimeMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                              {realtimeMessage.text}
                            </p>
                          )}
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">Date applied *</label>
                            <input
                              type="date"
                              value={manualDateApplied}
                              onChange={(e) => setManualDateApplied(e.target.value)}
                              required
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">Date heard back (leave blank if none)</label>
                            <input
                              type="date"
                              value={manualDateHeardBack}
                              onChange={(e) => setManualDateHeardBack(e.target.value)}
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">How did they respond? (optional)</label>
                            <input
                              type="text"
                              value={manualResponseChannel}
                              onChange={(e) => setManualResponseChannel(e.target.value)}
                              placeholder="e.g. Email, recruiter call"
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" disabled={submittingRealtime} className="px-2 py-1 rounded bg-white text-black text-sm disabled:opacity-50">
                              {submittingRealtime ? 'Adding…' : 'Add timeline'}
                            </button>
                            <button type="button" onClick={() => setShowRealtimeManualForm(false)} className="px-2 py-1 rounded border border-white/20 text-zinc-400 text-sm">
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Employee view: anonymous ratings + feedback; LinkedIn verification; choice: public vs aggregate-only */}
            {viewAsPerspective === 'employee' && (
              <div className="p-4 sm:p-6 border-b border-white/10 space-y-6">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">For employees</h3>
                <p className="text-zinc-500 text-sm">
                  Share ratings and feedback with complete anonymity. You’ll verify via LinkedIn (same process as other sections, to be automated) so we know you worked here—then you choose: <strong>post your feedback publicly</strong> or <strong>add it only to aggregated data and Overall feedback</strong> (never posted; used for charts and anonymized snippets). You’re never forced to post publicly.
                </p>

                {loadingEmployeeFeedback ? (
                  <p className="text-zinc-500 text-sm">Loading…</p>
                ) : (
                  <>
                    {/* Aggregate stats from all approved feedback (public + aggregate_only) */}
                    {employeeFeedbackData?.aggregateStats && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-300 mb-2">Employee ratings (from verified feedback)</h4>
                        {employeeBarData.length > 0 && (
                          <div className="w-full h-[200px] mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={employeeBarData} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                <YAxis domain={[0, 5]} tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: 'rgb(24 24 27)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                                  labelStyle={{ color: '#e4e4e7' }}
                                  formatter={(value: number | undefined) => [value ?? 0, 'Avg rating']}
                                />
                                <Bar dataKey="value" fill="rgba(59, 130, 246, 0.8)" radius={[4, 4, 0, 0]} name="Avg rating" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { key: 'culture', label: 'Culture', value: employeeFeedbackData.aggregateStats.avg_culture },
                            { key: 'management', label: 'Management', value: employeeFeedbackData.aggregateStats.avg_management },
                            { key: 'work_life', label: 'Work-life', value: employeeFeedbackData.aggregateStats.avg_work_life },
                            { key: 'compensation', label: 'Compensation', value: employeeFeedbackData.aggregateStats.avg_compensation },
                          ].map(({ key, label, value }) => (
                            <div key={key} className="rounded-lg border border-white/10 bg-black/30 p-2 text-center">
                              <div className="text-lg font-semibold text-white">{value}</div>
                              <div className="text-xs text-zinc-500">{label}</div>
                            </div>
                          ))}
                        </div>
                        <p className="text-zinc-500 text-xs mt-1">Based on {employeeFeedbackData.aggregateStats.response_count} verified response{employeeFeedbackData.aggregateStats.response_count !== 1 ? 's' : ''} (1–5 scale).</p>
                      </div>
                    )}

                    {/* Overall feedback: anonymized snippets from aggregate_only submissions */}
                    {employeeFeedbackData && (employeeFeedbackData.overallFeedbackSnippets.length > 0 || employeeFeedbackData.aggregateStats) && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-300 mb-2">Overall feedback</h4>
                        <p className="text-zinc-500 text-sm mb-2">
                          Anonymous feedback from employees who chose to contribute to aggregates only (not posted publicly).
                        </p>
                        {employeeFeedbackData.overallFeedbackSnippets.length === 0 ? (
                          <p className="text-zinc-500 text-sm">No written feedback yet—only ratings above.</p>
                        ) : (
                          <ul className="space-y-2">
                            {employeeFeedbackData.overallFeedbackSnippets.map((snippet, i) => (
                              <li key={i} className="border-l-2 border-white/10 pl-3 py-1 text-sm text-zinc-300 italic">
                                &ldquo;{snippet}&rdquo;
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Public feedback: only approved + visibility=public */}
                    {employeeFeedbackData && employeeFeedbackData.publicFeedback.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-300 mb-2">Public feedback</h4>
                        <p className="text-zinc-500 text-sm mb-2">From employees who chose to post publicly (verified via LinkedIn).</p>
                        <ul className="space-y-2">
                          {employeeFeedbackData.publicFeedback.map((f) => (
                            <li key={f.id} className="border-l-2 border-white/10 pl-3 py-1.5 text-sm">
                              <div className="flex flex-wrap gap-2 text-zinc-400 text-xs mb-0.5">
                                Culture {f.culture_rating} · Management {f.management_rating} · Work-life {f.work_life_rating} · Compensation {f.compensation_rating}
                              </div>
                              {f.feedback_text && <p className="text-zinc-300">{f.feedback_text}</p>}
                              <span className="text-zinc-500 text-xs">{new Date(f.created_at).toLocaleDateString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Salary comparison: company-posted ranges vs market (levels.fyi, etc.) */}
                    <div>
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">Salary comparison</h4>
                      <p className="text-zinc-500 text-sm mb-3">
                        If this company lists salary ranges on their careers page, we cross-reference them with aggregate market data from levels.fyi and other sources so you can see where your market value sits and whether it’s being met here.
                      </p>
                      {loadingSalaryRanges ? (
                        <p className="text-zinc-500 text-sm">Loading…</p>
                      ) : (
                        <>
                          {salaryRanges.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-zinc-500 mb-1.5">Company-posted ranges (e.g. from careers page)</p>
                              <ul className="space-y-1.5">
                                {salaryRanges.map((r) => (
                                  <li key={r.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                                    <span className="text-zinc-300 font-medium">{r.role_title}</span>
                                    <span className="text-zinc-400">
                                      {r.currency} {r.min_salary.toLocaleString()} – {r.max_salary.toLocaleString()}
                                    </span>
                                    <span className="text-zinc-500 text-xs">{r.source}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {!showSalaryRangeForm ? (
                            <button
                              type="button"
                              onClick={() => setShowSalaryRangeForm(true)}
                              className="text-sm text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 px-2 py-1 rounded mb-3"
                            >
                              + Add a range from their careers page
                            </button>
                          ) : (
                            <form onSubmit={handleSubmitSalaryRange} className="p-3 rounded-lg border border-white/10 bg-black/30 space-y-2 max-w-md mb-3">
                              {salaryRangeMessage && (
                                <p className={`text-sm ${salaryRangeMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                                  {salaryRangeMessage.text}
                                </p>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                  <label className="block text-xs text-zinc-400 mb-0.5">Role title *</label>
                                  <input
                                    value={salaryRole}
                                    onChange={(e) => setSalaryRole(e.target.value)}
                                    placeholder="e.g. Senior Software Engineer"
                                    className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-zinc-400 mb-0.5">Min salary *</label>
                                  <input
                                    type="text"
                                    value={salaryMin}
                                    onChange={(e) => setSalaryMin(e.target.value)}
                                    placeholder="e.g. 150000"
                                    className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-zinc-400 mb-0.5">Max salary *</label>
                                  <input
                                    type="text"
                                    value={salaryMax}
                                    onChange={(e) => setSalaryMax(e.target.value)}
                                    placeholder="e.g. 220000"
                                    className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-zinc-400 mb-0.5">Currency</label>
                                  <select
                                    value={salaryCurrency}
                                    onChange={(e) => setSalaryCurrency(e.target.value)}
                                    className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                                  >
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button type="submit" disabled={submittingSalaryRange} className="px-2 py-1 rounded bg-white text-black text-sm disabled:opacity-50">
                                  {submittingSalaryRange ? 'Adding…' : 'Add range'}
                                </button>
                                <button type="button" onClick={() => setShowSalaryRangeForm(false)} className="px-2 py-1 rounded border border-white/20 text-zinc-400 text-sm">
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}
                          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                            <p className="text-sm font-medium text-zinc-300 mb-1.5">Compare with market data</p>
                            <p className="text-zinc-500 text-sm mb-2">
                              We’ll integrate aggregate data from levels.fyi and other sources here. For now, check these sites to see where your market value sits:
                            </p>
                            <ul className="space-y-1.5 text-sm">
                              <li>
                                <a
                                  href={levelsFyiSlug ? `https://www.levels.fyi/companies/${levelsFyiSlug}` : 'https://www.levels.fyi/companies/'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-white underline hover:no-underline"
                                >
                                  {levelsFyiSlug ? `levels.fyi – ${selectedCompany}` : 'levels.fyi – company salaries'}
                                </a>
                              </li>
                              <li>
                                <a href="https://www.glassdoor.com/Salaries/index.htm" target="_blank" rel="noopener noreferrer" className="text-white underline hover:no-underline">
                                  Glassdoor – salary insights
                                </a>
                              </li>
                              <li>
                                <a href="https://www.levels.fyi/tools/salary-comparison" target="_blank" rel="noopener noreferrer" className="text-white underline hover:no-underline">
                                  levels.fyi – salary comparison tool
                                </a>
                              </li>
                            </ul>
                            <p className="text-zinc-500 text-xs mt-2">
                              Cross-reference company-posted ranges above with these sources to see if your compensation is in line with market.
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Submit form */}
                    {!showEmployeeFeedbackForm ? (
                      <button
                        type="button"
                        onClick={() => setShowEmployeeFeedbackForm(true)}
                        className="text-sm text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 px-2 py-1 rounded"
                      >
                        + Submit your feedback (anonymous; LinkedIn required for verification)
                      </button>
                    ) : (
                      <form onSubmit={handleSubmitEmployeeFeedback} className="p-3 rounded-lg border border-white/10 bg-black/30 space-y-3 max-w-lg">
                        {employeeFeedbackMessage && (
                          <p className={`text-sm ${employeeFeedbackMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                            {employeeFeedbackMessage.text}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500">All submissions are anonymous. We only use LinkedIn to verify you worked at this company (same process as other sections).</p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Culture', value: empCulture, set: setEmpCulture },
                            { label: 'Management', value: empManagement, set: setEmpManagement },
                            { label: 'Work-life', value: empWorkLife, set: setEmpWorkLife },
                            { label: 'Compensation', value: empCompensation, set: setEmpCompensation },
                          ].map(({ label, value, set }) => (
                            <div key={label}>
                              <label className="block text-xs text-zinc-400 mb-0.5">{label} (1–5)</label>
                              <select
                                value={value}
                                onChange={(e) => set(Number(e.target.value))}
                                className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                              >
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-0.5">Your feedback (optional)</label>
                          <textarea
                            value={empFeedbackText}
                            onChange={(e) => setEmpFeedbackText(e.target.value)}
                            rows={2}
                            placeholder="e.g. Great team; slow promotion process."
                            className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-0.5">LinkedIn profile URL * (we verify you worked here; same process as other sections)</label>
                          <input
                            type="url"
                            value={empLinkedIn}
                            onChange={(e) => setEmpLinkedIn(e.target.value)}
                            required
                            placeholder="https://www.linkedin.com/in/..."
                            className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">How should we use your feedback?</label>
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name="empVisibility"
                                checked={empVisibility === 'aggregate_only'}
                                onChange={() => setEmpVisibility('aggregate_only')}
                                className="rounded-full border-white/20 bg-black/50 text-white"
                              />
                              <span className="text-zinc-300">Add to aggregated data and Overall feedback only (anonymous; not posted publicly)</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name="empVisibility"
                                checked={empVisibility === 'public'}
                                onChange={() => setEmpVisibility('public')}
                                className="rounded-full border-white/20 bg-black/50 text-white"
                              />
                              <span className="text-zinc-300">Post my feedback publicly (still anonymous; ratings and text visible to everyone)</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={submittingEmployeeFeedback} className="px-2 py-1 rounded bg-white text-black text-sm disabled:opacity-50">
                            {submittingEmployeeFeedback ? 'Submitting…' : 'Submit'}
                          </button>
                          <button type="button" onClick={() => setShowEmployeeFeedbackForm(false)} className="px-2 py-1 rounded border border-white/20 text-zinc-400 text-sm">
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Ex-Employee view: LinkedIn-verified form; questions only ex-employees can answer */}
            {viewAsPerspective === 'ex_employee' && (
              <div className="p-4 sm:p-6 border-b border-white/10 space-y-6">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">For ex-employees</h3>
                <p className="text-zinc-500 text-sm">
                  Share information only ex-employees can provide: promotion timeline, leadership and benefits ratings (by year to protect anonymity), work-life balance, and scenarios like parental leave and whether your team was accommodating. All submissions are verified via LinkedIn (same process as other sections). This data helps shape how useful the site is for everyone.
                </p>

                {loadingExEmployee ? (
                  <p className="text-zinc-500 text-sm">Loading…</p>
                ) : (
                  <>
                    {/* Aggregate stats from approved ex-employee feedback */}
                    {exEmployeeData?.aggregateStats && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-zinc-300 mb-2">From verified ex-employees</h4>
                        {exEmployeeBarData.length > 0 && (
                          <div className="w-full h-[220px] mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={exEmployeeBarData} margin={{ top: 8, right: 8, left: 8, bottom: 40 }}>
                                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} angle={-12} textAnchor="end" />
                                <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: 'rgb(24 24 27)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                                  labelStyle={{ color: '#e4e4e7' }}
                                  formatter={(value, _name, props) => {
                                    const v = value ?? 0;
                                    const isPromotion = props.payload?.name?.includes('promotion');
                                    return [isPromotion ? `${v} yrs` : v, ''];
                                  }}
                                />
                                <Bar dataKey="value" fill="rgba(139, 92, 246, 0.8)" radius={[4, 4, 0, 0]} name="Value" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {exEmployeeData.aggregateStats.avg_years_to_promotion != null && (
                            <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-center">
                              <div className="text-lg font-semibold text-white">{exEmployeeData.aggregateStats.avg_years_to_promotion} yrs</div>
                              <div className="text-xs text-zinc-500">Avg. time to promotion</div>
                            </div>
                          )}
                          {exEmployeeData.aggregateStats.avg_leadership != null && (
                            <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-center">
                              <div className="text-lg font-semibold text-white">{exEmployeeData.aggregateStats.avg_leadership}/5</div>
                              <div className="text-xs text-zinc-500">Leadership (by year)</div>
                            </div>
                          )}
                          <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-center">
                            <div className="text-lg font-semibold text-white">{exEmployeeData.aggregateStats.avg_benefits}/5</div>
                            <div className="text-xs text-zinc-500">Benefits</div>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-center">
                            <div className="text-lg font-semibold text-white">{exEmployeeData.aggregateStats.avg_work_life}/5</div>
                            <div className="text-xs text-zinc-500">Work-life balance</div>
                          </div>
                        </div>
                        {exEmployeeData.aggregateStats.parental_leave.used_yes_count > 0 && (
                          <div className="text-sm text-zinc-400">
                            Parental leave: {exEmployeeData.aggregateStats.parental_leave.used_yes_count} used it; of those, team was accommodating: Yes {exEmployeeData.aggregateStats.parental_leave.accommodating_yes}, No {exEmployeeData.aggregateStats.parental_leave.accommodating_no}, Somewhat {exEmployeeData.aggregateStats.parental_leave.accommodating_somewhat}.
                          </div>
                        )}
                        <p className="text-zinc-500 text-xs">Based on {exEmployeeData.aggregateStats.response_count} verified response{exEmployeeData.aggregateStats.response_count !== 1 ? 's' : ''}.</p>
                      </div>
                    )}

                    {/* Anonymized feedback snippets */}
                    {exEmployeeData && exEmployeeData.overallFeedbackSnippets.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-300 mb-2">What ex-employees said</h4>
                        <ul className="space-y-2">
                          {exEmployeeData.overallFeedbackSnippets.map((snippet, i) => (
                            <li key={i} className="border-l-2 border-white/10 pl-3 py-1 text-sm text-zinc-300 italic">
                              &ldquo;{snippet}&rdquo;
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Submit form */}
                    {!showExEmployeeForm ? (
                      <button
                        type="button"
                        onClick={() => setShowExEmployeeForm(true)}
                        className="text-sm text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 px-2 py-1 rounded"
                      >
                        + Share your experience (LinkedIn required for verification)
                      </button>
                    ) : (
                      <form onSubmit={handleSubmitExEmployeeFeedback} className="p-3 rounded-lg border border-white/10 bg-black/30 space-y-3 max-w-lg">
                        {exEmployeeMessage && (
                          <p className={`text-sm ${exEmployeeMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                            {exEmployeeMessage.text}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500">We verify via LinkedIn (same process as other sections) before publishing. All answers optional except LinkedIn.</p>

                        <div>
                          <label className="block text-xs text-zinc-400 mb-0.5">How long did it take you to get promoted? (years, or &quot;never&quot;)</label>
                          <input
                            type="text"
                            value={exYearsToPromo}
                            onChange={(e) => setExYearsToPromo(e.target.value)}
                            placeholder="e.g. 2.5 or never"
                            className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">Leadership rating (1–5, optional)</label>
                            <select
                              value={exLeadershipRating}
                              onChange={(e) => setExLeadershipRating(e.target.value)}
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                            >
                              <option value="">—</option>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">Year (optional, for anonymity)</label>
                            <input
                              type="text"
                              value={exLeadershipYear}
                              onChange={(e) => setExLeadershipYear(e.target.value)}
                              placeholder="e.g. 2022"
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">Benefits (1–5) *</label>
                            <select
                              value={exBenefitsRating}
                              onChange={(e) => setExBenefitsRating(Number(e.target.value))}
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">Work-life balance (1–5) *</label>
                            <select
                              value={exWorkLifeRating}
                              onChange={(e) => setExWorkLifeRating(Number(e.target.value))}
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-0.5">Did you use parental leave?</label>
                          <select
                            value={exUsedParentalLeave}
                            onChange={(e) => setExUsedParentalLeave((e.target.value || '') as ParentalLeaveUsed | '')}
                            className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                          >
                            <option value="">—</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="na">N/A</option>
                          </select>
                        </div>
                        {(exUsedParentalLeave === 'yes') && (
                          <div>
                            <label className="block text-xs text-zinc-400 mb-0.5">Was your team accommodating?</label>
                            <select
                              value={exParentalLeaveAccommodating}
                              onChange={(e) => setExParentalLeaveAccommodating((e.target.value || '') as ParentalLeaveAccommodating | '')}
                              className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                            >
                              <option value="">—</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                              <option value="somewhat">Somewhat</option>
                              <option value="na">N/A</option>
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs text-zinc-400 mb-0.5">Anything else? (optional)</label>
                          <textarea
                            value={exFeedbackText}
                            onChange={(e) => setExFeedbackText(e.target.value)}
                            rows={2}
                            placeholder="e.g. Culture changed after layoffs in 2023."
                            className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-0.5">LinkedIn profile URL * (we verify ex-employee status)</label>
                          <input
                            type="url"
                            value={exLinkedIn}
                            onChange={(e) => setExLinkedIn(e.target.value)}
                            required
                            placeholder="https://www.linkedin.com/in/..."
                            className="w-full px-2 py-1.5 rounded border border-white/10 bg-black/50 text-white text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={submittingExEmployee} className="px-2 py-1 rounded bg-white text-black text-sm disabled:opacity-50">
                            {submittingExEmployee ? 'Submitting…' : 'Submit'}
                          </button>
                          <button type="button" onClick={() => setShowExEmployeeForm(false)} className="px-2 py-1 rounded border border-white/20 text-zinc-400 text-sm">
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Reviews for selected perspective */}
            <div className="p-4 sm:p-6">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
                {viewAsPerspective === 'overview' ? 'All reviews' : `Reviews from ${VIEW_AS_LABELS[viewAsPerspective]}`}
              </h3>
              {loadingReviews ? (
                <p className="text-zinc-500 text-sm">Loading reviews…</p>
              ) : (
                (() => {
                  const filtered =
                    viewAsPerspective === 'overview'
                      ? reviews
                      : reviews.filter((r) => r.reviewer_type === viewAsPerspective);
                  if (filtered.length === 0) {
                    return (
                      <p className="text-zinc-500 text-sm">
                        {viewAsPerspective === 'overview'
                          ? 'No reviews yet. Be the first to add one.'
                          : 'No reviews yet from this perspective. Be the first to add one.'}
                      </p>
                    );
                  }
                  return (
                    <ul className="space-y-4">
                      {filtered.map((r) => (
                        <li key={r.id} className="border-l-2 border-white/20 pl-3 py-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <GhostStars rating={r.ghost_job_rating} />
                            {viewAsPerspective === 'overview' && (
                              <span className="text-zinc-500 text-xs">{REVIEWER_LABELS[r.reviewer_type]}</span>
                            )}
                            <span className="text-zinc-500 text-xs">
                              {new Date(r.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {r.review_text && (
                            <p className="text-zinc-300 text-sm mt-1">{r.review_text}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  );
                })()
              )}
            </div>

            {/* Suggest data for this view — available in all views */}
            <div className="p-4 sm:p-6 border-t border-white/10">
              <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Suggest data for this view
              </h4>
              <p className="text-zinc-500 text-sm mb-2">
                What other data or info would be helpful for the <strong>{VIEW_AS_LABELS[viewAsPerspective]}</strong> view? We use suggestions to prioritize what to add.
              </p>
              <form onSubmit={handleSubmitViewSuggestion} className="flex flex-col sm:flex-row gap-2 max-w-xl">
                <textarea
                  value={viewSuggestionText}
                  onChange={(e) => setViewSuggestionText(e.target.value)}
                  placeholder="e.g. Add average time-to-fill by role, or link to benefits summary..."
                  rows={2}
                  className="flex-1 px-3 py-2 rounded-md border border-white/10 bg-black/50 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                />
                <button
                  type="submit"
                  disabled={submittingViewSuggestion || !viewSuggestionText.trim()}
                  className="shrink-0 px-3 py-2 rounded-md border border-white/20 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {submittingViewSuggestion ? 'Sending…' : 'Submit suggestion'}
                </button>
              </form>
              {viewSuggestionMessage && (
                <p className={`mt-2 text-sm ${viewSuggestionMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                  {viewSuggestionMessage.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add review form */}
      {(showAddForm || selectedCompany) && (
        <div id="add-review" className="rounded-lg border border-white/10 bg-zinc-900/50 p-4 scroll-mt-6">
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-3">Add a company review</h2>
          {message && (
            <div
              className={`mb-3 p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-white/10 text-green-300 border border-green-500/30'
                  : 'bg-red-950/50 text-red-300 border border-red-500/30'
              }`}
            >
              {message.text}
            </div>
          )}
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Company name *</label>
              <input
                type="text"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                required
                placeholder="e.g. Acme Corp"
                className="w-full px-3 py-2.5 rounded-md border border-white/10 bg-black/50 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">I am a</label>
              <select
                value={formReviewerType}
                onChange={(e) => setFormReviewerType(e.target.value as ReviewerType)}
                className="w-full px-3 py-2.5 rounded-md border border-white/10 bg-black/50 text-white focus:outline-none focus:ring-1 focus:ring-white/30"
              >
                <option value="prospective_interviewee">Prospective Interviewee (applicant)</option>
                <option value="employee">Employee</option>
                <option value="ex_employee">Ex-Employee</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Ghost job rating (1–5)</label>
              <p className="text-xs text-zinc-500 mb-1">5 = strongly agree they post jobs that stay up but are never filled</p>
              <select
                value={formRating}
                onChange={(e) => setFormRating(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-md border border-white/10 bg-black/50 text-white focus:outline-none focus:ring-1 focus:ring-white/30"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} — {n === 1 ? 'Rarely' : n === 5 ? 'Very often' : 'Sometimes'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Your experience (optional)</label>
              <textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                rows={3}
                placeholder="e.g. Applied twice, never heard back; posting stayed active for months."
                className="w-full px-3 py-2.5 rounded-md border border-white/10 bg-black/50 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-md bg-white text-black font-medium text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? 'Submitting…' : 'Submit review'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
