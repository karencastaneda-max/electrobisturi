import { api, canWrite, isAdmin } from '../api.js';
import { esc, icon, fdate, estadoPill, topbar, qrSvg, confirmBox, toast } from '../ui.js';
import { equipoForm } from '../forms.js';
import { TABS, renderers } from '../tabs.js';
import { qrUrl } from '../util.js';

export async function render(el, p, app) {
  const tab = p.tab || 'resumen';
  const draw = async () => {
    const eq = await api('/equipos/' + p.id);
    el.innerHTML = `
      ${topbar('Hoja de vida', `${esc(eq.nombre)} ${esc(eq.marca)} ${esc(eq.modelo)}`, `
        ${canWrite() ? `<button class="btn" id="edit">${icon('edit')} Editar</button>` : ''}
        <a class="btn" href="#/informe/${eq.id}">${icon('print')} Informe</a>
        ${isAdmin() ? `<button class="btn danger" id="del">${icon('trash')}</button>` : ''}`)}
      <div class="glass hero">
        <div class="hero-plate">${icon('zap')}</div>
        <div class="hero-info"><h2>${esc(eq.marca)} ${esc(eq.modelo)} ${estadoPill(eq.estado)} ${eq.es_demo ? '<span class="tag demo">DEMO</span>' : ''}</h2>
          <div class="idm" style="margin-top:4px">ID ${esc(eq.qr_code)} · Serie ${esc(eq.serie)}</div>
          <div class="specs">
            ${[['Marca', eq.marca], ['Modelo', eq.modelo], ['Serie', eq.serie], ['Fabricante', eq.fabricante], ['Año', eq.anio], ['Servicio', eq.servicio || '—'], ['Ubicación', eq.ubicacion || '—'], ['Parte aplicada', 'Tipo ' + (eq.clase_aplicada || '—')],
              ['Corriente nominal', eq.corriente_nominal_a ? eq.corriente_nominal_a + ' A' : '—'], ['Potencia máx.', eq.potencia_max_w ? eq.potencia_max_w + ' W' : '—'], ['Preventivo cada', eq.frecuencia_pm_dias + ' días'], ['Registro INVIMA', eq.registro_invima || '—']]
              .map(([l, v]) => `<div><div class="s-l">${l}</div><div class="s-v">${esc(v)}</div></div>`).join('')}</div>
          ${eq.observaciones ? `<div class="muted" style="margin-top:12px;font-size:12px">${esc(eq.observaciones)}</div>` : ''}</div>
        <div class="hero-qr" title="Ver etiqueta QR" data-qr>${qrSvg(qrUrl(eq.qr_code))}</div>
      </div>
      <div class="tabs" role="tablist">${TABS.map(([k, ic, t]) => `<a class="tab ${k === tab ? 'active' : ''}" role="tab" href="#/equipo/${eq.id}/${k}">${icon(ic)}${t}</a>`).join('')}<a class="tab" href="#/gemelo/${eq.id}">${icon('layers')}Gemelo digital</a><a class="tab" href="#/resultados/${eq.id}">${icon('chart')}Resultados</a></div>
      <div id="tab"></div>`;
    el.querySelector('[data-qr]').onclick = () => location.hash = `#/equipo/${eq.id}/qr`;
    el.querySelector('#edit')?.addEventListener('click', async () => { if (await equipoForm(eq)) { await app.loadEquipos(); draw(); } });
    el.querySelector('#del')?.addEventListener('click', async () => { if (await confirmBox('Eliminar equipo', `Se eliminará ${esc(eq.qr_code)} con todo su historial. Esta acción no se puede deshacer.`)) { await api('/equipos/' + eq.id, { method: 'DELETE' }); await app.loadEquipos(); toast('Equipo eliminado'); location.hash = '#/equipos'; } });
    app.selEq = eq.id;
    const reload = async () => { await app.loadEquipos(); draw(); };
    await (renderers[tab] || renderers.resumen)(el.querySelector('#tab'), eq, { app, reload });
    el.querySelectorAll('[data-go]').forEach((r) => r.onclick = () => location.hash = r.dataset.go);
    el.querySelectorAll('[data-a=mant]').forEach((b) => b.onclick = async () => { const { mantForm } = await import('../forms.js'); if (await mantForm(eq)) reload(); });
    el.querySelectorAll('[data-a=foto]').forEach((b) => b.onclick = async () => { const { fotoForm } = await import('../forms.js'); if (await fotoForm(eq)) reload(); });
  };
  await draw();
}
