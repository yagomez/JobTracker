'use client';

import { useState, useEffect } from 'react';
import { Job, NoApplyCompany } from '@/lib/types';

/** Today's date in YYYY-MM-DD using the user's local timezone (avoids UTC off-by-one). */
function getTodayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface JobFormProps {
  onSubmit: (data: any) => Promise<void>;
  initialData?: Job;
  isLoading?: boolean;
  isDemo?: boolean;
  onNoApplyAdded?: () => void;
}

export function JobForm({ onSubmit, initialData, isLoading = false, isDemo = false, onNoApplyAdded }: JobFormProps) {
  const [formData, setFormData] = useState({
    company: initialData?.company || '',
    position: initialData?.position || '',
    url: initialData?.url || '',
    date_applied: initialData?.date_applied || getTodayLocal(),
    status: initialData?.status || 'applied',
    notes: initialData?.notes || '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedResume, setUploadedResume] = useState<string | null>(initialData?.resume_path || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [noApplyMatch, setNoApplyMatch] = useState<NoApplyCompany | null>(null);
  const [showNoApplyForm, setShowNoApplyForm] = useState(false);
  const [noApplyFormData, setNoApplyFormData] = useState({ company_name: '', reason: '', notes: '' });
  const [noApplySubmitting, setNoApplySubmitting] = useState(false);
  const [noApplyMessage, setNoApplyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Debounced check: when company name changes, see if it's on the no-apply list
  useEffect(() => {
    const company = formData.company.trim();
    if (company.length < 2) {
      setNoApplyMatch(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const url = `/api/no-apply?company=${encodeURIComponent(company)}`;
        const res = await fetch(url, {
          headers: isDemo ? { 'x-demo-mode': 'true' } : undefined,
        });
        const data = await res.json();
        setNoApplyMatch(data.match ?? null);
      } catch {
        setNoApplyMatch(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [formData.company, isDemo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleResumeUpload = async (jobId: number) => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('resume', selectedFile);
      formDataObj.append('jobId', jobId.toString());

      const response = await fetch('/api/jobs/upload-resume', {
        method: 'POST',
        headers: isDemo ? { 'x-demo-mode': 'true' } : undefined,
        body: formDataObj,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload resume');
      }

      const data = await response.json();
      setUploadedResume(data.resume_path);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('resume-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload resume');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNoApplyFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNoApplyFormData(prev => ({ ...prev, [name]: value }));
    setNoApplyMessage(null);
  };

  const handleAddNoApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoApplySubmitting(true);
    setNoApplyMessage(null);
    try {
      const res = await fetch('/api/no-apply', {
        method: 'POST',
        headers: isDemo
          ? { 'Content-Type': 'application/json', 'x-demo-mode': 'true' }
          : { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: noApplyFormData.company_name.trim(),
          reason: noApplyFormData.reason.trim(),
          notes: noApplyFormData.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNoApplyMessage({ type: 'error', text: data.error || 'Failed to add to list.' });
        return;
      }
      setNoApplyMessage({ type: 'success', text: `"${data.company_name}" added to your blacklist. It will show when you type this company in the job form.` });
      setNoApplyFormData({ company_name: '', reason: '', notes: '' });
      setShowNoApplyForm(false);
      onNoApplyAdded?.();
    } catch {
      setNoApplyMessage({ type: 'error', text: 'Failed to add to blacklist.' });
    } finally {
      setNoApplySubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);

      // For new jobs, clear the form after a successful submit
      if (!initialData) {
        setFormData({
          company: '',
          position: '',
          url: '',
          date_applied: getTodayLocal(),
          status: 'applied',
          notes: '',
        });
        setSelectedFile(null);
        setUploadedResume(null);
        const fileInput = document.getElementById('resume-input') as HTMLInputElement | null;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      // Let the parent handle any error alerts/logging
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-olive-200 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-olive-800">Company *</label>
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            required
            className="mt-1 w-full px-3 py-2 border border-olive-300 rounded-lg bg-white text-olive-900 placeholder-olive-400 focus:outline-none focus:ring-2 focus:ring-olive-400 focus:border-olive-400"
            placeholder="e.g., Google"
          />
          {noApplyMatch && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-sm">
              <strong>Blacklist:</strong> This company is on your blacklist. Reason: {noApplyMatch.reason}
              {noApplyMatch.notes && (
                <p className="mt-2 text-amber-800">Details: {noApplyMatch.notes}</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-olive-800">Position *</label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleChange}
            required
            className="mt-1 w-full px-3 py-2 border border-olive-300 rounded-lg bg-white text-olive-900 placeholder-olive-400 focus:outline-none focus:ring-2 focus:ring-olive-400 focus:border-olive-400"
            placeholder="e.g., Software Engineer"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-olive-800">Job URL</label>
          <input
            type="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-olive-300 rounded-lg bg-white text-olive-900 placeholder-olive-400 focus:outline-none focus:ring-2 focus:ring-olive-400 focus:border-olive-400"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-olive-800">Date Applied *</label>
          <input
            type="date"
            name="date_applied"
            value={formData.date_applied}
            onChange={handleChange}
            required
            className="mt-1 w-full px-3 py-2 border border-olive-300 rounded-lg bg-white text-olive-900 focus:outline-none focus:ring-2 focus:ring-olive-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-olive-800">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-olive-300 rounded-lg bg-white text-olive-900 focus:outline-none focus:ring-2 focus:ring-olive-400"
          >
            <option value="applied">Applied</option>
            <option value="interviewing">Interviewing</option>
            <option value="rejected">Rejected</option>
            <option value="offered">Offered</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-olive-800">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="mt-1 w-full px-3 py-2 border border-olive-300 rounded-lg bg-white text-olive-900 placeholder-olive-400 focus:outline-none focus:ring-2 focus:ring-olive-400"
            placeholder="Any additional notes..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-olive-800">Resume</label>
          <p className="text-sm text-olive-600 mb-2">Upload the resume version used for this application</p>
          
          {uploadError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
              {uploadError}
            </div>
          )}

          {uploadedResume ? (
            <div className="mb-3 p-3 bg-olive-50 border border-olive-200 rounded-lg flex items-center justify-between">
              <span className="text-sm text-olive-700">✓ Resume uploaded</span>
              <a
                href={uploadedResume}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-olive-600 hover:text-olive-800 font-medium underline"
              >
                Download
              </a>
            </div>
          ) : null}

          <div className="flex gap-2">
            <input
              id="resume-input"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="flex-1 px-3 py-2 border border-olive-300 rounded-lg bg-white text-olive-900 focus:outline-none focus:ring-2 focus:ring-olive-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-olive-600 file:text-white file:text-sm"
            />
            {selectedFile && (
              <button
                type="button"
                onClick={() => handleResumeUpload(initialData?.id || 0)}
                disabled={isUploading || !initialData?.id}
                className="px-4 py-2 bg-olive-600 hover:bg-olive-500 disabled:bg-olive-300 text-white rounded-lg font-medium text-sm transition-colors"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            )}
          </div>
          <p className="text-xs text-olive-500 mt-1">
            {selectedFile ? `Selected: ${selectedFile.name}` : 'PDF, DOC, or DOCX files only'}
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-olive-600 hover:bg-olive-500 disabled:bg-olive-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
      >
        {isLoading ? 'Saving...' : initialData ? 'Update Job' : 'Add Job'}
      </button>

      <div className="border-t border-olive-200 pt-4 mt-4">
        <button
          type="button"
          onClick={() => { setShowNoApplyForm(prev => !prev); setNoApplyMessage(null); }}
          className="w-full py-2 text-sm text-olive-600 hover:text-olive-800 hover:bg-olive-50 rounded-lg transition-colors"
        >
          Blacklist an Employer
        </button>

        {showNoApplyForm && (
          <form onSubmit={handleAddNoApply} className="mt-4 p-4 bg-olive-50 rounded-xl border border-olive-200 space-y-3">
            <h3 className="text-sm font-semibold text-olive-800">Blacklist an Employer</h3>
            <div>
              <label className="block text-xs font-medium text-olive-700">Company name *</label>
              <input
                type="text"
                name="company_name"
                value={noApplyFormData.company_name}
                onChange={handleNoApplyFormChange}
                required
                className="mt-1 w-full px-3 py-2 border border-olive-300 rounded-lg bg-white text-olive-900 text-sm"
                placeholder="e.g., Acme Inc"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-olive-700">Reason for blacklisting *</label>
              <input
                type="text"
                name="reason"
                value={noApplyFormData.reason}
                onChange={handleNoApplyFormChange}
                required
                className="mt-1 w-full px-3 py-2 border border-olive-300 rounded-lg bg-white text-olive-900 text-sm"
                placeholder="e.g., Sent rejection to my current work email"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-olive-700">Notes (what they did)</label>
              <textarea
                name="notes"
                value={noApplyFormData.notes}
                onChange={handleNoApplyFormChange}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-olive-300 rounded-lg bg-white text-olive-900 text-sm"
                placeholder="Detail exactly what happened..."
              />
            </div>
            {noApplyMessage && (
              <div className={`p-2 rounded-lg text-sm ${noApplyMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {noApplyMessage.text}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={noApplySubmitting}
                className="px-4 py-2 bg-olive-600 hover:bg-olive-500 disabled:bg-olive-300 text-white rounded-lg font-medium text-sm"
              >
                {noApplySubmitting ? 'Adding...' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNoApplyForm(false); setNoApplyMessage(null); setNoApplyFormData({ company_name: '', reason: '', notes: '' }); }}
                className="px-4 py-2 border border-olive-300 text-olive-700 rounded-lg text-sm hover:bg-olive-100"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </form>
  );
}
