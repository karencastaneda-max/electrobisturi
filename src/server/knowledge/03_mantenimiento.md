# Gestión del mantenimiento del electrobisturí
> Documento base de la plataforma SIST-EB, redactado con apoyo de IA. La periodicidad y las tareas finales deben definirse según el manual del fabricante y el protocolo institucional.

## ¿Qué mantenimiento requiere un electrobisturí?
Mantenimiento preventivo periódico (la frecuencia habitual es semestral o anual, la define el fabricante y el programa institucional) con: inspección visual del equipo y accesorios, limpieza, verificación de cables, conectores y pedal, pruebas de seguridad eléctrica (resistencia de tierra y corrientes de fuga), medición de la potencia de salida con un analizador de electrobisturí, verificación del monitor REM y de las alarmas, y registro de resultados. Mantenimiento correctivo cuando hay una falla. Mantenimiento predictivo con el análisis de la tendencia de las mediciones (corrientes de fuga, desviación de la potencia).

## ¿Qué es el mantenimiento preventivo?
Son las intervenciones programadas en el tiempo para reducir la probabilidad de falla: inspección, limpieza, ajuste, pruebas de seguridad y desempeño, cambio de piezas de desgaste. Se registra con fecha, responsable, resultado y la fecha del próximo mantenimiento.

## ¿Qué es el mantenimiento correctivo?
Es la intervención que se realiza después de una falla para restablecer el funcionamiento del equipo. Se registra la falla, la causa, las acciones, los repuestos y las horas que el equipo estuvo fuera de servicio, porque con esos datos se calculan el MTTR, el MTBF y la disponibilidad.

## ¿Qué es el mantenimiento predictivo?
Es el mantenimiento basado en la condición: se miden variables del equipo (corrientes de fuga, resistencia de tierra, desviación de la potencia de salida) y se analiza su tendencia en el tiempo para intervenir antes de que ocurra la falla. En SIST-EB la pantalla de Resultados grafica la tendencia de cada medición contra sus límites.

## ¿Qué es el MTBF?
MTBF (tiempo medio entre fallas) mide la confiabilidad: es el tiempo operativo dividido entre el número de fallas. En SIST-EB se calcula como (horas del periodo - horas fuera de servicio) / número de fallas, usando como periodo los últimos 12 meses o el tiempo desde el registro del equipo si es menor. Un MTBF alto indica un equipo más confiable.

## ¿Qué es el MTTR?
MTTR (tiempo medio de reparación) mide la mantenibilidad: es el promedio de horas fuera de servicio por cada falla. En SIST-EB se calcula como la suma de horas fuera de servicio de los eventos de falla dividida entre el número de fallas. Un MTTR bajo indica una reparación rápida.

## ¿Qué es la disponibilidad?
La disponibilidad es el porcentaje del tiempo en que el equipo estuvo en condición de ser usado: (horas del periodo - horas fuera de servicio) / horas del periodo x 100. También puede calcularse con la relación MTBF / (MTBF + MTTR). En SIST-EB las horas fuera de servicio incluyen las correctivas y las preventivas.

## ¿Qué es el cumplimiento del mantenimiento preventivo?
Es el porcentaje de mantenimientos preventivos ejecutados dentro de la fecha programada (con tolerancia de 7 días) sobre el total de los programados. Un preventivo vencido que no se ha realizado cuenta como no cumplido.

## ¿Cómo se define la próxima fecha de mantenimiento preventivo?
Al registrar un preventivo, la plataforma sugiere la fecha del siguiente sumando la frecuencia configurada en el equipo (por defecto 180 días). Si la fecha programada ya pasó sin que se registre un preventivo, el equipo pasa al estado vencido y se genera una alerta.

## ¿Qué pruebas funcionales se registran en SIST-EB?
Las pruebas funcionales se registran con los checklists medibles: inspección visual y accesorios, seguridad eléctrica, potencia de salida con analizador y alarmas con monitor REM. Cada ítem guarda el valor medido, el valor esperado, los límites y si cumple. Los resultados no los inventa la plataforma: los ingresa el técnico con los instrumentos de medición.
