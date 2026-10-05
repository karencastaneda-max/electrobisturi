# Manual técnico — SIST-EB

## 1. Arquitectura
```
Navegador (SPA, JS modular)  ──HTTP/JSON──►  Servidor Python (stdlib)  ──►  SQLite (data/sist_eb.db)
   · QR (qrcode-generator)                     · API REST /api/*              · uploads/ (fotos, manuales)
   · PDF.js (extracción de texto)              · Autenticación por token      · knowledge/ (base de IA)
   · Gráficos SVG propios                      · RAG (BM25) + KPIs + alertas
```
Sin dependencias externas de ejecución: solo Python 3.9+. Las librerías de navegador están en `src/web/vendor/`.

## 2. Ejecución
```bash
python3 src/server/app.py --port 8765
```
Imprime la URL local y la de red. La base se crea y se siembra en el primer arranque (borre `data/sist_eb.db` para reiniciar).

## 3. Estructura
| Ruta | Contenido |
|---|---|
| `src/server/app.py` | Servidor HTTP y rutas de la API |
| `src/server/core.py` | BD, contraseñas, KPIs, estado, alertas, datos demo |
| `src/server/rag.py` | Recuperación BM25 y respuesta extractiva |
| `src/server/plantillas.py` | Plantillas de checklist |
| `src/server/knowledge/` | Base de conocimiento (`.md`) y árbol de fallas (`fallas.json`) |
| `src/server/schema.sql` | Esquema SQLite |
| `src/web/` | Interfaz (index.html, css, js/pages) |
| `db/` | Esquema PostgreSQL de la Entrega 1 y diccionario de datos |

## 4. Modelo de datos
Mismo modelo de la Entrega 1 ampliado: `mantenimientos` (falla, horas_fuera_servicio, causa, acciones, repuestos), `checklist_items` (límites, componente, norma, instrumento), `doc_chunks` (fragmentos indexados), `plantillas_checklist`, `sesiones`, `config`. Los registros de ejemplo llevan `es_demo=1`. Ver `db/diccionario_datos.md`.

## 5. Indicadores
Periodo T = últimos 365 días o desde el registro del equipo si es menor.
- Disponibilidad = (T − horas fuera de servicio) / T × 100 (incluye preventivos y correctivos).
- MTBF = (T − horas fuera de servicio) / n.º de fallas (correctivos con *evento de falla*).
- MTTR = horas fuera de servicio de las fallas / n.º de fallas.
- Cumplimiento preventivo = preventivos realizados hasta la fecha programada +7 días / programados; un preventivo vencido sin realizar cuenta como no cumplido.
- Estado: *En falla* si hay una falla pendiente; *Vencido* si la fecha del próximo preventivo pasó; *Fuera de servicio* si se fija manualmente.
- Alertas: preventivo vencido o próximo (≤15 d), falla abierta, stock bajo, último checklist no conforme; se sincronizan en cada cambio.

## 6. Asistente de IA (RAG)
1. Los documentos (`knowledge/*.md` y los cargados) se dividen en fragmentos (por encabezado `##`, o por ~900 caracteres en PDF/TXT) y se guardan en `doc_chunks`.
2. Cada pregunta se normaliza (minúsculas, sin tildes, sin palabras vacías, raíz simple) y se amplía con sinónimos.
3. BM25 ordena los fragmentos; se exige un puntaje mínimo y una cobertura mínima de términos de la pregunta. Si no se cumple, responde «no encontré información».
4. La respuesta es **extractiva**: muestra los fragmentos recuperados con documento y sección/página. No se genera texto libre, por lo que no inventa.
5. Preguntas sobre el estado, el último/próximo mantenimiento, el inventario o los indicadores se responden desde la base de datos.
6. No extrapola a otros equipos (p. ej. ventilador): lo indica.

## 7. API (resumen)
Autenticación: `POST /api/login` → token; enviar `Authorization: Bearer <token>`.
`GET/POST /api/equipos`, `GET/PUT/DELETE /api/equipos/<id>`, `GET /api/equipos/qr/<código>`, `/api/accesorios`, `/api/mantenimientos`, `/api/plantillas`, `/api/checklists`, `/api/tendencia`, `/api/evidencias`, `/api/documentos`, `POST /api/ia/preguntar`, `/api/dashboard`, `/api/alertas`, `/api/export/{sql|json|csv}`, `/api/usuarios`, `POST /api/demo/purge`, `/api/cronograma` (GET/POST/PUT/DELETE, tabla `cronograma`). Pública: `GET /api/public/equipo/<código>`.

## 8. Código QR y red
El QR codifica `<URL base>/#/e/<código>`. En `localhost` se usa la IP de la red local detectada. Para que un celular lo abra: misma red Wi-Fi (o *hotspot* del celular al que se conecta el portátil). Para publicarlo en internet, exponga el puerto con un túnel (p. ej. `cloudflared tunnel --url http://localhost:8765`) y escriba la URL pública en *Administración → Dirección base*. La cámara integrada del escáner web exige HTTPS; la cámara nativa del celular funciona siempre.

## 9. Seguridad
Contraseñas con PBKDF2-SHA256; sesiones con token de 7 días; roles de solo lectura; consultas SQL parametrizadas; salida HTML escapada. Los archivos subidos usan nombres aleatorios. Es un sistema académico: para uso hospitalario real añada HTTPS, política de contraseñas y auditoría.

## 10. Limitaciones
- Las plantillas usan límites genéricos (IEC 60601-1 y ±20 % de potencia) que deben ajustarse al manual del fabricante.
- El asistente solo recupera texto: PDF escaneados requieren OCR previo.
- La base de conocimiento incluida fue redactada con apoyo de IA y debe ser validada por el grupo.
