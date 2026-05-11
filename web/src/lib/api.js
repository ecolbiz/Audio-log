export const API = 'http://localhost:3000/api';

export async function apiFetch(path, { token, ...options } = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.replace('/login');
    return null;
  }

  return res;
}
