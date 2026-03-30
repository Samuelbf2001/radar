import React, { useState } from 'react';

interface Props {
  targetId: string;
  filename?: string;
  backgroundColor?: string;
  margin?: number[];
  label?: string;
}

export default function PdfExportButton({ targetId, filename = 'propuesta-sixteam.pdf', backgroundColor = '#030d1a', margin = [8,8,8,8], label }: Props) {
  const [loading, setLoading] = useState(false);

  async function exportPdf() {
    setLoading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById(targetId);
      if (!element) { alert('No se encontró el elemento a exportar.'); return; }

      const opt = {
        margin,
        filename,
        image:       { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak:   { mode: ['css', 'legacy'], avoid: '.avoid-break' },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (e: any) {
      console.error('PDF export error:', e);
      alert(`Error al generar PDF: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={exportPdf}
      disabled={loading}
      className="no-print"
      style={{
        background: loading ? 'rgba(0,191,165,.3)' : 'linear-gradient(90deg,#1d70a2,#00bfa5)',
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        padding: '10px 20px',
        fontSize: 13,
        fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: "'Poppins', sans-serif",
        boxShadow: '0 4px 16px rgba(0,191,165,.25)',
        transition: 'all .2s',
      }}
    >
      {loading ? (
        <>
          <span style={{ fontSize: 14 }}>...</span> Generando PDF...
        </>
      ) : (
        <>
          <span style={{ fontSize: 14 }}>PDF</span> {label || 'Descargar PDF'}
        </>
      )}
    </button>
  );
}

/** Generate PDF blob programmatically (for auto-generation) */
export async function generatePdfBlob(targetId: string, filename: string, backgroundColor = '#ffffff'): Promise<Blob> {
  const html2pdf = (await import('html2pdf.js')).default;
  const element = document.getElementById(targetId);
  if (!element) throw new Error('Elemento PDF no encontrado');

  const opt = {
    margin: [0, 0, 0, 0],
    filename,
    image: { type: 'jpeg', quality: 0.92 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: { mode: ['css', 'legacy'], avoid: '.avoid-break' },
  };

  return html2pdf().set(opt).from(element).outputPdf('blob');
}
