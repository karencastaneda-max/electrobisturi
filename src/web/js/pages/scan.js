import { api, canWrite, session } from '../api.js';
import { esc, icon, estadoPill, fdate, fnum } from '../ui.js';
import { mantForm, fotoForm } from '../forms.js';

export async function render(el, p, app) {
  let eq;
  try { eq = await api('/equipos/qr/' + encodeURIComponent(p.code)); }
  catch (e) { el.innerHTML = `<div class="glass pad empty" style="max-width:520px;margin:40px auto">${icon('alert')}<b>No existe el equipo «${esc(p.code)}»</b>${esc(e.message)}<br><a class="btn" href="#/qr" style="margin-top:14px">Buscar otro código</a></div>`; return; }
  app.selEq = eq.id; const k = eq.kpis;
  el.innerHTML = `<div style="max-width:640px;margin:0 auto">
    <div class="eyebrow" style="text-align:center;margin-bottom:12px">${icon('qr')} Ficha de campo · escaneo de ${esc(eq.qr_code)}</div>
    <div class="glass hero" style="flex-direction:column;text-align:center;padding:28px 22px"><div class="hero-plate">${icon('zap')}</div>
      <h2 style="font-size:23px;justify-content:center">${esc(eq.marca)} ${esc(eq.modelo)}</h2><div class="idm">${esc(eq.nombre)} · Serie ${esc(eq.serie)}</div><div style="margin-top:6px">${estadoPill(eq.estado)}</div>
      <div class="soft" style="font-size:13px">${esc(eq.servicio || '')} · ${esc(eq.ubicacion || '')}</div></div>
    <div class="grid g3 mb" style="grid-template-columns:repeat(3,1fr)"><div class="glass kpi"><div class="l">Próx. PM</div><div class="v" style="font-size:16px;margin-top:12px">${k.proxima_pm ? fdate(k.proxima_pm) : '—'}</div><div class="d ${k.dias_para_pm < 0 ? 'bad-t' : ''}">${k.dias_para_pm === null ? '' : k.dias_para_pm < 0 ? `vencido ${-k.dias_para_pm} d` : `en ${k.dias_para_pm} d`}</div></div>
      <div class="glass kpi"><div class="l">Disp.</div><div class="v" style="font-size:20px;margin-top:10px">${fnum(k.disponibilidad, 1)}%</div></div><div class="glass kpi ${eq.alertas.length ? 'crit' : 'ok'}"><div class="l">Alertas</div><div class="v" style="font-size:20px;margin-top:10px">${eq.alertas.length}</div></div></div>
    ${eq.alertas.length ? `<div class="glass pad mb">${eq.alertas.map((a) => `<div class="alert"><span class="pdot ${a.severidad}"></span><div class="t">${esc(a.descripcion)}</div></div>`).join('')}</div>` : ''}
    <div style="display:grid;gap:10px">
      <a class="btn primary" style="justify-content:center;padding:14px" href="#/equipo/${eq.id}">${icon('cpu')} Ver hoja de vida completa</a>
      <button class="btn" style="justify-content:center;padding:14px" id="m" ${canWrite() ? '' : 'disabled'}>${icon('wrench')} Registrar mantenimiento</button>
      <a class="btn" style="justify-content:center;padding:14px" href="#/equipo/${eq.id}/checklists">${icon('clip')} Hacer checklist</a>
      <button class="btn" style="justify-content:center;padding:14px" id="f" ${canWrite() ? '' : 'disabled'}>${icon('camera')} Tomar foto de evidencia</button>
      <a class="btn" style="justify-content:center;padding:14px" href="#/ia">${icon('bot')} Preguntar al asistente</a></div></div>`;
  el.querySelector('#m').onclick = async () => { if (await mantForm(eq)) { await app.loadEquipos(); render(el, p, app); } };
  el.querySelector('#f').onclick = async () => { if (await fotoForm(eq)) render(el, p, app); };
}

export async function renderPublic(root, p) {
  let eq = null, err = '';
  try { eq = await api('/public/equipo/' + encodeURIComponent(p.code)); } catch (e) { err = e.message; }
  root.innerHTML = `<div class="login-wrap"><div class="glass login" style="text-align:center"><div class="brand" style="justify-content:center"><div class="brand-logo">EB</div><div style="text-align:left"><b>SIST-EB</b><span>Ficha pública del equipo</span></div></div>
    ${eq ? `<div class="hero-plate" style="margin:0 auto 16px">${icon('zap')}</div><h1>${esc(eq.marca)} ${esc(eq.modelo)}</h1><div class="idm" style="margin:6px 0 10px">${esc(eq.qr_code)} · Serie ${esc(eq.serie)}</div>${estadoPill(eq.estado)}
      <div class="soft" style="margin:14px 0 4px">${esc(eq.servicio || '')} · ${esc(eq.ubicacion || '')}</div>
      <div class="soft" style="font-size:13px">Próximo mantenimiento preventivo: <b style="color:#fff">${eq.proxima_pm ? fdate(eq.proxima_pm) : 'sin programar'}</b></div>
      <button class="btn primary" id="lg" style="width:100%;justify-content:center;margin-top:22px;padding:13px">${icon('zap')} Iniciar sesión para ver la hoja de vida</button>`
      : `<div class="empty">${icon('alert')}<b>Equipo no encontrado</b>${esc(err)}</div>`}</div></div>`;
  root.querySelector('#lg')?.addEventListener('click', () => { try { sessionStorage.setItem('sisteb_next', '#/e/' + encodeURIComponent(p.code)); } catch {} location.hash = '#/login'; });
}
