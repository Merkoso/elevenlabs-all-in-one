import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { headers } from 'next/headers';

import { getApiKey } from '@/app/actions/manage-api-key';
import { env } from '@/env.mjs';
import { Err, Ok, Result } from '@/types';

export async function getElevenLabsClient(): Promise<Result<ElevenLabsClient>> {
  try {
    const userKeyResult = await getApiKey();
    const userApiKey = userKeyResult.ok ? userKeyResult.value : null;

    // Verify if request is local to prevent environment key billing leakage in production
    let isLocal = false;
    try {
      const reqHeaders = await headers();
      const host = reqHeaders.get('host') || '';
      isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('192.168.') || host.includes('::1');
    } catch {
      // Server actions run in static generation may fail on headers()
    }

    const apiKey = userApiKey || (isLocal ? env.ELEVENLABS_API_KEY : null);

    if (!apiKey) {
      return Err(
        'API key is missing. Please set your API key in the app.'
      );
    }

    return Ok(new ElevenLabsClient({ apiKey }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Err(`ElevenLabs client initialization failed: ${errorMessage}`);
  }
}

export function handleError(error: unknown, context: string): Result<never> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return Err(`Failed to ${context}: ${errorMessage}`);
}

export async function streamToBase64(audioStream: ReadableStream<Uint8Array>): Promise<string> {
  const chunks: Uint8Array[] = [];
  const reader = audioStream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(combined).toString('base64');
}
