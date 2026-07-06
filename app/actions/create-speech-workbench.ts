'use server';

import { getApiKey } from '@/app/actions/manage-api-key';
import { saveAudioFile, saveJsonFile } from '@/lib/server/audio-storage';
import { Err, Ok, Result } from '@/types';
import { nanoid } from 'nanoid';

export type TtsWorkbenchRequest = {
  text: string;
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  useSpeakerBoost: boolean;
  seed?: number | null;
  outputFormat: string;
  previousText?: string | null;
  nextText?: string | null;
  previousRequestIds?: string[] | null;
  nextRequestIds?: string[] | null;
  applyTextNormalization?: 'auto' | 'on' | 'off';
  applyLanguageTextNormalization?: boolean;
  withTimestamps?: boolean;
};

export type TtsWorkbenchResponse = {
  id: string;
  requestId: string | null;
  characterCost: number | null;
  filename: string;
  audioUrl: string;
  audioBase64: string;
  alignmentFilename?: string | null;
  processingTimeMs: number;
  sizeBytes: number;
};

export async function generateSpeechWorkbench(
  request: TtsWorkbenchRequest
): Promise<Result<TtsWorkbenchResponse>> {
  const startTime = performance.now();
  
  // Resolve API Key
  const userKeyResult = await getApiKey();
  const userApiKey = userKeyResult.ok ? userKeyResult.value : null;
  const apiKey = userApiKey || process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return Err(
      'API key is missing. Please enter your API key in the connection panel or configure the ELEVENLABS_API_KEY environment variable.'
    );
  }

  try {
    const isV3 = request.modelId === 'eleven_v3';
    const isTimestamps = !!request.withTimestamps;

    // Base URL selection
    const endpoint = isTimestamps 
      ? `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(request.voiceId)}/with-timestamps`
      : `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(request.voiceId)}`;

    const url = new URL(endpoint);
    url.searchParams.set('output_format', request.outputFormat || 'mp3_44100_128');
    url.searchParams.set('enable_logging', 'true');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
      text: request.text,
      model_id: request.modelId,
      voice_settings: {
        stability: request.stability,
        similarity_boost: request.similarityBoost,
        style: request.style,
        use_speaker_boost: request.useSpeakerBoost,
        speed: request.speed,
      },
      seed: request.seed !== undefined && request.seed !== null ? Number(request.seed) : undefined,
      apply_text_normalization: request.applyTextNormalization || 'auto',
      apply_language_text_normalization: !!request.applyLanguageTextNormalization,
    };

    // Continuity fields
    if (request.previousText) body.previous_text = request.previousText;
    if (request.nextText) body.next_text = request.nextText;

    // Stitching (disabled for v3)
    if (!isV3) {
      if (request.previousRequestIds && request.previousRequestIds.length > 0) {
        body.previous_request_ids = request.previousRequestIds.slice(0, 3);
      }
      if (request.nextRequestIds && request.nextRequestIds.length > 0) {
        body.next_request_ids = request.nextRequestIds.slice(0, 3);
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let cleanErrorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail?.message) {
          cleanErrorMessage = errorJson.detail.message;
        }
      } catch {
        // use raw text
      }
      return Err(`ElevenLabs API Error (${response.status}): ${cleanErrorMessage}`);
    }

    const requestId = response.headers.get('request-id');
    const characterCostRaw = response.headers.get('character-cost');
    const characterCost = characterCostRaw ? Number(characterCostRaw) : null;
    const processingTimeMs = Math.round(performance.now() - startTime);

    const id = nanoid(10);
    const isWav = request.outputFormat.startsWith('wav');
    const isPcm = request.outputFormat.startsWith('pcm');
    const isOpus = request.outputFormat.startsWith('opus');
    const ext = isWav ? 'wav' : isPcm ? 'pcm' : isOpus ? 'opus' : 'mp3';

    let audioBuffer: Buffer;
    let alignmentFilename: string | null = null;

    if (isTimestamps) {
      const data = await response.json();
      const base64Audio = data.audio_base64;
      audioBuffer = Buffer.from(base64Audio, 'base64');
      
      const alignmentObj = {
        alignment: data.alignment,
        normalized_alignment: data.normalized_alignment
      };
      alignmentFilename = saveJsonFile(id, alignmentObj);
    } else {
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    }

    const saved = saveAudioFile(id, ext, audioBuffer);
    const audioBase64 = audioBuffer.toString('base64');

    return Ok({
      id,
      requestId,
      characterCost,
      filename: saved.filename,
      audioUrl: `/api/audio/${saved.filename}`,
      audioBase64,
      alignmentFilename,
      processingTimeMs,
      sizeBytes: audioBuffer.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Err(`TTS generation failed: ${msg}`);
  }
}
