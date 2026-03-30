/**
 * Server-side ElevenLabs TTS generation.
 * Generates the 3 voice notes from the kit's notas_de_voz scripts.
 */

const ELEVEN_BASE = 'https://api.elevenlabs.io';
const VOICE_SETTINGS = { stability: 0.15, similarity_boost: 0.82, style: 0.38, use_speaker_boost: true };
const DEFAULT_VOICE_ID = '2lPPaIyyWkdwYKw3bILQ'; // Samuel CEO Sixteam

export const VOZ_KEYS = ['resultado', 'propuesta'] as const;
export type VozKey = typeof VOZ_KEYS[number];

export const VOZ_FILENAMES: Record<VozKey, string> = {
  resultado: 'nota-resultado.mp3',
  propuesta: 'nota-propuesta.mp3',
};

export async function generateVoice(text: string): Promise<Buffer> {
  const key = process.env.VITE_ELEVENLABS_KEY;
  if (!key) throw new Error('VITE_ELEVENLABS_KEY not set in .env');

  const voiceId = process.env.VITE_ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

  const res = await fetch(
    `${ELEVEN_BASE}/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        language_code: 'es',
        voice_settings: VOICE_SETTINGS,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${err}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Generate all voice notes, returns map of key → Buffer */
export async function generateAllVoices(
  notas: Record<string, { guion: string; titulo: string }>,
): Promise<Record<VozKey, Buffer>> {
  const result = {} as Record<VozKey, Buffer>;

  for (const key of VOZ_KEYS) {
    const nota = notas[key];
    if (!nota?.guion) {
      console.warn(`[Voices] No guion for ${key}, skipping`);
      continue;
    }
    console.log(`[Voices] Generating ${key} (${nota.titulo})...`);
    result[key] = await generateVoice(nota.guion);
    console.log(`[Voices] ${key} done (${result[key].length} bytes)`);
    // Small delay between ElevenLabs calls to avoid rate limiting
    await new Promise(r => setTimeout(r, 800));
  }

  return result;
}
