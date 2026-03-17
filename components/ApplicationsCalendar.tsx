'use client';

import { useMemo, useState } from 'react';
import type { Job } from '@/lib/types';

interface ApplicationsCalendarProps {
  jobs: Job[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export function ApplicationsCalendar({
  jobs,
  selectedDate,
  onSelectDate,
}: ApplicationsCalendarProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const applicationsByDate = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const job of jobs) {
      const key = job.date_applied; // already YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(job);
    }
    return map;
  }, [jobs]);

  const monthLabel = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }, [currentYear, currentMonth]);

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startingWeekday = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;

  const GOAL_PER_WEEKDAY = 13;

  function getDayOfWeek(dateKey: string): number {
    return new Date(dateKey + 'T12:00:00').getDay();
  }

  function isWeekday(dateKey: string): boolean {
    const d = getDayOfWeek(dateKey);
    return d >= 1 && d <= 5;
  }

  function isWeekend(dateKey: string): boolean {
    const d = getDayOfWeek(dateKey);
    return d === 0 || d === 6;
  }

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="px-2.5 py-1 text-xs rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-medium transition-colors"
        >
          ◀
        </button>
        <div className="text-sm font-semibold text-zinc-100">{monthLabel}</div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="px-2.5 py-1 text-xs rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-medium transition-colors"
        >
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-emerald-400 font-semibold">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(
            2,
            '0',
          )}`;
          const count = applicationsByDate[dateKey]?.length ?? 0;
          const isSelected = selectedDate === dateKey;
          const isToday = dateKey === todayKey;
          const goalReached = isWeekday(dateKey) && count >= GOAL_PER_WEEKDAY;
          const boost = isWeekend(dateKey) && count >= 1;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              title={`View applications for ${new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}`}
              style={day === 1 ? { gridColumnStart: startingWeekday + 1 } : undefined}
              className={[
                'h-16 rounded-lg border text-left px-1 py-1 flex flex-col justify-between min-h-[4rem] transition-colors',
                'border-zinc-600 bg-zinc-800/50 hover:bg-zinc-700',
                isSelected ? 'ring-2 ring-emerald-400 bg-emerald-500/20' : '',
                count > 0 ? 'text-zinc-100' : 'text-zinc-400',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{day}</span>
                {isToday && <span className="text-[10px] text-emerald-400 font-medium">Today</span>}
              </div>
              {count > 0 && (
                <div className="text-[10px] mt-0.5 bg-emerald-200 rounded px-1 py-0.5 text-emerald-800">
                  {count} {count === 1 ? 'application' : 'applications'}
                </div>
              )}
              {goalReached && (
                <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-800 bg-emerald-300/80 rounded px-1 py-0.5" title="Goal reached (13+ applications)">
                  <span aria-hidden>✓</span>
                  <span>Goal Reached</span>
                </div>
              )}
              {boost && !goalReached && (
                <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-800 bg-emerald-200 rounded px-1 py-0.5" title="Weekend applications – going above and beyond">
                  <span aria-hidden>🙌</span>
                  <span>Boost</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

