"""Núcleo de SIST-EB: base de datos, autenticación, indicadores y alertas."""
import hashlib
import hmac
import json
import os
import re
import secrets
import socket
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

from plantillas import PLANTILLAS

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DATA = ROOT / "data"
UPLOADS = DATA / "uploads"
DB_PATH = DATA / "sist_eb.db"
KB_DIR = HERE / "knowledge"

ROLES_ESCRITURA = ("tecnico", "ingeniero", "administrador")


# ---------------------------------------------------------------- conexión
def connect():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def rows(conn, sql, args=()):
    return [dict(r) for r in conn.execute(sql, args).fetchall()]


def row(conn, sql, args=()):
    r = conn.execute(sql, args).fetchone()
    return dict(r) if r else None


# ---------------------------------------------------------------- contraseñas
def hash_password(pw, salt=None, iters=120_000):
    salt = salt or secrets.token_hex(8)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), iters).hex()
    return f"pbkdf2${iters}${salt}${h}"


def check_password(pw, stored):
    try:
        _, iters, salt, h = stored.split("$")
        calc = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), int(iters)).hex()
        return hmac.compare_digest(calc, h)
    except Exception:
        return False


# ---------------------------------------------------------------- utilidades
def parse_dt(s):
    if not s:
        return None
    s = str(s).replace("Z", "").replace(" ", "T")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return datetime.fromisoformat(s[:10])


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def get_config(conn, key, default=None):
    r = row(conn, "SELECT valor FROM config WHERE clave=?", (key,))
    return r["valor"] if r else default


def set_config(conn, key, value):
    conn.execute("INSERT INTO config(clave,valor) VALUES(?,?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor",
                 (key, value))


# ---------------------------------------------------------------- inicialización
def init_db():
    DATA.mkdir(exist_ok=True)
    UPLOADS.mkdir(exist_ok=True)
    conn = connect()
    conn.executescript((HERE / "schema.sql").read_text(encoding="utf-8"))
    for p in PLANTILLAS:
        conn.execute(
            "INSERT INTO plantillas_checklist(codigo,nombre,descripcion,items_json) VALUES(?,?,?,?) "
            "ON CONFLICT(codigo) DO UPDATE SET nombre=excluded.nombre, descripcion=excluded.descripcion, items_json=excluded.items_json",
            (p["codigo"], p["nombre"], p["descripcion"], json.dumps(p["items"], ensure_ascii=False)))
    load_knowledge(conn)
    if row(conn, "SELECT COUNT(*) c FROM usuarios")["c"] == 0:
        seed_users(conn)
        seed_demo(conn)
    if row(conn, "SELECT COUNT(*) c FROM cronograma")["c"] == 0:
        seed_cronograma(conn)
    conn.commit()
    sync_all(conn)
    conn.commit()
    return conn


def chunk_markdown(text):
    """Un fragmento por encabezado '##' (cada sección responde una pregunta)."""
    chunks, title, buf = [], None, []
    for line in text.splitlines():
        if line.startswith("## "):
            if title and buf:
                chunks.append((title, " ".join(buf).strip()))
            title, buf = line[3:].strip(), []
        elif line.startswith("#") or line.startswith(">"):
            continue
        elif line.strip():
            buf.append(line.strip())
    if title and buf:
        chunks.append((title, " ".join(buf).strip()))
    return chunks


def load_knowledge(conn):
    """Indexa los documentos base (se recargan en cada arranque)."""
    base = rows(conn, "SELECT id FROM documentacion WHERE origen='base'")
    for b in base:
        conn.execute("DELETE FROM documentacion WHERE id=?", (b["id"],))
    tipos = {"01": "otro", "02": "norma", "03": "protocolo", "04": "protocolo", "05": "protocolo", "06": "otro"}
    for f in sorted(KB_DIR.glob("*.md")):
        text = f.read_text(encoding="utf-8")
        titulo = text.splitlines()[0].lstrip("# ").strip()
        cur = conn.execute(
            "INSERT INTO documentacion(equipo_id,tipo,nombre,ruta_archivo,origen,paginas) VALUES(NULL,?,?,?,?,?)",
            (tipos.get(f.name[:2], "otro"), titulo, f"knowledge/{f.name}", "base", None))
        for sec, cont in chunk_markdown(text):
            conn.execute("INSERT INTO doc_chunks(documento_id,seccion,pagina,contenido) VALUES(?,?,?,?)",
                         (cur.lastrowid, sec, None, cont))


# ---------------------------------------------------------------- estado, KPIs, alertas
def kpis(conn, equipo_id, dias=365, now=None):
    now = now or datetime.now()
    eq = row(conn, "SELECT * FROM equipos WHERE id=?", (equipo_id,))
    if not eq:
        return None
    mants = rows(conn, "SELECT * FROM mantenimientos WHERE equipo_id=? ORDER BY fecha", (equipo_id,))
    primeras = [parse_dt(eq["fecha_registro"])] + [parse_dt(m["fecha"]) for m in mants]
    t0 = min(primeras)
    inicio = max(now - timedelta(days=dias), t0)
    T = max(24.0, (now - inicio).total_seconds() / 3600)
    en_ventana = [m for m in mants if inicio <= parse_dt(m["fecha"]) <= now]
    down = sum(m["horas_fuera_servicio"] or 0 for m in en_ventana)
    fallas = [m for m in en_ventana if m["falla"]]
    nf = len(fallas)
    down_f = sum(m["horas_fuera_servicio"] or 0 for m in fallas)
    disp = max(0.0, min(100.0, (T - down) / T * 100))
    mtbf = (T - down) / nf if nf else None
    mttr = down_f / nf if nf else None

    # cumplimiento del preventivo
    pms = [m for m in mants if m["tipo"] == "preventivo"]
    programados = cumplidos = 0
    for i in range(1, len(pms)):
        due = parse_dt(pms[i - 1]["proxima_fecha"])
        if not due or parse_dt(pms[i]["fecha"]) < inicio:
            continue
        programados += 1
        if parse_dt(pms[i]["fecha"]) <= due + timedelta(days=7):
            cumplidos += 1
    proxima = parse_dt(pms[-1]["proxima_fecha"]) if pms and pms[-1]["proxima_fecha"] else None
    if proxima and proxima + timedelta(days=7) < now:
        programados += 1  # preventivo vencido y no realizado
    dias_pm = (proxima.date() - now.date()).days if proxima else None
    cumpl = round(cumplidos / programados * 100, 1) if programados else None

    chk = rows(conn, "SELECT resultado_general FROM checklists WHERE equipo_id=?", (equipo_id,))
    chk_ok = sum(1 for c in chk if c["resultado_general"] == "conforme")
    por_tipo = {t: sum(1 for m in en_ventana if m["tipo"] == t) for t in ("preventivo", "correctivo", "predictivo")}
    return {
        "equipo_id": equipo_id, "ventana_horas": round(T, 1), "ventana_dias": round(T / 24),
        "disponibilidad": round(disp, 2), "mtbf_h": round(mtbf, 1) if mtbf else None,
        "mttr_h": round(mttr, 1) if mttr is not None else None, "fallas": nf,
        "horas_fuera_servicio": round(down, 1), "cumplimiento_pm": cumpl,
        "pm_programados": programados, "pm_cumplidos": cumplidos,
        "proxima_pm": proxima.date().isoformat() if proxima else None, "dias_para_pm": dias_pm,
        "mantenimientos": por_tipo, "checklists": len(chk),
        "checklists_conformes": chk_ok,
        "tasa_conformidad": round(chk_ok / len(chk) * 100, 1) if chk else None,
    }


def recompute_estado(conn, equipo_id):
    eq = row(conn, "SELECT * FROM equipos WHERE id=?", (equipo_id,))
    if not eq:
        return
    if eq["manual_fds"]:
        estado = "fuera_de_servicio"
    elif row(conn, "SELECT 1 x FROM mantenimientos WHERE equipo_id=? AND falla=1 AND resultado='pendiente'", (equipo_id,)):
        estado = "falla"
    else:
        k = kpis(conn, equipo_id)
        estado = "vencido" if k["dias_para_pm"] is not None and k["dias_para_pm"] < 0 else "activo"
    conn.execute("UPDATE equipos SET estado=? WHERE id=?", (estado, equipo_id))


def sync_alertas(conn, equipo_id):
    eq = row(conn, "SELECT * FROM equipos WHERE id=?", (equipo_id,))
    if not eq:
        return
    cand = []
    k = kpis(conn, equipo_id)
    if k["dias_para_pm"] is not None and k["dias_para_pm"] < 0:
        cand.append(("mantenimiento_vencido", "crit" if k["dias_para_pm"] < -30 else "warn",
                     f"Mantenimiento preventivo vencido hace {-k['dias_para_pm']} días"))
    elif k["dias_para_pm"] is not None and k["dias_para_pm"] <= 15:
        cand.append(("mantenimiento_vencido", "warn", f"Mantenimiento preventivo en {k['dias_para_pm']} días"))
    for m in rows(conn, "SELECT * FROM mantenimientos WHERE equipo_id=? AND falla=1 AND resultado='pendiente'", (equipo_id,)):
        cand.append(("falla_reportada", "crit", f"Falla abierta: {(m['descripcion'] or 'sin descripción')[:90]}"))
    for a in rows(conn, "SELECT * FROM accesorios WHERE equipo_id=? AND consumible=1 AND stock<=stock_minimo AND stock_minimo>0", (equipo_id,)):
        cand.append(("stock_bajo", "warn", f"Stock bajo de «{a['tipo']}»: {a['stock']} (mínimo {a['stock_minimo']})"))
    # último checklist de cada plantilla no conforme
    vistos = set()
    for c in rows(conn, "SELECT * FROM checklists WHERE equipo_id=? ORDER BY fecha DESC", (equipo_id,)):
        if c["plantilla_codigo"] in vistos:
            continue
        vistos.add(c["plantilla_codigo"])
        if c["resultado_general"] == "no_conforme":
            cand.append(("checklist_no_conforme", "crit", f"Último checklist «{c['tipo_checklist']}» no conforme"))
    activos = rows(conn, "SELECT * FROM alertas WHERE equipo_id=? AND estado='activa'", (equipo_id,))
    claves = {(t, d) for t, _, d in cand}
    for a in activos:
        if (a["tipo"], a["descripcion"]) not in claves:
            conn.execute("UPDATE alertas SET estado='resuelta' WHERE id=?", (a["id"],))
    existentes = {(a["tipo"], a["descripcion"]) for a in activos}
    for t, sev, d in cand:
        if (t, d) not in existentes:
            conn.execute("INSERT INTO alertas(equipo_id,tipo,severidad,descripcion) VALUES(?,?,?,?)",
                         (equipo_id, t, sev, d))


def sync_equipo(conn, equipo_id):
    recompute_estado(conn, equipo_id)
    sync_alertas(conn, equipo_id)


def sync_all(conn):
    for e in rows(conn, "SELECT id FROM equipos"):
        sync_equipo(conn, e["id"])


def serie_mensual(conn, equipo_ids, meses=12, now=None):
    """Mantenimientos y horas fuera de servicio por mes (para el dashboard)."""
    now = now or datetime.now()
    if not equipo_ids:
        return []
    marks = ",".join("?" * len(equipo_ids))
    ms = rows(conn, f"SELECT * FROM mantenimientos WHERE equipo_id IN ({marks})", equipo_ids)
    out = []
    y, m = now.year, now.month
    claves = []
    for _ in range(meses):
        claves.append((y, m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    for (y, m) in reversed(claves):
        sel = [x for x in ms if parse_dt(x["fecha"]).year == y and parse_dt(x["fecha"]).month == m]
        out.append({
            "mes": f"{y}-{m:02d}", "preventivo": sum(1 for x in sel if x["tipo"] == "preventivo"),
            "correctivo": sum(1 for x in sel if x["tipo"] == "correctivo"),
            "predictivo": sum(1 for x in sel if x["tipo"] == "predictivo"),
            "horas_fs": round(sum(x["horas_fuera_servicio"] or 0 for x in sel), 1),
        })
    return out


# ---------------------------------------------------------------- usuarios y datos demo
def seed_users(conn):
    pw = hash_password("sisteb2026")
    for nombre, email, rol in [
        ("Camila Rojas", "camila.rojas@sist-eb.local", "tecnico"),
        ("Karen Castañeda", "karen.castaneda@sist-eb.local", "ingeniero"),
        ("Administrador SIST-EB", "admin@sist-eb.local", "administrador"),
        ("Miguel Ángel Castro Leal", "docente@sist-eb.local", "docente"),
        ("Estudiante invitado", "estudiante@sist-eb.local", "estudiante"),
    ]:
        conn.execute("INSERT INTO usuarios(nombre,email,password_hash,rol) VALUES(?,?,?,?)", (nombre, email, pw, rol))


def _iso(dias_atras, hora=9):
    d = datetime.now().replace(hour=hora, minute=0, second=0, microsecond=0) - timedelta(days=dias_atras)
    return d.strftime("%Y-%m-%dT%H:%M")


def _fecha(dias_atras):
    return (date.today() - timedelta(days=dias_atras)).isoformat()


def _mant(conn, eq, tipo, dias, desc, hfs=0, falla=0, res="conforme", prox_dias=None, causa=None, acciones=None,
          repuestos=None, tec=1):
    cur = conn.execute(
        "INSERT INTO mantenimientos(equipo_id,tecnico_id,tipo,fecha,descripcion,causa,acciones,repuestos,falla,"
        "horas_fuera_servicio,resultado,proxima_fecha,es_demo) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1)",
        (eq, tec, tipo, _iso(dias), desc, causa, acciones, repuestos, falla, hfs, res,
         _fecha(prox_dias) if prox_dias is not None else None))
    return cur.lastrowid


def _chk(conn, eq, codigo, dias, valores=None, fallos=(), mant=None, tec=1, obs=None, corriente_nominal=None):
    """Crea un checklist DEMO a partir de una plantilla. 'valores' mapea fragmento-del-ítem -> valor medido."""
    pl = next(p for p in PLANTILLAS if p["codigo"] == codigo)
    valores = valores or {}
    items, todos_ok = [], True
    for i, it in enumerate(pl["items"]):
        medido, cumple = None, None
        if it["tipo"] == "bool":
            cumple = 0 if any(f in it["item"] for f in fallos) else 1
        else:
            for frag, v in valores.items():
                if frag in it["item"]:
                    medido = v
            lim_max = it.get("max") if it.get("max") is not None else corriente_nominal
            if medido is not None:
                cumple = int((it.get("min") is None or medido >= it.get("min")) and (lim_max is None or medido <= lim_max))
            else:
                cumple = None
        if cumple == 0:
            todos_ok = False
        items.append((i, it, medido, cumple))
    cur = conn.execute(
        "INSERT INTO checklists(equipo_id,mantenimiento_id,tecnico_id,plantilla_codigo,tipo_checklist,fecha,"
        "resultado_general,observaciones,es_demo) VALUES(?,?,?,?,?,?,?,?,1)",
        (eq, mant, tec, codigo, pl["nombre"], _iso(dias, 10), "conforme" if todos_ok else "no_conforme", obs))
    cid = cur.lastrowid
    for i, it, medido, cumple in items:
        lim_max = it.get("max") if it.get("max") is not None else (corriente_nominal if it.get("max_ref") else None)
        conn.execute(
            "INSERT INTO checklist_items(checklist_id,orden,seccion,item,tipo,valor_medido,valor_esperado,unidad,"
            "limite_min,limite_max,componente,norma,instrumento,si_falla,cumple) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (cid, i, it["seccion"], it["item"], it["tipo"], None if medido is None else str(medido),
             it.get("esperado"), it.get("unidad"), it.get("min"), lim_max, it.get("componente"), it.get("norma"),
             it.get("instrumento"), it.get("si_falla"), cumple))
    return cid


def seed_demo(conn):
    """Datos de DEMOSTRACIÓN (es_demo=1). No son resultados reales de pruebas."""
    ins = ("INSERT INTO equipos(nombre,marca,modelo,serie,fabricante,anio,servicio,ubicacion,estado,qr_code,"
           "frecuencia_pm_dias,corriente_nominal_a,potencia_max_w,clase_aplicada,criticidad,observaciones,es_demo) "
           "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    # Equipo principal del proyecto (Entrega 1)
    conn.execute(ins, ("Electrobisturí", "Valleylab", "FT10", "VLB-FT10-000123", "Medtronic", 2019, "Cirugía general",
                       "Quirófano 3", "activo", "EB-014", 180, 4.0, 300, "CF", "alta",
                       "Equipo del proyecto. La corriente nominal es un valor de ejemplo: reemplazar por el de la placa de datos.", 0))
    conn.execute(ins, ("Electrobisturí", "ERBE", "VIO 300 D", "ERB-V300-004417", "ERBE Elektromedizin", 2021, "Ginecología",
                       "Quirófano 1", "activo", "EB-021", 180, 4.0, 300, "CF", "alta",
                       "Unidad de demostración (datos ficticios).", 1))
    conn.execute(ins, ("Electrobisturí", "CONMED", "System 5000", "CNM-S5K-002281", "CONMED", 2017, "Urgencias",
                       "Sala de procedimientos", "activo", "EB-007", 180, 4.0, 300, "BF", "media",
                       "Unidad de demostración (datos ficticios).", 1))
    # --- Accesorios
    acc = [
        (1, "Placa de retorno adulto desechable", "Electrodo neutro de un solo uso", 1, 38, 20, "REF-PR-A"),
        (1, "Placa de retorno pediátrica desechable", "Electrodo neutro pediátrico", 1, 6, 10, "REF-PR-P"),
        (1, "Electrodo activo tipo lápiz (mano)", "Lápiz con 2 botones, un solo uso", 1, 25, 10, "REF-LP-2B"),
        (1, "Kit de electrodos (hoja, bola, aguja)", "Puntas intercambiables", 1, 12, 5, "REF-KIT-3"),
        (1, "Pedal doble (corte / coagulación)", "Pedal de activación", 0, 1, 0, "REF-PD-2"),
        (1, "Cable de placa de retorno reutilizable", "Cable con conector de 2 clavijas", 0, 2, 1, "REF-CPR"),
        (1, "Pinza bipolar", "Pinza bipolar con cable", 0, 4, 2, "REF-PB"),
        (2, "Placa de retorno adulto desechable", "Electrodo neutro de un solo uso", 1, 30, 15, "REF-PR-A"),
        (2, "Electrodo activo tipo lápiz (mano)", "Lápiz con 2 botones, un solo uso", 1, 18, 10, "REF-LP-2B"),
        (3, "Placa de retorno adulto desechable", "Electrodo neutro de un solo uso", 1, 4, 10, "REF-PR-A"),
        (3, "Pedal doble (corte / coagulación)", "Pedal de activación", 0, 1, 0, "REF-PD-2"),
    ]
    for a in acc:
        conn.execute("INSERT INTO accesorios(equipo_id,tipo,descripcion,consumible,stock,stock_minimo,referencia,es_demo) "
                     "VALUES(?,?,?,?,?,?,?,1)", a)

    # --- EB-014 (equipo 1): 14 meses de historial de demostración
    p1 = _mant(conn, 1, "preventivo", 395, "Mantenimiento preventivo semestral: limpieza, inspección, pruebas de seguridad y potencia.",
               hfs=3, prox_dias=215, acciones="Limpieza de rejillas, verificación de cables, pruebas con analizador.")
    _mant(conn, 1, "correctivo", 330, "Pedal sin respuesta intermitente.", hfs=8, falla=1, tec=1,
          causa="Microinterruptor del pedal desgastado.", acciones="Reemplazo del pedal.", repuestos="Pedal doble")
    _mant(conn, 1, "correctivo", 270, "Alarma REM falsa con placa correctamente adherida.", hfs=5, falla=1, tec=2,
          causa="Cable de placa de retorno con falso contacto.", acciones="Reemplazo del cable de placa.", repuestos="Cable de placa de retorno")
    p2 = _mant(conn, 1, "preventivo", 212, "Mantenimiento preventivo semestral.", hfs=3, prox_dias=32,
               acciones="Inspección, limpieza y pruebas completas.")
    c140 = _mant(conn, 1, "correctivo", 140, "Potencia de corte por debajo de lo ajustado, detectada en prueba funcional.",
                 hfs=26, falla=1, tec=2, causa="Desviación de la etapa de potencia en modo corte.",
                 acciones="Ajuste y verificación con analizador en servicio técnico.")
    _mant(conn, 1, "predictivo", 100, "Análisis de tendencia de corrientes de fuga y resistencia de tierra.", hfs=0, tec=2,
          acciones="Sin desviaciones relevantes; continuar monitoreo.")
    _mant(conn, 1, "correctivo", 60, "Cable del electrodo activo con aislamiento dañado.", hfs=4, falla=1, tec=1,
          causa="Desgaste mecánico del cable.", acciones="Reemplazo del electrodo y cable.", repuestos="Electrodo activo tipo lápiz")

    def vals(corte, coag, alta, bip, tierra, fuga, contacto, cf, cf2, consumo, hf=None, fuga_abierta=None):
        v = {"Corte monopolar — ajuste 50": corte, "Coagulación monopolar": coag,
             "alta potencia": alta, "Bipolar": bip, "Resistencia de tierra": tierra,
             "fuga a tierra (condición normal)": fuga, "fuga a tierra (tierra abierta": fuga_abierta or fuga * 1.8,
             "contacto de la envolvente": contacto, "paciente, parte aplicada CF (condición normal)": cf,
             "paciente, parte aplicada CF (falla única)": cf2, "Corriente de consumo": consumo}
        if hf is not None:
            v["alta frecuencia"] = hf
        return v

    historial = [
        (395, p1, vals(49.2, 39.4, 98.1, 29.6, 0.08, 180, 21, 3.1, 11.0, 1.20, 82)),
        (212, p2, vals(47.6, 38.9, 96.4, 29.1, 0.09, 215, 24, 3.4, 12.2, 1.25, 85)),
        (140, c140, vals(38.2, 37.8, 79.6, 29.0, 0.09, 260, 27, 3.9, 13.5, 1.30, 90)),
        (139, c140, vals(48.9, 39.0, 97.8, 29.2, 0.10, 262, 27, 3.9, 13.6, 1.30, 88)),
        (100, None, vals(48.5, 38.7, 97.2, 29.0, 0.10, 270, 29, 4.1, 14.0, 1.33, 89)),
        (60, None, vals(48.9, 39.1, 97.9, 29.3, 0.11, 310, 31, 4.8, 15.2, 1.36, 91)),
    ]
    for dias, mant, v in historial:
        _chk(conn, 1, "seguridad_electrica", dias, v, mant=mant, corriente_nominal=4.0)
        _chk(conn, 1, "potencia_salida", dias, v, mant=mant)
    _chk(conn, 1, "inspeccion_visual", 395, mant=p1)
    _chk(conn, 1, "inspeccion_visual", 212, mant=p2)
    _chk(conn, 1, "inspeccion_visual", 60, fallos=("Cable del electrodo activo",), obs="Cable del electrodo activo con aislamiento dañado.")
    _chk(conn, 1, "inspeccion_visual", 59, obs="Electrodo y cable reemplazados; inspección conforme.")
    _chk(conn, 1, "alarmas", 395, mant=p1)
    _chk(conn, 1, "alarmas", 212, mant=p2)
    _chk(conn, 1, "alarmas", 100)

    # --- EB-021 (equipo 2)
    p = _mant(conn, 2, "preventivo", 100, "Mantenimiento preventivo semestral.", hfs=3, prox_dias=-80, tec=1)
    _mant(conn, 2, "correctivo", 200, "Pantalla con teclas sin respuesta.", hfs=6, falla=1, causa="Teclado de membrana deteriorado.",
          acciones="Reemplazo del panel frontal.", tec=2)
    _chk(conn, 2, "seguridad_electrica", 100, vals(49.5, 39.6, 98.9, 29.8, 0.06, 140, 18, 2.6, 9.5, 1.10), mant=p, corriente_nominal=4.0)
    _chk(conn, 2, "potencia_salida", 100, vals(49.5, 39.6, 98.9, 29.8, 0.06, 140, 18, 2.6, 9.5, 1.10), mant=p)

    # --- EB-007 (equipo 3): falla abierta
    _mant(conn, 3, "preventivo", 150, "Mantenimiento preventivo semestral.", hfs=3, prox_dias=-30, tec=1)
    _mant(conn, 3, "correctivo", 3, "No alarma al desconectar la placa de retorno; consumo de corriente elevado.", hfs=72, falla=1,
          res="pendiente", causa="En diagnóstico (posible falla del circuito REM).", tec=2)
    _chk(conn, 3, "alarmas", 3, fallos=("Alarma REM audible", "Alarma REM ante alta impedancia", "La salida de potencia se inhibe"),
         tec=2, obs="No hay alarma al desconectar la placa; equipo retirado de servicio.")
    _chk(conn, 3, "seguridad_electrica", 3, {"Corriente de consumo": 4.6, "Resistencia de tierra": 0.12, "fuga a tierra (condición normal)": 640},
         tec=2, corriente_nominal=4.0)

    set_config(conn, "demo", "1")


E1, E23, FIN = "Entrega 1 · Diseño e ingeniería clínica", "Entregas 2 y 3 · Plataforma", "Cierre y sustentación"


def seed_cronograma(conn):
    """Plan del proyecto. Entrega 1: semanas del documento (fecha de entrega 26/08/2026).
    Entregas 2-3: fechas ESTIMADAS (estimada=1) que el grupo debe confirmar."""
    T = [
        (E1, "Investigación bibliográfica y normativa", "2026-07-08", "2026-07-21", 100, "Todo el equipo", 0, 1),
        (E1, "Diagrama de bloques y arquitectura", "2026-07-22", "2026-07-28", 100, "Por asignar", 0, 1),
        (E1, "Casos de uso y diagrama de flujo", "2026-07-29", "2026-08-04", 100, "Por asignar", 0, 1),
        (E1, "Diseño de la base de datos (modelo relacional)", "2026-08-05", "2026-08-11", 100, "Por asignar", 0, 1),
        (E1, "Mockup de la interfaz", "2026-08-12", "2026-08-18", 100, "Por asignar", 0, 1),
        (E1, "Consolidación del documento y ensayo de sustentación", "2026-08-19", "2026-08-26", 100, "Todo el equipo", 0, 1),
        (E1, "HITO · Sustentación Entrega 1", "2026-08-26", "2026-08-26", 100, "Todo el equipo", 1, 0),
        (E23, "Base de datos y servidor (API)", "2026-08-27", "2026-09-14", 100, "Por asignar", 0, 1),
        (E23, "Hoja de vida, inventario, mantenimiento y checklists", "2026-09-07", "2026-09-28", 100, "Por asignar", 0, 1),
        (E23, "Dashboard e indicadores (MTBF, MTTR, disponibilidad)", "2026-09-21", "2026-10-02", 100, "Por asignar", 0, 1),
        (E23, "Código QR y evidencias fotográficas", "2026-09-21", "2026-10-02", 100, "Por asignar", 0, 1),
        (E23, "Carga de manuales y asistente de IA (RAG)", "2026-09-14", "2026-10-04", 100, "Por asignar", 0, 1),
        (E23, "Gemelo digital, diagnóstico de fallas y reportes", "2026-09-28", "2026-10-04", 100, "Por asignar", 0, 1),
        (E23, "Manual de usuario y manual técnico", "2026-10-02", "2026-10-05", 100, "Por asignar", 0, 1),
        (FIN, "Cargar datos reales: mediciones, fotos y manual del fabricante", "2026-10-06", "2026-10-16", 0, "Por asignar", 0, 1),
        (FIN, "Documento integrado de las tres entregas", "2026-10-05", "2026-10-19", 70, "Todo el equipo", 0, 1),
        (FIN, "Video demostrativo (5–8 min)", "2026-10-14", "2026-10-21", 0, "Por asignar", 0, 1),
        (FIN, "Ensayo de sustentación (todos conocen el sistema)", "2026-10-19", "2026-10-25", 0, "Todo el equipo", 0, 1),
        (FIN, "HITO · Sustentación final (20 min demo + 10 min preguntas)", "2026-10-26", "2026-10-26", 0, "Todo el equipo", 1, 1),
    ]
    for i, (fase, nom, ini, fin, av, resp, hito, est) in enumerate(T):
        conn.execute("INSERT INTO cronograma(fase,nombre,inicio,fin,avance,responsable,hito,estimada,orden) VALUES(?,?,?,?,?,?,?,?,?)",
                     (fase, nom, ini, fin, av, resp, hito, est, i))
