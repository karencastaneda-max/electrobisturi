# Manual de usuario — SIST-EB

SIST-EB es la plataforma para gestionar, mantener y consultar el **electrobisturí**: hoja de vida, inventario, mantenimiento, checklists medibles, resultados, dashboard con MTBF/MTTR, códigos QR, asistente de IA y reportes.

## 1. Ingreso
Abra la dirección que imprime el servidor al iniciar (por ejemplo `http://localhost:8765`) e inicie sesión. Cuentas de demostración (clave `sisteb2026`): técnica, ingeniero, docente (solo lectura) y administrador.

| Rol | Puede |
|---|---|
| Técnico / Ingeniero | Registrar equipos, mantenimientos, checklists, fotos, documentos |
| Administrador | Todo lo anterior + usuarios, datos demo, configuración del QR |
| Docente / Estudiante | Consultar, usar el asistente de IA, ver reportes |

## 2. Dashboard
Muestra disponibilidad, cumplimiento del preventivo, conformidad de checklists, MTBF, MTTR, alertas y la actividad reciente. El selector superior filtra por equipo.

## 3. Equipos y hoja de vida
**Equipos → Registrar equipo** crea la ficha (marca, modelo, serie, fabricante, año, servicio, ubicación, frecuencia de preventivo, corriente nominal). Cada equipo recibe un código (EB-0XX) y un QR. La hoja de vida tiene pestañas: Resumen, Mantenimiento, Checklists, Inventario, Evidencias, Documentos y Código QR, más accesos al Gemelo digital y a Resultados.

## 4. Mantenimiento
Pestaña **Mantenimiento → Registrar**. Elija el tipo:
- **Preventivo:** la plataforma sugiere la próxima fecha (fecha + frecuencia).
- **Correctivo:** marque *Evento de falla* e indique las **horas fuera de servicio**; con ellas se calculan MTBF, MTTR y disponibilidad. Si la falla sigue abierta, déjela *Pendiente* y ciérrela luego con «Cerrar falla».
- **Predictivo:** análisis de tendencias.

El estado del equipo (Operativo, Vencido, En falla) y las alertas se actualizan solos.

## 5. Checklists y pruebas funcionales
**Checklists** ofrece cuatro plantillas: inspección visual, seguridad eléctrica, potencia de salida y alarmas/REM. Ingrese **solo valores realmente medidos**; la plataforma compara con el criterio, marca cumple/no cumple y calcula el resultado general. Si hay ítems no conformes debe escribir su **análisis técnico**. Desde el resultado puede registrar un correctivo, adjuntar fotos e imprimir.

> Los criterios por defecto (p. ej. ±20 % de potencia) son genéricos: reemplácelos por los del manual del fabricante.

## 6. Inventario
Accesorios y consumibles con stock y mínimo. Los botones −1 / +1 registran consumo y reposición; al llegar al mínimo se genera una alerta.

## 7. Evidencias fotográficas
Pestaña **Evidencias → Agregar foto**. En el celular abre la cámara. Las fotos se comprimen y se guardan en el servidor.

## 8. Resultados
Tres vistas: **Tablas** (últimos valores contra el límite), **Gráficas** (tendencia con límites) e **Interpretación** (lectura por reglas y proyección lineal de cuándo se alcanzaría el límite). Es una ayuda: el análisis y las conclusiones son del grupo.

## 9. Código QR
En **Códigos QR** (o la pestaña QR del equipo) imprima la etiqueta y péguela en el equipo. Al escanearla con la cámara del celular se abre la **ficha de campo**; con sesión iniciada permite registrar mantenimiento, checklist y fotos al instante. El celular debe estar en la misma red Wi-Fi que el servidor (ver Manual técnico para publicarlo en internet).

## 10. Asistente de IA
Pregunte en lenguaje natural. Responde **solo** con la documentación cargada y con los datos de la hoja de vida, cita el documento y la sección o página, y dice «no encontré información» cuando no hay evidencia. Para ampliar su conocimiento cargue el manual del fabricante en **Manuales y normas** (PDF, TXT o MD con texto).

## 11. Diagnóstico de fallas y Gemelo digital
- **Diagnóstico:** elija el síntoma y siga las causas probables, cómo verificarlas y con qué instrumento; puede registrar el correctivo con un clic.
- **Gemelo digital:** esquema del equipo cuyos bloques cambian de color según el último checklist; incluye calculadora de V e I para pruebas de potencia.

## 12. Reportes
**Reportes → Generar informe técnico** compone el informe (ficha, indicadores, historial, pruebas, tendencias, inventario, evidencias). Escriba el análisis del grupo en la sección 8 y use *Imprimir / Guardar PDF*. También se exportan CSV, JSON y SQL.

## 13. Cronograma (diagrama de Gantt)
El menú **Cronograma (Gantt)** muestra las tareas del proyecto como barras en el tiempo, con el avance (parte clara), los hitos (rombos) y la línea roja de «hoy». Haga clic en una barra para editar fechas, avance y responsable, o use **Nueva tarea**. Las barras de borde punteado tienen fechas estimadas por confirmar. La vista **Mantenimiento preventivo** dibuja los ciclos, las próximas fechas, los vencidos y las fallas de cada equipo.

## 14. Datos de demostración
Los registros con la etiqueta **DEMO** son ejemplos para mostrar el sistema; **no son resultados reales**. El administrador los elimina en *Administración* antes de la entrega final.
