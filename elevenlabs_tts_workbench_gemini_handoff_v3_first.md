
# ElevenLabs TTS Workbench — пакет задания для Gemini / Antigravity

Дата актуализации: 2026-06-26

## 0. Короткая задача

Сделать open-source веб-сайт / локальный Next.js app для генерации Text-to-Speech через ElevenLabs API.

Пользовательский сценарий:

1. Пользователь открывает сайт локально или на своём деплое.
2. Вставляет свой ElevenLabs API key.
3. Сайт подтягивает доступные голоса и модели из аккаунта пользователя.
4. Пользователь вводит текст, выбирает voice/model/language/output format/settings.
5. Пользователь может зафиксировать `seed`, повторять генерацию, делать batch/chunk generation, сохранять аудио, metadata и историю.
6. Сайт не должен требовать ручного редактирования кода для базовой работы.
7. Проект должен быть удобен для open-source: README, `.env.example`, Docker, локальный запуск, простой deploy.

Важный фокус: не просто “сгенерировать mp3”, а дать доступ к расширенным TTS параметрам API ElevenLabs: `seed`, voice settings, output formats, timestamps, request stitching, pronunciation dictionaries, history, model/voice discovery, chunked long-form workflow.

---

## 1. Основные источники, которые Gemini обязан сверить перед кодом

### ElevenLabs official docs

- Create speech: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- Create speech with timing: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
- Request stitching guide: https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching
- Authentication: https://elevenlabs.io/docs/api-reference/authentication
- List voices: https://elevenlabs.io/docs/api-reference/voices/search
- Get voice settings: https://elevenlabs.io/docs/api-reference/voices/settings/get
- List models: https://elevenlabs.io/docs/api-reference/models/list
- History download: https://elevenlabs.io/docs/api-reference/history/download
- Text to Dialogue: https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert
- Pronunciation dictionary from rules: https://elevenlabs.io/docs/api-reference/pronunciation-dictionaries/create-from-rules
- API pricing: https://elevenlabs.io/pricing/api

### SDK / reference repos

- Official Next.js starter: https://github.com/elevenlabs/elevenlabs-nextjs-starter
- Official Node SDK: https://github.com/elevenlabs/elevenlabs-js
- ComfyUI-ElevenLabs-Pro as feature reference: https://github.com/IxMxAMAR/ComfyUI-ElevenLabs-Pro
- Simple Streamlit reference only, not ideal base: https://github.com/Justmalhar/elevenlabs-ui

### Deployment/storage references

- Vercel pricing/free/Hobby: https://vercel.com/pricing
- Vercel Functions runtime filesystem: https://vercel.com/docs/functions/runtimes
- Cloudflare R2 pricing/free tier: https://developers.cloudflare.com/r2/pricing/

---

## 2. Recommended stack

Use this unless there is a strong reason not to:

```txt
Framework: Next.js App Router + TypeScript
UI: Tailwind + shadcn/ui
API calls: official @elevenlabs/elevenlabs-js OR direct fetch wrapper
Validation: zod
Session: iron-session or encrypted httpOnly cookie
Local DB: SQLite via Prisma/Drizzle
Cloud DB option: Postgres adapter
Local storage: ./data/audio
Cloud storage option: S3-compatible adapter, Cloudflare R2 preferred
Testing: Vitest + Playwright
Lint/format: ESLint + Prettier or Biome
Package manager: pnpm
```

Best starting point: fork/clone `elevenlabs/elevenlabs-nextjs-starter`, then simplify/reshape into a TTS Workbench.

Why:
- Already uses Next.js, ElevenLabs SDK, shadcn/ui/Tailwind.
- Has `.env` flow and API key setup.
- Has a relevant product structure for audio tools.

But do not leave it as a generic playground. Build a focused TTS tool.

---

## 3. Architecture modes

The app must support at least two modes.

### Mode A — Local/self-hosted BYOK, recommended

User runs:

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Then opens `http://localhost:3000`, pastes ElevenLabs key, generates audio.

Default local storage:
```txt
data/db.sqlite
data/audio/*.mp3|*.wav|*.json
```

### Mode B — Public demo / Vercel deployment

This is useful for preview, but must have a security warning.

Default behavior:
- user enters API key in a form;
- key is stored in encrypted httpOnly session cookie or server-side session;
- key is never written to DB;
- key is never exposed in client-side JS after submission;
- key is never logged;
- user can clear key/session.

README warning:
> Do not enter your real ElevenLabs API key into a public instance that you do not operate. For sensitive keys, self-host locally or deploy your own copy.

For Vercel, do not rely on writing generated files to the project filesystem. Use:
- Browser download / IndexedDB for simple demo, or
- Vercel Blob / Cloudflare R2 / S3-compatible storage for persistent files.

Reason: Vercel functions have read-only filesystem with writable `/tmp` scratch space only. Persistent storage must be external.

---

## 4. Security requirements

Non-negotiable:

1. Do not put ElevenLabs API key in client-side source code.
2. Do not log API key, request headers, full request bodies, or full upstream errors containing secrets.
3. Redact these keys from every log/error:
   - `xi-api-key`
   - `ELEVENLABS_API_KEY`
   - `x-user-elevenlabs-key`
   - `Authorization`
4. BYOK public app must show trust warning.
5. API key storage policy:
   - Default: encrypted httpOnly session only.
   - Optional: `.env` server key for private single-user deployment.
   - Optional advanced: encrypted-at-rest per-user key storage after explicit opt-in.
6. Add rate limiting for public deployments.
7. Add max text length and file size guards.
8. Never commit `.env`.
9. `.env.example` must not contain real keys.
10. Add GitHub secret scanning note in README.

Suggested key session API:

```txt
POST /api/key/set
POST /api/key/clear
GET  /api/key/status
```

`/api/key/set` should verify key with a low-cost endpoint like `GET /v1/models` or `GET /v1/user/subscription`.

---

## 5. Core product UX

### Main page `/`

Single polished “TTS Workbench” page.

Sections:

1. API key panel
   - paste key
   - test connection
   - clear key
   - show current mode: env key / session key / no key

2. Text editor
   - textarea
   - character counter
   - selected model max chars indicator
   - paste cleanup
   - split into chunks
   - optional markdown/plain text cleanup

3. Voice selector
   - fetch voices from `GET /v2/voices`
   - show name, category, labels, available tiers, preview_url
   - search/filter
   - favorite voices locally

4. Model selector
   - fetch models from `GET /v1/models`
   - show `model_id`, name, max chars, supported languages, style/speaker boost support
   - recommended defaults:
     - stable long-form: `eleven_multilingual_v2`
     - fast preview: `eleven_flash_v2_5` or `eleven_turbo_v2_5`
     - expressive short dialogue: `eleven_v3`
   - auto-disable request stitching when model is `eleven_v3`

5. Settings panel
   - `language_code`
   - `output_format`
   - `seed`
   - randomize seed
   - lock seed
   - copy seed
   - `stability`
   - `similarity_boost`
   - `style`
   - `use_speaker_boost`
   - `speed`
   - `apply_text_normalization`
   - `apply_language_text_normalization`
   - advanced: `previous_text`, `next_text`
   - advanced: `previous_request_ids`, `next_request_ids`
   - advanced: pronunciation dictionaries

6. Action buttons
   - Generate
   - Generate with timestamps
   - Stream preview
   - Regenerate same settings
   - Generate next chunk with previous request id
   - Regenerate middle chunk with previous + next request ids
   - Save preset
   - Download audio
   - Download metadata JSON
   - Download selected as zip

7. Result area
   - audio player
   - generation metadata
   - request-id
   - character-cost header if available
   - file path/object URL
   - copy curl
   - copy JSON payload

8. History
   - local and/or server history
   - filter by voice/model/seed/date/project
   - replay/regenerate
   - compare takes
   - delete local entry
   - export JSON

---

## 6. API coverage to implement

### 6.1 Create speech

Endpoint:

```txt
POST https://api.elevenlabs.io/v1/text-to-speech/:voice_id
```

Query params to support:

```ts
{
  output_format?: OutputFormat;         // default mp3_44100_128
  enable_logging?: boolean;             // default true; false is enterprise zero-retention and disables history/stitching
  optimize_streaming_latency?: number;  // deprecated; hide under legacy/advanced if included
}
```

Request body:

```ts
{
  text: string;
  model_id?: string;
  language_code?: string | null;
  voice_settings?: {
    stability?: number;          // 0..1
    similarity_boost?: number;   // 0..1
    style?: number;              // usually 0..1
    use_speaker_boost?: boolean;
    speed?: number;              // default 1
  } | null;
  pronunciation_dictionary_locators?: Array<{
    pronunciation_dictionary_id: string;
    version_id: string;
  }> | null;
  seed?: number | null; // 0..4294967295
  previous_text?: string | null;
  next_text?: string | null;
  previous_request_ids?: string[] | null; // max 3
  next_request_ids?: string[] | null;     // max 3
  apply_text_normalization?: "auto" | "on" | "off";
  apply_language_text_normalization?: boolean;
}
```

Important behavior:
- Store `request-id` response header.
- Store `character-cost` response header if present.
- Same `seed` + same parameters is only best-effort deterministic, not guaranteed.
- Keep `previous_request_ids` / `next_request_ids` max 3.
- Prefer same model across stitched generations.
- `eleven_v3` does not support request stitching.

### 6.2 Speech with timing

Endpoint:

```txt
POST https://api.elevenlabs.io/v1/text-to-speech/:voice_id/with-timestamps
```

Response contains:

```ts
{
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
  normalized_alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}
```

Implement:
- Decode `audio_base64` to audio file.
- Save `alignment.json`.
- Add export to SRT/VTT using normalized alignment.
- Add visual alignment viewer later.

### 6.3 Streaming

Endpoint/docs: TTS stream endpoint and SDK `textToSpeech.stream`.

Implement after MVP:
- Stream audio progressively for preview.
- Still support non-streaming for durable file/history because it is simpler.

### 6.4 Voices

Endpoint:

```txt
GET https://api.elevenlabs.io/v2/voices
```

Use it to populate:
- `voice_id`
- `name`
- `category`
- `labels`
- `preview_url`
- `available_for_tiers`
- `settings`
- `verified_languages`
- `high_quality_base_model_ids`

Add voice preview playback from `preview_url`.

### 6.5 Voice settings

Endpoint:

```txt
GET https://api.elevenlabs.io/v1/voices/:voice_id/settings
```

Use when user selects voice:
- load default voice settings
- allow “Use voice defaults”
- allow “Override for this generation”
- save as preset

### 6.6 Models

Endpoint:

```txt
GET https://api.elevenlabs.io/v1/models
```

Use to:
- filter `can_do_text_to_speech`
- show `can_use_style`
- show `can_use_speaker_boost`
- show `maximum_text_length_per_request`
- show languages
- show cost multiplier if returned

Do not hardcode all model limits. Use endpoint whenever possible.

### 6.7 History

Useful endpoints:
- `GET /v1/history`
- `GET /v1/history/:history_item_id`
- `GET /v1/history/:history_item_id/audio`
- `POST /v1/history/download`

Implement:
- local generation history regardless of ElevenLabs history
- optional “import/download from ElevenLabs history”
- batch download selected generated files as zip

Note:
- If `enable_logging=false`, history features are unavailable.
- Zero retention is enterprise-only and conflicts with request stitching.

### 6.8 Pronunciation dictionaries

Endpoint:

```txt
POST https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-rules
```

Implement later as project dictionary:

```ts
type PronunciationRule =
  | { string_to_replace: string; type: "alias"; alias: string }
  | { string_to_replace: string; type: "phoneme"; phoneme: string; alphabet: "ipa" | "cmu" };
```

UX:
- simple table editor
- create/update dictionary
- attach up to 3 dictionary locators per generation

### 6.9 Text to Dialogue — optional v1.1 feature

Endpoint:

```txt
POST https://api.elevenlabs.io/v1/text-to-dialogue
```

Supports:
- inputs: `{ text, voice_id }[]`
- up to 10 unique voice IDs
- recommended total text <= 2000 chars per request
- `model_id`, default `eleven_v3`
- `language_code`
- `settings`
- `pronunciation_dictionary_locators`
- `seed`
- `apply_text_normalization`

Do not mix this with normal long-form TTS in MVP. Add separate tab `/dialogue`.

---

## 7. Output formats

Create `OutputFormat` enum and UI dropdown.

Known useful formats:

```ts
const outputFormats = [
  "mp3_22050_32",
  "mp3_24000_48",
  "mp3_44100_32",
  "mp3_44100_64",
  "mp3_44100_96",
  "mp3_44100_128",
  "mp3_44100_192",

  "pcm_8000",
  "pcm_16000",
  "pcm_22050",
  "pcm_24000",
  "pcm_32000",
  "pcm_44100",
  "pcm_48000",

  "wav_8000",
  "wav_16000",
  "wav_22050",
  "wav_24000",
  "wav_32000",
  "wav_44100",
  "wav_48000",

  "ulaw_8000",
  "alaw_8000",

  "opus_48000_32",
  "opus_48000_64",
  "opus_48000_96",
  "opus_48000_128",
  "opus_48000_192"
] as const;
```

Default:
```txt
mp3_44100_128
```

Gating note:
- `mp3_44100_192` requires Creator tier or above.
- PCM/WAV 44.1kHz requires Pro tier or above.
- If selected format gets 422/permission error, show friendly error and suggest `mp3_44100_128`.

---

## 8. Data model

Use SQLite/Drizzle or Prisma.

Minimum tables:

```sql
projects
  id text primary key
  name text not null
  created_at datetime not null
  updated_at datetime not null

presets
  id text primary key
  project_id text
  name text not null
  voice_id text not null
  voice_name text
  model_id text not null
  language_code text
  output_format text not null
  seed integer
  stability real
  similarity_boost real
  style real
  use_speaker_boost boolean
  speed real
  apply_text_normalization text
  created_at datetime not null
  updated_at datetime not null

generations
  id text primary key
  project_id text
  parent_generation_id text
  chunk_group_id text
  chunk_index integer
  text text not null
  text_hash text not null
  voice_id text not null
  voice_name text
  model_id text not null
  language_code text
  output_format text not null
  seed integer
  voice_settings_json text
  request_payload_json text not null
  elevenlabs_request_id text
  elevenlabs_history_item_id text
  character_cost integer
  previous_request_ids_json text
  next_request_ids_json text
  audio_storage_key text
  audio_mime_type text
  audio_size_bytes integer
  alignment_storage_key text
  status text not null
  error text
  created_at datetime not null
```

For pure static/browser demo, use IndexedDB with same logical shape.

---

## 9. Storage adapter

Create interface:

```ts
export interface AudioStorage {
  putAudio(input: {
    buffer: Buffer;
    filename: string;
    contentType: string;
    metadata: Record<string, string>;
  }): Promise<{ key: string; url?: string; sizeBytes: number }>;

  putJson(input: {
    json: unknown;
    filename: string;
    metadata: Record<string, string>;
  }): Promise<{ key: string; url?: string; sizeBytes: number }>;

  get(key: string): Promise<{ buffer: Buffer; contentType: string }>;

  delete(key: string): Promise<void>;
}
```

Implement:

1. `LocalFsStorage`
   - writes to `data/audio`
   - good for local/Docker/server VPS

2. `R2Storage`
   - S3-compatible
   - good for Vercel/cloud
   - env:
     - `R2_ACCOUNT_ID`
     - `R2_ACCESS_KEY_ID`
     - `R2_SECRET_ACCESS_KEY`
     - `R2_BUCKET`
     - `R2_PUBLIC_BASE_URL` optional

3. Optional `VercelBlobStorage`

---

## 10. Chunked long-form workflow

Implement this early because it solves the biggest ElevenLabs stability problem.

### Text splitting

Function:

```ts
splitTextIntoChunks(text, maxChars, preferredChars)
```

Rules:
- split by paragraphs first
- then sentences
- never exceed selected model max chars
- target 1000–3000 chars for stable chunks, depending on model/voice
- keep punctuation
- preserve exact chunk text in DB

### Sequential generation

Pseudo:

```ts
const requestIds: string[] = [];

for (const [index, chunkText] of chunks.entries()) {
  const previous = requestIds.slice(-3);

  const result = await generateTts({
    text: chunkText,
    voice_id,
    model_id,
    seed,
    voice_settings,
    previous_request_ids: previous,
  });

  requestIds.push(result.requestId);
  saveGeneration({ ...result, chunk_index: index });
}
```

Important:
- request stitching is not available for `eleven_v3`
- previous request ids should be no older than 2 hours
- if older than 2 hours, fallback to `previous_text` or regenerate the chain
- for middle-chunk regeneration, pass:
  - `previous_request_ids: [previousChunk.requestId]`
  - `next_request_ids: [nextChunk.requestId]`

### Concatenation

MVP:
- let user download chunk files separately
- provide metadata JSON

V1.1:
- concatenate audio server-side using ffmpeg, only in local/Docker mode
- or concatenate client-side in browser if possible
- add silence gap option
- export combined mp3/wav

---

## 11. Suggested routes

```txt
POST /api/session/key
DELETE /api/session/key
GET /api/session/key-status

GET /api/elevenlabs/models
GET /api/elevenlabs/voices
GET /api/elevenlabs/voices/:voiceId/settings

POST /api/tts/generate
POST /api/tts/generate-with-timestamps
POST /api/tts/stream
POST /api/tts/chunked-generate
POST /api/tts/regenerate

GET /api/history
GET /api/history/:id
GET /api/history/:id/audio
DELETE /api/history/:id
POST /api/history/export-zip

GET /api/presets
POST /api/presets
PUT /api/presets/:id
DELETE /api/presets/:id

GET /api/projects
POST /api/projects
PUT /api/projects/:id
DELETE /api/projects/:id

POST /api/pronunciation-dictionaries
GET /api/pronunciation-dictionaries
```

---

## 12. Zod schema sketch

```ts
import { z } from "zod";

export const VoiceSettingsSchema = z.object({
  stability: z.number().min(0).max(1).optional(),
  similarity_boost: z.number().min(0).max(1).optional(),
  style: z.number().min(0).max(1).optional(),
  use_speaker_boost: z.boolean().optional(),
  speed: z.number().min(0.5).max(2).optional(),
});

export const TtsGenerateSchema = z.object({
  text: z.string().min(1).max(40000),
  voice_id: z.string().min(1),
  model_id: z.string().min(1).default("eleven_multilingual_v2"),
  language_code: z.string().min(2).max(10).nullable().optional(),
  output_format: z.string().default("mp3_44100_128"),
  enable_logging: z.boolean().default(true),
  voice_settings: VoiceSettingsSchema.nullable().optional(),
  seed: z.number().int().min(0).max(4294967295).nullable().optional(),
  previous_text: z.string().nullable().optional(),
  next_text: z.string().nullable().optional(),
  previous_request_ids: z.array(z.string()).max(3).nullable().optional(),
  next_request_ids: z.array(z.string()).max(3).nullable().optional(),
  pronunciation_dictionary_locators: z.array(z.object({
    pronunciation_dictionary_id: z.string(),
    version_id: z.string(),
  })).max(3).nullable().optional(),
  apply_text_normalization: z.enum(["auto", "on", "off"]).default("auto"),
  apply_language_text_normalization: z.boolean().default(false),
});
```

---

## 13. Server route skeleton

Use direct `fetch` first. SDK can be used where convenient, but raw fetch makes headers (`request-id`, `character-cost`) explicit.

```ts
// app/api/tts/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TtsGenerateSchema } from "@/lib/schemas/tts";
import { getElevenLabsApiKey } from "@/lib/server/api-key";
import { storage } from "@/lib/server/storage";
import { db } from "@/lib/server/db";
import { createId } from "@paralleldrive/cuid2";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ElevenLabs API key" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = TtsGenerateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { voice_id, output_format, enable_logging, ...body } = parsed.data;

  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice_id)}`);
  url.searchParams.set("output_format", output_format);
  url.searchParams.set("enable_logging", String(enable_logging));

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const safeText = await upstream.text();
    return NextResponse.json({
      error: "ElevenLabs request failed",
      status: upstream.status,
      detail: safeText.slice(0, 2000),
    }, { status: upstream.status });
  }

  const audioBuffer = Buffer.from(await upstream.arrayBuffer());
  const requestId = upstream.headers.get("request-id");
  const characterCostRaw = upstream.headers.get("character-cost");
  const contentType = upstream.headers.get("content-type") ?? "audio/mpeg";

  const id = createId();
  const ext = output_format.startsWith("wav") ? "wav" :
              output_format.startsWith("pcm") ? "pcm" :
              output_format.startsWith("opus") ? "opus" : "mp3";

  const saved = await storage.putAudio({
    buffer: audioBuffer,
    filename: `${id}.${ext}`,
    contentType,
    metadata: {
      requestId: requestId ?? "",
      modelId: body.model_id ?? "",
      voiceId: voice_id,
    },
  });

  await db.generation.create({
    data: {
      id,
      text: body.text,
      voiceId: voice_id,
      modelId: body.model_id ?? "eleven_multilingual_v2",
      outputFormat: output_format,
      seed: body.seed ?? null,
      elevenlabsRequestId: requestId,
      characterCost: characterCostRaw ? Number(characterCostRaw) : null,
      audioStorageKey: saved.key,
      audioMimeType: contentType,
      audioSizeBytes: saved.sizeBytes,
      requestPayloadJson: JSON.stringify({ voice_id, output_format, enable_logging, ...body }),
      status: "success",
    },
  });

  return NextResponse.json({
    id,
    requestId,
    characterCost: characterCostRaw ? Number(characterCostRaw) : null,
    audioUrl: `/api/history/${id}/audio`,
    storageKey: saved.key,
    sizeBytes: saved.sizeBytes,
  });
}
```

---

## 14. UI components to build

```txt
components/
  api-key-panel.tsx
  tts-workbench.tsx
  text-editor-card.tsx
  voice-selector.tsx
  model-selector.tsx
  voice-settings-sliders.tsx
  seed-control.tsx
  output-format-select.tsx
  generation-actions.tsx
  audio-result-card.tsx
  history-table.tsx
  preset-manager.tsx
  chunk-editor.tsx
  pronunciation-dictionary-editor.tsx
```

UX details:
- Use tabs: Basic / Advanced / Chunking / History.
- Use collapsible advanced panel.
- Add tooltips explaining each parameter.
- Add warning badges:
  - `eleven_v3`: “No request stitching”
  - `mp3_44100_192`: “Creator+”
  - `wav_44100` or `pcm_44100`: “Pro+”
  - `enable_logging=false`: “Enterprise zero-retention; disables history/stitching”
- Add “Copy payload” and “Copy curl” for debugging.

---

## 15. Presets

Preset examples:

### Stable Russian narration

```json
{
  "name": "Stable RU narration",
  "model_id": "eleven_multilingual_v2",
  "language_code": "ru",
  "output_format": "mp3_44100_128",
  "seed": 123456789,
  "voice_settings": {
    "stability": 0.78,
    "similarity_boost": 0.9,
    "style": 0.05,
    "use_speaker_boost": true,
    "speed": 1
  },
  "apply_text_normalization": "auto"
}
```

### Fast preview

```json
{
  "name": "Fast preview",
  "model_id": "eleven_flash_v2_5",
  "language_code": "ru",
  "output_format": "mp3_44100_128",
  "voice_settings": {
    "stability": 0.65,
    "similarity_boost": 0.8,
    "style": 0,
    "use_speaker_boost": false,
    "speed": 1
  },
  "apply_text_normalization": "auto"
}
```

### Expressive short take

```json
{
  "name": "Expressive short v3",
  "model_id": "eleven_v3",
  "language_code": "ru",
  "output_format": "mp3_44100_128",
  "seed": 987654321,
  "voice_settings": {
    "stability": 0.45,
    "similarity_boost": 0.8,
    "style": 0.4,
    "use_speaker_boost": true,
    "speed": 1
  },
  "apply_text_normalization": "auto"
}
```

---

## 16. Testing checklist

### Unit tests

- zod schema rejects invalid seed <0 and >4294967295
- previous/next request ids max 3
- output format fallback suggestions
- splitTextIntoChunks never exceeds model max chars
- splitTextIntoChunks preserves full text
- secret redaction removes API keys from logs/errors
- storage adapter blocks path traversal
- R2 key generation is safe
- metadata JSON includes full reproducibility params

### Mocked API tests

Mock ElevenLabs fetch:
- successful TTS returns audio bytes and request-id
- failed 401 shows “invalid key”
- failed 422 shows helpful format/model validation
- 429 shows rate limit warning
- with timestamps decodes base64 and saves alignment
- models endpoint populates model selector
- voices endpoint populates voice selector

### E2E tests

- user can set API key
- user can fetch voices/models
- user can generate audio with mocked endpoint
- user can download audio
- user can save preset
- user can regenerate same settings
- user can chunk text and generate multiple chunks
- UI disables stitching for `eleven_v3`

### Manual real-API smoke test

Add script:

```bash
pnpm test:real-elevenlabs
```

But do not run this in CI by default because it consumes credits.

Manual test:
1. Set `ELEVENLABS_API_KEY`.
2. Fetch models.
3. Fetch voices.
4. Generate 1 very short mp3 with default voice.
5. Assert:
   - file exists
   - size > 0
   - request-id captured
   - DB row saved
   - no key in logs

---

## 17. Deployment

### Local

```bash
pnpm install
cp .env.example .env
pnpm dev
```

`.env.example`:

```env
# Optional server-side default key for private local use.
ELEVENLABS_API_KEY=

# Required for encrypted session cookies.
IRON_SESSION_SECRET_KEY=replace_with_openssl_rand_base64_32

# Storage.
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=./data/audio

# Database.
DATABASE_URL=file:./data/db.sqlite

# Optional R2/S3 storage for cloud deployments.
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

### Docker

Add:

```Dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["pnpm", "start"]
```

Add `docker-compose.yml`:

```yaml
services:
  elevenlabs-tts-workbench:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
```

### Vercel

Use for public demo or personal deployed app.

Steps:
1. Push repo to GitHub.
2. Import into Vercel.
3. Set env:
   - `IRON_SESSION_SECRET_KEY`
   - optional `ELEVENLABS_API_KEY`
   - if persistent storage: R2/Vercel Blob envs
   - DB env if using cloud DB
4. Do not use local filesystem for durable audio on Vercel.
5. Add README note: Vercel Hobby is for personal/non-commercial use; check current Vercel terms/pricing.

For durable cloud storage, prefer R2:
- Free tier includes 10 GB-month storage and generous operations.
- Egress to Internet is free under R2 pricing docs.
- Add lifecycle cleanup option for old generated files.

---

## 18. Acceptance criteria

MVP is done when:

1. App runs locally via `pnpm dev`.
2. User can paste API key and verify it.
3. App fetches voices and models using that key.
4. App can generate TTS using:
   - voice_id
   - model_id
   - language_code
   - output_format
   - seed
   - stability
   - similarity_boost
   - style
   - use_speaker_boost
   - speed
   - apply_text_normalization
5. Audio is playable in browser.
6. Audio is downloadable.
7. Metadata JSON is downloadable.
8. Generation is saved to local history.
9. Regenerate same settings works.
10. Chunked generation with previous_request_ids works for non-v3 models.
11. UI warns that request stitching is not available for `eleven_v3`.
12. API key is not present in client bundle, DB, console logs, server logs, generated metadata, or error messages.
13. README explains local, Docker and Vercel/R2 deployment.
14. Tests pass with mocked ElevenLabs API.

V1.1 done when:
1. `with-timestamps` generation works.
2. SRT/VTT export works.
3. Pronunciation dictionary editor works.
4. Preset manager works.
5. R2 storage works.
6. Public demo mode has rate limiting and trust warning.

---

## 19. Nice future features

- A/B comparison of takes with same text/settings but different seed.
- “Find stable seed” mode: generate 3–5 variants and choose best.
- Prompt/text cleanup for TTS:
  - remove markdown artifacts
  - expand abbreviations
  - normalize punctuation
- SSML-like helper snippets if supported by model style.
- v3 tag inserter:
  - `[laughs]`
  - `[whispers]`
  - `[excited]`
  - only show for `eleven_v3`
- Batch import CSV:
  - file_name,text,voice_id,seed
- Project dictionary:
  - brand names
  - names
  - acronyms
- Team mode:
  - auth
  - per-user keys
  - shared presets
  - shared projects
- Cost dashboard:
  - estimate characters before generation
  - sum `character-cost` from headers
- Export to:
  - mp3
  - wav
  - zip
  - JSONL
  - SRT/VTT
- PWA/offline-ish UI for local generation history.
- Import old history from ElevenLabs history endpoint.
- “Copy cURL” for every generation.

---

## 20. Direct prompt to Gemini / Antigravity

Copy-paste this into Gemini/Antigravity:

```txt
You are building an open-source ElevenLabs Text-to-Speech Workbench.

Goal:
Create a polished Next.js + TypeScript web app where a user can open the site, enter their own ElevenLabs API key, fetch voices/models, generate TTS audio with all important ElevenLabs API parameters, save/download audio and metadata, and optionally deploy locally, with Docker, or to Vercel.

Read these docs first:
- https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
- https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching
- https://elevenlabs.io/docs/api-reference/authentication
- https://elevenlabs.io/docs/api-reference/voices/search
- https://elevenlabs.io/docs/api-reference/models/list
- https://elevenlabs.io/docs/api-reference/voices/settings/get
- https://elevenlabs.io/docs/api-reference/history/download
- https://github.com/elevenlabs/elevenlabs-js
- https://github.com/elevenlabs/elevenlabs-nextjs-starter

Tech:
- Next.js App Router, TypeScript, Tailwind, shadcn/ui
- zod validation
- official @elevenlabs/elevenlabs-js SDK where useful, but use direct fetch for TTS generation if needed to capture response headers request-id and character-cost
- local SQLite and local filesystem storage for local mode
- storage adapter design for local filesystem and Cloudflare R2/S3
- Vitest + Playwright

Important:
- Never expose API keys in client-side source code.
- User key should be submitted to server and kept in encrypted httpOnly session or server session.
- Never log API keys. Redact xi-api-key and Authorization.
- Public hosted demo must warn users not to enter real keys into an instance they do not control.
- Vercel filesystem is not durable; use R2/Vercel Blob/S3 or browser downloads for hosted mode.

Implement MVP:
1. API key panel: set/test/clear key.
2. Voice selector from GET /v2/voices with preview_url playback.
3. Model selector from GET /v1/models; only show TTS-capable models.
4. TTS form supporting:
   - text
   - voice_id
   - model_id
   - language_code
   - output_format
   - seed 0..4294967295
   - stability
   - similarity_boost
   - style
   - use_speaker_boost
   - speed
   - apply_text_normalization auto/on/off
   - previous_text / next_text
   - previous_request_ids / next_request_ids max 3
   - pronunciation_dictionary_locators max 3
5. Generate audio via POST /v1/text-to-speech/:voice_id.
6. Save request-id and character-cost headers.
7. Save audio and metadata locally.
8. Show audio player and download buttons.
9. Local history table with regenerate same settings.
10. Chunked long-form generation:
    - split text by paragraphs/sentences
    - generate sequentially
    - pass last up to 3 previous_request_ids
    - disable/warn for eleven_v3 because request stitching is not available for it
    - support regenerate middle chunk with previous + next request ids
11. README with local, Docker, and Vercel deployment instructions.
12. Mocked tests so CI does not consume ElevenLabs credits.

Implement V1.1 after MVP:
- /with-timestamps generation, save alignment JSON
- SRT/VTT export
- pronunciation dictionary editor
- presets
- R2 storage adapter
- text-to-dialogue tab

Acceptance:
- pnpm dev starts the app
- user can paste key, fetch voices/models, generate audio, play it, download it, see history
- seed is supported and can be locked/randomized/copied
- request stitching works for non-v3 models
- no key leaks into logs, metadata, DB, or client bundle
- tests pass
```

---

# APPENDED CRITICAL ADDENDUM: ElevenLabs v3-first workflow

See also: `elevenlabs_v3_addendum_for_gemini.md`.

The user specifically wants ElevenLabs third-generation voices. Treat `eleven_v3` as a first-class default mode, not only as “expressive short dialogue”. Request stitching remains unavailable for `eleven_v3`; use locked seed, fixed settings, v3 stability presets, careful chunking, optional text context, A/B takes, and approved-take export instead.
