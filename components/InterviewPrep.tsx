'use client';

import { useEffect, useState, useCallback } from 'react';
import { Job } from '@/lib/types';
import type {
  InterviewPrep,
  InterviewPrepChecklistItem,
  InterviewPrepLeetcodeLink,
} from '@/lib/types';
import { extractConceptsFromJobPosting } from '@/lib/extract-concepts';

function demoHeaders(isDemo: boolean): HeadersInit {
  return isDemo ? { 'x-demo-mode': 'true' } : {};
}

interface InterviewPrepProps {
  jobs: Job[];
  isDemo?: boolean;
}

export function InterviewPrep({ jobs, isDemo = false }: InterviewPrepProps) {
  const preppingJobs = jobs.filter(
    (j) => j.status === 'phone_screening' || j.status === 'interviewing'
  );

  if (preppingJobs.length === 0) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-8 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-100 mb-2">Interview Prep</h3>
        <p className="text-zinc-300 text-sm">
          Update a job to <strong>Phone Screening</strong> or <strong>Interviewing</strong> to see it here.
          Use this as your one-stop shop for role descriptions, study topics, LeetCode links, and a prep checklist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-300">
        Jobs in <strong>Phone Screening</strong> or <strong>Interviewing</strong> appear here. Add role descriptions, study topics, LeetCode links, and mark off your checklist.
      </p>
      {preppingJobs.map((job) => (
        <InterviewPrepCard key={job.id} job={job} isDemo={isDemo} />
      ))}
    </div>
  );
}

function InterviewPrepCard({ job, isDemo }: { job: Job; isDemo: boolean }) {
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPrep = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/interview-prep/${job.id}`, {
        headers: demoHeaders(isDemo),
      });
      const data = await res.json();
      if (res.ok) {
        setPrep({
          job_id: job.id,
          role_description: data.role_description ?? '',
          study_topics: Array.isArray(data.study_topics) ? data.study_topics : [],
          leetcode_links: Array.isArray(data.leetcode_links) ? data.leetcode_links : [],
          checklist: Array.isArray(data.checklist) ? data.checklist : [],
          updated_at: data.updated_at ?? new Date().toISOString(),
        });
      } else {
        setPrep({
          job_id: job.id,
          role_description: '',
          study_topics: [],
          leetcode_links: [],
          checklist: [],
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      setPrep({
        job_id: job.id,
        role_description: '',
        study_topics: [],
        leetcode_links: [],
        checklist: [],
        updated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [job.id, isDemo]);

  useEffect(() => {
    fetchPrep();
  }, [fetchPrep]);

  const savePrep = async () => {
    if (!prep) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/interview-prep/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...demoHeaders(isDemo) },
        body: JSON.stringify({
          role_description: prep.role_description,
          study_topics: prep.study_topics,
          leetcode_links: prep.leetcode_links,
          checklist: prep.checklist,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: data.error || 'Failed to save' });
        return;
      }
      if (isDemo) {
        setSaveMsg({ type: 'error', text: 'Demo mode: changes are not saved.' });
      } else {
        setSaveMsg({ type: 'success', text: 'Saved!' });
        setTimeout(() => setSaveMsg(null), 2000);
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const updatePrep = (updates: Partial<InterviewPrep>) => {
    if (prep) setPrep({ ...prep, ...updates });
  };

  const addStudyTopic = () => {
    if (!prep) return;
    const topic = prompt('Topic to study (e.g. System Design, Graph algorithms):');
    if (topic?.trim()) {
      updatePrep({ study_topics: [...prep.study_topics, topic.trim()] });
    }
  };

  const removeStudyTopic = (i: number) => {
    if (!prep) return;
    updatePrep({ study_topics: prep.study_topics.filter((_, idx) => idx !== i) });
  };

  const addLeetcodeLink = () => {
    if (!prep) return;
    const url = prompt('LeetCode problem URL (e.g. https://leetcode.com/problems/two-sum/):');
    const label = prompt('Label (e.g. Two Sum):') || url || 'Link';
    if (url?.trim()) {
      updatePrep({
        leetcode_links: [...prep.leetcode_links, { url: url.trim(), label: label.trim() }],
      });
    }
  };

  const removeLeetcodeLink = (i: number) => {
    if (!prep) return;
    updatePrep({ leetcode_links: prep.leetcode_links.filter((_, idx) => idx !== i) });
  };

  const addChecklistItem = () => {
    if (!prep) return;
    const label = prompt('Checklist item (e.g. Review System Design):');
    if (label?.trim()) {
      const id = crypto.randomUUID?.() || `item-${Date.now()}`;
      updatePrep({
        checklist: [...prep.checklist, { id, label: label.trim(), done: false }],
      });
    }
  };

  const toggleChecklistItem = (id: string) => {
    if (!prep) return;
    updatePrep({
      checklist: prep.checklist.map((c) =>
        c.id === id ? { ...c, done: !c.done } : c
      ),
    });
  };

  const removeChecklistItem = (id: string) => {
    if (!prep) return;
    updatePrep({ checklist: prep.checklist.filter((c) => c.id !== id) });
  };

  const extractConcepts = () => {
    if (!prep || !prep.role_description.trim()) {
      setSaveMsg({ type: 'error', text: 'Paste the job posting in Role description first, then click Extract.' });
      setTimeout(() => setSaveMsg(null), 3000);
      return;
    }
    const concepts = extractConceptsFromJobPosting(prep.role_description);
    const existingLabels = new Set(prep.checklist.map((c) => c.label.toLowerCase().trim()));
    const newItems: InterviewPrepChecklistItem[] = concepts
      .filter((label) => !existingLabels.has(label.toLowerCase().trim()))
      .map((label) => ({
        id: crypto.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        label,
        done: false,
      }));
    if (newItems.length === 0) {
      setSaveMsg({ type: 'success', text: 'No new concepts found—everything extracted is already in your list.' });
      setTimeout(() => setSaveMsg(null), 3000);
      return;
    }
    updatePrep({ checklist: [...prep.checklist, ...newItems] });
    setSaveMsg({ type: 'success', text: `Added ${newItems.length} concept(s) to Concepts to study.` });
    setTimeout(() => setSaveMsg(null), 3000);
  };

  if (loading) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-sm">
        <p className="text-zinc-300 text-sm">Loading prep for {job.company}…</p>
      </div>
    );
  }

  if (!prep) return null;

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">
            {job.position} at {job.company}
          </h3>
          <p className="text-zinc-300 text-sm">
            Status: <span className="font-medium">{job.status.replace('_', ' ')}</span>
            {job.url && (
              <>
                {' · '}
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 hover:text-emerald-800 underline"
                >
                  Job posting
                </a>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={savePrep}
          disabled={saving}
          className="shrink-0 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white text-sm font-medium"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {saveMsg && (
        <div
          className={`p-2 rounded-lg text-sm ${
            saveMsg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {saveMsg.text}
        </div>
      )}

      {/* Role description */}
      <div>
        <label className="block text-sm font-medium text-emerald-800 mb-1">Role description</label>
        <p className="text-xs text-zinc-300 mb-2">
          Paste the full job posting here, then click &ldquo;Extract concepts&rdquo; to generate a study list from tools, languages, and concepts mentioned.
        </p>
        <textarea
          value={prep.role_description}
          onChange={(e) => updatePrep({ role_description: e.target.value })}
          rows={6}
          placeholder="Paste the entire job posting here..."
          className="w-full px-3 py-2 border border-emerald-300 rounded-lg bg-zinc-800 text-zinc-100 placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
        />
        <button
          type="button"
          onClick={extractConcepts}
          className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
        >
          Extract concepts from job posting
        </button>
      </div>

      {/* Study guide */}
      <div>
        <label className="block text-sm font-medium text-emerald-800 mb-1">Study guide</label>
        <p className="text-xs text-zinc-300 mb-2">Topics to tackle before the interview</p>
        <ul className="space-y-1 mb-2">
          {prep.study_topics.map((t, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-emerald-800">• {t}</span>
              <button
                type="button"
                onClick={() => removeStudyTopic(i)}
                className="text-red-600 hover:text-red-800 text-xs"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addStudyTopic}
          className="text-sm text-zinc-300 hover:text-emerald-800 border border-emerald-300 rounded px-2 py-1"
        >
          + Add topic
        </button>
      </div>

      {/* LeetCode links */}
      <div>
        <label className="block text-sm font-medium text-emerald-800 mb-1">LeetCode (company-tagged)</label>
        <p className="text-xs text-zinc-300 mb-2">
          Problems tagged for {job.company} on LeetCode
        </p>
        <ul className="space-y-1 mb-2">
          {prep.leetcode_links.map((l, i) => (
            <li key={i}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-emerald-800 underline"
              >
                {l.label}
              </a>
              {' '}
              <button
                type="button"
                onClick={() => removeLeetcodeLink(i)}
                className="text-red-600 hover:text-red-800 text-xs"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addLeetcodeLink}
          className="text-sm text-zinc-300 hover:text-emerald-800 border border-emerald-300 rounded px-2 py-1"
        >
          + Add LeetCode link
        </button>
      </div>

      {/* Checklist: Concepts to study (unchecked) + Current Progress (checked) */}
      <div>
        <label className="block text-sm font-medium text-emerald-800 mb-1">Study checklist</label>
        <p className="text-xs text-zinc-300 mb-2">
          Check off items as you study; they move to <strong>Current Progress</strong> below.
        </p>

        {/* Concepts to study — unchecked */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-emerald-800 mb-2">Concepts to study</h4>
          {prep.checklist.filter((c) => !c.done).length === 0 ? (
            <p className="text-sm text-emerald-500 italic">No items yet. Paste the job posting above and click &ldquo;Extract concepts&rdquo;, or add your own below.</p>
          ) : (
            <ul className="space-y-2">
              {prep.checklist.filter((c) => !c.done).map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="rounded border-emerald-400 text-zinc-300 focus:ring-emerald-400"
                  />
                  <span className="text-emerald-800">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(item.id)}
                    className="text-red-600 hover:text-red-800 text-xs ml-auto"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={addChecklistItem}
            className="text-sm text-zinc-300 hover:text-emerald-800 border border-emerald-300 rounded px-2 py-1 mt-2"
          >
            + Add checklist item
          </button>
        </div>

        {/* Current Progress — checked */}
        <div>
          <h4 className="text-sm font-medium text-emerald-800 mb-2">Current Progress</h4>
          {prep.checklist.filter((c) => c.done).length === 0 ? (
            <p className="text-sm text-emerald-500 italic">Checked items will appear here.</p>
          ) : (
            <ul className="space-y-2">
              {prep.checklist.filter((c) => c.done).map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => toggleChecklistItem(item.id)}
                    className="rounded border-emerald-400 text-zinc-300 focus:ring-emerald-400"
                  />
                  <span className="text-emerald-500 line-through">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(item.id)}
                    className="text-red-600 hover:text-red-800 text-xs ml-auto"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
