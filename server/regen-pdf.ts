/**
 * Regenera el PDF de un slug existente con el diseño actual.
 * Usage: npx tsx server/regen-pdf.ts [slug] [phone?]
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import { generatePdf } from './pdf.js';
import { generateAllVoices } from './voices.js';
import { sendDeliverable } from './evolution.js';

const slug  = process.argv[2] ?? '1774400850925-IUicBw';
const phone = process.argv[3];

const dir = path.join(process.cwd(), 'generated', slug);
if (!fs.existsSync(dir)) {
  console.error(`❌ Slug not found: ${dir}`);
  process.exit(1);
}

const kit = JSON.parse(fs.readFileSync(path.join(dir, 'data.json'), 'utf8'));
console.log(`\n🔄 Regenerando PDF para ${kit.empresa} | score: ${kit.score?.total}`);

const buf = await generatePdf(kit);
fs.writeFileSync(path.join(dir, 'entregable.pdf'), buf);
console.log(`✅ PDF escrito: ${buf.length} bytes`);

if (phone) {
  console.log(`\n🎙️ Generando notas de voz frescas...`);
  const voiceBuffers = await generateAllVoices(kit.notas_de_voz);
  console.log(`✅ Voces generadas: ${Object.keys(voiceBuffers).join(', ')}`);

  // Guardar en disco
  for (const [key, audioBuf] of Object.entries(voiceBuffers)) {
    const filename = key === 'resultado' ? 'nota-resultado.mp3' : 'nota-propuesta.mp3';
    fs.writeFileSync(path.join(dir, filename), audioBuf as Buffer);
  }

  console.log(`\n📤 Enviando a ${phone}...`);
  await sendDeliverable(phone, kit, buf, voiceBuffers as Record<string, Buffer>);
  console.log('✅ Enviado');
}
