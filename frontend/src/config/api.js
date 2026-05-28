export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const fmtQty = (val) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val ?? '';
  return parseFloat(n.toFixed(3)).toString();
};

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
