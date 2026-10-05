import { api } from '../api.js';
import { esc, icon, topbar, eqSelect, lineChart, barChart, fdate, fnum, pd, resPill, demoTag } from '../ui.js';

let view = 'tablas', item = null;

function analyze(pts) {
  const last = pts[pts.length - 1], first = pts[0];
  const lim = last.limite_max, lmin = last.limite_min;
  const out = { last, first, n: pts.length };
  if (lim !== null && lim > 0) out.uso = last.valor / lim * 100;
  out.fuera = last.cumple === 0;
  if (pts.length >= 3) {
    const t = pts.map((p) => pd(p.fecha).getTime() / 864e5), v = pts.map((p) => p.valor), n = pts.length;
    const mt = t.reduce((a, b) => a + b) / n, mv = v.reduce((a, b) => a + b) / n;
    const sxx = t.reduce((a, b) => a + (b - mt) ** 2, 0), sxy = t.reduce((a, b, i) => a + (b - mt) * (v[i] - mv), 0);
    out.pend = sxx ? sxy / sxx : 0;
    if (lim !== null && out.pend > 0 && last.valor < lim) out.dias = (lim - last.valor) / out.pend;
    if (lmin !== null && out.pend < 0 && last.valor > lmin) out.dias = (last.valor - lmin) / -out.pend;
  }
  out.cambio = first.valor ? (last.valor - first.valor) / Math.abs(first.valor) * 100 : 0;
  return out;
}
const arrow = (a) => !a.pend ? '→' : Math.abs(a.cambio) < 3 ? '→' : a.pend > 0 ? '↗' : '↘';

export async function render(el, p, app) {
  await app.loadEquipos();
  const eid = +(p.eid || app.selEq); app.selEq = eid;
  const [eq, items] = await Promise.all([api('/equipos/' + eid), api('/items-medibles?equipo_id=' + eid)]);
  const data = {}; await Promise.all(items.map(async (i) => { data[i.item] = await api(`/tendencia?equipo_id=${eid}&item=${encodeURIComponent(i.item)}`); }));
  if (!item || !data[item]) item = items.find((i) => i.item.includes('Corte monopolar'))?.item || items[0]?.item;
  const rows = items.map((i) => ({ ...i, pts: data[i.item], a: data[i.item].length ? analyze(data[i.item]) : null })).filter((r) => r.a);
  const ultimos = {}; eq.checklists.forEach((c) => { if (!ultimos[c.plantilla_codigo]) ultimos[c.plantilla_codigo] = c; });

  const draw = async () => {
    let body = '';
    if (view === 'tablas') {
      body = `<div class="grid g4 mb">${Object.values(ultimos).map((c) => `<a class="glass pad" href="#/checklist/${c.id}" style="display:block;color:inherit"><div class="muted" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Último resultado</div><div class="rn" style="margin:6px 0 8px;font-size:13.5px">${esc(c.tipo_checklist)}</div>${resPill(c.resultado_general)}<div class="muted" style="font-size:11.5px;margin-top:8px">${fdate(c.fecha)} · ${c.n_cumple}/${c.n_items} cumplen</div></a>`).join('') || '<div class="muted">Sin checklists.</div>'}</div>
        <div class="glass pad"><div class="card-head"><div><h3>Tabla de mediciones</h3><p class="sub">Últimos 5 valores de cada variable medida, contra su criterio de aceptación</p></div></div>
        ${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Variable</th><th>Criterio</th><th>Últimos valores</th><th class="num">Último</th><th class="num">Uso del límite</th><th>Tend.</th><th>Estado</th></tr></thead><tbody>${rows.map((r) => `<tr class="click" data-item="${esc(r.item)}"><td class="rn" style="font-weight:500;max-width:340px">${esc(r.item)}</td><td class="soft">${esc(r.pts[r.pts.length - 1].valor_esperado || '—')}</td>
          <td class="mono" style="font-size:11px;color:var(--soft)">${r.pts.slice(-5).map((x) => fnum(x.valor, 2)).join(' · ')}</td><td class="num ${r.a.fuera ? 'bad-t' : ''}">${fnum(r.a.last.valor, 2)} ${esc(r.unidad || '')}</td>
          <td class="num ${r.a.uso > 85 ? 'warn-t' : ''}">${r.a.uso !== undefined ? fnum(r.a.uso, 0) + ' %' : '—'}</td><td style="font-size:16px">${arrow(r.a)}</td><td>${r.a.fuera ? '<span class="pill crit"><i></i>Fuera</span>' : r.a.uso > 85 ? '<span class="pill warn"><i></i>Cerca</span>' : '<span class="pill ok"><i></i>OK</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><b>Sin mediciones numéricas</b>Registre checklists de seguridad eléctrica o potencia.</div>'}</div>`;
    } else if (view === 'graficas') {
      const pts = data[item] || []; const last = pts[pts.length - 1];
      body = `<div class="glass pad mb"><div class="card-head"><div><h3>Tendencia de una medición</h3><p class="sub">Línea punteada roja = límite de aceptación · punto rojo = fuera de límite</p></div>
        <select class="input" id="it" style="width:auto;max-width:430px">${items.map((i) => `<option value="${esc(i.item)}" ${i.item === item ? 'selected' : ''}>${esc(i.item)} (${i.n})</option>`).join('')}</select></div>
        ${pts.length ? lineChart(pts.map((x) => ({ x: pd(x.fecha), y: x.valor, bad: x.cumple === 0 })), { unit: last.unidad || '', min: last.limite_min, max: last.limite_max, color: '#2DD4BF' }) : '<div class="empty"><b>Sin datos</b></div>'}</div>
        <div class="glass pad"><div class="card-head"><div><h3>Mantenimientos por mes</h3><p class="sub">Intervenciones de los últimos 12 meses</p></div></div><div id="bars"></div></div>`;
    } else {
      body = `<div class="interp" style="margin-bottom:16px">${icon('info')} <b>Interpretación asistida por reglas.</b> Compara cada medición con su límite, calcula la tendencia por regresión lineal sobre <i>sus propios datos</i> y propone la lectura. <b>No reemplaza el análisis del grupo</b>: las conclusiones técnicas deben redactarse y validarse por los integrantes.</div>
        ${rows.map((r) => {
          const a = r.a, ln = []; let sev = 'ok';
          if (a.fuera) { sev = 'crit'; ln.push(`<b>Fuera del criterio:</b> la última medición (${fnum(a.last.valor, 2)} ${esc(r.unidad || '')}, ${fdate(a.last.fecha)}) no cumple ${esc(a.last.valor_esperado || 'el límite')}. ${esc(a.last.si_falla || '')}`); }
          else if (a.uso > 85) { sev = 'warn'; ln.push(`<b>Cerca del límite:</b> se está usando el ${fnum(a.uso, 0)} % del límite máximo.`); }
          else ln.push(`Dentro del criterio${a.uso !== undefined ? ` (usa el ${fnum(a.uso, 0)} % del límite)` : ''}.`);
          if (a.n >= 3 && Math.abs(a.cambio) >= 5) ln.push(`Tendencia ${a.pend > 0 ? 'creciente' : 'decreciente'}: ${fnum(a.first.valor, 2)} → ${fnum(a.last.valor, 2)} (${a.cambio > 0 ? '+' : ''}${fnum(a.cambio, 0)} %) en ${a.n} mediciones.`);
          if (a.dias && a.dias < 3650) { if (sev === 'ok') sev = 'warn'; ln.push(`Al ritmo observado alcanzaría el límite en ≈ <b>${a.dias < 60 ? fnum(a.dias, 0) + ' días' : fnum(a.dias / 30, 0) + ' meses'}</b> (proyección lineal; confirmar con la siguiente medición).`); }
          return `<div class="glass pad mb" style="padding:16px 20px"><div style="display:flex;gap:12px;align-items:flex-start"><span class="pdot ${sev === 'ok' ? '' : sev}" style="${sev === 'ok' ? 'background:var(--cyan)' : ''}"></span><div><div class="rn" style="font-weight:600">${esc(r.item)}</div><div class="soft" style="font-size:12.5px;line-height:1.7;margin-top:4px">${ln.join('<br>')}</div></div></div></div>`;
        }).join('') || '<div class="glass pad empty"><b>Sin mediciones para interpretar</b></div>'}`;
    }
    el.querySelector('#body').innerHTML = body;
    el.querySelector('#it')?.addEventListener('change', (e) => { item = e.target.value; draw(); });
    el.querySelectorAll('[data-item]').forEach((r) => r.onclick = () => { item = r.dataset.item; view = 'graficas'; paint(); });
    if (view === 'graficas') { const d = await api('/dashboard?equipo_id=' + eid); el.querySelector('#bars').innerHTML = barChart(d.serie); }
  };
  const paint = () => {
    el.innerHTML = topbar('Módulo 5', 'Resultados', eqSelect(app.state.equipos, eid) + `<a class="btn" href="#/equipo/${eid}/checklists">${icon('clip')} Nuevo checklist</a>`) +
      `<div class="seg mb">${[['tablas', 'Tablas'], ['graficas', 'Gráficas'], ['interpretacion', 'Interpretación']].map(([v, t]) => `<button data-v="${v}" class="${v === view ? 'active' : ''}">${t}</button>`).join('')}</div><div id="body"></div>`;
    el.querySelector('#eqsel').onchange = (e) => { location.hash = '#/resultados/' + e.target.value; };
    el.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => { view = b.dataset.v; paint(); });
    draw();
  };
  paint();
}
