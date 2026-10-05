import { api } from '../api.js';
import { esc, icon, topbar, eqSelect, fdate } from '../ui.js';

const SUG = ['¿Qué significa que consuma más corriente de la especificada por el fabricante?', '¿Qué mantenimiento requiere un electrobisturí?', '¿Qué IEC aplica?', '¿Qué instrumento necesito?',
  '¿Cuál es el último mantenimiento del equipo?', '¿Cuándo toca el próximo preventivo?', '¿Cómo se prueba el monitor REM?', '¿Qué es el MTBF?', '¿Qué hacer si suena la alarma de la placa de retorno?'];
let hist = [];

export async function render(el, p, app) {
  await app.loadEquipos();
  const docs = await api('/documentos');
  const eid = app.selEq;
  const nChunks = docs.reduce((a, d) => a + d.n_chunks, 0);
  el.innerHTML = topbar('Módulo 7', 'Asistente técnico con IA', eqSelect(app.state.equipos, eid)) + `
    <div class="chat-wrap"><div class="glass chat-panel">
      <div class="chat-head"><div class="orb"></div><div><b>Asistente SIST-EB</b><span>Responde solo con la documentación cargada · cita la fuente · no inventa</span></div></div>
      <div class="chat-body" id="cb" aria-live="polite"></div>
      <form class="chat-in" id="cf"><input class="input" id="q" placeholder="Pregunte sobre normas, mantenimiento, pruebas o el estado del equipo…" autocomplete="off" aria-label="Pregunta"><button class="btn primary icon" aria-label="Enviar">${icon('send')}</button></form></div>
      <div class="side"><div class="glass pad mb"><h3>Preguntas sugeridas</h3><p class="sub">Haga clic para preguntar</p>${SUG.map((s) => `<div class="sugg" data-q="${esc(s)}">${esc(s)}</div>`).join('')}</div>
        <div class="glass pad"><h3>Fuentes indexadas</h3><p class="sub">${docs.length} documentos · ${nChunks} fragmentos</p>${docs.slice(0, 8).map((d) => `<div style="display:flex;gap:9px;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px"><span class="pill ${d.tipo === 'norma' ? 'info' : d.tipo === 'manual' ? 'ok' : 'off'}" style="padding:2px 8px">${d.tipo}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff" title="${esc(d.nombre)}">${esc(d.nombre)}</span></div>`).join('')}
          <a class="btn sm" href="#/documentos" style="margin-top:12px">${icon('upload')} Cargar manual</a></div></div></div>`;
  const cb = el.querySelector('#cb');
  const scroll = () => cb.scrollTop = cb.scrollHeight;
  const add = (cls, html) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html; cb.appendChild(d); scroll(); return d; };
  if (!hist.length) hist.push({ r: 'ai', h: `<p>Hola, soy el asistente técnico del electrobisturí. Respondo <b>únicamente</b> con la documentación incorporada (normas, protocolos y los manuales que cargue) y con los datos de la hoja de vida del equipo, y siempre indico la fuente.</p><p class="soft">Si no encuentro la respuesta en los documentos, se lo diré en lugar de inventarla.</p>` });
  hist.forEach((m) => add(m.r, m.h));

  const fmt = (r) => {
    if (!r.respondida) return `<p><b>No encontré información sobre eso en la documentación cargada.</b></p><p class="soft">${r.otro_equipo ? 'La documentación incorporada corresponde al electrobisturí; no la extrapolo a otros equipos. ' : ''}Puede reformular la pregunta o cargar el manual del fabricante en <a href="#/documentos">Manuales y normas</a> para que pueda responderla.</p>`;
    const datos = r.tipo === 'datos';
    return (datos ? '' : '<p class="soft" style="font-size:12px">Según la documentación cargada:</p>') +
      r.fragmentos.map((f, i) => datos ? `<p>${esc(f.texto)}</p>` : `<div class="frag"><h5>[${i + 1}] ${esc(f.seccion || '')}</h5>${esc(f.texto)}</div>`).join('') +
      `<div class="cite">${icon('file')}${[...new Set(r.fragmentos.map((f, i) => `${f.documento}${f.pagina ? ' · pág. ' + f.pagina : ''}`))].map((s) => `<span>${esc(s)}</span>`).join('')}</div>`;
  };
  const ask = async (q) => {
    q = q.trim(); if (q.length < 3) return;
    el.querySelector('#q').value = '';
    hist.push({ r: 'user', h: esc(q) }); add('user', esc(q));
    const t = add('ai', '<div class="typing"><i></i><i></i><i></i></div>');
    try {
      const r = await api('/ia/preguntar', { method: 'POST', body: { pregunta: q, equipo_id: app.selEq } });
      const h = fmt(r); t.innerHTML = h; if (!r.respondida) t.classList.add('noans'); hist.push({ r: 'ai', h });
    } catch (e) { t.innerHTML = `<p class="bad-t">${esc(e.message)}</p>`; }
    scroll();
  };
  el.querySelector('#cf').onsubmit = (e) => { e.preventDefault(); ask(el.querySelector('#q').value); };
  el.querySelectorAll('.sugg').forEach((s) => s.onclick = () => ask(s.dataset.q));
  el.querySelector('#eqsel').onchange = (e) => { app.selEq = +e.target.value; };
  const pre = decodeURIComponent((location.hash.split('?q=')[1] || '')); if (pre) { history.replaceState(null, '', '#/ia'); ask(pre); }
  el.querySelector('#q').focus();
}
