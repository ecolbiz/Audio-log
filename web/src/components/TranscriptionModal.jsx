import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

function stripJsonComments(str) {
  // Remove # and // line comments, then trailing commas before } or ]
  return str
    .replace(/\/\/[^\n]*/g, '')
    .replace(/#[^\n]*/g, '')
    .replace(/,(\s*[}\]])/g, '$1');
}

function interpolate(value, ctx) {
  if (typeof value === 'string') return value.replace(/\{\{([^}]+)\}\}/g, (_, k) => ctx[k.trim()] ?? '');
  if (Array.isArray(value)) return value.map((v) => interpolate(v, ctx));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpolate(v, ctx)]));
  return value;
}

function buildCurl(webhook, fields, audio, transcription) {
  const ctx = {
    ...fields,
    __audioId__: audio.id,
    __recordedAt__: audio.createdAt || '',
    __recordedBy__: audio.user?.name || '',
    __auditedAt__: transcription?.auditedAt || '',
    __auditedBy__: transcription?.auditedBy?.name || '',
  };

  let body;
  let bodyError = null;
  const raw = webhook.bodyTemplate || '{}';
  // Interpolate as raw string first, then parse — allows unquoted {{TOKEN}} to produce numbers
  const interpolatedStr = stripJsonComments(raw).replace(/\{\{([^}]+)\}\}/g, (match, k) => {
    const val = ctx[k.trim()];
    return val !== undefined && val !== '' ? String(val) : match;
  });
  try {
    body = JSON.parse(interpolatedStr);
  } catch (e) {
    bodyError = e.message;
    body = interpolatedStr;
  }

  let extra = {};
  try { extra = JSON.parse(stripJsonComments(webhook.extraHeaders || '{}')); } catch {}

  const headers = { 'Content-Type': 'application/json', ...extra };
  if (webhook.authType === 'bearer') headers['Authorization'] = `Bearer ${webhook.authToken}`;
  if (webhook.authType === 'basic') headers['Authorization'] = `Basic ${btoa(`${webhook.authUser}:${webhook.authPass}`)}`;
  if (webhook.authType === 'apikey') headers[webhook.authHeader || 'X-API-Key'] = webhook.authKey;

  const headerFlags = Object.entries(headers)
    .map(([k, v]) => `  -H '${k}: ${v}'`)
    .join(' \\\n');

  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
  const curlStr = `curl -X ${webhook.method || 'POST'} '${webhook.url}' \\\n${headerFlags} \\\n  -d '${bodyStr}'`;

  return { curl: curlStr, bodyError };
}

function CurlModal({ curl, bodyError, onClose }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={curlStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={curlStyles.box}>
        <div style={curlStyles.header}>
          <span style={curlStyles.title}>cURL equivalente</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={curlStyles.copyBtn} onClick={copy}>{copied ? '✓ Copiado' : 'Copiar'}</button>
            <button style={curlStyles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>
        {bodyError && (
          <div style={curlStyles.errorBanner}>
            <strong>Body template com JSON inválido</strong> — remova os comentários (<code>#</code> ou <code>//</code>) e verifique vírgulas. Erro: {bodyError}
          </div>
        )}
        <pre style={curlStyles.pre}>{curl}</pre>
      </div>
    </div>
  );
}

const curlStyles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 },
  box: { background: 'var(--bg)', borderRadius: 14, width: '100%', maxWidth: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' },
  title: { fontWeight: 600, fontSize: 15, color: 'var(--text-h)' },
  copyBtn: { padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', fontSize: 13, cursor: 'pointer' },
  closeBtn: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--text)', padding: '2px 6px' },
  errorBanner: { padding: '10px 20px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#ef4444', lineHeight: '160%' },
  pre: { flex: 1, overflowY: 'auto', margin: 0, padding: '16px 20px', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-h)', background: 'var(--code-bg)', borderRadius: '0 0 14px 14px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
};

export default function TranscriptionModal({ audio, token, user, onClose }) {
  const [transcription, setTranscription] = useState(null);
  const [keywordSets, setKeywordSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [showCurl, setShowCurl] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch(`/audios/${audio.id}/transcription`, { token }).then((r) => r?.json()),
      apiFetch('/keyword-sets', { token }).then((r) => r?.json()),
    ]).then(([t, ks]) => {
      if (t && !t.error) {
        setTranscription(t);
        setFields(t.fields || {});
        setSelectedSetId(t.keywordSetId || '');
      }
      setKeywordSets(Array.isArray(ks) ? ks : []);
      setLoading(false);
    });
  }, [audio.id, token]);

  async function handleApply(setId) {
    setApplying(true);
    setSelectedSetId(setId);
    const res = await apiFetch(`/audios/${audio.id}/transcription/apply`, {
      token,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywordSetId: setId || null }),
    });
    if (res) {
      const t = await res.json();
      setTranscription(t);
      setFields(t.fields || {});
    }
    setApplying(false);
  }

  async function handleNormalize() {
    setNormalizing(true);
    const res = await apiFetch(`/audios/${audio.id}/transcription/normalize`, {
      token,
      method: 'POST',
    });
    if (res && res.ok) {
      const t = await res.json();
      setTranscription(t);
      setFields(t.fields || {});
    }
    setNormalizing(false);
  }

  async function handleAudit() {
    setAuditing(true);
    const isAudited = !!transcription?.auditedAt;
    const res = await apiFetch(`/audios/${audio.id}/transcription/audit`, {
      token,
      method: isAudited ? 'DELETE' : 'POST',
    });
    if (res && res.ok) {
      const t = await res.json();
      setTranscription(t);
    }
    setAuditing(false);
  }

  async function handleDispatch() {
    setDispatching(true);
    setDispatchResult(null);
    const res = await apiFetch(`/audios/${audio.id}/transcription/dispatch`, {
      token,
      method: 'POST',
    });
    if (res) {
      const data = await res.json();
      setDispatchResult({ ok: res.ok, message: res.ok ? `Enviado (HTTP ${data.status})` : (data.error || `Erro ${data.status}`) });
      setTimeout(() => setDispatchResult(null), 4000);
    }
    setDispatching(false);
  }

  async function handleSave() {
    setSaving(true);
    const res = await apiFetch(`/audios/${audio.id}/transcription`, {
      token,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields, keywordSetId: selectedSetId || null }),
    });
    if (res) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  const activeSet = keywordSets.find((s) => s.id === selectedSetId);
  const keywords = activeSet?.keywords || Object.keys(fields).map((k) => ({ name: k, type: 'String' }));

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Transcrição</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={styles.empty}>Carregando...</div>
        ) : (
          <div style={styles.body}>
            <section style={styles.section}>
              <label style={styles.label}>Conjunto de palavras-chave</label>
              <select
                style={{ ...styles.select, ...(transcription?.auditedAt ? styles.fieldInputLocked : {}) }}
                value={selectedSetId}
                onChange={(e) => handleApply(e.target.value)}
                disabled={applying || !!transcription?.auditedAt}
              >
                <option value="">— Sem conjunto —</option>
                {keywordSets.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {applying && <span style={styles.hint}>Aplicando...</span>}
            </section>

            {keywords.length > 0 && (
              <section style={styles.section}>
                <label style={styles.label}>Campos extraídos</label>
                <div style={styles.fieldsGrid}>
                  {keywords.map((kw) => {
                    const name = typeof kw === 'string' ? kw : kw.name;
                    const type = typeof kw === 'string' ? 'String' : kw.type;
                    const defaultPlaceholder = { Date: 'DD/MM/AAAA', Time: 'HH:MM', Datetime: 'DD/MM/AAAA HH:MM', Integer: '0', Decimal: `0.${'0'.repeat(kw.decimals ?? 2)}` }[type] || '';
                    const placeholder = kw.mask || defaultPlaceholder;
                    const isDropdown = type === 'Dropdown';
                    const dropdownOptions = isDropdown
                      ? (kw.options || []).map((o) =>
                          typeof o === 'string' ? { id: o, label: o } : { id: o.id ?? o.label, label: o.label }
                        )
                      : [];

                    return (
                      <div key={name} style={styles.fieldRow}>
                        <div style={styles.fieldKeyWrap}>
                          <span style={styles.fieldKey}>{name}</span>
                          <span style={styles.fieldType}>{type}</span>
                        </div>
                        {isDropdown ? (
                          <select
                            style={{ ...styles.fieldInput, ...(transcription?.auditedAt ? styles.fieldInputLocked : {}), cursor: transcription?.auditedAt ? 'not-allowed' : 'pointer' }}
                            value={fields[name] || ''}
                            disabled={!!transcription?.auditedAt}
                            onChange={(e) => setFields((f) => ({ ...f, [name]: e.target.value }))}
                          >
                            <option value="">— selecionar —</option>
                            {dropdownOptions.map((o) => (
                              <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            style={{ ...styles.fieldInput, ...(transcription?.auditedAt ? styles.fieldInputLocked : {}) }}
                            value={fields[name] || ''}
                            placeholder={placeholder}
                            readOnly={!!transcription?.auditedAt}
                            onChange={(e) => setFields((f) => ({ ...f, [name]: e.target.value }))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section style={styles.section}>
              <label style={styles.label}>Transcrição completa</label>
              <div style={styles.fullText}>
                {transcription?.fullText || audio.transcriptRaw || '(sem texto)'}
              </div>
            </section>
          </div>
        )}

        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            {transcription?.auditedAt ? (
              <span style={styles.auditedLabel}>
                ✓ Auditado em {new Date(transcription.auditedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                {transcription.auditedBy?.name ? ` · ${transcription.auditedBy.name}` : ''}
              </span>
            ) : (
              <button
                style={{ ...styles.normalizeBtn, ...(normalizing ? styles.saveBtnDisabled : {}) }}
                onClick={handleNormalize}
                disabled={normalizing || loading}
              >
                {normalizing ? 'Normalizando...' : 'Normalizar campos'}
              </button>
            )}
          </div>
          <div style={styles.footerRight}>
            {activeSet?.webhook?.url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {dispatchResult && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: dispatchResult.ok ? '#22c55e' : '#ef4444' }}>
                    {dispatchResult.message}
                  </span>
                )}
                {user?.role === 'ADMIN' && (
                  <button style={styles.curlBtn} onClick={() => setShowCurl(true)} disabled={loading}>
                    Ver cURL
                  </button>
                )}
                <button
                  style={{ ...styles.dispatchBtn, ...(dispatching ? styles.saveBtnDisabled : {}) }}
                  onClick={handleDispatch}
                  disabled={dispatching || loading}
                  title={`Enviar para ${activeSet.webhook.url}`}
                >
                  {dispatching ? 'Enviando...' : '⇒ Enviar'}
                </button>
              </div>
            )}
            <button style={styles.cancelBtn} onClick={onClose}>Fechar</button>
            <button
              style={{
                ...styles.auditBtn,
                ...(transcription?.auditedAt ? styles.auditBtnActive : {}),
                ...(auditing ? styles.saveBtnDisabled : {}),
              }}
              onClick={handleAudit}
              disabled={auditing || loading}
            >
              {auditing ? '...' : transcription?.auditedAt ? 'Remover Audit' : 'Audit Feito'}
            </button>
            <button
              style={{ ...styles.saveBtn, ...(saving ? styles.saveBtnDisabled : {}) }}
              onClick={handleSave}
              disabled={saving || loading || !!transcription?.auditedAt}
            >
              {saving ? 'Salvando...' : saved ? '✓ Salvo' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
      {showCurl && activeSet?.webhook && (() => {
        const { curl, bodyError } = buildCurl(activeSet.webhook, fields, audio, transcription);
        return <CurlModal curl={curl} bodyError={bodyError} onClose={() => setShowCurl(false)} />;
      })()}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 16,
  },
  modal: {
    background: 'var(--bg)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 640,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-h)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: 'var(--text)',
    padding: 4,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text-h)',
    fontSize: 14,
    cursor: 'pointer',
  },
  hint: {
    fontSize: 12,
    color: 'var(--text)',
  },
  fieldsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    alignItems: 'center',
    gap: 12,
  },
  fieldKeyWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 1,
  },
  fieldKey: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--accent)',
    fontFamily: 'var(--mono)',
  },
  fieldType: {
    fontSize: 10,
    color: 'var(--text)',
  },
  fieldInput: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text-h)',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
  },
  fieldInputLocked: {
    opacity: 0.6,
    cursor: 'not-allowed',
    background: 'var(--code-bg)',
  },
  fullText: {
    padding: '14px 16px',
    background: 'var(--code-bg)',
    borderRadius: 10,
    fontSize: 14,
    lineHeight: '160%',
    color: 'var(--text-h)',
    whiteSpace: 'pre-wrap',
    fontFamily: 'var(--mono)',
    maxHeight: 200,
    overflowY: 'auto',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  auditedLabel: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: 600,
  },
  normalizeBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid var(--accent)',
    background: 'none',
    color: 'var(--accent)',
    fontSize: 14,
    cursor: 'pointer',
  },
  curlBtn: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'none',
    color: 'var(--text)',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'var(--mono)',
  },
  dispatchBtn: {
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #22c55e',
    background: 'none',
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  auditBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #8b5cf6',
    background: 'none',
    color: '#8b5cf6',
    fontSize: 14,
    cursor: 'pointer',
  },
  auditBtnActive: {
    background: '#8b5cf6',
    color: '#fff',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'none',
    color: 'var(--text)',
    fontSize: 14,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  saveBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    color: 'var(--text)',
    fontSize: 14,
  },
};
