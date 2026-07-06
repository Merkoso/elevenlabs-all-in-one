# ElevenLabs TTS Workbench — обязательный v3 addendum для Gemini / Antigravity

Дата актуализации: 2026-06-27

Этот addendum нужно передать вместе с основным handoff-файлом `elevenlabs_tts_workbench_gemini_handoff.md`.

Главная поправка: продукт должен поддерживать `eleven_v3` как first-class режим генерации, а не только как «короткий expressive preset». Пользователь хочет генерировать голосами третьего поколения ElevenLabs. Поэтому UX, API payload builder, presets, chunking и tests должны учитывать особенности v3.

---

## 1. Ключевой вывод

Текущий общий handoff можно использовать, но Gemini должен внести v3-specific изменения до реализации.

`eleven_v3` даёт более выразительную речь, высокую эмоциональность, audio tags, 70+ языков и natural multi-speaker dialogue, но у него есть критическое ограничение: request stitching недоступен. Поэтому нельзя строить long-form consistency для v3 на `previous_request_ids` / `next_request_ids`.

Для v3 нужно реализовать отдельную стратегию стабильности:

1. Fixed `voice_id`.
2. Fixed `model_id: "eleven_v3"`.
3. Fixed `seed`.
4. Fixed `voice_settings`, особенно `stability`.
5. Neutral / robust voice choice for stable narration.
6. Meaningful chunking by scene/paragraph, not arbitrary character count.
7. Optional `previous_text` / `next_text` context fields if supported by the endpoint response behavior.
8. v3 audio tags and punctuation editor.
9. A/B take comparison, because v3 may be more variable than v2/v2.5.
10. Explicit UI warning: “v3 does not support request-id stitching; use seed + stability + text context + careful chunking”.

---

## 2. Product modes

The UI should have at least three generation modes:

### Mode A — v3 Expressive TTS

Default for the user's intended workflow.

```json
{
  "model_id": "eleven_v3",
  "seed": 123456789,
  "voice_settings": {
    "stability": 0.55,
    "similarity_boost": 0.8,
    "style": 0.2,
    "use_speaker_boost": true,
    "speed": 1.0
  },
  "apply_text_normalization": "auto"
}
```

Use for:
- expressive narration;
- character voiceovers;
- emotional speech;
- short-to-medium TTS;
- dialogue-like monologues;
- public demo of the open-source tool.

UI behavior:
- show audio tag helper;
- show v3 stability mode descriptions: Creative / Natural / Robust;
- disable request-id stitching controls;
- keep `seed` visible and lockable;
- keep `previous_text` / `next_text` as experimental continuity fields, but not as guaranteed stitching;
- encourage A/B takes.

### Mode B — v3 Dialogue

Use Text to Dialogue API, not just plain Text to Speech, when the user wants multiple speakers.

Features:
- speaker rows: `speaker_name`, `voice_id`, `text`;
- up to the API-supported unique voice count;
- audio tags per line;
- seed;
- shared model settings;
- export mixed audio + metadata.

UI behavior:
- separate tab: `/dialogue` or `/tts?mode=dialogue`;
- do not fake multi-speaker dialogue inside single-speaker TTS unless user explicitly chooses that experimental mode.

### Mode C — Stable Long-form v2

Fallback mode for audiobook-style long-form where chunk continuity is more important than v3 expressiveness.

```json
{
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.75,
    "similarity_boost": 0.9,
    "style": 0.05,
    "use_speaker_boost": true,
    "speed": 1.0
  }
}
```

Use for:
- very long text;
- repeatable production pipeline;
- request stitching with `previous_request_ids` / `next_request_ids`;
- cases where voice drift between chunks is unacceptable.

---

## 3. UI changes required for v3

### 3.1 Model-aware controls

When `model_id === "eleven_v3"`:

- Disable `previous_request_ids` and `next_request_ids` fields.
- Show a warning: “Request stitching is not available for Eleven v3.”
- Keep `seed`, `stability`, `similarity_boost`, `style`, `speaker_boost`, `speed`, output format and normalization controls.
- Show an “Audio Tags” panel.
- Show a “Prompt Enhance” panel that inserts tags without rewriting the user’s actual speech text.
- Show a “Robust / Natural / Creative” stability helper.
- Show “Generate 3 takes” / “A-B compare” because v3 is expressive and may vary.

When `model_id !== "eleven_v3"`:

- Enable request stitching if the model supports it.
- Hide or de-emphasize v3 audio tag helper.
- Keep normal sliders.

### 3.2 v3 audio tag helper

Add a side panel with insert buttons:

```txt
Emotion:
[happy]
[sad]
[excited]
[angry]
[annoyed]
[thoughtful]
[surprised]
[curious]
[sarcastic]

Voice/non-verbal:
[laughs]
[laughing]
[chuckles]
[whispers]
[sighs]
[exhales]
[clears throat]
[inhales deeply]
[short pause]
[long pause]

Experimental:
[strong French accent]
[sings]
```

Rules:
- Tags should describe audible vocal delivery.
- Do not add visual-only tags like `[standing]`, `[grinning]`, `[walking]`.
- Do not insert `[music]` into TTS enhancement; use sound/music endpoints separately if later implemented.
- Do not rewrite user text when enhancing; only insert tags, capitalization, punctuation and pauses.

### 3.3 Punctuation helper

For v3, add simple helpers:

```txt
…    adds pause/weight
—    short dramatic pause
CAPS increases emphasis
new paragraph changes rhythm
```

Do not promise exact timing. This is model steering, not deterministic editing.

### 3.4 IPA / pronunciation support

For v3, support inline IPA syntax:

```txt
"/ˌbaɪoʊˈkemɪstri/"
```

UI feature:
- “Insert IPA pronunciation” helper.
- “Project pronunciation notes” panel.
- Keep pronunciation dictionaries too, but document that v3 has native IPA support while consistency is still not perfect.

---

## 4. Payload builder rules

### 4.1 v3 TTS payload

```ts
function buildTtsPayload(input: TtsGenerateInput) {
  const isV3 = input.model_id === "eleven_v3";

  const payload: Record<string, unknown> = {
    text: input.text,
    model_id: input.model_id,
    language_code: input.language_code || undefined,
    seed: input.seed ?? undefined,
    voice_settings: {
      stability: input.stability,
      similarity_boost: input.similarity_boost,
      style: input.style,
      use_speaker_boost: input.use_speaker_boost,
      speed: input.speed,
    },
    pronunciation_dictionary_locators: input.pronunciation_dictionary_locators?.length
      ? input.pronunciation_dictionary_locators
      : undefined,
    apply_text_normalization: input.apply_text_normalization || "auto",
  };

  if (isV3) {
    // Request stitching is not available for eleven_v3.
    // Do not send previous_request_ids / next_request_ids.
    payload.previous_text = input.previous_text || undefined;
    payload.next_text = input.next_text || undefined;
  } else {
    payload.previous_request_ids = input.previous_request_ids?.slice(0, 3) || undefined;
    payload.next_request_ids = input.next_request_ids?.slice(0, 3) || undefined;
    payload.previous_text = input.previous_text || undefined;
    payload.next_text = input.next_text || undefined;
  }

  return payload;
}
```

### 4.2 Hard validation

```ts
if (model_id === "eleven_v3" && previous_request_ids?.length) {
  throw new Error("Eleven v3 does not support request stitching via previous_request_ids.");
}

if (model_id === "eleven_v3" && next_request_ids?.length) {
  throw new Error("Eleven v3 does not support request stitching via next_request_ids.");
}
```

### 4.3 Save v3 metadata

Every generation should store:

```ts
{
  model_id: "eleven_v3",
  seed,
  stability_mode_label: "creative" | "natural" | "robust" | null,
  audio_tags_detected: string[],
  text_has_ipa: boolean,
  previous_text_used: boolean,
  next_text_used: boolean,
  request_stitching_used: false,
  request_id_from_header: string | null,
  generation_take_group_id: string | null,
  take_index: number | null
}
```

---

## 5. Stability presets for v3

### v3 Creative

```json
{
  "name": "v3 Creative / expressive",
  "model_id": "eleven_v3",
  "stability": 0.35,
  "similarity_boost": 0.75,
  "style": 0.35,
  "use_speaker_boost": true,
  "speed": 1.0
}
```

Use for expressive, emotional, dramatic lines. Risk: more hallucinations / artifacts / inconsistency.

### v3 Natural

```json
{
  "name": "v3 Natural / balanced",
  "model_id": "eleven_v3",
  "stability": 0.55,
  "similarity_boost": 0.8,
  "style": 0.2,
  "use_speaker_boost": true,
  "speed": 1.0
}
```

Use as default for most v3 work.

### v3 Robust

```json
{
  "name": "v3 Robust / stable",
  "model_id": "eleven_v3",
  "stability": 0.8,
  "similarity_boost": 0.9,
  "style": 0.05,
  "use_speaker_boost": true,
  "speed": 1.0
}
```

Use when the user wants less drift and fewer surprises. Risk: less responsive to expressive tags.

---

## 6. Chunking strategy for v3

Do not use the same long-form strategy as v2 stitching.

For `eleven_v3`:

1. Split by scenes / paragraphs / natural speech blocks.
2. Avoid arbitrary cuts in the middle of an emotional phrase.
3. Keep recurring speaker/character context in text if needed.
4. Store previous and next chunk text.
5. Offer “Generate with surrounding context” mode using `previous_text` and `next_text` where appropriate.
6. Offer “Generate N takes” for each chunk.
7. Let the user select the best take and mark it as approved.
8. Export approved takes in order.

UI labels:

```txt
v3 does not support request stitching. For continuity, this app uses locked seed, fixed voice settings, careful chunking, optional surrounding text context, and take approval.
```

---

## 7. Tests Gemini must add

1. Selecting `eleven_v3` disables request stitching controls.
2. API payload for `eleven_v3` never includes `previous_request_ids` or `next_request_ids`.
3. API payload for non-v3 can include max 3 previous/next request ids.
4. v3 audio tag enhancer preserves original words and only adds tags/punctuation/emphasis.
5. v3 tag enhancer rejects visual-only tags like `[walking]`, `[standing]`, `[grinning]`, `[music]`.
6. Seed validation allows `0` and `4294967295`, rejects values outside range.
7. A/B take group stores multiple generations with same text/settings and different or same seed depending on selected mode.
8. Export approved v3 chunks preserves order.

---

## 8. Revised master instruction for Gemini

Use this addition on top of the main handoff:

```txt
Important correction: the user specifically wants ElevenLabs third-generation voices. Treat eleven_v3 as a first-class default mode, not as a secondary short-preset only.

Implement model-aware behavior:
- v3 Expressive TTS mode as the main workflow.
- v3 Dialogue mode using Text to Dialogue API for multi-speaker work.
- Stable Long-form v2 mode as fallback when request stitching is required.

For eleven_v3:
- default model_id should be eleven_v3 in the main expressive UI;
- seed must be lockable and saved;
- stability is the most important v3 control;
- show Creative / Natural / Robust helper presets;
- show audio tag inserter and prompt enhancer;
- support punctuation/emphasis helpers;
- support inline IPA helper;
- disable previous_request_ids / next_request_ids because request stitching is not available for eleven_v3;
- do not remove chunking, but use v3-safe chunking: paragraph/scene splitting, previous_text/next_text context if useful, multiple takes, approval workflow;
- store full metadata for reproducibility.

Do not promise deterministic identity. Seed is best-effort only. For production, expose A/B take comparison and approved-take export.
```

---

## 9. Implementation priority patch

Change MVP order:

1. BYOK key handling.
2. Voice/model loading.
3. Basic `eleven_v3` TTS generation.
4. Seed lock + v3 Natural/Creative/Robust presets.
5. History and audio storage.
6. Audio tag helper.
7. Prompt enhancer for v3 tags.
8. A/B takes and approved take selection.
9. Generate with timestamps.
10. v3 Dialogue mode.
11. Stable long-form v2 mode with request stitching.
12. Cloud deploy/storage adapters.

This order better matches the user's real goal: immediate practical work with ElevenLabs v3 voices, not a generic TTS dashboard that happens to support v3.
