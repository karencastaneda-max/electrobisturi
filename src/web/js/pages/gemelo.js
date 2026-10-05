import { api } from '../api.js';
import { esc, icon, topbar, eqSelect, fdate, fnum, estadoPill } from '../ui.js';

const PARTS = {
  alimentacion: { n: 'Alimentación y tierra', f: 'Cable de red, fusible, fuente de poder y conductor de protección a tierra. Es la base de la seguridad eléctrica del equipo.', acc: /fusible|alimentaci/i, x: 30, y: 60, w: 170, h: 84 },
  pedal: { n: 'Pedal de activación', f: 'Activa la salida de potencia en el modo seleccionado (corte, coagulación o bipolar).', acc: /pedal/i, x: 30, y: 300, w: 170, h: 84 },
  panel: { n: 'Panel y pantalla', f: 'Selección de modo y potencia, indicadores visuales y tonos de activación.', acc: null, x: 290, y: 70, w: 260, h: 64 },
  generador: { n: 'Generador de alta frecuencia', f: 'Oscilador y etapa de potencia: convierte la energía de red en corriente de alta frecuencia (≈ 300 kHz – MHz) para cortar o coagular.', acc: null, x: 290, y: 152, w: 260, h: 96 },
  rem: { n: 'Monitor REM', f: 'Mide continuamente el contacto de la placa de retorno y bloquea la salida con alarma si es deficiente.', acc: null, x: 290, y: 266, w: 260, h: 64 },
  electrodo_activo: { n: 'Electrodo activo (lápiz)', f: 'Entrega la corriente al tejido en el sitio quirúrgico (modo monopolar).', acc: /electrodo|lápiz|lapiz/i, x: 660, y: 36, w: 180, h: 84 },
  placa_retorno: { n: 'Placa de retorno', f: 'Electrodo neutro de gran superficie: recoge la corriente del paciente con baja densidad para evitar quemaduras.', acc: /placa/i, x: 660, y: 270, w: 180, h: 84 },
  bipolar: { n: 'Salida bipolar / pinza', f: 'La corriente circula solo entre las puntas de la pinza; no requiere placa de retorno.', acc: /bipolar|pinza/i, x: 660, y: 376, w: 180, h: 70 },
};
let sel = 'generador';

export async function render(el, p, app) {
  await app.loadEquipos();
  const eid = +(p.eid || app.selEq); app.selEq = eid;
  const eq = await api('/equipos/' + eid);
  const comp = eq.componentes, k = eq.kpis;
  const st = (key) => !comp[key] ? 'none' : comp[key].estado;
  const all = Object.values(comp).flatMap((c) => c.items).filter((i) => i.cumple !== null);
  const salud = all.length ? Math.round(all.filter((i) => i.cumple === 1).length / all.length * 100) : null;

  const draw = () => {
    const P = PARTS[sel], c = comp[sel], s = st(sel);
    const accs = P.acc ? eq.accesorios.filter((a) => P.acc.test(a.tipo)) : [];
    const lines = [['M200,102 L290,102', 'alimentacion'], ['M200,340 L290,300', 'pedal'], ['M550,160 L660,80', 'electrodo_activo'], ['M750,120 L750,170', 'electrodo_activo'], ['M750,236 L750,270', 'placa_retorno'], ['M660,312 L550,300', 'placa_retorno'], ['M550,230 L660,410', 'bipolar']];
    el.querySelector('#tw').innerHTML = `<svg class="twin-svg" viewBox="0 0 870 470" role="img" aria-label="Esquema del electrobisturí">
      <rect x="270" y="30" width="300" height="320" rx="20" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.14)" stroke-dasharray="3 5"/>
      <text x="420" y="356" text-anchor="middle" style="fill:#5A6C81;font-size:10px;letter-spacing:1px">ELECTROBISTURÍ</text>
      ${lines.map(([d, k2]) => `<path class="flow" d="${d}" style="${st(k2) === 'fail' ? 'stroke:#F1495B;animation:none;opacity:.5' : st(k2) === 'none' ? 'stroke:#5A6C81;animation:none' : ''}"/>`).join('')}
      <ellipse cx="750" cy="203" rx="82" ry="34" fill="rgba(139,107,240,.08)" stroke="rgba(139,107,240,.5)" stroke-dasharray="4 4"/><text x="750" y="208" text-anchor="middle" style="fill:#B9A6FF;font-family:var(--head);font-size:12px;font-weight:600">Paciente / tejido</text>
      ${Object.entries(PARTS).map(([key, q]) => { const s2 = st(key); return `<g class="twin-part ${s2} ${key === sel ? 'sel' : ''}" data-k="${key}" tabindex="0" role="button" aria-label="${q.n}"><rect class="shape" x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" rx="14"/>
        <text x="${q.x + q.w / 2}" y="${q.y + q.h / 2 - 2}" text-anchor="middle">${q.n.length > 24 ? q.n.slice(0, 24) + '…' : q.n}</text><text class="st" x="${q.x + q.w / 2}" y="${q.y + q.h / 2 + 16}" text-anchor="middle">${s2 === 'ok' ? '● CONFORME' : s2 === 'fail' ? '▲ NO CONFORME' : '○ SIN DATOS'}</text></g>`; }).join('')}</svg>`;
    el.querySelectorAll('.twin-part').forEach((g) => { g.onclick = () => { sel = g.dataset.k; draw(); }; g.onkeydown = (e) => { if (e.key === 'Enter') g.onclick(); }; });
    el.querySelector('#dt').innerHTML = `<div class="card-head"><div><h3>${esc(P.n)}</h3><p class="sub" style="margin:4px 0 0">${esc(P.f)}</p></div><span class="pill ${s === 'ok' ? 'ok' : s === 'fail' ? 'crit' : 'off'}"><i></i>${s === 'ok' ? 'Conforme' : s === 'fail' ? 'No conforme' : 'Sin datos'}</span></div>
      ${c ? `<div class="eyebrow" style="margin:6px 0 8px">Última verificación de este componente</div>${c.items.map((i) => `<div class="alert" style="padding:9px 0"><span class="pdot ${i.cumple === 0 ? 'crit' : ''}" style="${i.cumple === 1 ? 'background:var(--cyan)' : i.cumple === null ? 'background:#5A6C81' : ''}"></span><div style="flex:1"><div class="t" style="font-weight:500;font-size:12px">${esc(i.item)}</div><div class="d">${i.valor && i.unidad ? `<b class="${i.cumple === 0 ? 'bad-t' : 'soft'}">${esc(i.valor)} ${esc(i.unidad)}</b> · ` : ''}${fdate(i.fecha)}${i.cumple === 0 && i.si_falla ? `<br><span class="bad-t">${esc(i.si_falla)}</span>` : ''}</div></div></div>`).join('')}`
        : '<div class="empty" style="padding:20px"><b>Sin verificaciones registradas</b>Realice un checklist que incluya este componente.</div>'}
      ${accs.length ? `<div class="eyebrow" style="margin:14px 0 8px">Accesorios asociados</div>${accs.map((a) => `<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:5px 0"><span>${esc(a.tipo)}</span><b class="mono ${a.consumible && a.stock_minimo && a.stock <= a.stock_minimo ? 'bad-t' : ''}">${a.stock} und.</b></div>`).join('')}` : ''}`;
  };
  const dias = k.dias_para_pm;
  el.innerHTML = topbar('Gemelo digital básico', 'Estado del equipo en tiempo real', eqSelect(app.state.equipos, eid) + `<a class="btn" href="#/equipo/${eid}">${icon('cpu')} Hoja de vida</a>`) + `
    <div class="grid g4 mb">
      <div class="glass kpi ok"><div class="glow"></div><div class="l">Estado</div><div style="margin-top:10px">${estadoPill(eq.estado)}</div><div class="d">${esc(eq.marca)} ${esc(eq.modelo)} · ${esc(eq.qr_code)}</div></div>
      <div class="glass kpi ${salud === null ? '' : salud >= 90 ? 'ok' : salud >= 70 ? 'warn' : 'crit'}"><div class="glow"></div><div class="l">Índice de salud</div><div class="v">${salud === null ? '—' : salud + '<small>%</small>'}</div><div class="d">Ítems conformes en los últimos checklists</div></div>
      <div class="glass kpi ${dias !== null && dias < 0 ? 'crit' : 'ok'}"><div class="glow"></div><div class="l">Próximo preventivo</div><div class="v">${dias === null ? '—' : Math.abs(dias) + '<small>días ' + (dias < 0 ? 'de atraso' : 'restantes') + '</small>'}</div><div class="d">${k.proxima_pm ? fdate(k.proxima_pm) : 'Sin programar'}</div></div>
      <div class="glass kpi vio"><div class="glow"></div><div class="l">Disponibilidad</div><div class="v">${fnum(k.disponibilidad, 2)}<small>%</small></div><div class="d">MTBF ${fnum(k.mtbf_h, 0)} h · MTTR ${fnum(k.mttr_h, 1)} h</div></div></div>
    <div class="twin-wrap mb"><div class="glass pad"><div class="card-head"><div><h3>Esquema funcional</h3><p class="sub">Cada bloque cambia de color según el último checklist registrado. Haga clic en un componente.</p></div></div><div id="tw"></div>
      <div class="legend" style="justify-content:center"><span><i style="background:var(--cyan)"></i>Conforme</span><span><i style="background:var(--red)"></i>No conforme</span><span><i style="background:#9fb0c6"></i>Sin datos</span><span style="color:#5A6C81">Las líneas animadas representan el flujo de corriente</span></div></div>
      <div class="glass pad" id="dt"></div></div>
    <div class="glass pad"><div class="card-head"><div><h3>Calculadora de prueba de potencia</h3><p class="sub">Herramienta educativa: relación entre potencia ajustada, resistencia de carga del analizador, tensión y corriente (V = √(P·R), I = √(P/R))</p></div></div>
      <div class="grid g4"><div><label class="f">Potencia P (W)</label><input class="input" id="cp" type="number" value="50" min="1"></div><div><label class="f">Carga R (Ω)</label><input class="input" id="cr" type="number" value="500" min="1"></div>
      <div class="hl-box"><div class="muted" style="font-size:10.5px;text-transform:uppercase;font-weight:700">Tensión eficaz</div><div class="mono" style="font-size:22px;color:var(--cyan)" id="cv">—</div></div><div class="hl-box"><div class="muted" style="font-size:10.5px;text-transform:uppercase;font-weight:700">Corriente eficaz</div><div class="mono" style="font-size:22px;color:var(--cyan)" id="ci">—</div></div></div></div>`;
  const calc = () => { const P = +el.querySelector('#cp').value, R = +el.querySelector('#cr').value; el.querySelector('#cv').textContent = P > 0 && R > 0 ? fnum(Math.sqrt(P * R), 1) + ' V' : '—'; el.querySelector('#ci').textContent = P > 0 && R > 0 ? fnum(Math.sqrt(P / R), 3) + ' A' : '—'; };
  el.querySelectorAll('#cp,#cr').forEach((i) => i.oninput = calc); calc();
  el.querySelector('#eqsel').onchange = (e) => { location.hash = '#/gemelo/' + e.target.value; };
  draw();
}
