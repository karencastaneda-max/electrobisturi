import { api, canWrite } from '../api.js';
import { esc, icon, topbar, modal, val, chk, confirmBox, toast, fdate, fnum, todayISO } from '../ui.js';

const DAY = 86400000, FASES = {
  'Entrega 1 · Diseño e ingeniería clínica': '#8B6BF0', 'Entregas 2 y 3 · Plataforma': '#2DD4BF', 'Cierre y sustentación': '#F5A524',
};
const d0 = (s) => new Date(s.slice(0, 10) + 'T00:00:00');
let view = 'proyecto';

function timeline(from, to, dw) {
  const days = Math.round((to - from) / DAY) + 1, W = days * dw;
  const X = (d) => Math.round((d - from) / DAY) * dw;
  let months = '', weeks = '', grid = '';
  const MN = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (d.getDate() === 1 || d.getTime() === from.getTime()) months += `<span style="left:${X(d)}px">${MN[d.getMonth()]} ${String(d.getFullYear()).slice(2)}</span>`;
    if (d.getDay() === 1) { weeks += `<span style="left:${X(d)}px">${d.getDate()}</span>`; grid += `<div class="g-line" style="left:${X(d)}px"></div>`; }
    if (d.getDay() === 6) grid += `<div class="g-we" style="left:${X(d)}px;width:${dw * 2}px"></div>`;
  }
  const t = d0(todayISO());
  const today = t >= from && t <= to ? `<div class="g-today" style="left:${X(t) + dw / 2}px"></div>` : '';
  return { W, X, months, weeks, grid, today };
}

export async function render(el, p, app) {
  const draw = async () => {
    el.innerHTML = topbar('Plan de trabajo', 'Cronograma · Diagrama de Gantt', `<div class="seg">${[['proyecto', 'Proyecto'], ['mantenimiento', 'Mantenimiento preventivo']].map(([v, t]) => `<button data-v="${v}" class="${v === view ? 'active' : ''}">${t}</button>`).join('')}</div>
      ${view === 'proyecto' && canWrite() ? `<button class="btn primary" id="add">${icon('plus')} Nueva tarea</button>` : ''}<button class="btn" onclick="window.print()">${icon('print')} Imprimir</button>`) + '<div id="body"></div>';
    el.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => { view = b.dataset.v; draw(); });
    if (view === 'proyecto') await proyecto(el.querySelector('#body'), draw); else await mantenimiento(el.querySelector('#body'), app);
    el.querySelector('#add')?.addEventListener('click', async () => { if (await tareaForm()) draw(); });
  };
  await draw();
}

async function proyecto(box, redraw) {
  const T = await api('/cronograma');
  if (!T.length) { box.innerHTML = '<div class="glass pad empty"><b>Sin tareas</b></div>'; return; }
  const hoy = d0(todayISO());
  const from = new Date(Math.min(...T.map((t) => d0(t.inicio))) - 3 * DAY), to = new Date(Math.max(...T.map((t) => d0(t.fin))) + 5 * DAY);
  const ndays = Math.round((to - from) / DAY) + 1, dw = Math.max(6, Math.min(13, Math.floor(930 / ndays))), tl = timeline(from, to, dw);
  const dur = (t) => Math.max(1, (d0(t.fin) - d0(t.inicio)) / DAY + 1);
  const norm = T.filter((t) => !t.hito);
  const global = norm.reduce((a, t) => a + t.avance * dur(t), 0) / norm.reduce((a, t) => a + dur(t), 0);
  const late = norm.filter((t) => t.avance < 100 && d0(t.fin) < hoy);
  const hitos = T.filter((t) => t.hito && d0(t.inicio) >= hoy).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const prox = hitos[0];
  const fases = [...new Set(T.map((t) => t.fase))];
  const rowsL = [], rowsR = [];
  fases.forEach((f) => {
    const ts = T.filter((t) => t.fase === f), c = FASES[f] || '#22D3EE';
    const av = ts.filter((t) => !t.hito).reduce((a, t) => a + t.avance * dur(t), 0) / (ts.filter((t) => !t.hito).reduce((a, t) => a + dur(t), 0) || 1);
    rowsL.push(`<div class="g-row phase"><span style="color:${c}">●</span><span class="nm">${esc(f)}</span><span class="pc">${fnum(av, 0)}%</span></div>`);
    rowsR.push(`<div class="g-r phase"></div>`);
    ts.forEach((t) => {
      const l = tl.X(d0(t.inicio)), w = Math.max(dw, tl.X(d0(t.fin)) - l + dw);
      const atras = !t.hito && t.avance < 100 && d0(t.fin) < hoy;
      const tip = `<b>${esc(t.nombre)}</b><br>${fdate(t.inicio)}${t.inicio !== t.fin ? ' → ' + fdate(t.fin) : ''}<br>Avance: ${t.avance}% · ${esc(t.responsable || '—')}${t.estimada ? '<br>⚠ fechas estimadas' : ''}${atras ? '<br>⚠ atrasada' : ''}`;
      rowsL.push(`<div class="g-row task" data-id="${t.id}" title="${esc(t.nombre)}">${t.hito ? '<span style="color:' + c + '">◆</span>' : ''}<span class="nm">${esc(t.nombre.replace('HITO · ', ''))}</span><span class="pc">${t.hito ? '' : t.avance + '%'}</span></div>`);
      rowsR.push(`<div class="g-r" data-id="${t.id}">${t.hito
        ? `<div class="g-ms" data-edit="${t.id}" data-tip="${tip}" style="left:${l + dw / 2 - 10}px;background:${c}"></div>`
        : `<div class="g-bar ${t.estimada ? 'est' : ''} ${atras ? 'late' : ''}" data-edit="${t.id}" data-tip="${tip}" style="left:${l}px;width:${w}px;background:${c}"><i style="width:${t.avance}%"></i><span>${t.avance >= 100 ? '✓' : t.avance + '%'}</span></div>`}</div>`);
    });
  });
  box.innerHTML = `
    <div class="grid g4 mb">
      <div class="glass kpi ok"><div class="glow"></div><div class="l">Avance global</div><div class="v">${fnum(global, 0)}<small>%</small></div><div class="d">Ponderado por duración</div></div>
      <div class="glass kpi vio"><div class="glow"></div><div class="l">Tareas completadas</div><div class="v">${norm.filter((t) => t.avance >= 100).length}<small>/ ${norm.length}</small></div><div class="d">${norm.filter((t) => t.avance > 0 && t.avance < 100).length} en curso</div></div>
      <div class="glass kpi ${late.length ? 'crit' : 'ok'}"><div class="glow"></div><div class="l">Tareas atrasadas</div><div class="v">${late.length}</div><div class="d">${late.length ? esc(late[0].nombre.slice(0, 40)) : 'Todo al día'}</div></div>
      <div class="glass kpi ${prox && (d0(prox.inicio) - hoy) / DAY <= 7 ? 'warn' : ''}"><div class="glow"></div><div class="l">Próximo hito</div><div class="v" style="font-size:22px;margin-top:11px">${prox ? Math.round((d0(prox.inicio) - hoy) / DAY) + '<small>días</small>' : '—'}</div><div class="d">${prox ? esc(prox.nombre.replace('HITO · ', '')) + ' · ' + fdate(prox.inicio) : 'Sin hitos pendientes'}</div></div>
    </div>
    <div class="glass pad"><div class="card-head"><div><h3>Diagrama de Gantt del proyecto</h3><p class="sub">La barra clara indica el avance. Borde punteado = fechas estimadas por confirmar. Haga clic en una barra para editarla.</p></div></div>
      <div class="gantt"><div class="g-left"><div class="g-head">Tarea</div>${rowsL.join('')}</div>
        <div class="g-scroll" id="gs"><div class="g-chart" style="width:${tl.W}px"><div class="g-months">${tl.months}</div><div class="g-weeks">${tl.weeks}</div><div class="g-body">${tl.grid}${tl.today}${rowsR.join('')}</div></div></div></div>
      <div class="g-legend">${fases.map((f) => `<span><i style="background:${FASES[f] || '#22D3EE'}"></i>${esc(f)}</span>`).join('')}<span>◆ Hito</span><span><i style="background:transparent;border:1px dashed #aaa"></i>Fecha estimada</span><span style="color:var(--red)">| Hoy</span></div></div>`;
  const gs = box.querySelector('#gs'); gs.scrollLeft = innerWidth < 860 ? Math.max(0, tl.X(hoy) - 120) : 0;
  box.querySelectorAll('[data-edit]').forEach((b) => b.onclick = async () => { if (canWrite() && await tareaForm(T.find((t) => t.id == b.dataset.edit))) redraw(); });
  box.querySelectorAll('.g-row.task').forEach((r) => { r.onmouseenter = () => box.querySelector(`.g-r[data-id="${r.dataset.id}"]`)?.classList.add('hl'); });
}

export function tareaForm(t = null) {
  const d = t || { fase: 'Entregas 2 y 3 · Plataforma', inicio: todayISO(), fin: todayISO(), avance: 0, responsable: 'Por asignar', hito: 0, estimada: 1 };
  return modal({
    title: t ? 'Editar tarea' : 'Nueva tarea', wide: false, sub: 'Cambie fechas, avance y responsable; el diagrama se actualiza al guardar.',
    body: `<div class="form-grid"><div class="full"><label class="f">Nombre *</label><input class="input" name="nombre" value="${esc(d.nombre || '')}"></div>
      <div class="full"><label class="f">Fase</label><input class="input" name="fase" list="fl" value="${esc(d.fase)}"><datalist id="fl">${Object.keys(FASES).map((f) => `<option value="${esc(f)}">`).join('')}</datalist></div>
      <div><label class="f">Inicio</label><input class="input" type="date" name="inicio" value="${d.inicio}"></div><div><label class="f">Fin</label><input class="input" type="date" name="fin" value="${d.fin}"></div>
      <div><label class="f">Avance (%)</label><input class="input" type="number" min="0" max="100" name="avance" value="${d.avance}"></div><div><label class="f">Responsable</label><input class="input" name="responsable" value="${esc(d.responsable || '')}"></div>
      <div><label class="check"><input type="checkbox" name="hito" ${d.hito ? 'checked' : ''}> Es un hito</label></div><div><label class="check"><input type="checkbox" name="estimada" ${d.estimada ? 'checked' : ''}> Fechas estimadas</label></div>
      <div class="full"><label class="f">Notas</label><input class="input" name="notas" value="${esc(d.notas || '')}"></div></div>
      ${t ? '<div style="margin-top:14px"><button class="btn danger sm" data-del>Eliminar tarea</button></div>' : ''}`,
    onMount: (b) => b.querySelector('[data-del]')?.addEventListener('click', async () => { if (await confirmBox('Eliminar tarea', 'Se quitará del cronograma.')) { await api('/cronograma/' + t.id, { method: 'DELETE' }); b.close(true); } }),
    onOk: async (b) => {
      const body = { nombre: val(b, 'nombre'), fase: val(b, 'fase'), inicio: val(b, 'inicio'), fin: val(b, 'fin'), avance: val(b, 'avance'), responsable: val(b, 'responsable'), hito: chk(b, 'hito'), estimada: chk(b, 'estimada'), notas: val(b, 'notas') };
      if (body.hito) body.fin = body.inicio;
      if (t) await api('/cronograma/' + t.id, { method: 'PUT', body }); else await api('/cronograma', { method: 'POST', body });
      toast('Cronograma actualizado'); return true;
    },
  });
}

async function mantenimiento(box, app) {
  await app.loadEquipos();
  const eqs = await Promise.all(app.state.equipos.map((e) => api('/equipos/' + e.id)));
  const hoy = d0(todayISO());
  const all = eqs.flatMap((e) => e.mantenimientos.map((m) => d0(m.fecha)).concat(e.kpis.proxima_pm ? [d0(e.kpis.proxima_pm)] : []));
  const from = new Date(Math.min(...all, hoy) - 10 * DAY), to = new Date(Math.max(...all, hoy) + 30 * DAY);
  const dw = 3.2, tl = timeline(from, to, dw);
  const rowsL = [], rowsR = [];
  eqs.forEach((e) => {
    const pms = e.mantenimientos.filter((m) => m.tipo === 'preventivo').sort((a, b) => a.fecha.localeCompare(b.fecha));
    const last = pms[pms.length - 1], prox = e.kpis.proxima_pm ? d0(e.kpis.proxima_pm) : null;
    rowsL.push(`<div class="g-row task"><span class="nm">${esc(e.qr_code)} · ${esc(e.marca)} ${esc(e.modelo)}</span></div>`);
    let h = '';
    pms.forEach((m, i) => { if (i === 0) return; const a = d0(pms[i - 1].fecha), b = d0(m.fecha); h += `<div class="g-bar" style="left:${tl.X(a)}px;width:${Math.max(dw, tl.X(b) - tl.X(a))}px;background:rgba(45,212,191,.35);top:14px;height:10px" data-tip="Ciclo preventivo<br>${fdate(pms[i - 1].fecha)} → ${fdate(m.fecha)}"></div>`; });
    if (last && prox) { const a = d0(last.fecha), over = prox < hoy; h += `<div class="g-bar" style="left:${tl.X(a)}px;width:${Math.max(dw, tl.X(prox) - tl.X(a))}px;background:${over ? 'rgba(241,73,91,.55)' : 'rgba(139,107,240,.6)'};top:14px;height:10px" data-tip="Próximo preventivo: ${fdate(e.kpis.proxima_pm)}${over ? '<br>⚠ VENCIDO hace ' + (-e.kpis.dias_para_pm) + ' días' : ''}"></div>`; }
    pms.forEach((m) => h += `<div class="g-ms" style="left:${tl.X(d0(m.fecha)) - 7}px;background:#2DD4BF;width:16px;height:16px;top:11px" data-tip="Preventivo<br>${fdate(m.fecha)}${m.es_demo ? ' [DEMO]' : ''}"></div>`);
    e.mantenimientos.filter((m) => m.falla).forEach((m) => h += `<div class="g-dot" style="left:${tl.X(d0(m.fecha)) - 5}px" data-tip="Falla (${fnum(m.horas_fuera_servicio, 0)} h fuera)<br>${fdate(m.fecha)}<br>${esc((m.descripcion || '').slice(0, 60))}"></div>`);
    if (prox) h += `<div class="g-ms" style="left:${tl.X(prox) - 7}px;background:${prox < hoy ? '#F1495B' : '#8B6BF0'};width:16px;height:16px;top:11px" data-tip="Programado: ${fdate(e.kpis.proxima_pm)}"></div>`;
    rowsR.push(`<div class="g-r">${h}</div>`);
  });
  box.innerHTML = `<div class="glass pad"><div class="card-head"><div><h3>Programa de mantenimiento preventivo</h3><p class="sub">Ciclos entre preventivos, próximas fechas programadas y fallas, calculados desde las hojas de vida.</p></div></div>
    <div class="gantt"><div class="g-left"><div class="g-head">Equipo</div>${rowsL.join('')}</div><div class="g-scroll" id="gs"><div class="g-chart" style="width:${tl.W}px"><div class="g-months">${tl.months}</div><div class="g-weeks">${tl.weeks}</div><div class="g-body">${tl.grid}${tl.today}${rowsR.join('')}</div></div></div></div>
    <div class="g-legend"><span><i style="background:#2DD4BF"></i>Preventivo realizado ◆</span><span><i style="background:#8B6BF0"></i>Próximo programado</span><span><i style="background:#F1495B"></i>Vencido</span><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#F1495B;margin-right:6px"></span>Falla</span></div></div>`;
  box.querySelector('#gs').scrollLeft = Math.max(0, tl.X(hoy) - 500);
}
