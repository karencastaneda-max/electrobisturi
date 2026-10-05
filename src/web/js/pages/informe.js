import { api } from '../api.js';
import { esc, icon, topbar, fnum, fdate, fdt, qrSvg, lineChart, barChart, pd } from '../ui.js';
import { qrUrl } from '../util.js';

export async function render(el, p, app) {
  const eq = await api('/equipos/' + p.eid);
  const d = await api('/dashboard?equipo_id=' + p.eid);
  const k = eq.kpis;
  const hayDemo = eq.es_demo || eq.mantenimientos.some((m) => m.es_demo) || eq.checklists.some((c) => c.es_demo);
  const items = await api('/items-medibles?equipo_id=' + p.eid);
  const clave = items.filter((i) => /Corte monopolar — ajuste 50|Resistencia de tierra|fuga a tierra \(condición normal\)|Corriente de consumo/.test(i.item)).slice(0, 4);
  const charts = await Promise.all(clave.map(async (i) => ({ i, pts: await api(`/tendencia?equipo_id=${p.eid}&item=${encodeURIComponent(i.item)}`) })));
  const ultimos = {}; eq.checklists.forEach((c) => { if (!ultimos[c.plantilla_codigo]) ultimos[c.plantilla_codigo] = c; });
  const detalles = await Promise.all(Object.values(ultimos).map((c) => api('/checklists/' + c.id)));
  const hoy = new Date();
  el.innerHTML = topbar('Informe técnico', `Informe · ${esc(eq.qr_code)}`, `<a class="btn" href="#/equipo/${eq.id}">Volver</a><button class="btn primary" onclick="window.print()">${icon('print')} Imprimir / Guardar PDF</button>`) + `
  <div class="no-print interp" style="max-width:900px;margin:0 auto 16px">${icon('info')} Escriba el <b>análisis y las conclusiones del grupo</b> en el recuadro de la sección 8 antes de imprimir. Use «Guardar como PDF» en el diálogo de impresión.</div>
  <article class="report">
    <div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start"><div><div style="font-size:10px;letter-spacing:1.5px;color:#0E7C74;font-weight:700">SIST-EB · INFORME TÉCNICO DE EQUIPO BIOMÉDICO</div><h1>${esc(eq.nombre)} ${esc(eq.marca)} ${esc(eq.modelo)}</h1><div style="color:#475569">Código ${esc(eq.qr_code)} · Serie ${esc(eq.serie)} · Generado el ${fdate(hoy.toISOString())}</div></div><div style="width:92px;flex-shrink:0">${qrSvg(qrUrl(eq.qr_code))}</div></div>
    ${hayDemo ? '<div class="demo-warn"><b>Atención:</b> este informe incluye registros marcados como DEMO (datos de ejemplo). No deben presentarse como resultados de pruebas reales.</div>' : ''}
    <h2>1. Identificación del equipo</h2>
    <div class="kv">${[['Marca', eq.marca], ['Modelo', eq.modelo], ['Serie', eq.serie], ['Fabricante', eq.fabricante], ['Año', eq.anio], ['Servicio', eq.servicio || '—'], ['Ubicación', eq.ubicacion || '—'], ['Estado actual', (eq.estado || '').replace(/_/g, ' ')], ['Parte aplicada', 'Tipo ' + (eq.clase_aplicada || '—')], ['Corriente nominal', eq.corriente_nominal_a ? eq.corriente_nominal_a + ' A' : '—'], ['Registro INVIMA', eq.registro_invima || '—'], ['Preventivo cada', eq.frecuencia_pm_dias + ' días']].map(([l, v]) => `<div><b>${l}</b>${esc(v)}</div>`).join('')}</div>
    <h2>2. Indicadores de gestión (últimos ${k.ventana_dias} días)</h2>
    <div class="kpi-r"><div><b>${fnum(k.disponibilidad, 2)} %</b><span>Disponibilidad</span></div><div><b>${fnum(k.mtbf_h, 0)} h</b><span>MTBF</span></div><div><b>${fnum(k.mttr_h, 1)} h</b><span>MTTR</span></div><div><b>${k.fallas}</b><span>Fallas</span></div><div><b>${k.cumplimiento_pm === null ? '—' : fnum(k.cumplimiento_pm, 0) + ' %'}</b><span>Cumpl. preventivo</span></div></div>
    <p style="color:#475569;font-size:10.5px">Disponibilidad = (horas del periodo − horas fuera de servicio) / horas del periodo. MTBF = horas operativas / n.º de fallas. MTTR = horas fuera de servicio por falla / n.º de fallas. Próximo preventivo: ${k.proxima_pm ? fdate(k.proxima_pm) : 'sin programar'}.</p>
    <div style="max-width:560px">${barChart(d.serie, { h: 170 })}</div>
    <h2>3. Historial de mantenimiento</h2>
    ${eq.mantenimientos.length ? `<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Causa / acciones</th><th>H fuera</th><th>Resultado</th></tr></thead><tbody>${eq.mantenimientos.map((m) => `<tr><td>${fdate(m.fecha)}</td><td>${m.tipo}${m.falla ? ' (falla)' : ''}${m.es_demo ? ' <i>[DEMO]</i>' : ''}</td><td>${esc(m.descripcion || '')}</td><td>${esc([m.causa, m.acciones].filter(Boolean).join(' — '))}</td><td>${fnum(m.horas_fuera_servicio, 1)}</td><td>${m.resultado || ''}</td></tr>`).join('')}</tbody></table>` : '<p>Sin registros.</p>'}
    <h2>4. Resultados de pruebas funcionales y de seguridad (último checklist de cada tipo)</h2>
    ${detalles.map((c) => `<h3 style="font-size:12.5px;margin:14px 0 4px">${esc(c.tipo_checklist)} — ${fdt(c.fecha)} — <span class="${c.resultado_general === 'conforme' ? 'ok' : 'bad'}">${c.resultado_general === 'conforme' ? 'CONFORME' : 'NO CONFORME'}</span>${c.es_demo ? ' <i>[DEMO]</i>' : ''}</h3>
      <table><thead><tr><th>Ítem</th><th>Medido</th><th>Criterio</th><th>Resultado</th></tr></thead><tbody>${c.items.map((i) => `<tr><td>${esc(i.item)}</td><td>${i.valor_medido !== null ? esc(i.valor_medido) + (i.tipo === 'num' ? ' ' + esc(i.unidad || '') : '') : '—'}</td><td>${esc(i.valor_esperado || (i.tipo === 'bool' ? 'Cumple' : '—'))}</td><td class="${i.cumple === 1 ? 'ok' : i.cumple === 0 ? 'bad' : ''}">${i.cumple === 1 ? 'Cumple' : i.cumple === 0 ? 'No cumple' : 'Registro'}</td></tr>`).join('')}</tbody></table>
      ${c.analisis_tecnico ? `<p><b>Análisis del técnico:</b> ${esc(c.analisis_tecnico)}</p>` : ''}`).join('') || '<p>Sin checklists registrados.</p>'}
    <h2>5. Tendencias de variables críticas</h2>
    ${charts.length ? charts.map(({ i, pts }) => `<div style="break-inside:avoid;margin-bottom:12px"><b style="font-size:11.5px">${esc(i.item)}</b>${lineChart(pts.map((x) => ({ x: pd(x.fecha), y: x.valor, bad: x.cumple === 0 })), { h: 180, unit: i.unidad || '', min: pts[pts.length - 1].limite_min, max: pts[pts.length - 1].limite_max, color: '#0E7C74' })}</div>`).join('') : '<p>Sin mediciones suficientes.</p>'}
    <h2>6. Inventario de accesorios y consumibles</h2>
    ${eq.accesorios.length ? `<table><thead><tr><th>Ítem</th><th>Tipo</th><th>Stock</th><th>Mínimo</th></tr></thead><tbody>${eq.accesorios.map((a) => `<tr><td>${esc(a.tipo)}</td><td>${a.consumible ? 'Consumible' : 'Accesorio'}</td><td>${a.stock}</td><td>${a.consumible ? a.stock_minimo : '—'}</td></tr>`).join('')}</tbody></table>` : '<p>Sin accesorios.</p>'}
    <h2>7. Evidencias fotográficas</h2>
    ${eq.evidencias.length ? `<div class="rimgs">${eq.evidencias.slice(0, 12).map((v) => `<figure style="margin:0"><img src="${v.ruta_archivo}" alt=""><figcaption style="font-size:9.5px;color:#475569">${esc(v.descripcion || '')} · ${fdate(v.fecha)}</figcaption></figure>`).join('')}</div>` : '<p>Sin evidencias fotográficas registradas.</p>'}
    <h2>8. Alertas, análisis y conclusiones del grupo</h2>
    ${eq.alertas.length ? `<ul>${eq.alertas.map((a) => `<li>${esc(a.descripcion)}</li>`).join('')}</ul>` : '<p>Sin alertas activas.</p>'}
    <textarea class="input" id="concl" style="background:#f4f7fb;border:1px solid #d5dce6;color:#111;min-height:130px" placeholder="Escriba aquí el análisis técnico y las conclusiones del grupo (se imprimirán en el informe)…"></textarea>
    <div class="sign"><div>Técnico responsable</div><div>Ingeniero clínico</div><div>Docente / Revisor</div></div>
  </article>`;
  const ta = el.querySelector('#concl');
  const key = 'sisteb_concl_' + eq.id; try { ta.value = localStorage.getItem(key) || ''; } catch {}
  ta.oninput = () => { try { localStorage.setItem(key, ta.value); } catch {} };
  window.onbeforeprint = () => { if (ta.value.trim()) { const pr = document.createElement('div'); pr.id = 'pr-c'; pr.style.cssText = 'white-space:pre-wrap;border:1px solid #d5dce6;border-radius:8px;padding:10px;background:#fff'; pr.textContent = ta.value; ta.style.display = 'none'; ta.after(pr); } };
  window.onafterprint = () => { document.getElementById('pr-c')?.remove(); ta.style.display = ''; };
}
