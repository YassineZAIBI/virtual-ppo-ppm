import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8100';
const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Check file count limit
    const existingFiles = await db.knowledgeDocument.count({
      where: { userId, sourceType: 'file' },
    });

    if (existingFiles >= MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed. Delete a file first.` },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Forward file to Python service for text extraction
    const pyFormData = new FormData();
    pyFormData.append('file', file);

    const pyResp = await fetch(`${AGENT_SERVICE_URL}/knowledge/upload`, {
      method: 'POST',
      body: pyFormData,
    });

    if (!pyResp.ok) {
      const err = await pyResp.json().catch(() => ({ detail: 'Upload failed' }));
      return NextResponse.json({ error: err.detail || 'Upload failed' }, { status: 400 });
    }

    const result = await pyResp.json();

    // Store in database
    const doc = await db.knowledgeDocument.create({
      data: {
        userId,
        sourceType: 'file',
        sourceName: result.source_name,
        content: result.content,
        contentChunks: JSON.stringify(result.content_chunks),
        fileType: result.file_type,
        fileSize: file.size,
        metadata: JSON.stringify({ uploadedAt: new Date().toISOString() }),
      },
    });

    return NextResponse.json({
      id: doc.id,
      sourceName: doc.sourceName,
      fileType: doc.fileType,
      chunkCount: result.chunk_count,
      charCount: result.char_count,
    });
  } catch (error: any) {
    console.error('Knowledge upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}