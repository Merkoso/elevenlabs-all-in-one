'use server';

import { getApiKey } from '@/app/actions/manage-api-key';
import { saveAudioFile } from '@/lib/server/audio-storage';
import { Err, Ok, Result } from '@/types';
import { nanoid } from 'nanoid';

export type StsWorkbenchRequest = {
  audioBase64: string; // The source audio file encoded as base64
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  outputFormat: string;
  removeBackgroundNoise?: boolean;
};

export type StsWorkbenchResponse = {
  id: string;
  requestId: string | null;
  characterCost: number | null;
  filename: string;
  audioUrl: string;
  audioBase64: string;
  processingTimeMs: number;
  sizeBytes: number;
};

export async function generateSpeechToSpeech(
  request: StsWorkbenchRequest
): Promise<Result<StsWorkbenchResponse>> {
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
    const url = new URL(`https://api.elevenlabs.io/v1/speech-to-speech/${encodeURIComponent(request.voiceId)}`);
    url.searchParams.set('output_format', request.outputFormat || 'mp3_44100_128');

    // Decode source audio base64 to binary Buffer
    const sourceBuffer = Buffer.from(request.audioBase64, 'base64');
    
    // Determine mime-type based on outputFormat (or just use audio/mpeg / audio/wav)
    const isWav = request.outputFormat.startsWith('wav');
    const isPcm = request.outputFormat.startsWith('pcm');
    const isOpus = request.outputFormat.startsWith('opus');
    const ext = isWav ? 'wav' : isPcm ? 'pcm' : isOpus ? 'opus' : 'mp3';
    let mimeType = 'audio/mpeg';
    if (isWav) mimeType = 'audio/wav';
    else if (isPcm) mimeType = 'audio/x-pcm';
    else if (isOpus) mimeType = 'audio/opus';

    // Construct FormData for multipart/form-data request
    const formData = new FormData();
    
    // Create a Blob from the buffer to append to FormData
    const audioBlob = new Blob([sourceBuffer], { type: mimeType });
    formData.append('audio', audioBlob, `source.${ext}`);
    formData.append('model_id', request.modelId || 'eleven_multilingual_sts_v2');
    
    const voiceSettings = {
      stability: request.stability,
      similarity_boost: request.similarityBoost,
      style: request.style,
      use_speaker_boost: request.useSpeakerBoost
    };
    formData.append('voice_settings', JSON.stringify(voiceSettings));
    
    if (request.removeBackgroundNoise !== undefined) {
      formData.append('remove_background_noise', String(request.removeBackgroundNoise));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
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
      return Err(`ElevenLabs Speech-to-Speech API Error (${response.status}): ${cleanErrorMessage}`);
    }

    const requestId = response.headers.get('request-id');
    const characterCostRaw = response.headers.get('character-cost');
    const characterCost = characterCostRaw ? Number(characterCostRaw) : null;
    const processingTimeMs = Math.round(performance.now() - startTime);

    const id = nanoid(10);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    
    const saved = saveAudioFile(id, ext, audioBuffer);
    const audioBase64 = audioBuffer.toString('base64');

    return Ok({
      id,
      requestId,
      characterCost,
      filename: saved.filename,
      audioUrl: `/api/audio/${saved.filename}`,
      audioBase64,
      processingTimeMs,
      sizeBytes: audioBuffer.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Err(`Speech-to-Speech conversion failed: ${msg}`);
  }
}
