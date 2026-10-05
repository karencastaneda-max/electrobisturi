"""Plantillas de checklist del electrobisturí.

Cada ítem define el criterio de aceptación, pero NUNCA el valor medido: ese valor
lo ingresa el técnico con su instrumento. Los límites marcados como "por defecto"
deben reemplazarse por los del manual del fabricante cuando se disponga de él.
"""

TOL_POTENCIA = 0.20  # criterio por defecto ±20 % (reemplazar por el del manual)


def b(seccion, item, componente, si_falla, norma=None):
    return {"seccion": seccion, "item": item, "tipo": "bool", "componente": componente,
            "norma": norma, "si_falla": si_falla}


def n(seccion, item, unidad, componente, si_falla, norma=None, instrumento=None,
      min=None, max=None, esperado=None, max_ref=None):
    return {"seccion": seccion, "item": item, "tipo": "num", "unidad": unidad,
            "componente": componente, "norma": norma, "instrumento": instrumento,
            "min": min, "max": max, "esperado": esperado, "max_ref": max_ref,
            "si_falla": si_falla}


def potencia(item, setpoint, carga, comp, nota):
    return n("Potencia de salida", f"{item} — ajuste {setpoint} W sobre {carga} Ω", "W", comp,
             nota, "IEC 60601-2-2", "Analizador de electrobisturí",
             min=round(setpoint * (1 - TOL_POTENCIA), 1), max=round(setpoint * (1 + TOL_POTENCIA), 1),
             esperado=f"{setpoint} W ±{int(TOL_POTENCIA * 100)} %")


PLANTILLAS = [
    {
        "codigo": "inspeccion_visual",
        "nombre": "Inspección visual y accesorios",
        "descripcion": "Estado físico del generador, cables, conectores, pedal y accesorios.",
        "items": [
            b("Generador", "Carcasa sin golpes, fisuras ni derrame de líquidos", "generador",
              "Daño estructural o ingreso de líquidos: riesgo eléctrico; suspender uso y revisar internamente."),
            b("Generador", "Pantalla, perillas y teclas íntegras y legibles", "panel",
              "Panel dañado: riesgo de ajuste erróneo de potencia; reparar o reemplazar el panel."),
            b("Generador", "Etiquetas de seguridad y placa de datos legibles", "generador",
              "Reponer etiquetas; sin placa de datos no se puede verificar la corriente nominal."),
            b("Generador", "Ventilación libre de obstrucciones y polvo", "generador",
              "Sobrecalentamiento: limpiar rejillas y filtros."),
            b("Alimentación", "Cable de alimentación y enchufe sin daños", "alimentacion",
              "Cable dañado: reemplazar antes de cualquier otra prueba.", "IEC 60601-1"),
            b("Accesorios", "Cable del electrodo activo y lápiz sin cortes ni aislamiento dañado", "electrodo_activo",
              "Aislamiento dañado: riesgo de quemadura; reemplazar el accesorio."),
            b("Accesorios", "Conector de placa de retorno y cable sin desgaste", "placa_retorno",
              "Conector desgastado: falsos contactos y alarma REM; reemplazar el cable."),
            b("Accesorios", "Pedal (footswitch) íntegro, sin golpes ni humedad", "pedal",
              "Pedal dañado: activaciones no deseadas o falta de activación; reemplazar."),
            b("Accesorios", "Pinza bipolar y cable en buen estado", "bipolar",
              "Reemplazar pinza o cable bipolar defectuoso."),
            b("Accesorios", "Placas de retorno disponibles y dentro de fecha de vencimiento", "placa_retorno",
              "Reponer placas de retorno antes de la siguiente cirugía."),
        ],
    },
    {
        "codigo": "seguridad_electrica",
        "nombre": "Seguridad eléctrica (IEC 60601-1)",
        "descripcion": "Resistencia de tierra, corrientes de fuga y consumo de corriente.",
        "items": [
            n("Seguridad eléctrica", "Resistencia de tierra de protección", "Ω", "alimentacion",
              "Resistencia alta: la derivación a tierra no es confiable; revisar cable, enchufe y conexión interna de tierra.",
              "IEC 60601-1 (ref. 0,2 Ω con cable desmontable)", "Analizador de seguridad eléctrica",
              max=0.2, esperado="≤ 0,2 Ω"),
            n("Seguridad eléctrica", "Corriente de fuga a tierra (condición normal)", "µA", "alimentacion",
              "Fuga elevada: deterioro del aislamiento, humedad o filtro de red dañado.",
              "IEC 60601-1 (5 mA = 5000 µA)", "Analizador de seguridad eléctrica",
              max=5000, esperado="≤ 5000 µA"),
            n("Seguridad eléctrica", "Corriente de fuga a tierra (tierra abierta, falla única)", "µA", "alimentacion",
              "Fuga elevada con una falla: no cumple condición de falla única; retirar de servicio.",
              "IEC 60601-1 (10 mA = 10000 µA)", "Analizador de seguridad eléctrica",
              max=10000, esperado="≤ 10000 µA"),
            n("Seguridad eléctrica", "Corriente de contacto de la envolvente (condición normal)", "µA", "generador",
              "Corriente de contacto alta: riesgo para el usuario; revisar aislamiento y puesta a tierra de la carcasa.",
              "IEC 60601-1", "Analizador de seguridad eléctrica", max=100, esperado="≤ 100 µA"),
            n("Seguridad eléctrica", "Corriente de fuga de paciente, parte aplicada CF (condición normal)", "µA", "placa_retorno",
              "Fuga de paciente alta: riesgo de microshock; verificar clasificación (B/BF/CF) y aislamiento de la parte aplicada.",
              "IEC 60601-1 (CF: 10 µA)", "Analizador de seguridad eléctrica", max=10, esperado="≤ 10 µA (tipo CF)"),
            n("Seguridad eléctrica", "Corriente de fuga de paciente, parte aplicada CF (falla única)", "µA", "placa_retorno",
              "Fuga de paciente alta con falla única: retirar de servicio.",
              "IEC 60601-1 (CF: 50 µA)", "Analizador de seguridad eléctrica", max=50, esperado="≤ 50 µA (tipo CF)"),
            n("Consumo", "Corriente de consumo en reposo vs. corriente nominal del equipo", "A", "generador",
              "Consumo superior al especificado: revisar fuente, etapa de potencia, ventilación y tensión de red; comparar con mediciones previas.",
              "Placa de datos / manual del fabricante", "Analizador de seguridad eléctrica o pinza amperimétrica",
              max=None, max_ref="corriente_nominal_a", esperado="≤ corriente nominal (placa)"),
        ],
    },
    {
        "codigo": "potencia_salida",
        "nombre": "Prueba funcional de potencia de salida",
        "descripcion": "Potencia entregada vs. ajustada en cada modo, medida con analizador de electrobisturí.",
        "items": [
            potencia("Corte monopolar", 50, 500, "generador",
                     "Potencia fuera de tolerancia: repetir con carga y cable correctos; si persiste, ajuste o reparación."),
            potencia("Coagulación monopolar", 40, 500, "generador",
                     "Potencia fuera de tolerancia: repetir con carga y cable correctos; si persiste, ajuste o reparación."),
            potencia("Corte monopolar (alta potencia)", 100, 500, "generador",
                     "Potencia fuera de tolerancia en el rango alto: posible degradación de la etapa de potencia."),
            potencia("Bipolar", 30, 100, "bipolar",
                     "Potencia bipolar fuera de tolerancia: revisar cable bipolar y salida bipolar."),
            n("Fuga de alta frecuencia", "Corriente de fuga de alta frecuencia (registrar)", "mA", "generador",
              "Compare con el límite de la IEC 60601-2-2 y el manual; fuga alta puede causar quemaduras alternas.",
              "IEC 60601-2-2", "Analizador de electrobisturí"),
        ],
    },
    {
        "codigo": "alarmas",
        "nombre": "Alarmas y seguridad funcional",
        "descripcion": "Monitor REM, indicadores, pedal, inhibición de salida y autotest.",
        "items": [
            b("Autotest", "Autotest de encendido sin códigos de error", "generador",
              "Error de autotest: anotar el código, consultar el manual de servicio y no usar el equipo."),
            b("Monitor REM", "Sin alarma REM con placa de retorno correctamente conectada", "rem",
              "Alarma con placa correcta: posible falla del circuito REM; no usar el equipo."),
            b("Monitor REM", "Alarma REM audible y visual al desconectar el cable de la placa", "rem",
              "Sin alarma REM: riesgo de quemadura; retirar de servicio.", "IEC 60601-2-2"),
            b("Monitor REM", "Alarma REM ante alta impedancia simulada (adaptador de prueba)", "rem",
              "El REM no detecta mal contacto: retirar de servicio.", "IEC 60601-2-2"),
            b("Salida", "La salida de potencia se inhibe mientras la alarma REM está activa", "rem",
              "La salida no se inhibe: falla crítica de seguridad.", "IEC 60601-2-2"),
            b("Indicadores", "Tono audible de activación diferenciado para corte y coagulación", "panel",
              "Revisar el altavoz o el indicador sonoro."),
            b("Pedal", "El pedal activa el modo correcto (corte / coagulación / bipolar)", "pedal",
              "Pedal con modo cruzado o sin activación: reemplazar o reparar el pedal."),
            b("Panel", "Los ajustes de potencia responden y se visualizan correctamente", "panel",
              "Falla del panel de control: reparación o reemplazo."),
        ],
    },
]
