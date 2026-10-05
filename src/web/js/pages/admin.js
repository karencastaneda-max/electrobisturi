import { api, download } from '../api.js';
import { esc, icon, topbar, fdate, confirmBox, modal, val, toast } from '../ui.js';

export async function render(el, p, app) {
  const [users, cfg, docs] = await Promise.all([api('/usuarios'), api('/config'), api('/documentos')]);
  const draw = () => {
    el.innerHTML = topbar('Sistema', 'Administración') + `
    ${cfg.demo ? `<div class="banner">${icon('alert')}<span><b>Hay datos de demostración cargados.</b> Elimínelos cuando el grupo tenga sus propias mediciones: se borran los mantenimientos, checklists, accesorios y equipos marcados DEMO. La hoja de vida del equipo principal se conserva.</span><button class="btn danger" id="purge">${icon('trash')} Eliminar datos demo</button></div>` : `<div class="hl-box ok mb">${icon('check')} No hay datos de demostración: la plataforma contiene solo datos reales.</div>`}
    <div class="grid gE mb">
      <div class="glass pad"><div class="card-head"><div><h3>Dirección base de los códigos QR</h3><p class="sub">URL que se codifica en cada QR. Debe ser alcanzable desde el celular.</p></div></div>
        <label class="f">URL base (sin / final)</label><input class="input" id="base" value="${esc(cfg.base_url)}" placeholder="http://192.168.1.10:8765">
        <p class="muted" style="font-size:11.5px;margin:10px 0 14px">Detectada automáticamente: <span class="mono">http://${esc(cfg.lan_ip)}:${cfg.port}</span>. Si publica la plataforma en internet, escriba aquí su dirección pública (https://…).</p>
        <div style="display:flex;gap:10px"><button class="btn primary" id="sb">${icon('check')} Guardar</button><button class="btn" id="auto">Usar la detectada</button></div></div>
      <div class="glass pad"><div class="card-head"><div><h3>Respaldo y exportación</h3><p class="sub">Base de datos SQLite · archivo <span class="mono">data/sist_eb.db</span></p></div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-x="json">${icon('down')} Respaldo JSON</button><button class="btn" data-x="sql">${icon('down')} Volcado SQL</button><a class="btn" href="#/reportes">${icon('print')} Reportes</a></div>
        <p class="muted" style="font-size:11.5px;margin-top:14px">${docs.length} documentos indexados · ${app.state.equipos.length} equipos · ${users.length} usuarios.</p></div></div>
    <div class="glass pad"><div class="card-head"><div><h3>Usuarios y roles</h3><p class="sub">Técnico, ingeniero y administrador pueden registrar; docente y estudiante solo consultan y usan el asistente.</p></div><button class="btn primary" id="nu">${icon('plus')} Nuevo usuario</button></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Creado</th><th></th></tr></thead><tbody>${users.map((u) => `<tr><td class="rn">${esc(u.nombre)}</td><td class="idm">${esc(u.email)}</td><td><span class="pill info">${u.rol}</span></td><td>${fdate(u.fecha_creacion)}</td><td><button class="btn sm danger" data-del="${u.id}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div></div>`;
    el.querySelector('#purge')?.addEventListener('click', async () => { if (await confirmBox('Eliminar datos demo', 'Se borrarán todos los registros marcados DEMO. Esta acción no se puede deshacer.', 'Eliminar datos demo')) { await api('/demo/purge', { method: 'POST' }); await app.loadEquipos(); app.state.config = await api('/config'); toast('Datos demo eliminados'); render(el, p, app); } });
    el.querySelector('#sb').onclick = async () => { await api('/config', { method: 'PUT', body: { base_url: el.querySelector('#base').value } }); app.state.config = await api('/config'); toast('Dirección guardada'); };
    el.querySelector('#auto').onclick = async () => { await api('/config', { method: 'PUT', body: { base_url: '' } }); app.state.config = await api('/config'); toast('Se usará la dirección detectada'); render(el, p, app); };
    el.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => download('/export/' + b.dataset.x, 'sist_eb.' + b.dataset.x));
    el.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (await confirmBox('Eliminar usuario', 'El usuario perderá el acceso.')) { try { await api('/usuarios/' + b.dataset.del, { method: 'DELETE' }); render(el, p, app); } catch (e) { toast(e.message, true); } } });
    el.querySelector('#nu').onclick = async () => {
      const ok = await modal({ title: 'Nuevo usuario', body: `<div class="form-grid"><div class="full"><label class="f">Nombre</label><input class="input" name="nombre"></div><div><label class="f">Correo</label><input class="input" name="email" type="email"></div><div><label class="f">Contraseña (mín. 6)</label><input class="input" name="password" type="password"></div>
        <div class="full"><label class="f">Rol</label><select class="input" name="rol">${['tecnico', 'ingeniero', 'administrador', 'docente', 'estudiante'].map((r) => `<option>${r}</option>`).join('')}</select></div></div>`,
        onOk: async (m) => { await api('/usuarios', { method: 'POST', body: { nombre: val(m, 'nombre'), email: val(m, 'email'), password: val(m, 'password'), rol: val(m, 'rol') } }); return true; } });
      if (ok) render(el, p, app);
    };
  };
  draw();
}
