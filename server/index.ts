/**
 * Sixteam Radar — Webhook Server
 *
 * Listens for GHL webhooks, runs the full pipeline automatically:
 * GHL conversation → Claude analysis → ElevenLabs voice notes → PDF
 * → Uploads all to GHL → Sends WhatsApp messages to contact
 *
 * Port: 3000 (matches Cloudflare tunnel → backend.automaticpdfhub.cloud)
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { runPipeline, sendDeliverables, updateDeliverables, reprocessDeliverables } from './pipeline.js';

// File-based logger (bypasses stdout buffering)
const LOG_FILE = path.join(process.cwd(), 'server.log');
function log(...args: any[]) {
  const msg = `[${new Date().toISOString()}] ${args.map(a => {
    if (typeof a === 'string') return a;
    if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack}`;
    return JSON.stringify(a, null, 2);
  }).join(' ')}`;
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

// Load .env from project root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

// Serve generated files (PDF + MP3) as static assets
const generatedDir = path.join(process.cwd(), 'generated');
fs.mkdirSync(generatedDir, { recursive: true });
app.use('/entregables', express.static(generatedDir));

// ─── Health check ───────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sixteam-radar-webhook', ts: new Date().toISOString() });
});

// ─── Webhook endpoint ────────────────────────────────────────────────────────

/**
 * GHL sends this webhook when a diagnostic conversation ends.
 * Expected body: { contactId: string, transcript?: string }
 * - contactId: GHL contact ID (used to extract conversation + send results)
 * - transcript: optional pre-extracted transcript (skips GHL extraction step)
 */
app.post('/webhook/ghl', async (req, res) => {
  // Log full payload to identify GHL field names
  log('[Webhook] Raw body:', req.body);

  const body = req.body ?? {};

  // GHL puede enviar el contactId con distintos nombres de campo
  const contactId =
    body.contactId ||
    body.contact_id ||
    body.id ||
    body.contact?.id ||
    body.Contact?.id ||
    body.data?.contactId ||
    body.data?.contact_id ||
    body.payload?.contactId ||
    null;

  // Extraer teléfono del webhook (el agente de IA de GHL lo incluye en el payload)
  const rawPhone: string =
    body.phone ||
    body.phoneNumber ||
    body.mobilePhone ||
    body.contact?.phone ||
    body.contact?.phoneNumber ||
    body.Contact?.phone ||
    body.data?.phone ||
    body.payload?.phone ||
    '';
  const phone = rawPhone ? rawPhone.replace(/\D/g, '') : '';

  const transcript = body.transcript || body.conversation || null;

  if (!contactId) {
    log('[Webhook] contactId not found. Body keys:', Object.keys(body));
    res.status(400).json({ error: 'contactId is required', received_keys: Object.keys(body), body });
    return;
  }

  log(`[Webhook] Received for contactId=${contactId} phone=${phone || '(not in payload — will fetch from GHL)'}`);

  // Respond immediately — processing happens in background
  res.json({ status: 'processing', contactId, phone: phone || null, message: 'Pipeline started' });

  // Run full pipeline in background (don't await)
  runPipeline({ contactId, transcript, phone: phone || undefined })
    .then(result => {
      log(`[Webhook] Pipeline complete: slug=${result.slug}`);
    })
    .catch(err => {
      log(`[Webhook] Pipeline error for contact=${contactId}:`, err);
    });
});

// ─── Dashboard API ────────────────────────────────────────────────────────────

/** GET /api/logs?lines=N — últimas N líneas de server.log */
app.get('/api/logs', (req, res) => {
  try {
    const lines = Math.min(Number(req.query.lines ?? 150), 500);
    if (!fs.existsSync(LOG_FILE)) return void res.json({ lines: [] });
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const all = content.split('\n').filter(Boolean);
    res.json({ lines: all.slice(-lines) });
  } catch {
    res.json({ lines: [] });
  }
});

/** GET /api/jobs — lista todos los entregables generados con metadata */
app.get('/api/jobs', (_req, res) => {
  try {
    if (!fs.existsSync(generatedDir)) return void res.json({ jobs: [] });
    const dirs = fs.readdirSync(generatedDir)
      .filter(d => fs.statSync(path.join(generatedDir, d)).isDirectory())
      .sort()
      .reverse();

    const jobs = dirs.map(slug => {
      const dataPath = path.join(generatedDir, slug, 'data.json');
      const files = fs.readdirSync(path.join(generatedDir, slug));
      let meta: any = {};
      if (fs.existsSync(dataPath)) {
        try { meta = JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch {}
      }
      const metaJsonPath = path.join(generatedDir, slug, 'meta.json');
      let statusMeta: any = {};
      if (fs.existsSync(metaJsonPath)) {
        try { statusMeta = JSON.parse(fs.readFileSync(metaJsonPath, 'utf8')); } catch {}
      }
      const [ts] = slug.split('-');
      const date = ts ? new Date(Number(ts)).toISOString() : null;
      return {
        slug,
        date,
        empresa: meta.empresa ?? null,
        score: meta.score?.total ?? null,
        fit: meta.fit_sixteam ?? null,
        recomendacion: meta.recomendacion ?? null,
        sent: !!statusMeta.sent,
        costo: statusMeta.usage?.cost_usd ?? null,
        files,
      };
    });

    res.json({ jobs });
  } catch (err: any) {
    res.json({ jobs: [], error: err.message });
  }
});

/** GET /api/jobs/:slug — data.json completo de un entregable */
app.get('/api/jobs/:slug', (req, res) => {
  try {
    const dataPath = path.join(generatedDir, req.params.slug, 'data.json');
    if (!fs.existsSync(dataPath)) return void res.status(404).json({ error: 'Not found' });
    res.json(JSON.parse(fs.readFileSync(dataPath, 'utf8')));
  } catch {
    res.status(500).json({ error: 'Error reading job data' });
  }
});

/** POST /api/jobs/:slug/send — envía los entregables ya generados */
app.post('/api/jobs/:slug/send', async (req, res) => {
  try {
    log(`[API] Solicitud de envío para job: ${req.params.slug}`);
    await sendDeliverables(req.params.slug);
    res.json({ success: true });
  } catch (err: any) {
    log(`[API] Error enviando job ${req.params.slug}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/jobs/:slug/update — actualiza data.json y regenera PDF */
app.post('/api/jobs/:slug/update', async (req, res) => {
  try {
    log(`[API] Solicitud de edición para job: ${req.params.slug}`);
    await updateDeliverables(req.params.slug, req.body);
    res.json({ success: true });
  } catch (err: any) {
    log(`[API] Error actualizando job ${req.params.slug}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/jobs/:slug/reprocess — vuelve a correr TODO (Claude, 11Labs, PDF) desde transcript.txt */
app.post('/api/jobs/:slug/reprocess', async (req, res) => {
  try {
    const { version = 'v2' } = req.body;
    log(`[API] Solicitud de REPROCESAMIENTO COMPLETO (${version}) para job: ${req.params.slug}`);
    const newKit = await reprocessDeliverables(req.params.slug, version);
    res.json({ success: true, kit: newKit });
  } catch (err: any) {
    log(`[API] Error reprocesando job ${req.params.slug}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── List generated entregables (legacy) ─────────────────────────────────────

app.get('/entregables', (_req, res) => {
  try {
    const dirs = fs.readdirSync(generatedDir).filter(d =>
      fs.statSync(path.join(generatedDir, d)).isDirectory()
    );
    res.json({ entregables: dirs });
  } catch {
    res.json({ entregables: [] });
  }
});

// ─── Serve Vite frontend in production ─────────────────────────────────────

const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Sixteam Radar Webhook Server`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Tunnel:  https://backend.automaticpdfhub.cloud`);
  console.log(`   Webhook: POST /webhook/ghl`);
  console.log(`   Health:  GET  /health\n`);
});
