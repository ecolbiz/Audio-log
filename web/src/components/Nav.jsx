import { NavLink, useNavigate } from 'react-router-dom';

export default function Nav({ onLogout }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('token');
    onLogout();
    navigate('/login');
  }

  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>Audio Log</span>
      <div style={styles.links}>
        <NavLink to="/recordings" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.active : {}) })}>
          Gravações
        </NavLink>
        <NavLink to="/transcripts" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.active : {}) })}>
          Transcrições
        </NavLink>
        <NavLink to="/settings" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.active : {}) })}>
          Configurações
        </NavLink>
      </div>
      <button style={styles.logout} onClick={handleLogout}>Sair</button>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    height: 56,
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
  },
  brand: {
    fontWeight: 700,
    fontSize: 18,
    color: 'var(--text-h)',
    letterSpacing: '-0.5px',
  },
  links: {
    display: 'flex',
    gap: 8,
  },
  link: {
    padding: '6px 14px',
    borderRadius: 8,
    textDecoration: 'none',
    color: 'var(--text)',
    fontSize: 15,
  },
  active: {
    backgroundColor: 'var(--accent-bg)',
    color: 'var(--accent)',
    fontWeight: 600,
  },
  logout: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer',
    color: 'var(--text)',
    fontSize: 15,
  },
};
