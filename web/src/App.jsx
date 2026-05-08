import { useState } from 'react';

export default function App() {
  const [token, setToken] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);

  const search = async () => {
    const res = await fetch(`http://localhost:3000/api/admin/audios?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setItems(await res.json());
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Painel de gravações</h1>
      <input placeholder="JWT" value={token} onChange={(e) => setToken(e.target.value)} />
      <input placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
      <button onClick={search}>Pesquisar</button>
      <table>
        <thead><tr><th>Data</th><th>Cliente</th><th>Meio</th><th>Assunto</th></tr></thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}><td>{a.extractedDate}</td><td>{a.extractedClient}</td><td>{a.extractedMedium}</td><td>{a.extractedSubject}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
