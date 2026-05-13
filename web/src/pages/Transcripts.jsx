import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }) {
  const map = {
    TRANSCRIBED: { label: 'Transcrito', color: '#22c55e' },
    FAILED: { label: 'Falhou', color: '#ef4444' },
    PENDING: { label: 'Processando', color: '#f59e0b' },
  };
  const s = map[status] || map.PENDING;
  return (
    <span style={{ ...styles.badge, color: s.color, borderColor: s.color }}>
      {s.label}
    </span>
  );
}

function resolveDropdownLabel(kw, id) {
  if (!id || !kw.options) return id;
  const opt = kw.options.find((o) =>
    typeof o === 'string' ? o === id : (o.id ?? o.label) === id
  );
  if (!opt || typeof opt === 'string') return id;
  return opt.label ? `${id} — ${opt.label}` : id;
}

function FieldsCell({ fields, keywordSet }) {
  if (!fields || Object.keys(fields).length === 0) return <span style={styles.empty2}>—</span>;

  const keywords = keywordSet?.keywords;
  const entries = keywords
    ? keywords.map((kw) => {
        const val = fields[kw.name] ?? '';
        const display = kw.type === 'Dropdown' && val
          ? resolveDropdownLabel(kw, val)
          : (val || '—');
        return { name: kw.name, display };
      })
    : Object.entries(fields).map(([k, v]) => ({ name: k, display: v || '—' }));

  return (
    <div style={styles.fields}>
      {entries.map(({ name, display }) => (
        <div key={name} style={styles.fieldPair}>
          <span style={styles.fieldKey}>{name}</span>
          <span style={styles.fieldVal}>{display}</span>
        </div>
      ))}
    </div>
  );
}

export default function Transcripts({ token }) {
  const [q, setQ] = useState('');
  const [audited, setAudited] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetch(query = q, auditedFilter = audited) {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (auditedFilter !== 'all') params.set('audited', auditedFilter);
    const res = await apiFetch(`/admin/audios?${params}`, { token });
    if (!res) return;
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { fetch(); }, []);

  function handleFilter(val) {
    setAudited(val);
    fetch(q, val);
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Log de Transcrições</h2>

        <div style={styles.toolbar}>
          <div style={styles.searchRow}>
            <input
              style={styles.input}
              placeholder="Buscar por gravador, auditor, conjunto..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetch()}
            />
            <button style={styles.searchBtn} onClick={() => fetch()} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          <div style={styles.filters}>
            {[['all', 'Todos'], ['yes', 'Auditados'], ['no', 'Não auditados']].map(([val, label]) => (
              <button
                key={val}
                style={{ ...styles.filterBtn, ...(audited === val ? styles.filterBtnActive : {}) }}
                onClick={() => handleFilter(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.summary}>
        {items.length} {items.length === 1 ? 'registro' : 'registros'}
        {' · '}
        {items.filter((i) => i.transcription?.auditedAt).length} auditados
      </div>

      {items.length === 0 && !loading ? (
        <div style={styles.emptyState}>Nenhum registro encontrado.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Data gravação', 'Gravado por', 'Status', 'Conjunto', 'Campos extraídos', 'Auditado em', 'Auditado por'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const t = a.transcription;
                return (
                  <tr key={a.id} style={{ ...styles.tr, ...(t?.auditedAt ? styles.trAudited : {}) }}>
                    <td style={styles.td}>{fmt(a.createdAt)}</td>
                    <td style={styles.td}>
                      <span style={styles.userName}>{a.user?.name || '—'}</span>
                      <span style={styles.userEmail}>{a.user?.email || ''}</span>
                    </td>
                    <td style={styles.td}><StatusBadge status={a.status} /></td>
                    <td style={styles.td}>{t?.keywordSet?.name || <span style={styles.empty2}>—</span>}</td>
                    <td style={styles.td}><FieldsCell fields={t?.fields} keywordSet={t?.keywordSet} /></td>
                    <td style={styles.td}>
                      {t?.auditedAt
                        ? <span style={styles.auditedDate}>{fmt(t.auditedAt)}</span>
                        : <span style={styles.empty2}>—</span>}
                    </td>
                    <td style={styles.td}>{t?.auditedBy?.name || <span style={styles.empty2}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  heading: {
    margin: 0,
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--text-h)',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  searchRow: {
    display: 'flex',
    gap: 8,
    flex: 1,
    minWidth: 260,
  },
  input: {
    flex: 1,
    padding: '9px 14px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    fontSize: 14,
    background: 'var(--bg)',
    color: 'var(--text-h)',
    outline: 'none',
  },
  searchBtn: {
    padding: '9px 20px',
    borderRadius: 10,
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  filters: {
    display: 'flex',
    gap: 6,
  },
  filterBtn: {
    padding: '7px 14px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'none',
    color: 'var(--text)',
    fontSize: 13,
    cursor: 'pointer',
  },
  filterBtnActive: {
    background: 'var(--accent-bg)',
    color: 'var(--accent)',
    borderColor: 'var(--accent)',
    fontWeight: 600,
  },
  summary: {
    fontSize: 13,
    color: 'var(--text)',
  },
  tableWrap: {
    overflowX: 'auto',
    borderRadius: 12,
    border: '1px solid var(--border)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    padding: '11px 16px',
    textAlign: 'left',
    borderBottom: '2px solid var(--border)',
    color: 'var(--text)',
    fontWeight: 600,
    fontSize: 12,
    whiteSpace: 'nowrap',
    background: 'var(--code-bg)',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
  },
  trAudited: {
    background: 'rgba(139, 92, 246, 0.04)',
  },
  td: {
    padding: '12px 16px',
    color: 'var(--text-h)',
    verticalAlign: 'top',
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 20,
    border: '1px solid',
    whiteSpace: 'nowrap',
  },
  userName: {
    display: 'block',
    fontWeight: 600,
    color: 'var(--text-h)',
  },
  userEmail: {
    display: 'block',
    fontSize: 11,
    color: 'var(--text)',
    marginTop: 1,
  },
  fields: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  fieldPair: {
    display: 'flex',
    gap: 6,
    alignItems: 'baseline',
  },
  fieldKey: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent)',
    fontFamily: 'var(--mono)',
    whiteSpace: 'nowrap',
  },
  fieldVal: {
    fontSize: 13,
    color: 'var(--text-h)',
  },
  auditedDate: {
    color: '#8b5cf6',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  empty2: {
    color: 'var(--text)',
    opacity: 0.4,
  },
  emptyState: {
    padding: 64,
    textAlign: 'center',
    color: 'var(--text)',
    fontSize: 15,
  },
};
