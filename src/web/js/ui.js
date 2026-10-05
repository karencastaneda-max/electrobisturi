// Utilidades de interfaz: iconos, formato, modales, notificaciones y gráficos SVG.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3l9.4-9.4a4 4 0 0 0-2-2z"/><path d="M14.7 6.3 17 4l3 3-2.3 2.3"/>',
  clip: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v2H9zM9 13l2 2 4-4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 14h.01M15 14h.01M2 14h2M20 14h2"/><circle cx="12" cy="3.5" r="1"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5M3 17.5l9 5 9-5"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  print: '<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  down: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  send: '<path d="m22 2-11 11M22 2l-7 20-4-9-9-4z"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
};
export const icon = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`;

// ---------- formato
export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const pd = (s) => { if (!s) return null; const d = new Date(String(s).length <= 10 ? s + 'T00:00:00' : s); return isNaN(d) ? null : d; };
export const fdate = (s) => { const d = pd(s); return d ? `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}` : '—'; };
export const fdt = (s) => { const d = pd(s); return d ? `${fdate(s)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '—'; };
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const nowLocal = () => { const d = new Date(); return `${todayISO()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const addDays = (iso, n) => { const d = pd(iso) || new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const fnum = (v, dec = 1) => (v === null || v === undefined || isNaN(v)) ? '—' : Number(v).toLocaleString('es-CO', { maximumFractionDigits: dec });

export const ESTADOS = {
  activo: ['ok', 'Operativo'], vencido: ['warn', 'Mantenimiento vencido'], falla: ['crit', 'En falla'], fuera_de_servicio: ['off', 'Fuera de servicio'],
};
export const estadoPill = (e) => { const [c, t] = ESTADOS[e] || ['off', e]; return `<span class="pill ${c}"><i></i>${t}</span>`; };
export const tipoMant = { preventivo: ['ok', 'Preventivo'], correctivo: ['crit', 'Correctivo'], predictivo: ['info', 'Predictivo'] };
export const resPill = (r) => r === 'conforme' ? '<span class="pill ok"><i></i>Conforme</span>' : r === 'no_conforme' ? '<span class="pill crit"><i></i>No conforme</span>' : '<span class="pill warn"><i></i>Pendiente</span>';
export const demoTag = (r) => r?.es_demo ? '<span class="tag demo" title="Dato de demostración, no es un resultado real">DEMO</span>' : '';

// ---------- notificaciones y modales
export function toast(msg, err = false) {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  box.appendChild(t); setTimeout(() => t.remove(), err ? 6000 : 3600);
}

export function modal({ title, sub = '', body, okText = 'Guardar', wide = false, onOk, hideFoot = false, onMount }) {
  return new Promise((resolve) => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><div class="sub">${sub}</div><div class="m-body">${body}</div>
      ${hideFoot ? '' : `<div class="modal-foot"><button class="btn" data-x>Cancelar</button><button class="btn primary" data-ok>${esc(okText)}</button></div>`}</div>`;
    document.body.appendChild(bg);
    const close = (v) => { bg.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey);
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(null); });
    bg.querySelector('[data-x]')?.addEventListener('click', () => close(null));
    const ok = bg.querySelector('[data-ok]');
    ok?.addEventListener('click', async () => {
      ok.disabled = true;
      try { const r = await onOk?.(bg); if (r !== false) close(r ?? true); else ok.disabled = false; }
      catch (e) { toast(e.message, true); ok.disabled = false; }
    });
    bg.close = close;
    onMount?.(bg);
    bg.querySelector('input,select,textarea')?.focus();
  });
}

export const confirmBox = (title, text, okText = 'Eliminar') =>
  modal({ title, body: `<p class="soft" style="margin:0">${text}</p>`, okText, onOk: () => true });

export const val = (root, name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
export const chk = (root, name) => !!root.querySelector(`[name="${name}"]`)?.checked;

// tooltip global para elementos [data-tip]
let tip;
document.addEventListener('mousemove', (e) => {
  const t = e.target.closest?.('[data-tip]');
  if (!t) { tip?.remove(); tip = null; return; }
  if (!tip) { tip = document.createElement('div'); tip.className = 'bar-tip'; document.body.appendChild(tip); }
  tip.innerHTML = t.dataset.tip;
  tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 10) + 'px';
  tip.style.top = (e.clientY - 38) + 'px';
});

// ---------- gráficos SVG
export function gauge(value, max, color, label, unit = '', detail = '') {
  const R = 46, C = 2 * Math.PI * R;
  const pct = value === null || value === undefined ? 0 : Math.max(0, Math.min(1, value / max));
  return `<div class="glass gauge-card"><div class="gauge" style="color:${color}"><svg viewBox="0 0 112 112"><circle class="track" cx="56" cy="56" r="${R}"/>
    <circle class="fill" cx="56" cy="56" r="${R}" stroke="${color}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
    <div class="gv">${value === null || value === undefined ? '—' : fnum(value, value >= 100 ? 0 : 1)}<small>${unit}</small></div></div>
    <div class="gl">${label}</div><div class="gd">${detail}</div></div>`;
}

export function barChart(serie, { h = 190 } = {}) {
  const W = 640, padL = 34, padB = 26, padT = 12, plotH = h - padB - padT;
  const max = Math.max(3, ...serie.map((s) => s.preventivo + s.correctivo + s.predictivo));
  const bw = (W - padL) / serie.length;
  const col = { preventivo: '#2DD4BF', correctivo: '#F1495B', predictivo: '#8B6BF0' };
  let g = '';
  for (let i = 0; i <= 3; i++) { const y = padT + plotH - (plotH * i / 3); g += `<line class="axis" x1="${padL}" x2="${W}" y1="${y}" y2="${y}"/><text x="${padL - 8}" y="${y + 3}" text-anchor="end">${Math.round(max * i / 3)}</text>`; }
  serie.forEach((s, i) => {
    let y = padT + plotH; const x = padL + i * bw + bw * .2, w = bw * .6;
    ['preventivo', 'correctivo', 'predictivo'].forEach((k) => {
      const hh = plotH * s[k] / max; if (!hh) return; y -= hh;
      g += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="4" fill="${col[k]}" opacity=".92" data-tip="${s.mes} · ${k}: ${s[k]}"/>`;
    });
    const m = MESES[parseInt(s.mes.slice(5), 10) - 1];
    g += `<text x="${x + w / 2}" y="${h - 8}" text-anchor="middle">${m}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${h}">${g}</svg>
    <div class="legend"><span><i style="background:${col.preventivo}"></i>Preventivo</span><span><i style="background:${col.correctivo}"></i>Correctivo</span><span><i style="background:${col.predictivo}"></i>Predictivo</span></div>`;
}

export function lineChart(pts, { h = 230, unit = '', min = null, max = null, color = '#2DD4BF', decimals = 2 } = {}) {
  if (!pts.length) return '<div class="empty"><b>Sin mediciones</b>Registre checklists para ver la tendencia.</div>';
  const W = 640, padL = 46, padR = 16, padT = 16, padB = 30, plotW = W - padL - padR, plotH = h - padT - padB;
  const ys = pts.map((p) => p.y);
  let lo = Math.min(...ys, ...(min !== null ? [min] : [])), hi = Math.max(...ys, ...(max !== null ? [max] : []));
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * .12; lo -= pad; hi += pad;
  const ts = pts.map((p) => p.x.getTime()); const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const X = (t) => padL + (t1 === t0 ? plotW / 2 : (t - t0) / (t1 - t0) * plotW);
  const Y = (v) => padT + plotH - (v - lo) / (hi - lo) * plotH;
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, y = Y(v); g += `<line class="axis" x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}"/><text x="${padL - 8}" y="${y + 3}" text-anchor="end">${fnum(v, decimals > 2 ? 2 : (hi - lo) < 5 ? 2 : (hi - lo) < 50 ? 1 : 0)}</text>`; }
  const limit = (v, label) => v === null ? '' : `<line class="lim" x1="${padL}" x2="${W - padR}" y1="${Y(v)}" y2="${Y(v)}"/><text class="lim-t" x="${W - padR}" y="${Y(v) - 4}" text-anchor="end">${label} ${fnum(v, 2)}</text>`;
  g += limit(max, 'máx'); g += limit(min, 'mín');
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x.getTime()).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const area = `${path} L${X(pts[pts.length - 1].x.getTime())},${padT + plotH} L${X(pts[0].x.getTime())},${padT + plotH} Z`;
  g += `<defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#lg)"/><path d="${path}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round"/>`;
  pts.forEach((p) => { g += `<circle class="dot" cx="${X(p.x.getTime())}" cy="${Y(p.y)}" r="5" fill="${p.bad ? '#F1495B' : color}" data-tip="${fdate(p.x.toISOString())}: <b>${fnum(p.y, 3)} ${unit}</b>${p.bad ? ' ⚠' : ''}"/>`; });
  const labs = pts.length > 6 ? [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]] : pts;
  labs.forEach((p) => { g += `<text x="${X(p.x.getTime())}" y="${h - 9}" text-anchor="middle">${MESES[p.x.getMonth()]} ${String(p.x.getFullYear()).slice(2)}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${h}">${g}</svg>`;
}

export function hbar(parts) {
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1;
  return `<div style="display:flex;height:10px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,.06)">${parts.filter((p) => p.v).map((p) => `<div style="width:${p.v / tot * 100}%;background:${p.c}" data-tip="${p.l}: ${p.v}"></div>`).join('')}</div>
    <div class="legend">${parts.map((p) => `<span><i style="background:${p.c}"></i>${p.l} (${p.v})</span>`).join('')}</div>`;
}

// ---------- QR
export function qrSvg(text, cls = 'qr') {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(); let p = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p += `M${c + 4},${r + 4}h1v1h-1z`;
  return `<svg class="${cls}" viewBox="0 0 ${n + 8} ${n + 8}" shape-rendering="crispEdges"><rect width="${n + 8}" height="${n + 8}" fill="#fff"/><path d="${p}" fill="#0b1220"/></svg>`;
}

// ---------- markdown mínimo
export function md(src) {
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => `<a href="${u.startsWith('http') ? u : '#'}" ${u.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${t}</a>`);
  const lines = src.replace(/\r/g, '').split('\n'); let out = '', i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith('```')) { let c = ''; i++; while (i < lines.length && !lines[i].startsWith('```')) c += esc(lines[i++]) + '\n'; out += `<pre><code>${c}</code></pre>`; i++; continue; }
    if (/^#{1,4} /.test(l)) { const n = l.match(/^#+/)[0].length; out += `<h${n}>${inline(l.replace(/^#+ /, ''))}</h${n}>`; i++; continue; }
    if (l.startsWith('|') && lines[i + 1]?.match(/^\|[\s:|-]+\|$/)) {
      const cells = (r) => r.split('|').slice(1, -1).map((c) => c.trim());
      let t = '<table><thead><tr>' + cells(l).map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'; i += 2;
      while (i < lines.length && lines[i].startsWith('|')) { t += '<tr>' + cells(lines[i]).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>'; i++; }
      out += t + '</tbody></table>'; continue;
    }
    if (/^\s*[-*] /.test(l)) { out += '<ul>'; while (i < lines.length && /^\s*[-*] /.test(lines[i])) out += `<li>${inline(lines[i++].replace(/^\s*[-*] /, ''))}</li>`; out += '</ul>'; continue; }
    if (/^\d+\. /.test(l)) { out += '<ol>'; while (i < lines.length && /^\d+\. /.test(lines[i])) out += `<li>${inline(lines[i++].replace(/^\d+\. /, ''))}</li>`; out += '</ol>'; continue; }
    if (l.startsWith('>')) { let b = ''; while (i < lines.length && lines[i].startsWith('>')) b += lines[i++].replace(/^> ?/, '') + ' '; out += `<blockquote>${inline(b)}</blockquote>`; continue; }
    if (l.trim() === '---') { out += '<hr>'; i++; continue; }
    if (!l.trim()) { i++; continue; }
    let p = ''; while (i < lines.length && lines[i].trim() && !/^(#{1,4} |```|\||>|\s*[-*] |\d+\. )/.test(lines[i])) p += lines[i++] + ' ';
    out += `<p>${inline(p)}</p>`;
  }
  return out;
}

// ---------- cabecera de página
export const topbar = (eyebrow, title, actions = '') =>
  `<div class="topbar"><div class="t"><div class="eyebrow">${esc(eyebrow)}</div><h1>${title}</h1></div><div class="top-actions">${actions}</div></div>`;

export const eqSelect = (equipos, sel, id = 'eqsel') =>
  `<select class="input" id="${id}" style="width:auto;min-width:230px" aria-label="Equipo">${equipos.map((e) =>
    `<option value="${e.id}" ${e.id === sel ? 'selected' : ''}>${esc(e.qr_code)} · ${esc(e.marca)} ${esc(e.modelo)}${e.es_demo ? ' (demo)' : ''}</option>`).join('')}</select>`;
