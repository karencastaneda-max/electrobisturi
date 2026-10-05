// Arranque, enrutador y estructura general de SIST-EB.
import { api, session } from './api.js';
import { esc, icon, toast } from './ui.js';

export const app = {
  state: { equipos: [], config: null },
  async loadEquipos() { this.state.equipos = await api('/equipos'); this.paintBadges(); return this.state.equipos; },
  get selEq() {
    let id = 0; try { id = +localStorage.getItem('sisteb_eq'); } catch {}
    const eq = this.state.equipos;
    return (eq.find((e) => e.id === id) || eq[0] || {}).id;
  },
  set selEq(id) { try { localStorage.setItem('sisteb_eq', id); } catch {} },
  go(hash) { location.hash = hash; },
  paintBadges() {
    const n = this.state.equipos.reduce((a, e) => a + (e.alertas || 0), 0);
    document.querySelectorAll('[data-badge="alertas"]').forEach((b) => { b.textContent = n; b.style.display = n ? '' : 'none'; });
  },
};

const NAV = [
  ['Principal', [['', 'grid', 'Dashboard'], ['equipos', 'cpu', 'Equipos'], ['qr', 'qr', 'Códigos QR']]],
  ['Gestión', [['mantenimiento', 'wrench', 'Mantenimiento'], ['checklists', 'clip', 'Checklists'], ['inventario', 'box', 'Inventario'], ['resultados', 'chart', 'Resultados']]],
  ['Inteligencia', [['ia', 'bot', 'Asistente IA'], ['diagnostico', 'activity', 'Diagnóstico de fallas'], ['gemelo', 'layers', 'Gemelo digital']]],
  ['Proyecto', [['cronograma', 'clock', 'Cronograma (Gantt)']]],
  ['Documentación', [['documentos', 'file', 'Manuales y normas'], ['reportes', 'print', 'Reportes'], ['ayuda', 'help', 'Ayuda y manuales']]],
];

const ROUTES = [
  ['', 'dashboard'], ['equipos', 'equipos'], ['equipo/:id/:tab?', 'ficha'], ['mantenimiento', 'globales'], ['checklists', 'globales'],
  ['inventario', 'globales'], ['resultados/:eid?', 'resultados'], ['checklist/nuevo/:eid/:codigo', 'checklist'], ['checklist/:id', 'checklist_ver'],
  ['ia', 'ia'], ['diagnostico', 'diagnostico'], ['gemelo/:eid?', 'gemelo'], ['documentos', 'globales'], ['reportes', 'reportes'],
  ['informe/:eid', 'informe'], ['qr', 'qr'], ['cronograma', 'cronograma'], ['e/:code', 'scan'], ['admin', 'admin'], ['ayuda/:doc?', 'ayuda'], ['login', 'login'],
];

function match(path) {
  const parts = path.split('/').filter(Boolean);
  for (const [pat, mod] of ROUTES) {
    const pp = pat.split('/').filter(Boolean); const params = {}; let ok = true;
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(':')) { const opt = pp[i].endsWith('?'); const k = pp[i].replace(/[:?]/g, ''); if (parts[i] === undefined) { if (!opt) ok = false; } else params[k] = decodeURIComponent(parts[i]); }
      else if (parts[i] !== pp[i]) ok = false;
    }
    if (ok && parts.length <= pp.length) return { mod, params, path: parts[0] || '' };
  }
  return { mod: 'dashboard', params: {}, path: '' };
}

function shell() {
  const u = session.user;
  const ini = u.nombre.split(' ').map((w) => w[0]).slice(0, 2).join('');
  document.getElementById('root').innerHTML = `
  <div class="app">
    <aside class="rail" aria-label="Navegación">
      <div class="brand"><div class="brand-logo">EB</div><div><b>SIST-EB</b><span>Electrobisturí · Soporte</span></div></div>
      ${NAV.map(([sec, items]) => `<div class="nav-sec">${sec}</div>` + items.map(([r, ic, t]) =>
        `<a class="nav" href="#/${r}" data-r="${r}">${icon(ic)}<span>${t}</span>${r === '' ? '<span class="nb" data-badge="alertas" style="display:none">0</span>' : ''}</a>`).join('')).join('')}
      ${u.rol === 'administrador' ? `<div class="nav-sec">Sistema</div><a class="nav" href="#/admin" data-r="admin">${icon('gear')}<span>Administración</span></a>` : ''}
      <div class="rail-foot"><div class="user-chip"><div class="avatar">${esc(ini)}</div><div style="min-width:0"><div class="n">${esc(u.nombre)}</div><div class="r">${esc(u.rol)}</div></div>
        <button class="btn icon sm" id="logout" title="Cerrar sesión" aria-label="Cerrar sesión">${icon('out')}</button></div></div>
    </aside>
    <main class="main" id="main"><div id="view"></div></main>
  </div>
  <nav class="mobile-bar" aria-label="Navegación móvil">
    ${[['', 'grid', 'Inicio'], ['equipos', 'cpu', 'Equipos'], ['qr', 'qr', 'QR'], ['ia', 'bot', 'IA'], ['mantenimiento', 'wrench', 'Más']].map(([r, ic, t]) =>
      `<a href="#/${r}" data-r="${r}">${icon(ic)}${t}</a>`).join('')}
  </nav>`;
  document.getElementById('logout').onclick = async () => { try { await api('/logout', { method: 'POST' }); } catch {} session.token = null; session.user = null; location.hash = '#/login'; };
}

let shellOn = false;
async function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const m = match(hash.split('?')[0]);
  const root = document.getElementById('root');
  try {
    if (!state.config) state.config = await api('/config');
  } catch (e) { root.innerHTML = `<div class="login-wrap"><div class="glass login"><h1>Sin conexión</h1><p class="soft">${esc(e.message)}</p></div></div>`; return; }

  const publicScan = m.mod === 'scan' && !session.token;
  if (m.mod === 'login' || (!session.token && !publicScan)) {
    shellOn = false;
    const mod = await import('./pages/login.js');
    return mod.render(root, {}, app);
  }
  if (publicScan) { shellOn = false; const mod = await import('./pages/scan.js'); return mod.renderPublic(root, m.params, app); }
  if (!session.user) { try { session.user = await api('/me'); } catch { location.hash = '#/login'; return; } }
  if (!shellOn || !document.getElementById('view')) { shell(); shellOn = true; }
  if (!app.state.equipos.length) await app.loadEquipos().catch(() => {});
  document.querySelectorAll('[data-r]').forEach((a) => a.classList.toggle('active', a.dataset.r === m.path || (m.path === 'equipo' && a.dataset.r === 'equipos') || (m.path === 'informe' && a.dataset.r === 'reportes') || (m.path === 'checklist' && a.dataset.r === 'checklists') || (m.path === 'e' && a.dataset.r === 'qr')));
  const view = document.getElementById('view');
  view.className = 'view'; view.innerHTML = '<div class="spinner"></div>';
  window.scrollTo(0, 0);
  app.paintBadges();
  try {
    const mod = await import(`./pages/${m.mod}.js`);
    await mod.render(view, { ...m.params, _path: m.path }, app);
    view.classList.remove('view'); void view.offsetWidth; view.classList.add('view');
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="glass pad empty">${icon('alert')}<b>No se pudo cargar esta pantalla</b>${esc(e.message)}</div>`;
  }
}
const state = app.state;

window.addEventListener('hashchange', route);
window.addEventListener('unhandledrejection', (e) => { if (e.reason?.message) toast(e.reason.message, true); });
route();
