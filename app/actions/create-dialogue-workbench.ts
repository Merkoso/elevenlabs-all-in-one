'use server';

import { getApiKey } from '@/app/actions/manage-api-key';
import { saveAudioFile } from '@/lib/server/audio-storage';
import { Err, Ok, Result } from '@/types';
import { nanoid } from 'nanoid';

export type DialogueLineInput = {
  text: string;
  voiceId: string;
};

export type DialogueWorkbenchRequest = {
  inputs: DialogueLineInput[];
  modelId: string;
  seed?: number | null;
};

export type DialogueWorkbenchResponse = {
  id: string;
  requestId: string | null;
  characterCost: number | null;
  filename: string;
  audioUrl: string;
  audioBase64: string;
  processingTimeMs: number;
  sizeBytes: number;
};

export async function createDialogueWorkbench(
  request: DialogueWorkbenchRequest
): Promise<Result<DialogueWorkbenchResponse>> {
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
    const url = new URL('https://api.elevenlabs.io/v1/text-to-dialogue');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
      inputs: request.inputs.map(input => ({
        text: input.text,
        voice_id: input.voiceId,
      })),
      model_id: request.modelId || 'eleven_v3',
    };

    if (request.seed !== undefined && request.seed !== null) {
      body.seed = Number(request.seed);
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
      return Err(`ElevenLabs Dialogue API Error (${response.status}): ${cleanErrorMessage}`);
    }

    const requestId = response.headers.get('request-id');
    const characterCostRaw = response.headers.get('character-cost');
    const characterCost = characterCostRaw ? Number(characterCostRaw) : null;
    const processingTimeMs = Math.round(performance.now() - startTime);

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const id = nanoid(10);
    // Dialogue is output as mp3
    const saved = saveAudioFile(id, 'mp3', audioBuffer);
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
    return Err(`Dialogue generation failed: ${msg}`);
  }
}
