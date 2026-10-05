# Seguridad eléctrica, pruebas e instrumentos
> Documento base de la plataforma SIST-EB, redactado con apoyo de IA. Los límites corresponden a la IEC 60601-1 (ed. 3.x); confirme la clasificación del equipo (B, BF, CF) y el protocolo institucional.

## ¿Qué significa que el equipo consuma más corriente que la especificada por el fabricante?
Indica que el equipo está tomando de la red más corriente de la que el fabricante declara en su placa o manual. Posibles causas: componente degradado en la fuente de alimentación o en la etapa de potencia, cortocircuito parcial o fuga a tierra, ventilador o filtro obstruidos que obligan a trabajar más, carga conectada fuera de especificación, o tensión de red incorrecta. Riesgos: sobrecalentamiento, falla de fusibles o protecciones, riesgo de incendio y pérdida del desempeño. Acción: repetir la medición con la tensión y el modo correctos, revisar visualmente el equipo, comparar con mediciones anteriores y, si se confirma, retirar el equipo de servicio y generar un mantenimiento correctivo.

## ¿Qué límites de corriente de fuga define la IEC 60601-1?
Corriente de fuga a tierra: 5 mA en condición normal y 10 mA con una falla única (como el conductor de tierra abierto). Corriente de contacto (de la envolvente): 100 µA en condición normal y 500 µA con falla única. Corriente de fuga de paciente para partes aplicables tipo B y BF: 100 µA en condición normal y 500 µA con falla única; para tipo CF: 10 µA en condición normal y 50 µA con falla única.

## ¿Qué es la resistencia de tierra de protección y cuál es su límite?
Es la resistencia entre el contacto de tierra del enchufe y las partes metálicas accesibles conectadas a tierra. Debe ser baja para que, ante una falla de aislamiento, la corriente derive a tierra y actúen las protecciones. El valor de referencia que se usa en las pruebas es 0,2 ohmios o menos para equipos con cable de alimentación desmontable (incluye el cable); confirme el valor aplicable en la edición vigente de la norma y en el protocolo institucional.

## ¿Cómo se prueba la potencia de salida del electrobisturí?
Se conecta el electrodo activo y la placa de retorno a un analizador de electrobisturí, que presenta una carga resistiva conocida (por ejemplo 500 ohmios) y mide la potencia, la corriente y la tensión de alta frecuencia. Se ajusta una potencia en cada modo (corte, coagulación, bipolar), se activa el equipo con el pedal o el lápiz y se compara la potencia medida con la potencia ajustada. La desviación máxima admisible debe tomarse del manual del fabricante; SIST-EB usa por defecto un criterio de más o menos 20 % que debe reemplazarse por el valor del manual. Para caracterizar el equipo también se puede variar la resistencia de carga.

## ¿Cómo se prueba el monitor del electrodo de retorno (REM) y las alarmas?
Con el equipo encendido y una placa de retorno conectada y con contacto correcto, la alarma no debe estar activa. Al desconectar el cable de la placa, o al simular alta impedancia de contacto con el adaptador de prueba del analizador o la placa de prueba del fabricante, el equipo debe emitir una alarma audible y visual e inhibir la salida de potencia. También se verifica el tono audible de activación de cada modo, el funcionamiento del pedal y el autotest de encendido sin errores.

## ¿Qué instrumento necesito para las pruebas del electrobisturí?
Analizador de electrobisturí (ESU analyzer) para la potencia de salida, la corriente de fuga de alta frecuencia y las pruebas de alarma del REM; analizador de seguridad eléctrica para la resistencia de tierra, las corrientes de fuga y la medición de la corriente consumida; multímetro para verificaciones básicas de continuidad y tensión de red; pinza amperimétrica si no hay analizador de seguridad eléctrica; y herramientas de limpieza e inspección visual. Los instrumentos deben contar con certificado de calibración vigente.

## ¿Qué instrumento mide la corriente de consumo del equipo?
La corriente de consumo se mide con un analizador de seguridad eléctrica que incluya medición de corriente de carga, o con una pinza amperimétrica de bajo rango en el conductor de fase. Se compara con la corriente nominal que el fabricante indica en la placa del equipo.

## ¿Con qué frecuencia deben calibrarse los instrumentos de medición?
La calibración de los instrumentos es anual o según indique el fabricante del instrumento y el sistema de calidad institucional. Los certificados de calibración deben conservarse y deben ser trazables a patrones nacionales.

## ¿Qué es la corriente de fuga de alta frecuencia?
Es la corriente de alta frecuencia que circula hacia tierra o hacia otras partes por capacitancias parásitas del generador, los cables y el paciente. Una fuga excesiva puede causar quemaduras en sitios alternos y interferencia. Se mide con un analizador de electrobisturí y se compara con el límite de la IEC 60601-2-2 y el manual del fabricante.

## ¿Qué relación hay entre voltaje, corriente, potencia y carga en una prueba de potencia?
Con una carga resistiva R y una potencia P, la tensión eficaz es V = raíz(P x R) y la corriente eficaz I = raíz(P / R). Por ejemplo, 50 W sobre 500 ohmios corresponden a unos 158 V eficaces y 0,32 A. SIST-EB incluye esta calculadora en la sección del Gemelo digital.
