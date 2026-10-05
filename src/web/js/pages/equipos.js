import { api, canWrite } from '../api.js';
import { esc, icon, topbar, estadoPill, fnum, fdate } from '../ui.js';
import { equipoForm } from '../forms.js';

let q = '', est = '';
export async function render(el, p, app) {
  await app.loadEquipos();
  const draw = () => {
    const list = app.state.equipos.filter((e) => (!est || e.estado === est) && (!q || `${e.nombre} ${e.marca} ${e.modelo} ${e.serie} ${e.qr_code} ${e.servicio || ''} ${e.ubicacion || ''}`.toLowerCase().includes(q.toLowerCase())));
    el.innerHTML = `${topbar('Inventario de equipos', 'Equipos', canWrite() ? `<button class="btn primary" id="new">${icon('plus')} Registrar equipo</button>` : '')}
      <div style="display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap"><input class="input" id="q" placeholder="Buscar por marca, modelo, serie, código o servicio…" value="${esc(q)}" style="max-width:420px">
        <div class="seg">${[['', 'Todos'], ['activo', 'Operativos'], ['vencido', 'Vencidos'], ['falla', 'En falla'], ['fuera_de_servicio', 'Fuera de servicio']].map(([v, t]) => `<button data-s="${v}" class="${v === est ? 'active' : ''}">${t}</button>`).join('')}</div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))">${list.map((e) => `
        <a class="glass pad" href="#/equipo/${e.id}" style="display:block;color:inherit">
          <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px"><div class="hero-plate" style="width:58px;height:58px;border-radius:15px;animation:none">${icon('zap')}</div>
            <div style="flex:1;min-width:0"><div class="rn" style="font-size:15px">${esc(e.marca)} ${esc(e.modelo)} ${e.es_demo ? '<span class="tag demo">DEMO</span>' : ''}</div><div class="idm">${esc(e.qr_code)} · ${esc(e.serie)}</div></div>${estadoPill(e.estado)}</div>
          <div class="soft" style="font-size:12px;margin-bottom:14px">${esc(e.servicio || '—')} · ${esc(e.ubicacion || '—')}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center">
            <div><div class="mono" style="font-size:16px;color:#fff">${fnum(e.kpis.disponibilidad, 1)}%</div><div class="muted" style="font-size:10px;text-transform:uppercase">Disp.</div></div>
            <div><div class="mono" style="font-size:16px;color:#fff">${fnum(e.kpis.mtbf_h, 0)}</div><div class="muted" style="font-size:10px;text-transform:uppercase">MTBF h</div></div>
            <div><div class="mono" style="font-size:16px;${e.alertas ? 'color:var(--red)' : 'color:#fff'}">${e.alertas}</div><div class="muted" style="font-size:10px;text-transform:uppercase">Alertas</div></div></div>
          <div class="muted" style="font-size:11.5px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">Próximo preventivo: <b class="${e.kpis.dias_para_pm !== null && e.kpis.dias_para_pm < 0 ? 'bad-t' : 'soft'}">${e.kpis.proxima_pm ? fdate(e.kpis.proxima_pm) : 'sin programar'}</b></div></a>`).join('') || `<div class="glass pad empty" style="grid-column:1/-1">${icon('cpu')}<b>No hay equipos con ese filtro</b></div>`}</div>`;
    el.querySelector('#q').oninput = (ev) => { q = ev.target.value; const pos = ev.target.selectionStart; draw(); const i = el.querySelector('#q'); i.focus(); i.setSelectionRange(pos, pos); };
    el.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { est = b.dataset.s; draw(); });
    el.querySelector('#new')?.addEventListener('click', async () => { const r = await equipoForm(); if (r?.id) { await app.loadEquipos(); location.hash = '#/equipo/' + r.id; } });
  };
  draw();
}
