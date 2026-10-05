#!/usr/bin/env python3
"""SIST-EB — servidor de la plataforma (API REST + sitio web).

Solo usa la biblioteca estándar de Python 3.9+ (sin dependencias).
Uso:  python3 src/server/app.py [--port 8765] [--host 0.0.0.0]
"""
import argparse
import base64
import csv
import io
import json
import mimetypes
import re
import secrets
import sys
import uuid
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import core
import rag
from core import connect, row, rows

WEB = core.HERE.parent / "web"
FALLAS = json.loads((core.KB_DIR / "fallas.json").read_text(encoding="utf-8"))
STATE = {"port": 8765, "index": None, "index_key": None}


class ApiError(Exception):
    def __init__(self, status, msg):
        self.status, self.msg = status, msg


def need(cond, msg="Datos inválidos", status=400):
    if not cond:
        raise ApiError(status, msg)


def pick(d, keys):
    return {k: d.get(k) for k in keys if k in d}


def num(v):
    if v in (None, ""):
        return None
    try:
        return float(str(v).replace(",", "."))
    except ValueError:
        return None


# ------------------------------------------------------------------ servicios
def equipo_completo(conn, eid):
    e = row(conn, "SELECT * FROM equipos WHERE id=?", (eid,))
    need(e, "Equipo no encontrado", 404)
    e["kpis"] = core.kpis(conn, eid)
    e["accesorios"] = rows(conn, "SELECT * FROM accesorios WHERE equipo_id=? ORDER BY consumible DESC, tipo", (eid,))
    e["mantenimientos"] = rows(conn, "SELECT m.*, u.nombre tecnico FROM mantenimientos m LEFT JOIN usuarios u ON u.id=m.tecnico_id "
                                     "WHERE m.equipo_id=? ORDER BY m.fecha DESC", (eid,))
    e["checklists"] = rows(conn, """SELECT c.*, u.nombre tecnico,
        (SELECT COUNT(*) FROM checklist_items i WHERE i.checklist_id=c.id) n_items,
        (SELECT COUNT(*) FROM checklist_items i WHERE i.checklist_id=c.id AND i.cumple=1) n_cumple,
        (SELECT COUNT(*) FROM checklist_items i WHERE i.checklist_id=c.id AND i.cumple=0) n_falla
        FROM checklists c LEFT JOIN usuarios u ON u.id=c.tecnico_id WHERE c.equipo_id=? ORDER BY c.fecha DESC""", (eid,))
    e["evidencias"] = rows(conn, "SELECT * FROM evidencias WHERE equipo_id=? ORDER BY fecha DESC", (eid,))
    e["documentos"] = rows(conn, "SELECT d.*, (SELECT COUNT(*) FROM doc_chunks c WHERE c.documento_id=d.id) n_chunks "
                                 "FROM documentacion d WHERE d.equipo_id=? ORDER BY fecha_carga DESC", (eid,))
    e["alertas"] = rows(conn, "SELECT * FROM alertas WHERE equipo_id=? AND estado='activa' ORDER BY severidad DESC, id DESC", (eid,))
    e["componentes"] = componentes(conn, eid)
    return e


def componentes(conn, eid):
    """Estado por componente a partir del último checklist de cada plantilla (gemelo digital)."""
    comp = {}
    vistos = set()
    for c in rows(conn, "SELECT id, plantilla_codigo, fecha FROM checklists WHERE equipo_id=? ORDER BY fecha DESC", (eid,)):
        if c["plantilla_codigo"] in vistos:
            continue
        vistos.add(c["plantilla_codigo"])
        for it in rows(conn, "SELECT * FROM checklist_items WHERE checklist_id=? ORDER BY orden", (c["id"],)):
            k = it["componente"] or "otro"
            d = comp.setdefault(k, {"estado": "ok", "items": []})
            d["items"].append({"item": it["item"], "valor": it["valor_medido"], "unidad": it["unidad"], "cumple": it["cumple"],
                               "esperado": it["valor_esperado"], "fecha": c["fecha"], "checklist_id": c["id"],
                               "si_falla": it["si_falla"]})
            if it["cumple"] == 0:
                d["estado"] = "fail"
    return comp


def check_items(items):
    out = []
    for i, it in enumerate(items):
        tipo = it.get("tipo", "bool")
        mn, mx = num(it.get("limite_min")), num(it.get("limite_max"))
        medido = it.get("valor_medido")
        cumple = it.get("cumple")
        v = num(medido)
        if tipo == "num" and v is not None and (mn is not None or mx is not None):
            cumple = int((mn is None or v >= mn) and (mx is None or v <= mx))
        elif cumple is not None:
            cumple = int(bool(cumple))
        out.append({**pick(it, ["seccion", "item", "tipo", "valor_esperado", "unidad", "componente", "norma",
                                 "instrumento", "si_falla"]), "orden": i, "valor_medido": None if medido in (None, "") else str(medido),
                    "limite_min": mn, "limite_max": mx, "cumple": cumple, "tipo": tipo})
    return out


def get_index(conn):
    key = tuple(conn.execute("SELECT COUNT(*), COALESCE(MAX(id),0), COALESCE(SUM(id),0) FROM doc_chunks").fetchone())
    if STATE["index_key"] != key:
        data = rows(conn, """SELECT c.id, c.documento_id, c.seccion, c.pagina, c.contenido, d.nombre documento, d.tipo, d.equipo_id
                             FROM doc_chunks c JOIN documentacion d ON d.id=c.documento_id""")
        STATE["index"], STATE["index_key"] = rag.Index(data), key
    return STATE["index"]


def fmt_fecha(s):
    d = core.parse_dt(s)
    return d.strftime("%d/%m/%Y") if d else "—"


def responder_datos(conn, q, eid):
    """Preguntas sobre los datos del equipo (hoja de vida) respondidas desde la base de datos."""
    f = rag.fold(q)
    if re.search(r"que (es|significa|son)|como se (calcula|define|mide)|definicion|para que sirve", f):
        return None
    if eid is None:
        m = re.search(r"eb-?\d+", f)
        if m:
            r = row(conn, "SELECT id FROM equipos WHERE lower(qr_code)=?", (m.group(0) if "-" in m.group(0) else m.group(0).replace("eb", "eb-"),))
            eid = r["id"] if r else None
    if eid is None:
        r = row(conn, "SELECT id FROM equipos ORDER BY es_demo, id LIMIT 1")
        eid = r["id"] if r else None
    if eid is None:
        return None
    e = row(conn, "SELECT * FROM equipos WHERE id=?", (eid,))
    k = core.kpis(conn, eid)
    fuente = f"Base de datos SIST-EB · Hoja de vida {e['qr_code']}"
    mants = rows(conn, "SELECT * FROM mantenimientos WHERE equipo_id=? ORDER BY fecha DESC", (eid,))
    txt = None
    if re.search(r"ultim\w* (mantenimiento|preventivo|correctivo)|cuando fue (el )?ultimo", f):
        tipo = "preventivo" if "preventivo" in f else "correctivo" if "correctivo" in f else None
        m = next((x for x in mants if tipo is None or x["tipo"] == tipo), None)
        txt = (f"El último mantenimiento {tipo + ' ' if tipo else ''}de {e['qr_code']} fue el {fmt_fecha(m['fecha'])} "
               f"({m['tipo']}, resultado {m['resultado'] or 'sin resultado'}): {m['descripcion'] or 'sin descripción'}") if m \
            else f"No hay mantenimientos {tipo or ''} registrados para {e['qr_code']}."
    elif re.search(r"proxim\w* (mantenimiento|preventivo|fecha|revision)|cuando (toca|corresponde)", f):
        txt = (f"El próximo mantenimiento preventivo de {e['qr_code']} está programado para el {fmt_fecha(k['proxima_pm'])}"
               + (f" (hace {-k['dias_para_pm']} días: está VENCIDO)." if k["dias_para_pm"] is not None and k["dias_para_pm"] < 0
                  else f" (en {k['dias_para_pm']} días).")) if k["proxima_pm"] \
            else f"{e['qr_code']} no tiene un próximo preventivo programado; registre un preventivo para definirlo."
    elif re.search(r"cuantos? (mantenimientos|fallas|correctivos|preventivos)|numero de fallas", f):
        txt = (f"{e['qr_code']} registra {len(mants)} mantenimientos en total: "
               f"{sum(1 for m in mants if m['tipo']=='preventivo')} preventivos, "
               f"{sum(1 for m in mants if m['tipo']=='correctivo')} correctivos y "
               f"{sum(1 for m in mants if m['tipo']=='predictivo')} predictivos. "
               f"Eventos de falla en los últimos {k['ventana_dias']} días: {k['fallas']}.")
    elif re.search(r"mtbf|mttr|disponibilidad|indicadores|cumplimiento", f):
        txt = (f"Indicadores de {e['qr_code']} (últimos {k['ventana_dias']} días): disponibilidad {k['disponibilidad']} %, "
               f"MTBF {k['mtbf_h'] if k['mtbf_h'] else '—'} h, MTTR {k['mttr_h'] if k['mttr_h'] is not None else '—'} h, "
               f"{k['fallas']} fallas, cumplimiento del preventivo {k['cumplimiento_pm'] if k['cumplimiento_pm'] is not None else '—'} %.")
    elif re.search(r"stock|inventario|cuantas? (placas|electrodos|accesorios)|consumibles", f):
        acc = rows(conn, "SELECT * FROM accesorios WHERE equipo_id=? ORDER BY consumible DESC, tipo", (eid,))
        bajos = [a for a in acc if a["consumible"] and a["stock_minimo"] and a["stock"] <= a["stock_minimo"]]
        txt = (f"Inventario de {e['qr_code']}: " + "; ".join(f"{a['tipo']} ({a['stock']})" for a in acc) + "."
               + (f" Stock bajo: {', '.join(a['tipo'] for a in bajos)}." if bajos else " Sin alertas de stock bajo.")) if acc \
            else f"{e['qr_code']} no tiene accesorios registrados."
    elif re.search(r"estado|operativo|alertas|pendiente|en falla|funciona", f):
        al = rows(conn, "SELECT * FROM alertas WHERE equipo_id=? AND estado='activa'", (eid,))
        txt = (f"{e['qr_code']} ({e['marca']} {e['modelo']}) está en estado «{e['estado'].replace('_', ' ')}». "
               + (f"Alertas activas: {'; '.join(a['descripcion'] for a in al)}." if al else "No tiene alertas activas."))
    if not txt:
        return None
    return {"respondida": True, "tipo": "datos", "fragmentos": [
        {"texto": txt, "documento": fuente, "tipo": "datos", "seccion": "Datos en tiempo real", "pagina": None, "score": None}]}


def sql_dump(conn):
    out = ["-- SIST-EB · volcado SQL generado " + datetime.now().strftime("%Y-%m-%d %H:%M"), ""]
    for line in conn.iterdump():
        if "password_hash" in line and line.startswith("INSERT"):
            line = re.sub(r"'pbkdf2\$[^']*'", "'<hash omitido>'", line)
        if line.startswith("INSERT INTO \"sesiones\"") or line.startswith("INSERT INTO \"doc_chunks\""):
            continue
        out.append(line)
    return "\n".join(out)


# ------------------------------------------------------------------ rutas API
ROUTES = []


def route(method, pattern, auth="user", roles=None):
    def deco(fn):
        ROUTES.append((method, re.compile("^" + pattern + "$"), fn, auth, roles))
        return fn
    return deco


@route("POST", "/api/login", auth=None)
def login(ctx, body):
    u = row(ctx.conn, "SELECT * FROM usuarios WHERE lower(email)=?", (str(body.get("email", "")).strip().lower(),))
    need(u and core.check_password(str(body.get("password", "")), u["password_hash"]), "Correo o contraseña incorrectos", 401)
    token = secrets.token_urlsafe(32)
    ctx.conn.execute("INSERT INTO sesiones(token,usuario_id,expira) VALUES(?,?,?)",
                     (token, u["id"], (datetime.now() + timedelta(days=7)).isoformat()))
    return {"token": token, "user": pick(u, ["id", "nombre", "email", "rol"])}


@route("POST", "/api/logout")
def logout(ctx, body):
    ctx.conn.execute("DELETE FROM sesiones WHERE token=?", (ctx.token,))
    return {"ok": True}


@route("GET", "/api/me")
def me(ctx, body):
    return pick(ctx.user, ["id", "nombre", "email", "rol"])


@route("GET", "/api/config", auth=None)
def get_config(ctx, body):
    base = core.get_config(ctx.conn, "base_url") or f"http://{core.lan_ip()}:{STATE['port']}"
    demo = row(ctx.conn, "SELECT (SELECT COUNT(*) FROM mantenimientos WHERE es_demo=1)+(SELECT COUNT(*) FROM checklists WHERE es_demo=1)"
                          "+(SELECT COUNT(*) FROM equipos WHERE es_demo=1)+(SELECT COUNT(*) FROM accesorios WHERE es_demo=1) c")["c"]
    return {"base_url": base, "demo": demo > 0, "version": "2.0", "lan_ip": core.lan_ip(), "port": STATE["port"]}


@route("PUT", "/api/config", roles=("administrador",))
def put_config(ctx, body):
    core.set_config(ctx.conn, "base_url", str(body.get("base_url", "")).strip().rstrip("/"))
    return {"ok": True}


@route("GET", "/api/public/equipo/([^/]+)", auth=None)
def public_equipo(ctx, body, qr):
    e = row(ctx.conn, "SELECT * FROM equipos WHERE lower(qr_code)=lower(?)", (unquote(qr),))
    need(e, "Equipo no encontrado", 404)
    k = core.kpis(ctx.conn, e["id"])
    return {**pick(e, ["id", "nombre", "marca", "modelo", "serie", "servicio", "ubicacion", "estado", "qr_code"]),
            "proxima_pm": k["proxima_pm"], "dias_para_pm": k["dias_para_pm"]}


@route("GET", "/api/equipos")
def list_equipos(ctx, body):
    out = rows(ctx.conn, "SELECT * FROM equipos ORDER BY id")
    for e in out:
        e["kpis"] = core.kpis(ctx.conn, e["id"])
        e["alertas"] = row(ctx.conn, "SELECT COUNT(*) c FROM alertas WHERE equipo_id=? AND estado='activa'", (e["id"],))["c"]
    return out


EQ_FIELDS = ["nombre", "marca", "modelo", "serie", "fabricante", "anio", "servicio", "ubicacion", "estado", "qr_code",
             "frecuencia_pm_dias", "corriente_nominal_a", "potencia_max_w", "clase_aplicada", "registro_invima",
             "criticidad", "observaciones"]


@route("POST", "/api/equipos", roles=core.ROLES_ESCRITURA)
def create_equipo(ctx, body):
    for f in ("nombre", "marca", "modelo", "serie", "fabricante", "anio"):
        need(str(body.get(f, "")).strip(), f"Falta el campo «{f}»")
    d = pick(body, EQ_FIELDS)
    if not d.get("qr_code"):
        n = row(ctx.conn, "SELECT COALESCE(MAX(id),0)+1 n FROM equipos")["n"]
        d["qr_code"] = f"EB-{n:03d}"
    d["qr_code"] = d["qr_code"].strip().upper()
    d["estado"] = d.get("estado") or "activo"
    d["frecuencia_pm_dias"] = int(num(d.get("frecuencia_pm_dias")) or 180)
    for f in ("anio",):
        d[f] = int(num(d[f]) or 0)
    for f in ("corriente_nominal_a", "potencia_max_w"):
        d[f] = num(d.get(f))
    cols = ",".join(d)
    try:
        cur = ctx.conn.execute(f"INSERT INTO equipos({cols}) VALUES({','.join('?' * len(d))})", list(d.values()))
    except Exception as ex:
        raise ApiError(409, "Ya existe un equipo con esa serie o ese código QR") from ex
    core.sync_equipo(ctx.conn, cur.lastrowid)
    return {"id": cur.lastrowid, "qr_code": d["qr_code"]}


@route("GET", r"/api/equipos/(\d+)")
def get_equipo(ctx, body, eid):
    return equipo_completo(ctx.conn, int(eid))


@route("GET", r"/api/equipos/qr/([^/]+)")
def get_equipo_qr(ctx, body, qr):
    e = row(ctx.conn, "SELECT id FROM equipos WHERE lower(qr_code)=lower(?)", (unquote(qr),))
    need(e, "No existe un equipo con ese código", 404)
    return equipo_completo(ctx.conn, e["id"])


@route("PUT", r"/api/equipos/(\d+)", roles=core.ROLES_ESCRITURA)
def update_equipo(ctx, body, eid):
    d = pick(body, [f for f in EQ_FIELDS if f != "estado"])
    for f in ("anio", "frecuencia_pm_dias"):
        if f in d:
            d[f] = int(num(d[f]) or 0)
    for f in ("corriente_nominal_a", "potencia_max_w"):
        if f in d:
            d[f] = num(d[f])
    if "qr_code" in d:
        d["qr_code"] = d["qr_code"].strip().upper()
    if "estado" in body:
        d["manual_fds"] = 1 if body["estado"] == "fuera_de_servicio" else 0
    try:
        ctx.conn.execute(f"UPDATE equipos SET {','.join(k + '=?' for k in d)} WHERE id=?", [*d.values(), eid])
    except Exception as ex:
        raise ApiError(409, "Ya existe un equipo con esa serie o ese código QR") from ex
    core.sync_equipo(ctx.conn, int(eid))
    return {"ok": True}


@route("DELETE", r"/api/equipos/(\d+)", roles=("administrador",))
def delete_equipo(ctx, body, eid):
    ctx.conn.execute("DELETE FROM equipos WHERE id=?", (eid,))
    return {"ok": True}


# --- accesorios
@route("POST", "/api/accesorios", roles=core.ROLES_ESCRITURA)
def create_acc(ctx, body):
    need(body.get("equipo_id") and str(body.get("tipo", "")).strip(), "Faltan datos del accesorio")
    cur = ctx.conn.execute(
        "INSERT INTO accesorios(equipo_id,tipo,descripcion,consumible,stock,stock_minimo,referencia) VALUES(?,?,?,?,?,?,?)",
        (body["equipo_id"], body["tipo"].strip(), body.get("descripcion"), int(bool(body.get("consumible"))),
         int(num(body.get("stock")) or 0), int(num(body.get("stock_minimo")) or 0), body.get("referencia")))
    core.sync_equipo(ctx.conn, int(body["equipo_id"]))
    return {"id": cur.lastrowid}


@route("PUT", r"/api/accesorios/(\d+)", roles=core.ROLES_ESCRITURA)
def update_acc(ctx, body, aid):
    d = pick(body, ["tipo", "descripcion", "consumible", "stock", "stock_minimo", "referencia"])
    for f in ("consumible", "stock", "stock_minimo"):
        if f in d:
            d[f] = int(num(d[f]) or 0)
    ctx.conn.execute(f"UPDATE accesorios SET {','.join(k + '=?' for k in d)} WHERE id=?", [*d.values(), aid])
    a = row(ctx.conn, "SELECT equipo_id FROM accesorios WHERE id=?", (aid,))
    core.sync_equipo(ctx.conn, a["equipo_id"])
    return {"ok": True}


@route("DELETE", r"/api/accesorios/(\d+)", roles=core.ROLES_ESCRITURA)
def delete_acc(ctx, body, aid):
    a = row(ctx.conn, "SELECT equipo_id FROM accesorios WHERE id=?", (aid,))
    ctx.conn.execute("DELETE FROM accesorios WHERE id=?", (aid,))
    if a:
        core.sync_equipo(ctx.conn, a["equipo_id"])
    return {"ok": True}


# --- mantenimientos
MANT_FIELDS = ["tipo", "fecha", "descripcion", "causa", "acciones", "repuestos", "falla", "horas_fuera_servicio",
               "resultado", "proxima_fecha"]


@route("POST", "/api/mantenimientos", roles=core.ROLES_ESCRITURA)
def create_mant(ctx, body):
    need(body.get("equipo_id") and body.get("tipo") in ("preventivo", "correctivo", "predictivo") and body.get("fecha"),
         "Faltan datos del mantenimiento")
    d = pick(body, MANT_FIELDS)
    d["falla"] = int(bool(d.get("falla")) and d["tipo"] == "correctivo")
    d["horas_fuera_servicio"] = max(0.0, num(d.get("horas_fuera_servicio")) or 0.0)
    d["resultado"] = d.get("resultado") or "conforme"
    d["proxima_fecha"] = d.get("proxima_fecha") or None
    cur = ctx.conn.execute(
        f"INSERT INTO mantenimientos(equipo_id,tecnico_id,{','.join(d)}) VALUES(?,?,{','.join('?' * len(d))})",
        [body["equipo_id"], ctx.user["id"], *d.values()])
    core.sync_equipo(ctx.conn, int(body["equipo_id"]))
    return {"id": cur.lastrowid}


@route("PUT", r"/api/mantenimientos/(\d+)", roles=core.ROLES_ESCRITURA)
def update_mant(ctx, body, mid):
    d = pick(body, MANT_FIELDS)
    if "falla" in d:
        d["falla"] = int(bool(d["falla"]))
    if "horas_fuera_servicio" in d:
        d["horas_fuera_servicio"] = max(0.0, num(d["horas_fuera_servicio"]) or 0.0)
    if "proxima_fecha" in d:
        d["proxima_fecha"] = d["proxima_fecha"] or None
    ctx.conn.execute(f"UPDATE mantenimientos SET {','.join(k + '=?' for k in d)} WHERE id=?", [*d.values(), mid])
    m = row(ctx.conn, "SELECT equipo_id FROM mantenimientos WHERE id=?", (mid,))
    core.sync_equipo(ctx.conn, m["equipo_id"])
    return {"ok": True}


@route("DELETE", r"/api/mantenimientos/(\d+)", roles=core.ROLES_ESCRITURA)
def delete_mant(ctx, body, mid):
    m = row(ctx.conn, "SELECT equipo_id FROM mantenimientos WHERE id=?", (mid,))
    ctx.conn.execute("DELETE FROM mantenimientos WHERE id=?", (mid,))
    if m:
        core.sync_equipo(ctx.conn, m["equipo_id"])
    return {"ok": True}


# --- checklists
@route("GET", "/api/plantillas")
def plantillas(ctx, body):
    out = rows(ctx.conn, "SELECT * FROM plantillas_checklist ORDER BY id")
    for p in out:
        p["items"] = json.loads(p.pop("items_json"))
    return out


@route("POST", "/api/checklists", roles=core.ROLES_ESCRITURA)
def create_checklist(ctx, body):
    need(body.get("equipo_id") and body.get("items"), "El checklist no tiene ítems")
    items = check_items(body["items"])
    general = "no_conforme" if any(i["cumple"] == 0 for i in items) else "conforme"
    pl = row(ctx.conn, "SELECT nombre FROM plantillas_checklist WHERE codigo=?", (body.get("plantilla_codigo"),))
    cur = ctx.conn.execute(
        "INSERT INTO checklists(equipo_id,mantenimiento_id,tecnico_id,plantilla_codigo,tipo_checklist,fecha,resultado_general,"
        "observaciones,analisis_tecnico) VALUES(?,?,?,?,?,?,?,?,?)",
        (body["equipo_id"], body.get("mantenimiento_id") or None, ctx.user["id"], body.get("plantilla_codigo"),
         pl["nombre"] if pl else body.get("tipo_checklist", "Checklist"), body.get("fecha") or datetime.now().strftime("%Y-%m-%dT%H:%M"),
         general, body.get("observaciones"), body.get("analisis_tecnico")))
    for it in items:
        ctx.conn.execute(
            "INSERT INTO checklist_items(checklist_id,orden,seccion,item,tipo,valor_medido,valor_esperado,unidad,limite_min,"
            "limite_max,componente,norma,instrumento,si_falla,cumple) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (cur.lastrowid, it["orden"], it.get("seccion"), it["item"], it["tipo"], it["valor_medido"], it.get("valor_esperado"),
             it.get("unidad"), it["limite_min"], it["limite_max"], it.get("componente"), it.get("norma"),
             it.get("instrumento"), it.get("si_falla"), it["cumple"]))
    core.sync_equipo(ctx.conn, int(body["equipo_id"]))
    return {"id": cur.lastrowid, "resultado_general": general}


@route("GET", r"/api/checklists/(\d+)")
def get_checklist(ctx, body, cid):
    c = row(ctx.conn, "SELECT c.*, u.nombre tecnico FROM checklists c LEFT JOIN usuarios u ON u.id=c.tecnico_id WHERE c.id=?", (cid,))
    need(c, "Checklist no encontrado", 404)
    c["items"] = rows(ctx.conn, "SELECT * FROM checklist_items WHERE checklist_id=? ORDER BY orden", (cid,))
    c["evidencias"] = rows(ctx.conn, "SELECT * FROM evidencias WHERE checklist_id=?", (cid,))
    return c


@route("PUT", r"/api/checklists/(\d+)", roles=core.ROLES_ESCRITURA)
def update_checklist(ctx, body, cid):
    d = pick(body, ["observaciones", "analisis_tecnico"])
    if d:
        ctx.conn.execute(f"UPDATE checklists SET {','.join(k + '=?' for k in d)} WHERE id=?", [*d.values(), cid])
    return {"ok": True}


@route("DELETE", r"/api/checklists/(\d+)", roles=core.ROLES_ESCRITURA)
def delete_checklist(ctx, body, cid):
    c = row(ctx.conn, "SELECT equipo_id FROM checklists WHERE id=?", (cid,))
    ctx.conn.execute("DELETE FROM checklists WHERE id=?", (cid,))
    if c:
        core.sync_equipo(ctx.conn, c["equipo_id"])
    return {"ok": True}


@route("GET", "/api/items-medibles")
def items_medibles(ctx, body):
    eid = ctx.q.get("equipo_id")
    return rows(ctx.conn, """SELECT i.item, i.unidad, COUNT(*) n FROM checklist_items i JOIN checklists c ON c.id=i.checklist_id
        WHERE c.equipo_id=? AND i.tipo='num' AND i.valor_medido IS NOT NULL GROUP BY i.item, i.unidad ORDER BY i.item""", (eid,))


@route("GET", "/api/tendencia")
def tendencia(ctx, body):
    pts = rows(ctx.conn, """SELECT c.fecha, c.id checklist_id, i.valor_medido valor, i.limite_min, i.limite_max, i.cumple, i.unidad, i.valor_esperado, i.si_falla, i.norma, i.componente
        FROM checklist_items i JOIN checklists c ON c.id=i.checklist_id
        WHERE c.equipo_id=? AND i.item=? AND i.valor_medido IS NOT NULL ORDER BY c.fecha""", (ctx.q.get("equipo_id"), ctx.q.get("item")))
    for p in pts:
        p["valor"] = num(p["valor"])
    return [p for p in pts if p["valor"] is not None]


# --- evidencias
@route("POST", "/api/evidencias", roles=core.ROLES_ESCRITURA)
def create_evidencia(ctx, body):
    need(body.get("equipo_id") and str(body.get("data_url", "")).startswith("data:"), "Imagen inválida")
    m = re.match(r"data:([\w/+.-]+);base64,(.+)$", body["data_url"], re.S)
    need(m, "Imagen inválida")
    mime, b64 = m.groups()
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}.get(mime)
    need(ext, "Formato de imagen no soportado (use JPG, PNG o WebP)")
    name = f"ev_{uuid.uuid4().hex}.{ext}"
    (core.UPLOADS / name).write_bytes(base64.b64decode(b64))
    cur = ctx.conn.execute(
        "INSERT INTO evidencias(equipo_id,mantenimiento_id,checklist_id,tipo,descripcion,ruta_archivo,autor_id) VALUES(?,?,?,?,?,?,?)",
        (body["equipo_id"], body.get("mantenimiento_id") or None, body.get("checklist_id") or None, "foto",
         body.get("descripcion"), f"/uploads/{name}", ctx.user["id"]))
    return {"id": cur.lastrowid, "ruta_archivo": f"/uploads/{name}"}


@route("DELETE", r"/api/evidencias/(\d+)", roles=core.ROLES_ESCRITURA)
def delete_evidencia(ctx, body, vid):
    e = row(ctx.conn, "SELECT ruta_archivo FROM evidencias WHERE id=?", (vid,))
    if e:
        try:
            (core.UPLOADS / Path(e["ruta_archivo"]).name).unlink()
        except OSError:
            pass
    ctx.conn.execute("DELETE FROM evidencias WHERE id=?", (vid,))
    return {"ok": True}


# --- documentos (manuales) e IA
@route("GET", "/api/documentos")
def list_docs(ctx, body):
    return rows(ctx.conn, """SELECT d.*, e.qr_code equipo_qr, (SELECT COUNT(*) FROM doc_chunks c WHERE c.documento_id=d.id) n_chunks
                             FROM documentacion d LEFT JOIN equipos e ON e.id=d.equipo_id ORDER BY d.origen DESC, d.fecha_carga DESC""")


@route("POST", "/api/documentos", roles=core.ROLES_ESCRITURA)
def create_doc(ctx, body):
    chunks = [c for c in body.get("chunks", []) if str(c.get("texto", "")).strip()]
    need(chunks, "No se pudo extraer texto del documento (¿es un PDF escaneado?)")
    need(str(body.get("nombre", "")).strip(), "Falta el nombre del documento")
    ruta = ""
    if body.get("archivo_b64"):
        fname = f"doc_{uuid.uuid4().hex}_{re.sub(r'[^A-Za-z0-9._-]', '_', body.get('filename', 'archivo'))}"
        (core.UPLOADS / fname).write_bytes(base64.b64decode(body["archivo_b64"]))
        ruta = f"/uploads/{fname}"
    tipo = body.get("tipo") if body.get("tipo") in ("manual", "protocolo", "norma", "otro") else "manual"
    cur = ctx.conn.execute("INSERT INTO documentacion(equipo_id,tipo,nombre,ruta_archivo,origen,paginas) VALUES(?,?,?,?,?,?)",
                           (body.get("equipo_id") or None, tipo, body["nombre"].strip(), ruta or "(solo texto)", "usuario", body.get("paginas")))
    for c in chunks:
        ctx.conn.execute("INSERT INTO doc_chunks(documento_id,seccion,pagina,contenido) VALUES(?,?,?,?)",
                         (cur.lastrowid, c.get("seccion"), c.get("pagina"), c["texto"].strip()))
    return {"id": cur.lastrowid, "fragmentos": len(chunks)}


@route("DELETE", r"/api/documentos/(\d+)", roles=core.ROLES_ESCRITURA)
def delete_doc(ctx, body, did):
    d = row(ctx.conn, "SELECT * FROM documentacion WHERE id=?", (did,))
    need(d, "Documento no encontrado", 404)
    need(d["origen"] != "base", "Los documentos base de la plataforma no se pueden eliminar", 403)
    if d["ruta_archivo"].startswith("/uploads/"):
        try:
            (core.UPLOADS / Path(d["ruta_archivo"]).name).unlink()
        except OSError:
            pass
    ctx.conn.execute("DELETE FROM documentacion WHERE id=?", (did,))
    return {"ok": True}


@route("GET", r"/api/documentos/(\d+)/fragmentos")
def doc_chunks(ctx, body, did):
    return rows(ctx.conn, "SELECT * FROM doc_chunks WHERE documento_id=? ORDER BY id", (did,))


@route("POST", "/api/ia/preguntar")
def ia_preguntar(ctx, body):
    q = str(body.get("pregunta", "")).strip()
    need(len(q) >= 3, "Escriba una pregunta")
    eid = body.get("equipo_id") or None
    res = responder_datos(ctx.conn, q, eid) or rag.responder(get_index(ctx.conn), q, eid)
    res.setdefault("tipo", "documentacion")
    texto = "\n".join(f["texto"] for f in res["fragmentos"]) if res["respondida"] else \
        "No encontré información sobre eso en la documentación cargada."
    fuente = "; ".join(sorted({f["documento"] for f in res["fragmentos"]}))
    ctx.conn.execute("INSERT INTO consultas_ia(usuario_id,equipo_id,pregunta,respuesta,fuente_citada,respondida) VALUES(?,?,?,?,?,?)",
                     (ctx.user["id"], eid, q, texto, fuente or None, int(res["respondida"])))
    return res


@route("GET", "/api/ia/historial")
def ia_historial(ctx, body):
    return rows(ctx.conn, "SELECT * FROM consultas_ia WHERE usuario_id=? ORDER BY id DESC LIMIT 30", (ctx.user["id"],))


@route("GET", "/api/fallas")
def fallas(ctx, body):
    return FALLAS


# --- dashboard, alertas
@route("GET", "/api/dashboard")
def dashboard(ctx, body):
    eqs = rows(ctx.conn, "SELECT * FROM equipos ORDER BY id")
    sel = ctx.q.get("equipo_id")
    scope = [e for e in eqs if not sel or str(e["id"]) == sel]
    ks = []
    for e in scope:
        k = core.kpis(ctx.conn, e["id"])
        ks.append({**k, "qr_code": e["qr_code"], "nombre": e["nombre"], "marca": e["marca"], "modelo": e["modelo"],
                   "estado": e["estado"], "servicio": e["servicio"], "ubicacion": e["ubicacion"]})
    T = sum(k["ventana_horas"] for k in ks) or 1
    down = sum(k["horas_fuera_servicio"] for k in ks)
    fallas_n = sum(k["fallas"] for k in ks)
    mttr_num = 0.0
    for e in scope:
        mttr_num += row(ctx.conn, "SELECT COALESCE(SUM(horas_fuera_servicio),0) s FROM mantenimientos WHERE equipo_id=? AND falla=1 "
                                 "AND fecha>=?", (e["id"], (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")))["s"]
    ids = [e["id"] for e in scope]
    prog = sum(k["pm_programados"] for k in ks)
    cump = sum(k["pm_cumplidos"] for k in ks)
    chk = sum(k["checklists"] for k in ks)
    chk_ok = sum(k["checklists_conformes"] for k in ks)
    marks = ",".join("?" * len(ids)) or "NULL"
    alertas = rows(ctx.conn, f"SELECT a.*, e.qr_code FROM alertas a JOIN equipos e ON e.id=a.equipo_id WHERE a.estado='activa' "
                              f"AND a.equipo_id IN ({marks}) ORDER BY CASE a.severidad WHEN 'crit' THEN 0 ELSE 1 END, a.id DESC", ids)
    recientes = rows(ctx.conn, f"""SELECT m.*, e.qr_code, u.nombre tecnico FROM mantenimientos m JOIN equipos e ON e.id=m.equipo_id
        LEFT JOIN usuarios u ON u.id=m.tecnico_id WHERE m.equipo_id IN ({marks}) ORDER BY m.fecha DESC LIMIT 8""", ids)
    return {
        "resumen": {
            "equipos": len(scope), "disponibilidad": round((T - down) / T * 100, 2),
            "mtbf_h": round((T - down) / fallas_n, 1) if fallas_n else None,
            "mttr_h": round(mttr_num / fallas_n, 1) if fallas_n else None, "fallas": fallas_n,
            "cumplimiento_pm": round(cump / prog * 100, 1) if prog else None,
            "conformidad": round(chk_ok / chk * 100, 1) if chk else None,
            "alertas": len(alertas), "criticas": sum(1 for a in alertas if a["severidad"] == "crit"),
            "estados": {s: sum(1 for e in scope if e["estado"] == s) for s in ("activo", "vencido", "falla", "fuera_de_servicio")},
        },
        "equipos": ks, "alertas": alertas, "recientes": recientes, "serie": core.serie_mensual(ctx.conn, ids),
    }


@route("GET", "/api/alertas")
def alertas(ctx, body):
    return rows(ctx.conn, "SELECT a.*, e.qr_code FROM alertas a JOIN equipos e ON e.id=a.equipo_id WHERE a.estado='activa' "
                          "ORDER BY CASE a.severidad WHEN 'crit' THEN 0 ELSE 1 END, a.id DESC")


# --- cronograma (diagrama de Gantt)
CR_FIELDS = ["fase", "nombre", "inicio", "fin", "avance", "responsable", "hito", "estimada", "notas"]


def cr_clean(body):
    d = pick(body, CR_FIELDS)
    if "avance" in d:
        d["avance"] = int(max(0, min(100, num(d["avance"]) or 0)))
    for f in ("hito", "estimada"):
        if f in d:
            d[f] = int(bool(d[f]))
    if "inicio" in d or "fin" in d:
        need(d.get("inicio") and d.get("fin") and d["inicio"] <= d["fin"], "La fecha de fin no puede ser anterior a la de inicio")
    return d


@route("GET", "/api/cronograma")
def get_cronograma(ctx, body):
    return rows(ctx.conn, "SELECT * FROM cronograma ORDER BY inicio, orden, id")


@route("POST", "/api/cronograma", roles=core.ROLES_ESCRITURA)
def create_cronograma(ctx, body):
    d = cr_clean(body)
    need(str(d.get("nombre", "")).strip() and d.get("fase"), "Falta el nombre o la fase de la tarea")
    d["orden"] = row(ctx.conn, "SELECT COALESCE(MAX(orden),0)+1 n FROM cronograma")["n"]
    cur = ctx.conn.execute(f"INSERT INTO cronograma({','.join(d)}) VALUES({','.join('?' * len(d))})", list(d.values()))
    return {"id": cur.lastrowid}


@route("PUT", r"/api/cronograma/(\d+)", roles=core.ROLES_ESCRITURA)
def update_cronograma(ctx, body, cid):
    cur_row = row(ctx.conn, "SELECT * FROM cronograma WHERE id=?", (cid,))
    need(cur_row, "Tarea no encontrada", 404)
    d = cr_clean({**cur_row, **body})
    ctx.conn.execute(f"UPDATE cronograma SET {','.join(k + '=?' for k in d)} WHERE id=?", [*d.values(), cid])
    return {"ok": True}


@route("DELETE", r"/api/cronograma/(\d+)", roles=core.ROLES_ESCRITURA)
def delete_cronograma(ctx, body, cid):
    ctx.conn.execute("DELETE FROM cronograma WHERE id=?", (cid,))
    return {"ok": True}


# --- administración y exportación
@route("GET", "/api/usuarios", roles=("administrador",))
def list_users(ctx, body):
    return rows(ctx.conn, "SELECT id,nombre,email,rol,fecha_creacion FROM usuarios ORDER BY id")


@route("POST", "/api/usuarios", roles=("administrador",))
def create_user(ctx, body):
    need(all(str(body.get(k, "")).strip() for k in ("nombre", "email", "password")) and len(body["password"]) >= 6,
         "Nombre, correo y una contraseña de al menos 6 caracteres son obligatorios")
    need(body.get("rol") in ("tecnico", "ingeniero", "administrador", "docente", "estudiante"), "Rol inválido")
    try:
        cur = ctx.conn.execute("INSERT INTO usuarios(nombre,email,password_hash,rol) VALUES(?,?,?,?)",
                               (body["nombre"].strip(), body["email"].strip().lower(), core.hash_password(body["password"]), body["rol"]))
    except Exception as ex:
        raise ApiError(409, "Ya existe un usuario con ese correo") from ex
    return {"id": cur.lastrowid}


@route("DELETE", r"/api/usuarios/(\d+)", roles=("administrador",))
def delete_user(ctx, body, uid):
    need(int(uid) != ctx.user["id"], "No puede eliminar su propio usuario")
    ctx.conn.execute("DELETE FROM usuarios WHERE id=?", (uid,))
    return {"ok": True}


@route("POST", "/api/demo/purge", roles=("administrador",))
def purge_demo(ctx, body):
    c = ctx.conn
    for t in ("mantenimientos", "checklists", "accesorios"):
        c.execute(f"DELETE FROM {t} WHERE es_demo=1")
    c.execute("DELETE FROM equipos WHERE es_demo=1")
    core.sync_all(c)
    return {"ok": True}


@route("GET", "/api/export/(sql|json|csv)")
def export(ctx, body, fmt):
    if fmt == "sql":
        return ("raw", "application/sql", sql_dump(ctx.conn).encode("utf-8"), "sist_eb.sql")
    tablas = ["equipos", "accesorios", "mantenimientos", "checklists", "checklist_items", "evidencias", "documentacion", "alertas", "consultas_ia"]
    if fmt == "json":
        data = {t: rows(ctx.conn, f"SELECT * FROM {t}") for t in tablas}
        return ("raw", "application/json", json.dumps(data, ensure_ascii=False, indent=1).encode("utf-8"), "sist_eb.json")
    t = ctx.q.get("tabla", "mantenimientos")
    need(t in tablas, "Tabla inválida")
    data = rows(ctx.conn, f"SELECT * FROM {t}")
    buf = io.StringIO()
    if data:
        w = csv.DictWriter(buf, fieldnames=list(data[0]))
        w.writeheader()
        w.writerows(data)
    return ("raw", "text/csv; charset=utf-8", ("﻿" + buf.getvalue()).encode("utf-8"), f"{t}.csv")


# ------------------------------------------------------------------ HTTP
class Ctx:
    pass


class Handler(BaseHTTPRequestHandler):
    server_version = "SIST-EB/2.0"

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            sys.stderr.write("  %s %s\n" % (self.address_string(), fmt % args))

    def send_json(self, status, obj):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def send_file(self, path, download=None):
        try:
            data = path.read_bytes()
        except OSError:
            return self.send_json(404, {"error": "No encontrado"})
        ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        if path.suffix in (".md", ".js", ".css", ".html", ".json"):
            ctype += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def static(self, p):
        if p in ("", "/"):
            p = "/index.html"
        base, rel = WEB, p.lstrip("/")
        if p.startswith("/uploads/"):
            base, rel = core.UPLOADS, p[len("/uploads/"):]
        elif p.startswith("/docs/"):
            base, rel = core.ROOT / "docs", p[len("/docs/"):]
        elif p.startswith("/db/"):
            base, rel = core.ROOT / "db", p[len("/db/"):]
        target = (base / rel).resolve()
        if base.resolve() not in target.parents and target != base.resolve() or not target.is_file():
            return self.send_json(404, {"error": "No encontrado"})
        if p.startswith("/docs/") and target.suffix not in (".md", ".png", ".jpg", ".html"):
            return self.send_json(404, {"error": "No encontrado"})
        self.send_file(target)

    def handle_any(self, method):
        url = urlparse(self.path)
        path = url.path
        if not path.startswith("/api/"):
            if method != "GET":
                return self.send_json(405, {"error": "Método no permitido"})
            return self.static(path)
        conn = connect()
        try:
            body = {}
            n = int(self.headers.get("Content-Length") or 0)
            if n:
                try:
                    body = json.loads(self.rfile.read(n).decode("utf-8"))
                except ValueError:
                    return self.send_json(400, {"error": "JSON inválido"})
            for m, rx, fn, auth, roles in ROUTES:
                mt = rx.match(path)
                if m != method or not mt:
                    continue
                ctx = Ctx()
                ctx.conn, ctx.q = conn, {k: v[0] for k, v in parse_qs(url.query).items()}
                ctx.user, ctx.token = None, None
                if auth:
                    hdr = self.headers.get("Authorization", "")
                    ctx.token = hdr[7:] if hdr.startswith("Bearer ") else None
                    s = row(conn, "SELECT u.* FROM sesiones s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token=? AND s.expira>?",
                            (ctx.token, datetime.now().isoformat())) if ctx.token else None
                    if not s:
                        return self.send_json(401, {"error": "Sesión no válida. Inicie sesión."})
                    ctx.user = s
                    if roles and s["rol"] not in roles:
                        return self.send_json(403, {"error": "Su rol no tiene permiso para esta acción."})
                try:
                    out = fn(ctx, body, *mt.groups())
                    conn.commit()
                except ApiError as ex:
                    conn.rollback()
                    return self.send_json(ex.status, {"error": ex.msg})
                if isinstance(out, tuple) and out[0] == "raw":
                    _, ctype, data, fname = out
                    self.send_response(200)
                    self.send_header("Content-Type", ctype)
                    self.send_header("Content-Disposition", f'attachment; filename="{fname}"')
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    return self.wfile.write(data)
                return self.send_json(200, out)
            self.send_json(404, {"error": "Ruta no encontrada"})
        except Exception as ex:  # noqa: BLE001
            import traceback
            traceback.print_exc()
            self.send_json(500, {"error": f"Error interno: {ex}"})
        finally:
            conn.close()

    def do_GET(self):
        self.handle_any("GET")

    def do_POST(self):
        self.handle_any("POST")

    def do_PUT(self):
        self.handle_any("PUT")

    def do_DELETE(self):
        self.handle_any("DELETE")


def main():
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding="utf-8", errors="replace")  # consolas de Windows
        except Exception:
            pass
    ap = argparse.ArgumentParser(description="Servidor SIST-EB")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--host", default="0.0.0.0")
    a = ap.parse_args()
    STATE["port"] = a.port
    core.init_db().close()
    ip = core.lan_ip()
    print("\n  SIST-EB — Plataforma de Gestión del Electrobisturí")
    print(f"  ► En este equipo : http://localhost:{a.port}")
    print(f"  ► Desde el celular (misma red Wi-Fi): http://{ip}:{a.port}")
    print("  Usuario demo: camila.rojas@sist-eb.local · clave: sisteb2026")
    print("  (Ctrl+C para detener)\n")
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n  Servidor detenido.")


if __name__ == "__main__":
    main()
