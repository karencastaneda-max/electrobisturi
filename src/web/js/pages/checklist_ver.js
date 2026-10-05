import { api, canWrite } from '../api.js';
import { esc, icon, topbar, fdt, fnum, resPill, demoTag, toast } from '../ui.js';
import { mantForm, fotoForm } from '../forms.js';

export async function render(el, p, app) {
  const c = await api('/checklists/' + p.id);
  const eq = await api('/equipos/' + c.equipo_id);
  const fallas = c.items.filter((i) => i.cumple === 0);
  const sections = [...new Set(c.items.map((i) => i.seccion))];
  el.innerHTML = `${topbar(`Checklist · ${esc(eq.qr_code)}`, esc(c.tipo_checklist), `<a class="btn" href="#/equipo/${eq.id}/checklists">${icon('list')} Historial</a><a class="btn" href="#/resultados/${eq.id}">${icon('chart')} Resultados</a><button class="btn" onclick="window.print()">${icon('print')} Imprimir</button>`)}
    <div class="hl-box ${c.resultado_general === 'conforme' ? 'ok' : 'bad'} mb" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:220px"><div style="font-size:18px;font-family:var(--head);font-weight:700;color:#fff">${c.resultado_general === 'conforme' ? 'Resultado general: CONFORME' : 'Resultado general: NO CONFORME'} ${demoTag(c)}</div>
        <div class="soft" style="font-size:12.5px;margin-top:4px">${fdt(c.fecha)} · ${esc(c.tecnico || '—')} · ${esc(eq.marca)} ${esc(eq.modelo)} (${esc(eq.serie)})</div></div>
      <div class="mono" style="font-size:22px">${c.items.filter((i) => i.cumple === 1).length}<small class="muted"> / ${c.items.length} cumplen</small></div></div>
    ${fallas.length ? `<div class="glass pad mb"><div class="card-head"><div><h3>Interpretación guiada de los hallazgos</h3><p class="sub">Orientación basada en la base de conocimiento. Debe ser validada y complementada por el técnico.</p></div>
      ${canWrite() ? `<button class="btn primary" id="corr">${icon('wrench')} Registrar mantenimiento correctivo</button>` : ''}</div>
      ${fallas.map((i) => `<div class="interp"><b>${esc(i.item)}</b>${i.valor_medido && i.tipo === 'num' ? ` — medido <b>${esc(i.valor_medido)} ${esc(i.unidad || '')}</b>, esperado ${esc(i.valor_esperado || '')}` : ''}<br>${esc(i.si_falla || 'Verifique el ítem y repita la medición.')}${i.norma ? `<br><span class="muted">Referencia: ${esc(i.norma)}</span>` : ''}</div>`).join('')}
      <div style="margin-top:8px"><a class="btn sm" href="#/ia">${icon('bot')} Preguntar al asistente</a> <a class="btn sm" href="#/diagnostico">${icon('activity')} Diagnóstico de fallas</a></div></div>` : ''}
    <div class="glass pad mb"><div class="card-head"><div><h3>Resultados por ítem</h3></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ítem</th><th class="num">Medido</th><th>Criterio</th><th>Instrumento</th><th>Resultado</th></tr></thead><tbody>
      ${sections.map((s) => `<tr><td colspan="5" style="color:var(--cyan);font-family:var(--head);font-size:11px;letter-spacing:.8px;text-transform:uppercase;padding-top:18px">${esc(s)}</td></tr>` + c.items.filter((i) => i.seccion === s).map((i) => `<tr><td class="rn" style="font-weight:500">${esc(i.item)}</td><td class="num ${i.cumple === 0 ? 'bad-t' : ''}">${i.valor_medido !== null ? esc(i.valor_medido) + (i.tipo === 'num' ? ' ' + esc(i.unidad || '') : '') : '—'}</td><td class="soft">${esc(i.valor_esperado || (i.tipo === 'bool' ? 'Cumple' : '—'))}</td><td class="muted">${esc(i.instrumento || '—')}</td><td>${i.cumple === 1 ? '<span class="pill ok"><i></i>Cumple</span>' : i.cumple === 0 ? '<span class="pill crit"><i></i>No cumple</span>' : '<span class="pill off"><i></i>Registro</span>'}</td></tr>`).join('')).join('')}
    </tbody></table></div></div>
    <div class="grid gE mb"><div class="glass pad"><h3>Observaciones</h3><p class="soft" style="font-size:13px;line-height:1.6;white-space:pre-wrap">${esc(c.observaciones || 'Sin observaciones.')}</p></div>
      <div class="glass pad"><div class="card-head"><h3>Análisis del técnico</h3>${canWrite() ? `<button class="btn sm" id="sa">${icon('check')} Guardar</button>` : ''}</div>
      <textarea class="input" id="ana" ${canWrite() ? '' : 'disabled'} style="min-height:110px" placeholder="Interpretación y conclusiones del grupo…">${esc(c.analisis_tecnico || '')}</textarea></div></div>
    <div class="glass pad"><div class="card-head"><div><h3>Evidencias de este checklist</h3></div>${canWrite() ? `<button class="btn" id="foto">${icon('camera')} Agregar foto</button>` : ''}</div>
      ${c.evidencias.length ? `<div class="photo-grid">${c.evidencias.map((v) => `<div class="photo"><img src="${v.ruta_archivo}" alt=""><div class="cap">${esc(v.descripcion || '')}</div></div>`).join('')}</div>` : '<div class="muted" style="font-size:13px">Sin fotos asociadas.</div>'}</div>`;
  el.querySelector('#sa')?.addEventListener('click', async () => { await api('/checklists/' + c.id, { method: 'PUT', body: { analisis_tecnico: el.querySelector('#ana').value } }); toast('Análisis guardado'); });
  el.querySelector('#foto')?.addEventListener('click', async () => { if (await fotoForm(eq, { checklist_id: c.id })) render(el, p, app); });
  el.querySelector('#corr')?.addEventListener('click', async () => {
    const draft = { tipo: 'correctivo', fecha: new Date().toISOString().slice(0, 16), falla: 1, resultado: 'pendiente', horas_fuera_servicio: 0,
      descripcion: `Hallazgos del checklist «${c.tipo_checklist}»: ${fallas.map((i) => i.item).join('; ')}.` };
    if (await mantForm(eq, null, draft)) { await app.loadEquipos(); location.hash = `#/equipo/${eq.id}/mantenimiento`; }
  });
}
