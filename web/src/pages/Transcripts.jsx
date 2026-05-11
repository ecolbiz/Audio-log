import { useState } from 'react';
import { apiFetch } from '../lib/api';

export default function Transcripts({ token }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    const res = await apiFetch(`/admin/audios?q=${encodeURIComponent(q)}`, { token });
    if (!res) return;
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Transcrições</h2>
        <div style={styles.searchRow}>
          <input
            style={styles.input}
            placeholder="Buscar por cliente, assunto ou meio..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <button style={styles.button} onClick={search} disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Data', 'Usuário', 'Cliente', 'Meio', 'Assunto'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} style={styles.tr}>
                  <td style={styles.td}>{a.extractedDate || '—'}</td>
                  <td style={styles.td}>{a.user?.name || '—'}</td>
                  <td style={styles.td}>{a.extractedClient || '—'}</td>
                  <td style={styles.td}>{a.extractedMedium || '—'}</td>
                  <td style={styles.td}>{a.extractedSubject || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && !loading && (
        <div style={styles.empty}>Faça uma busca para ver as transcrições.</div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
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
  searchRow: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    fontSize: 15,
    background: 'var(--bg)',
    color: 'var(--text-h)',
    outline: 'none',
  },
  button: {
    padding: '10px 24px',
    borderRadius: 10,
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  th: {
    padding: '10px 16px',
    textAlign: 'left',
    borderBottom: '2px solid var(--border)',
    color: 'var(--text)',
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '12px 16px',
    color: 'var(--text-h)',
    verticalAlign: 'top',
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text)',
    fontSize: 15,
    padding: 64,
  },
};
