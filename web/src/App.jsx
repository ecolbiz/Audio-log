import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Nav from './components/Nav';
import AudioList from './pages/AudioList';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Transcripts from './pages/Transcripts';
import Users from './pages/Users';
import { apiFetch } from './lib/api';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token) { setUser(null); return; }
    apiFetch('/auth/me', { token }).then((r) => r?.json()).then((u) => u && !u.error && setUser(u));
  }, [token]);

  function handleLogout() {
    setToken('');
    setUser(null);
  }

  return (
    <BrowserRouter>
      {token ? (
        <>
          <Nav onLogout={handleLogout} user={user} />
          <Routes>
            <Route path="/recordings" element={<AudioList token={token} user={user} />} />
            <Route path="/transcripts" element={<Transcripts token={token} />} />
            <Route path="/settings" element={<Settings token={token} user={user} />} />
            {user?.role === 'ADMIN' && (
              <Route path="/users" element={<Users token={token} currentUserId={user?.id} />} />
            )}
            <Route path="*" element={<Navigate to="/recordings" replace />} />
          </Routes>
        </>
      ) : (
        <Routes>
          <Route path="/login" element={<Login onLogin={setToken} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
