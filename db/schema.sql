-- ============================================================
-- SIST-EB — Modelo relacional de la base de datos
-- Plataforma de Gestión, Mantenimiento y Asistencia Técnica
-- del Electrobisturí
-- Motor objetivo: PostgreSQL 14+ (compatible con MySQL con
-- ajustes menores en tipos de dato)
-- ============================================================

-- ---------- USUARIOS ----------
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(120)  NOT NULL,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    rol             VARCHAR(30)   NOT NULL CHECK (rol IN
                    ('tecnico', 'ingeniero', 'administrador', 'docente', 'estudiante')),
    fecha_creacion  TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ---------- EQUIPOS ----------
CREATE TABLE equipos (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(120)  NOT NULL,
    marca           VARCHAR(80)   NOT NULL,
    modelo          VARCHAR(80)   NOT NULL,
    serie           VARCHAR(80)   NOT NULL UNIQUE,
    fabricante      VARCHAR(120)  NOT NULL,
    anio            INT           NOT NULL,
    servicio        VARCHAR(120),
    ubicacion       VARCHAR(120),
    estado          VARCHAR(30)   NOT NULL DEFAULT 'activo' CHECK (estado IN
                    ('activo', 'vencido', 'falla', 'fuera_de_servicio')),
    qr_code         VARCHAR(60)   NOT NULL UNIQUE,
    fecha_registro  TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ---------- ACCESORIOS ----------
CREATE TABLE accesorios (
    id              SERIAL PRIMARY KEY,
    equipo_id       INT           NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    tipo            VARCHAR(60)   NOT NULL,
    descripcion     VARCHAR(200),
    consumible      BOOLEAN       NOT NULL DEFAULT FALSE,
    stock           INT           DEFAULT 0
);

-- ---------- DOCUMENTACION ----------
CREATE TABLE documentacion (
    id              SERIAL PRIMARY KEY,
    equipo_id       INT           NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    tipo            VARCHAR(40)   NOT NULL CHECK (tipo IN
                    ('manual', 'protocolo', 'norma', 'otro')),
    nombre          VARCHAR(150)  NOT NULL,
    ruta_archivo    VARCHAR(255)  NOT NULL,
    fecha_carga     TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ---------- MANTENIMIENTOS ----------
CREATE TABLE mantenimientos (
    id              SERIAL PRIMARY KEY,
    equipo_id       INT           NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    tecnico_id      INT           NOT NULL REFERENCES usuarios(id),
    tipo            VARCHAR(20)   NOT NULL CHECK (tipo IN
                    ('preventivo', 'correctivo', 'predictivo')),
    fecha           TIMESTAMP     NOT NULL DEFAULT NOW(),
    descripcion     TEXT,
    resultado       VARCHAR(30)   CHECK (resultado IN
                    ('conforme', 'no_conforme', 'pendiente')),
    proxima_fecha   DATE
);

-- ---------- CHECKLISTS ----------
CREATE TABLE checklists (
    id              SERIAL PRIMARY KEY,
    equipo_id       INT           NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    mantenimiento_id INT          REFERENCES mantenimientos(id) ON DELETE SET NULL,
    tecnico_id      INT           NOT NULL REFERENCES usuarios(id),
    tipo_checklist  VARCHAR(60)   NOT NULL,
    fecha           TIMESTAMP     NOT NULL DEFAULT NOW(),
    resultado_general VARCHAR(20) CHECK (resultado_general IN ('conforme', 'no_conforme'))
);

-- ---------- CHECKLIST_ITEMS ----------
CREATE TABLE checklist_items (
    id              SERIAL PRIMARY KEY,
    checklist_id    INT           NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    item            VARCHAR(150)  NOT NULL,
    valor_medido    VARCHAR(40),
    valor_esperado  VARCHAR(40),
    unidad          VARCHAR(20),
    cumple          BOOLEAN
);

-- ---------- EVIDENCIAS ----------
CREATE TABLE evidencias (
    id              SERIAL PRIMARY KEY,
    mantenimiento_id INT          REFERENCES mantenimientos(id) ON DELETE CASCADE,
    checklist_id    INT           REFERENCES checklists(id) ON DELETE CASCADE,
    tipo            VARCHAR(20)   NOT NULL CHECK (tipo IN ('foto', 'video', 'documento')),
    ruta_archivo    VARCHAR(255)  NOT NULL,
    fecha           TIMESTAMP     NOT NULL DEFAULT NOW(),
    CHECK (mantenimiento_id IS NOT NULL OR checklist_id IS NOT NULL)
);

-- ---------- ALERTAS ----------
CREATE TABLE alertas (
    id              SERIAL PRIMARY KEY,
    equipo_id       INT           NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    tipo            VARCHAR(40)   NOT NULL CHECK (tipo IN
                    ('mantenimiento_vencido', 'falla_reportada', 'stock_bajo', 'otro')),
    estado          VARCHAR(20)   NOT NULL DEFAULT 'activa' CHECK (estado IN
                    ('activa', 'resuelta', 'descartada')),
    descripcion     VARCHAR(255),
    fecha_generacion TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------- CONSULTAS_IA ----------
CREATE TABLE consultas_ia (
    id              SERIAL PRIMARY KEY,
    usuario_id      INT           NOT NULL REFERENCES usuarios(id),
    equipo_id       INT           REFERENCES equipos(id),
    pregunta        TEXT          NOT NULL,
    respuesta       TEXT          NOT NULL,
    fuente_citada   VARCHAR(255),
    fecha           TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Índices recomendados
-- ============================================================
CREATE INDEX idx_mantenimientos_equipo ON mantenimientos(equipo_id);
CREATE INDEX idx_checklists_equipo ON checklists(equipo_id);
CREATE INDEX idx_alertas_equipo_estado ON alertas(equipo_id, estado);
CREATE INDEX idx_documentacion_equipo ON documentacion(equipo_id);

-- ============================================================
-- Datos de ejemplo (opcional — útil para pruebas y demo)
-- ============================================================
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
('Camila Rojas', 'camila.rojas@sist-eb.local', 'hash_demo', 'tecnico'),
('Sebastián Alvarado', 'sebastian.alvarado@sist-eb.local', 'hash_demo', 'ingeniero');

INSERT INTO equipos (nombre, marca, modelo, serie, fabricante, anio, servicio, ubicacion, estado, qr_code) VALUES
('Electrobisturí', 'Valleylab', 'FT10', 'VLB-FT10-000123', 'Medtronic', 2019, 'Cirugía general', 'Quirófano 3', 'vencido', 'EB-014');
