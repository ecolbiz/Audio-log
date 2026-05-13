import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import TranscriptionModal from '../components/TranscriptionModal';

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

function AudioCard({ audio, userName, isPlaying, onTogglePlay, onDelete, isDeleting, onHide, isHiding, onUnhide, onOpen }) {
  const st = statusLabel(audio.status);
  const isAudited = !!audio.transcription?.auditedAt;
  const isHidden = !!audio.hidden;

  return (
    <div style={{ ...styles.card, ...(isHidden ? styles.cardHidden : {}) }}>
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

        {isAudited && (
          <span style={{ ...styles.badge, color: '#8b5cf6', borderColor: '#8b5cf6' }}>
            Auditado
          </span>
        )}

        {isHidden && (
          <span style={{ ...styles.badge, color: 'var(--text)', borderColor: 'var(--border)', opacity: 0.6 }}>
            Oculta
          </span>
        )}

        {audio.status === 'TRANSCRIBED' && (
          <button style={styles.expandBtn} onClick={() => onOpen(audio)}>
            Abrir
          </button>
        )}

        {audio.status === 'PENDING' && (
          <span style={styles.spinner} title="Aguardando transcrição..." />
        )}

        {isHidden ? (
          <button
            style={styles.unhideBtn}
            onClick={() => onUnhide(audio)}
            disabled={isHiding}
            title="Tornar gravação visível novamente"
          >
            {isHiding ? '...' : 'Desocultar'}
          </button>
        ) : isAudited ? (
          <button
            style={styles.hideBtn}
            onClick={() => onHide(audio)}
            disabled={isHiding}
            title="Ocultar gravação auditada"
          >
            {isHiding ? '...' : 'Ocultar'}
          </button>
        ) : (
          <button
            style={styles.deleteBtn}
            onClick={() => onDelete(audio)}
            disabled={isDeleting}
            title="Remover gravação"
          >
            {isDeleting ? '...' : '🗑'}
          </button>
        )}
      </div>

    </div>
  );
}

export default function AudioList({ token, user }) {
  const [audios, setAudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [hidingId, setHidingId] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [openAudio, setOpenAudio] = useState(null);
  const audioRef = useRef(null);

  async function fetchData(includeHidden = showHidden) {
    const res = await apiFetch(`/audios/mine${includeHidden ? '?showHidden=true' : ''}`, { token });
    if (!res) return;
    const a = await res.json();
    setAudios(Array.isArray(a) ? a : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(async () => {
      const res = await apiFetch(`/audios/mine${showHidden ? '?showHidden=true' : ''}`, { token });
      if (!res) return clearInterval(interval);
      const a = await res.json();
      if (!Array.isArray(a)) return clearInterval(interval);
      setAudios(a);
      if (!a.some((x) => x.status === 'PENDING')) clearInterval(interval);
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  async function handleHide(audio) {
    if (!window.confirm(`Ocultar a gravação de ${formatDate(audio.createdAt)}? Ela não será removida, apenas ocultada da lista.`)) return;
    setHidingId(audio.id);
    const res = await apiFetch(`/audios/${audio.id}/hide`, { token, method: 'PATCH' });
    setHidingId(null);
    if (res && res.ok) {
      if (showHidden) {
        setAudios((prev) => prev.map((a) => a.id === audio.id ? { ...a, hidden: true } : a));
      } else {
        setAudios((prev) => prev.filter((a) => a.id !== audio.id));
      }
    }
  }

  async function handleUnhide(audio) {
    setHidingId(audio.id);
    const res = await apiFetch(`/audios/${audio.id}/unhide`, { token, method: 'PATCH' });
    setHidingId(null);
    if (res && res.ok) {
      setAudios((prev) => prev.map((a) => a.id === audio.id ? { ...a, hidden: false } : a));
    }
  }

  async function handleDelete(audio) {
    if (!window.confirm(`Remover a gravação de ${formatDate(audio.createdAt)}?`)) return;
    setDeletingId(audio.id);
    const res = await apiFetch(`/audios/${audio.id}`, { token, method: 'DELETE' });
    setDeletingId(null);
    if (res && (res.ok || res.status === 204)) {
      setAudios((prev) => prev.filter((a) => a.id !== audio.id));
    }
  }

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
          <button
            style={{ ...styles.refreshBtn, ...(showHidden ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : {}) }}
            onClick={() => { const next = !showHidden; setShowHidden(next); fetchData(next); }}
          >
            {showHidden ? '● Ocultas visíveis' : '○ Mostrar ocultas'}
          </button>
          <button style={styles.refreshBtn} onClick={() => fetchData()}>↻ Atualizar</button>
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
              onDelete={handleDelete}
              isDeleting={deletingId === a.id}
              onHide={handleHide}
              isHiding={hidingId === a.id}
              onUnhide={handleUnhide}
              onOpen={setOpenAudio}
            />
          ))}
        </div>
      )}

      {openAudio && (
        <TranscriptionModal
          audio={openAudio}
          token={token}
          user={user}
          onClose={() => setOpenAudio(null)}
        />
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
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: '4px 6px',
    borderRadius: 6,
    opacity: 0.5,
    flexShrink: 0,
    transition: 'opacity 0.15s',
  },
  hideBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 6,
    color: 'var(--text)',
    flexShrink: 0,
  },
  unhideBtn: {
    background: 'none',
    border: '1px solid var(--accent)',
    cursor: 'pointer',
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 6,
    color: 'var(--accent)',
    fontWeight: 600,
    flexShrink: 0,
  },
  cardHidden: {
    opacity: 0.6,
    borderStyle: 'dashed',
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
