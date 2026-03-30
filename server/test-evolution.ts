/**
 * Test script: sends deliverable files from a generated slug via Evolution API.
 * Usage: npx tsx server/test-evolution.ts [slug] [phone]
 *
 * Example:
 *   npx tsx server/test-evolution.ts 1774400850925-IUicBw 573009781174
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import { sendDeliverable } from './evolution.js';

const slug  = process.argv[2] ?? '1774400850925-IUicBw';
const phone = process.argv[3] ?? '573009781174';

const dir = path.join(process.cwd(), 'generated', slug);

if (!fs.existsSync(dir)) {
  console.error(`❌ Slug not found: ${dir}`);
  process.exit(1);
}

const kit        = JSON.parse(fs.readFileSync(path.join(dir, 'data.json'), 'utf8'));
const pdfBuffer  = fs.readFileSync(path.join(dir, 'entregable.pdf'));
const voiceBuffers: Record<string, Buffer> = {
  resultado:    fs.readFileSync(path.join(dir, 'nota-resultado.mp3')),
  propuesta:    fs.readFileSync(path.join(dir, 'nota-propuesta.mp3')),
  reactivacion: fs.readFileSync(path.join(dir, 'nota-reactivacion.mp3')),
};

console.log(`\n🚀 Test Evolution API`);
console.log(`   Instance : ${process.env.EVOLUTION_INSTANCE}`);
console.log(`   Base URL : ${process.env.EVOLUTION_API_URL}`);
console.log(`   Phone    : ${phone}`);
console.log(`   Slug     : ${slug}`);
console.log(`   Empresa  : ${kit.empresa} | Score: ${kit.score?.total}\n`);

try {
  await sendDeliverable(phone, kit, pdfBuffer, voiceBuffers);
  console.log('\n✅ All messages sent successfully');
} catch (err: any) {
  console.error('\n❌ Error:', err.message ?? err);
  process.exit(1);
}
