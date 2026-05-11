import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

const FIELD_TYPES = ['String', 'Integer', 'Decimal', 'Date', 'Time', 'Datetime'];
const TYPE_HINTS = {
  String: 'texto livre',
  Integer: 'número inteiro',
  Decimal: 'número decimal',
  Date: 'DD/MM/AAAA',
  Time: 'HH:MM',
  Datetime: 'DD/MM/AAAA HH:MM',
};

function emptyKeyword() {
  return { name: '', type: 'String' };
}

function KeywordEditor({ keywords, onChange }) {
  function update(i, field, value) {
    const next = keywords.map((k, j) => j === i ? { ...k, [field]: value } : k);
    onChange(next);
  }
  function remove(i) { onChange(keywords.filter((_, j) => j !== i)); }
  function add() { onChange([...keywords, emptyKeyword()]); }

  return (
    <div style={kwStyles.container}>
      {keywords.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>Nenhum campo. Clique em "+ Campo" para adicionar.</p>
      )}
      {keywords.map((kw, i) => (
        <div key={i} style={kwStyles.row}>
          <input
            style={{ ...kwStyles.nameInput }}
            value={kw.name}
            onChange={(e) => update(i, 'name', e.target.value.toUpperCase())}
            placeholder="NOME"
          />
          <select
            style={kwStyles.typeSelect}
            value={kw.type}
            onChange={(e) => update(i, 'type', e.target.value)}
          >
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {kw.type === 'Decimal' && (
            <input
              style={kwStyles.decimalsInput}
              type="number"
              min={0}
              max={10}
              value={kw.decimals ?? 2}
              onChange={(e) => update(i, 'decimals', Number(e.target.value))}
              title="Casas decimais"
            />
          )}
          <span style={kwStyles.hint}>{TYPE_HINTS[kw.type]}</span>
          <button style={kwStyles.removeBtn} onClick={() => remove(i)} title="Remover">✕</button>
        </div>
      ))}
      <button style={kwStyles.addBtn} type="button" onClick={add}>+ Campo</button>
    </div>
  );
}

const kwStyles = {
  container: { display: 'flex', flexDirection: 'column', gap: 6 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  nameInput: {
    width: 110, padding: '6px 10px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-h)', fontSize: 13, fontFamily: 'var(--mono)',
    textTransform: 'uppercase',
  },
  typeSelect: {
    padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text-h)', fontSize: 13, cursor: 'pointer',
  },
  decimalsInput: {
    width: 52, padding: '6px 8px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-h)', fontSize: 13, textAlign: 'center',
  },
  hint: { fontSize: 11, color: 'var(--text)', flex: 1 },
  removeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#ef4444', fontSize: 13, padding: '2px 6px',
  },
  addBtn: {
    alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--border)',
    borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
    color: 'var(--text)', fontSize: 12, marginTop: 2,
  },
};

function KeywordSetsSection({ token }) {
  const [sets, setSets] = useState([]);
  const [newName, setNewName] = useState('');
  const [newKeywords, setNewKeywords] = useState([emptyKeyword()]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editKeywords, setEditKeywords] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/keyword-sets', { token }).then((r) => r?.json()).then((d) => d && setSets(d));
  }, [token]);

  async function handleCreate(e) {
    e.preventDefault();
    const valid = newKeywords.filter((k) => k.name.trim());
    if (!newName || valid.length === 0) return;
    setSaving(true);
    const res = await apiFetch('/keyword-sets', {
      token, method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, keywords: valid }),
    });
    if (res) {
      const created = await res.json();
      setSets((s) => [...s, created]);
      setNewName('');
      setNewKeywords([emptyKeyword()]);
    }
    setSaving(false);
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditKeywords(s.keywords.map((k) => ({ ...k })));
  }

  async function handleUpdate(id) {
    const valid = editKeywords.filter((k) => k.name.trim());
    if (!editName || valid.length === 0) return;
    setSaving(true);
    const res = await apiFetch(`/keyword-sets/${id}`, {
      token, method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, keywords: valid }),
    });
    if (res) {
      const updated = await res.json();
      setSets((s) => s.map((x) => x.id === id ? updated : x));
      setEditingId(null);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este conjunto?')) return;
    const res = await apiFetch(`/keyword-sets/${id}`, { token, method: 'DELETE' });
    if (res) setSets((s) => s.filter((x) => x.id !== id));
  }

  return (
    <div style={styles.block}>
      <span style={styles.blockTitle}>Conjuntos de palavras-chave</span>

      <div style={styles.setsList}>
        {sets.length === 0 && <p style={styles.hint}>Nenhum conjunto criado ainda.</p>}
        {sets.map((s) => (
          <div key={s.id} style={styles.setCard}>
            {editingId === s.id ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input style={styles.input} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome do conjunto" />
                <KeywordEditor keywords={editKeywords} onChange={setEditKeywords} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={styles.saveSmallBtn} onClick={() => handleUpdate(s.id)} disabled={saving}>Salvar</button>
                  <button style={styles.cancelSmallBtn} onClick={() => setEditingId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div style={styles.setInfo}>
                  <span style={styles.setName}>{s.name}</span>
                  <div style={styles.kwList}>
                    {s.keywords.map((k) => (
                      <span key={k.name} style={styles.kwBadge} title={`${k.type}${k.type === 'Decimal' ? ` (${k.decimals} dec.)` : ''}`}>
                        {k.name}
                        <span style={styles.kwType}>{k.type}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button style={styles.editSmallBtn} onClick={() => startEdit(s)}>Editar</button>
                  <button style={styles.deleteSmallBtn} onClick={() => handleDelete(s.id)}>✕</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleCreate} style={styles.createForm}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>Novo conjunto</span>
        <input style={styles.input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome (ex: Suporte técnico)" />
        <KeywordEditor keywords={newKeywords} onChange={setNewKeywords} />
        <button style={styles.createBtn} type="submit" disabled={saving || !newName}>
          + Criar conjunto
        </button>
      </form>
    </div>
  );
}

function ProviderCard({ id, label, description, active, keySet, onSelect }) {
  return (
    <button
      style={{ ...styles.providerCard, ...(active ? styles.providerCardActive : {}) }}
      onClick={() => onSelect(id)}
    >
      <div style={styles.providerTop}>
        <span style={styles.providerLabel}>{label}</span>
        <span style={{ ...styles.activeBadge, ...(active ? styles.activeBadgeOn : {}) }}>
          {active ? 'Ativo' : 'Inativo'}
        </span>
      </div>
      <p style={styles.providerDesc}>{description}</p>
      <span style={{ ...styles.keyStatus, color: keySet ? '#22c55e' : '#f59e0b' }}>
        {keySet ? '✓ Chave configurada' : '⚠ Chave não configurada'}
      </span>
    </button>
  );
}

function CreditRow({ label, value, color }) {
  return (
    <div style={styles.creditRow}>
      <span style={styles.creditLabel}>{label}</span>
      <span style={{ ...styles.creditValue, color }}>${Number(value).toFixed(2)}</span>
    </div>
  );
}

export default function Settings({ token }) {
  const [settings, setSettings] = useState(null);
  const [credits, setCredits] = useState(null);
  const [creditsError, setCreditsError] = useState('');
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch('/settings', { token }).then((r) => r?.json()).then((d) => d && setSettings(d));
  }, [token]);

  async function handleSelectProvider(provider) {
    if (settings?.provider === provider || saving) return;
    setSaving(true);
    setSaved(false);
    const res = await apiFetch('/settings/provider', {
      token,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    if (!res) return;
    const data = await res.json();
    setSettings((s) => ({ ...s, provider: data.provider }));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function fetchCredits() {
    setCreditsLoading(true);
    setCreditsError('');
    setCredits(null);
    const res = await apiFetch('/settings/openai-credits', { token });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) {
      setCreditsError(data.error || 'Erro desconhecido.');
    } else {
      setCredits(data);
    }
    setCreditsLoading(false);
  }

  if (!settings) return <div style={styles.empty}>Carregando...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.section}>
        <h2 style={styles.heading}>Configurações</h2>

        <div style={styles.block}>
          <div style={styles.blockHeader}>
            <span style={styles.blockTitle}>Provedor de transcrição</span>
            {saving && <span style={styles.hint}>Salvando...</span>}
            {saved && <span style={{ ...styles.hint, color: '#22c55e' }}>✓ Salvo</span>}
          </div>
          <div style={styles.providerGrid}>
            <ProviderCard
              id="groq"
              label="Groq — Whisper large-v3"
              description="Gratuito para uso pessoal. Mais rápido e preciso que o whisper-1. Recomendado."
              active={settings.provider === 'groq'}
              keySet={settings.groqKeySet}
              onSelect={handleSelectProvider}
            />
            <ProviderCard
              id="openai"
              label="OpenAI — Whisper-1"
              description="Pago por minuto de áudio (~$0.006/min). Requer créditos na conta OpenAI."
              active={settings.provider === 'openai'}
              keySet={settings.openaiKeySet}
              onSelect={handleSelectProvider}
            />
          </div>
        </div>

        <div style={styles.block}>
          <div style={styles.blockHeader}>
            <span style={styles.blockTitle}>Créditos OpenAI</span>
            <button style={styles.checkBtn} onClick={fetchCredits} disabled={creditsLoading}>
              {creditsLoading ? 'Verificando...' : 'Verificar saldo'}
            </button>
          </div>

          {creditsError && (
            <div style={styles.errorBox}>
              <strong>Não foi possível obter o saldo:</strong> {creditsError}
              <p style={styles.errorHint}>
                Consulte diretamente em{' '}
                <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer" style={styles.link}>
                  platform.openai.com/billing
                </a>
              </p>
            </div>
          )}

          {credits && (
            <div style={styles.creditsBox}>
              <CreditRow label="Total concedido" value={credits.total_granted} />
              <CreditRow label="Total usado" value={credits.total_used} color="#f59e0b" />
              <div style={styles.divider} />
              <CreditRow label="Disponível" value={credits.total_available} color="#22c55e" />
            </div>
          )}

          {!credits && !creditsError && (
            <p style={styles.hint}>
              Clique em "Verificar saldo" para consultar os créditos da sua conta OpenAI.
            </p>
          )}
        </div>

        <KeywordSetsSection token={token} />

        <div style={styles.block}>
          <span style={styles.blockTitle}>Chaves de API</span>
          <p style={styles.hint}>
            As chaves são configuradas no arquivo <code style={styles.code}>/api/.env</code>. Reinicie a API após alterar.
          </p>
          <div style={styles.keyList}>
            <KeyRow name="OPENAI_API_KEY" set={settings.openaiKeySet} />
            <KeyRow name="GROQ_API_KEY" set={settings.groqKeySet} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyRow({ name, set }) {
  return (
    <div style={styles.keyRow}>
      <code style={styles.code}>{name}</code>
      <span style={{ color: set ? '#22c55e' : '#f59e0b', fontSize: 13 }}>
        {set ? '✓ Configurada' : '⚠ Não configurada'}
      </span>
    </div>
  );
}

const styles = {
  page: {
    padding: '32px',
    textAlign: 'left',
    maxWidth: 720,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
  },
  heading: {
    margin: 0,
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--text-h)',
  },
  block: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  blockHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockTitle: {
    fontWeight: 600,
    fontSize: 15,
    color: 'var(--text-h)',
  },
  providerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  providerCard: {
    textAlign: 'left',
    padding: '16px 18px',
    borderRadius: 12,
    border: '2px solid var(--border)',
    background: 'var(--bg)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    transition: 'border-color 0.15s',
  },
  providerCardActive: {
    borderColor: 'var(--accent)',
    backgroundColor: 'var(--accent-bg)',
  },
  providerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerLabel: {
    fontWeight: 600,
    fontSize: 14,
    color: 'var(--text-h)',
  },
  activeBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 20,
    border: '1px solid var(--border)',
    color: 'var(--text)',
  },
  activeBadgeOn: {
    border: '1px solid var(--accent)',
    color: 'var(--accent)',
  },
  providerDesc: {
    margin: 0,
    fontSize: 13,
    color: 'var(--text)',
    lineHeight: '150%',
  },
  keyStatus: {
    fontSize: 12,
    fontWeight: 500,
  },
  checkBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '5px 14px',
    cursor: 'pointer',
    color: 'var(--text)',
    fontSize: 13,
  },
  creditsBox: {
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  creditRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditLabel: {
    fontSize: 14,
    color: 'var(--text)',
  },
  creditValue: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-h)',
  },
  divider: {
    height: 1,
    background: 'var(--border)',
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 13,
    color: '#ef4444',
  },
  errorHint: {
    margin: '6px 0 0',
    color: 'var(--text)',
  },
  link: {
    color: 'var(--accent)',
  },
  keyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  keyRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid var(--border)',
  },
  hint: {
    margin: 0,
    fontSize: 13,
    color: 'var(--text)',
  },
  setsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  setCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    gap: 12,
  },
  setInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  setName: {
    fontWeight: 600,
    fontSize: 14,
    color: 'var(--text-h)',
  },
  kwList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  kwBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 20,
    background: 'var(--accent-bg)',
    color: 'var(--accent)',
    fontFamily: 'var(--mono)',
  },
  kwType: {
    fontSize: 10,
    fontWeight: 400,
    opacity: 0.7,
  },
  createForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '14px 16px',
    border: '1px dashed var(--border)',
    borderRadius: 10,
  },
  input: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    fontSize: 13,
    background: 'var(--bg)',
    color: 'var(--text-h)',
  },
  createBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  editSmallBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'none',
    color: 'var(--text)',
    fontSize: 12,
    cursor: 'pointer',
  },
  saveSmallBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  },
  cancelSmallBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'none',
    color: 'var(--text)',
    fontSize: 12,
    cursor: 'pointer',
  },
  deleteSmallBtn: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid rgba(239,68,68,0.3)',
    background: 'none',
    color: '#ef4444',
    fontSize: 12,
    cursor: 'pointer',
  },
  code: {
    fontFamily: 'var(--mono)',
    fontSize: 13,
    padding: '2px 6px',
    borderRadius: 4,
    background: 'var(--code-bg)',
    color: 'var(--text-h)',
  },
  empty: {
    padding: 64,
    color: 'var(--text)',
    fontSize: 15,
  },
};
