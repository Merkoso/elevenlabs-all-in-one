'use server';

import { getElevenLabsClient, handleError } from '@/app/actions/utils';
import { Err, Ok, Result } from '@/types';

export type ElevenLabsModel = {
  model_id: string;
  name: string;
  description: string;
  can_do_text_to_speech: boolean;
  can_use_style?: boolean;
  can_use_speaker_boost?: boolean;
  max_characters_per_request?: number;
  languages?: Array<{
    language_id: string;
    name: string;
  }>;
};

export async function getModels(): Promise<Result<ElevenLabsModel[]>> {
  const clientResult = await getElevenLabsClient();
  if (!clientResult.ok) return Err(clientResult.error);

  try {
    const client = clientResult.value;
    const response = await client.models.list();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const models: ElevenLabsModel[] = response.map((m: any) => ({
      model_id: m.modelId,
      name: m.name ?? m.modelId,
      description: m.description ?? '',
      can_do_text_to_speech: m.canDoTextToSpeech ?? false,
      can_use_style: m.canUseStyle ?? false,
      can_use_speaker_boost: m.canUseSpeakerBoost ?? false,
      max_characters_per_request: m.maxCharactersPerRequest ?? 5000,
      languages: (m.languages as Array<{ languageId: string; name: string }> | undefined)?.map((l) => ({
        language_id: l.languageId,
        name: l.name,
      })) ?? [],
    }));

    return Ok(models);
  } catch (error) {
    return handleError(error, 'model retrieval');
  }
}
