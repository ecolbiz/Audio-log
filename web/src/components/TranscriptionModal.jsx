import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export default function TranscriptionModal({ audio, token, onClose }) {
  const [transcription, setTranscription] = useState(null);
  const [keywordSets, setKeywordSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
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
                style={styles.select}
                value={selectedSetId}
                onChange={(e) => handleApply(e.target.value)}
                disabled={applying}
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
                    const placeholder = { Date: 'DD/MM/AAAA', Time: 'HH:MM', Datetime: 'DD/MM/AAAA HH:MM', Integer: '0', Decimal: `0.${'0'.repeat(kw.decimals ?? 2)}` }[type] || '';
                    return (
                      <div key={name} style={styles.fieldRow}>
                        <div style={styles.fieldKeyWrap}>
                          <span style={styles.fieldKey}>{name}</span>
                          <span style={styles.fieldType}>{type}</span>
                        </div>
                        <input
                          style={styles.fieldInput}
                          value={fields[name] || ''}
                          placeholder={placeholder}
                          onChange={(e) => setFields((f) => ({ ...f, [name]: e.target.value }))}
                        />
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
          <button style={styles.cancelBtn} onClick={onClose}>Fechar</button>
          <button
            style={{ ...styles.saveBtn, ...(saving ? styles.saveBtnDisabled : {}) }}
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? 'Salvando...' : saved ? '✓ Salvo' : 'Salvar'}
          </button>
        </div>
      </div>
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
    justifyContent: 'flex-end',
    gap: 8,
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
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
