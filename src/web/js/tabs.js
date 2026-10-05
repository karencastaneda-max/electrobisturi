// Contenido de las pestañas de la hoja de vida (también usado por las pantallas globales).
import { api, canWrite } from './api.js';
import { esc, icon, fdate, fdt, fnum, estadoPill, tipoMant, resPill, demoTag, confirmBox, toast, qrSvg, gauge } from './ui.js';
import { mantForm, accForm, fotoForm, docForm } from './forms.js';
import { qrUrl } from './util.js';

const W = () => canWrite();
const emptyBox = (ic, t, s = '') => `<div class="empty">${icon(ic)}<b>${t}</b>${s}</div>`;
const lightbox = (src) => { const d = document.createElement('div'); d.className = 'modal-bg'; d.innerHTML = `<img src="${src}" style="max-width:94vw;max-height:90vh;border-radius:14px">`; d.onclick = () => d.remove(); document.body.appendChild(d); };

export const TABS = [
  ['resumen', 'grid', 'Resumen'], ['mantenimiento', 'wrench', 'Mantenimiento'], ['checklists', 'clip', 'Checklists'], ['inventario', 'box', 'Inventario'],
  ['evidencias', 'camera', 'Evidencias'], ['documentos', 'file', 'Documentos'], ['qr', 'qr', 'Código QR'],
];

export const renderers = {
  resumen(el, eq) {
    const k = eq.kpis;
    el.innerHTML = `
      <div class="grid g4 mb">
        <div class="glass kpi ok"><div class="glow"></div><div class="l">Disponibilidad</div><div class="v">${fnum(k.disponibilidad, 2)}<small>%</small></div><div class="d">${k.ventana_dias} días analizados</div></div>
        <div class="glass kpi vio"><div class="glow"></div><div class="l">MTBF</div><div class="v">${fnum(k.mtbf_h, 0)}<small>h</small></div><div class="d">${k.fallas} falla(s)</div></div>
        <div class="glass kpi vio"><div class="glow"></div><div class="l">MTTR</div><div class="v">${fnum(k.mttr_h, 1)}<small>h</small></div><div class="d">${fnum(k.horas_fuera_servicio, 0)} h fuera de servicio</div></div>
        <div class="glass kpi ${k.dias_para_pm !== null && k.dias_para_pm < 0 ? 'crit' : k.dias_para_pm !== null && k.dias_para_pm <= 15 ? 'warn' : 'ok'}"><div class="glow"></div><div class="l">Próximo preventivo</div><div class="v" style="font-size:20px;margin-top:11px">${k.proxima_pm ? fdate(k.proxima_pm) : '—'}</div><div class="d">${k.dias_para_pm === null ? 'Sin programar' : k.dias_para_pm < 0 ? `Vencido hace ${-k.dias_para_pm} días` : `En ${k.dias_para_pm} días`}</div></div>
      </div>
      <div class="grid g2 mb">
        <div class="glass pad"><div class="card-head"><div><h3>Alertas del equipo</h3><p class="sub">Se actualizan solas con cada registro</p></div></div>
          ${eq.alertas.length ? eq.alertas.map((a) => `<div class="alert"><span class="pdot ${a.severidad}"></span><div><div class="t">${esc(a.descripcion)}</div><div class="d">${a.tipo.replace(/_/g, ' ')}</div></div></div>`).join('') : emptyBox('check', 'Sin alertas activas')}</div>
        <div class="glass pad"><div class="card-head"><div><h3>Acciones rápidas</h3><p class="sub">Lo más común en campo</p></div></div>
          <div style="display:grid;gap:10px">
            <button class="btn primary" data-a="mant" ${W() ? '' : 'disabled'}>${icon('wrench')} Registrar mantenimiento</button>
            <a class="btn" href="#/equipo/${eq.id}/checklists">${icon('clip')} Hacer un checklist</a>
            <button class="btn" data-a="foto" ${W() ? '' : 'disabled'}>${icon('camera')} Subir evidencia fotográfica</button>
            <a class="btn" href="#/gemelo/${eq.id}">${icon('layers')} Ver gemelo digital</a>
            <a class="btn" href="#/informe/${eq.id}">${icon('print')} Generar informe técnico</a></div></div>
      </div>
      <div class="grid gE">
        <div class="glass pad"><div class="card-head"><div><h3>Últimas intervenciones</h3></div><a class="btn sm" href="#/equipo/${eq.id}/mantenimiento">Ver todas</a></div>
          <div class="tl">${eq.mantenimientos.slice(0, 4).map((m) => { const [c, t] = tipoMant[m.tipo]; return `<div class="tl-i"><span class="tl-dot ${m.resultado === 'pendiente' ? 'warn' : c}"></span><div class="tl-b"><div class="tl-t">${t} ${demoTag(m)}</div><div class="tl-m">${fdate(m.fecha)} · ${esc(m.tecnico || '—')}</div><div class="tl-d">${esc(m.descripcion || '')}</div></div></div>`; }).join('') || emptyBox('wrench', 'Sin mantenimientos registrados')}</div></div>
        <div class="glass pad"><div class="card-head"><div><h3>Últimos checklists</h3></div><a class="btn sm" href="#/equipo/${eq.id}/checklists">Ver todos</a></div>
          ${eq.checklists.length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${eq.checklists.slice(0, 5).map((c) => `<tr class="click" data-go="#/checklist/${c.id}"><td><div class="rn">${esc(c.tipo_checklist)}</div><div class="idm">${fdate(c.fecha)}</div></td><td class="num">${c.n_cumple}/${c.n_items}</td><td>${resPill(c.resultado_general)}</td></tr>`).join('')}</tbody></table></div>` : emptyBox('clip', 'Sin checklists')}</div>
      </div>`;
  },

  mantenimiento(el, eq, ctx) {
    let filtro = 'todos';
    const draw = () => {
      const list = eq.mantenimientos.filter((m) => filtro === 'todos' || m.tipo === filtro);
      const k = eq.kpis;
      el.innerHTML = `
        <div class="grid g4 mb">
          ${['preventivo', 'correctivo', 'predictivo'].map((t) => `<div class="glass kpi"><div class="l">${tipoMant[t][1]}s</div><div class="v">${k.mantenimientos[t]}<small>12 meses</small></div></div>`).join('')}
          <div class="glass kpi ${k.dias_para_pm !== null && k.dias_para_pm < 0 ? 'crit' : 'ok'}"><div class="l">Cumplimiento preventivo</div><div class="v">${k.cumplimiento_pm === null ? '—' : fnum(k.cumplimiento_pm, 0) + '<small>%</small>'}</div><div class="d">${k.pm_cumplidos} de ${k.pm_programados} a tiempo</div></div>
        </div>
        <div class="glass pad"><div class="card-head"><div><h3>Historial de mantenimiento</h3><p class="sub">Preventivo · correctivo · predictivo</p></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><div class="seg">${[['todos', 'Todos'], ['preventivo', 'Preventivos'], ['correctivo', 'Correctivos'], ['predictivo', 'Predictivos']].map(([v, t]) => `<button data-f="${v}" class="${v === filtro ? 'active' : ''}">${t}</button>`).join('')}</div>
          ${W() ? `<button class="btn primary" data-a="mant">${icon('plus')} Registrar</button>` : ''}</div></div>
          <div class="tl">${list.map((m) => { const [c, t] = tipoMant[m.tipo]; return `<div class="tl-i"><span class="tl-dot ${m.resultado === 'pendiente' ? 'warn' : c}"></span><div class="tl-b">
            <div class="tl-t">${t} ${resPill(m.resultado)} ${m.falla ? '<span class="pill crit"><i></i>Evento de falla</span>' : ''} ${demoTag(m)}</div>
            <div class="tl-m">${fdt(m.fecha)} · ${esc(m.tecnico || '—')}${m.horas_fuera_servicio ? ` · ${fnum(m.horas_fuera_servicio, 1)} h fuera de servicio` : ''}${m.proxima_fecha ? ` · próximo: ${fdate(m.proxima_fecha)}` : ''}</div>
            <div class="tl-d"><b style="color:#fff">${esc(m.descripcion || '')}</b>${m.causa ? `<br>Causa: ${esc(m.causa)}` : ''}${m.acciones ? `<br>Acciones: ${esc(m.acciones)}` : ''}${m.repuestos ? `<br>Repuestos: ${esc(m.repuestos)}` : ''}</div>
            ${W() ? `<div style="margin-top:8px;display:flex;gap:8px"><button class="btn sm" data-edit="${m.id}">${icon('edit')} Editar</button>${m.resultado === 'pendiente' ? `<button class="btn sm" data-close="${m.id}">${icon('check')} Cerrar falla</button>` : ''}<button class="btn sm danger" data-del="${m.id}">${icon('trash')}</button></div>` : ''}</div></div>`; }).join('') || emptyBox('wrench', 'No hay registros', 'Registre el primer mantenimiento del equipo.')}</div></div>`;
      el.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filtro = b.dataset.f; draw(); });
      el.querySelector('[data-a=mant]')?.addEventListener('click', async () => { if (await mantForm(eq)) ctx.reload(); });
      el.querySelectorAll('[data-edit]').forEach((b) => b.onclick = async () => { if (await mantForm(eq, eq.mantenimientos.find((x) => x.id == b.dataset.edit))) ctx.reload(); });
      el.querySelectorAll('[data-close]').forEach((b) => b.onclick = async () => {
        const m = eq.mantenimientos.find((x) => x.id == b.dataset.close);
        await api('/mantenimientos/' + m.id, { method: 'PUT', body: { resultado: 'conforme' } }); toast('Falla cerrada'); ctx.reload();
      });
      el.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (await confirmBox('Eliminar mantenimiento', 'Se eliminará el registro y se recalcularán los indicadores.')) { await api('/mantenimientos/' + b.dataset.del, { method: 'DELETE' }); ctx.reload(); } });
    };
    draw();
  },

  async checklists(el, eq) {
    const pls = await api('/plantillas');
    el.innerHTML = `
      <div class="glass pad mb"><div class="card-head"><div><h3>Nuevo checklist</h3><p class="sub">Elija una plantilla; los criterios de aceptación se aplican automáticamente a lo que usted mida.</p></div></div>
        <div class="grid g4">${pls.map((p) => `<a class="glass pad" href="#/checklist/nuevo/${eq.id}/${p.codigo}" style="display:block;color:inherit;${W() ? '' : 'pointer-events:none;opacity:.5'}"><div style="color:var(--cyan);margin-bottom:8px">${icon('clip')}</div><b style="color:#fff;font-size:13.5px">${esc(p.nombre)}</b><div class="muted" style="font-size:11.5px;margin:5px 0 10px">${esc(p.descripcion)}</div><span class="tag">${p.items.length} ítems</span></a>`).join('')}</div></div>
      <div class="glass pad"><div class="card-head"><div><h3>Historial de checklists</h3><p class="sub">Haga clic para ver el detalle, las tablas y la interpretación</p></div></div>
        ${eq.checklists.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Checklist</th><th>Técnico</th><th class="num">Cumple</th><th>Resultado</th></tr></thead><tbody>${eq.checklists.map((c) => `<tr class="click" data-go="#/checklist/${c.id}"><td>${fdt(c.fecha)}</td><td><span class="rn">${esc(c.tipo_checklist)}</span> ${demoTag(c)}</td><td>${esc(c.tecnico || '—')}</td><td class="num">${c.n_cumple}/${c.n_items}${c.n_falla ? ` <span class="bad-t">(${c.n_falla} ✗)</span>` : ''}</td><td>${resPill(c.resultado_general)}</td></tr>`).join('')}</tbody></table></div>` : emptyBox('clip', 'Aún no hay checklists')}</div>`;
  },

  inventario(el, eq, ctx) {
    const acc = eq.accesorios;
    el.innerHTML = `<div class="glass pad"><div class="card-head"><div><h3>Inventario de accesorios y consumibles</h3><p class="sub">Alerta automática cuando el stock llega al mínimo</p></div>${W() ? `<button class="btn primary" data-a="add">${icon('plus')} Agregar</button>` : ''}</div>
      ${acc.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ítem</th><th>Tipo</th><th>Referencia</th><th style="min-width:170px">Stock</th><th></th></tr></thead><tbody>${acc.map((a) => {
        const bajo = a.consumible && a.stock_minimo && a.stock <= a.stock_minimo; const pct = a.stock_minimo ? Math.min(100, a.stock / (a.stock_minimo * 3) * 100) : 100;
        return `<tr><td><div class="rn">${esc(a.tipo)} ${demoTag(a)}</div><div class="idm">${esc(a.descripcion || '')}</div></td><td><span class="pill ${a.consumible ? 'info' : 'off'}">${a.consumible ? 'Consumible' : 'Accesorio'}</span></td><td class="idm">${esc(a.referencia || '—')}</td>
          <td>${a.consumible ? `<div style="display:flex;align-items:center;gap:10px"><span class="mono ${bajo ? 'bad-t' : ''}" style="min-width:30px">${a.stock}</span><div class="health-bar" style="flex:1"><i style="width:${pct}%;${bajo ? 'background:var(--red)' : ''}"></i></div><span class="muted mono" style="font-size:10.5px">mín ${a.stock_minimo}</span></div>${bajo ? '<div class="bad-t" style="font-size:11px;margin-top:4px">Stock bajo</div>' : ''}` : `<span class="mono">${a.stock} und.</span>`}</td>
          <td style="white-space:nowrap">${W() ? `${a.consumible ? `<button class="btn sm" data-st="${a.id}" data-d="-1" title="Consumir 1">−1</button> <button class="btn sm" data-st="${a.id}" data-d="1" title="Reponer 1">+1</button> ` : ''}<button class="btn sm" data-edit="${a.id}">${icon('edit')}</button> <button class="btn sm danger" data-del="${a.id}">${icon('trash')}</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : emptyBox('box', 'Inventario vacío', 'Agregue los accesorios y consumibles de este equipo.')}</div>`;
    el.querySelector('[data-a=add]')?.addEventListener('click', async () => { if (await accForm(eq)) ctx.reload(); });
    el.querySelectorAll('[data-edit]').forEach((b) => b.onclick = async () => { if (await accForm(eq, acc.find((x) => x.id == b.dataset.edit))) ctx.reload(); });
    el.querySelectorAll('[data-st]').forEach((b) => b.onclick = async () => { const a = acc.find((x) => x.id == b.dataset.st); await api('/accesorios/' + a.id, { method: 'PUT', body: { stock: Math.max(0, a.stock + +b.dataset.d) } }); ctx.reload(); });
    el.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (await confirmBox('Eliminar accesorio', 'Se quitará del inventario.')) { await api('/accesorios/' + b.dataset.del, { method: 'DELETE' }); ctx.reload(); } });
  },

  evidencias(el, eq, ctx) {
    el.innerHTML = `<div class="glass pad"><div class="card-head"><div><h3>Evidencias fotográficas</h3><p class="sub">Fotos de inspecciones, fallas, mediciones y reparaciones. Desde el celular abre la cámara directamente.</p></div>${W() ? `<button class="btn primary" data-a="foto">${icon('camera')} Agregar foto</button>` : ''}</div>
      ${eq.evidencias.length ? `<div class="photo-grid">${eq.evidencias.map((v) => `<div class="photo"><img src="${v.ruta_archivo}" alt="${esc(v.descripcion || 'Evidencia')}" data-src="${v.ruta_archivo}" loading="lazy"><div class="cap"><b style="color:#fff">${esc(v.descripcion || 'Sin descripción')}</b><br>${fdt(v.fecha)}</div>${W() ? `<button class="btn sm danger x" data-del="${v.id}">${icon('trash')}</button>` : ''}</div>`).join('')}</div>` : emptyBox('camera', 'Aún no hay evidencias', 'Suba las fotografías reales tomadas durante las pruebas.')}</div>`;
    el.querySelector('[data-a=foto]')?.addEventListener('click', async () => { if (await fotoForm(eq)) ctx.reload(); });
    el.querySelectorAll('img[data-src]').forEach((i) => i.onclick = () => lightbox(i.dataset.src));
    el.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (await confirmBox('Eliminar evidencia', 'La imagen se eliminará del servidor.')) { await api('/evidencias/' + b.dataset.del, { method: 'DELETE' }); ctx.reload(); } });
  },

  async documentos(el, eq, ctx) {
    const todos = await api('/documentos');
    const docs = todos.filter((d) => d.equipo_id === eq.id || d.equipo_id === null);
    docsTable(el, docs, ctx, [eq], eq.id);
  },

  qr(el, eq) {
    const url = qrUrl(eq.qr_code);
    el.innerHTML = `<div class="grid gE">
      <div class="glass pad"><div class="card-head"><div><h3>Etiqueta del equipo</h3><p class="sub">Imprímala y péguela en el equipo. Al escanearla se abre su hoja de vida.</p></div></div>
        <div class="print-labels">${labelHtml(eq, url)}</div>
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn primary" onclick="window.print()">${icon('print')} Imprimir etiqueta</button><button class="btn" data-a="copy">${icon('link')} Copiar enlace</button><a class="btn" href="#/qr">${icon('qr')} Todas las etiquetas</a></div></div>
      <div class="glass pad"><div class="card-head"><div><h3>¿A dónde apunta este QR?</h3></div></div>
        <div class="hl-box mono" style="word-break:break-all;font-size:12px;color:var(--cyan)">${esc(url)}</div>
        <p class="soft" style="font-size:12.5px;line-height:1.7;margin-top:14px">Para que el celular pueda abrir este enlace, debe estar en <b style="color:#fff">la misma red Wi-Fi</b> que el servidor, o la plataforma debe estar publicada en internet (ver el Manual técnico). La dirección base se puede cambiar en Administración.</p>
        <p class="soft" style="font-size:12.5px;line-height:1.7">Al escanear con la cámara del celular se abre la <b style="color:#fff">ficha de campo</b>: estado, próxima fecha de mantenimiento y acciones rápidas para registrar mantenimientos, checklists y fotos.</p>
        <a class="btn" href="${esc(url)}" target="_blank">${icon('qr')} Probar el enlace</a></div></div>`;
    el.querySelector('[data-a=copy]').onclick = () => { navigator.clipboard?.writeText(url); toast('Enlace copiado'); };
  },
};

export function labelHtml(eq, url) {
  return `<div class="qr-label">${qrSvg(url)}<div><div class="qt">${esc(eq.nombre)} ${esc(eq.marca)} ${esc(eq.modelo)}</div><div class="qc">${esc(eq.qr_code)}</div>
    <div class="qs">Serie: ${esc(eq.serie)}<br>${esc(eq.servicio || '')} · ${esc(eq.ubicacion || '')}</div><div class="qb">Escanee · Hoja de vida SIST-EB</div></div></div>`;
}

export function docsTable(el, docs, ctx, equipos, eqId) {
  el.innerHTML = `<div class="glass pad"><div class="card-head"><div><h3>Manuales, normas y protocolos</h3><p class="sub">Todo lo que se carga aquí es la <b>única</b> fuente que usa el asistente de IA para responder.</p></div>${W() ? `<button class="btn primary" data-a="up">${icon('upload')} Cargar documento</button>` : ''}</div>
    ${docs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Documento</th><th>Tipo</th><th>Aplica a</th><th class="num">Fragmentos</th><th>Cargado</th><th></th></tr></thead><tbody>${docs.map((d) => `<tr><td><div class="rn">${esc(d.nombre)}</div><div class="idm">${d.origen === 'base' ? 'Base de conocimiento de la plataforma' : esc(d.ruta_archivo)}${d.paginas ? ` · ${d.paginas} págs.` : ''}</div></td><td><span class="pill ${d.tipo === 'norma' ? 'info' : d.tipo === 'manual' ? 'ok' : 'off'}">${d.tipo}</span></td><td>${d.equipo_id ? esc(d.equipo_qr || 'Equipo') : 'General'}</td><td class="num">${d.n_chunks}</td><td>${fdate(d.fecha_carga)}</td>
      <td style="white-space:nowrap"><button class="btn sm" data-view="${d.id}">${icon('search')} Ver</button> ${d.ruta_archivo.startsWith('/uploads/') ? `<a class="btn sm" href="${d.ruta_archivo}" target="_blank">${icon('down')}</a>` : ''} ${W() && d.origen !== 'base' ? `<button class="btn sm danger" data-del="${d.id}">${icon('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : emptyBox('file', 'Sin documentos')}</div>`;
  el.querySelector('[data-a=up]')?.addEventListener('click', async () => { if (await docForm(equipos, eqId)) ctx.reload(); });
  el.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (await confirmBox('Eliminar documento', 'El asistente dejará de usar este documento.')) { await api('/documentos/' + b.dataset.del, { method: 'DELETE' }); ctx.reload(); } });
  el.querySelectorAll('[data-view]').forEach((b) => b.onclick = async () => {
    const fr = await api(`/documentos/${b.dataset.view}/fragmentos`);
    const { modal } = await import('./ui.js');
    modal({ title: 'Fragmentos indexados', sub: `${fr.length} fragmentos disponibles para el asistente`, wide: true, hideFoot: true,
      body: `<div style="max-height:60vh;overflow:auto">${fr.map((f) => `<div class="hl-box" style="margin-bottom:10px"><div class="eyebrow" style="margin-bottom:5px">${esc(f.seccion || (f.pagina ? 'Página ' + f.pagina : 'Fragmento'))}</div><div class="soft" style="font-size:12.5px;line-height:1.6">${esc(f.contenido)}</div></div>`).join('')}</div>` });
  });
}
