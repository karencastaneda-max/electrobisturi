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
