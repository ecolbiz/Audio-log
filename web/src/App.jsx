import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Nav from './components/Nav';
import AudioList from './pages/AudioList';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Transcripts from './pages/Transcripts';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');

  function handleLogout() {
    setToken('');
  }

  return (
    <BrowserRouter>
      {token ? (
        <>
          <Nav onLogout={handleLogout} />
          <Routes>
            <Route path="/recordings" element={<AudioList token={token} />} />
            <Route path="/transcripts" element={<Transcripts token={token} />} />
            <Route path="/settings" element={<Settings token={token} />} />
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
