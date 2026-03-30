import React, { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Job {
  slug: string;
  date: string | null;
  empresa: string | null;
  score: number | null;
  fit: string | null;
  recomendacion: string | null;
  sent: boolean;
  costo: number | null;
  files: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

function scoreColor(s: number | null): string {
  if (s === null) return '#8b949e';
  if (s >= 70) return '#3fb950';
  if (s >= 40) return '#d29922';
  return '#f85149';
}

function fitColor(fit: string | null): string {
  if (!fit) return '#8b949e';
  const f = fit.toLowerCase();
  if (f.includes('alto') || f === 'a') return '#3fb950';
  if (f.includes('medio') || f === 'm') return '#d29922';
  return '#f85149';
}

function logColor(line: string): string {
  if (/error|failed|fail/i.test(line)) return '#f85149';
  if (/success|done|complete|saved|sent/i.test(line)) return '#3fb950';
  if (/step|pipeline|webhook|start/i.test(line)) return '#79c0ff';
  if (/warning|warn/i.test(line)) return '#d29922';
  return '#8b949e';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '6px 12px' }}>
      <div style={{ fontSize: 10, color: '#8b949e', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #21262d' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, padding: '6px 0', borderBottom: '1px solid #161b22', fontSize: 13 }}>
      <span style={{ color: '#8b949e', textTransform: 'capitalize' }}>{label.replace(/_/g, ' ')}</span>
      <span style={{ color: '#c9d1d9', whiteSpace: 'pre-wrap' }}>{value}</span>
    </div>
  );
}

// ─── Job detail panel ─────────────────────────────────────────────────────────

function JobDetail({ data, slug, sent, onActionComplete }: { data: any; slug: string; sent: boolean; onActionComplete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editJson, setEditJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  const notaCRM = data.nota_crm ?? {};
  const dims: any[] = data.dimensiones ?? [];
  const dolores: any[] = data.dolores_prioritarios ?? [];
  const vozItems: Record<string, any> = data.notas_de_voz ?? {};

  const handleEdit = () => {
    setEditJson(JSON.stringify(data, null, 2));
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/jobs/${slug}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: editJson
      });
      if (!res.ok) throw new Error(await res.text());
      alert('Cambios guardados y PDF regenerado con éxito.');
      setEditing(false);
      onActionComplete();
    } catch (e: any) {
      alert('Error guardando: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!confirm(`¿Estás seguro de enviar este Kit Diagnóstico a GHL y WhatsApp?`)) return;
    try {
      setSending(true);
      const res = await fetch(`/api/jobs/${slug}/send`, { method: 'POST' });
      const rData = await res.json();
      if (!res.ok) throw new Error(rData.error || await res.text());
      alert('¡Enviado satisfactoriamente!');
      onActionComplete();
    } catch (e: any) {
      alert('Error enviando: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const handleReprocess = async () => {
    if (!confirm(`¿Estás seguro de reprocesar por completo de nuevo este caso? Esto volverá a analizar el texto con Claude, usará ElevenLabs y guardará todo aquí de nuevo, consumiendo saldo de las APIs.`)) return;
    try {
      setReprocessing(true);
      const res = await fetch(`/api/jobs/${slug}/reprocess`, { method: 'POST' });
      const rData = await res.json();
      if (!res.ok) throw new Error(rData.error || await res.text());
      alert('¡Reprocesado exitosamente!');
      onActionComplete();
    } catch (e: any) {
      alert('Error al reprocesar: ' + e.message);
    } finally {
      setReprocessing(false);
    }
  };

  if (editing) {
    return (
      <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setEditing(false)} style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ background: '#238636', border: '1px solid #2ea043', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>{saving ? 'Guardando...' : 'Guardar Cambios y Regenerar PDF'}</button>
        </div>
        <textarea 
          value={editJson}
          onChange={e => setEditJson(e.target.value)}
          style={{ flex: 1, background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 13, resize: 'none' }}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#e6edf3', display: 'flex', alignItems: 'center', gap: 10 }}>
            {data.empresa ?? '—'}
            {sent ? (
              <span style={{ fontSize: 11, background: '#105021', color: '#2ea043', padding: '3px 8px', borderRadius: 99, border: '1px solid #2ea043', fontWeight: 600 }}>ENVIADO</span>
            ) : (
              <span style={{ fontSize: 11, background: '#3b2300', color: '#d29922', padding: '3px 8px', borderRadius: 99, border: '1px solid #d29922', fontWeight: 600 }}>LISTO PARA REVISIÓN</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4, fontFamily: 'monospace' }}>{slug}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <Chip label="Score" value={`${data.score?.total ?? '—'}/100`} color={scoreColor(data.score?.total)} />
            <Chip label="Fit Sixteam" value={data.fit_sixteam ?? '—'} color={fitColor(data.fit_sixteam)} />
            {data.tipologia && <Chip label="Tipología" value={data.tipologia} color="#79c0ff" />}
          </div>
          {data.recomendacion && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#161b22', borderRadius: 8, fontSize: 13, color: '#c9d1d9', borderLeft: '3px solid #1f6feb', lineHeight: 1.6 }}>
              {data.recomendacion}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 20 }}>
          {!sent && <button onClick={handleReprocess} disabled={reprocessing || sending} style={{ background: '#0a2342', border: '1px solid #1d70a2', color: '#fff', padding: '6px 14px', borderRadius: 6, cursor: (reprocessing || sending) ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600 }}>{reprocessing ? '🔄 Reprocesando...' : '🔄 Reprocesar'}</button>}
          {!sent && <button onClick={handleEdit} disabled={reprocessing || sending} style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✏️ Editar Datos</button>}
          {!sent && <button onClick={handleSend} disabled={reprocessing || sending} style={{ background: '#1f6feb', border: '1px solid #388bfd', color: '#fff', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{sending ? '🚀 Enviando...' : '🚀 Aprobar y Enviar'}</button>}
        </div>
      </div>

      {/* Archivos */}
      <Section title="Archivos generados">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['entregable.pdf', 'nota-resultado.mp3', 'nota-propuesta.mp3', 'nota-reactivacion.mp3'].map(f => (
            <a
              key={f}
              href={`/entregables/${slug}/${f}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, padding: '6px 12px', background: '#161b22', border: '1px solid #30363d', borderRadius: 6, color: '#79c0ff', textDecoration: 'none' }}
            >
              {f}
            </a>
          ))}
        </div>
      </Section>

      {/* Nota CRM */}
      {Object.keys(notaCRM).length > 0 && (
        <Section title="Nota CRM">
          {Object.entries(notaCRM).map(([k, v]) => (
            <Row key={k} label={k} value={String(v)} />
          ))}
        </Section>
      )}

      {/* Dimensiones */}
      {dims.length > 0 && (
        <Section title={`Dimensiones (${dims.length})`}>
          {dims.map((d: any) => (
            <div key={d.nombre} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #21262d', fontSize: 13 }}>
              <span style={{ color: '#c9d1d9' }}>{d.nombre}</span>
              <span style={{ color: '#8b949e' }}>Madurez: {d.madurez}/4 · Dolor: {d.dolor}/5</span>
            </div>
          ))}
        </Section>
      )}

      {/* Dolores prioritarios */}
      {dolores.length > 0 && (
        <Section title="Dolores Prioritarios">
          {dolores.map((d: any, i: number) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #21262d' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>{i + 1}. {d.dolor}</div>
              {d.impacto && <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>{d.impacto}</div>}
            </div>
          ))}
        </Section>
      )}

      {/* Notas de voz */}
      {Object.keys(vozItems).length > 0 && (
        <Section title="Texto de Notas de Voz">
          {Object.entries(vozItems).map(([k, v]: [string, any]) => (
            <div key={k} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', marginBottom: 6 }}>{k}</div>
              <div style={{ fontSize: 13, color: '#c9d1d9', lineHeight: 1.7, background: '#161b22', padding: '10px 14px', borderRadius: 8 }}>
                {v.texto ?? (typeof v === 'string' ? v : JSON.stringify(v))}
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<any>(null);
  const [tab, setTab] = useState<'logs' | 'detail'>('logs');
  const [online, setOnline] = useState<boolean | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsRef = useRef<HTMLDivElement>(null);

  // Poll: server health
  useEffect(() => {
    const check = async () => {
      try { await fetch('/health'); setOnline(true); }
      catch { setOnline(false); }
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, []);

  // Poll: jobs list
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/jobs');
        const d = await r.json();
        setJobs(d.jobs ?? []);
      } catch {}
    };
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, []);

  // Poll: logs
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/logs?lines=200');
        const d = await r.json();
        setLogs(d.lines ?? []);
      } catch {}
    };
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (autoScroll && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Load job detail when selection changes
  const loadJobDetail = () => {
    if (!selected) { setJobDetail(null); return; }
    fetch(`/api/jobs/${selected}`)
      .then(r => r.json())
      .then(setJobDetail)
      .catch(() => setJobDetail(null));
  };

  useEffect(() => {
    loadJobDetail();
  }, [selected]);

  const handleSelect = (slug: string) => {
    setSelected(prev => prev === slug ? null : slug);
    setTab('detail');
  };

  const statusColor = online === null ? '#8b949e' : online ? '#3fb950' : '#f85149';
  const statusLabel = online === null ? 'Conectando...' : online ? 'Online' : 'Offline';

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#0d1117', color: '#e6edf3', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 300, minWidth: 300, borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #21262d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}`, flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 700 }}>Radar Dashboard</span>
          </div>
          <div style={{ fontSize: 11, color: '#8b949e', marginTop: 5, display: 'flex', justifyContent: 'space-between' }}>
            <span>Servidor: {statusLabel}</span>
            <span>{jobs.length} entregable{jobs.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Jobs list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {jobs.length === 0 && (
            <div style={{ padding: '24px 20px', color: '#8b949e', fontSize: 12 }}>
              Sin entregables aún.<br />
              <span style={{ color: '#6e7681' }}>Esperando webhooks de GHL...</span>
            </div>
          )}
          {jobs.map(job => (
            <div
              key={job.slug}
              onClick={() => handleSelect(job.slug)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #21262d',
                background: selected === job.slug ? '#161b22' : 'transparent',
                borderLeft: `3px solid ${selected === job.slug ? '#1f6feb' : 'transparent'}`,
                transition: 'background .12s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 2 }}>
                {job.empresa ?? <span style={{ color: '#8b949e' }}>{job.slug}</span>}
                {job.sent ? <span style={{ marginLeft: 6, color: '#3fb950' }}>✓</span> : <span style={{ marginLeft: 6, color: '#d29922' }}>⏱</span>}
              </div>
              <div style={{ fontSize: 11, color: '#6e7681', marginBottom: 7 }}>{fmtDate(job.date)}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {job.score !== null && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(job.score) }}>
                    {job.score}/100
                  </span>
                )}
                {job.fit && (
                  <span style={{ fontSize: 11, color: fitColor(job.fit) }}>Fit: {job.fit}</span>
                )}
                {job.costo !== null && (
                  <span style={{ fontSize: 10, color: '#8b949e', marginLeft: 'auto' }}>${job.costo.toFixed(3)}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 7, flexWrap: 'wrap' }}>
                {job.files.map(f => (
                  <span key={f} style={{ fontSize: 9, background: '#21262d', color: '#6e7681', padding: '2px 5px', borderRadius: 3 }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Tabs bar */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #21262d', padding: '0 20px', flexShrink: 0 }}>
          {(['logs', 'detail'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '13px 16px', fontSize: 13, fontWeight: 600,
                color: tab === t ? '#e6edf3' : '#8b949e',
                borderBottom: `2px solid ${tab === t ? '#1f6feb' : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {t === 'logs' ? 'Log del Pipeline' : 'Detalle del Entregable'}
            </button>
          ))}
          {tab === 'logs' && (
            <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8b949e', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
              Auto-scroll
            </label>
          )}
        </div>

        {/* Log panel */}
        {tab === 'logs' && (
          <div
            ref={logsRef}
            style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7, background: '#0d1117' }}
            onScroll={e => {
              const el = e.currentTarget;
              setAutoScroll(el.scrollTop + el.clientHeight >= el.scrollHeight - 20);
            }}
          >
            {logs.length === 0 && (
              <span style={{ color: '#8b949e' }}>Esperando logs del servidor...</span>
            )}
            {logs.map((line, i) => (
              <div key={i} style={{ color: logColor(line), whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Detail panel */}
        {tab === 'detail' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            {!selected && (
              <div style={{ color: '#8b949e', fontSize: 13 }}>
                Selecciona un entregable del panel izquierdo para ver su detalle.
              </div>
            )}
            {selected && !jobDetail && (
              <div style={{ color: '#8b949e', fontSize: 13 }}>Cargando...</div>
            )}
            {selected && jobDetail && (
              <JobDetail 
                data={jobDetail} 
                slug={selected} 
                sent={jobs.find(j => j.slug === selected)?.sent ?? false}
                onActionComplete={() => {
                  loadJobDetail();
                  // Re-fetch jobs to update sent status
                  fetch('/api/jobs').then(r => r.json()).then(d => setJobs(d.jobs ?? []));
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
