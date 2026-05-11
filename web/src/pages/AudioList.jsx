import { useEffect, useRef, useState } from 'react';

const API = 'http://localhost:3000/api';

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function statusLabel(status) {
  if (status === 'TRANSCRIBED') return { text: 'Transcrito', color: '#22c55e' };
  if (status === 'FAILED') return { text: 'Falhou', color: '#ef4444' };
  return { text: 'Processando', color: '#f59e0b' };
}

function AudioCard({ audio, userName, isPlaying, onTogglePlay }) {
  const [expanded, setExpanded] = useState(false);
  const st = statusLabel(audio.status);

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <button
          style={{ ...styles.playBtn, ...(isPlaying ? styles.playBtnActive : {}) }}
          onClick={() => onTogglePlay(audio)}
          title={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={styles.info}>
          <span style={styles.name}>{userName}</span>
          <span style={styles.date}>{formatDate(audio.createdAt)}</span>
        </div>

        <span style={{ ...styles.badge, color: st.color, borderColor: st.color }}>
          {st.text}
        </span>

        {audio.transcriptRaw && (
          <button style={styles.expandBtn} onClick={() => setExpanded((v) => !v)}>
            {expanded ? '▲ Fechar' : '▼ Ver transcrição'}
          </button>
        )}

        {audio.status === 'PENDING' && (
          <span style={styles.spinner} title="Aguardando transcrição..." />
        )}
      </div>

      {expanded && audio.transcriptRaw && (
        <div style={styles.transcript}>
          <p style={styles.transcriptText}>{audio.transcriptRaw}</p>
        </div>
      )}
    </div>
  );
}

export default function AudioList({ token }) {
  const [user, setUser] = useState(null);
  const [audios, setAudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  function fetchData() {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/auth/me`, { headers }).then((r) => r.json()),
      fetch(`${API}/audios/mine`, { headers }).then((r) => r.json()),
    ]).then(([u, a]) => {
      setUser(u);
      setAudios(a);
      setLoading(false);
    });
  }

  useEffect(() => {
    fetchData();
    // poll every 5s while any audio is still PENDING
    const interval = setInterval(() => {
      fetch(`${API}/audios/mine`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((a) => {
          setAudios(a);
          if (!a.some((x) => x.status === 'PENDING')) clearInterval(interval);
        });
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  function togglePlay(audio) {
    if (playingId === audio.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const el = new Audio(`http://localhost:3000/${audio.filePath}`);
    el.play();
    el.onended = () => setPlayingId(null);
    audioRef.current = el;
    setPlayingId(audio.id);
  }

  if (loading) return <div style={styles.empty}>Carregando...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.heading}>Gravações</h2>
          {user && <p style={styles.sub}>{user.name} · {user.email}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={styles.count}>{audios.length} {audios.length === 1 ? 'gravação' : 'gravações'}</span>
          <button style={styles.refreshBtn} onClick={fetchData}>↻ Atualizar</button>
        </div>
      </div>

      {audios.length === 0 ? (
        <div style={styles.empty}>Nenhuma gravação encontrada.</div>
      ) : (
        <div style={styles.list}>
          {audios.map((a) => (
            <AudioCard
              key={a.id}
              audio={a}
              userName={user?.name}
              isPlaying={playingId === a.id}
              onTogglePlay={togglePlay}
            />
          ))}
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
    gap: 24,
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heading: {
    margin: 0,
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--text-h)',
  },
  sub: {
    margin: '4px 0 0',
    fontSize: 14,
    color: 'var(--text)',
  },
  count: {
    fontSize: 14,
    color: 'var(--text)',
  },
  refreshBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '4px 12px',
    cursor: 'pointer',
    color: 'var(--text)',
    fontSize: 13,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  card: {
    borderRadius: 12,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    overflow: 'hidden',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 20px',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: '2px solid var(--accent)',
    background: 'none',
    color: 'var(--accent)',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  playBtnActive: {
    backgroundColor: 'var(--accent)',
    color: '#fff',
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  name: {
    fontWeight: 600,
    color: 'var(--text-h)',
    fontSize: 15,
  },
  date: {
    fontSize: 13,
    color: 'var(--text)',
  },
  badge: {
    fontSize: 12,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 20,
    border: '1px solid',
    flexShrink: 0,
  },
  expandBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    fontSize: 13,
    cursor: 'pointer',
    flexShrink: 0,
    fontWeight: 500,
  },
  spinner: {
    display: 'inline-block',
    width: 14,
    height: 14,
    border: '2px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  transcript: {
    borderTop: '1px solid var(--border)',
    padding: '16px 20px',
    backgroundColor: 'var(--code-bg)',
  },
  transcriptText: {
    margin: 0,
    fontSize: 14,
    lineHeight: '160%',
    color: 'var(--text-h)',
    whiteSpace: 'pre-wrap',
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
