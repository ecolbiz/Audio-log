import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function RoleBadge({ role }) {
  const isAdmin = role === 'ADMIN';
  return (
    <span style={{ ...s.badge, color: isAdmin ? '#8b5cf6' : 'var(--text)', borderColor: isAdmin ? '#8b5cf6' : 'var(--border)' }}>
      {isAdmin ? 'Admin' : 'Usuário'}
    </span>
  );
}

export default function Users({ token, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const res = await apiFetch('/admin/users', { token });
    if (!res) return;
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(u) {
    setEditingId(u.id);
    setEditData({ name: u.name, email: u.email, role: u.role, password: '' });
  }

  async function handleUpdate(id) {
    setSaving(true);
    const body = { name: editData.name, email: editData.email, role: editData.role };
    if (editData.password) body.password = editData.password;
    const res = await apiFetch(`/admin/users/${id}`, {
      token, method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res?.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => u.id === id ? updated : u));
      setEditingId(null);
    }
    setSaving(false);
  }

  async function handleDelete(u) {
    if (!window.confirm(`Remover o usuário "${u.name}"?`)) return;
    setDeletingId(u.id);
    const res = await apiFetch(`/admin/users/${u.id}`, { token, method: 'DELETE' });
    if (res && (res.ok || res.status === 204)) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    }
    setDeletingId(null);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.email || !form.password) { setFormError('Preencha todos os campos.'); return; }
    setCreating(true);
    const res = await apiFetch('/admin/users', {
      token, method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res) {
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Erro ao criar usuário.'); }
      else {
        setUsers((prev) => [...prev, data]);
        setForm({ name: '', email: '', password: '', role: 'USER' });
      }
    }
    setCreating(false);
  }

  return (
    <div style={s.page}>
      <h2 style={s.heading}>Usuários</h2>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Nome', 'E-mail', 'Perfil', 'Criado em', ''].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: 'var(--text)' }}>Carregando...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} style={s.tr}>
                {editingId === u.id ? (
                  <>
                    <td style={s.td}>
                      <input style={s.input} value={editData.name} onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))} />
                    </td>
                    <td style={s.td}>
                      <input style={s.input} value={editData.email} onChange={(e) => setEditData((d) => ({ ...d, email: e.target.value }))} />
                    </td>
                    <td style={s.td}>
                      <select style={s.select} value={editData.role} onChange={(e) => setEditData((d) => ({ ...d, role: e.target.value }))}>
                        <option value="USER">Usuário</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td style={s.td}>
                      <input style={s.input} type="password" value={editData.password} onChange={(e) => setEditData((d) => ({ ...d, password: e.target.value }))} placeholder="Nova senha (opcional)" />
                    </td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                      <button style={s.saveBtn} onClick={() => handleUpdate(u.id)} disabled={saving}>Salvar</button>
                      <button style={s.cancelBtn} onClick={() => setEditingId(null)}>Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={s.td}>
                      <span style={s.userName}>{u.name}</span>
                      {u.id === currentUserId && <span style={s.youBadge}>você</span>}
                    </td>
                    <td style={s.td}><span style={s.email}>{u.email}</span></td>
                    <td style={s.td}><RoleBadge role={u.role} /></td>
                    <td style={s.td}><span style={s.date}>{fmt(u.createdAt)}</span></td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                      <button style={s.editBtn} onClick={() => startEdit(u)}>Editar</button>
                      {u.id !== currentUserId && (
                        <button style={s.deleteBtn} onClick={() => handleDelete(u)} disabled={deletingId === u.id}>
                          {deletingId === u.id ? '...' : '✕'}
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleCreate} style={s.form}>
        <span style={s.formTitle}>Novo usuário</span>
        {formError && <span style={s.formError}>{formError}</span>}
        <div style={s.formRow}>
          <input style={s.input} placeholder="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input style={s.input} placeholder="E-mail" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <input style={s.input} placeholder="Senha" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <select style={s.select} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="USER">Usuário</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button style={s.createBtn} type="submit" disabled={creating}>
            {creating ? 'Criando...' : '+ Criar'}
          </button>
        </div>
      </form>
    </div>
  );
}

const s = {
  page: { padding: '32px', display: 'flex', flexDirection: 'column', gap: 24, textAlign: 'left', maxWidth: 900 },
  heading: { margin: 0, fontSize: 28, fontWeight: 600, color: 'var(--text-h)' },
  tableWrap: { borderRadius: 12, border: '1px solid var(--border)', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { padding: '10px 16px', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 12, background: 'var(--code-bg)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 16px', color: 'var(--text-h)', verticalAlign: 'middle' },
  badge: { fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, border: '1px solid' },
  userName: { fontWeight: 600 },
  youBadge: { marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 600 },
  email: { fontSize: 13, color: 'var(--text)' },
  date: { fontSize: 13, color: 'var(--text)' },
  input: { padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: 13, flex: 1, minWidth: 0 },
  select: { padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: 13, cursor: 'pointer' },
  editBtn: { padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', fontSize: 12, cursor: 'pointer', marginRight: 4 },
  saveBtn: { padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', marginRight: 4 },
  cancelBtn: { padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', fontSize: 12, cursor: 'pointer' },
  deleteBtn: { padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', border: '1px dashed var(--border)', borderRadius: 12 },
  formTitle: { fontWeight: 600, fontSize: 14, color: 'var(--text-h)' },
  formRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  formError: { fontSize: 13, color: '#ef4444' },
  createBtn: { padding: '7px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
};
