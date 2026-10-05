import { esc, icon, topbar, md } from '../ui.js';

const DOCS = { usuario: ['Manual de usuario', '/docs/MANUAL_USUARIO.md'], tecnico: ['Manual técnico', '/docs/MANUAL_TECNICO.md'], ia: ['Declaración de uso de IA', '/docs/DECLARACION_USO_IA.md'],
  video: ['Guion del video demostrativo', '/docs/GUION_VIDEO.md'], datos: ['Diccionario de datos', '/db/diccionario_datos.md'] };

export async function render(el, p) {
  const k = DOCS[p.doc] ? p.doc : 'usuario';
  let txt = ''; try { const r = await fetch(DOCS[k][1]); txt = r.ok ? await r.text() : 'Documento no disponible.'; } catch { txt = 'No se pudo cargar el documento.'; }
  el.innerHTML = topbar('Documentación del proyecto', 'Ayuda y manuales') + `<div class="grid" style="grid-template-columns:230px 1fr;align-items:start" id="ay"><div class="glass pad" style="padding:12px">${Object.entries(DOCS).map(([id, [t]]) => `<a class="nav ${id === k ? 'active' : ''}" href="#/ayuda/${id}">${icon('file')}<span>${t}</span></a>`).join('')}</div><div class="glass pad"><div class="md">${md(txt)}</div></div></div>`;
}
