import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { DiagnosticoResult } from '../types/diagnostico';
import { SCORE_META, FIT_STYLE, REC_COLOR, HORIZONTE_COLOR, PRIO_STYLE } from '../constants/radar';

// ─── PDF-optimized styles ────────────────────────────────────────────────────

const PAGE: React.CSSProperties = { width: '210mm', minHeight: '297mm', margin: '0 auto', background: '#fff', padding: '20mm', boxSizing: 'border-box', pageBreakAfter: 'always', fontFamily: "'Lato','Helvetica Neue',sans-serif", color: '#1a1a18' };
const SECTION_TITLE: React.CSSProperties = { fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 800, color: '#0d1f3c', marginBottom: 14, letterSpacing: '-0.3px' };
const LABEL: React.CSSProperties = { fontSize: 9, fontWeight: 800, color: '#888780', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 };
const CARD: React.CSSProperties = { background: '#faf9f5', borderRadius: 10, padding: '14px 16px', marginBottom: 10, pageBreakInside: 'avoid' };
const DIVIDER: React.CSSProperties = { borderTop: '1px solid #e8e6de', margin: '16px 0' };

function ScoreBarPdf({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  const c = pct >= 70 ? '#0f6e56' : pct >= 40 ? '#854f0b' : '#a32d2d';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: '#5f5e5a' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{value}/{max}</span>
      </div>
      <div style={{ height: 4, background: '#eeece6', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 2 }} />
      </div>
    </div>
  );
}

export default function EntregableView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DiagnosticoResult | null>(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('radar_diagnosticos') || '[]');
    const entry = saved.find((e: any) => e.slug === slug);
    if (entry?.data) setData(entry.data);
  }, [slug]);

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f5ef' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: '#888780', marginBottom: 12 }}>No se encontró el diagnóstico</div>
        <button onClick={() => navigate('/radar')} style={{ background: '#0d1f3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Volver al Radar</button>
      </div>
    </div>
  );

  const sc = data.score?.total || 0;
  const scClr = sc >= 76 ? '#0f6e56' : sc >= 56 ? '#185fa5' : sc >= 31 ? '#854f0b' : '#888780';
  const scLbl = sc >= 76 ? 'Oportunidad alta' : sc >= 56 ? 'Oportunidad buena' : sc >= 31 ? 'Oportunidad inicial' : 'Exploración baja';
  const fit = FIT_STYLE[data.fit_sixteam] || FIT_STYLE['Medio'];
  const cats = (data.plan_accion?.categorias || []).filter(c => c.aplica !== false);
  const fecha = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ background: '#e8e6de', minHeight: '100vh', paddingTop: 20, paddingBottom: 60 }}>
      {/* Controls - no-print */}
      <div className="no-print" style={{ maxWidth: '210mm', margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
        <button onClick={() => navigate('/radar')} style={{ background: 'transparent', border: '1px solid #d3d1c7', borderRadius: 8, padding: '8px 18px', fontSize: 12, color: '#5f5e5a', cursor: 'pointer' }}>← Volver al Radar</button>
        <button
          onClick={async () => {
            const html2pdf = (await import('html2pdf.js')).default;
            const el = document.getElementById('entregable-pdf');
            if (!el) return;
            const opt: any = {
              margin: [0, 0, 0, 0],
              filename: `radar-${data.empresa?.toLowerCase().replace(/\s+/g, '-') || 'diagnostico'}.pdf`,
              image: { type: 'jpeg', quality: 0.92 },
              html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
              pagebreak: { mode: ['css', 'legacy'], avoid: '.avoid-break' },
            };
            await html2pdf().set(opt).from(el).save();
          }}
          style={{ background: 'linear-gradient(90deg,#1d70a2,#00bfa5)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          Descargar PDF
        </button>
      </div>

      <div id="entregable-pdf">
        {/* ═══════ PAGE 1: PORTADA ═══════ */}
        <div style={{ ...PAGE, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', background: '#0d1f3c', color: '#fff' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#1d70a2,#00bfa5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, marginBottom: 24 }}>S</div>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, color: '#7a9cc9', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Sixteam.pro</div>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: '-1px', marginBottom: 8 }}>Diagnóstico RevOps</div>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, color: '#00bfa5', fontWeight: 700, marginBottom: 32 }}>Soluciones con Tecnología e IA</div>

          <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 16, padding: '24px 40px', marginBottom: 32 }}>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{data.empresa || 'Empresa'}</div>
            <div style={{ fontSize: 14, color: '#7a9cc9' }}>{data.sector}{data.contacto ? ` · ${data.contacto}` : ''}{data.cargo ? ` — ${data.cargo}` : ''}</div>
          </div>

          <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 10, color: '#7a9cc9', letterSpacing: '0.1em' }}>SCORE</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#00bfa5' }}>{sc}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#7a9cc9', letterSpacing: '0.1em' }}>FIT</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: fit.color === '#0f6e56' ? '#00bfa5' : fit.color === '#854f0b' ? '#fac775' : '#f7c1c1' }}>{data.fit_sixteam}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#7a9cc9', letterSpacing: '0.1em' }}>TIPO</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#2d6cdf' }}>{data.diagnostico_principal?.codigo}</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#4a6a9c' }}>{fecha}</div>
        </div>

        {/* ═══════ PAGE 2: RESUMEN EJECUTIVO ═══════ */}
        <div style={PAGE}>
          <div style={SECTION_TITLE}>Resumen ejecutivo</div>

          {/* Score + Fit + Recomendación cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, textAlign: 'center', border: '2px solid #e8e6de', borderRadius: 12, padding: '16px 12px' }}>
              <div style={LABEL}>SCORE RADAR</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: scClr, letterSpacing: '-2px', lineHeight: 1 }}>{sc}</div>
              <div style={{ fontSize: 10, color: scClr, fontWeight: 700, marginTop: 4 }}>{scLbl}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: fit.bg, borderRadius: 12, padding: '16px 12px', border: `1px solid ${fit.border}` }}>
              <div style={{ ...LABEL, color: fit.color }}>FIT SIXTEAM</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: fit.color }}>{data.fit_sixteam}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', border: '2px solid #e8e6de', borderRadius: 12, padding: '16px 12px' }}>
              <div style={LABEL}>RECOMENDACIÓN</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: REC_COLOR[data.recomendacion] || '#0d1f3c', lineHeight: 1.3 }}>{data.recomendacion}</div>
            </div>
          </div>

          <div style={CARD}>
            <div style={LABEL}>ESTADO ACTUAL</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, color: '#2c2c2a' }}>
              {typeof data.estado_actual === 'string' ? data.estado_actual : data.estado_actual.resumen}
            </div>
          </div>

          {/* Diagnóstico principal */}
          <div style={{ background: '#0d1f3c', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ background: '#2d6cdf', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{data.diagnostico_principal?.codigo}</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{data.diagnostico_principal?.nombre}</div>
                <div style={{ color: '#7a9cc9', fontSize: 11, lineHeight: 1.6 }}>{data.diagnostico_principal?.lectura}</div>
                {data.diagnostico_secundario?.codigo && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ background: '#1a3460', borderRadius: 5, padding: '2px 7px', fontSize: 9, fontWeight: 700, color: '#7a9cc9' }}>{data.diagnostico_secundario.codigo}</span>
                    <span style={{ color: '#4a6a9c', fontSize: 10 }}>{data.diagnostico_secundario.nombre}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Objetivos */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ ...CARD, flex: 1 }}>
              <div style={LABEL}>OBJETIVO DECLARADO</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>{data.objetivo_declarado}</div>
            </div>
            <div style={{ ...CARD, flex: 1 }}>
              <div style={LABEL}>OBJETIVO SUBYACENTE</div>
              <div style={{ display: 'inline-block', background: '#eeedfe', color: '#3c3489', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{data.objetivo_subyacente}</div>
            </div>
          </div>

          {/* Score breakdown */}
          <div style={LABEL}>DESGLOSE DEL SCORE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            {Object.entries(SCORE_META).map(([k, m]) => (
              <ScoreBarPdf key={k} label={m.label} value={data.score?.[k] || 0} max={m.max} />
            ))}
          </div>
        </div>

        {/* ═══════ PAGE 3: DIMENSIONES + DOLORES ═══════ */}
        <div style={PAGE}>
          <div style={SECTION_TITLE}>Análisis por dimensión RevOps</div>

          {/* Dimensions table */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, padding: '6px 8px', background: '#f4f2ec', borderRadius: 6, marginBottom: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#888780' }}>DIMENSIÓN</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#185fa5', textAlign: 'center' }}>MADUREZ</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#a32d2d', textAlign: 'center' }}>DOLOR</div>
            </div>
            {(data.dimensiones || []).map((d, i) => (
              <div key={i} className="avoid-break" style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, padding: '7px 8px', borderBottom: '1px solid #f4f2ec', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a18' }}>{d.nombre}</div>
                  <div style={{ fontSize: 9, color: '#a8a69e', marginTop: 1 }}>{d.nota}</div>
                </div>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  {[0,1,2,3,4].map(n => <div key={n} style={{ width: 7, height: 7, borderRadius: 2, background: n <= d.madurez ? '#378add' : '#ddd9ce' }} />)}
                </div>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  {[1,2,3,4,5].map(n => <div key={n} style={{ width: 7, height: 7, borderRadius: 2, background: n <= d.dolor ? '#e24b4a' : '#ddd9ce' }} />)}
                </div>
              </div>
            ))}
          </div>

          <div style={DIVIDER} />

          <div style={SECTION_TITLE}>Dolores prioritarios</div>
          {(data.dolores_prioritarios || []).map((d, i) => (
            <div key={i} className="avoid-break" style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '10px 12px', background: '#faf9f5', borderRadius: 8, borderLeft: '3px solid #e24b4a' }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: '#fcebeb', color: '#a32d2d', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18' }}>{d.dolor}</div>
                <div style={{ fontSize: 10, color: '#888780', marginTop: 2 }}>{d.impacto}</div>
              </div>
            </div>
          ))}

          <div style={{ ...DIVIDER, marginTop: 16 }} />

          <div style={SECTION_TITLE}>Causas raíz</div>
          {(data.causas_raiz || []).map((c, i) => (
            <div key={i} className="avoid-break" style={{ padding: '10px 12px', marginBottom: 8, background: '#faf9f5', borderRadius: 8, borderLeft: '3px solid #378add' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18' }}>{c.causa}</div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: c.confianza==='Alta'?'#e1f5ee':c.confianza==='Media'?'#faeeda':'#f1efe8', color: c.confianza==='Alta'?'#0f6e56':c.confianza==='Media'?'#854f0b':'#5f5e5a' }}>{c.confianza}</span>
              </div>
              <div style={{ fontSize: 10, color: '#888780' }}>Evidencia: {c.evidencia}</div>
            </div>
          ))}
        </div>

        {/* ═══════ PAGE 4: PLAN DE ACCIÓN (V1) o OPORTUNIDADES (V2) ═══════ */}
        <div style={PAGE}>
          {data.plan_accion ? (
            <>
              <div style={SECTION_TITLE}>Plan de acción — Soluciones con tecnología e IA</div>

              {data.plan_accion?.resumen_estrategico && (
                <div style={{ ...CARD, borderLeft: '4px solid #2d6cdf', marginBottom: 16 }}>
                  <div style={LABEL}>RESUMEN ESTRATÉGICO</div>
                  <div style={{ fontSize: 11, lineHeight: 1.7, color: '#2c2c2a' }}>{data.plan_accion.resumen_estrategico}</div>
                </div>
              )}

              {cats.map((cat, i) => (
                <div key={i} className="avoid-break" style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{cat.icono}</span>
                    <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 800, color: '#0d1f3c' }}>{cat.categoria}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: (PRIO_STYLE[cat.prioridad] || PRIO_STYLE['Media']).bg, color: (PRIO_STYLE[cat.prioridad] || PRIO_STYLE['Media']).color }}>{cat.prioridad}</span>
                  </div>
                  {cat.descripcion && <div style={{ fontSize: 10, color: '#5f7fa8', marginBottom: 6, marginLeft: 24 }}>{cat.descripcion}</div>}
                  {(cat.acciones || []).map((a, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, padding: '6px 10px', marginLeft: 24, marginBottom: 4, background: '#faf9f5', borderRadius: 6, alignItems: 'flex-start' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: HORIZONTE_COLOR[a.horizonte] || '#888', flexShrink: 0, marginTop: 5 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a18' }}>{a.accion}</div>
                        <div style={{ fontSize: 9, color: '#888780' }}>{a.horizonte} · {a.impacto}</div>
                      </div>
                    </div>
                  ))}
                  {(cat.herramientas_sugeridas || []).length > 0 && (
                    <div style={{ marginLeft: 24, marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {cat.herramientas_sugeridas.map((h, j) => (
                        <span key={j} style={{ background: '#eeedfe', color: '#534ab7', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>{h}</span>
                      ))}
                    </div>
                  )}
                  {cat.resultado_esperado && (
                    <div style={{ marginLeft: 24, marginTop: 6, background: '#e1f5ee', borderRadius: 6, padding: '6px 10px', borderLeft: '2px solid #1d9e75' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#0f6e56' }}>RESULTADO: </span>
                      <span style={{ fontSize: 10, color: '#085041' }}>{cat.resultado_esperado}</span>
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : data.oportunidades ? (
            <>
              <div style={SECTION_TITLE}>Mapa de Oportunidades Tecnológicas</div>
              <div style={{ ...CARD, borderLeft: '4px solid #00bfa5', marginBottom: 20 }}>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>Se han identificado las siguientes oportunidades de inserción tecnológica y automatización para optimizar la operación de {data.empresa}.</div>
              </div>
              
              {data.oportunidades.map((op, i) => (
                <div key={i} className="avoid-break" style={{ ...CARD, border: '1px solid #e8e6de', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ background: '#0d1f3c', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>{op.tipo.toUpperCase()}</div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#0d1f3c' }}>{op.nombre}</div>
                    </div>
                    {op.viable_hoy && <div style={{ background: '#e1f5ee', color: '#0f6e56', padding: '2px 8px', borderRadius: 99, fontSize: 9, fontWeight: 700 }}>VIABLE HOY</div>}
                  </div>
                  <div style={{ fontSize: 11, marginBottom: 8 }}><span style={{ color: '#888780', fontWeight: 700 }}>Dolor que resuelve:</span> {op.dolor_que_resuelve}</div>
                  <div style={{ fontSize: 11, marginBottom: 10, lineHeight: 1.5 }}>{op.que_hace}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: '#f4f2ec', padding: '6px 10px', borderRadius: 6 }}>
                      <div style={LABEL}>HERRAMIENTA</div>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{op.herramienta_sugerida}</div>
                      <div style={{ fontSize: 9, color: '#888780', marginTop: 2 }}>{op.por_que_esta_herramienta}</div>
                    </div>
                    <div style={{ background: '#f4f2ec', padding: '6px 10px', borderRadius: 6 }}>
                      <div style={LABEL}>REQUISITOS</div>
                      <div style={{ fontSize: 11 }}>{op.requiere_antes}</div>
                    </div>
                  </div>
                </div>
              ))}

              {data.ideas_del_cliente_validadas && data.ideas_del_cliente_validadas.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={LABEL}>VALIDACIÓN DE IDEAS DEL CLIENTE</div>
                  {data.ideas_del_cliente_validadas.map((idea, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderLeft: '3px solid #3c3489', background: '#f4f2ec', borderRadius: 6, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>"{idea.idea_original}"</div>
                        <div style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#eeedfe', color: '#3c3489' }}>{idea.evaluacion.toUpperCase()}</div>
                      </div>
                      <div style={{ fontSize: 10, marginTop: 4 }}>{idea.razon}</div>
                      {idea.ajuste_sugerido && <div style={{ fontSize: 10, color: '#3c3489', marginTop: 4, fontStyle: 'italic' }}>Sug: {idea.ajuste_sugerido}</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#888780' }}>No se ha configurado un plan de acción ni oportunidades para este diagnóstico.</div>
          )}
        </div>

        {/* ═══════ PAGE 5: CRONOGRAMA + KPIS ═══════ */}
        <div style={PAGE}>
          <div style={SECTION_TITLE}>Cronograma de implementación</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
            {(data.plan_accion?.cronograma || []).map((c, i) => (
              <div key={i} className="avoid-break" style={{ borderRadius: 8, border: `1px solid ${c.color}30`, background: `${c.color}08`, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: c.color, marginBottom: 2 }}>{c.horizonte}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1a18', marginBottom: 8 }}>{c.etiqueta}</div>
                {(c.hitos || []).map((h, j) => (
                  <div key={j} style={{ display: 'flex', gap: 5, marginBottom: 4, alignItems: 'flex-start' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: c.color, flexShrink: 0, marginTop: 4 }} />
                    <div style={{ fontSize: 10, color: '#2c2c2a', lineHeight: 1.4 }}>{h}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {(data.plan_accion?.kpis_de_exito || []).length > 0 && (
            <>
              <div style={SECTION_TITLE}>KPIs de éxito — Meta a 90 días</div>
              <div style={{ border: '1px solid #e8e6de', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, padding: '8px 12px', background: '#f4f2ec' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#888780' }}>MÉTRICA</div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#a32d2d' }}>HOY</div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#0f6e56' }}>META 90 DÍAS</div>
                </div>
                {data.plan_accion?.kpis_de_exito?.map((k, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, padding: '8px 12px', borderTop: '1px solid #f4f2ec' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a18' }}>{k.metrica}</div>
                    <div style={{ fontSize: 11, color: '#a32d2d' }}>{k.estado_actual}</div>
                    <div style={{ fontSize: 11, color: '#0f6e56', fontWeight: 700 }}>{k.meta}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {(data.plan_accion?.advertencias || []).length > 0 && (
            <>
              <div style={LABEL}>CONDICIONES CRÍTICAS</div>
              {data.plan_accion?.advertencias?.map((a, i) => (
                <div key={i} className="avoid-break" style={{ display: 'flex', gap: 8, padding: '8px 12px', marginBottom: 6, background: '#fff8e8', borderRadius: 8, border: '1px solid #f0d68f' }}>
                  <span style={{ flexShrink: 0 }}>!</span>
                  <div style={{ fontSize: 11, color: '#6a5313', lineHeight: 1.5 }}>{a}</div>
                </div>
              ))}
            </>
          )}

          <div style={DIVIDER} />

          {/* Quick wins */}
          <div style={SECTION_TITLE}>Quick wins — Impacto inmediato</div>
          {(data.quick_wins || []).map((q, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: '#e1f5ee', color: '#0f6e56', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>OK</div>
              <div style={{ fontSize: 11, color: '#2c2c2a', lineHeight: 1.5 }}>{q}</div>
            </div>
          ))}
        </div>

        {/* ═══════ PAGE 6: SIGUIENTE PASO ═══════ */}
        <div style={{ ...PAGE, pageBreakAfter: 'auto' }}>
          <div style={SECTION_TITLE}>Ruta de solución</div>
          <div style={{ ...CARD, borderLeft: '4px solid #185fa5', marginBottom: 20 }}>
            <div style={{ fontSize: 12, lineHeight: 1.7, color: '#2c2c2a' }}>{data.ruta_solucion}</div>
          </div>

          {/* CTA box */}
          <div style={{ background: REC_COLOR[data.recomendacion] || '#0d1f3c', borderRadius: 14, padding: '24px 28px', color: '#fff', marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 4 }}>SIGUIENTE PASO RECOMENDADO</div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 900, marginBottom: 6 }}>{data.recomendacion}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', lineHeight: 1.6 }}>{data.siguiente_paso}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 12, lineHeight: 1.5 }}>{data.razon_recomendacion}</div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 40, paddingTop: 20, borderTop: '1px solid #e8e6de' }}>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 800, color: '#0d1f3c', marginBottom: 4 }}>Sixteam.pro</div>
            <div style={{ fontSize: 11, color: '#888780' }}>Soluciones RevOps con Tecnología e IA</div>
            <div style={{ fontSize: 10, color: '#b4b2a9', marginTop: 6 }}>Este diagnóstico fue generado por el sistema Radar Sixteam · {fecha}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
