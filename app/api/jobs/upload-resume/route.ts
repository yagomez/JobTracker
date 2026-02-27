import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { query } from '@/lib/db/client';

const UPLOAD_DIR = join(process.cwd(), 'public', 'resumes');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File;
    const jobId = formData.get('jobId') as string;

    if (!file || !jobId) {
      return NextResponse.json(
        { error: 'Missing file or jobId' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('document')) {
      return NextResponse.json(
        { error: 'Only PDF and document files are allowed' },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Generate filename: job_${jobId}_${timestamp}.pdf
    const timestamp = Date.now();
    const filename = `job_${jobId}_${timestamp}.pdf`;
    const filepath = join(UPLOAD_DIR, filename);

    // Convert File to Buffer and write
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Update job with resume path
    const resumePath = `/resumes/${filename}`;
    const now = new Date().toISOString();
    
    query(
      'UPDATE jobs SET resume_path = ?, updated_at = ? WHERE id = ?',
      [resumePath, now, parseInt(jobId)]
    );

    return NextResponse.json({
      success: true,
      resume_path: resumePath,
      filename: filename,
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}
