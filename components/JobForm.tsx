'use client';

import { useState } from 'react';
import { Job } from '@/lib/types';

interface JobFormProps {
  onSubmit: (data: any) => Promise<void>;
  initialData?: Job;
  isLoading?: boolean;
}

export function JobForm({ onSubmit, initialData, isLoading = false }: JobFormProps) {
  const [formData, setFormData] = useState({
    company: initialData?.company || '',
    position: initialData?.position || '',
    url: initialData?.url || '',
    date_applied: initialData?.date_applied || new Date().toISOString().split('T')[0],
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
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Company *</label>
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            placeholder="e.g., Google"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Position *</label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleChange}
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            placeholder="e.g., Software Engineer"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Job URL</label>
          <input
            type="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date Applied *</label>
          <input
            type="date"
            name="date_applied"
            value={formData.date_applied}
            onChange={handleChange}
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
          >
            <option value="applied">Applied</option>
            <option value="interviewing">Interviewing</option>
            <option value="rejected">Rejected</option>
            <option value="offered">Offered</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            placeholder="Any additional notes..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Resume</label>
          <p className="text-sm text-gray-600 mb-2">Upload the resume version used for this application</p>
          
          {uploadError && (
            <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {uploadError}
            </div>
          )}

          {uploadedResume ? (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded flex items-center justify-between">
              <span className="text-sm text-green-700">✓ Resume uploaded</span>
              <a
                href={uploadedResume}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            />
            {selectedFile && (
              <button
                type="button"
                onClick={() => handleResumeUpload(initialData?.id || 0)}
                disabled={isUploading || !initialData?.id}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-medium"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {selectedFile ? `Selected: ${selectedFile.name}` : 'PDF, DOC, or DOCX files only'}
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
      >
        {isLoading ? 'Saving...' : initialData ? 'Update Job' : 'Add Job'}
      </button>
    </form>
  );
}
