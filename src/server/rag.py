"""Asistente técnico con RAG (recuperación + respuesta extractiva).

El asistente NO genera texto libre: recupera fragmentos de la documentación
incorporada (base de conocimiento + manuales cargados) con BM25 y responde
únicamente con ellos, citando documento y sección/página. Si no hay evidencia
suficiente, lo dice. Además responde preguntas sobre los datos del equipo
(hoja de vida) consultando directamente la base de datos.
"""
import math
import re
import unicodedata

STOP = set("""a al algo ante asi aun aunque como con contra cual cuales cuando cuanto cuantos de del desde donde dos e el ella ellas ellos en entre es esa esas ese eso esos esta estan estar este esto estos fue ha han hace hacer hay la las le les lo los mas me mi mis muy ni no nos o para pero por porque que quien se si sin sobre su sus te tiene tienen tu un una uno unos y ya yo""".split())
# Palabras de la pregunta que no aportan al tema técnico
STOP |= set("necesito necesita debo debe puedo puede pueden quiero significa significan significar sirve sirven hago hacer usar usa usan uso tipo equipo equipos plataforma sistema".split())

SINONIMOS = {
    "consumo": ["corriente", "consume", "consumir"],
    "consuma": ["corriente", "consumo"],
    "consume": ["corriente", "consumo"],
    "corriente": ["fuga", "consumo"],
    "instrumento": ["analizador", "multimetro", "medicion", "calibracion"],
    "instrumentos": ["analizador", "multimetro", "medicion"],
    "herramienta": ["instrumento", "analizador", "multimetro"],
    "medir": ["analizador", "medicion", "prueba"],
    "norma": ["iec", "iso", "normativa"],
    "normas": ["iec", "iso", "normativa"],
    "reglamento": ["decreto", "resolucion", "normativa"],
    "falla": ["fallas", "error", "dano", "averia"],
    "averia": ["falla"],
    "dano": ["falla"],
    "revision": ["mantenimiento", "inspeccion"],
    "revisar": ["mantenimiento", "inspeccion"],
    "calibrar": ["calibracion", "ajuste"],
    "neutro": ["placa", "retorno"],
    "neutra": ["placa", "retorno"],
    "placa": ["retorno", "rem"],
    "lapiz": ["electrodo", "activo"],
    "pedal": ["footswitch", "activacion"],
    "qr": ["codigo", "etiqueta"],
    "indicador": ["mtbf", "mttr", "disponibilidad"],
    "indicadores": ["mtbf", "mttr", "disponibilidad"],
    "seguridad": ["electrica", "fuga"],
    "potencia": ["salida", "vatios"],
    "bisturi": ["electrobisturi"],
    "electrobisturi": ["electrobisturi"],
    "esu": ["electrobisturi", "electroquirurgico"],
    "mantenimiento": ["preventivo", "correctivo", "predictivo"],
}


def fold(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def stem(w):
    for suf in ("mente", "ciones", "cion", "es", "s"):
        if w.endswith(suf) and len(w) - len(suf) >= 4:
            return w[: -len(suf)]
    return w


def tokens(text, keep_stop=False):
    out = []
    for w in re.findall(r"[a-z0-9]+", fold(text)):
        if not keep_stop and (w in STOP or len(w) < 2):
            continue
        out.append(stem(w))
    return out


def expand(query_tokens, raw_words):
    extra = []
    for w in raw_words:
        for syn in SINONIMOS.get(w, []):
            extra.append(stem(syn))
    return query_tokens, extra


class Index:
    def __init__(self, rows):
        # rows: dict(id, documento, tipo, seccion, pagina, contenido, equipo_id)
        self.docs = []
        self.df = {}
        for r in rows:
            toks = tokens((r["seccion"] or "") + " " + (r["seccion"] or "") + " " + r["contenido"])
            tf = {}
            for t in toks:
                tf[t] = tf.get(t, 0) + 1
            self.docs.append({"row": r, "tf": tf, "len": max(1, len(toks))})
            for t in tf:
                self.df[t] = self.df.get(t, 0) + 1
        self.N = max(1, len(self.docs))
        self.avg = sum(d["len"] for d in self.docs) / self.N if self.docs else 1

    def search(self, query, equipo_id=None, k=3):
        raw_words = re.findall(r"[a-z0-9]+", fold(query))
        qt = tokens(query)
        if not qt:
            return [], 0.0
        _, extra = expand(qt, raw_words)
        weights = {}
        for t in qt:
            weights[t] = 1.0
        for t in extra:
            weights.setdefault(t, 0.45)
        k1, b = 1.4, 0.75
        scored = []
        for d in self.docs:
            eq = d["row"]["equipo_id"]
            if eq is not None and equipo_id is not None and eq != equipo_id:
                continue
            s, hit = 0.0, set()
            for t, wq in weights.items():
                f = d["tf"].get(t)
                if not f:
                    continue
                idf = math.log(1 + (self.N - self.df[t] + 0.5) / (self.df[t] + 0.5))
                s += wq * idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d["len"] / self.avg))
                if t in qt:
                    hit.add(t)
            if s > 0:
                cover = len(hit) / len(set(qt))
                scored.append((s, cover, d["row"]))
        scored.sort(key=lambda x: -x[0])
        top = scored[:k]
        return top, (top[0][1] if top else 0.0)


def pick_sentences(text, query, max_chars=720):
    """Si el fragmento es largo, deja las frases más relacionadas con la pregunta, en su orden."""
    if len(text) <= max_chars:
        return text
    sents = re.split(r"(?<=[.!?])\s+", text)
    qt = set(tokens(query))
    scored = []
    for i, s in enumerate(sents):
        st = set(tokens(s))
        scored.append((len(st & qt) / (1 + 0.05 * len(st)), i, s))
    keep, size = [], 0
    for sc, i, s in sorted(scored, key=lambda x: -x[0]):
        if size + len(s) > max_chars and keep:
            continue
        keep.append((i, s))
        size += len(s)
    keep.sort()
    return " ".join(s for _, s in keep)


OTROS_EQUIPOS = re.compile(r"\b(ventilador|incubadora|autoclave|capnografo|capnografia|fototerapia|calentador radiante|"
                           r"desfibrilador|bomba de infusion|monitor(?! (de )?(rem|retorno|electrodo|contacto)))\b")


def responder(index, pregunta, equipo_id=None):
    """Devuelve {respondida, fragmentos:[{texto, documento, seccion, pagina, score}]}"""
    if OTROS_EQUIPOS.search(fold(pregunta)):
        # La documentación incorporada es del electrobisturí: no se extrapola a otros equipos.
        return {"respondida": False, "fragmentos": [], "otro_equipo": True}
    top, cover = index.search(pregunta, equipo_id)
    if not top:
        return {"respondida": False, "fragmentos": []}
    best, best_cover = top[0][0], top[0][1]
    # Umbral: evita responder con material poco relacionado
    if best < 2.6 or best_cover < 0.34:
        return {"respondida": False, "fragmentos": [], "mejor_score": round(best, 2)}
    frags = []
    for s, cv, r in top:
        if s < best * 0.7 or cv < 0.34:
            continue
        frags.append({
            "texto": pick_sentences(r["contenido"], pregunta),
            "documento": r["documento"], "tipo": r["tipo"], "seccion": r["seccion"],
            "pagina": r["pagina"], "score": round(s, 2), "doc_id": r["documento_id"],
        })
    # Si el mejor fragmento ya es muy superior, se responde con ese solo
    if len(frags) > 1 and frags[0]["score"] > frags[1]["score"] * 1.6:
        frags = frags[:1]
    return {"respondida": True, "fragmentos": frags, "mejor_score": round(best, 2)}
