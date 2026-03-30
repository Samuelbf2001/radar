import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { generateAllVoices } from '../server/voices.js';
import { generatePdf } from '../server/pdf.js';
import { sendDeliverable } from '../server/evolution.js';

dotenv.config();

async function main() {
  const generatedDir = path.join(process.cwd(), 'generated');
  if (!fs.existsSync(generatedDir)) {
    console.error('Generated directory not found');
    return;
  }
  
  const jobs = fs.readdirSync(generatedDir)
    .filter(d => fs.statSync(path.join(generatedDir, d)).isDirectory())
    .sort()
    .reverse();

  if (jobs.length === 0) {
    console.error('No jobs found in generated/');
    return;
  }

  const latestJobSlug = jobs[0];
  const dataPath = path.join(generatedDir, latestJobSlug, 'data.json');
  console.log(`[Regen] Using data from: ${latestJobSlug}`);

  if (!fs.existsSync(dataPath)) {
    console.error(`data.json not found in ${latestJobSlug}`);
    return;
  }

  const kit = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const phone = '573002408743';

  console.log(`\n[Regen] Regenerating voice notes for ${phone}...`);
  const voiceBuffers = await generateAllVoices(kit.notas_de_voz);

  console.log('\n[Regen] Regenerating PDF...');
  const pdfBuffer = await generatePdf(kit);

  console.log(`\n[Regen] Sending full deliverable to ${phone} via Evolution API...`);
  await sendDeliverable(phone, kit, pdfBuffer, voiceBuffers);

  console.log('\n✅ DONE! Result regenerated and sent successfully.');
}

main().catch(err => {
  console.error('\n❌ ERROR:', err.message || err);
  process.exit(1);
});
