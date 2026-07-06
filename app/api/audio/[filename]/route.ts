import { NextRequest, NextResponse } from 'next/server';
import { getAudioFile } from '@/lib/server/audio-storage';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Safety check to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
    
    const buffer = getAudioFile(filename);
    if (!buffer) {
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
    }
    
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'audio/mpeg';
    if (ext === '.wav') {
      contentType = 'audio/wav';
    } else if (ext === '.pcm') {
      contentType = 'audio/pcm';
    } else if (ext === '.opus') {
      contentType = 'audio/opus';
    }
    
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Failed to serve audio file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
