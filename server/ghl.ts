/**
 * Server-side GHL API client.
 * Replicates n8n workflow: search conversation → get messages → get history.
 * Sends WhatsApp messages with real file attachments (PDF + audio).
 */

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';

function token() {
  const t = process.env.VITE_GHL_API_TOKEN;
  if (!t) throw new Error('VITE_GHL_API_TOKEN not set in .env');
  return t;
}

function locationId() {
  const id = process.env.VITE_GHL_LOCATION_ID;
  if (!id) throw new Error('VITE_GHL_LOCATION_ID not set in .env');
  return id;
}

function jsonHeaders() {
  return {
    Authorization: `Bearer ${token()}`,
    Version: GHL_VERSION,
    'Content-Type': 'application/json',
  };
}

async function ghlFetch(path: string) {
  const res = await fetch(`${GHL_BASE}${path}`, { headers: jsonHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<any>;
}

// ─────────────────────────────────────────
// Conversation extraction (replicates n8n)
// ─────────────────────────────────────────

async function fetchConversationId(contactId: string): Promise<string> {
  const data = await ghlFetch(
    `/conversations/search?locationId=${locationId()}&contactId=${contactId}`
  );
  const convs = data.conversations ?? data;
  if (!convs?.length) throw new Error(`No conversation found for contactId=${contactId}`);
  return convs[0].id as string;
}

async function fetchMessages(conversationId: string): Promise<any[]> {
  const data = await ghlFetch(`/conversations/${conversationId}/messages?limit=50`);
  return data.messages?.messages ?? data.messages ?? [];
}

async function fetchConversationHistory(messageId: string): Promise<string | null> {
  try {
    const data = await ghlFetch(
      `/conversation-ai/generations?messageId=${messageId}&source=conversation`
    );
    return data?.history ?? null;
  } catch {
    return null;
  }
}

function buildTranscript(messages: any[]): string {
  return messages
    .filter((m: any) => m.body || m.message)
    .map((m: any) => {
      const role = m.direction === 'inbound' ? 'Cliente' : 'Asesor';
      const text = m.body || m.message || '';
      const ts = m.dateAdded ? new Date(m.dateAdded).toLocaleString('es-MX') : '';
      return `[${ts}] ${role}: ${text}`;
    })
    .join('\n');
}

/**
 * Fetch the phone number associated with a GHL contact.
 * Returns digits only (e.g. "573001234567") ready for Evolution API.
 */
export async function fetchContactPhone(contactId: string): Promise<string> {
  const data = await ghlFetch(`/contacts/${contactId}`);
  const contact = data.contact ?? data;
  const raw: string | undefined =
    contact.phone ?? contact.phone1 ?? contact.phoneNumber ?? contact.mobilePhone;
  if (!raw) throw new Error(`No phone number found for contactId=${contactId}`);
  const digits = raw.replace(/\D/g, '');
  console.log(`[GHL] Contact ${contactId} → phone=${digits}`);
  return digits;
}

export async function extractConversationFromGHL(contactId: string): Promise<string> {
  console.log(`[GHL] Extracting conversation for contact=${contactId}`);
  const convId = await fetchConversationId(contactId);
  console.log(`[GHL] conversationId=${convId}`);

  const messages = await fetchMessages(convId);
  if (!messages.length) throw new Error('No messages found in conversation');

  const lastMsgId = messages[messages.length - 1]?.id;
  let transcript: string | null = null;
  if (lastMsgId) transcript = await fetchConversationHistory(lastMsgId);

  if (!transcript) {
    console.log('[GHL] Falling back to raw message transcript');
    transcript = buildTranscript(messages);
  }

  console.log(`[GHL] Transcript: ${transcript.length} chars`);
  return transcript;
}

// ─────────────────────────────────────────
// Media Library upload
// ─────────────────────────────────────────

/**
 * Upload a file to the GHL Media Library (permanent library, visible in GHL UI).
 * Endpoint: POST /medias/upload-file
 * Returns the hosted URL.
 */
export async function uploadToMediaLibrary(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append('file', blob, filename);
  formData.append('locationId', locationId());

  const res = await fetch(`${GHL_BASE}/medias/upload-file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      Version: '2021-07-28',
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GHL media library upload failed: ${res.status} ${err}`);
  }

  const data = await res.json() as any;
  const url = data?.url ?? data?.fileUrl ?? data?.data?.url ?? data?.uploadedFiles?.[0]?.url;
  if (!url) throw new Error(`GHL media library upload returned no URL: ${JSON.stringify(data)}`);
  console.log(`[GHL] Media library: ${filename} → ${url}`);
  return url as string;
}

// ─────────────────────────────────────────
// Contact custom field update
// ─────────────────────────────────────────

/**
 * Update the contact custom field "Entregable de Radar" with the given value.
 * Field ID: 8uK48ZfGOoiD2T2u4H8P (queried from GHL schema 2026-03-26)
 */
export async function updateContactEntregable(contactId: string, value: string): Promise<void> {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({
      customFields: [
        { id: '8uK48ZfGOoiD2T2u4H8P', field_value: value },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GHL contact field update failed: ${res.status} ${err}`);
  }

  console.log(`[GHL] Contact ${contactId} → "Entregable de Radar" = ${value}`);
}

// ─────────────────────────────────────────
// File upload to GHL (for attachments)
// ─────────────────────────────────────────

/**
 * Upload a file buffer to GHL and return the hosted URL.
 * GHL supports up to 5 MB per file.
 * Endpoint: POST /conversations/messages/upload
 */
export async function uploadFileToGHL(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  conversationId: string,
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append('fileAttachment', blob, filename);
  formData.append('conversationId', conversationId);

  const res = await fetch(`${GHL_BASE}/conversations/messages/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      Version: GHL_VERSION,
      // Note: Do NOT set Content-Type here — fetch sets it automatically with boundary for multipart
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GHL file upload failed: ${res.status} ${err}`);
  }

  const data = await res.json() as any;
  // GHL returns { uploadedFiles: [{ url: "..." }] } or similar
  const url = data?.uploadedFiles?.[0]?.url
    ?? data?.url
    ?? data?.fileUrl;

  if (!url) throw new Error(`GHL upload returned no URL: ${JSON.stringify(data)}`);
  console.log(`[GHL] Uploaded ${filename} → ${url}`);
  return url as string;
}

// ─────────────────────────────────────────
// Send WhatsApp messages with attachments
// ─────────────────────────────────────────

async function sendMessage(payload: Record<string, any>): Promise<void> {
  const res = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GHL send message failed: ${res.status} ${err}`);
  }
}

/**
 * Upload a file to GHL and send it as a WhatsApp attachment.
 * Flow: upload file → get GHL-hosted URL → send message with attachments:[ghlUrl]
 */
async function uploadAndSend(
  contactId: string,
  convId: string,
  buffer: Buffer,
  filename: string,
  mimeType: string,
  caption: string,
): Promise<void> {
  const ghlUrl = await uploadFileToGHL(buffer, filename, mimeType, convId);
  await sendMessage({
    type: 'WhatsApp',
    contactId,
    conversationId: convId,
    locationId: locationId(),
    message: caption,
    attachments: [ghlUrl],
  });
}

export async function sendDeliverable(
  contactId: string,
  kit: any,
  pdfBuffer: Buffer,
  voiceBuffers: Record<string, Buffer>,
  _slug?: string,
): Promise<void> {
  const score = kit.score?.total ?? '?';
  const fit = kit.fit_sixteam ?? '?';
  const empresa = kit.empresa ?? 'tu empresa';
  const recomendacion = kit.recomendacion ?? '';
  const dolores = (kit.dolores_prioritarios ?? [])
    .slice(0, 3)
    .map((d: any, i: number) => `${i + 1}. ${d.dolor}`)
    .join('\n');

  const convId = await fetchConversationId(contactId);
  const loc = locationId();
  const safe = empresa.replace(/\s+/g, '-').slice(0, 30);
  const pdfFilename = `diagnostico-${safe}.pdf`;

  // Upload PDF to GHL Media Library and update contact field
  console.log('[GHL] Uploading PDF to media library...');
  let pdfLibraryUrl: string | null = null;
  try {
    pdfLibraryUrl = await uploadToMediaLibrary(pdfBuffer, pdfFilename, 'application/pdf');
    await updateContactEntregable(contactId, pdfLibraryUrl);
    console.log('[GHL] Contact field "Entregable de Radar" updated');
  } catch (err: any) {
    console.error('[GHL] Media library / contact field update failed:', err?.message ?? err);
  }

  // Upload voice notes to GHL Media Library
  console.log('[GHL] Uploading voice notes to media library...');
  for (const [key, buf] of Object.entries(voiceBuffers)) {
    try {
      await uploadToMediaLibrary(buf, `nota-${key}-${safe}.mp3`, 'audio/mpeg');
    } catch (err: any) {
      console.error(`[GHL] Media library upload failed for voice ${key}:`, err?.message ?? err);
    }
  }

  // Message 1: plain text summary (no markdown — WhatsApp doesn't render it from API)
  console.log('[GHL] Sending summary...');
  await sendMessage({
    type: 'WhatsApp',
    contactId,
    conversationId: convId,
    locationId: loc,
    message:
      `Diagnostico RevOps - ${empresa}\n\n` +
      `Score: ${score}/100\n` +
      `Fit Sixteam: ${fit}\n` +
      `Recomendacion: ${recomendacion}\n\n` +
      `Dolores detectados:\n${dolores}\n\n` +
      `Te enviamos tu reporte PDF y 3 notas de voz.`,
  });
  await new Promise(r => setTimeout(r, 2000));

  // Message 2: PDF as attachment
  console.log('[GHL] Uploading and sending PDF...');
  await uploadAndSend(
    contactId, convId,
    pdfBuffer,
    pdfFilename,
    'application/pdf',
    'Reporte completo - Plan de accion con tecnologia e IA',
  );
  await new Promise(r => setTimeout(r, 2000));

  // Messages 3-5: voice notes as attachments
  const vozTitles: Record<string, string> = {
    resultado:    'Nota de voz 1 - Resultado del diagnostico',
    propuesta:    'Nota de voz 2 - Propuesta del siguiente paso',
    reactivacion: 'Nota de voz 3 - Mensaje de reactivacion',
  };

  for (const [key, buf] of Object.entries(voiceBuffers)) {
    console.log(`[GHL] Uploading and sending voice: ${key}...`);
    await uploadAndSend(
      contactId, convId,
      buf,
      `nota-${key}-${safe}.mp3`,
      'audio/mpeg',
      vozTitles[key] ?? `Nota de voz ${key}`,
    );
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('[GHL] All deliverables sent successfully');
}
