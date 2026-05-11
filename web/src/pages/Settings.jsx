import { useEffect, useState } from 'react';

const API = 'http://localhost:3000/api';

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

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${API}/settings`, { headers }).then((r) => r.json()).then(setSettings);
  }, [token]);

  async function handleSelectProvider(provider) {
    if (settings?.provider === provider || saving) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch(`${API}/settings/provider`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ provider }),
    });
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
    const res = await fetch(`${API}/settings/openai-credits`, { headers });
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
