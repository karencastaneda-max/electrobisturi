# Diccionario de datos — SIST-EB

Modelo relacional. Ver diagrama entidad-relación en [`/docs/diagramas/diagrama_erd.png`](../docs/diagramas/diagrama_erd.png) y el script en [`schema.sql`](./schema.sql).

## equipos
Ficha maestra del electrobisturí.

| Campo | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | Identificador único |
| nombre, marca, modelo | VARCHAR | Datos comerciales del equipo |
| serie | VARCHAR (único) | Número de serie del fabricante |
| fabricante | VARCHAR | Fabricante del equipo |
| anio | INT | Año de fabricación |
| servicio | VARCHAR | Servicio clínico donde opera |
| ubicacion | VARCHAR | Ubicación física actual |
| estado | VARCHAR | activo / vencido / falla / fuera_de_servicio |
| qr_code | VARCHAR (único) | Código de identificación QR/NFC |

## accesorios
Accesorios y consumibles del equipo (electrodos, cables, placas).

| Campo | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | Identificador único |
| equipo_id | INT FK → equipos | Equipo al que pertenece |
| tipo, descripcion | VARCHAR | Tipo y detalle del accesorio |
| consumible | BOOLEAN | Si se consume con el uso |
| stock | INT | Unidades disponibles |

## documentacion
Manuales, protocolos y normas cargadas — base de conocimiento del asistente de IA.

| Campo | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | Identificador único |
| equipo_id | INT FK → equipos | Equipo asociado |
| tipo | VARCHAR | manual / protocolo / norma / otro |
| nombre, ruta_archivo | VARCHAR | Nombre y ubicación del archivo |

## mantenimientos
Historial de intervenciones.

| Campo | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | Identificador único |
| equipo_id | INT FK → equipos | Equipo intervenido |
| tecnico_id | INT FK → usuarios | Técnico responsable |
| tipo | VARCHAR | preventivo / correctivo / predictivo |
| resultado | VARCHAR | conforme / no_conforme / pendiente |
| proxima_fecha | DATE | Próximo mantenimiento programado |

## checklists / checklist_items
Formularios de verificación y cada ítem evaluado.

| Campo | Tipo | Descripción |
|---|---|---|
| checklist.tipo_checklist | VARCHAR | Tipo de checklist aplicado |
| item.valor_medido / valor_esperado | VARCHAR | Comparación de la medición contra especificación |
| item.cumple | BOOLEAN | Resultado individual del ítem |

## evidencias
Fotografías y documentos de soporte de una intervención o checklist.

## alertas
Notificaciones automáticas.

| Campo | Tipo | Descripción |
|---|---|---|
| tipo | VARCHAR | mantenimiento_vencido / falla_reportada / stock_bajo / otro |
| estado | VARCHAR | activa / resuelta / descartada |

## usuarios
Cuentas del sistema.

| Campo | Tipo | Descripción |
|---|---|---|
| rol | VARCHAR | tecnico / ingeniero / administrador / docente / estudiante |

## consultas_ia
Registro de interacciones con el asistente de inteligencia artificial, con la fuente citada en cada respuesta (principio de no-invención de información).

---
## Ampliaciones de las Entregas 2 y 3 (implementadas en `src/server/schema.sql`, SQLite)

| Tabla | Campos añadidos / nuevos | Uso |
|---|---|---|
| equipos | frecuencia_pm_dias, corriente_nominal_a, potencia_max_w, clase_aplicada, registro_invima, criticidad, observaciones, manual_fds, es_demo | Programación de preventivos, criterio de consumo, parte aplicada B/BF/CF |
| accesorios | stock_minimo, referencia, es_demo | Alertas de stock bajo |
| mantenimientos | falla, horas_fuera_servicio, causa, acciones, repuestos, es_demo | MTBF, MTTR y disponibilidad |
| checklists | plantilla_codigo, observaciones, analisis_tecnico, es_demo | Pruebas funcionales con análisis del técnico |
| checklist_items | orden, seccion, tipo (bool/num), limite_min, limite_max, componente, norma, instrumento, si_falla | Criterios de aceptación y gemelo digital |
| evidencias | equipo_id, descripcion, autor_id | Fotos por equipo |
| documentacion | origen (base/usuario), paginas | Manuales y base de conocimiento |
| doc_chunks | documento_id, seccion, pagina, contenido | Fragmentos indexados para el asistente |
| plantillas_checklist | codigo, nombre, items_json | Plantillas de checklist |
| alertas | severidad | Alertas calculadas automáticamente |
| consultas_ia | respondida | Registro de preguntas al asistente |
| sesiones, config | — | Autenticación y configuración (URL base del QR) |

Los registros con `es_demo=1` son datos de demostración y se eliminan desde *Administración*.
