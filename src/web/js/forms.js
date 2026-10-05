// Formularios modales: equipo, mantenimiento, accesorio, fotos y documentos.
import { api } from './api.js';
import { esc, modal, val, chk, toast, nowLocal, todayISO, addDays, icon } from './ui.js';
import { compressImage } from './util.js';

const opt = (arr, sel) => arr.map(([v, t]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${t}</option>`).join('');
const fld = (label, inner, full = false) => `<div class="${full ? 'full' : ''}"><label class="f">${label}</label>${inner}</div>`;
const inp = (name, v = '', attrs = '') => `<input class="input" name="${name}" value="${esc(v ?? '')}" ${attrs}>`;

export function equipoForm(eq = null) {
  const e = eq || { nombre: 'Electrobisturí', anio: new Date().getFullYear(), frecuencia_pm_dias: 180, clase_aplicada: 'CF', criticidad: 'alta' };
  return modal({
    title: eq ? 'Editar equipo' : 'Registrar equipo', wide: true,
    sub: 'La hoja de vida y el código QR se generan a partir de estos datos.',
    body: `<div class="form-grid">
      ${fld('Nombre del equipo *', inp('nombre', e.nombre, 'required'))}${fld('Marca *', inp('marca', e.marca, 'required'))}
      ${fld('Modelo *', inp('modelo', e.modelo, 'required'))}${fld('Número de serie *', inp('serie', e.serie, 'required'))}
      ${fld('Fabricante *', inp('fabricante', e.fabricante, 'required'))}${fld('Año de fabricación *', inp('anio', e.anio, 'type="number" min="1980" max="2100" required'))}
      ${fld('Servicio', inp('servicio', e.servicio))}${fld('Ubicación', inp('ubicacion', e.ubicacion))}
      ${fld('Código QR / ID', inp('qr_code', e.qr_code, 'placeholder="Automático (EB-0XX)"'))}${fld('Registro sanitario INVIMA', inp('registro_invima', e.registro_invima))}
      ${fld('Frecuencia de preventivo (días)', inp('frecuencia_pm_dias', e.frecuencia_pm_dias, 'type="number" min="7"'))}
      ${fld('Clasificación parte aplicada', `<select class="input" name="clase_aplicada">${opt([['B', 'Tipo B'], ['BF', 'Tipo BF'], ['CF', 'Tipo CF']], e.clase_aplicada)}</select>`)}
      ${fld('Corriente nominal de la placa (A)', inp('corriente_nominal_a', e.corriente_nominal_a, 'type="number" step="0.01" placeholder="Ver placa de datos"'))}
      ${fld('Potencia máxima de salida (W)', inp('potencia_max_w', e.potencia_max_w, 'type="number" step="1"'))}
      ${fld('Criticidad', `<select class="input" name="criticidad">${opt([['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']], e.criticidad)}</select>`)}
      ${eq ? fld('Estado', `<label class="check"><input type="checkbox" name="fds" ${e.estado === 'fuera_de_servicio' ? 'checked' : ''}> Fuera de servicio (fijado manualmente)</label>`) : '<div></div>'}
      ${fld('Observaciones', `<textarea class="input" name="observaciones">${esc(e.observaciones || '')}</textarea>`, true)}
    </div>`,
    onOk: async (m) => {
      const b = {}; ['nombre', 'marca', 'modelo', 'serie', 'fabricante', 'anio', 'servicio', 'ubicacion', 'qr_code', 'registro_invima', 'frecuencia_pm_dias',
        'clase_aplicada', 'corriente_nominal_a', 'potencia_max_w', 'criticidad', 'observaciones'].forEach((k) => b[k] = val(m, k));
      if (eq) { b.estado = chk(m, 'fds') ? 'fuera_de_servicio' : 'activo'; await api('/equipos/' + eq.id, { method: 'PUT', body: b }); return { id: eq.id }; }
      const r = await api('/equipos', { method: 'POST', body: b }); toast('Equipo registrado: ' + r.qr_code); return r;
    },
  });
}

export function mantForm(eq, m = null, prefill = null) {
  const d = m || prefill || { tipo: 'preventivo', fecha: nowLocal(), resultado: 'conforme', horas_fuera_servicio: 0 };
  return modal({
    title: m ? 'Editar mantenimiento' : 'Registrar mantenimiento', wide: true, sub: `${esc(eq.qr_code)} · ${esc(eq.marca)} ${esc(eq.modelo)}`,
    body: `<div class="form-grid">
      ${fld('Tipo *', `<select class="input" name="tipo">${opt([['preventivo', 'Preventivo'], ['correctivo', 'Correctivo'], ['predictivo', 'Predictivo']], d.tipo)}</select>`)}
      ${fld('Fecha y hora *', inp('fecha', (d.fecha || '').slice(0, 16), 'type="datetime-local" required'))}
      ${fld('Descripción del trabajo *', `<textarea class="input" name="descripcion" required>${esc(d.descripcion || '')}</textarea>`, true)}
      <div class="full" id="corr" style="display:none"><div class="form-grid">
        ${fld('Causa de la falla', inp('causa', d.causa))}${fld('Repuestos / accesorios cambiados', inp('repuestos', d.repuestos))}
        <div class="full"><label class="check"><input type="checkbox" name="falla" ${d.falla ? 'checked' : ''}> Evento de falla (cuenta para MTBF y MTTR)</label></div>
      </div></div>
      ${fld('Acciones realizadas', inp('acciones', d.acciones), true)}
      ${fld('Horas fuera de servicio', inp('horas_fuera_servicio', d.horas_fuera_servicio, 'type="number" min="0" step="0.5"'))}
      ${fld('Resultado', `<select class="input" name="resultado">${opt([['conforme', 'Conforme (cerrado)'], ['no_conforme', 'No conforme'], ['pendiente', 'Pendiente (falla abierta)']], d.resultado)}</select>`)}
      <div class="full" id="prox">${fld('Próximo mantenimiento preventivo', inp('proxima_fecha', d.proxima_fecha || ''))}</div>
    </div>`,
    onMount: (b) => {
      const sync = () => {
        const t = val(b, 'tipo'); b.querySelector('#corr').style.display = t === 'correctivo' ? '' : 'none';
        b.querySelector('#prox').style.display = t === 'preventivo' ? '' : 'none';
        if (t === 'correctivo' && !m) b.querySelector('[name=falla]').checked = true;
      };
      const pr = b.querySelector('[name=proxima_fecha]'); pr.type = 'date';
      const suggest = () => { if (val(b, 'tipo') === 'preventivo' && !m) pr.value = addDays(val(b, 'fecha').slice(0, 10) || todayISO(), eq.frecuencia_pm_dias || 180); };
      b.querySelector('[name=tipo]').onchange = () => { sync(); suggest(); }; b.querySelector('[name=fecha]').onchange = suggest; sync(); suggest();
    },
    onOk: async (b) => {
      if (!val(b, 'descripcion').trim()) throw new Error('Describa el trabajo realizado');
      const body = { equipo_id: eq.id, tipo: val(b, 'tipo'), fecha: val(b, 'fecha'), descripcion: val(b, 'descripcion'), causa: val(b, 'causa'), acciones: val(b, 'acciones'),
        repuestos: val(b, 'repuestos'), falla: chk(b, 'falla'), horas_fuera_servicio: val(b, 'horas_fuera_servicio'), resultado: val(b, 'resultado'), proxima_fecha: val(b, 'tipo') === 'preventivo' ? val(b, 'proxima_fecha') : '' };
      if (m) await api('/mantenimientos/' + m.id, { method: 'PUT', body }); else await api('/mantenimientos', { method: 'POST', body });
      toast('Mantenimiento guardado'); return true;
    },
  });
}

export function accForm(eq, a = null) {
  const d = a || { consumible: 1, stock: 0, stock_minimo: 0 };
  return modal({
    title: a ? 'Editar accesorio' : 'Agregar accesorio o consumible', sub: `${esc(eq.qr_code)}`,
    body: `<div class="form-grid">${fld('Tipo / nombre *', inp('tipo', d.tipo, 'required'), true)}${fld('Descripción', inp('descripcion', d.descripcion), true)}
      ${fld('Referencia', inp('referencia', d.referencia))}${fld('Stock actual', inp('stock', d.stock, 'type="number" min="0"'))}
      ${fld('Stock mínimo (alerta)', inp('stock_minimo', d.stock_minimo, 'type="number" min="0"'))}
      <div><label class="f">Tipo de ítem</label><label class="check"><input type="checkbox" name="consumible" ${d.consumible ? 'checked' : ''}> Consumible (se gasta con el uso)</label></div></div>`,
    onOk: async (b) => {
      if (!val(b, 'tipo').trim()) throw new Error('Indique el nombre del accesorio');
      const body = { equipo_id: eq.id, tipo: val(b, 'tipo'), descripcion: val(b, 'descripcion'), referencia: val(b, 'referencia'), stock: val(b, 'stock'), stock_minimo: val(b, 'stock_minimo'), consumible: chk(b, 'consumible') };
      if (a) await api('/accesorios/' + a.id, { method: 'PUT', body }); else await api('/accesorios', { method: 'POST', body });
      return true;
    },
  });
}

export function fotoForm(eq, extra = {}) {
  let dataUrl = null;
  return modal({
    title: 'Agregar evidencia fotográfica', sub: `${esc(eq.qr_code)} · la imagen se comprime y se guarda en el servidor`,
    body: `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      <label class="btn primary">${icon('camera')} Tomar foto<input type="file" accept="image/*" capture="environment" id="f1" hidden></label>
      <label class="btn">${icon('upload')} Elegir archivo<input type="file" accept="image/*" id="f2" hidden></label></div>
      <div id="prev" class="drop" style="padding:20px">Aún no hay imagen seleccionada</div>
      <div style="margin-top:14px">${fld('Descripción', inp('descripcion', '', 'placeholder="Ej.: cable del electrodo activo con aislamiento dañado"'))}</div>`,
    okText: 'Subir evidencia',
    onMount: (b) => {
      const on = async (e) => { const f = e.target.files[0]; if (!f) return; try { dataUrl = await compressImage(f); b.querySelector('#prev').innerHTML = `<img src="${dataUrl}" style="max-width:100%;max-height:300px;border-radius:12px">`; } catch (er) { toast(er.message, true); } };
      b.querySelector('#f1').onchange = on; b.querySelector('#f2').onchange = on;
    },
    onOk: async (b) => {
      if (!dataUrl) throw new Error('Seleccione o tome una foto primero');
      await api('/evidencias', { method: 'POST', body: { equipo_id: eq.id, data_url: dataUrl, descripcion: val(b, 'descripcion'), ...extra } });
      toast('Evidencia guardada'); return true;
    },
  });
}

// ---------- documentos: extracción de texto en el navegador
function chunkText(text, pagina, maxLen = 900) {
  const out = []; const paras = text.split(/\n{2,}|(?<=[.!?])\s{2,}/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let buf = '';
  for (const p of paras) {
    if ((buf + ' ' + p).length > maxLen && buf) { out.push({ pagina, seccion: pagina ? `Página ${pagina}` : null, texto: buf }); buf = ''; }
    if (p.length > maxLen) { const sents = p.split(/(?<=[.!?])\s+/); for (const s of sents) { if ((buf + ' ' + s).length > maxLen && buf) { out.push({ pagina, seccion: pagina ? `Página ${pagina}` : null, texto: buf }); buf = ''; } buf += (buf ? ' ' : '') + s; } }
    else buf += (buf ? ' ' : '') + p;
  }
  if (buf.trim()) out.push({ pagina, seccion: pagina ? `Página ${pagina}` : null, texto: buf.trim() });
  return out;
}

export async function extractDoc(file, progress = () => {}) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    if (!window.pdfjsLib) throw new Error('El lector de PDF no se cargó. Recargue la página.');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    let chunks = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      progress(`Leyendo página ${i} de ${pdf.numPages}…`);
      const pg = await pdf.getPage(i); const tc = await pg.getTextContent();
      let line = '', y = null, text = '';
      for (const it of tc.items) { const yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 3) { text += line.trim() + '\n'; line = ''; } line += it.str + ' '; y = yy; }
      text += line;
      chunks = chunks.concat(chunkText(text.replace(/[ \t]+/g, ' ').replace(/\n(?!\n)/g, ' '), i));
    }
    return { chunks, paginas: pdf.numPages };
  }
  if (/\.(txt|md|markdown|csv)$/.test(name)) {
    const text = await file.text();
    if (/\.(md|markdown)$/.test(name)) {
      const chunks = []; let sec = null, buf = [];
      const flush = () => { const t = buf.join(' ').trim(); if (t) chunkText(t, null).forEach((c) => chunks.push({ ...c, seccion: sec })); buf = []; };
      text.split('\n').forEach((l) => { if (/^#{1,3} /.test(l)) { flush(); sec = l.replace(/^#+ /, ''); } else if (l.trim()) buf.push(l.trim()); });
      flush(); return { chunks, paginas: null };
    }
    return { chunks: chunkText(text, null), paginas: null };
  }
  throw new Error('Formato no soportado. Use PDF, TXT o MD.');
}

const b64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });

export function docForm(equipos, eqId = null) {
  let file = null;
  return modal({
    title: 'Cargar manual o documento', sub: 'El texto se extrae en su navegador, se divide en fragmentos y se indexa para el asistente de IA.',
    body: `<div class="form-grid">
      <div class="full"><label class="drop" id="dz" style="display:block">${icon('upload')}<div style="margin-top:8px"><b id="fn">Arrastre un archivo o haga clic para elegir</b></div><div class="muted" style="font-size:11.5px;margin-top:4px">PDF, TXT o MD · el PDF debe tener texto (no escaneado)</div><input type="file" id="fi" accept=".pdf,.txt,.md,.markdown" hidden></label></div>
      ${fld('Nombre del documento *', inp('nombre', '', 'required'), true)}
      ${fld('Tipo', `<select class="input" name="tipo">${opt([['manual', 'Manual'], ['protocolo', 'Protocolo'], ['norma', 'Norma'], ['otro', 'Otro']], 'manual')}</select>`)}
      ${fld('Aplica a', `<select class="input" name="equipo_id"><option value="">General (todos los equipos)</option>${equipos.map((e) => `<option value="${e.id}" ${e.id === eqId ? 'selected' : ''}>${esc(e.qr_code)} · ${esc(e.marca)} ${esc(e.modelo)}</option>`).join('')}</select>`)}
      <div class="full muted" id="st" style="font-size:12px"></div></div>`,
    okText: 'Cargar e indexar',
    onMount: (b) => {
      const pick = (f) => { if (!f) return; file = f; b.querySelector('#fn').textContent = f.name; const n = b.querySelector('[name=nombre]'); if (!n.value) n.value = f.name.replace(/\.[^.]+$/, ''); };
      const fi = b.querySelector('#fi'); fi.onchange = () => pick(fi.files[0]);
      const dz = b.querySelector('#dz');
      dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over');
      dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); pick(e.dataTransfer.files[0]); };
    },
    onOk: async (b) => {
      if (!file) throw new Error('Seleccione un archivo');
      if (!val(b, 'nombre').trim()) throw new Error('Escriba un nombre para el documento');
      const st = b.querySelector('#st');
      const { chunks, paginas } = await extractDoc(file, (t) => st.textContent = t);
      st.textContent = `Indexando ${chunks.length} fragmentos…`;
      const r = await api('/documentos', { method: 'POST', body: { nombre: val(b, 'nombre'), tipo: val(b, 'tipo'), equipo_id: val(b, 'equipo_id') || null, filename: file.name, paginas, chunks, archivo_b64: file.size < 25e6 ? await b64(file) : null } });
      toast(`Documento indexado: ${r.fragmentos} fragmentos`); return true;
    },
  });
}
