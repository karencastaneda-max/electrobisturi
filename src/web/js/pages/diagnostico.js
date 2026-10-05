import { api, canWrite } from '../api.js';
import { esc, icon, topbar, eqSelect, toast } from '../ui.js';
import { mantForm } from '../forms.js';

let sel = null, q = '';
const SEV = { critica: ['crit', 'Crítica'], alta: ['crit', 'Alta'], media: ['warn', 'Media'] };

export async function render(el, p, app) {
  await app.loadEquipos();
  const fallas = await api('/fallas');
  if (!sel) sel = fallas[0].id;
  const draw = () => {
    const list = fallas.filter((f) => !q || (f.sintoma + f.descripcion).toLowerCase().includes(q.toLowerCase()));
    const f = fallas.find((x) => x.id === sel) || fallas[0];
    let causaSel = null;
    el.innerHTML = topbar('Soporte técnico', 'Diagnóstico de fallas', eqSelect(app.state.equipos, app.selEq)) + `
      <div class="grid" style="grid-template-columns:340px 1fr;align-items:start" id="dg">
        <div class="glass pad"><input class="input" id="q" placeholder="Buscar síntoma…" value="${esc(q)}" style="margin-bottom:12px">
          ${list.map((x) => `<div class="sugg" data-id="${x.id}" style="${x.id === f.id ? 'border-color:rgba(45,212,191,.5);color:var(--cyan);background:rgba(45,212,191,.07)' : ''}"><div style="display:flex;justify-content:space-between;gap:8px"><b style="color:#fff;font-weight:600">${esc(x.sintoma)}</b></div><span class="pill ${SEV[x.severidad][0]}" style="margin-top:6px;padding:2px 9px">${SEV[x.severidad][1]}</span></div>`).join('') || '<div class="muted">Sin resultados</div>'}</div>
        <div class="glass pad"><div class="card-head"><div><h3 style="font-size:18px">${esc(f.sintoma)}</h3><p class="sub" style="margin-top:4px">${esc(f.descripcion)}</p></div><span class="pill ${SEV[f.severidad][0]}"><i></i>Severidad ${SEV[f.severidad][1].toLowerCase()}</span></div>
          <div class="eyebrow" style="margin:8px 0 12px">Causas probables · de la más sencilla de descartar a la más compleja</div>
          ${f.causas.map((c, i) => `<div class="hl-box" style="margin-bottom:10px"><div style="display:flex;gap:12px"><div class="avatar" style="width:28px;height:28px;border-radius:50%;font-size:12px">${i + 1}</div><div style="flex:1"><b style="color:#fff">${esc(c.causa)}</b><div class="soft" style="font-size:12.5px;margin-top:5px;line-height:1.6">${icon('check')} <b>Cómo verificar:</b> ${esc(c.verificar)}</div><div class="muted" style="font-size:11.5px;margin-top:5px">Instrumento: ${esc(c.instrumento)}</div></div>
            <label class="check" style="align-self:flex-start"><input type="radio" name="causa" value="${i}"> Confirmada</label></div></div>`).join('')}
          <div class="interp"><b>Acción recomendada:</b> ${esc(f.accion)}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" id="reg" ${canWrite() ? '' : 'disabled'}>${icon('wrench')} Registrar como mantenimiento correctivo</button><a class="btn" href="#/ia?q=${encodeURIComponent('¿' + f.sintoma + '?')}">${icon('bot')} Preguntar al asistente</a><a class="btn" href="#/gemelo">${icon('layers')} Ver componente en el gemelo</a></div>
          <p class="muted" style="font-size:11.5px;margin-top:14px">Guía de orientación basada en la base de conocimiento. Antes de abrir el equipo siga el manual de servicio y los procedimientos de seguridad.</p></div></div>`;
    el.querySelector('#eqsel').onchange = (e) => { app.selEq = +e.target.value; };
    el.querySelector('#q').oninput = (e) => { q = e.target.value; const pos = e.target.selectionStart; draw(); const i = el.querySelector('#q'); i.focus(); i.setSelectionRange(pos, pos); };
    el.querySelectorAll('[data-id]').forEach((s) => s.onclick = () => { sel = s.dataset.id; draw(); });
    el.querySelector('#reg').onclick = async () => {
      const eq = await api('/equipos/' + app.selEq); const ci = el.querySelector('[name=causa]:checked');
      const draft = { tipo: 'correctivo', fecha: new Date().toISOString().slice(0, 16), falla: 1, resultado: 'pendiente', descripcion: f.sintoma + '.', causa: ci ? f.causas[ci.value].causa : '', horas_fuera_servicio: 0 };
      if (await mantForm(eq, null, draft)) { await app.loadEquipos(); toast('Correctivo registrado'); location.hash = `#/equipo/${eq.id}/mantenimiento`; }
    };
  };
  draw();
}
