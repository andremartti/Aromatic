# AROMATIC — Sistema Financiero y de Gestión Comercial

Sistema financiero funcional en Excel para AROMATIC (productos de limpieza, Honduras),
diseñado con arquitectura de base de datos para poder migrar después a una aplicación web.

**Entregable principal:** [`AROMATIC_Sistema_Financiero.xlsx`](AROMATIC_Sistema_Financiero.xlsx)

---

## Regla crítica sobre los precios

Los precios del catálogo 2016 **no alimentan ningún cálculo**. Se conservaron únicamente en la
columna informativa `Precio de referencia del catálogo 2016` de la hoja PRODUCTOS (fondo gris,
letra cursiva), y ninguna fórmula del libro la referencia.

El único precio que usa el sistema es `Precio de venta actual`, que **nace vacío**. Lo mismo
aplica a los costos: el catálogo no contiene costos, así que todos los campos de costo están
vacíos. Donde falta información el sistema muestra `PENDIENTE`, nunca un número inventado ni un
error de Excel (`#DIV/0!`, `#N/A`, `#VALUE!`).

---

## Qué contiene

**17 hojas**, 40 SKU cargados desde el catálogo, 6 gráficos, 9 tablas estructuradas,
28 rangos dinámicos con nombre y 55 menús desplegables.

| Hoja | Rol | ¿Captura? |
|---|---|---|
| INICIO | Guía de uso, glosario de KPI y reglas financieras | No |
| DASHBOARD | 28 KPI + 6 gráficos, con selector de mes | Solo el mes |
| PRODUCTOS | Catálogo maestro (clave: SKU) | Sí |
| COSTOS | Estructura de costo por SKU: directos, logísticos y variables de venta | Sí |
| COMPRAS | Adquisiciones → alimentan inventario y costo promedio ponderado | Sí |
| INVENTARIO | Derivado: inicial + compras − ventas + ajustes; valorización y alertas | Stock inicial y ajustes |
| VENTAS | Una fila por línea vendida → descuenta inventario y genera cuentas por cobrar | Sí |
| GASTOS | Gastos fijos y variables del negocio | Sí |
| CAJA | Flujo de efectivo mensual + movimientos manuales (aportes, retiros, préstamos) | Movimientos manuales |
| CLIENTES / PROVEEDORES | Bases relacionales con histórico y saldos | Sí |
| RENTABILIDAD | Estado de resultados mensual + análisis por producto, categoría y canal + ROI | No |
| EQUILIBRIO | Punto de equilibrio, simulador de utilidad y matriz de sensibilidad | Supuestos |
| METAS | Metas mensuales, % de cumplimiento y venta diaria requerida | Metas |
| ESCENARIOS | Base / Conservador / Crecimiento con 13 indicadores cada uno | Supuestos |
| CONTROL | 32 chequeos automáticos + diagnóstico SKU por SKU | No |
| CONFIG | Parámetros del negocio y 16 listas maestras | Sí |

### Arquitectura de datos

```
CONFIG ─── listas y parámetros ──► todas las hojas (validación de datos)

PRODUCTOS ─┬─► COSTOS ──► costo real unitario ─┐
           │                                   ├─► RENTABILIDAD ─► DASHBOARD
           ├─► COMPRAS ─► INVENTARIO ─► costo ─┤
           └─► VENTAS ──► ingresos y utilidad ─┘
                  │            │
GASTOS ───────────┴────────────┴─► CAJA (solo lo cobrado y lo pagado)
```

Las hojas de captura no dependen unas de otras: todo se resuelve con `INDEX/MATCH`, `SUMIFS` y
referencias estructuradas de tabla (`tblVentas[Venta neta]`), de modo que agregar filas nunca
rompe una fórmula. No hay copiar-y-pegar entre hojas.

### Decisiones financieras implementadas

- **Costo real ≠ costo de compra.** El costo real unitario suma compra, materia prima, empaque,
  transporte, importación, aranceles y otros logísticos. Los costos variables de venta
  (comisiones, delivery, publicidad atribuible) se separan y solo entran al margen de
  contribución y al punto de equilibrio.
- **Utilidad ≠ efectivo.** Ventas y gastos se reconocen por su fecha (devengo); la caja se mueve
  solo con `Monto cobrado` / `Monto pagado` en su fecha. La hoja CAJA muestra mes a mes la
  diferencia entre utilidad y flujo, más las cuentas por cobrar y por pagar al cierre.
- **Valorización de inventario:** costo promedio ponderado de las compras registradas; si aún no
  hay compras, se usa el costo estándar de COSTOS; si no hay ninguno, el inventario queda
  `PENDIENTE` de valorizar.
- **Aportes de capital no son ingresos:** entran a caja pero no a la utilidad.
- **Ventas anuladas** (`Estado = Anulado`) quedan registradas pero no afectan unidades, ingresos,
  inventario ni rentabilidad.

### Extras añadidos (no pedidos explícitamente)

| Añadido | Por qué |
|---|---|
| Columna `ALERTA` en COMPRAS, VENTAS, GASTOS y movimientos de caja | Señala el problema exacto en la fila misma, no solo en un resumen |
| Cuentas por cobrar y por pagar con pagos parciales | Permite separar utilidad de efectivo de verdad |
| Costo promedio ponderado automático | Un costo estándar fijo distorsiona la utilidad cuando cambian los precios de compra |
| Clasificación de clientes (ACTIVO / EN RIESGO / INACTIVO) y cobertura de inventario en días | Decisiones comerciales, no solo contables |
| Matriz de sensibilidad del punto de equilibrio | Responde «¿y si el costo sube 10%?» sin tocar nada |
| Campo `Folio` en VENTAS | Agrupa varias líneas de una misma factura, y prepara la tabla `venta` / `venta_linea` del futuro software |
| Suite de auditoría automatizada (`generador/validar_sistema.py`) | 181 pruebas con motor de cálculo real |

---

## Cómo se regenera

```bash
pip install openpyxl
python3 generador/construir_sistema.py     # genera el .xlsx
python3 generador/validar_sistema.py       # audita con LibreOffice (181 pruebas)
```

| Archivo | Contenido |
|---|---|
| `generador/catalogo_productos.py` | Los 40 SKU extraídos del catálogo PDF |
| `generador/estilo.py` | Paleta, formatos y estilos |
| `generador/construir_sistema.py` | Construcción completa del libro |
| `generador/validar_sistema.py` | Auditoría automática (ver `AUDITORIA.md`) |
| `MODELO_DE_DATOS.md` | Esquema relacional para migrar a software |

## Capacidad y límites

60 productos · 500 líneas de venta · 300 compras · 300 gastos · 150 clientes · 40 proveedores ·
200 movimientos de caja · 36 meses de calendario. Para ampliar, se copia la última fila de la
tabla hacia abajo. Compatible con Excel 2016+, Microsoft 365, LibreOffice Calc y Google Sheets
(sin macros, sin funciones de matriz dinámica).
