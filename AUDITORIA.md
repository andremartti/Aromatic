# Auditoría del sistema — resultados

La auditoría no es una revisión visual: el script `generador/validar_sistema.py` inyecta un juego
de datos de prueba, **recalcula el libro completo con el motor de cálculo de LibreOffice** y
compara cada resultado contra el valor calculado a mano.

**Resultado de la última corrida: 180 pruebas · 180 correctas · 0 fallidas · 0 errores de Excel.**

```bash
python3 generador/construir_sistema.py && python3 generador/validar_sistema.py
```

## Flujo completo probado

`producto → costo → compra → inventario → venta → utilidad → gasto → caja → rentabilidad →
metas → equilibrio → escenarios → dashboard`

Datos del escenario de prueba: 2 compras (una pagada, una a crédito sin proveedor), 4 ventas
(una cobrada, una a crédito sin inventario, una anulada, una en el mes siguiente), 3 gastos
(fijo, variable sin categoría, publicidad), 1 aporte de capital, metas del primer mes.

| Bloque | Pruebas | Qué verifica |
|---|---|---|
| COSTOS | 4 | Costo real unitario, costo variable de venta, costo variable total, PENDIENTE |
| PRODUCTOS | 16 | Utilidad, margen, markup, margen de contribución, los 6 estados de datos, precio de catálogo intacto |
| COMPRAS | 8 | ID automático, costo total de adquisición, costo unitario real, saldo por pagar, alertas |
| INVENTARIO | 16 | Compras − ventas, costo promedio ponderado, costo estándar, valorización, los 4 estados |
| VENTAS | 14 | Precio y costo automáticos, venta bruta/neta, utilidad, margen, anulación, cuentas por cobrar |
| GASTOS | 3 | ID, saldo por pagar, detección de gasto sin categoría |
| RENTABILIDAD | 37 | Estado de resultados de 2 meses, acumulados, por producto/categoría/canal, ROI, ROAS |
| CAJA | 16 | Entradas, salidas, arrastre de saldo entre meses, utilidad ≠ flujo, CxC y CxP al cierre |
| CLIENTES / PROVEEDORES | 7 | Primera y última compra, acumulados, saldos |
| EQUILIBRIO | 13 | Modo automático y manual, punto de equilibrio, margen de seguridad, simulador, sensibilidad |
| ESCENARIOS | 9 | Escenario base automático y escenarios vacíos en PENDIENTE |
| METAS | 5 | Cumplimiento, diferencia, venta diaria requerida, mes sin meta |
| CONTROL | 10 | Que los 32 chequeos cuenten exactamente los casos sembrados |
| DASHBOARD | 12 | Que cada KPI y el ranking lean el mes correcto |
| Filas vacías | 9 | Que 1.500+ filas en blanco no generen ID, alertas ni basura |
| Errores de Excel | 1 | Barrido de las 17 hojas buscando `#DIV/0!`, `#N/A`, `#VALUE!`, `#REF!`, `#NAME?`, `#NUM!` |

## Casos extremos verificados

| Caso | Comportamiento comprobado |
|---|---|
| Producto sin precio | `PENDIENTE` en utilidad/margen/markup; estado `FALTA PRECIO`; CONTROL lo cuenta |
| Producto sin costo | `PENDIENTE`; estado `FALTA COSTO`; inventario sin valorizar |
| Producto sin precio ni costo | Estado `FALTA PRECIO Y COSTO` |
| Precio = costo | Utilidad 0, margen 0, estado `PRECIO = COSTO` |
| Precio < costo | Utilidad negativa en rojo, estado `MARGEN NEGATIVO`, alerta en la venta |
| Inventario en cero | Estado `AGOTADO` |
| Inventario negativo | Estado `ERROR`, alerta en la venta que lo provocó, chequeo en CONTROL |
| Venta sin inventario | Se registra y costea con el costo estándar; deja el stock negativo señalado |
| Venta anulada | No afecta unidades, ingresos, inventario ni rentabilidad; queda registrada |
| SKU duplicado | Detectado en CONTROL y en el diagnóstico por SKU |
| Gasto sin categoría | Alerta en la fila + chequeo en CONTROL |
| Compra sin proveedor | Alerta en la fila + chequeo en CONTROL |
| Cobros y pagos parciales | Generan cuentas por cobrar / por pagar y no entran a caja hasta cobrarse o pagarse |
| Libro completamente vacío | Cero errores de Excel; todo en `PENDIENTE`; CONTROL informa 162 datos por capturar |

## Defectos encontrados y corregidos durante la auditoría

1. **`#VALUE!` en 801 celdas.** Excel evalúa todos los argumentos de `AND()` aunque uno sea falso:
   `AND(ISNUMBER(x); x > y+0.01)` reventaba cuando `y` era texto. Corregido con `N()`.
2. **IDs y alertas en filas vacías.** `COUNTA()` cuenta como llena una celda con fórmula que
   devuelve `""`. Las 1.500+ filas en blanco se «activaban» solas. Corregido usando solo celdas
   de captura en la prueba de fila vacía.
3. **Separador colgando** (`"SKU DUPLICADO ·"`). El separador se movió al inicio de cada mensaje y
   se recorta con `MID`.
4. **`#VALUE!` en el estado del inventario** cuando el stock mínimo estaba vacío, y en el ROI de
   los escenarios vacíos: misma causa que el defecto 1.
5. **Conteo incorrecto de productos sin costo:** dependía del rótulo de estado, que priorizaba
   «falta precio». Ahora se cuenta sobre el dato mismo.
6. **Ranking ambiguo en el dashboard:** varios SKU comparten nombre (distinta presentación).
   El análisis por producto ahora muestra `Nombre · Presentación`.

## Limitaciones conocidas (documentadas, no defectos)

- El costo aplicado a una venta es el **promedio ponderado actual**, no el vigente en la fecha de
  la venta. Costeo por capas/FIFO queda para la versión software.
- El ticket promedio se calcula por **línea de venta**; use el campo `Folio` para agrupar facturas.
- Un SKU duplicado duplica su inventario en los agregados: por eso es un chequeo de severidad alta.
- Los gráficos aparecen vacíos hasta que existan datos del tipo correspondiente.
