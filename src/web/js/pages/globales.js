import { api } from '../api.js';
import { esc, icon, topbar, eqSelect } from '../ui.js';
import { renderers, docsTable } from '../tabs.js';

const META = {
  mantenimiento: ['Módulo 3', 'Mantenimiento', 'mantenimiento'], checklists: ['Módulo 4', 'Checklists', 'checklists'],
  inventario: ['Módulo 2', 'Inventario', 'inventario'], documentos: ['Base de conocimiento', 'Manuales, normas y protocolos', 'documentos'],
};

export async function render(el, p, app) {
  const [eyebrow, title, tab] = META[p._path];
  if (tab === 'documentos') {
    const draw = async () => { const docs = await api('/documentos'); const holder = el.querySelector('#h'); docsTable(holder, docs, { reload: draw }, app.state.equipos, null); };
    el.innerHTML = topbar(eyebrow, title) + '<div id="h"></div>';
    return draw();
  }
  const draw = async () => {
    await app.loadEquipos();
    const eid = app.selEq; const eq = await api('/equipos/' + eid);
    el.innerHTML = topbar(eyebrow, title, eqSelect(app.state.equipos, eid) + `<a class="btn" href="#/equipo/${eid}">${icon('cpu')} Hoja de vida</a>`) + '<div id="t"></div>';
    el.querySelector('#eqsel').onchange = (e) => { app.selEq = +e.target.value; draw(); };
    await renderers[tab](el.querySelector('#t'), eq, { app, reload: draw });
    el.querySelectorAll('[data-go]').forEach((r) => r.onclick = () => location.hash = r.dataset.go);
    el.querySelectorAll('[data-a=mant]').forEach((b) => b.onclick = async () => { const { mantForm } = await import('../forms.js'); if (await mantForm(eq)) draw(); });
  };
  await draw();
}
