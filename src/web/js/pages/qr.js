import { esc, icon, topbar, toast } from '../ui.js';
import { labelHtml } from '../tabs.js';
import { qrUrl } from '../util.js';

let stream = null, raf = 0;
const stop = () => { cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); stream = null; };

export async function render(el, p, app) {
  stop();
  await app.loadEquipos();
  const eqs = app.state.equipos;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const canScan = 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia && window.isSecureContext;
  el.innerHTML = topbar('Identificación única', 'Códigos QR', `<button class="btn primary" onclick="window.print()">${icon('print')} Imprimir todas las etiquetas</button>`) + `
    <div class="grid gE mb no-print">
      <div class="glass pad"><div class="card-head"><div><h3>Abrir un equipo por su código</h3><p class="sub">Escriba el código impreso en la etiqueta o escanee el QR</p></div></div>
        <form id="mf" style="display:flex;gap:10px"><input class="input" id="code" placeholder="Ej.: EB-014" style="text-transform:uppercase" aria-label="Código del equipo"><button class="btn primary">${icon('search')} Abrir</button></form>
        <div style="margin-top:14px">${canScan ? `<button class="btn" id="scan">${icon('camera')} Escanear con la cámara</button><div id="sb" style="margin-top:12px"></div>` : `<div class="muted" style="font-size:12px;line-height:1.6">${icon('info')} El escáner integrado requiere HTTPS o localhost y un navegador compatible (Chrome/Edge). <b style="color:var(--soft)">En el celular, use directamente la app de cámara</b>: al apuntar al QR abre la hoja de vida.</div>`}</div></div>
      <div class="glass pad"><div class="card-head"><div><h3>Cómo se usa el QR</h3></div></div>
        <ol class="soft" style="font-size:12.5px;line-height:1.9;margin:0;padding-left:18px"><li>Imprima la etiqueta y péguela en el equipo.</li><li>Con la cámara del celular, escanee el QR.</li><li>Se abre la <b style="color:#fff">ficha de campo</b> con el estado y la próxima fecha de mantenimiento.</li><li>Inicie sesión para registrar mantenimientos, checklists y fotos.</li></ol>
        <div class="hl-box mono" style="font-size:11.5px;margin-top:14px;word-break:break-all;color:var(--cyan)">${esc(qrUrl('EB-XXX'))}</div>
        <p class="muted" style="font-size:11.5px;margin-top:8px">${local ? 'Se usa la IP de red del servidor para que el celular pueda conectarse (misma Wi-Fi).' : 'Se usa la dirección actual del sitio.'} Se puede cambiar en Administración.</p></div></div>
    <div class="qr-grid print-labels">${eqs.map((e) => `<a href="#/equipo/${e.id}/qr" style="display:block;color:inherit">${labelHtml(e, qrUrl(e.qr_code))}</a>`).join('')}</div>`;
  const go = (c) => { c = c.trim(); if (!c) return; stop(); location.hash = '#/e/' + encodeURIComponent(c.toUpperCase()); };
  el.querySelector('#mf').onsubmit = (e) => { e.preventDefault(); go(el.querySelector('#code').value); };
  el.querySelector('#scan')?.addEventListener('click', async () => {
    const sb = el.querySelector('#sb');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      sb.innerHTML = '<div class="scan-box"><video playsinline muted></video></div>';
      const v = sb.querySelector('video'); v.srcObject = stream; await v.play();
      const det = new BarcodeDetector({ formats: ['qr_code'] });
      const loop = async () => {
        try { const r = await det.detect(v); if (r[0]) { const m = r[0].rawValue.match(/#\/e\/([^/?#]+)/); if (m) return go(decodeURIComponent(m[1])); toast('QR no reconocido: ' + r[0].rawValue.slice(0, 40), true); } } catch {}
        raf = requestAnimationFrame(loop);
      }; loop();
    } catch (e) { toast('No se pudo abrir la cámara: ' + e.message, true); }
  });
  window.addEventListener('hashchange', stop, { once: true });
}
