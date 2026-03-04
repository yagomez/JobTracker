'use client';

import { useState } from 'react';
import { Job } from '@/lib/types';

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
}

export function JobForm({ onSubmit, initialData, isLoading = false, isDemo = false }: JobFormProps) {
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
    </form>
  );
}
