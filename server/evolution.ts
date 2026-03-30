/**
 * Evolution API client — sends WhatsApp messages via self-hosted Evolution API.
 * Replaces GHL WhatsApp sending for deliverables.
 *
 * Required env vars:
 *   EVOLUTION_API_URL      e.g. https://evo.tudominio.com
 *   EVOLUTION_API_KEY      Global API key
 *   EVOLUTION_INSTANCE     Instance name (e.g. "sixteam")
 */

function evoBase() {
  const url = process.env.EVOLUTION_API_URL;
  if (!url) throw new Error('EVOLUTION_API_URL not set in .env');
  return url.replace(/\/$/, '');
}

function evoKey() {
  const k = process.env.EVOLUTION_API_KEY;
  if (!k) throw new Error('EVOLUTION_API_KEY not set in .env');
  return k;
}

function evoInstance() {
  const i = process.env.EVOLUTION_INSTANCE;
  if (!i) throw new Error('EVOLUTION_INSTANCE not set in .env');
  return i;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    apikey: evoKey(),
  };
}

async function evoPost(endpoint: string, body: Record<string, any>): Promise<any> {
  const url = `${evoBase()}${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API ${endpoint} → ${res.status}: ${err}`);
  }

  return res.json();
}

// ─────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────

export async function sendText(phone: string, text: string): Promise<void> {
  const instance = evoInstance();
  console.log(`[EVO] Sending text to ${phone}...`);
  await evoPost(`/message/sendText/${instance}`, {
    number: phone,
    text,
  });
}

export async function sendDocument(
  phone: string,
  buffer: Buffer,
  fileName: string,
  caption: string,
): Promise<void> {
  const instance = evoInstance();
  console.log(`[EVO] Sending document ${fileName} to ${phone}...`);
  await evoPost(`/message/sendMedia/${instance}`, {
    number: phone,
    mediatype: 'document',
    media: buffer.toString('base64'),
    fileName,
    caption,
  });
}

export async function sendAudio(
  phone: string,
  buffer: Buffer,
): Promise<void> {
  const instance = evoInstance();
  console.log(`[EVO] Sending audio to ${phone}...`);
  await evoPost(`/message/sendWhatsAppAudio/${instance}`, {
    number: phone,
    audio: buffer.toString('base64'),
    encoding: true,
  });
}

// ─────────────────────────────────────────
// Full deliverable send
// ─────────────────────────────────────────

export async function sendDeliverable(
  phone: string,
  kit: any,
  pdfBuffer: Buffer,
  voiceBuffers: Record<string, Buffer>,
): Promise<void> {
  const empresa = kit.empresa ?? 'tu empresa';
  const safe = empresa.replace(/\s+/g, '-').slice(0, 30);
  const pdfFilename = `diagnostico-${safe}.pdf`;

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  // 1. Mensaje 1: solución (Claude-generated) — fallback al template si falta
  const msg1 = kit.mensajes_whatsapp?.resultado?.mensaje;
  let mensaje1: string;
  if (msg1) {
    mensaje1 = msg1;
  } else {
    const contacto = kit.contacto ? kit.contacto.split(' ')[0] : null;
    const saludo = contacto ? `Hola ${contacto} 👋` : 'Hola 👋';
    const rutaSolucion = (kit.ruta_solucion ?? '').split('.')[0];
    const siguientePaso = kit.siguiente_paso ?? '';
    mensaje1 =
      `${saludo}\n\n` +
      `Aquí está el resultado del diagnóstico de *${empresa}*.\n\n` +
      `🎯 *Solución recomendada:* ${rutaSolucion}.\n\n` +
      `✅ *Siguiente paso:* ${siguientePaso}\n\n` +
      `Adjunto el reporte completo con el plan de acción.`;
  }

  console.log('[EVO] Sending message 1 (solution)...');
  await sendText(phone, mensaje1);
  await delay(2000);

  // 2. Mensaje 2: plan de acción (Claude-generated)
  const msg2 = kit.mensajes_whatsapp?.propuesta?.mensaje;
  if (msg2) {
    console.log('[EVO] Sending message 2 (plan)...');
    await sendText(phone, msg2);
    await delay(2000);
  }

  // 3. PDF
  console.log('[EVO] Sending PDF...');
  await sendDocument(
    phone,
    pdfBuffer,
    pdfFilename,
    `Tu diagnóstico RevOps — Plan de acción personalizado`,
  );
  await delay(2000);

  // 4-5. Notas de voz (solo resultado + propuesta)
  const vozOrder = ['resultado', 'propuesta'];
  for (const key of vozOrder) {
    const buf = voiceBuffers[key];
    if (!buf) continue;
    console.log(`[EVO] Sending voice note: ${key}...`);
    await sendAudio(phone, buf);
    await delay(2000);
  }

  console.log('[EVO] All deliverables sent successfully');
}
