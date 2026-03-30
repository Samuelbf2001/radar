/**
 * Full automatic pipeline:
 * 1. Extract conversation from GHL
 * 2. Claude Step 1: signal extraction
 * 3. Claude Step 2: full diagnostic kit (with web_search tool)
 * 4. Generate 3 voice notes (ElevenLabs)
 * 5. Generate PDF (Puppeteer)
 * 6. Save all files to disk
 * 7. Send deliverables via Evolution API (WhatsApp)
 */

import fs from 'fs';
import path from 'path';
import { extractConversationFromGHL, fetchContactPhone, uploadToMediaLibrary, updateContactEntregable } from './ghl.js';
import { sendDeliverable as sendDeliverableViaEvolution } from './evolution.js';

const LOG_FILE = path.join(process.cwd(), 'server.log');
function log(...args: any[]) {
  const msg = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ')}`;
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}
import { generateAllVoices, VOZ_FILENAMES } from './voices.js';
import { generatePdf } from './pdf.js';
import { SYSTEM_PROMPT } from '../src/constants/radar.js';
import type { DiagnosticoResult } from '../src/types/diagnostico.js';

const CLAUDE_MODEL = 'claude-opus-4-6';
const ANTHROPIC_BASE = 'https://api.anthropic.com/v1/messages';

function anthropicHeaders() {
  const key = process.env.VITE_ANTHROPIC_KEY;
  if (!key) throw new Error('VITE_ANTHROPIC_KEY not set in .env');
  return {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'interleaved-thinking-2025-05-14',
    'Content-Type': 'application/json',
  };
}

/** Simple one-shot call — no tools */
async function claudeCall(systemPrompt: string, userContent: string, maxTokens: number): Promise<string> {
  const res = await fetch(ANTHROPIC_BASE, {
    method: 'POST',
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err}`);
  }

  const data = await res.json() as any;
  return data.content?.[0]?.text ?? '';
}


function parseJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in Claude response');
  return JSON.parse(match[0]) as T;
}

/** Single-pass: analyze transcript and generate full diagnostic kit */
async function generarKit(transcript: string): Promise<DiagnosticoResult> {
  log('[Pipeline] Generating full diagnostic kit (single-pass)...');
  const text = await claudeCall(SYSTEM_PROMPT, `TRANSCRIPCIÓN DE LA CONVERSACIÓN:\n\n${transcript}`, 64000);
  return parseJson<DiagnosticoResult>(text);
}

/** Save all generated files to disk and return the output directory */
function saveFiles(slug: string, kit: DiagnosticoResult, pdfBuffer: Buffer, voiceBuffers: Record<string, Buffer>): string {
  const outputDir = path.join(process.cwd(), 'generated', slug);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'entregable.pdf'), pdfBuffer);
  log(`[Pipeline] PDF saved (${pdfBuffer.length} bytes)`);

  for (const [key, buf] of Object.entries(voiceBuffers)) {
    const filename = VOZ_FILENAMES[key as keyof typeof VOZ_FILENAMES];
    fs.writeFileSync(path.join(outputDir, filename), buf);
    log(`[Pipeline] Voice ${key} saved (${buf.length} bytes)`);
  }

  fs.writeFileSync(path.join(outputDir, 'data.json'), JSON.stringify(kit, null, 2));

  return outputDir;
}

export interface PipelineInput {
  contactId: string;
  transcript?: string;
  phone?: string;
}

export interface PipelineResult {
  slug: string;
  kit: DiagnosticoResult;
  outputDir: string;
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { contactId } = input;
  const slug = `${Date.now()}-${contactId.slice(-6)}`;

  log(`====== PIPELINE START | contact=${contactId} | slug=${slug} ======`);

  // 0. Extract conversation
  let transcript = input.transcript;
  if (!transcript) {
    transcript = await extractConversationFromGHL(contactId);
  }

  // 1. Full kit generation — single-pass analysis
  const kit = await generarKit(transcript);
  kit.empresa = kit.empresa || `Empresa-${slug}`;

  // 3. Voice notes
  log('[Pipeline] Step 3: generating voice notes...');
  const voiceBuffers = await generateAllVoices(kit.notas_de_voz as any);

  // 4. PDF
  log('[Pipeline] Step 4: generating PDF...');
  const pdfBuffer = await generatePdf(kit);

  // 5. Save to disk
  const outputDir = saveFiles(slug, kit, pdfBuffer, voiceBuffers);

  // Build meta and save
  const phone = input.phone || await fetchContactPhone(contactId);
  fs.writeFileSync(path.join(outputDir, 'meta.json'), JSON.stringify({
    contactId,
    phone,
    sent: false,
    createdAt: new Date().toISOString()
  }, null, 2));

  log(`[Pipeline] Saved for review. Waiting for manual approval on dashboard.`);
  log(`====== PIPELINE DONE | slug=${slug} ======`);

  return { slug, kit, outputDir };
}

export async function sendDeliverables(slug: string) {
  const outputDir = path.join(process.cwd(), 'generated', slug);
  if (!fs.existsSync(outputDir)) throw new Error('Job folder not found');

  const metaPath = path.join(outputDir, 'meta.json');
  const dataPath = path.join(outputDir, 'data.json');
  const pdfPath = path.join(outputDir, 'entregable.pdf');

  // Si no hay meta.json (versiones antiguas), se podría fallar. Asumimos flujos nuevos.
  if (!fs.existsSync(metaPath)) throw new Error(`meta.json no encontrado para el job ${slug}. No se puede enviar.`);
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  if (meta.sent) throw new Error(`El job ${slug} ya ha sido enviado anteriormente.`);

  const kit: DiagnosticoResult = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  const voiceBuffers: Record<string, Buffer> = {};
  for (const key of Object.keys(VOZ_FILENAMES)) {
    const vPath = path.join(outputDir, VOZ_FILENAMES[key as keyof typeof VOZ_FILENAMES]);
    if (fs.existsSync(vPath)) {
      voiceBuffers[key] = fs.readFileSync(vPath);
    }
  }

  const { contactId, phone } = meta;

  // 6. Upload PDF to GHL Media Library
  log(`[Pipeline ${slug}] Step 6: uploading to GHL Media Library...`);
  const pdfUrl = await uploadToMediaLibrary(pdfBuffer, `radar-${slug}.pdf`, 'application/pdf');
  await updateContactEntregable(contactId, pdfUrl);
  log(`[Pipeline] GHL Media Library upload SUCCESS → ${pdfUrl}`);

  // 7. Send via Evolution API
  log(`[Pipeline ${slug}] Step 7: sending deliverables via Evolution API to ${phone}...`);
  await sendDeliverableViaEvolution(phone, kit, pdfBuffer, voiceBuffers);
  log('[Pipeline] Evolution send SUCCESS');

  // Mark sent
  meta.sent = true;
  meta.sentAt = new Date().toISOString();
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  log(`====== DELIVERY DONE | slug=${slug} ======`);
}

export async function updateDeliverables(slug: string, newKit: DiagnosticoResult) {
  const outputDir = path.join(process.cwd(), 'generated', slug);
  if (!fs.existsSync(outputDir)) throw new Error('Job folder not found');

  const dataPath = path.join(outputDir, 'data.json');
  
  // Re-generate PDF with the updated details
  log(`[Pipeline ${slug}] Regenerando PDF tras edición...`);
  const pdfBuffer = await generatePdf(newKit);
  
  // Guardar nuevo PDF y data.json
  fs.writeFileSync(path.join(outputDir, 'entregable.pdf'), pdfBuffer);
  fs.writeFileSync(dataPath, JSON.stringify(newKit, null, 2));
  
  // Nota: Las notas de voz no se regeneran aquí automáticamente para evitar costos excesivos de ElevenLabs.
  // Solo se regenera el PDF con la data editada.
  
  log(`[Pipeline] ${slug} editado exitosamente.`);
}
