import { api, isAdmin } from '../api.js';
import { esc, icon, topbar, gauge, barChart, hbar, fnum, fdate, estadoPill, tipoMant, resPill } from '../ui.js';

let scope = '';
export async function render(el, p, app) {
  const d = await api('/dashboard' + (scope ? `?equipo_id=${scope}` : ''));
  const r = d.resumen, eqs = app.state.equipos;
  const cDisp = r.disponibilidad >= 98 ? '#2DD4BF' : r.disponibilidad >= 95 ? '#F5A524' : '#F1495B';
  const cCump = r.cumplimiento_pm === null ? '#8B6BF0' : r.cumplimiento_pm >= 80 ? '#2DD4BF' : r.cumplimiento_pm >= 50 ? '#F5A524' : '#F1495B';
  const cConf = r.conformidad === null ? '#8B6BF0' : r.conformidad >= 90 ? '#2DD4BF' : r.conformidad >= 70 ? '#F5A524' : '#F1495B';
  const operativos = r.equipos ? Math.round(r.estados.activo / r.equipos * 100) : 0;
  el.innerHTML = `
    ${topbar('Centro de control', 'Dashboard de mantenimiento', `
      <select class="input" id="scope" style="width:auto;min-width:210px" aria-label="Alcance"><option value="">Todos los equipos (${eqs.length})</option>${eqs.map((e) => `<option value="${e.id}" ${String(e.id) === scope ? 'selected' : ''}>${esc(e.qr_code)} · ${esc(e.marca)} ${esc(e.modelo)}</option>`).join('')}</select>
      <a class="btn primary" href="#/reportes">${icon('print')} Informe técnico</a>`)}
    ${app.state.config?.demo ? `<div class="banner">${icon('info')}<span><b>Modo demostración.</b> Los registros marcados <span class="tag demo">DEMO</span> son datos de ejemplo para mostrar los indicadores; no son resultados de pruebas reales. Reemplácelos con las mediciones del grupo antes de la sustentación.</span>${isAdmin() ? '<a class="btn sm" href="#/admin">Administrar datos demo</a>' : ''}</div>` : ''}
    <div class="gauge-row mb">
      ${gauge(r.disponibilidad, 100, cDisp, 'Disponibilidad', '%', `${r.fallas} fallas · ${fnum(d.equipos.reduce((a, e) => a + e.horas_fuera_servicio, 0), 0)} h fuera de servicio`)}
      ${gauge(r.cumplimiento_pm, 100, cCump, 'Cumplimiento PM', '%', 'Preventivos a tiempo (±7 d)')}
      ${gauge(r.conformidad, 100, cConf, 'Conformidad', '%', 'Checklists conformes')}
      ${gauge(operativos, 100, operativos >= 75 ? '#2DD4BF' : '#F5A524', 'Flota operativa', '%', `${r.estados.activo} de ${r.equipos} equipos operativos`)}
    </div>
    <div class="grid g4 mb">
      <div class="glass kpi ok"><div class="glow"></div><div class="l">${icon('trend')} MTBF</div><div class="v">${fnum(r.mtbf_h, 0)}<small>h</small></div><div class="d">Tiempo medio entre fallas</div></div>
      <div class="glass kpi vio"><div class="glow"></div><div class="l">${icon('wrench')} MTTR</div><div class="v">${fnum(r.mttr_h, 1)}<small>h</small></div><div class="d">Tiempo medio de reparación</div></div>
      <div class="glass kpi ${r.estados.vencido + r.estados.falla ? 'warn' : 'ok'}"><div class="glow"></div><div class="l">${icon('clock')} Equipos con novedad</div><div class="v">${r.estados.vencido + r.estados.falla + r.estados.fuera_de_servicio}<small>/ ${r.equipos}</small></div><div class="d">${r.estados.vencido} vencido(s) · ${r.estados.falla} en falla</div></div>
      <div class="glass kpi ${r.criticas ? 'crit' : r.alertas ? 'warn' : 'ok'}"><div class="glow"></div><div class="l">${icon('bell')} Alertas activas</div><div class="v">${r.alertas}</div><div class="d">${r.criticas} crítica(s)</div></div>
    </div>
    <div class="grid g2 mb">
      <div class="glass pad"><div class="card-head"><div><h3>Mantenimientos por mes</h3><p class="sub">Últimos 12 meses · por tipo</p></div></div>${barChart(d.serie)}</div>
      <div class="glass pad"><div class="card-head"><div><h3>Alertas</h3><p class="sub">Generadas automáticamente a partir de los registros</p></div></div>
        ${d.alertas.length ? d.alertas.slice(0, 7).map((a) => `<div class="alert"><span class="pdot ${a.severidad}"></span><div><div class="t">${esc(a.qr_code)} <span class="tag">${a.tipo.replace(/_/g, ' ')}</span></div><div class="d">${esc(a.descripcion)}</div></div></div>`).join('')
          : `<div class="empty">${icon('check')}<b>Sin alertas</b>Todo en orden.</div>`}</div>
    </div>
    <div class="glass pad mb"><div class="card-head"><div><h3>Estado de los equipos</h3><p class="sub">Indicadores de los últimos 12 meses (o desde el registro)</p></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Equipo</th><th>Servicio</th><th>Estado</th><th class="num">Disp.</th><th class="num">MTBF</th><th class="num">MTTR</th><th class="num">Fallas</th><th>Próx. preventivo</th></tr></thead><tbody>
      ${d.equipos.map((e) => `<tr class="click" data-go="#/equipo/${e.equipo_id}"><td><div class="rn">${esc(e.marca)} ${esc(e.modelo)}</div><div class="idm">${esc(e.qr_code)}</div></td><td>${esc(e.servicio || '—')}<div class="idm">${esc(e.ubicacion || '')}</div></td><td>${estadoPill(e.estado)}</td>
        <td class="num">${fnum(e.disponibilidad, 2)}%</td><td class="num">${fnum(e.mtbf_h, 0)} h</td><td class="num">${fnum(e.mttr_h, 1)} h</td><td class="num">${e.fallas}</td>
        <td>${e.proxima_pm ? `${fdate(e.proxima_pm)} <span class="${e.dias_para_pm < 0 ? 'bad-t' : 'soft'}" style="font-size:11px">${e.dias_para_pm < 0 ? `(vencido ${-e.dias_para_pm} d)` : `(en ${e.dias_para_pm} d)`}</span>` : '<span class="muted">Sin programar</span>'}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="glass pad"><div class="card-head"><div><h3>Actividad reciente</h3><p class="sub">Últimas intervenciones registradas</p></div></div>
      <div class="tl">${d.recientes.length ? d.recientes.map((m) => { const [c, t] = tipoMant[m.tipo]; return `<div class="tl-i"><span class="tl-dot ${m.resultado === 'pendiente' ? 'warn' : c}"></span><div class="tl-b"><div class="tl-t">${t} · ${esc(m.qr_code)} ${resPill(m.resultado)} ${m.es_demo ? '<span class="tag demo">DEMO</span>' : ''}</div><div class="tl-m">${fdate(m.fecha)} · ${esc(m.tecnico || '—')}${m.horas_fuera_servicio ? ` · ${fnum(m.horas_fuera_servicio, 1)} h fuera de servicio` : ''}</div><div class="tl-d">${esc(m.descripcion || '')}</div></div></div>`; }).join('') : '<div class="empty"><b>Sin registros</b></div>'}</div></div>`;
  el.querySelector('#scope').onchange = (e) => { scope = e.target.value; render(el, p, app); };
  el.querySelectorAll('[data-go]').forEach((r) => r.onclick = () => location.hash = r.dataset.go);
}
