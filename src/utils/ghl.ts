import { getGhlToken, getGhlLocationId } from './keys';

const GHL_BASE = '/api/ghl';

async function ghlFetch(path: string, params?: Record<string, string>): Promise<any> {
  const token = getGhlToken();
  if (!token) throw new Error('No se encontró el token de GoHighLevel. Verifica VITE_GHL_API_TOKEN en .env');

  const url = new URL(`${window.location.origin}${GHL_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const resp = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'Version': '2021-04-15',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`GHL Error ${resp.status}: ${(err as any).message || resp.statusText}`);
  }
  return resp.json();
}

/** Step 1: Search for conversation by contactId */
async function fetchConversationId(contactId: string): Promise<string> {
  const locationId = getGhlLocationId();
  const data = await ghlFetch('/conversations/search', { locationId, contactId });
  const convId = data?.conversations?.[0]?.id;
  if (!convId) throw new Error('No se encontró conversación para este contacto en GHL.');
  return convId;
}

/** Step 2: Fetch messages from conversation */
async function fetchMessages(conversationId: string, contactId: string): Promise<any> {
  const locationId = getGhlLocationId();
  return ghlFetch(`/conversations/${conversationId}/messages`, { locationId, contactId });
}

/** Step 3: Fetch conversation history/generation */
async function fetchConversationHistory(messageId: string): Promise<string> {
  const data = await ghlFetch(`/conversation-ai/generations`, {
    messageId,
    source: 'conversation',
  });
  return data?.history || data?.generation || '';
}

/**
 * Extract full conversation from GHL by contactId.
 * Replicates the n8n workflow: search conv → get messages → get history.
 * Returns the formatted transcript ready for Claude processing.
 */
export async function extractConversationFromGHL(contactId: string): Promise<{
  transcript: string;
  metadata?: { empresa?: string; sector?: string; dolor?: string; urgencia?: string };
}> {
  // Step 1: Find conversation
  const conversationId = await fetchConversationId(contactId);

  // Step 2: Get messages
  const messagesData = await fetchMessages(conversationId, contactId);
  const messages = messagesData?.messages?.messages || messagesData?.messages || [];

  if (!messages.length) throw new Error('La conversación no tiene mensajes.');

  // Step 3: Try to get AI-generated history
  const lastMessageId = messages[0]?.id;
  let transcript = '';

  if (lastMessageId) {
    try {
      transcript = await fetchConversationHistory(lastMessageId);
    } catch {
      // Fallback: build transcript from messages
    }
  }

  // Fallback: build transcript from raw messages
  if (!transcript) {
    transcript = messages
      .reverse()
      .map((m: any) => {
        const role = m.direction === 'inbound' ? 'Lead' : 'Asistente';
        return `${role}: ${m.body || m.text || ''}`;
      })
      .filter((line: string) => line.length > 10)
      .join('\n');
  }

  return { transcript };
}
