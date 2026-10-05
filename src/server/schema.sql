-- ============================================================
-- SIST-EB — Esquema SQLite (motor de la plataforma funcional)
-- Equivalente al modelo de la Entrega 1 (db/schema.sql, PostgreSQL)
-- con las columnas adicionales necesarias para MTBF/MTTR,
-- checklists medibles, evidencias, documentos indexados e IA.
-- ============================================================
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS config (
    clave TEXT PRIMARY KEY,
    valor TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre         TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    rol            TEXT NOT NULL CHECK (rol IN ('tecnico','ingeniero','administrador','docente','estudiante')),
    fecha_creacion TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sesiones (
    token      TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    creada     TEXT NOT NULL DEFAULT (datetime('now')),
    expira     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS equipos (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre              TEXT NOT NULL,
    marca               TEXT NOT NULL,
    modelo              TEXT NOT NULL,
    serie               TEXT NOT NULL UNIQUE,
    fabricante          TEXT NOT NULL,
    anio                INTEGER NOT NULL,
    servicio            TEXT,
    ubicacion           TEXT,
    estado              TEXT NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo','vencido','falla','fuera_de_servicio')),
    qr_code             TEXT NOT NULL UNIQUE,
    frecuencia_pm_dias  INTEGER NOT NULL DEFAULT 180,
    corriente_nominal_a REAL,
    potencia_max_w      REAL,
    clase_aplicada      TEXT DEFAULT 'CF',
    registro_invima     TEXT,
    criticidad          TEXT DEFAULT 'alta',
    observaciones       TEXT,
    manual_fds          INTEGER NOT NULL DEFAULT 0,   -- 1 = fuera de servicio fijado manualmente
    es_demo             INTEGER NOT NULL DEFAULT 0,
    fecha_registro      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accesorios (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id    INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    tipo         TEXT NOT NULL,
    descripcion  TEXT,
    consumible   INTEGER NOT NULL DEFAULT 0,
    stock        INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    referencia   TEXT,
    es_demo      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS documentacion (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id    INTEGER REFERENCES equipos(id) ON DELETE CASCADE,   -- NULL = base general
    tipo         TEXT NOT NULL CHECK (tipo IN ('manual','protocolo','norma','otro')),
    nombre       TEXT NOT NULL,
    ruta_archivo TEXT NOT NULL,
    origen       TEXT NOT NULL DEFAULT 'usuario',                   -- 'base' | 'usuario'
    paginas      INTEGER,
    fecha_carga  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS doc_chunks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    documento_id INTEGER NOT NULL REFERENCES documentacion(id) ON DELETE CASCADE,
    seccion      TEXT,
    pagina       INTEGER,
    contenido    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mantenimientos (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id            INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    tecnico_id           INTEGER REFERENCES usuarios(id),
    tipo                 TEXT NOT NULL CHECK (tipo IN ('preventivo','correctivo','predictivo')),
    fecha                TEXT NOT NULL,
    descripcion          TEXT,
    causa                TEXT,
    acciones             TEXT,
    repuestos            TEXT,
    falla                INTEGER NOT NULL DEFAULT 0,     -- 1 = evento de falla (entra a MTBF/MTTR)
    horas_fuera_servicio REAL NOT NULL DEFAULT 0,
    resultado            TEXT CHECK (resultado IN ('conforme','no_conforme','pendiente')),
    proxima_fecha        TEXT,
    es_demo              INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plantillas_checklist (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo      TEXT NOT NULL UNIQUE,
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    items_json  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checklists (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id         INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    mantenimiento_id  INTEGER REFERENCES mantenimientos(id) ON DELETE SET NULL,
    tecnico_id        INTEGER REFERENCES usuarios(id),
    plantilla_codigo  TEXT,
    tipo_checklist    TEXT NOT NULL,
    fecha             TEXT NOT NULL,
    resultado_general TEXT CHECK (resultado_general IN ('conforme','no_conforme')),
    observaciones     TEXT,
    analisis_tecnico  TEXT,
    es_demo           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checklist_items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    checklist_id   INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    orden          INTEGER NOT NULL DEFAULT 0,
    seccion        TEXT,
    item           TEXT NOT NULL,
    tipo           TEXT NOT NULL DEFAULT 'bool' CHECK (tipo IN ('bool','num')),
    valor_medido   TEXT,
    valor_esperado TEXT,
    unidad         TEXT,
    limite_min     REAL,
    limite_max     REAL,
    componente     TEXT,
    norma          TEXT,
    instrumento    TEXT,
    si_falla       TEXT,
    cumple         INTEGER
);

CREATE TABLE IF NOT EXISTS evidencias (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id        INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    mantenimiento_id INTEGER REFERENCES mantenimientos(id) ON DELETE SET NULL,
    checklist_id     INTEGER REFERENCES checklists(id) ON DELETE SET NULL,
    tipo             TEXT NOT NULL DEFAULT 'foto' CHECK (tipo IN ('foto','video','documento')),
    descripcion      TEXT,
    ruta_archivo     TEXT NOT NULL,
    autor_id         INTEGER REFERENCES usuarios(id),
    fecha            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alertas (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id        INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    tipo             TEXT NOT NULL CHECK (tipo IN ('mantenimiento_vencido','falla_reportada','stock_bajo','checklist_no_conforme','otro')),
    estado           TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','resuelta','descartada')),
    severidad        TEXT NOT NULL DEFAULT 'warn',
    descripcion      TEXT,
    fecha_generacion TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS consultas_ia (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id   INTEGER REFERENCES usuarios(id),
    equipo_id    INTEGER REFERENCES equipos(id) ON DELETE SET NULL,
    pregunta     TEXT NOT NULL,
    respuesta    TEXT NOT NULL,
    fuente_citada TEXT,
    respondida   INTEGER NOT NULL DEFAULT 1,
    fecha        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mant_equipo     ON mantenimientos(equipo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_chk_equipo      ON checklists(equipo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_items_chk       ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_alertas_equipo  ON alertas(equipo_id, estado);
CREATE INDEX IF NOT EXISTS idx_doc_equipo      ON documentacion(equipo_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc      ON doc_chunks(documento_id);
CREATE INDEX IF NOT EXISTS idx_evid_equipo     ON evidencias(equipo_id);

CREATE TABLE IF NOT EXISTS cronograma (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    fase        TEXT NOT NULL,
    nombre      TEXT NOT NULL,
    inicio      TEXT NOT NULL,
    fin         TEXT NOT NULL,
    avance      INTEGER NOT NULL DEFAULT 0,
    responsable TEXT,
    hito        INTEGER NOT NULL DEFAULT 0,
    estimada    INTEGER NOT NULL DEFAULT 0,   -- 1 = fechas estimadas, por confirmar por el grupo
    notas       TEXT,
    orden       INTEGER NOT NULL DEFAULT 0
);
