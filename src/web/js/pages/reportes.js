import { api, download } from '../api.js';
import { esc, icon, topbar, fnum, fdate, estadoPill, toast } from '../ui.js';

export async function render(el, p, app) {
  await app.loadEquipos();
  const eqs = app.state.equipos;
  el.innerHTML = topbar('Módulo 6', 'Reportes e informe técnico') + `
    <div class="grid g3 mb">${eqs.map((e) => `<div class="glass pad"><div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:10px"><div><div class="rn" style="font-size:15px">${esc(e.marca)} ${esc(e.modelo)}</div><div class="idm">${esc(e.qr_code)} · ${esc(e.servicio || '')}</div></div>${estadoPill(e.estado)}</div>
      <div class="soft" style="font-size:12px;margin-bottom:14px">Disp. ${fnum(e.kpis.disponibilidad, 1)} % · MTBF ${fnum(e.kpis.mtbf_h, 0)} h · MTTR ${fnum(e.kpis.mttr_h, 1)} h</div>
      <a class="btn primary" href="#/informe/${e.id}" style="width:100%;justify-content:center">${icon('print')} Generar informe técnico</a></div>`).join('')}</div>
    <div class="glass pad"><div class="card-head"><div><h3>Exportar datos</h3><p class="sub">Descargue las tablas de la base de datos para análisis externo o respaldo</p></div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${['mantenimientos', 'checklist_items', 'equipos', 'accesorios', 'alertas', 'consultas_ia'].map((t) => `<button class="btn" data-csv="${t}">${icon('down')} ${t}.csv</button>`).join('')}
        <button class="btn" data-x="json">${icon('down')} Respaldo JSON</button><button class="btn" data-x="sql">${icon('down')} Volcado SQL</button></div></div>`;
  el.querySelectorAll('[data-csv]').forEach((b) => b.onclick = () => download('/export/csv?tabla=' + b.dataset.csv, b.dataset.csv + '.csv').catch((e) => toast(e.message, true)));
  el.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => download('/export/' + b.dataset.x, 'sist_eb.' + b.dataset.x).catch((e) => toast(e.message, true)));
}
