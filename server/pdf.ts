/**
 * PDF generation — Radar RevOps diagnostic report.
 * A4 portrait (210×297mm), 5 pages.
 * Structure: Cover → Diagnóstico breve → Solución → Implementación → Cierre
 */

import puppeteer from 'puppeteer';
import type { DiagnosticoResult } from '../src/types/diagnostico.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────



function pageHeader(title: string, empresa: string, fecha: string): string {
  return `
  <div style="background:#0a2342;padding:12px 32px;display:flex;justify-content:space-between;align-items:center">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:3px;height:16px;background:#00bfa5;border-radius:2px"></div>
      <span style="color:#fff;font-size:13px;font-weight:700;font-family:'Poppins',Arial">${title}</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <span style="color:rgba(255,255,255,0.35);font-size:10px;font-family:'Lato',Arial">${empresa} · ${fecha}</span>
      <span style="color:rgba(255,255,255,0.2);font-size:10px;font-family:'Lato',Arial">sixteam.pro</span>
    </div>
  </div>`;
}

/** Inject free-form HTML canvas into a PDF page */
function renderCanvas(html: string, empresa: string, fecha: string): string {
  if (!html) return '';
  return `
<div style="width:210mm">
  ${pageHeader('Análisis y Plan de Trabajo', empresa, fecha)}
  <div class="canvas-content">
    ${html}
  </div>
</div>`;
}

// ─── Main HTML builder ────────────────────────────────────────────────────────

export function buildHtml(kit: DiagnosticoResult): string {
  const fecha    = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Diagnóstico RevOps — ${kit.empresa}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&family=Lato:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Lato', Arial, sans-serif; background: #f7f5ef; color: #1a202c; -webkit-print-color-adjust: exact; }
  .page { width: 210mm; display: flex; flex-direction: column; }
  .section { padding: 24px 32px; background: #f7f5ef; }
  h2 { font-family: 'Poppins', Arial; font-size: 14px; font-weight: 700; color: #0a2342;
       margin-bottom: 10px; display: flex; align-items: center; gap: 7px; text-transform: uppercase; letter-spacing: 0.5px; }
  h2::before { content: ''; display: inline-block; width: 3px; height: 13px;
               background: #00bfa5; border-radius: 2px; flex-shrink: 0; }
  table { width: 100%; border-collapse: collapse; }
  .canvas-content { padding: 24px 32px; background: #f7f5ef; }
  .canvas-content h2 { font-family: 'Poppins', Arial; font-size: 14px; font-weight: 700; color: #0a2342; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 7px; }
  .canvas-content h2::before { content: ''; display: inline-block; width: 3px; height: 13px; background: #00bfa5; border-radius: 2px; flex-shrink: 0; }
  .canvas-content h3 { font-family: 'Poppins', Arial; font-size: 12px; font-weight: 700; color: #1d70a2; margin: 14px 0 6px; }
  .canvas-content p { font-size: 12px; color: #2d3748; font-family: 'Lato', Arial; line-height: 1.7; margin-bottom: 10px; }
  .canvas-content ul { margin: 6px 0 12px 18px; }
  .canvas-content ul li { font-size: 12px; color: #2d3748; font-family: 'Lato', Arial; line-height: 1.6; margin-bottom: 5px; }
  .canvas-content ol { margin: 6px 0 12px 18px; }
  .canvas-content ol li { font-size: 12px; color: #2d3748; font-family: 'Lato', Arial; line-height: 1.6; margin-bottom: 6px; }
  .canvas-content table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
  .canvas-content th { background: #0a2342; color: #fff; padding: 8px 12px; font-family: 'Poppins', Arial; font-weight: 700; text-align: left; }
  .canvas-content td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-family: 'Lato', Arial; }
  .canvas-content tr:nth-child(even) td { background: #f8fafc; }
  .canvas-content .card { background: rgba(29,112,162,0.07); border-left: 4px solid #00bfa5; border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 10px 0; font-size: 12px; font-family: 'Lato', Arial; line-height: 1.6; color: #1a202c; page-break-inside: avoid; }
  .canvas-content .warning { background: rgba(245,158,11,0.08); border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 10px 0; font-size: 12px; font-family: 'Lato', Arial; line-height: 1.6; color: #1a202c; page-break-inside: avoid; }
  .canvas-content table { page-break-inside: avoid; }
  .canvas-content h2, .canvas-content h3 { page-break-after: avoid; }
</style>
</head>
<body>


<!-- ═══════════════════════════════════════════════════════
     PAGE 1  COVER
════════════════════════════════════════════════════════ -->
<div class="page" style="background:#0a2342;min-height:297mm;flex-direction:column;justify-content:space-between">

  <!-- Top bar -->
  <div style="padding:24px 40px;display:flex;justify-content:space-between;align-items:center">
    <div style="color:#00bfa5;font-family:'Poppins',Arial;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Sixteam.pro</div>
    <div style="color:rgba(255,255,255,0.3);font-family:'Lato',Arial;font-size:11px">${fecha}</div>
  </div>

  <!-- Center content -->
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 60px">

    <!-- Label -->
    <div style="background:rgba(0,191,165,0.12);border:1px solid rgba(0,191,165,0.3);color:#00bfa5;
                font-family:'Poppins',Arial;font-size:10px;font-weight:700;letter-spacing:3px;
                text-transform:uppercase;padding:5px 18px;border-radius:20px;margin-bottom:24px">
      Diagnóstico RevOps
    </div>

    <!-- Company name -->
    <div style="color:#fff;font-family:'Poppins',Arial;font-size:52px;font-weight:900;line-height:1.05;margin-bottom:10px">
      ${kit.empresa || 'Empresa'}
    </div>

    <!-- Branding -->
    <div style="color:#00bfa5;font-family:'Poppins',Arial;font-size:16px;font-weight:700;margin-bottom:4px">by sixteam.pro</div>
    <div style="color:rgba(255,255,255,0.25);font-family:'Lato',Arial;font-size:12px;margin-bottom:28px">sixteam.pro</div>

    <!-- Divider -->
    <div style="width:50px;height:2px;background:linear-gradient(90deg,#1d70a2,#00bfa5);border-radius:2px;margin-bottom:40px"></div>

    <!-- Fecha entregable -->
    <div style="color:rgba(255,255,255,0.25);font-family:'Lato',Arial;font-size:13px;letter-spacing:1px">${fecha}</div>

  </div>

  <!-- Bottom bar -->
  <div style="padding:18px 40px;border-top:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center">
    <div style="color:rgba(255,255,255,0.15);font-family:'Lato',Arial;font-size:10px">Procesado con IA · Confidencial</div>
    <div style="color:rgba(255,255,255,0.15);font-family:'Lato',Arial;font-size:10px">sixteam.pro</div>
  </div>

</div>


<!-- ═══════════════════════════════════════════════════════
     PAGES 2+  CANVAS LIBRE (agent-designed HTML)
════════════════════════════════════════════════════════ -->
${renderCanvas(kit.canvas_pdf ?? '', kit.empresa || '', fecha)}



<!-- ═══════════════════════════════════════════════════════
     PAGE 6  CIERRE
════════════════════════════════════════════════════════ -->
<div class="page" style="background:#0a2342;min-height:297mm">

  <div style="padding:12px 32px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:3px;height:16px;background:#00bfa5;border-radius:2px"></div>
      <span style="color:#fff;font-size:13px;font-weight:700;font-family:'Poppins',Arial">Siguiente Paso</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <span style="color:rgba(255,255,255,0.25);font-size:10px;font-family:'Lato',Arial">${kit.empresa || ''} · ${fecha}</span>
      <span style="color:rgba(255,255,255,0.15);font-size:10px;font-family:'Lato',Arial">6/6</span>
    </div>
  </div>

  <div style="flex:1;padding:28px 32px;display:flex;flex-direction:column;justify-content:space-between">

    <!-- Siguiente paso hero -->
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="font-size:10px;font-weight:700;color:#00bfa5;letter-spacing:2px;text-transform:uppercase;font-family:'Poppins',Arial;margin-bottom:10px">Qué hacer ahora</div>
      <div style="font-size:16px;color:#fff;font-family:'Lato',Arial;line-height:1.6;margin-bottom:14px">${kit.siguiente_paso ?? ''}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);font-family:'Lato',Arial;line-height:1.5">${kit.razon_recomendacion ?? ''}</div>
    </div>

    <!-- Solución recomendada -->
    <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:16px;text-align:center;margin-bottom:20px">
      <div style="font-size:13px;font-weight:700;color:#00bfa5;font-family:'Poppins',Arial;margin-bottom:6px;line-height:1.3">${kit.recomendacion ?? ''}</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.35);font-family:'Lato',Arial">Solución recomendada</div>
    </div>

    <!-- CTA -->
    <div style="background:linear-gradient(135deg,rgba(0,191,165,0.15),rgba(29,112,162,0.15));border:1px solid rgba(0,191,165,0.3);border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
      <div style="display:inline-block;background:#00bfa5;color:#0a2342;font-weight:800;font-family:'Poppins',Arial;font-size:13px;padding:11px 32px;border-radius:6px;margin-bottom:10px">
        Agendar con Sixteam →
      </div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);font-family:'Lato',Arial">sixteam.pro · hola@sixteam.pro</div>
    </div>


  </div>

  <!-- Footer -->
  <div style="padding:14px 32px;border-top:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center">
    <div style="color:rgba(255,255,255,0.15);font-family:'Lato',Arial;font-size:9px">Diagnóstico generado con IA · Confidencial · ${fecha}</div>
    <div style="color:#00bfa5;font-family:'Poppins',Arial;font-size:10px;font-weight:700">sixteam.pro</div>
  </div>

</div>

</body>
</html>`;
}

// ─── Puppeteer render ─────────────────────────────────────────────────────────

export async function generatePdf(kit: DiagnosticoResult): Promise<Buffer> {
  const html = buildHtml(kit);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
