# SIST-EB — Plataforma Inteligente de Gestión, Mantenimiento y Asistencia Técnica del Electrobisturí

Proyecto integrador del curso **Equipos de Soporte**
Docente: Miguel Ángel Castro Leal

---

## 📌 Descripción

SIST-EB es una plataforma tecnológica que integra ingeniería clínica, gestión de mantenimiento, base de datos, dashboard, identificación por código QR y un asistente de inteligencia artificial, para dar soporte técnico integral al **electrobisturí** (unidad electroquirúrgica de alta frecuencia).

El proyecto **no consiste en construir un equipo médico**, sino una herramienta profesional para apoyar su gestión, mantenimiento y consulta técnica.

## 👥 Equipo

| Integrante | Rol en el proyecto |
|---|---|
| [Nombre 1] | [completar] |
| [Nombre 2] | [completar] |
| [Nombre 3] | [completar] |
| [Nombre 4] | [completar] |

## 🩺 Equipo biomédico seleccionado

**Electrobisturí** — unidad electroquirúrgica de alta frecuencia usada para corte y coagulación de tejido en modo monopolar o bipolar. Seleccionado por su criticidad clínica, su normativa específica (IEC 60601-2-2) y su alta frecuencia de mantenimiento correctivo.

## 🏗️ Arquitectura

La plataforma se organiza en 6 capas:

1. **Equipo biomédico** — identificación única por QR/NFC.
2. **Captura de datos** — checklists, fotografías, mediciones, registros.
3. **Plataforma web (SIST-EB)** — hoja de vida, inventario, mantenimiento, dashboard.
4. **Servicios y almacenamiento** — base de datos relacional, documentos, seguridad.
5. **Asistente de IA (RAG)** — responde preguntas técnicas citando la documentación cargada, sin inventar información.
6. **Usuarios** — técnico biomédico, ingeniero clínico, administrador, docente, estudiante.

Ver diagramas completos en [`/docs/diagramas`](./docs/diagramas).

## 🗂️ Estructura del repositorio

```
├── docs/                    → Documento de cada entrega, normativa y diagramas
│   ├── Entrega1_SIST-EB_Electrobisturi.docx
│   └── diagramas/
│       ├── diagrama_bloques.png
│       ├── diagrama_arquitectura.png
│       ├── diagrama_flujo.png
│       └── diagrama_erd.png
├── db/                       → Modelo de base de datos
│   ├── schema.sql
│   └── diccionario_datos.md
├── mockups/                  → Boceto de interfaz de alta fidelidad
│   └── SIST-EB_Mockup_Interactivo.html
├── src/                      → Código fuente (se completa a partir de la Entrega 2)
└── README.md
```

## 🧱 Modelo de datos

Modelo relacional (SQL) con 9 tablas principales: `equipos`, `accesorios`, `mantenimientos`, `checklists`, `checklist_items`, `evidencias`, `documentacion`, `usuarios`, `alertas`, `consultas_ia`.

Ver script completo en [`/db/schema.sql`](./db/schema.sql) y el diccionario de datos en [`/db/diccionario_datos.md`](./db/diccionario_datos.md).

## 📋 Normativa aplicable

| Norma / Referencia | Aplicación |
|---|---|
| IEC 60601-1 | Requisitos generales de seguridad básica y desempeño esencial |
| IEC 60601-2-2 | Requisitos particulares para equipos electroquirúrgicos de alta frecuencia |
| IEC 60601-1-2 | Compatibilidad electromagnética |
| ISO 14971 | Gestión de riesgos en dispositivos médicos |
| Decreto 4725 de 2005 (INVIMA) | Registro sanitario y vigilancia de dispositivos médicos en Colombia |

## 🖥️ Mockup de interfaz

Prototipo interactivo de alta fidelidad con 3 pantallas (dashboard, hoja de vida del equipo y asistente de IA). Se puede abrir directamente en cualquier navegador:

```
mockups/SIST-EB_Mockup_Interactivo.html
```

## 📅 Estado del proyecto

- [x] **Entrega 1** — Diseño e ingeniería clínica *(completada)*
- [ ] **Entrega 2** — Prototipo funcional
- [ ] **Entrega 3** — Plataforma completa

## 🤖 Declaración de uso de inteligencia artificial

En cumplimiento de la política del curso:

- **Herramienta utilizada:** [completar, p. ej. Claude]
- **Finalidad:** apoyo en la organización de la documentación, generación de diagramas descriptivos (bloques, arquitectura, flujo, ERD), redacción inicial de secciones del documento y del mockup de interfaz.
- **Módulos desarrollados con apoyo de IA:** estructura del documento de Entrega 1, diagramas técnicos, modelo de base de datos, mockup HTML interactivo.
- **Verificación realizada por el grupo:** [completar — cada integrante debe revisar y validar el contenido técnico, normativo y de diseño antes de cada entrega].

## 📄 Licencia

Proyecto académico — Escuela/Facultad [completar], curso Equipos de Soporte, 2026.
