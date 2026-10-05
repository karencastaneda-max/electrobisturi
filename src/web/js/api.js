// Cliente de la API REST de SIST-EB
export const session = {
  get token() { try { return localStorage.getItem('sisteb_token'); } catch { return null; } },
  set token(v) { try { v ? localStorage.setItem('sisteb_token', v) : localStorage.removeItem('sisteb_token'); } catch {} },
  user: null,
};

export async function api(path, { method = 'GET', body, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session.token) headers['Authorization'] = 'Bearer ' + session.token;
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('No hay conexión con el servidor de SIST-EB.');
  }
  if (res.status === 401 && path !== '/login') {
    session.token = null; session.user = null;
    if (!location.hash.startsWith('#/e/')) location.hash = '#/login';
    throw new Error('Su sesión expiró. Inicie sesión de nuevo.');
  }
  if (raw) {
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Error');
    return res;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error del servidor (' + res.status + ')');
  return data;
}

export async function download(path, filename) {
  const res = await api(path, { raw: true });
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const canWrite = () => ['tecnico', 'ingeniero', 'administrador'].includes(session.user?.rol);
export const isAdmin = () => session.user?.rol === 'administrador';
