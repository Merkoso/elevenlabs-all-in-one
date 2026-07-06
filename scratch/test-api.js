const fs = require('fs');
const path = require('path');

const API_KEY = 'sk_ae136464581697895d2297ada2fca3cf59b0652e10f2d935';

async function testConnection() {
  console.log('Testing ElevenLabs API Connection...');
  try {
    // 1. Fetch models list
    const modelsUrl = 'https://api.elevenlabs.io/v1/models';
    const modelsRes = await fetch(modelsUrl, {
      headers: {
        'xi-api-key': API_KEY,
      }
    });

    if (!modelsRes.ok) {
      const errText = await modelsRes.text();
      throw new Error(`Failed to list models (${modelsRes.status}): ${errText}`);
    }

    const models = await modelsRes.json();
    console.log(`Successfully connected! Retrieved ${models.length} models.`);
    const v3Model = models.find(m => m.model_id === 'eleven_v3');
    console.log(`eleven_v3 support present: ${!!v3Model}`);

    // 2. Perform a tiny TTS generation test
    console.log('Generating a tiny speech sample (1 word)...');
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel (default starter voice)
    const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const ttsRes = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Test.',
        model_id: 'eleven_v3',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      })
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      throw new Error(`TTS failed (${ttsRes.status}): ${errText}`);
    }

    const requestId = ttsRes.headers.get('request-id');
    const characterCost = ttsRes.headers.get('character-cost');
    console.log(`TTS request succeeded. Request ID: ${requestId}, Character Cost: ${characterCost}`);

    const buffer = Buffer.from(await ttsRes.arrayBuffer());
    const outDir = path.join(__dirname, '..', 'data', 'audio');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outFile = path.join(outDir, 'test_rachel_v3.mp3');
    fs.writeFileSync(outFile, buffer);
    console.log(`Saved output audio file to: ${path.resolve(outFile)}`);
    console.log('API Test completed successfully!');
  } catch (error) {
    console.error('API Test failed:', error.message);
  }
}

testConnection();
