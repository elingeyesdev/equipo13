export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem('cu_token');
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch(e) { err = { error: res.statusText }; }
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
};
