// simpat-web/src/api/http.js
import { API_BASE } from '../config';
import { getToken } from '../lib/auth';

export async function http(path, { method='GET', body, headers } = {}) {
  const token = getToken();
  const finalHeaders = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || res.statusText;
    const detail = data?.detail ? `\nDetail: ${data.detail}` : '';
    throw new Error(`${msg}${detail}`);
  }
  return data;
}
