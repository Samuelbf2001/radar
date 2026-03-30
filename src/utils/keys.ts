export function getAnthropicKey(): string {
  return import.meta.env.VITE_ANTHROPIC_KEY || localStorage.getItem('anthropic_key') || '';
}

export function getElevenLabsKey(): string {
  return import.meta.env.VITE_ELEVENLABS_KEY || localStorage.getItem('eleven_key') || '';
}

export function getGhlToken(): string {
  return import.meta.env.VITE_GHL_API_TOKEN || '';
}

export function getGhlLocationId(): string {
  return import.meta.env.VITE_GHL_LOCATION_ID || '';
}
