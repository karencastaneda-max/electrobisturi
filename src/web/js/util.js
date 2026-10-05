import { app } from './main.js';

// URL que codifica el QR de un equipo. En localhost se usa la IP de red del servidor
// para que el celular (misma Wi-Fi) pueda abrir la hoja de vida al escanear.
export function qrUrl(code) {
  const h = location.hostname;
  const local = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  const base = local ? (app.state.config?.base_url || location.origin) : location.origin;
  return `${base}/#/e/${encodeURIComponent(code)}`;
}

// Comprime una imagen a JPEG (máx. 1600 px) antes de subirla.
export function compressImage(file, max = 1600, q = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = url;
  });
}
