import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const apiKey = 'sk_ae136464581697895d2297ada2fca3cf59b0652e10f2d935';

console.log('Testing key:', apiKey.substring(0, 10) + '...');
const client = new ElevenLabsClient({ apiKey });

async function run() {
  try {
    console.log('Calling client.voices.search()...');
    const response = await client.voices.search();
    console.log('Success! Voices:', response.voices?.length);
  } catch (err) {
    console.error('Error fetching voices:', err);
  }

  try {
    console.log('Calling client.models.list()...');
    const response = await client.models.list();
    console.log('Success! Models:', response.length);
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

run();
