import { api, session } from '../api.js';
import { esc, icon, toast } from '../ui.js';

const DEMO = [
  ['camila.rojas@sist-eb.local', 'Camila Rojas', 'Técnica'], ['karen.castaneda@sist-eb.local', 'Karen Castañeda', 'Ingeniera'],
  ['docente@sist-eb.local', 'Docente', 'Solo lectura'], ['admin@sist-eb.local', 'Administrador', 'Admin'],
];

export function render(root) {
  root.innerHTML = `<div class="login-wrap"><form class="glass login" id="lf" autocomplete="on">
    <div class="brand"><div class="brand-logo">EB</div><div><b>SIST-EB</b><span>Gestión · Mantenimiento · Asistencia técnica</span></div></div>
    <h1>Iniciar sesión</h1><p class="soft" style="margin:0 0 20px;font-size:13px">Plataforma inteligente de soporte del electrobisturí</p>
    <label class="f" for="em">Correo</label><input class="input" id="em" name="email" type="email" required style="margin-bottom:14px" autocomplete="username">
    <label class="f" for="pw">Contraseña</label><input class="input" id="pw" name="password" type="password" required autocomplete="current-password">
    <button class="btn primary" style="width:100%;justify-content:center;margin-top:20px;padding:12px">${icon('zap')} Entrar</button>
    <div class="muted" style="font-size:11px;margin:20px 0 4px;text-transform:uppercase;letter-spacing:.8px;font-weight:700">Cuentas de demostración · clave: sisteb2026</div>
    <div class="demo-users">${DEMO.map(([e, n, r]) => `<div class="demo-user" data-e="${e}"><span>${esc(n)}</span><span class="tag">${r}</span></div>`).join('')}</div>
  </form></div>`;
  root.querySelectorAll('.demo-user').forEach((d) => d.onclick = () => { root.querySelector('#em').value = d.dataset.e; root.querySelector('#pw').value = 'sisteb2026'; });
  root.querySelector('#lf').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = root.querySelector('button.primary'); btn.disabled = true;
    try {
      const r = await api('/login', { method: 'POST', body: { email: root.querySelector('#em').value, password: root.querySelector('#pw').value } });
      session.token = r.token; session.user = r.user;
      let next = ''; try { next = sessionStorage.getItem('sisteb_next') || ''; sessionStorage.removeItem('sisteb_next'); } catch {}
      location.hash = next || '#/';
    } catch (e) { toast(e.message, true); btn.disabled = false; }
  };
}
