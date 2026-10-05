import { api } from '../api.js';
import { esc, icon, topbar, nowLocal, toast, confirmBox, fnum } from '../ui.js';

export async function render(el, p, app) {
  const [eq, pls] = await Promise.all([api('/equipos/' + p.eid), api('/plantillas')]);
  const pl = pls.find((x) => x.codigo === p.codigo);
  if (!pl) { el.innerHTML = '<div class="glass pad empty"><b>Plantilla no encontrada</b></div>'; return; }
  // Criterio efectivo de cada ítem (la corriente nominal viene de la hoja de vida)
  const items = pl.items.map((it) => ({ ...it, limite_min: it.min ?? null, limite_max: it.max_ref === 'corriente_nominal_a' ? (eq.corriente_nominal_a ?? null) : (it.max ?? null), valor: '', cumple: null }));
  const secs = [...new Set(items.map((i) => i.seccion))];
  const mants = eq.mantenimientos.slice(0, 8);

  const evalItem = (it) => {
    if (it.tipo === 'num' && it.valor !== '' && (it.limite_min !== null || it.limite_max !== null)) {
      const v = parseFloat(String(it.valor).replace(',', '.'));
      if (isNaN(v)) return null;
      return (it.limite_min === null || v >= it.limite_min) && (it.limite_max === null || v <= it.limite_max);
    }
    return it.cumple;
  };
  const limTxt = (it) => it.limite_min !== null && it.limite_max !== null ? `${it.limite_min} – ${it.limite_max} ${it.unidad}` : it.limite_max !== null ? `≤ ${it.limite_max} ${it.unidad}` : it.limite_min !== null ? `≥ ${it.limite_min} ${it.unidad}` : null;

  el.innerHTML = `${topbar(`Checklist · ${esc(eq.qr_code)}`, esc(pl.nombre), `<a class="btn" href="#/equipo/${eq.id}/checklists">Cancelar</a>`)}
    <div class="glass pad mb"><div class="form-grid">
      <div><label class="f">Equipo</label><div class="rn">${esc(eq.marca)} ${esc(eq.modelo)} <span class="idm">· ${esc(eq.serie)}</span></div></div>
      <div><label class="f">Fecha y hora</label><input class="input" type="datetime-local" id="fecha" value="${nowLocal()}"></div>
      <div class="full"><label class="f">Vincular a un mantenimiento (opcional)</label><select class="input" id="mant"><option value="">Sin vincular</option>${mants.map((m) => `<option value="${m.id}">${m.fecha.slice(0, 10)} · ${m.tipo} · ${esc((m.descripcion || '').slice(0, 60))}</option>`).join('')}</select></div></div>
      <div class="interp" style="margin:16px 0 0">${icon('info')} Ingrese <b>únicamente valores realmente medidos</b> con su instrumento. Los criterios de aceptación por defecto (p. ej. ±20 % de potencia) deben reemplazarse por los del manual del fabricante cuando lo tenga cargado.${eq.corriente_nominal_a ? '' : ' <b>Falta la corriente nominal del equipo</b>: edítela en la hoja de vida para evaluar el consumo.'}</div></div>
    <div class="glass pad" id="form"></div>
    <div class="glass pad" style="margin-top:16px"><label class="f">Observaciones</label><textarea class="input" id="obs" placeholder="Condiciones de la prueba, instrumento y número de serie, hallazgos…"></textarea>
      <label class="f" style="margin-top:14px">Análisis del técnico (obligatorio si hay ítems no conformes)</label><textarea class="input" id="ana" placeholder="Interprete los resultados: ¿qué significan, cuál es la causa probable, qué acción se toma?"></textarea>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px;gap:12px;flex-wrap:wrap"><div id="sum" class="soft" style="font-size:13px"></div><button class="btn primary" id="save">${icon('check')} Guardar checklist</button></div></div>`;

  const draw = () => {
    el.querySelector('#form').innerHTML = secs.map((s) => `<div class="chk-sec">${esc(s)}</div>` + items.map((it, i) => ({ it, i })).filter((x) => x.it.seccion === s).map(({ it, i }) => {
      const r = evalItem(it); const lim = limTxt(it);
      const meta = [it.esperado ? `Esperado: ${esc(it.esperado)}` : '', it.instrumento ? `Instrumento: ${esc(it.instrumento)}` : '', it.norma ? esc(it.norma) : ''].filter(Boolean).join(' · ');
      const needTri = it.tipo === 'bool' || (it.limite_min === null && it.limite_max === null);
      return `<div class="chk-row ${r === true ? 'pass' : r === false ? 'fail' : ''}"><div><div class="nm">${esc(it.item)}</div><div class="mt">${meta}</div>${r === false && it.si_falla ? `<div class="mt" style="color:var(--red);margin-top:5px">⚠ ${esc(it.si_falla)}</div>` : ''}</div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${it.tipo === 'num' ? `<div class="numin"><input class="input" inputmode="decimal" data-i="${i}" value="${esc(it.valor)}" placeholder="${lim ? esc(lim) : 'valor'}" aria-label="Valor medido"><span class="u">${esc(it.unidad)}</span><span class="res ${r === true ? 'ok-t' : r === false ? 'bad-t' : ''}">${r === true ? '✓' : r === false ? '✗' : ''}</span></div>` : ''}
        ${needTri ? `<div class="tri"><button data-t="${i}" data-v="1" class="${it.cumple === true ? 'on-ok' : ''}">Cumple</button><button data-t="${i}" data-v="0" class="${it.cumple === false ? 'on-bad' : ''}">No cumple</button></div>` : ''}</div></div>`;
    }).join('')).join('');
    el.querySelectorAll('input[data-i]').forEach((inp) => inp.oninput = () => { const it = items[inp.dataset.i]; it.valor = inp.value; const pos = inp.selectionStart; draw(); const n = el.querySelector(`input[data-i="${inp.dataset.i}"]`); n.focus(); n.setSelectionRange(pos, pos); });
    el.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { items[b.dataset.t].cumple = b.dataset.v === '1'; draw(); });
    const ev = items.map(evalItem); const ok = ev.filter((x) => x === true).length, bad = ev.filter((x) => x === false).length, pen = ev.filter((x) => x === null).length;
    el.querySelector('#sum').innerHTML = `<b class="ok-t">${ok} cumplen</b> · <b class="${bad ? 'bad-t' : ''}">${bad} no cumplen</b> · <span class="muted">${pen} sin responder</span>`;
  };
  draw();

  el.querySelector('#save').onclick = async () => {
    const ev = items.map(evalItem);
    if (ev.every((x) => x === null)) return toast('Responda al menos un ítem', true);
    const bad = ev.filter((x) => x === false).length;
    if (bad && !el.querySelector('#ana').value.trim()) { el.querySelector('#ana').focus(); return toast('Hay ítems no conformes: escriba su análisis técnico', true); }
    const pen = ev.filter((x) => x === null).length;
    if (pen && !(await confirmBox('Ítems sin responder', `Hay ${pen} ítem(s) sin responder. ¿Guardar de todos modos?`, 'Guardar'))) return;
    const btn = el.querySelector('#save'); btn.disabled = true;
    try {
      const r = await api('/checklists', { method: 'POST', body: { equipo_id: eq.id, plantilla_codigo: pl.codigo, fecha: el.querySelector('#fecha').value, mantenimiento_id: el.querySelector('#mant').value || null,
        observaciones: el.querySelector('#obs').value, analisis_tecnico: el.querySelector('#ana').value,
        items: items.map((it) => ({ seccion: it.seccion, item: it.item, tipo: it.tipo, valor_medido: it.tipo === 'num' ? it.valor.replace(',', '.') : (it.cumple === null ? null : it.cumple ? 'Cumple' : 'No cumple'),
          valor_esperado: it.esperado, unidad: it.unidad, limite_min: it.limite_min, limite_max: it.limite_max, componente: it.componente, norma: it.norma, instrumento: it.instrumento, si_falla: it.si_falla, cumple: evalItem(it) })) } });
      await app.loadEquipos(); toast(r.resultado_general === 'conforme' ? 'Checklist guardado: CONFORME' : 'Checklist guardado: NO CONFORME', r.resultado_general !== 'conforme');
      location.hash = '#/checklist/' + r.id;
    } catch (e) { toast(e.message, true); btn.disabled = false; }
  };
}
