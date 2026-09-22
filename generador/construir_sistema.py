# -*- coding: utf-8 -*-
"""
====================================================================
 AROMATIC — Sistema Financiero y de Gestión Comercial
 Generador del archivo Excel (arquitectura lista para migrar a software)
====================================================================

Ejecutar:  python3 generador/construir_sistema.py

Principios de diseño:
  1. Exactitud financiera  2. Integridad de datos  3. Automatización
  4. Facilidad de uso      5. Escalabilidad        6. Diseño

Reglas absolutas implementadas:
  * Los precios del catálogo 2016 viven SOLO en la columna informativa
    "Precio de referencia del catálogo" y NO alimentan ninguna fórmula.
  * "Precio de venta actual" nace VACÍO. Ningún costo es inventado.
  * Sin datos suficientes => "PENDIENTE", nunca #DIV/0!, #N/A ni #VALUE!.
"""

import datetime as dt
import os
import sys

from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule, FormulaRule, ColorScaleRule, DataBarRule
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.chart import LineChart, BarChart, PieChart, Reference, Series
from openpyxl.chart.label import DataLabelList
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from catalogo_productos import PRODUCTOS, CATEGORIAS, SUBCATEGORIAS, PRESENTACIONES  # noqa: E402
from estilo import *  # noqa: E402,F403

# ------------------------------------------------------------ Dimensiones ---
N_PROD = 60          # filas de PRODUCTOS / COSTOS / INVENTARIO (40 usadas + 20 libres)
N_COMPRAS = 300
N_VENTAS = 500
N_GASTOS = 300
N_CAJAMOV = 200
N_CLIENTES = 150
N_PROV = 40
N_MESES = 36

HOY = dt.date(2026, 9, 22)
INICIO_CALENDARIO = dt.date(HOY.year, HOY.month, 1)

# Filas de encabezado de cada tabla (la primera fila de datos es HDR+1)
HDR_PROD = 6
HDR_COST = 7
HDR_COMPRAS = 6
HDR_VENTAS = 6
HDR_GASTOS = 6
HDR_INV = 6
HDR_CLI = 6
HDR_PROV = 6
HDR_CAJAMOV = 6

R_PROD = HDR_PROD + 1
R_COST = HDR_COST + 1
R_COMPRAS = HDR_COMPRAS + 1
R_VENTAS = HDR_VENTAS + 1
R_GASTOS = HDR_GASTOS + 1
R_INV = HDR_INV + 1
R_CLI = HDR_CLI + 1
R_PROV = HDR_PROV + 1
R_CAJAMOV = HDR_CAJAMOV + 1

F_PROD = R_PROD + N_PROD - 1
F_COST = R_COST + N_PROD - 1
F_COMPRAS = R_COMPRAS + N_COMPRAS - 1
F_VENTAS = R_VENTAS + N_VENTAS - 1
F_GASTOS = R_GASTOS + N_GASTOS - 1
F_INV = R_INV + N_PROD - 1
F_CLI = R_CLI + N_CLIENTES - 1
F_PROV = R_PROV + N_PROV - 1
F_CAJAMOV = R_CAJAMOV + N_CAJAMOV - 1

# Referencias estructuradas a tablas (se usan en todo el libro)
T_PROD = "tblProductos"
T_COST = "tblCostos"
T_COMPRAS = "tblCompras"
T_VENTAS = "tblVentas"
T_GASTOS = "tblGastos"
T_INV = "tblInventario"
T_CLI = "tblClientes"
T_PROV = "tblProveedores"
T_CAJAMOV = "tblCajaMov"
T_MESES = "tblFlujoMensual"

wb = Workbook()
wb.remove(wb.active)

# Orden de las hojas dentro del libro
HOJAS = ["INICIO", "DASHBOARD", "PRODUCTOS", "COSTOS", "COMPRAS", "INVENTARIO",
         "VENTAS", "GASTOS", "CAJA", "CLIENTES", "PROVEEDORES", "RENTABILIDAD",
         "EQUILIBRIO", "METAS", "ESCENARIOS", "CONTROL", "CONFIG"]
ws = {nombre: wb.create_sheet(nombre) for nombre in HOJAS}

TAB_COLORS = {
    "INICIO": "1F3A5F", "DASHBOARD": "1F3A5F", "PRODUCTOS": "2E5C8A",
    "COSTOS": "2E5C8A", "COMPRAS": "2E5C8A", "INVENTARIO": "2E5C8A",
    "VENTAS": "2E5C8A", "GASTOS": "2E5C8A", "CAJA": "2E5C8A",
    "CLIENTES": "6B8CAE", "PROVEEDORES": "6B8CAE", "RENTABILIDAD": "1E7B4F",
    "EQUILIBRIO": "1E7B4F", "METAS": "1E7B4F", "ESCENARIOS": "1E7B4F",
    "CONTROL": "B00020", "CONFIG": "5A6671",
}
for k, v in TAB_COLORS.items():
    ws[k].sheet_properties.tabColor = v


def add_table(hoja, nombre, ref, estilo="TableStyleMedium2"):
    t = Table(displayName=nombre, ref=ref)
    t.tableStyleInfo = TableStyleInfo(name=estilo, showFirstColumn=False,
                                      showLastColumn=False, showRowStripes=True,
                                      showColumnStripes=False)
    hoja.add_table(t)
    return t


def escribir_fila(hoja, fila, col_ini, valores, fmt=None, fill=None, borde=True,
                  fuente=None, alineacion=None):
    """Escribe una lista de valores; fmt/fill pueden ser listas paralelas."""
    for i, v in enumerate(valores):
        c = hoja.cell(row=fila, column=col_ini + i)
        if v is not None:
            c.value = v
        if fmt:
            f = fmt[i] if isinstance(fmt, (list, tuple)) else fmt
            if f:
                c.number_format = f
        if fill:
            fl = fill[i] if isinstance(fill, (list, tuple)) else fill
            if fl:
                c.fill = fl
        if borde:
            c.border = BORDE
        c.font = fuente or F_NORMAL
        if alineacion:
            c.alignment = alineacion
    return fila


def nota(hoja, celda, texto):
    hoja[celda] = texto
    hoja[celda].font = F_NOTA
    hoja[celda].alignment = AL_IZQ_WRAP


# =====================================================================
# 1. CONFIG — parámetros del negocio y catálogos maestros (listas)
# =====================================================================
c = ws["CONFIG"]
titulo(c, "A1", "CONFIGURACIÓN DEL SISTEMA",
       "Todo lo que se puede personalizar vive aquí. Las listas de esta hoja alimentan "
       "los menús desplegables de todo el libro. Celdas amarillas = editables.")
anchos(c, {"A": 42, "B": 30, "C": 3, "D": 26, "E": 24, "F": 22, "G": 22, "H": 20,
           "I": 18, "J": 24, "K": 20, "L": 22, "M": 24, "N": 26, "O": 16, "P": 10,
           "Q": 24})

banda(c, 3, 1, 8, "1. PARÁMETROS DEL NEGOCIO")
PARAMS = [
    # (fila, etiqueta, valor, formato, es_input, nombre_definido, nota)
    (4,  "Nombre del negocio", "AROMATIC", FMT_TEXTO, True, None, ""),
    (5,  "Responsable / propietario", None, FMT_TEXTO, True, None, "Opcional"),
    (6,  "Moneda", "HNL — Lempira hondureño", FMT_TEXTO, True, None, ""),
    (7,  "Símbolo de moneda", "L", FMT_TEXTO, True, None, "Usado en los formatos del libro"),
    (8,  "Fecha de inicio del calendario financiero", INICIO_CALENDARIO, FMT_FECHA, True,
         "PAR_FECHA_INICIO", "Primer mes del calendario de 36 meses. Cámbiela y todo el libro se recalcula."),
    (9,  "Meses del calendario financiero", N_MESES, FMT_NUM, False, "PAR_MESES", "Fijo"),
    (10, "Saldo inicial de caja", None, FMT_MONEDA, True, "PAR_SALDO_CAJA",
         "PENDIENTE: escriba el efectivo con el que arranca. Si lo deja vacío se toma 0."),
    (11, "Capital aportado inicial", None, FMT_MONEDA, True, "PAR_CAPITAL_INICIAL",
         "PENDIENTE: aporte de socios al inicio. Base para el ROI sobre capital."),
    (12, "Días de venta por mes (para metas)", 26, FMT_NUM, True, "PAR_DIAS_MES",
         "Se usa solo para calcular el promedio diario requerido en METAS."),
    (13, "Método de valuación de inventario", "Costo promedio ponderado (WAC)", FMT_TEXTO, False, None,
         "Si hay compras registradas se usa WAC; si no, el costo real unitario estándar de COSTOS."),
    (14, "ISV / impuesto sobre ventas (%)", None, FMT_PCT, True, "PAR_ISV",
         "INFORMATIVO. No afecta ninguna fórmula. Déjelo vacío si aún no factura con impuesto."),
    (15, "¿Los precios de venta incluyen ISV?", None, FMT_TEXTO, True, None, "Informativo"),
    (16, "Factor de alerta de stock (× stock mínimo)", 1.0, FMT_NUM2, True, "PAR_ALERTA_STOCK",
         "1.0 = alerta cuando el stock llega al mínimo. 1.2 = alerta 20% antes."),
    (17, "Margen bruto objetivo (%)", None, FMT_PCT, True, "PAR_MARGEN_OBJ",
         "PENDIENTE: su meta de margen. Se usa como referencia visual, no como dato real."),
    (18, "Fecha de generación del archivo", HOY, FMT_FECHA, False, None, ""),
]
for fila, etiqueta, valor, fmt, es_input, nombre, obs in PARAMS:
    c.cell(row=fila, column=1, value=etiqueta).font = F_BOLD
    c.cell(row=fila, column=1).border = BORDE
    cel = c.cell(row=fila, column=2, value=valor)
    cel.number_format = fmt
    cel.border = BORDE
    cel.alignment = AL_IZQ
    if es_input:
        marcar_input(cel)
    else:
        marcar_calc(cel)
    if nombre:
        wb.defined_names.add(DefinedName(nombre, attr_text=f"CONFIG!$B${fila}"))
    if obs:
        nota(c, f"D{fila}", obs)

# ------------------------------------------------- Listas maestras (menús) ---
banda(c, 21, 1, 17, "2. LISTAS MAESTRAS  ·  alimentan todos los menús desplegables del libro")
nota(c, "A22", "Agregue o edite valores debajo de cada encabezado (sin dejar filas vacías en medio). "
               "Los menús desplegables se actualizan solos.")

LISTAS = [
    ("B", "Categorías", CATEGORIAS, "LISTA_CATEGORIAS"),
    ("C", "Subcategorías", SUBCATEGORIAS, "LISTA_SUBCATEGORIAS"),
    ("D", "Presentaciones", PRESENTACIONES, "LISTA_PRESENTACIONES"),
    ("E", "Unidad de medida", ["Unidad", "Litro", "Galón", "Caja", "Docena", "Paquete"], "LISTA_UNIDADES"),
    ("F", "Canales de venta", ["Venta directa", "WhatsApp", "Facebook", "Instagram",
                               "Mayorista", "Tienda física", "Pedido a domicilio", "Otro"], "LISTA_CANALES"),
    ("G", "Métodos de pago", ["Efectivo", "Transferencia", "Depósito", "Tarjeta",
                              "Crédito", "Otro"], "LISTA_METODOS_PAGO"),
    ("H", "Tipo de gasto", ["Fijo", "Variable"], "LISTA_TIPO_GASTO"),
    ("I", "Categorías de gasto", ["Alquiler", "Internet", "Software", "Salarios",
                                  "Servicios públicos", "Publicidad", "Delivery",
                                  "Comisiones bancarias", "Empaque", "Transporte",
                                  "Impuestos", "Mantenimiento", "Papelería", "Otros"], "LISTA_CAT_GASTO"),
    ("J", "Estado de producto", ["Activo", "Inactivo", "Descontinuado"], "LISTA_ESTADO_PRODUCTO"),
    ("K", "Estado de pago/cobro", ["Pagado", "Cobrado", "Pendiente", "Parcial", "Anulado"], "LISTA_ESTADO_PAGO"),
    ("L", "Estado cliente/proveedor", ["Activo", "Inactivo", "Prospecto"], "LISTA_ESTADO_REL"),
    ("M", "Conceptos de caja", ["Aporte de capital", "Préstamo recibido", "Otro ingreso",
                                "Retiro del propietario", "Pago de préstamo", "Otro egreso"], "LISTA_CONCEPTO_CAJA"),
    ("N", "Condiciones de pago", ["Contado", "Crédito 8 días", "Crédito 15 días",
                                  "Crédito 30 días", "50% anticipo", "Otro"], "LISTA_CONDICIONES"),
    ("O", "Sí / No", ["Sí", "No"], "LISTA_SINO"),
    ("P", "Modo", ["Automático", "Manual"], "LISTA_MODO"),
    ("Q", "Tipo de movimiento de caja", ["Entrada", "Salida"], "LISTA_TIPO_MOV"),
]
FILA_LISTAS = 23
FIN_LISTAS = FILA_LISTAS + 60
for letra, encabezado, valores, nombre in LISTAS:
    h = c[f"{letra}{FILA_LISTAS - 1}"]
    h.value = encabezado
    h.font = F_HEADER
    h.fill = FILL_HEADER
    h.alignment = AL_CENTRO
    h.border = BORDE
    for i in range(60):
        cel = c[f"{letra}{FILA_LISTAS + i}"]
        if i < len(valores):
            cel.value = valores[i]
        marcar_input(cel)
    wb.defined_names.add(DefinedName(
        nombre,
        attr_text=f"OFFSET(CONFIG!${letra}${FILA_LISTAS},0,0,MAX(1,COUNTA(CONFIG!${letra}${FILA_LISTAS}:${letra}${FIN_LISTAS})),1)"))

c.freeze_panes = "A4"
c.sheet_view.showGridLines = False

# ------------------------- Rangos dinámicos que dependen de otras hojas -----
wb.defined_names.add(DefinedName("LISTA_SKU", attr_text=(
    f"OFFSET(PRODUCTOS!$A${R_PROD},0,0,MAX(1,COUNTA(PRODUCTOS!$A${R_PROD}:$A${F_PROD})),1)")))
wb.defined_names.add(DefinedName("LISTA_CLIENTES", attr_text=(
    f"OFFSET(CLIENTES!$B${R_CLI},0,0,MAX(1,COUNTA(CLIENTES!$B${R_CLI}:$B${F_CLI})),1)")))
wb.defined_names.add(DefinedName("LISTA_PROVEEDORES", attr_text=(
    f"OFFSET(PROVEEDORES!$B${R_PROV},0,0,MAX(1,COUNTA(PROVEEDORES!$B${R_PROV}:$B${F_PROV})),1)")))


# =====================================================================
# Utilidades de fórmula
# =====================================================================
def idx(tabla, columna, clave_tabla, columna_clave, clave):
    """INDEX/MATCH robusto -> texto de fórmula (sin '=')."""
    return (f"INDEX({tabla}[{columna}],MATCH({clave},{clave_tabla}[{columna_clave}],0))")


def buscar(tabla, columna, clave, columna_clave="SKU", si_falta='""'):
    """Lookup seguro por SKU (u otra clave) con manejo de vacío/no encontrado."""
    exp = idx(tabla, columna, tabla, columna_clave, clave)
    return f'IFERROR(IF({exp}="",{si_falta},{exp}),{si_falta})'


def guard(condicion_vacia, formula, vacio='""'):
    return f'=IF({condicion_vacia},{vacio},{formula})'


# =====================================================================
# 2. PRODUCTOS — catálogo maestro (una fila por SKU)
# =====================================================================
p = ws["PRODUCTOS"]
titulo(p, "A1", "PRODUCTOS — Catálogo maestro",
       "Una fila por SKU. Amarillo = usted lo escribe · Gris = lo calcula el sistema. "
       "Los costos se capturan en la hoja COSTOS y se reflejan aquí automáticamente.")
p["A3"] = "⚠ REGLA DE PRECIOS:"
p["A3"].font = Font(name="Calibri", size=10, bold=True, color=ROJO)
nota(p, "B3", "La columna «Precio de referencia del catálogo 2016» es SOLO INFORMATIVA y no entra en "
              "ningún cálculo. El sistema únicamente usa «Precio de venta actual», que nace vacío: "
              "usted debe escribirlo cuando defina sus precios reales.")
p.merge_cells("B3:N3")
p.row_dimensions[3].height = 30

COLS_PROD = [
    ("SKU", 14, "input", FMT_TEXTO),
    ("Nombre del producto", 36, "input", FMT_TEXTO),
    ("Categoría", 16, "input", FMT_TEXTO),
    ("Subcategoría", 22, "input", FMT_TEXTO),
    ("Presentación", 13, "input", FMT_TEXTO),
    ("Unidad de medida", 12, "input", FMT_TEXTO),
    ("Contenido (mL)", 11, "input", FMT_NUM),
    ("Aromas disponibles", 30, "input", FMT_TEXTO),
    ("Proveedor principal", 22, "input", FMT_TEXTO),
    ("Precio de referencia del catálogo 2016 (INFORMATIVO)", 16, "info", FMT_MONEDA),
    ("Precio de venta actual", 15, "input", FMT_MONEDA),
    ("Costo de compra unitario", 13, "calc", FMT_MONEDA),
    ("Transporte unitario", 12, "calc", FMT_MONEDA),
    ("Impuestos / aranceles unitarios", 13, "calc", FMT_MONEDA),
    ("Empaque unitario", 12, "calc", FMT_MONEDA),
    ("Otros costos variables unitarios", 13, "calc", FMT_MONEDA),
    ("COSTO REAL UNITARIO", 15, "calc", FMT_MONEDA),
    ("Costo variable de venta unitario", 13, "calc", FMT_MONEDA),
    ("Costo variable TOTAL unitario", 14, "calc", FMT_MONEDA),
    ("Utilidad unitaria", 13, "calc", FMT_MONEDA),
    ("Margen bruto %", 12, "calc", FMT_PCT),
    ("Markup %", 11, "calc", FMT_PCT),
    ("Margen de contribución unitario", 14, "calc", FMT_MONEDA),
    ("Stock actual", 11, "calc", FMT_NUM),
    ("Stock mínimo", 11, "input", FMT_NUM),
    ("Stock máximo", 11, "input", FMT_NUM),
    ("Estado", 12, "input", FMT_TEXTO),
    ("Estado de datos", 18, "calc", FMT_TEXTO),
    ("Fecha de actualización", 14, "input", FMT_FECHA),
    ("Notas", 28, "input", FMT_TEXTO),
]
encabezado_tabla(p, HDR_PROD, 1, [h[0] for h in COLS_PROD], alto=48)
for i, (h, w, tipo, fmt) in enumerate(COLS_PROD):
    p.column_dimensions[get_column_letter(i + 1)].width = w

p.cell(row=HDR_PROD, column=10).comment = Comment(
    "Precio publicado en el catálogo 2016. Es únicamente una referencia histórica: "
    "NO alimenta ninguna fórmula financiera del sistema.", "AROMATIC")

CL = {h[0]: get_column_letter(i + 1) for i, h in enumerate(COLS_PROD)}
PC = lambda nombre: CL[nombre]  # noqa: E731

for i in range(N_PROD):
    r = R_PROD + i
    datos = PRODUCTOS[i] if i < len(PRODUCTOS) else None
    A = f"$A{r}"
    if datos:
        sku, nombre, cat, subcat, pres, uni, ml, aromas, pref = datos
        valores_fijos = [sku, nombre, cat, subcat, pres, uni, ml, aromas, None, pref]
    else:
        valores_fijos = [None] * 10

    for cidx, val in enumerate(valores_fijos, start=1):
        cel = p.cell(row=r, column=cidx, value=val)
        cel.number_format = COLS_PROD[cidx - 1][3]
        marcar_input(cel)
    # Precio de referencia: informativo -> gris claro para diferenciarlo
    cref = p.cell(row=r, column=10)
    cref.fill = PatternFill("solid", fgColor="EDEDED")
    cref.font = Font(name="Calibri", size=10, italic=True, color="7A7A7A")

    # K · Precio de venta actual  (INPUT — nace vacío)
    cel = p.cell(row=r, column=11)
    cel.number_format = FMT_MONEDA
    marcar_input(cel)

    # L..R · componentes de costo traídos de COSTOS
    mapa_costos = {
        12: "Costo de compra unitario",
        13: "Transporte unitario",
        14: "Impuestos / aranceles unitarios",
        15: "Empaque unitario",
        16: "Otros costos variables unitarios",
        17: "COSTO REAL UNITARIO",
        18: "Costo variable de venta unitario",
    }
    for cidx, nombre_col in mapa_costos.items():
        falta = '"PENDIENTE"' if cidx in (12, 17) else '""'
        f = guard(f'{A}=""', buscar(T_COST, nombre_col, A, si_falta=falta))
        cel = p.cell(row=r, column=cidx, value=f)
        cel.number_format = FMT_MONEDA
        marcar_calc(cel)

    Q, R_, K = f"$Q{r}", f"$R{r}", f"$K{r}"
    S, T_, U = f"$S{r}", f"$T{r}", f"$U{r}"

    # S · Costo variable total unitario = costo real + costo variable de venta
    p[f"S{r}"] = guard(f'{A}=""',
                       f'IF(NOT(ISNUMBER({Q})),"PENDIENTE",{Q}+IF(ISNUMBER({R_}),{R_},0))')
    # T · Utilidad unitaria = precio de venta actual - costo real unitario
    p[f"T{r}"] = guard(f'{A}=""',
                       f'IF(OR({K}="",NOT(ISNUMBER({K})),NOT(ISNUMBER({Q}))),"PENDIENTE",{K}-{Q})')
    # U · Margen bruto % = utilidad / precio
    p[f"U{r}"] = guard(f'{A}=""',
                       f'IF(OR(NOT(ISNUMBER({T_})),NOT(ISNUMBER({K})),{K}<=0),"PENDIENTE",{T_}/{K})')
    # V · Markup % = utilidad / costo real
    p[f"V{r}"] = guard(f'{A}=""',
                       f'IF(OR(NOT(ISNUMBER({T_})),NOT(ISNUMBER({Q})),{Q}<=0),"PENDIENTE",{T_}/{Q})')
    # W · Margen de contribución unitario = precio - costo variable total
    p[f"W{r}"] = guard(f'{A}=""',
                       f'IF(OR({K}="",NOT(ISNUMBER({K})),NOT(ISNUMBER({S}))),"PENDIENTE",{K}-{S})')
    # X · Stock actual (desde INVENTARIO)
    p[f"X{r}"] = guard(f'{A}=""',
                       f'IFERROR({idx(T_INV, "Stock actual", T_INV, "SKU", A)},0)')
    for letra, fmt in (("S", FMT_MONEDA), ("T", FMT_MONEDA), ("U", FMT_PCT),
                       ("V", FMT_PCT), ("W", FMT_MONEDA), ("X", FMT_NUM)):
        cel = p[f"{letra}{r}"]
        cel.number_format = fmt
        marcar_calc(cel)

    # Y, Z · stock mínimo / máximo (input)
    for cidx in (25, 26):
        cel = p.cell(row=r, column=cidx)
        cel.number_format = FMT_NUM
        marcar_input(cel)
    # AA · Estado
    cel = p.cell(row=r, column=27, value="Activo" if datos else None)
    cel.number_format = FMT_TEXTO
    marcar_input(cel)
    # AB · Estado de datos (semáforo de integridad)
    p[f"AB{r}"] = (
        f'=IF({A}="","",'
        f'IF(COUNTIF({T_COST}[SKU],{A})=0,"SIN FILA EN COSTOS",'
        f'IF(AND({K}="",NOT(ISNUMBER({Q}))),"FALTA PRECIO Y COSTO",'
        f'IF({K}="","FALTA PRECIO",'
        f'IF(NOT(ISNUMBER({Q})),"FALTA COSTO",'
        f'IF({T_}<0,"MARGEN NEGATIVO",'
        f'IF({T_}=0,"PRECIO = COSTO","COMPLETO")))))))'
    )
    marcar_calc(p[f"AB{r}"])
    p[f"AB{r}"].alignment = AL_CENTRO
    # AC · Fecha de actualización, AD · Notas
    for cidx, fmt in ((29, FMT_FECHA), (30, FMT_TEXTO)):
        cel = p.cell(row=r, column=cidx)
        cel.number_format = fmt
        marcar_input(cel)

add_table(p, T_PROD, f"A{HDR_PROD}:{get_column_letter(len(COLS_PROD))}{F_PROD}")
p.freeze_panes = f"C{R_PROD}"
p.sheet_view.showGridLines = False

def dv(hoja, rango, nombre_lista, titulo_msg=None, msg=None, permitir_otros=True):
    """Agrega validación de lista a un rango."""
    v = DataValidation(type="list", formula1=f"={nombre_lista}",
                       allow_blank=True, showDropDown=False)
    v.error = "Ese valor no está en la lista. Agréguelo en la hoja CONFIG si es nuevo."
    v.errorTitle = "Valor fuera de la lista"
    v.errorStyle = "warning" if permitir_otros else "stop"
    if msg:
        v.prompt = msg
        v.promptTitle = titulo_msg or "Dato"
        v.showInputMessage = True
    hoja.add_data_validation(v)
    v.add(rango)
    return v


def dv_numero(hoja, rango, minimo=0, msg=None):
    v = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1=str(minimo),
                       allow_blank=True)
    v.errorTitle = "Número inválido"
    v.error = f"Escriba un número mayor o igual a {minimo}."
    v.errorStyle = "stop"
    if msg:
        v.prompt = msg
        v.promptTitle = "Dato"
        v.showInputMessage = True
    hoja.add_data_validation(v)
    v.add(rango)
    return v


def dv_fecha(hoja, rango):
    v = DataValidation(type="date", operator="greaterThan", formula1="DATE(2000,1,1)",
                       allow_blank=True)
    v.errorTitle = "Fecha inválida"
    v.error = "Escriba una fecha válida (dd/mm/aaaa)."
    v.errorStyle = "stop"
    hoja.add_data_validation(v)
    v.add(rango)
    return v


# --- Validaciones y formato condicional de PRODUCTOS -------------------------
dv(p, f"C{R_PROD}:C{F_PROD}", "LISTA_CATEGORIAS")
dv(p, f"D{R_PROD}:D{F_PROD}", "LISTA_SUBCATEGORIAS")
dv(p, f"E{R_PROD}:E{F_PROD}", "LISTA_PRESENTACIONES")
dv(p, f"F{R_PROD}:F{F_PROD}", "LISTA_UNIDADES")
dv(p, f"I{R_PROD}:I{F_PROD}", "LISTA_PROVEEDORES")
dv(p, f"AA{R_PROD}:AA{F_PROD}", "LISTA_ESTADO_PRODUCTO")
dv_numero(p, f"K{R_PROD}:K{F_PROD}", 0,
          "Precio de venta REAL con el que vende hoy. Este es el único precio que usa el sistema.")
dv_numero(p, f"Y{R_PROD}:Z{F_PROD}", 0)
dv_fecha(p, f"AC{R_PROD}:AC{F_PROD}")

rng_estado = f"AB{R_PROD}:AB{F_PROD}"
p.conditional_formatting.add(rng_estado, FormulaRule(
    formula=[f'AB{R_PROD}="COMPLETO"'],
    font=Font(color=VERDE, bold=True), fill=PatternFill("solid", fgColor="E3F4EA")))
p.conditional_formatting.add(rng_estado, FormulaRule(
    formula=[f'OR(AB{R_PROD}="MARGEN NEGATIVO",AB{R_PROD}="SIN FILA EN COSTOS")'],
    font=Font(color=ROJO, bold=True), fill=PatternFill("solid", fgColor="FBE3E6")))
p.conditional_formatting.add(rng_estado, FormulaRule(
    formula=[f'OR(AB{R_PROD}="FALTA PRECIO",AB{R_PROD}="FALTA COSTO",'
             f'AB{R_PROD}="FALTA PRECIO Y COSTO",AB{R_PROD}="PRECIO = COSTO")'],
    font=Font(color=AMBAR, bold=True), fill=PatternFill("solid", fgColor="FFF3D6")))
# Margen bruto negativo en rojo
p.conditional_formatting.add(f"U{R_PROD}:U{F_PROD}", CellIsRule(
    operator="lessThan", formula=["0"], font=Font(color=ROJO, bold=True)))
# Stock bajo
p.conditional_formatting.add(f"X{R_PROD}:X{F_PROD}", FormulaRule(
    formula=[f'AND($A{R_PROD}<>"",ISNUMBER($X{R_PROD}),ISNUMBER($Y{R_PROD}),$X{R_PROD}<=N($Y{R_PROD})*MAX(1,PAR_ALERTA_STOCK))'],
    fill=PatternFill("solid", fgColor="FFF3D6"), font=Font(color=AMBAR, bold=True)))
p.conditional_formatting.add(f"X{R_PROD}:X{F_PROD}", CellIsRule(
    operator="lessThanOrEqual", formula=["0"],
    fill=PatternFill("solid", fgColor="FBE3E6"), font=Font(color=ROJO, bold=True)))


# =====================================================================
# 3. COSTOS — estructura de costos por SKU (separa directos/logísticos/venta)
# =====================================================================
co = ws["COSTOS"]
titulo(co, "A1", "COSTOS — Estructura de costo por producto",
       "Aquí se capturan TODOS los costos. Nunca mezcle costos fijos (hoja GASTOS) con costos "
       "variables unitarios (esta hoja). Deje vacío lo que aún no conozca: el sistema mostrará PENDIENTE.")
nota(co, "A3", "COSTO REAL UNITARIO = costo de compra + materia prima + empaque + transporte + importación + "
               "impuestos/aranceles + otros logísticos + otros variables.   ·   "
               "COSTO VARIABLE TOTAL = costo real unitario + costos variables de venta (comisiones, delivery, "
               "publicidad atribuible). El costo variable total es el que se usa para el margen de contribución "
               "y el punto de equilibrio.")
co.merge_cells("A3:X4")
co["A3"].alignment = AL_IZQ_WRAP
co.row_dimensions[3].height = 28

COLS_COST = [
    ("SKU", 14, "input", FMT_TEXTO),
    ("Producto", 34, "calc", FMT_TEXTO),
    ("Categoría", 16, "calc", FMT_TEXTO),
    ("Costo de compra unitario", 13, "input", FMT_MONEDA),
    ("Materia prima unitaria", 12, "input", FMT_MONEDA),
    ("Empaque unitario", 12, "input", FMT_MONEDA),
    ("Transporte unitario", 12, "input", FMT_MONEDA),
    ("Importación / flete internacional unitario", 13, "input", FMT_MONEDA),
    ("Impuestos / aranceles unitarios", 13, "input", FMT_MONEDA),
    ("Otros costos logísticos unitarios", 13, "input", FMT_MONEDA),
    ("Otros costos variables no listados", 13, "input", FMT_MONEDA),
    ("Subtotal costos directos", 13, "calc", FMT_MONEDA),
    ("Subtotal costos logísticos", 13, "calc", FMT_MONEDA),
    ("Otros costos variables unitarios", 13, "calc", FMT_MONEDA),
    ("COSTO REAL UNITARIO", 15, "calc", FMT_MONEDA),
    ("Comisión de venta %", 11, "input", FMT_PCT),
    ("Comisión bancaria / plataforma %", 12, "input", FMT_PCT),
    ("Delivery asumido por unidad", 12, "input", FMT_MONEDA),
    ("Publicidad atribuible por unidad", 12, "input", FMT_MONEDA),
    ("Otros costos variables de venta", 12, "input", FMT_MONEDA),
    ("Costo variable de venta unitario", 14, "calc", FMT_MONEDA),
    ("COSTO VARIABLE TOTAL UNITARIO", 15, "calc", FMT_MONEDA),
    ("Fecha de actualización", 13, "input", FMT_FECHA),
    ("Observaciones", 30, "input", FMT_TEXTO),
]
GRUPOS_COST = [("D", "K", "COSTOS DE PRODUCTO (directos, logísticos y otros variables)", "2E5C8A"),
               ("L", "O", "CONSOLIDADO DE COSTO REAL", "1E7B4F"),
               ("P", "V", "COSTOS VARIABLES DE VENTA", "6B4E9B")]
for ini, fin, texto, color in GRUPOS_COST:
    co.merge_cells(f"{ini}{HDR_COST-1}:{fin}{HDR_COST-1}")
    cel = co[f"{ini}{HDR_COST-1}"]
    cel.value = texto
    cel.font = Font(name="Calibri", size=10, bold=True, color=BLANCO)
    cel.alignment = AL_CENTRO
    for cc in range(co[f"{ini}1"].column, co[f"{fin}1"].column + 1):
        co.cell(row=HDR_COST - 1, column=cc).fill = PatternFill("solid", fgColor=color)

encabezado_tabla(co, HDR_COST, 1, [h[0] for h in COLS_COST], alto=50)
for i, (h, w, tipo, fmt) in enumerate(COLS_COST):
    co.column_dimensions[get_column_letter(i + 1)].width = w

for i in range(N_PROD):
    r = R_COST + i
    A = f"$A{r}"
    sku = PRODUCTOS[i][0] if i < len(PRODUCTOS) else None
    cel = co.cell(row=r, column=1, value=sku)
    cel.number_format = FMT_TEXTO
    marcar_input(cel)

    co[f"B{r}"] = guard(f'{A}=""', buscar(T_PROD, "Nombre del producto", A))
    co[f"C{r}"] = guard(f'{A}=""', buscar(T_PROD, "Categoría", A))
    for letra in ("B", "C"):
        marcar_calc(co[f"{letra}{r}"])

    for cidx in range(4, 12):          # D..K entradas de costo
        cel = co.cell(row=r, column=cidx)
        cel.number_format = FMT_MONEDA
        marcar_input(cel)

    co[f"L{r}"] = guard(f'OR({A}="",COUNT($D{r}:$F{r})=0)', f'SUM($D{r}:$F{r})')
    co[f"M{r}"] = guard(f'OR({A}="",COUNT($G{r}:$J{r})=0)', f'SUM($G{r}:$J{r})')
    co[f"N{r}"] = guard(f'OR({A}="",COUNT($E{r},$H{r},$J{r},$K{r})=0)',
                        f'SUM($E{r},$H{r},$J{r},$K{r})')
    co[f"O{r}"] = guard(f'{A}=""', f'IF($D{r}="","PENDIENTE",SUM($D{r}:$K{r}))')
    for letra in ("L", "M", "N", "O"):
        co[f"{letra}{r}"].number_format = FMT_MONEDA
        marcar_calc(co[f"{letra}{r}"])
    co[f"O{r}"].font = F_BOLD

    for cidx in (16, 17):              # P, Q porcentajes
        cel = co.cell(row=r, column=cidx)
        cel.number_format = FMT_PCT
        marcar_input(cel)
    for cidx in (18, 19, 20):          # R, S, T montos
        cel = co.cell(row=r, column=cidx)
        cel.number_format = FMT_MONEDA
        marcar_input(cel)

    precio = buscar(T_PROD, "Precio de venta actual", A)
    co[f"U{r}"] = (
        f'=IF({A}="","",'
        f'IF(COUNT($P{r}:$T{r})=0,0,'
        f'IF(AND(SUM($P{r}:$Q{r})>0,NOT(ISNUMBER({precio}))),"PENDIENTE",'
        f'IF(ISNUMBER({precio}),{precio},0)*SUM($P{r}:$Q{r})+SUM($R{r}:$T{r}))))'
    )
    co[f"V{r}"] = guard(f'{A}=""',
                        f'IF(OR(NOT(ISNUMBER($O{r})),NOT(ISNUMBER($U{r}))),"PENDIENTE",$O{r}+$U{r})')
    for letra in ("U", "V"):
        co[f"{letra}{r}"].number_format = FMT_MONEDA
        marcar_calc(co[f"{letra}{r}"])
    co[f"V{r}"].font = F_BOLD

    cel = co.cell(row=r, column=23)
    cel.number_format = FMT_FECHA
    marcar_input(cel)
    cel = co.cell(row=r, column=24)
    cel.number_format = FMT_TEXTO
    marcar_input(cel)

add_table(co, T_COST, f"A{HDR_COST}:X{F_COST}", estilo="TableStyleMedium7")
co.freeze_panes = f"D{R_COST}"
co.sheet_view.showGridLines = False
dv(co, f"A{R_COST}:A{F_COST}", "LISTA_SKU", permitir_otros=False)
dv_numero(co, f"D{R_COST}:K{F_COST}", 0)
dv_numero(co, f"R{R_COST}:T{F_COST}", 0)
dv_fecha(co, f"W{R_COST}:W{F_COST}")
co.conditional_formatting.add(f"O{R_COST}:O{F_COST}", FormulaRule(
    formula=[f'$O{R_COST}="PENDIENTE"'],
    font=Font(color=AMBAR, bold=True), fill=PatternFill("solid", fgColor="FFF3D6")))
co.conditional_formatting.add(f"V{R_COST}:V{F_COST}", FormulaRule(
    formula=[f'$V{R_COST}="PENDIENTE"'],
    font=Font(color=AMBAR, bold=True), fill=PatternFill("solid", fgColor="FFF3D6")))


# =====================================================================
# Constructor de la columna ALERTA (control de calidad fila por fila)
# =====================================================================
def alerta(cond_fila_vacia, chequeos):
    """chequeos = [(condición, 'texto')] -> fórmula de diagnóstico por fila.

    El separador va al INICIO de cada mensaje para poder recortarlo con MID()
    sin dejar un « · » colgando al final del texto.
    `cond_fila_vacia` debe evaluarse SOLO sobre celdas de captura: las columnas
    calculadas devuelven "" y COUNTA las contaría como llenas.
    """
    partes = "&".join([f'IF({cond}," · {txt}","")' for cond, txt in chequeos])
    return (f'=IF({cond_fila_vacia},"",'
            f'IF({partes}="","OK",MID({partes},4,900)))')


# =====================================================================
# 4. COMPRAS — entradas de mercadería (alimentan INVENTARIO y CAJA)
# =====================================================================
cp = ws["COMPRAS"]
titulo(cp, "A1", "COMPRAS — Registro de adquisiciones",
       "Cada fila es una línea de compra. Alimenta automáticamente el INVENTARIO (entradas), "
       "el costo promedio ponderado y la CAJA (salidas de efectivo por lo efectivamente pagado).")
nota(cp, "A3", "Costo total de adquisición = (cantidad × costo unitario) + transporte + impuestos + otros costos. "
               "Ese total —no solo el precio de factura— es el costo real que entra al inventario. "
               "La CAJA registra únicamente el «Monto pagado» en su «Fecha de pago»: comprar a crédito NO saca efectivo.")
cp.merge_cells("A3:N4")
cp["A3"].alignment = AL_IZQ_WRAP

COLS_COMPRAS = [
    ("ID de compra", 13, "calc", FMT_TEXTO),
    ("Fecha", 12, "input", FMT_FECHA),
    ("Proveedor", 24, "input", FMT_TEXTO),
    ("SKU", 13, "input", FMT_TEXTO),
    ("Producto", 32, "calc", FMT_TEXTO),
    ("Categoría", 16, "calc", FMT_TEXTO),
    ("Cantidad", 10, "input", FMT_NUM),
    ("Costo unitario", 13, "input", FMT_MONEDA),
    ("Costo total", 14, "calc", FMT_MONEDA),
    ("Transporte", 12, "input", FMT_MONEDA),
    ("Impuestos / aranceles", 12, "input", FMT_MONEDA),
    ("Otros costos", 12, "input", FMT_MONEDA),
    ("Costo total de adquisición", 15, "calc", FMT_MONEDA),
    ("Costo unitario de adquisición", 14, "calc", FMT_MONEDA),
    ("Método de pago", 15, "input", FMT_TEXTO),
    ("Estado de pago", 14, "input", FMT_TEXTO),
    ("Fecha de pago", 12, "input", FMT_FECHA),
    ("Monto pagado", 13, "input", FMT_MONEDA),
    ("Saldo por pagar", 13, "calc", FMT_MONEDA),
    ("Observaciones", 26, "input", FMT_TEXTO),
    ("ALERTA", 30, "calc", FMT_TEXTO),
]
encabezado_tabla(cp, HDR_COMPRAS, 1, [h[0] for h in COLS_COMPRAS], alto=44)
for i, (h, w, tipo, fmt) in enumerate(COLS_COMPRAS):
    cp.column_dimensions[get_column_letter(i + 1)].width = w

for i in range(N_COMPRAS):
    r = R_COMPRAS + i
    B, D = f"$B{r}", f"$D{r}"
    cp[f"A{r}"] = (f'=IF(COUNTA($B{r},$C{r},$D{r},$G{r},$H{r})=0,"",'
                   f'"C-"&TEXT(ROW()-{HDR_COMPRAS},"0000"))')
    cp[f"E{r}"] = guard(f'{D}=""', buscar(T_PROD, "Nombre del producto", D))
    cp[f"F{r}"] = guard(f'{D}=""', buscar(T_PROD, "Categoría", D))
    cp[f"I{r}"] = guard(f'OR($G{r}="",$H{r}="")', f'$G{r}*$H{r}')
    cp[f"M{r}"] = guard(f'NOT(ISNUMBER($I{r}))', f'$I{r}+SUM($J{r}:$L{r})')
    cp[f"N{r}"] = guard(f'OR(NOT(ISNUMBER($M{r})),NOT(ISNUMBER($G{r})),$G{r}<=0)', f'$M{r}/$G{r}')
    cp[f"S{r}"] = guard(f'NOT(ISNUMBER($M{r}))', f'$M{r}-IF(ISNUMBER($R{r}),$R{r},0)')
    cp[f"U{r}"] = alerta(f'COUNTA($B{r},$C{r},$D{r},$G{r},$H{r})=0', [
        (f'$B{r}=""', "Falta fecha"),
        (f'$C{r}=""', "Falta proveedor"),
        (f'AND($D{r}<>"",COUNTIF({T_PROD}[SKU],$D{r})=0)', "SKU no existe"),
        (f'$D{r}=""', "Falta SKU"),
        (f'OR($G{r}="",NOT(ISNUMBER($G{r})),$G{r}<=0)', "Cantidad inválida"),
        (f'$H{r}=""', "Falta costo unitario"),
        (f'AND($P{r}="Pagado",$Q{r}="")', "Pago sin fecha"),
        (f'AND(ISNUMBER($R{r}),ISNUMBER($M{r}),$R{r}>N($M{r})+0.01)', "Pagado > total"),
        (f'AND(ISNUMBER($R{r}),$R{r}>0,$Q{r}="")', "Monto pagado sin fecha"),
    ])
    for cidx, (h, w, tipo, fmt) in enumerate(COLS_COMPRAS, start=1):
        cel = cp.cell(row=r, column=cidx)
        cel.number_format = fmt
        if tipo == "input":
            marcar_input(cel)
        else:
            marcar_calc(cel)

add_table(cp, T_COMPRAS, f"A{HDR_COMPRAS}:U{F_COMPRAS}", estilo="TableStyleMedium2")
cp.freeze_panes = f"C{R_COMPRAS}"
cp.sheet_view.showGridLines = False
dv(cp, f"C{R_COMPRAS}:C{F_COMPRAS}", "LISTA_PROVEEDORES")
dv(cp, f"D{R_COMPRAS}:D{F_COMPRAS}", "LISTA_SKU", permitir_otros=False)
dv(cp, f"O{R_COMPRAS}:O{F_COMPRAS}", "LISTA_METODOS_PAGO")
dv(cp, f"P{R_COMPRAS}:P{F_COMPRAS}", "LISTA_ESTADO_PAGO")
dv_numero(cp, f"G{R_COMPRAS}:H{F_COMPRAS}", 0)
dv_numero(cp, f"J{R_COMPRAS}:L{F_COMPRAS}", 0)
dv_numero(cp, f"R{R_COMPRAS}:R{F_COMPRAS}", 0)
dv_fecha(cp, f"B{R_COMPRAS}:B{F_COMPRAS}")
dv_fecha(cp, f"Q{R_COMPRAS}:Q{F_COMPRAS}")
cp.conditional_formatting.add(f"U{R_COMPRAS}:U{F_COMPRAS}", FormulaRule(
    formula=[f'AND($U{R_COMPRAS}<>"",$U{R_COMPRAS}<>"OK")'],
    font=Font(color=ROJO, bold=True), fill=PatternFill("solid", fgColor="FBE3E6")))
cp.conditional_formatting.add(f"U{R_COMPRAS}:U{F_COMPRAS}", FormulaRule(
    formula=[f'$U{R_COMPRAS}="OK"'], font=Font(color=VERDE)))
cp.conditional_formatting.add(f"S{R_COMPRAS}:S{F_COMPRAS}", CellIsRule(
    operator="greaterThan", formula=["0.01"], font=Font(color=AMBAR, bold=True)))


# =====================================================================
# 5. VENTAS — una fila por línea de venta (SKU vendido)
# =====================================================================
v = ws["VENTAS"]
titulo(v, "A1", "VENTAS — Registro de ventas",
       "Una fila por producto vendido. Si una misma venta incluye 3 productos, registre 3 filas con el mismo Folio. "
       "Cada fila descuenta inventario, calcula su costo y su utilidad, y genera la cuenta por cobrar.")
nota(v, "A3", "El «Precio unitario aplicado» y el «Costo unitario aplicado» se llenan solos desde PRODUCTOS e "
              "INVENTARIO (celdas verdes): puede sobrescribirlos en una venta puntual sin romper nada. "
              "VENTA ≠ EFECTIVO: el dinero entra a CAJA solo por el «Monto cobrado» en su «Fecha de cobro».")
v.merge_cells("A3:N4")
v["A3"].alignment = AL_IZQ_WRAP

FILL_AUTO = PatternFill("solid", fgColor="E8F5EC")   # auto-calculado pero editable

COLS_VENTAS = [
    ("ID de venta", 12, "calc", FMT_TEXTO),
    ("Fecha", 12, "input", FMT_FECHA),
    ("Folio / documento", 13, "input", FMT_TEXTO),
    ("Cliente", 24, "input", FMT_TEXTO),
    ("Canal", 16, "input", FMT_TEXTO),
    ("SKU", 13, "input", FMT_TEXTO),
    ("Producto", 32, "calc", FMT_TEXTO),
    ("Categoría", 15, "calc", FMT_TEXTO),
    ("Cantidad", 10, "input", FMT_NUM),
    ("Unidades efectivas", 11, "calc", FMT_NUM),
    ("Precio unitario aplicado", 13, "auto", FMT_MONEDA),
    ("Descuento", 12, "input", FMT_MONEDA),
    ("Venta bruta", 13, "calc", FMT_MONEDA),
    ("Venta neta", 13, "calc", FMT_MONEDA),
    ("Costo unitario aplicado", 13, "auto", FMT_MONEDA),
    ("Costo total", 13, "calc", FMT_MONEDA),
    ("Utilidad bruta", 13, "calc", FMT_MONEDA),
    ("Margen", 10, "calc", FMT_PCT),
    ("Método de pago", 14, "input", FMT_TEXTO),
    ("Estado", 12, "input", FMT_TEXTO),
    ("Fecha de cobro", 12, "input", FMT_FECHA),
    ("Monto cobrado", 13, "input", FMT_MONEDA),
    ("Saldo por cobrar", 13, "calc", FMT_MONEDA),
    ("Observaciones", 24, "input", FMT_TEXTO),
    ("ALERTA", 32, "calc", FMT_TEXTO),
]
encabezado_tabla(v, HDR_VENTAS, 1, [h[0] for h in COLS_VENTAS], alto=44)
for i, (h, w, tipo, fmt) in enumerate(COLS_VENTAS):
    v.column_dimensions[get_column_letter(i + 1)].width = w

for i in range(N_VENTAS):
    r = R_VENTAS + i
    F = f"$F{r}"
    v[f"A{r}"] = (f'=IF(COUNTA($B{r},$C{r},$D{r},$E{r},$F{r},$I{r})=0,"",'
                  f'"V-"&TEXT(ROW()-{HDR_VENTAS},"0000"))')
    v[f"G{r}"] = guard(f'{F}=""', buscar(T_PROD, "Nombre del producto", F))
    v[f"H{r}"] = guard(f'{F}=""', buscar(T_PROD, "Categoría", F))
    v[f"J{r}"] = (f'=IF(OR($B{r}="",{F}="",$I{r}=""),"",'
                  f'IF($T{r}="Anulado",0,$I{r}))')
    v[f"K{r}"] = guard(f'{F}=""', buscar(T_PROD, "Precio de venta actual", F))
    v[f"M{r}"] = (f'=IF($J{r}="","",IF(NOT(ISNUMBER($K{r})),"PRECIO PENDIENTE",$J{r}*$K{r}))')
    v[f"N{r}"] = (f'=IF($J{r}="","",IF(NOT(ISNUMBER($M{r})),"PRECIO PENDIENTE",'
                  f'$M{r}-IF(ISNUMBER($L{r}),$L{r},0)))')
    v[f"O{r}"] = guard(f'{F}=""', f'IFERROR({idx(T_INV, "Costo unitario aplicado", T_INV, "SKU", F)},"")')
    v[f"P{r}"] = (f'=IF($J{r}="","",IF(NOT(ISNUMBER($O{r})),"COSTO PENDIENTE",$J{r}*$O{r}))')
    v[f"Q{r}"] = (f'=IF($J{r}="","",IF(OR(NOT(ISNUMBER($N{r})),NOT(ISNUMBER($P{r}))),"PENDIENTE",'
                  f'$N{r}-$P{r}))')
    v[f"R{r}"] = (f'=IF($J{r}="","",IF(OR(NOT(ISNUMBER($Q{r})),NOT(ISNUMBER($N{r})),$N{r}<=0),"PENDIENTE",'
                  f'$Q{r}/$N{r}))')
    v[f"W{r}"] = (f'=IF(NOT(ISNUMBER($N{r})),"",$N{r}-IF(ISNUMBER($V{r}),$V{r},0))')
    v[f"Y{r}"] = alerta(f'COUNTA($B{r},$C{r},$D{r},$E{r},$F{r},$I{r})=0', [
        (f'$B{r}=""', "Falta fecha"),
        (f'$D{r}=""', "Falta cliente"),
        (f'$E{r}=""', "Falta canal"),
        (f'$F{r}=""', "Falta SKU"),
        (f'AND($F{r}<>"",COUNTIF({T_PROD}[SKU],$F{r})=0)', "SKU no existe"),
        (f'OR($I{r}="",NOT(ISNUMBER($I{r})),$I{r}<=0)', "Cantidad inválida"),
        (f'$M{r}="PRECIO PENDIENTE"', "Falta precio de venta"),
        (f'$P{r}="COSTO PENDIENTE"', "Falta costo del producto"),
        (f'AND(ISNUMBER($Q{r}),$Q{r}<0)', "UTILIDAD NEGATIVA"),
        (f'AND($F{r}<>"",ISNUMBER({idx(T_INV, "Stock actual", T_INV, "SKU", F)}),'
         f'{idx(T_INV, "Stock actual", T_INV, "SKU", F)}<0)', "Stock negativo del SKU"),
        (f'AND($T{r}="Cobrado",$U{r}="")', "Cobro sin fecha"),
        (f'AND(ISNUMBER($V{r}),ISNUMBER($N{r}),$V{r}>N($N{r})+0.01)', "Cobrado > venta neta"),
        (f'AND(ISNUMBER($V{r}),$V{r}>0,$U{r}="")', "Monto cobrado sin fecha"),
    ])
    for cidx, (h, w, tipo, fmt) in enumerate(COLS_VENTAS, start=1):
        cel = v.cell(row=r, column=cidx)
        cel.number_format = fmt
        if tipo == "input":
            marcar_input(cel)
        elif tipo == "auto":
            cel.fill = FILL_AUTO
            cel.border = BORDE
            cel.font = F_NORMAL
            cel.protection = DESBLOQUEADA
        else:
            marcar_calc(cel)

add_table(v, T_VENTAS, f"A{HDR_VENTAS}:Y{F_VENTAS}", estilo="TableStyleMedium2")
v.freeze_panes = f"C{R_VENTAS}"
v.sheet_view.showGridLines = False
dv(v, f"D{R_VENTAS}:D{F_VENTAS}", "LISTA_CLIENTES")
dv(v, f"E{R_VENTAS}:E{F_VENTAS}", "LISTA_CANALES")
dv(v, f"F{R_VENTAS}:F{F_VENTAS}", "LISTA_SKU", permitir_otros=False)
dv(v, f"S{R_VENTAS}:S{F_VENTAS}", "LISTA_METODOS_PAGO")
dv(v, f"T{R_VENTAS}:T{F_VENTAS}", "LISTA_ESTADO_PAGO")
dv_numero(v, f"I{R_VENTAS}:I{F_VENTAS}", 0)
dv_numero(v, f"L{R_VENTAS}:L{F_VENTAS}", 0)
dv_numero(v, f"V{R_VENTAS}:V{F_VENTAS}", 0)
dv_fecha(v, f"B{R_VENTAS}:B{F_VENTAS}")
dv_fecha(v, f"U{R_VENTAS}:U{F_VENTAS}")
v.conditional_formatting.add(f"Y{R_VENTAS}:Y{F_VENTAS}", FormulaRule(
    formula=[f'AND($Y{R_VENTAS}<>"",$Y{R_VENTAS}<>"OK")'],
    font=Font(color=ROJO, bold=True), fill=PatternFill("solid", fgColor="FBE3E6")))
v.conditional_formatting.add(f"Y{R_VENTAS}:Y{F_VENTAS}", FormulaRule(
    formula=[f'$Y{R_VENTAS}="OK"'], font=Font(color=VERDE)))
v.conditional_formatting.add(f"Q{R_VENTAS}:R{F_VENTAS}", CellIsRule(
    operator="lessThan", formula=["0"], font=Font(color=ROJO, bold=True),
    fill=PatternFill("solid", fgColor="FBE3E6")))
v.conditional_formatting.add(f"W{R_VENTAS}:W{F_VENTAS}", CellIsRule(
    operator="greaterThan", formula=["0.01"], font=Font(color=AMBAR, bold=True)))


# =====================================================================
# 6. GASTOS — costos fijos y variables del negocio (no unitarios)
# =====================================================================
g = ws["GASTOS"]
titulo(g, "A1", "GASTOS — Operación del negocio",
       "Aquí van los gastos del negocio, NO los costos unitarios del producto (esos van en COSTOS). "
       "Clasifique cada gasto como Fijo (no depende de las ventas) o Variable (crece con las ventas).")
nota(g, "A3", "Los gastos FIJOS alimentan el PUNTO DE EQUILIBRIO. Los gastos de categoría «Publicidad» "
              "alimentan el ROAS. El efectivo sale de CAJA solo por el «Monto pagado» en su «Fecha de pago».")
g.merge_cells("A3:L4")
g["A3"].alignment = AL_IZQ_WRAP

COLS_GASTOS = [
    ("ID de gasto", 12, "calc", FMT_TEXTO),
    ("Fecha", 12, "input", FMT_FECHA),
    ("Tipo de gasto", 12, "input", FMT_TEXTO),
    ("Categoría", 20, "input", FMT_TEXTO),
    ("Descripción", 34, "input", FMT_TEXTO),
    ("Proveedor", 22, "input", FMT_TEXTO),
    ("Monto", 14, "input", FMT_MONEDA),
    ("Método de pago", 14, "input", FMT_TEXTO),
    ("Estado", 12, "input", FMT_TEXTO),
    ("Fecha de pago", 12, "input", FMT_FECHA),
    ("Monto pagado", 13, "input", FMT_MONEDA),
    ("Saldo por pagar", 13, "calc", FMT_MONEDA),
    ("Canal atribuido", 14, "input", FMT_TEXTO),
    ("Observaciones", 26, "input", FMT_TEXTO),
    ("ALERTA", 30, "calc", FMT_TEXTO),
]
encabezado_tabla(g, HDR_GASTOS, 1, [h[0] for h in COLS_GASTOS], alto=40)
for i, (h, w, tipo, fmt) in enumerate(COLS_GASTOS):
    g.column_dimensions[get_column_letter(i + 1)].width = w

for i in range(N_GASTOS):
    r = R_GASTOS + i
    g[f"A{r}"] = (f'=IF(COUNTA($B{r},$C{r},$D{r},$E{r},$G{r})=0,"",'
                  f'"G-"&TEXT(ROW()-{HDR_GASTOS},"0000"))')
    g[f"L{r}"] = f'=IF(NOT(ISNUMBER($G{r})),"",$G{r}-IF(ISNUMBER($K{r}),$K{r},0))'
    g[f"O{r}"] = alerta(f'COUNTA($B{r},$C{r},$D{r},$E{r},$G{r})=0', [
        (f'$B{r}=""', "Falta fecha"),
        (f'$C{r}=""', "Falta tipo (Fijo/Variable)"),
        (f'$D{r}=""', "SIN CATEGORÍA"),
        (f'$E{r}=""', "Falta descripción"),
        (f'OR($G{r}="",NOT(ISNUMBER($G{r})),$G{r}<=0)', "Monto inválido"),
        (f'AND($I{r}="Pagado",$J{r}="")', "Pago sin fecha"),
        (f'AND(ISNUMBER($K{r}),ISNUMBER($G{r}),$K{r}>N($G{r})+0.01)', "Pagado > monto"),
        (f'AND(ISNUMBER($K{r}),$K{r}>0,$J{r}="")', "Monto pagado sin fecha"),
    ])
    for cidx, (h, w, tipo, fmt) in enumerate(COLS_GASTOS, start=1):
        cel = g.cell(row=r, column=cidx)
        cel.number_format = fmt
        marcar_input(cel) if tipo == "input" else marcar_calc(cel)

add_table(g, T_GASTOS, f"A{HDR_GASTOS}:O{F_GASTOS}", estilo="TableStyleMedium2")
g.freeze_panes = f"C{R_GASTOS}"
g.sheet_view.showGridLines = False
dv(g, f"C{R_GASTOS}:C{F_GASTOS}", "LISTA_TIPO_GASTO", permitir_otros=False)
dv(g, f"D{R_GASTOS}:D{F_GASTOS}", "LISTA_CAT_GASTO")
dv(g, f"H{R_GASTOS}:H{F_GASTOS}", "LISTA_METODOS_PAGO")
dv(g, f"I{R_GASTOS}:I{F_GASTOS}", "LISTA_ESTADO_PAGO")
dv(g, f"M{R_GASTOS}:M{F_GASTOS}", "LISTA_CANALES")
dv_numero(g, f"G{R_GASTOS}:G{F_GASTOS}", 0)
dv_numero(g, f"K{R_GASTOS}:K{F_GASTOS}", 0)
dv_fecha(g, f"B{R_GASTOS}:B{F_GASTOS}")
dv_fecha(g, f"J{R_GASTOS}:J{F_GASTOS}")
g.conditional_formatting.add(f"O{R_GASTOS}:O{F_GASTOS}", FormulaRule(
    formula=[f'AND($O{R_GASTOS}<>"",$O{R_GASTOS}<>"OK")'],
    font=Font(color=ROJO, bold=True), fill=PatternFill("solid", fgColor="FBE3E6")))
g.conditional_formatting.add(f"O{R_GASTOS}:O{F_GASTOS}", FormulaRule(
    formula=[f'$O{R_GASTOS}="OK"'], font=Font(color=VERDE)))


# =====================================================================
# 7. INVENTARIO — derivado 100% de PRODUCTOS + COMPRAS + VENTAS
# =====================================================================
inv = ws["INVENTARIO"]
titulo(inv, "A1", "INVENTARIO — Existencias y valorización",
       "Hoja calculada: Stock actual = Stock inicial + Compras − Ventas + Ajustes. "
       "Solo se editan «Stock inicial» y «Ajustes» (mermas, devoluciones, conteos físicos).")
nota(inv, "A3", "Costo unitario aplicado = costo promedio ponderado de las compras registradas; si aún no hay "
                "compras, se usa el COSTO REAL UNITARIO de la hoja COSTOS. Si no existe ninguno de los dos, el "
                "inventario queda PENDIENTE de valorizar (nunca se inventa un costo).")
inv.merge_cells("A3:L4")
inv["A3"].alignment = AL_IZQ_WRAP

COLS_INV = [
    ("SKU", 13, "calc", FMT_TEXTO),
    ("Producto", 32, "calc", FMT_TEXTO),
    ("Categoría", 15, "calc", FMT_TEXTO),
    ("Presentación", 12, "calc", FMT_TEXTO),
    ("Stock inicial", 11, "input", FMT_NUM),
    ("Compras", 10, "calc", FMT_NUM),
    ("Ventas", 10, "calc", FMT_NUM),
    ("Ajustes", 10, "input", FMT_NUM),
    ("Stock actual", 12, "calc", FMT_NUM),
    ("Stock mínimo", 11, "calc", FMT_NUM),
    ("Stock máximo", 11, "calc", FMT_NUM),
    ("Costo unitario estándar", 12, "calc", FMT_MONEDA),
    ("Costo promedio ponderado", 13, "calc", FMT_MONEDA),
    ("Costo unitario aplicado", 13, "calc", FMT_MONEDA),
    ("Método de costo", 15, "calc", FMT_TEXTO),
    ("VALOR DEL INVENTARIO", 16, "calc", FMT_MONEDA),
    ("Precio de venta actual", 13, "calc", FMT_MONEDA),
    ("Valor a precio de venta", 14, "calc", FMT_MONEDA),
    ("ESTADO", 15, "calc", FMT_TEXTO),
    ("Unidades sugeridas a comprar", 13, "calc", FMT_NUM),
    ("Última compra", 12, "calc", FMT_FECHA),
    ("Última venta", 12, "calc", FMT_FECHA),
    ("Unidades vendidas (últimos 30 días)", 13, "calc", FMT_NUM),
    ("Cobertura estimada (días)", 12, "calc", FMT_NUM),
]
encabezado_tabla(inv, HDR_INV, 1, [h[0] for h in COLS_INV], alto=46)
for i, (h, w, tipo, fmt) in enumerate(COLS_INV):
    inv.column_dimensions[get_column_letter(i + 1)].width = w

for i in range(N_PROD):
    r = R_INV + i
    A = f"$A{r}"
    inv[f"A{r}"] = f'=IFERROR(IF(INDEX({T_PROD}[SKU],ROW()-{HDR_INV})="","",INDEX({T_PROD}[SKU],ROW()-{HDR_INV})),"")'
    inv[f"B{r}"] = guard(f'{A}=""', buscar(T_PROD, "Nombre del producto", A))
    inv[f"C{r}"] = guard(f'{A}=""', buscar(T_PROD, "Categoría", A))
    inv[f"D{r}"] = guard(f'{A}=""', buscar(T_PROD, "Presentación", A))
    inv[f"F{r}"] = guard(f'{A}=""', f'SUMIFS({T_COMPRAS}[Cantidad],{T_COMPRAS}[SKU],{A})')
    inv[f"G{r}"] = guard(f'{A}=""', f'SUMIFS({T_VENTAS}[Unidades efectivas],{T_VENTAS}[SKU],{A})')
    inv[f"I{r}"] = guard(f'{A}=""',
                         f'IF(ISNUMBER($E{r}),$E{r},0)+$F{r}-$G{r}+IF(ISNUMBER($H{r}),$H{r},0)')
    inv[f"J{r}"] = guard(f'{A}=""', buscar(T_PROD, "Stock mínimo", A))
    inv[f"K{r}"] = guard(f'{A}=""', buscar(T_PROD, "Stock máximo", A))
    inv[f"L{r}"] = guard(f'{A}=""', buscar(T_COST, "COSTO REAL UNITARIO", A, si_falta='"PENDIENTE"'))
    inv[f"M{r}"] = (f'=IF({A}="","",IF(SUMIFS({T_COMPRAS}[Cantidad],{T_COMPRAS}[SKU],{A})<=0,"",'
                    f'SUMIFS({T_COMPRAS}[Costo total de adquisición],{T_COMPRAS}[SKU],{A})/'
                    f'SUMIFS({T_COMPRAS}[Cantidad],{T_COMPRAS}[SKU],{A})))')
    inv[f"N{r}"] = (f'=IF({A}="","",IF(ISNUMBER($M{r}),$M{r},IF(ISNUMBER($L{r}),$L{r},"")))')
    inv[f"O{r}"] = (f'=IF({A}="","",IF(ISNUMBER($M{r}),"Promedio ponderado",'
                    f'IF(ISNUMBER($L{r}),"Costo estándar","PENDIENTE")))')
    inv[f"P{r}"] = (f'=IF({A}="","",IF(OR(NOT(ISNUMBER($I{r})),NOT(ISNUMBER($N{r}))),"PENDIENTE",$I{r}*$N{r}))')
    inv[f"Q{r}"] = guard(f'{A}=""', buscar(T_PROD, "Precio de venta actual", A, si_falta='"PENDIENTE"'))
    inv[f"R{r}"] = (f'=IF({A}="","",IF(OR(NOT(ISNUMBER($I{r})),NOT(ISNUMBER($Q{r}))),"PENDIENTE",$I{r}*$Q{r}))')
    inv[f"S{r}"] = (f'=IF({A}="","",'
                    f'IF(NOT(ISNUMBER($I{r})),"ERROR",'
                    f'IF($I{r}<0,"ERROR",'
                    f'IF($I{r}=0,"AGOTADO",'
                    f'IF(AND(ISNUMBER($J{r}),$I{r}<=N($J{r})*MAX(1,IF(ISNUMBER(PAR_ALERTA_STOCK),PAR_ALERTA_STOCK,1))),'
                    f'"REABASTECER","OK")))))')
    inv[f"T{r}"] = (f'=IF({A}="","",IF(OR(NOT(ISNUMBER($I{r})),NOT(ISNUMBER($K{r}))),"",'
                    f'IF(OR($S{r}="REABASTECER",$S{r}="AGOTADO"),MAX(0,$K{r}-$I{r}),0)))')
    inv[f"U{r}"] = (f'=IF({A}="","",IFERROR(IF(SUMPRODUCT(MAX(({T_COMPRAS}[SKU]={A})*'
                    f'({T_COMPRAS}[Fecha])))=0,"",SUMPRODUCT(MAX(({T_COMPRAS}[SKU]={A})*'
                    f'({T_COMPRAS}[Fecha])))),""))')
    inv[f"V{r}"] = (f'=IF({A}="","",IFERROR(IF(SUMPRODUCT(MAX(({T_VENTAS}[SKU]={A})*'
                    f'({T_VENTAS}[Fecha])))=0,"",SUMPRODUCT(MAX(({T_VENTAS}[SKU]={A})*'
                    f'({T_VENTAS}[Fecha])))),""))')
    inv[f"W{r}"] = (f'=IF({A}="","",SUMIFS({T_VENTAS}[Unidades efectivas],{T_VENTAS}[SKU],{A},'
                    f'{T_VENTAS}[Fecha],">="&TODAY()-30,{T_VENTAS}[Fecha],"<="&TODAY()))')
    inv[f"X{r}"] = (f'=IF({A}="","",IF(OR(NOT(ISNUMBER($I{r})),NOT(ISNUMBER($W{r})),$W{r}<=0),"",'
                    f'ROUND($I{r}/($W{r}/30),0)))')
    for cidx, (h, w, tipo, fmt) in enumerate(COLS_INV, start=1):
        cel = inv.cell(row=r, column=cidx)
        cel.number_format = fmt
        marcar_input(cel) if tipo == "input" else marcar_calc(cel)
    inv[f"P{r}"].font = F_BOLD
    inv[f"S{r}"].alignment = AL_CENTRO

add_table(inv, T_INV, f"A{HDR_INV}:X{F_INV}", estilo="TableStyleMedium7")
inv.freeze_panes = f"C{R_INV}"
inv.sheet_view.showGridLines = False
dv_numero(inv, f"E{R_INV}:E{F_INV}", 0)
rng_estado_inv = f"S{R_INV}:S{F_INV}"
inv.conditional_formatting.add(rng_estado_inv, FormulaRule(
    formula=[f'$S{R_INV}="OK"'], font=Font(color=VERDE, bold=True),
    fill=PatternFill("solid", fgColor="E3F4EA")))
inv.conditional_formatting.add(rng_estado_inv, FormulaRule(
    formula=[f'$S{R_INV}="REABASTECER"'], font=Font(color=AMBAR, bold=True),
    fill=PatternFill("solid", fgColor="FFF3D6")))
inv.conditional_formatting.add(rng_estado_inv, FormulaRule(
    formula=[f'OR($S{R_INV}="AGOTADO",$S{R_INV}="ERROR")'], font=Font(color=ROJO, bold=True),
    fill=PatternFill("solid", fgColor="FBE3E6")))
inv.conditional_formatting.add(f"I{R_INV}:I{F_INV}", CellIsRule(
    operator="lessThan", formula=["0"], font=Font(color=ROJO, bold=True),
    fill=PatternFill("solid", fgColor="FBE3E6")))
inv.conditional_formatting.add(f"P{R_INV}:P{F_INV}", DataBarRule(
    start_type="num", start_value=0, end_type="max", color="2E5C8A"))


# =====================================================================
# 8. RENTABILIDAD — estado de resultados mensual + análisis por producto,
#    categoría y canal. Es el motor analítico del que bebe el DASHBOARD.
# =====================================================================
re_ = ws["RENTABILIDAD"]
titulo(re_, "A1", "RENTABILIDAD — Estado de resultados y análisis",
       "Hoja 100% calculada a partir de VENTAS, COSTOS, COMPRAS y GASTOS. No se escribe nada aquí.")
nota(re_, "A3", "Criterio contable: las ventas y los gastos se reconocen por su FECHA (devengo), no por su cobro o "
                "pago. El movimiento de efectivo está en la hoja CAJA. Por eso UTILIDAD ≠ EFECTIVO.")
re_.merge_cells("A3:N4")
re_["A3"].alignment = AL_IZQ_WRAP

# ---- Bloque 1: estado de resultados mensual --------------------------------
RENT_BANDA_MES = 6
RENT_HDR_MES = 7
RENT_R_MES = RENT_HDR_MES + 1
RENT_F_MES = RENT_R_MES + N_MESES - 1
RENT_TOT_MES = RENT_F_MES + 1

COLS_RENT_MES = [
    ("Mes", 12, FMT_MES), ("Ventas brutas", 14, FMT_MONEDA), ("Descuentos", 12, FMT_MONEDA),
    ("VENTAS NETAS", 15, FMT_MONEDA), ("Unidades vendidas", 11, FMT_NUM),
    ("Costo de ventas", 14, FMT_MONEDA), ("UTILIDAD BRUTA", 15, FMT_MONEDA),
    ("Margen bruto %", 11, FMT_PCT), ("Gastos fijos", 13, FMT_MONEDA),
    ("Gastos variables", 13, FMT_MONEDA), ("Gastos operativos", 14, FMT_MONEDA),
    ("Utilidad operativa", 15, FMT_MONEDA), ("Otros ingresos", 12, FMT_MONEDA),
    ("Otros egresos", 12, FMT_MONEDA), ("UTILIDAD NETA", 15, FMT_MONEDA),
    ("Margen neto %", 11, FMT_PCT), ("Transacciones", 11, FMT_NUM),
    ("Ticket promedio", 13, FMT_MONEDA), ("Utilidad promedio por unidad", 13, FMT_MONEDA),
    ("Gasto en publicidad", 13, FMT_MONEDA), ("ROAS", 10, FMT_NUM2),
    ("Compras del mes", 14, FMT_MONEDA), ("ROI del mes", 11, FMT_PCT),
    ("Ventas netas acumuladas", 15, FMT_MONEDA), ("Utilidad neta acumulada", 15, FMT_MONEDA),
]
banda(re_, RENT_BANDA_MES, 1, len(COLS_RENT_MES), "1 · ESTADO DE RESULTADOS MENSUAL")
encabezado_tabla(re_, RENT_HDR_MES, 1, [c[0] for c in COLS_RENT_MES], alto=44)
for i, (h, w, fmt) in enumerate(COLS_RENT_MES):
    re_.column_dimensions[get_column_letter(i + 1)].width = w

for i in range(N_MESES):
    r = RENT_R_MES + i
    A = f"$A{r}"
    ini, fin = f'">="&{A}', f'"<"&DATE(YEAR({A}),MONTH({A})+1,1)'
    fv = f"{T_VENTAS}[Fecha]"
    fg = f"{T_GASTOS}[Fecha]"
    fc = f"{T_COMPRAS}[Fecha]"
    re_[f"A{r}"] = (f'=IF(NOT(ISNUMBER(PAR_FECHA_INICIO)),"",'
                    f'DATE(YEAR(PAR_FECHA_INICIO),MONTH(PAR_FECHA_INICIO)+{i},1))')
    re_[f"B{r}"] = guard(f'{A}=""', f'SUMIFS({T_VENTAS}[Venta bruta],{fv},{ini},{fv},{fin})')
    re_[f"C{r}"] = guard(f'{A}=""', f'SUMIFS({T_VENTAS}[Descuento],{fv},{ini},{fv},{fin})')
    re_[f"D{r}"] = guard(f'{A}=""', f'SUMIFS({T_VENTAS}[Venta neta],{fv},{ini},{fv},{fin})')
    re_[f"E{r}"] = guard(f'{A}=""', f'SUMIFS({T_VENTAS}[Unidades efectivas],{fv},{ini},{fv},{fin})')
    re_[f"F{r}"] = guard(f'{A}=""', f'SUMIFS({T_VENTAS}[Costo total],{fv},{ini},{fv},{fin})')
    re_[f"G{r}"] = guard(f'{A}=""', f'$D{r}-$F{r}')
    re_[f"H{r}"] = guard(f'OR({A}="",$D{r}=0)', f'$G{r}/$D{r}')
    re_[f"I{r}"] = guard(f'{A}=""', f'SUMIFS({T_GASTOS}[Monto],{T_GASTOS}[Tipo de gasto],"Fijo",{fg},{ini},{fg},{fin})')
    re_[f"J{r}"] = guard(f'{A}=""', f'SUMIFS({T_GASTOS}[Monto],{T_GASTOS}[Tipo de gasto],"Variable",{fg},{ini},{fg},{fin})')
    re_[f"K{r}"] = guard(f'{A}=""', f'$I{r}+$J{r}')
    re_[f"L{r}"] = guard(f'{A}=""', f'$G{r}-$K{r}')
    re_[f"M{r}"] = guard(f'{A}=""', f'SUMIFS({T_CAJAMOV}[Monto],{T_CAJAMOV}[Concepto],"Otro ingreso",'
                                    f'{T_CAJAMOV}[Fecha],{ini},{T_CAJAMOV}[Fecha],{fin})')
    re_[f"N{r}"] = guard(f'{A}=""', f'SUMIFS({T_CAJAMOV}[Monto],{T_CAJAMOV}[Concepto],"Otro egreso",'
                                    f'{T_CAJAMOV}[Fecha],{ini},{T_CAJAMOV}[Fecha],{fin})')
    re_[f"O{r}"] = guard(f'{A}=""', f'$L{r}+$M{r}-$N{r}')
    re_[f"P{r}"] = guard(f'OR({A}="",$D{r}=0)', f'$O{r}/$D{r}')
    re_[f"Q{r}"] = guard(f'{A}=""', f'COUNTIFS({fv},{ini},{fv},{fin})')
    re_[f"R{r}"] = guard(f'OR({A}="",$Q{r}=0)', f'$D{r}/$Q{r}')
    re_[f"S{r}"] = guard(f'OR({A}="",$E{r}=0)', f'$G{r}/$E{r}')
    re_[f"T{r}"] = guard(f'{A}=""', f'SUMIFS({T_GASTOS}[Monto],{T_GASTOS}[Categoría],"Publicidad",{fg},{ini},{fg},{fin})')
    re_[f"U{r}"] = guard(f'OR({A}="",$T{r}=0)', f'$D{r}/$T{r}')
    re_[f"V{r}"] = guard(f'{A}=""', f'SUMIFS({T_COMPRAS}[Costo total de adquisición],{fc},{ini},{fc},{fin})')
    re_[f"W{r}"] = guard(f'OR({A}="",($V{r}+$K{r})=0)', f'$O{r}/($V{r}+$K{r})')
    re_[f"X{r}"] = guard(f'{A}=""', f'SUM($D${RENT_R_MES}:$D{r})')
    re_[f"Y{r}"] = guard(f'{A}=""', f'SUM($O${RENT_R_MES}:$O{r})')
    for cidx, (h, w, fmt) in enumerate(COLS_RENT_MES, start=1):
        cel = re_.cell(row=r, column=cidx)
        cel.number_format = fmt
        marcar_calc(cel)
    for letra in ("D", "G", "O"):
        re_[f"{letra}{r}"].font = F_BOLD

re_.cell(row=RENT_TOT_MES, column=1, value="TOTAL").font = Font(bold=True, color=BLANCO)
for cidx, (h, w, fmt) in enumerate(COLS_RENT_MES, start=1):
    cel = re_.cell(row=RENT_TOT_MES, column=cidx)
    cel.fill = FILL_HEADER2
    cel.font = Font(name="Calibri", size=10, bold=True, color=BLANCO)
    cel.border = BORDE
    cel.number_format = fmt
    letra = get_column_letter(cidx)
    if letra == "A":
        continue
    if letra in ("H", "P"):     # márgenes: se recalculan, no se suman
        base = "D"
        num = "G" if letra == "H" else "O"
        cel.value = (f'=IF(SUM(${base}${RENT_R_MES}:${base}${RENT_F_MES})=0,"",'
                     f'SUM(${num}${RENT_R_MES}:${num}${RENT_F_MES})/SUM(${base}${RENT_R_MES}:${base}${RENT_F_MES}))')
    elif letra == "R":
        cel.value = (f'=IF(SUM($Q${RENT_R_MES}:$Q${RENT_F_MES})=0,"",'
                     f'SUM($D${RENT_R_MES}:$D${RENT_F_MES})/SUM($Q${RENT_R_MES}:$Q${RENT_F_MES}))')
    elif letra == "S":
        cel.value = (f'=IF(SUM($E${RENT_R_MES}:$E${RENT_F_MES})=0,"",'
                     f'SUM($G${RENT_R_MES}:$G${RENT_F_MES})/SUM($E${RENT_R_MES}:$E${RENT_F_MES}))')
    elif letra == "U":
        cel.value = (f'=IF(SUM($T${RENT_R_MES}:$T${RENT_F_MES})=0,"",'
                     f'SUM($D${RENT_R_MES}:$D${RENT_F_MES})/SUM($T${RENT_R_MES}:$T${RENT_F_MES}))')
    elif letra == "W":
        cel.value = (f'=IF((SUM($V${RENT_R_MES}:$V${RENT_F_MES})+SUM($K${RENT_R_MES}:$K${RENT_F_MES}))=0,"",'
                     f'SUM($O${RENT_R_MES}:$O${RENT_F_MES})/(SUM($V${RENT_R_MES}:$V${RENT_F_MES})'
                     f'+SUM($K${RENT_R_MES}:$K${RENT_F_MES})))')
    elif letra in ("X", "Y"):
        cel.value = f'=IF(COUNT(${letra}${RENT_R_MES}:${letra}${RENT_F_MES})=0,"",MAX(${letra}${RENT_R_MES}:${letra}${RENT_F_MES}))'
    else:
        cel.value = f'=SUM(${letra}${RENT_R_MES}:${letra}${RENT_F_MES})'

re_.conditional_formatting.add(f"O{RENT_R_MES}:O{RENT_F_MES}", CellIsRule(
    operator="lessThan", formula=["0"], font=Font(color=ROJO, bold=True)))
re_.conditional_formatting.add(f"G{RENT_R_MES}:G{RENT_F_MES}", CellIsRule(
    operator="lessThan", formula=["0"], font=Font(color=ROJO, bold=True)))


# ---- Bloque 2: análisis por producto (columnas AA..AO) ----------------------
CP_INI = 27          # AA
RENT_HDR_PROD = RENT_HDR_MES
RENT_R_PROD = RENT_HDR_PROD + 1
RENT_F_PROD = RENT_R_PROD + N_PROD - 1
RENT_TOT_PROD = RENT_F_PROD + 1
L = get_column_letter

COLS_RENT_PROD = [
    ("SKU", 13, FMT_TEXTO), ("Producto", 32, FMT_TEXTO), ("Categoría", 15, FMT_TEXTO),
    ("Unidades vendidas", 11, FMT_NUM), ("Ventas netas", 14, FMT_MONEDA),
    ("Costo de ventas", 14, FMT_MONEDA), ("Utilidad bruta", 14, FMT_MONEDA),
    ("Margen bruto %", 11, FMT_PCT), ("% de las ventas", 11, FMT_PCT),
    ("% de la utilidad", 11, FMT_PCT), ("Ranking por utilidad", 10, FMT_NUM),
    ("Ranking por unidades", 10, FMT_NUM), ("Utilidad promedio por unidad", 12, FMT_MONEDA),
    ("Margen de contribución unitario", 12, FMT_MONEDA), ("Clave orden (interna)", 11, FMT_NUM2),
    ("Clave orden unidades (interna)", 11, FMT_NUM2),
]
banda(re_, RENT_BANDA_MES, CP_INI, CP_INI + len(COLS_RENT_PROD) - 1, "2 · RENTABILIDAD POR PRODUCTO")
encabezado_tabla(re_, RENT_HDR_PROD, CP_INI, [c[0] for c in COLS_RENT_PROD], alto=44)
for i, (h, w, fmt) in enumerate(COLS_RENT_PROD):
    re_.column_dimensions[L(CP_INI + i)].width = w
CPC = {h: L(CP_INI + i) for i, (h, w, f) in enumerate(COLS_RENT_PROD)}

for i in range(N_PROD):
    r = RENT_R_PROD + i
    A = f"${CPC['SKU']}{r}"
    re_[f"{CPC['SKU']}{r}"] = (f'=IFERROR(IF(INDEX({T_PROD}[SKU],ROW()-{RENT_HDR_PROD})="","",'
                               f'INDEX({T_PROD}[SKU],ROW()-{RENT_HDR_PROD})),"")')
    _nom = buscar(T_PROD, "Nombre del producto", A)
    _pre = buscar(T_PROD, "Presentación", A)
    re_[f"{CPC['Producto']}{r}"] = guard(
        f'{A}=""', f'{_nom}&IF({_pre}="",""," · "&{_pre})')
    re_[f"{CPC['Categoría']}{r}"] = guard(f'{A}=""', buscar(T_PROD, "Categoría", A))
    re_[f"{CPC['Unidades vendidas']}{r}"] = guard(
        f'{A}=""', f'SUMIFS({T_VENTAS}[Unidades efectivas],{T_VENTAS}[SKU],{A})')
    re_[f"{CPC['Ventas netas']}{r}"] = guard(
        f'{A}=""', f'SUMIFS({T_VENTAS}[Venta neta],{T_VENTAS}[SKU],{A})')
    re_[f"{CPC['Costo de ventas']}{r}"] = guard(
        f'{A}=""', f'SUMIFS({T_VENTAS}[Costo total],{T_VENTAS}[SKU],{A})')
    ven, cos = f"${CPC['Ventas netas']}{r}", f"${CPC['Costo de ventas']}{r}"
    uti = f"${CPC['Utilidad bruta']}{r}"
    uni = f"${CPC['Unidades vendidas']}{r}"
    re_[f"{CPC['Utilidad bruta']}{r}"] = guard(f'{A}=""', f'{ven}-{cos}')
    re_[f"{CPC['Margen bruto %']}{r}"] = guard(f'OR({A}="",{ven}=0)', f'{uti}/{ven}')
    tot_ven = f"SUM(${CPC['Ventas netas']}${RENT_R_PROD}:${CPC['Ventas netas']}${RENT_F_PROD})"
    tot_uti = f"SUM(${CPC['Utilidad bruta']}${RENT_R_PROD}:${CPC['Utilidad bruta']}${RENT_F_PROD})"
    re_[f"{CPC['% de las ventas']}{r}"] = guard(f'OR({A}="",{tot_ven}=0)', f'{ven}/{tot_ven}')
    re_[f"{CPC['% de la utilidad']}{r}"] = guard(f'OR({A}="",{tot_uti}=0)', f'{uti}/{tot_uti}')
    re_[f"{CPC['Ranking por utilidad']}{r}"] = guard(
        f'OR({A}="",{ven}=0)',
        f'RANK({uti},${CPC["Utilidad bruta"]}${RENT_R_PROD}:${CPC["Utilidad bruta"]}${RENT_F_PROD})')
    re_[f"{CPC['Ranking por unidades']}{r}"] = guard(
        f'OR({A}="",{uni}=0)',
        f'RANK({uni},${CPC["Unidades vendidas"]}${RENT_R_PROD}:${CPC["Unidades vendidas"]}${RENT_F_PROD})')
    re_[f"{CPC['Utilidad promedio por unidad']}{r}"] = guard(f'OR({A}="",{uni}=0)', f'{uti}/{uni}')
    re_[f"{CPC['Margen de contribución unitario']}{r}"] = guard(
        f'{A}=""', buscar(T_PROD, "Margen de contribución unitario", A, si_falta='"PENDIENTE"'))
    # clave de orden: utilidad con desempate por fila (para los rankings del DASHBOARD)
    re_[f"{CPC['Clave orden (interna)']}{r}"] = guard(
        f'OR({A}="",NOT(ISNUMBER({uti})))', f'{uti}-ROW()/100000')
    re_[f"{CPC['Clave orden unidades (interna)']}{r}"] = guard(
        f'OR({A}="",NOT(ISNUMBER({uni})))', f'{uni}-ROW()/100000')
    for j, (h, w, fmt) in enumerate(COLS_RENT_PROD):
        cel = re_.cell(row=r, column=CP_INI + j)
        cel.number_format = fmt
        marcar_calc(cel)

re_.cell(row=RENT_TOT_PROD, column=CP_INI, value="TOTAL")
for j, (h, w, fmt) in enumerate(COLS_RENT_PROD):
    cel = re_.cell(row=RENT_TOT_PROD, column=CP_INI + j)
    cel.fill = FILL_HEADER2
    cel.font = Font(name="Calibri", size=10, bold=True, color=BLANCO)
    cel.border = BORDE
    cel.number_format = fmt
    letra = L(CP_INI + j)
    if h in ("Unidades vendidas", "Ventas netas", "Costo de ventas", "Utilidad bruta"):
        cel.value = f'=SUM(${letra}${RENT_R_PROD}:${letra}${RENT_F_PROD})'
    elif h == "Margen bruto %":
        cel.value = (f'=IF(SUM(${CPC["Ventas netas"]}${RENT_R_PROD}:${CPC["Ventas netas"]}${RENT_F_PROD})=0,"",'
                     f'SUM(${CPC["Utilidad bruta"]}${RENT_R_PROD}:${CPC["Utilidad bruta"]}${RENT_F_PROD})/'
                     f'SUM(${CPC["Ventas netas"]}${RENT_R_PROD}:${CPC["Ventas netas"]}${RENT_F_PROD}))')
    elif h == "TOTAL" or j == 0:
        cel.value = "TOTAL"


# ---- Bloque 3: por categoría (columnas AR..AX) ------------------------------
CC_INI = 44          # AR
N_CATS = 15
RENT_R_CAT = RENT_HDR_MES + 1
RENT_F_CAT = RENT_R_CAT + N_CATS - 1
COLS_RENT_CAT = [("Categoría", 20, FMT_TEXTO), ("Unidades vendidas", 11, FMT_NUM),
                 ("Ventas netas", 14, FMT_MONEDA), ("Costo de ventas", 14, FMT_MONEDA),
                 ("Utilidad bruta", 14, FMT_MONEDA), ("Margen bruto %", 11, FMT_PCT),
                 ("% de las ventas", 11, FMT_PCT)]
banda(re_, RENT_BANDA_MES, CC_INI, CC_INI + len(COLS_RENT_CAT) - 1, "3 · POR CATEGORÍA")
encabezado_tabla(re_, RENT_HDR_MES, CC_INI, [c[0] for c in COLS_RENT_CAT], alto=44)
for i, (h, w, fmt) in enumerate(COLS_RENT_CAT):
    re_.column_dimensions[L(CC_INI + i)].width = w
CCC = {h: L(CC_INI + i) for i, (h, w, f) in enumerate(COLS_RENT_CAT)}

for i in range(N_CATS):
    r = RENT_R_CAT + i
    A = f"${CCC['Categoría']}{r}"
    re_[f"{CCC['Categoría']}{r}"] = f'=IF(CONFIG!$B${FILA_LISTAS + i}="","",CONFIG!$B${FILA_LISTAS + i})'
    re_[f"{CCC['Unidades vendidas']}{r}"] = guard(
        f'{A}=""', f'SUMIFS({T_VENTAS}[Unidades efectivas],{T_VENTAS}[Categoría],{A})')
    re_[f"{CCC['Ventas netas']}{r}"] = guard(
        f'{A}=""', f'SUMIFS({T_VENTAS}[Venta neta],{T_VENTAS}[Categoría],{A})')
    re_[f"{CCC['Costo de ventas']}{r}"] = guard(
        f'{A}=""', f'SUMIFS({T_VENTAS}[Costo total],{T_VENTAS}[Categoría],{A})')
    ven = f"${CCC['Ventas netas']}{r}"
    re_[f"{CCC['Utilidad bruta']}{r}"] = guard(f'{A}=""', f'{ven}-${CCC["Costo de ventas"]}{r}')
    re_[f"{CCC['Margen bruto %']}{r}"] = guard(f'OR({A}="",{ven}=0)', f'${CCC["Utilidad bruta"]}{r}/{ven}')
    tot = f"SUM(${CCC['Ventas netas']}${RENT_R_CAT}:${CCC['Ventas netas']}${RENT_F_CAT})"
    re_[f"{CCC['% de las ventas']}{r}"] = guard(f'OR({A}="",{tot}=0)', f'{ven}/{tot}')
    for j, (h, w, fmt) in enumerate(COLS_RENT_CAT):
        cel = re_.cell(row=r, column=CC_INI + j)
        cel.number_format = fmt
        marcar_calc(cel)


# ---- Bloque 4: por canal (columnas AZ..BH) ----------------------------------
CH_INI = 52          # AZ
N_CANALES = 15
RENT_R_CAN = RENT_HDR_MES + 1
RENT_F_CAN = RENT_R_CAN + N_CANALES - 1
COLS_RENT_CAN = [("Canal", 20, FMT_TEXTO), ("Unidades vendidas", 11, FMT_NUM),
                 ("Ventas netas", 14, FMT_MONEDA), ("Costo de ventas", 14, FMT_MONEDA),
                 ("Utilidad bruta", 14, FMT_MONEDA), ("Margen bruto %", 11, FMT_PCT),
                 ("% de las ventas", 11, FMT_PCT), ("Publicidad del canal", 13, FMT_MONEDA),
                 ("ROAS del canal", 11, FMT_NUM2)]
banda(re_, RENT_BANDA_MES, CH_INI, CH_INI + len(COLS_RENT_CAN) - 1, "4 · POR CANAL DE VENTA")
encabezado_tabla(re_, RENT_HDR_MES, CH_INI, [c[0] for c in COLS_RENT_CAN], alto=44)
for i, (h, w, fmt) in enumerate(COLS_RENT_CAN):
    re_.column_dimensions[L(CH_INI + i)].width = w
CHC = {h: L(CH_INI + i) for i, (h, w, f) in enumerate(COLS_RENT_CAN)}

for i in range(N_CANALES):
    r = RENT_R_CAN + i
    A = f"${CHC['Canal']}{r}"
    re_[f"{CHC['Canal']}{r}"] = f'=IF(CONFIG!$F${FILA_LISTAS + i}="","",CONFIG!$F${FILA_LISTAS + i})'
    re_[f"{CHC['Unidades vendidas']}{r}"] = guard(
        f'{A}=""', f'SUMIFS({T_VENTAS}[Unidades efectivas],{T_VENTAS}[Canal],{A})')
    re_[f"{CHC['Ventas netas']}{r}"] = guard(
        f'{A}=""', f'SUMIFS({T_VENTAS}[Venta neta],{T_VENTAS}[Canal],{A})')
    re_[f"{CHC['Costo de ventas']}{r}"] = guard(
        f'{A}=""', f'SUMIFS({T_VENTAS}[Costo total],{T_VENTAS}[Canal],{A})')
    ven = f"${CHC['Ventas netas']}{r}"
    re_[f"{CHC['Utilidad bruta']}{r}"] = guard(f'{A}=""', f'{ven}-${CHC["Costo de ventas"]}{r}')
    re_[f"{CHC['Margen bruto %']}{r}"] = guard(f'OR({A}="",{ven}=0)', f'${CHC["Utilidad bruta"]}{r}/{ven}')
    tot = f"SUM(${CHC['Ventas netas']}${RENT_R_CAN}:${CHC['Ventas netas']}${RENT_F_CAN})"
    re_[f"{CHC['% de las ventas']}{r}"] = guard(f'OR({A}="",{tot}=0)', f'{ven}/{tot}')
    re_[f"{CHC['Publicidad del canal']}{r}"] = guard(
        f'{A}=""', f'SUMIFS({T_GASTOS}[Monto],{T_GASTOS}[Categoría],"Publicidad",{T_GASTOS}[Canal atribuido],{A})')
    re_[f"{CHC['ROAS del canal']}{r}"] = guard(
        f'OR({A}="",${CHC["Publicidad del canal"]}{r}=0)', f'{ven}/${CHC["Publicidad del canal"]}{r}')
    for j, (h, w, fmt) in enumerate(COLS_RENT_CAN):
        cel = re_.cell(row=r, column=CH_INI + j)
        cel.number_format = fmt
        marcar_calc(cel)


# ---- Bloque 5: resumen acumulado, inversión y ROI (columnas BJ..BL) ---------
RS_INI = 62          # BJ
re_.column_dimensions[L(RS_INI)].width = 44
re_.column_dimensions[L(RS_INI + 1)].width = 20
re_.column_dimensions[L(RS_INI + 2)].width = 60
banda(re_, RENT_BANDA_MES, RS_INI, RS_INI + 2, "5 · RESUMEN ACUMULADO, INVERSIÓN Y RETORNO")
encabezado_tabla(re_, RENT_HDR_MES, RS_INI, ["Indicador acumulado", "Valor", "Cómo se calcula / qué significa"], alto=26)

TOTM = RENT_TOT_MES
RESUMEN = [
    ("SECCIÓN", "VENTAS", "", ""),
    ("Ventas netas acumuladas", f'=$D${TOTM}', FMT_MONEDA, "Suma de todas las ventas netas registradas (ventas brutas − descuentos)."),
    ("Unidades vendidas", f'=$E${TOTM}', FMT_NUM, "Unidades efectivas (excluye ventas anuladas)."),
    ("Transacciones (líneas de venta)", f'=$Q${TOTM}', FMT_NUM, "Cada fila de la hoja VENTAS cuenta como una transacción."),
    ("Ticket promedio", f'=$R${TOTM}', FMT_MONEDA, "Ventas netas ÷ número de líneas de venta."),
    ("SECCIÓN", "RENTABILIDAD", "", ""),
    ("Costo de ventas acumulado", f'=$F${TOTM}', FMT_MONEDA, "Costo de la mercadería efectivamente vendida (no lo comprado)."),
    ("Utilidad bruta acumulada", f'=$G${TOTM}', FMT_MONEDA, "Ventas netas − costo de ventas."),
    ("Margen bruto %", f'=$H${TOTM}', FMT_PCT, "Utilidad bruta ÷ ventas netas."),
    ("Gastos fijos acumulados", f'=$I${TOTM}', FMT_MONEDA, "Gastos que no dependen del volumen de ventas."),
    ("Gastos variables acumulados", f'=$J${TOTM}', FMT_MONEDA, "Gastos que crecen con las ventas."),
    ("Utilidad operativa acumulada", f'=$L${TOTM}', FMT_MONEDA, "Utilidad bruta − gastos operativos."),
    ("UTILIDAD NETA ACUMULADA", f'=$O${TOTM}', FMT_MONEDA, "Utilidad operativa + otros ingresos − otros egresos."),
    ("Margen neto %", f'=$P${TOTM}', FMT_PCT, "Utilidad neta ÷ ventas netas."),
    ("SECCIÓN", "INVERSIÓN, CAPITAL Y RETORNO", "", ""),
    ("Compras acumuladas (costo de adquisición)", f'=SUM({T_COMPRAS}[Costo total de adquisición])', FMT_MONEDA,
     "Todo lo invertido en mercadería, incluyendo transporte e impuestos."),
    ("Gastos acumulados", f'=$K${TOTM}', FMT_MONEDA, "Gastos fijos + variables."),
    ("Inversión total acumulada", f'=SUM({T_COMPRAS}[Costo total de adquisición])+$K${TOTM}', FMT_MONEDA,
     "Compras + gastos. Es la base del ROI operativo."),
    ("ROI sobre la inversión", None, FMT_PCT,
     "Utilidad neta acumulada ÷ inversión total acumulada. Mide cuánto rinde cada lempira invertido en el negocio."),
    ("Capital aportado por el propietario", None, FMT_MONEDA,
     "Capital inicial (CONFIG) + aportes registrados en CAJA. PENDIENTE hasta que lo registre."),
    ("ROI sobre el capital aportado", None, FMT_PCT, "Utilidad neta acumulada ÷ capital aportado."),
    ("Valor del inventario (capital inmovilizado)", f'=SUMIF({T_INV}[VALOR DEL INVENTARIO],"<>PENDIENTE")', FMT_MONEDA,
     "Dinero que está dentro de las cajas del inventario, no en su bolsillo."),
    ("Cuentas por cobrar", f'=SUMIF({T_VENTAS}[Saldo por cobrar],">0")', FMT_MONEDA,
     "Ventas ya realizadas que aún no le han pagado."),
    ("Cuentas por pagar", f'=SUMIF({T_COMPRAS}[Saldo por pagar],">0")+SUMIF({T_GASTOS}[Saldo por pagar],">0")',
     FMT_MONEDA, "Compras y gastos que usted todavía debe."),
    ("Capital de trabajo comprometido", None, FMT_MONEDA, "Inventario + cuentas por cobrar − cuentas por pagar."),
    ("Rotación del inventario (veces)", None, FMT_NUM2,
     "Costo de ventas ÷ valor del inventario. Cuántas veces se ha «dado vuelta» el inventario."),
    ("SECCIÓN", "CLIENTES", "", ""),
    ("Clientes registrados", f'=COUNTA({T_CLI}[Nombre])', FMT_NUM, "Fichas creadas en CLIENTES."),
    ("Clientes con al menos una compra", None, FMT_NUM, "Clientes que ya compraron."),
    ("Venta promedio por cliente", None, FMT_MONEDA, "Ventas netas ÷ clientes con compras."),
]
fila = RENT_HDR_MES + 1
filas_resumen = {}
for etiqueta, valor, fmt, obs in RESUMEN:
    if etiqueta == "SECCIÓN":
        cel = re_.cell(row=fila, column=RS_INI, value=valor)
        cel.font = Font(name="Calibri", size=10, bold=True, color=BLANCO)
        for k in range(3):
            re_.cell(row=fila, column=RS_INI + k).fill = FILL_HEADER2
            re_.cell(row=fila, column=RS_INI + k).border = BORDE
        fila += 1
        continue
    c1 = re_.cell(row=fila, column=RS_INI, value=etiqueta)
    c1.font = F_BOLD if etiqueta.isupper() else F_NORMAL
    c1.border = BORDE
    c2 = re_.cell(row=fila, column=RS_INI + 1, value=valor)
    c2.number_format = fmt
    marcar_calc(c2)
    c2.font = F_BOLD
    c3 = re_.cell(row=fila, column=RS_INI + 2, value=obs)
    c3.font = F_NOTA
    c3.alignment = AL_IZQ_WRAP
    c3.border = BORDE
    filas_resumen[etiqueta] = fila
    fila += 1

VB = L(RS_INI + 1)
f_inv_total = filas_resumen["Inversión total acumulada"]
f_util_neta = filas_resumen["UTILIDAD NETA ACUMULADA"]
f_capital = filas_resumen["Capital aportado por el propietario"]
f_valor_inv = filas_resumen["Valor del inventario (capital inmovilizado)"]
f_cxc = filas_resumen["Cuentas por cobrar"]
f_cxp = filas_resumen["Cuentas por pagar"]
f_costo_ventas = filas_resumen["Costo de ventas acumulado"]
f_ventas = filas_resumen["Ventas netas acumuladas"]

re_[f"{VB}{filas_resumen['ROI sobre la inversión']}"] = (
    f'=IF(${VB}${f_inv_total}<=0,"PENDIENTE",${VB}${f_util_neta}/${VB}${f_inv_total})')
re_[f"{VB}{f_capital}"] = (
    f'=IF(AND(NOT(ISNUMBER(PAR_CAPITAL_INICIAL)),SUMIFS({T_CAJAMOV}[Monto],{T_CAJAMOV}[Concepto],'
    f'"Aporte de capital")=0),"PENDIENTE",IF(ISNUMBER(PAR_CAPITAL_INICIAL),PAR_CAPITAL_INICIAL,0)'
    f'+SUMIFS({T_CAJAMOV}[Monto],{T_CAJAMOV}[Concepto],"Aporte de capital"))')
re_[f"{VB}{filas_resumen['ROI sobre el capital aportado']}"] = (
    f'=IF(OR(NOT(ISNUMBER(${VB}${f_capital})),${VB}${f_capital}<=0),"PENDIENTE",'
    f'${VB}${f_util_neta}/${VB}${f_capital})')
re_[f"{VB}{filas_resumen['Capital de trabajo comprometido']}"] = (
    f'=${VB}${f_valor_inv}+${VB}${f_cxc}-${VB}${f_cxp}')
re_[f"{VB}{filas_resumen['Rotación del inventario (veces)']}"] = (
    f'=IF(${VB}${f_valor_inv}<=0,"",${VB}${f_costo_ventas}/${VB}${f_valor_inv})')
re_[f"{VB}{filas_resumen['Clientes con al menos una compra']}"] = (
    f'=SUMPRODUCT(--(COUNTIFS({T_VENTAS}[Cliente],{T_CLI}[Nombre])>0),--({T_CLI}[Nombre]<>""))')
re_[f"{VB}{filas_resumen['Venta promedio por cliente']}"] = (
    f'=IF(${VB}${filas_resumen["Clientes con al menos una compra"]}=0,"",'
    f'${VB}${f_ventas}/${VB}${filas_resumen["Clientes con al menos una compra"]})')

re_.freeze_panes = f"A{RENT_HDR_MES + 1}"
re_.sheet_view.showGridLines = False
nota(re_, "A5", "Esta hoja tiene 5 bloques colocados en columnas contiguas → "
                "A:Y Estado de resultados mensual · AA:AO Por producto · AR:AX Por categoría · "
                "AZ:BH Por canal · BJ:BL Resumen acumulado, inversión y ROI")
re_.merge_cells(f"A5:Y5")


# =====================================================================
# 9. CAJA — flujo de efectivo mensual + movimientos manuales
# =====================================================================
ca = ws["CAJA"]
titulo(ca, "A1", "CAJA — Flujo de efectivo",
       "Aquí SOLO se mueve dinero real. Una venta entra a caja cuando se cobra; una compra o gasto "
       "sale de caja cuando se paga. Por eso la utilidad del mes casi nunca es igual al flujo del mes.")
nota(ca, "A3", "Columna «Diferencia utilidad − flujo»: si es positiva, usted ganó en papel más de lo que entró "
               "en efectivo (le deben, o compró inventario). Si es negativa, entró más efectivo del que ganó "
               "(cobró ventas de meses anteriores o recibió aportes).")
ca.merge_cells("A3:S3")
ca["A3"].alignment = AL_IZQ_WRAP

CAJA_BANDA, CAJA_HDR = 5, 6
CAJA_R = CAJA_HDR + 1
CAJA_F = CAJA_R + N_MESES - 1
CAJA_TOT = CAJA_F + 1

COLS_CAJA = [
    ("Mes", 12, FMT_MES), ("Saldo inicial", 14, FMT_MONEDA),
    ("Cobros de clientes", 14, FMT_MONEDA), ("Aportes de capital", 13, FMT_MONEDA),
    ("Préstamos recibidos", 13, FMT_MONEDA), ("Otros ingresos", 13, FMT_MONEDA),
    ("TOTAL ENTRADAS", 15, FMT_MONEDA), ("Pagos a proveedores", 14, FMT_MONEDA),
    ("Pagos de gastos", 14, FMT_MONEDA), ("Retiros del propietario", 13, FMT_MONEDA),
    ("Pago de préstamos", 13, FMT_MONEDA), ("Otros egresos", 13, FMT_MONEDA),
    ("TOTAL SALIDAS", 15, FMT_MONEDA), ("FLUJO NETO DEL MES", 15, FMT_MONEDA),
    ("SALDO FINAL", 15, FMT_MONEDA), ("Utilidad neta del mes", 15, FMT_MONEDA),
    ("Diferencia utilidad − flujo", 15, FMT_MONEDA),
    ("Cuentas por cobrar al cierre", 15, FMT_MONEDA), ("Cuentas por pagar al cierre", 15, FMT_MONEDA),
]
banda(ca, CAJA_BANDA, 1, len(COLS_CAJA), "FLUJO DE EFECTIVO MENSUAL  ·  calculado automáticamente")
encabezado_tabla(ca, CAJA_HDR, 1, [c[0] for c in COLS_CAJA], alto=44)
for i, (h, w, fmt) in enumerate(COLS_CAJA):
    ca.column_dimensions[L(i + 1)].width = w

CM = f"{T_CAJAMOV}"
for i in range(N_MESES):
    r = CAJA_R + i
    A = f"$A{r}"
    ini, fin = f'">="&{A}', f'"<"&DATE(YEAR({A}),MONTH({A})+1,1)'
    hasta = f'"<"&DATE(YEAR({A}),MONTH({A})+1,1)'
    ca[f"A{r}"] = (f'=IF(NOT(ISNUMBER(PAR_FECHA_INICIO)),"",'
                   f'DATE(YEAR(PAR_FECHA_INICIO),MONTH(PAR_FECHA_INICIO)+{i},1))')
    if i == 0:
        ca[f"B{r}"] = '=IF(ISNUMBER(PAR_SALDO_CAJA),PAR_SALDO_CAJA,0)'
    else:
        ca[f"B{r}"] = guard(f'{A}=""', f'$O{r - 1}')
    ca[f"C{r}"] = guard(f'{A}=""', f'SUMIFS({T_VENTAS}[Monto cobrado],{T_VENTAS}[Fecha de cobro],{ini},'
                                   f'{T_VENTAS}[Fecha de cobro],{fin})')
    for letra, concepto in (("D", "Aporte de capital"), ("E", "Préstamo recibido"), ("F", "Otro ingreso"),
                            ("J", "Retiro del propietario"), ("K", "Pago de préstamo"), ("L", "Otro egreso")):
        ca[f"{letra}{r}"] = guard(f'{A}=""', f'SUMIFS({CM}[Monto],{CM}[Concepto],"{concepto}",'
                                             f'{CM}[Fecha],{ini},{CM}[Fecha],{fin})')
    ca[f"G{r}"] = guard(f'{A}=""', f'SUM($C{r}:$F{r})')
    ca[f"H{r}"] = guard(f'{A}=""', f'SUMIFS({T_COMPRAS}[Monto pagado],{T_COMPRAS}[Fecha de pago],{ini},'
                                   f'{T_COMPRAS}[Fecha de pago],{fin})')
    ca[f"I{r}"] = guard(f'{A}=""', f'SUMIFS({T_GASTOS}[Monto pagado],{T_GASTOS}[Fecha de pago],{ini},'
                                   f'{T_GASTOS}[Fecha de pago],{fin})')
    ca[f"M{r}"] = guard(f'{A}=""', f'SUM($H{r}:$L{r})')
    ca[f"N{r}"] = guard(f'{A}=""', f'$G{r}-$M{r}')
    ca[f"O{r}"] = guard(f'{A}=""', f'$B{r}+$N{r}')
    ca[f"P{r}"] = guard(f'{A}=""', f'RENTABILIDAD!$O${RENT_R_MES + i}')
    ca[f"Q{r}"] = guard(f'{A}=""', f'$P{r}-$N{r}')
    ca[f"R{r}"] = guard(f'{A}=""',
                        f'SUMIFS({T_VENTAS}[Venta neta],{T_VENTAS}[Fecha],{hasta})'
                        f'-SUMIFS({T_VENTAS}[Monto cobrado],{T_VENTAS}[Fecha de cobro],{hasta})')
    ca[f"S{r}"] = guard(f'{A}=""',
                        f'SUMIFS({T_COMPRAS}[Costo total de adquisición],{T_COMPRAS}[Fecha],{hasta})'
                        f'+SUMIFS({T_GASTOS}[Monto],{T_GASTOS}[Fecha],{hasta})'
                        f'-SUMIFS({T_COMPRAS}[Monto pagado],{T_COMPRAS}[Fecha de pago],{hasta})'
                        f'-SUMIFS({T_GASTOS}[Monto pagado],{T_GASTOS}[Fecha de pago],{hasta})')
    for j, (h, w, fmt) in enumerate(COLS_CAJA, start=1):
        cel = ca.cell(row=r, column=j)
        cel.number_format = fmt
        marcar_calc(cel)
    for letra in ("G", "M", "N", "O"):
        ca[f"{letra}{r}"].font = F_BOLD

ca.cell(row=CAJA_TOT, column=1, value="TOTAL")
for j, (h, w, fmt) in enumerate(COLS_CAJA, start=1):
    cel = ca.cell(row=CAJA_TOT, column=j)
    cel.fill = FILL_HEADER2
    cel.font = Font(name="Calibri", size=10, bold=True, color=BLANCO)
    cel.border = BORDE
    cel.number_format = fmt
    letra = L(j)
    if letra == "A":
        cel.value = "TOTAL"
    elif letra in ("C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "P", "Q"):
        cel.value = f'=SUM(${letra}${CAJA_R}:${letra}${CAJA_F})'
    elif letra in ("B",):
        cel.value = f'=$B${CAJA_R}'
    elif letra in ("O", "R", "S"):
        cel.value = f'=IF(COUNT(${letra}${CAJA_R}:${letra}${CAJA_F})=0,"",LOOKUP(9.99E+307,${letra}${CAJA_R}:${letra}${CAJA_F}))'

ca.conditional_formatting.add(f"O{CAJA_R}:O{CAJA_F}", CellIsRule(
    operator="lessThan", formula=["0"], font=Font(color=ROJO, bold=True),
    fill=PatternFill("solid", fgColor="FBE3E6")))
ca.conditional_formatting.add(f"N{CAJA_R}:N{CAJA_F}", CellIsRule(
    operator="lessThan", formula=["0"], font=Font(color=ROJO)))

# --- Indicadores rápidos de caja --------------------------------------------
KPI_CAJA = CAJA_TOT + 2
ca.cell(row=KPI_CAJA, column=1, value="INDICADORES DE EFECTIVO").font = F_SUBTITULO
ITEMS_CAJA = [
    ("Saldo de caja actual (todos los movimientos registrados)",
     f'=IF(ISNUMBER(PAR_SALDO_CAJA),PAR_SALDO_CAJA,0)+SUM({T_VENTAS}[Monto cobrado])'
     f'+SUMIFS({CM}[Monto],{CM}[Tipo],"Entrada")-SUM({T_COMPRAS}[Monto pagado])'
     f'-SUM({T_GASTOS}[Monto pagado])-SUMIFS({CM}[Monto],{CM}[Tipo],"Salida")', FMT_MONEDA),
    ("Efectivo pendiente de cobrar (cuentas por cobrar)",
     f'=SUMIF({T_VENTAS}[Saldo por cobrar],">0")', FMT_MONEDA),
    ("Efectivo pendiente de pagar (cuentas por pagar)",
     f'=SUMIF({T_COMPRAS}[Saldo por pagar],">0")+SUMIF({T_GASTOS}[Saldo por pagar],">0")', FMT_MONEDA),
    ("Utilidad neta acumulada (no es efectivo)", f'=RENTABILIDAD!$O${RENT_TOT_MES}', FMT_MONEDA),
    ("Flujo de efectivo neto acumulado", f'=$N${CAJA_TOT}', FMT_MONEDA),
    ("Diferencia acumulada entre utilidad y efectivo", f'=$Q${CAJA_TOT}', FMT_MONEDA),
]
for k, (etiqueta, formula, fmt) in enumerate(ITEMS_CAJA):
    r = KPI_CAJA + 1 + k
    ca.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
    cel = ca.cell(row=r, column=1, value=etiqueta)
    cel.font = F_BOLD
    cel.alignment = AL_IZQ
    cel.border = BORDE
    val = ca.cell(row=r, column=5, value=formula)
    val.number_format = fmt
    marcar_calc(val)
    val.font = F_BOLD

# --- Movimientos manuales de caja (columnas U..AC) ---------------------------
MOV_INI = 21   # U
COLS_CAJAMOV = [
    ("ID de movimiento", 14, "calc", FMT_TEXTO), ("Fecha", 12, "input", FMT_FECHA),
    ("Tipo", 12, "input", FMT_TEXTO), ("Concepto", 22, "input", FMT_TEXTO),
    ("Descripción", 34, "input", FMT_TEXTO), ("Monto", 14, "input", FMT_MONEDA),
    ("Método de pago", 15, "input", FMT_TEXTO), ("Observaciones", 24, "input", FMT_TEXTO),
    ("ALERTA", 26, "calc", FMT_TEXTO),
]
banda(ca, CAJA_BANDA, MOV_INI, MOV_INI + len(COLS_CAJAMOV) - 1,
      "MOVIMIENTOS DE EFECTIVO QUE NO SON VENTAS, COMPRAS NI GASTOS")
encabezado_tabla(ca, HDR_CAJAMOV, MOV_INI, [c[0] for c in COLS_CAJAMOV], alto=32)
for i, (h, w, tipo, fmt) in enumerate(COLS_CAJAMOV):
    ca.column_dimensions[L(MOV_INI + i)].width = w
MVC = {h: L(MOV_INI + i) for i, (h, w, t, f) in enumerate(COLS_CAJAMOV)}

for i in range(N_CAJAMOV):
    r = R_CAJAMOV + i
    ca[f"{MVC['ID de movimiento']}{r}"] = (
        f'=IF(COUNTA(${MVC["Fecha"]}{r}:${MVC["Monto"]}{r})=0,"","M-"&TEXT(ROW()-{HDR_CAJAMOV},"0000"))')
    ca[f"{MVC['ALERTA']}{r}"] = alerta(
        f'COUNTA(${MVC["Fecha"]}{r},${MVC["Tipo"]}{r},${MVC["Concepto"]}{r},'
        f'${MVC["Descripción"]}{r},${MVC["Monto"]}{r})=0', [
        (f'${MVC["Fecha"]}{r}=""', "Falta fecha"),
        (f'${MVC["Tipo"]}{r}=""', "Falta tipo"),
        (f'${MVC["Concepto"]}{r}=""', "Falta concepto"),
        (f'OR(${MVC["Monto"]}{r}="",NOT(ISNUMBER(${MVC["Monto"]}{r})),${MVC["Monto"]}{r}<=0)', "Monto inválido"),
        (f'AND(${MVC["Tipo"]}{r}="Entrada",OR(${MVC["Concepto"]}{r}="Retiro del propietario",'
         f'${MVC["Concepto"]}{r}="Pago de préstamo",${MVC["Concepto"]}{r}="Otro egreso"))', "Tipo no coincide con el concepto"),
        (f'AND(${MVC["Tipo"]}{r}="Salida",OR(${MVC["Concepto"]}{r}="Aporte de capital",'
         f'${MVC["Concepto"]}{r}="Préstamo recibido",${MVC["Concepto"]}{r}="Otro ingreso"))', "Tipo no coincide con el concepto"),
    ])
    for j, (h, w, tipo, fmt) in enumerate(COLS_CAJAMOV):
        cel = ca.cell(row=r, column=MOV_INI + j)
        cel.number_format = fmt
        marcar_input(cel) if tipo == "input" else marcar_calc(cel)

add_table(ca, T_CAJAMOV, f"{L(MOV_INI)}{HDR_CAJAMOV}:{L(MOV_INI + len(COLS_CAJAMOV) - 1)}{F_CAJAMOV}",
          estilo="TableStyleMedium2")
dv(ca, f"{MVC['Tipo']}{R_CAJAMOV}:{MVC['Tipo']}{F_CAJAMOV}", "LISTA_TIPO_MOV", permitir_otros=False)
dv(ca, f"{MVC['Concepto']}{R_CAJAMOV}:{MVC['Concepto']}{F_CAJAMOV}", "LISTA_CONCEPTO_CAJA", permitir_otros=False)
dv(ca, f"{MVC['Método de pago']}{R_CAJAMOV}:{MVC['Método de pago']}{F_CAJAMOV}", "LISTA_METODOS_PAGO")
dv_numero(ca, f"{MVC['Monto']}{R_CAJAMOV}:{MVC['Monto']}{F_CAJAMOV}", 0)
dv_fecha(ca, f"{MVC['Fecha']}{R_CAJAMOV}:{MVC['Fecha']}{F_CAJAMOV}")
ca.conditional_formatting.add(f"{MVC['ALERTA']}{R_CAJAMOV}:{MVC['ALERTA']}{F_CAJAMOV}", FormulaRule(
    formula=[f'AND(${MVC["ALERTA"]}{R_CAJAMOV}<>"",${MVC["ALERTA"]}{R_CAJAMOV}<>"OK")'],
    font=Font(color=ROJO, bold=True), fill=PatternFill("solid", fgColor="FBE3E6")))
ca.freeze_panes = f"B{CAJA_R}"
ca.sheet_view.showGridLines = False


# =====================================================================
# 10. CLIENTES
# =====================================================================
cl = ws["CLIENTES"]
titulo(cl, "A1", "CLIENTES — Base de datos comercial",
       "El «Nombre» es la llave que conecta con la hoja VENTAS: escríbalo aquí primero y luego "
       "selecciónelo en el desplegable de cada venta. Todo lo demás se calcula solo.")
COLS_CLI = [
    ("ID de cliente", 13, "calc", FMT_TEXTO), ("Nombre", 28, "input", FMT_TEXTO),
    ("Teléfono", 15, "input", FMT_TEXTO), ("Email", 26, "input", FMT_TEXTO),
    ("Canal preferido", 16, "input", FMT_TEXTO), ("Ciudad / zona", 18, "input", FMT_TEXTO),
    ("Fecha de primera compra", 14, "calc", FMT_FECHA), ("Fecha de última compra", 14, "calc", FMT_FECHA),
    ("Número de compras", 12, "calc", FMT_NUM), ("Ventas acumuladas", 15, "calc", FMT_MONEDA),
    ("Utilidad generada", 15, "calc", FMT_MONEDA), ("Ticket promedio", 14, "calc", FMT_MONEDA),
    ("Saldo por cobrar", 14, "calc", FMT_MONEDA), ("Días desde la última compra", 12, "calc", FMT_NUM),
    ("Clasificación", 16, "calc", FMT_TEXTO), ("Estado", 12, "input", FMT_TEXTO),
    ("Observaciones", 26, "input", FMT_TEXTO), ("ALERTA", 26, "calc", FMT_TEXTO),
]
encabezado_tabla(cl, HDR_CLI, 1, [c[0] for c in COLS_CLI], alto=40)
for i, (h, w, t, fmt) in enumerate(COLS_CLI):
    cl.column_dimensions[L(i + 1)].width = w

for i in range(N_CLIENTES):
    r = R_CLI + i
    B = f"$B{r}"
    fv, cli = f"{T_VENTAS}[Fecha]", f"{T_VENTAS}[Cliente]"
    cl[f"A{r}"] = f'=IF({B}="","","CLI-"&TEXT(ROW()-{HDR_CLI},"0000"))'
    cl[f"G{r}"] = (f'=IF({B}="","",IF(COUNTIFS({cli},{B})=0,"",'
                   f'SUMPRODUCT(MIN(({cli}={B})*{fv}+({cli}<>{B})*99999))))')
    cl[f"H{r}"] = (f'=IF({B}="","",IF(COUNTIFS({cli},{B})=0,"",'
                   f'SUMPRODUCT(MAX(({cli}={B})*{fv}))))')
    cl[f"I{r}"] = guard(f'{B}=""', f'COUNTIFS({cli},{B})')
    cl[f"J{r}"] = guard(f'{B}=""', f'SUMIFS({T_VENTAS}[Venta neta],{cli},{B})')
    cl[f"K{r}"] = guard(f'{B}=""', f'SUMIFS({T_VENTAS}[Utilidad bruta],{cli},{B})')
    cl[f"L{r}"] = guard(f'OR({B}="",$I{r}=0)', f'$J{r}/$I{r}')
    cl[f"M{r}"] = guard(f'{B}=""', f'SUMIFS({T_VENTAS}[Saldo por cobrar],{cli},{B})')
    cl[f"N{r}"] = f'=IF(OR({B}="",NOT(ISNUMBER($H{r}))),"",TODAY()-$H{r})'
    cl[f"O{r}"] = (f'=IF({B}="","",IF($I{r}=0,"SIN COMPRAS",'
                   f'IF($N{r}<=30,"ACTIVO",IF($N{r}<=60,"EN SEGUIMIENTO",'
                   f'IF($N{r}<=120,"EN RIESGO","INACTIVO")))))')
    cl[f"R{r}"] = alerta(f'$B{r}=""', [
        (f'AND({B}<>"",COUNTIF({T_CLI}[Nombre],{B})>1)', "NOMBRE DUPLICADO"),
        (f'AND({B}<>"",$C{r}="",$D{r}="")', "Sin teléfono ni email"),
        (f'AND(ISNUMBER($M{r}),$M{r}>0)', "Tiene saldo por cobrar"),
    ])
    for j, (h, w, tipo, fmt) in enumerate(COLS_CLI, start=1):
        cel = cl.cell(row=r, column=j)
        cel.number_format = fmt
        marcar_input(cel) if tipo == "input" else marcar_calc(cel)

add_table(cl, T_CLI, f"A{HDR_CLI}:R{F_CLI}", estilo="TableStyleMedium2")
cl.freeze_panes = f"C{R_CLI}"
cl.sheet_view.showGridLines = False
dv(cl, f"E{R_CLI}:E{F_CLI}", "LISTA_CANALES")
dv(cl, f"P{R_CLI}:P{F_CLI}", "LISTA_ESTADO_REL")
cl.conditional_formatting.add(f"R{R_CLI}:R{F_CLI}", FormulaRule(
    formula=[f'ISNUMBER(SEARCH("DUPLICADO",$R{R_CLI}))'],
    font=Font(color=ROJO, bold=True), fill=PatternFill("solid", fgColor="FBE3E6")))
cl.conditional_formatting.add(f"O{R_CLI}:O{F_CLI}", FormulaRule(
    formula=[f'$O{R_CLI}="ACTIVO"'], font=Font(color=VERDE, bold=True)))
cl.conditional_formatting.add(f"O{R_CLI}:O{F_CLI}", FormulaRule(
    formula=[f'OR($O{R_CLI}="EN RIESGO",$O{R_CLI}="INACTIVO")'], font=Font(color=AMBAR, bold=True)))


# =====================================================================
# 11. PROVEEDORES
# =====================================================================
pr = ws["PROVEEDORES"]
titulo(pr, "A1", "PROVEEDORES",
       "El «Proveedor» es la llave que conecta con la hoja COMPRAS. Registre aquí a quién le compra "
       "y en qué condiciones; el sistema acumula sus compras y su saldo por pagar.")
COLS_PROV = [
    ("ID de proveedor", 14, "calc", FMT_TEXTO), ("Proveedor", 28, "input", FMT_TEXTO),
    ("Contacto", 22, "input", FMT_TEXTO), ("Teléfono", 15, "input", FMT_TEXTO),
    ("Email", 26, "input", FMT_TEXTO), ("Productos / categoría que suministra", 30, "input", FMT_TEXTO),
    ("Condiciones de pago", 18, "input", FMT_TEXTO), ("Días de crédito", 12, "input", FMT_NUM),
    ("Tiempo de entrega (días)", 12, "input", FMT_NUM), ("Compras acumuladas", 16, "calc", FMT_MONEDA),
    ("Número de compras", 12, "calc", FMT_NUM), ("Compra promedio", 14, "calc", FMT_MONEDA),
    ("Última compra", 13, "calc", FMT_FECHA),
    ("Saldo por pagar", 14, "calc", FMT_MONEDA), ("Estado", 12, "input", FMT_TEXTO),
    ("Observaciones", 26, "input", FMT_TEXTO), ("ALERTA", 26, "calc", FMT_TEXTO),
]
encabezado_tabla(pr, HDR_PROV, 1, [c[0] for c in COLS_PROV], alto=40)
for i, (h, w, t, fmt) in enumerate(COLS_PROV):
    pr.column_dimensions[L(i + 1)].width = w

for i in range(N_PROV):
    r = R_PROV + i
    B = f"$B{r}"
    prov, fc = f"{T_COMPRAS}[Proveedor]", f"{T_COMPRAS}[Fecha]"
    pr[f"A{r}"] = f'=IF({B}="","","PRV-"&TEXT(ROW()-{HDR_PROV},"0000"))'
    pr[f"J{r}"] = guard(f'{B}=""', f'SUMIFS({T_COMPRAS}[Costo total de adquisición],{prov},{B})')
    pr[f"K{r}"] = guard(f'{B}=""', f'COUNTIFS({prov},{B})')
    pr[f"L{r}"] = guard(f'OR({B}="",$K{r}=0)', f'$J{r}/$K{r}')
    pr[f"M{r}"] = (f'=IF({B}="","",IF(COUNTIFS({prov},{B})=0,"",'
                   f'SUMPRODUCT(MAX(({prov}={B})*{fc}))))')
    pr[f"N{r}"] = guard(f'{B}=""', f'SUMIFS({T_COMPRAS}[Saldo por pagar],{prov},{B})')
    pr[f"Q{r}"] = alerta(f'$B{r}=""', [
        (f'AND({B}<>"",COUNTIF({T_PROV}[Proveedor],{B})>1)', "PROVEEDOR DUPLICADO"),
        (f'AND({B}<>"",$D{r}="",$E{r}="")', "Sin teléfono ni email"),
        (f'AND(ISNUMBER($N{r}),$N{r}>0)', "Tiene saldo por pagar"),
    ])
    for j, (h, w, tipo, fmt) in enumerate(COLS_PROV, start=1):
        cel = pr.cell(row=r, column=j)
        cel.number_format = fmt
        marcar_input(cel) if tipo == "input" else marcar_calc(cel)

add_table(pr, T_PROV, f"A{HDR_PROV}:Q{F_PROV}", estilo="TableStyleMedium2")
pr.freeze_panes = f"C{R_PROV}"
pr.sheet_view.showGridLines = False
dv(pr, f"G{R_PROV}:G{F_PROV}", "LISTA_CONDICIONES")
dv(pr, f"O{R_PROV}:O{F_PROV}", "LISTA_ESTADO_REL")
dv_numero(pr, f"H{R_PROV}:I{F_PROV}", 0)
pr.conditional_formatting.add(f"Q{R_PROV}:Q{F_PROV}", FormulaRule(
    formula=[f'ISNUMBER(SEARCH("DUPLICADO",$Q{R_PROV}))'],
    font=Font(color=ROJO, bold=True), fill=PatternFill("solid", fgColor="FBE3E6")))


# =====================================================================
# 12. EQUILIBRIO — punto de equilibrio y simulador
# =====================================================================
eq = ws["EQUILIBRIO"]
titulo(eq, "A1", "PUNTO DE EQUILIBRIO",
       "Cuánto tiene que vender para no perder dinero. Puede trabajar con los valores automáticos "
       "(calculados con sus datos reales) o escribir los suyos poniendo el Modo en «Manual».")
anchos(eq, {"A": 46, "B": 18, "C": 20, "D": 20, "E": 62, "F": 4, "G": 14, "H": 14,
            "I": 14, "J": 14, "K": 14, "L": 14})
nota(eq, "A3", "Margen de contribución = precio − costo variable unitario. Es lo que deja cada unidad "
               "para pagar los costos fijos. Si no hay margen de contribución positivo, NO existe punto "
               "de equilibrio: se pierde dinero con cada venta.")
eq.merge_cells("A3:E3")

banda(eq, 5, 1, 5, "1 · VARIABLES DEL CÁLCULO")
encabezado_tabla(eq, 6, 1, ["Variable", "Valor utilizado", "Valor automático (sus datos)",
                            "Valor manual (editable)", "Notas"], alto=30)
eq["A7"] = "Modo de cálculo"
eq["A7"].font = F_BOLD
eq["A7"].border = BORDE
marcar_input(eq["B7"])
eq["B7"] = "Automático"
nota(eq, "E7", "«Automático» usa sus datos reales. «Manual» usa la columna amarilla.")
dv(eq, "B7", "LISTA_MODO", permitir_otros=False)

RD, RF = RENT_R_MES, RENT_F_MES
VAR_EQ = [
    (8, "Costos fijos mensuales",
     f'=IF(COUNTIF(RENTABILIDAD!$I${RD}:$I${RF},">0")=0,"",'
     f'SUMIF(RENTABILIDAD!$I${RD}:$I${RF},">0")/COUNTIF(RENTABILIDAD!$I${RD}:$I${RF},">0"))',
     FMT_MONEDA, "Promedio mensual de los gastos FIJOS registrados (solo meses con gastos)."),
    (9, "Precio de venta promedio",
     f'=IF(RENTABILIDAD!$E${RENT_TOT_MES}=0,"",RENTABILIDAD!$D${RENT_TOT_MES}/RENTABILIDAD!$E${RENT_TOT_MES})',
     FMT_MONEDA, "Ventas netas ÷ unidades vendidas. Necesita ventas registradas."),
    (10, "Costo variable unitario promedio",
     f'=IF(RENTABILIDAD!$E${RENT_TOT_MES}=0,"",(RENTABILIDAD!$F${RENT_TOT_MES}'
     f'+RENTABILIDAD!$J${RENT_TOT_MES})/RENTABILIDAD!$E${RENT_TOT_MES})',
     FMT_MONEDA, "(Costo de ventas + gastos variables) ÷ unidades vendidas."),
]
for fila, etiqueta, auto, fmt, obs in VAR_EQ:
    eq.cell(row=fila, column=1, value=etiqueta).font = F_BOLD
    eq.cell(row=fila, column=1).border = BORDE
    b = eq.cell(row=fila, column=2,
                value=f'=IF($B$7="Manual",IF(ISNUMBER($D{fila}),$D{fila},"PENDIENTE"),'
                      f'IF(ISNUMBER($C{fila}),$C{fila},"PENDIENTE"))')
    b.number_format = fmt
    marcar_calc(b)
    b.font = F_BOLD
    cc = eq.cell(row=fila, column=3, value=auto)
    cc.number_format = fmt
    marcar_calc(cc)
    d = eq.cell(row=fila, column=4)
    d.number_format = fmt
    marcar_input(d)
    nota(eq, f"E{fila}", obs)

eq["A11"] = "Días de venta por mes"
eq["A11"].font = F_BOLD
eq["A11"].border = BORDE
eq["B11"] = '=IF(ISNUMBER(PAR_DIAS_MES),PAR_DIAS_MES,26)'
eq["B11"].number_format = FMT_NUM
marcar_calc(eq["B11"])
nota(eq, "E11", "Se configura en la hoja CONFIG.")

banda(eq, 13, 1, 5, "2 · RESULTADOS")
RES_EQ = [
    (14, "Margen de contribución unitario",
     '=IF(OR(NOT(ISNUMBER($B$9)),NOT(ISNUMBER($B$10))),"PENDIENTE",$B$9-$B$10)', FMT_MONEDA,
     "Precio promedio − costo variable unitario."),
    (15, "Margen de contribución %",
     '=IF(OR(NOT(ISNUMBER($B$14)),NOT(ISNUMBER($B$9)),$B$9<=0),"PENDIENTE",$B$14/$B$9)', FMT_PCT,
     "Qué porcentaje de cada venta queda para cubrir costos fijos."),
    (16, "PUNTO DE EQUILIBRIO EN UNIDADES",
     '=IF(OR(NOT(ISNUMBER($B$8)),NOT(ISNUMBER($B$14))),"PENDIENTE",'
     'IF($B$14<=0,"IMPOSIBLE: el margen de contribución no es positivo",ROUNDUP($B$8/$B$14,0)))', FMT_NUM,
     "Unidades que debe vender en el mes para no ganar ni perder."),
    (17, "PUNTO DE EQUILIBRIO EN LEMPIRAS",
     '=IF(OR(NOT(ISNUMBER($B$16)),NOT(ISNUMBER($B$9))),"PENDIENTE",$B$16*$B$9)', FMT_MONEDA,
     "Ventas mensuales necesarias para no ganar ni perder."),
    (18, "Punto de equilibrio diario (unidades)",
     '=IF(OR(NOT(ISNUMBER($B$16)),NOT(ISNUMBER($B$11)),$B$11<=0),"PENDIENTE",ROUNDUP($B$16/$B$11,0))', FMT_NUM,
     "Unidades por día de venta."),
    (19, "Punto de equilibrio diario (Lempiras)",
     '=IF(OR(NOT(ISNUMBER($B$17)),NOT(ISNUMBER($B$11)),$B$11<=0),"PENDIENTE",$B$17/$B$11)', FMT_MONEDA,
     "Venta diaria necesaria."),
    (20, "Unidades vendidas por mes (promedio real)",
     f'=IF(COUNTIF(RENTABILIDAD!$E${RD}:$E${RF},">0")=0,"",'
     f'SUMIF(RENTABILIDAD!$E${RD}:$E${RF},">0")/COUNTIF(RENTABILIDAD!$E${RD}:$E${RF},">0"))', FMT_NUM,
     "Promedio de los meses en los que sí hubo ventas."),
    (21, "Margen de seguridad (unidades)",
     '=IF(OR(NOT(ISNUMBER($B$20)),NOT(ISNUMBER($B$16))),"PENDIENTE",$B$20-$B$16)', FMT_NUM,
     "Cuántas unidades por encima del equilibrio vende hoy. Negativo = todavía pierde dinero."),
    (22, "Margen de seguridad %",
     '=IF(OR(NOT(ISNUMBER($B$21)),NOT(ISNUMBER($B$20)),$B$20<=0),"PENDIENTE",$B$21/$B$20)', FMT_PCT,
     "Cuánto pueden caer sus ventas antes de empezar a perder."),
    (23, "Utilidad operativa esperada al nivel actual",
     '=IF(OR(NOT(ISNUMBER($B$20)),NOT(ISNUMBER($B$14)),NOT(ISNUMBER($B$8))),"PENDIENTE",'
     '$B$20*$B$14-$B$8)', FMT_MONEDA,
     "(Unidades promedio × margen de contribución) − costos fijos."),
]
for fila, etiqueta, formula, fmt, obs in RES_EQ:
    cel = eq.cell(row=fila, column=1, value=etiqueta)
    cel.font = F_BOLD if etiqueta.isupper() else F_NORMAL
    cel.border = BORDE
    b = eq.cell(row=fila, column=2, value=formula)
    b.number_format = fmt
    marcar_calc(b)
    if etiqueta.isupper():
        b.font = Font(name="Calibri", size=11, bold=True, color=AZUL_OSCURO)
    nota(eq, f"E{fila}", obs)
eq.conditional_formatting.add("B21:B22", CellIsRule(
    operator="lessThan", formula=["0"], font=Font(color=ROJO, bold=True)))

banda(eq, 25, 1, 5, "3 · SIMULADOR: ¿CUÁNTO DEBO VENDER PARA GANAR X?")
eq["A26"] = "Utilidad mensual deseada"
eq["A26"].font = F_BOLD
eq["A26"].border = BORDE
marcar_input(eq["B26"])
eq["B26"].number_format = FMT_MONEDA
nota(eq, "E26", "Escriba cuánto quiere ganar en el mes (utilidad operativa).")
eq["A27"] = "Unidades necesarias para lograrlo"
eq["A27"].border = BORDE
eq["B27"] = ('=IF(OR(NOT(ISNUMBER($B$26)),NOT(ISNUMBER($B$8)),NOT(ISNUMBER($B$14)),$B$14<=0),"PENDIENTE",'
             'ROUNDUP(($B$8+$B$26)/$B$14,0))')
eq["B27"].number_format = FMT_NUM
marcar_calc(eq["B27"])
eq["A28"] = "Ventas necesarias para lograrlo"
eq["A28"].border = BORDE
eq["B28"] = '=IF(OR(NOT(ISNUMBER($B$27)),NOT(ISNUMBER($B$9))),"PENDIENTE",$B$27*$B$9)'
eq["B28"].number_format = FMT_MONEDA
marcar_calc(eq["B28"])
eq["A29"] = "Venta diaria necesaria"
eq["A29"].border = BORDE
eq["B29"] = '=IF(OR(NOT(ISNUMBER($B$28)),NOT(ISNUMBER($B$11)),$B$11<=0),"PENDIENTE",$B$28/$B$11)'
eq["B29"].number_format = FMT_MONEDA
marcar_calc(eq["B29"])

# --- Tabla de sensibilidad: PE en unidades ----------------------------------
banda(eq, 31, 7, 12, "4 · SENSIBILIDAD DEL PUNTO DE EQUILIBRIO (unidades)")
eq["G32"] = "Precio ↓ / Costo variable →"
eq["G32"].font = F_HEADER
eq["G32"].fill = FILL_HEADER
eq["G32"].alignment = AL_CENTRO
eq["G32"].border = BORDE
VARIACIONES = [-0.10, -0.05, 0, 0.05, 0.10]
for j, vx in enumerate(VARIACIONES):
    cel = eq.cell(row=32, column=8 + j, value=vx)
    cel.number_format = '+0%;-0%;0%'
    cel.font = F_HEADER
    cel.fill = FILL_HEADER
    cel.alignment = AL_CENTRO
    cel.border = BORDE
for i, vy in enumerate(VARIACIONES):
    r = 33 + i
    cel = eq.cell(row=r, column=7, value=vy)
    cel.number_format = '+0%;-0%;0%'
    cel.font = F_HEADER
    cel.fill = FILL_HEADER
    cel.alignment = AL_CENTRO
    cel.border = BORDE
    for j, vx in enumerate(VARIACIONES):
        precio = f'$B$9*(1+$G{r})'
        cvu = f'$B$10*(1+{L(8 + j)}$32)'
        mc = f'({precio}-{cvu})'
        c2 = eq.cell(row=r, column=8 + j, value=(
            f'=IF(OR(NOT(ISNUMBER($B$8)),NOT(ISNUMBER($B$9)),NOT(ISNUMBER($B$10))),"",'
            f'IF({mc}<=0,"—",ROUNDUP($B$8/{mc},0)))'))
        c2.number_format = FMT_NUM
        marcar_calc(c2)
eq.conditional_formatting.add("H33:L37", ColorScaleRule(
    start_type="min", start_color="E3F4EA", end_type="max", end_color="FBE3E6"))
nota(eq, "G39", "Lee así: si su precio baja 10% y su costo variable sube 10%, necesita vender las unidades "
                "que muestra la celda correspondiente para seguir en equilibrio.")
eq.merge_cells("G39:L40")
eq["G39"].alignment = AL_IZQ_WRAP
eq.sheet_view.showGridLines = False


# =====================================================================
# 13. METAS — objetivos mensuales y seguimiento
# =====================================================================
me = ws["METAS"]
titulo(me, "A1", "METAS — Objetivos y cumplimiento",
       "Escriba sus metas del mes en las columnas amarillas. El sistema compara contra la realidad, "
       "calcula el % de cumplimiento y le dice cuánto necesita vender por día para llegar.")
nota(me, "A3", "Si deja una meta vacía, el sistema no inventa ninguna: simplemente indicará «SIN META».")
me.merge_cells("A3:M3")

MET_BANDA, MET_HDR = 5, 6
MET_R = MET_HDR + 1
MET_F = MET_R + N_MESES - 1
MET_TOT = MET_F + 1
COLS_METAS = [
    ("Mes", 12, "calc", FMT_MES),
    ("Meta de ventas", 14, "input", FMT_MONEDA),
    ("Meta de utilidad neta", 14, "input", FMT_MONEDA),
    ("Meta de unidades", 12, "input", FMT_NUM),
    ("Meta de margen neto %", 12, "input", FMT_PCT),
    ("Meta de efectivo (flujo neto)", 13, "input", FMT_MONEDA),
    ("Ventas reales", 14, "calc", FMT_MONEDA),
    ("Utilidad neta real", 14, "calc", FMT_MONEDA),
    ("Unidades reales", 12, "calc", FMT_NUM),
    ("Margen neto real", 12, "calc", FMT_PCT),
    ("Flujo de efectivo real", 14, "calc", FMT_MONEDA),
    ("% cumplimiento ventas", 12, "calc", FMT_PCT),
    ("% cumplimiento utilidad", 12, "calc", FMT_PCT),
    ("% cumplimiento unidades", 12, "calc", FMT_PCT),
    ("% cumplimiento efectivo", 12, "calc", FMT_PCT),
    ("Diferencia en ventas", 14, "calc", FMT_MONEDA),
    ("Diferencia en utilidad", 14, "calc", FMT_MONEDA),
    ("Diferencia en unidades", 12, "calc", FMT_NUM),
    ("Venta diaria requerida (mes completo)", 13, "calc", FMT_MONEDA),
    ("Días transcurridos", 10, "calc", FMT_NUM),
    ("Días restantes", 10, "calc", FMT_NUM),
    ("Venta diaria requerida para alcanzar la meta", 14, "calc", FMT_MONEDA),
    ("ESTADO", 16, "calc", FMT_TEXTO),
]
banda(me, MET_BANDA, 1, len(COLS_METAS), "METAS MENSUALES Y SEGUIMIENTO")
encabezado_tabla(me, MET_HDR, 1, [c[0] for c in COLS_METAS], alto=48)
for i, (h, w, t, fmt) in enumerate(COLS_METAS):
    me.column_dimensions[L(i + 1)].width = w

for i in range(N_MESES):
    r = MET_R + i
    rr = RENT_R_MES + i
    cr = CAJA_R + i
    A = f"$A{r}"
    me[f"A{r}"] = (f'=IF(NOT(ISNUMBER(PAR_FECHA_INICIO)),"",'
                   f'DATE(YEAR(PAR_FECHA_INICIO),MONTH(PAR_FECHA_INICIO)+{i},1))')
    me[f"G{r}"] = guard(f'{A}=""', f'RENTABILIDAD!$D${rr}')
    me[f"H{r}"] = guard(f'{A}=""', f'RENTABILIDAD!$O${rr}')
    me[f"I{r}"] = guard(f'{A}=""', f'RENTABILIDAD!$E${rr}')
    me[f"J{r}"] = guard(f'OR({A}="",$G{r}=0)', f'$H{r}/$G{r}')
    me[f"K{r}"] = guard(f'{A}=""', f'CAJA!$N${cr}')
    for letra, meta, real in (("L", "B", "G"), ("M", "C", "H"), ("N", "D", "I"), ("O", "F", "K")):
        me[f"{letra}{r}"] = (f'=IF(OR({A}="",${meta}{r}="",NOT(ISNUMBER(${meta}{r})),${meta}{r}=0),"",'
                             f'${real}{r}/${meta}{r})')
    for letra, meta, real in (("P", "B", "G"), ("Q", "C", "H"), ("R", "D", "I")):
        me[f"{letra}{r}"] = (f'=IF(OR({A}="",NOT(ISNUMBER(${meta}{r}))),"",${real}{r}-${meta}{r})')
    me[f"S{r}"] = (f'=IF(OR({A}="",NOT(ISNUMBER($B{r})),NOT(ISNUMBER(PAR_DIAS_MES)),PAR_DIAS_MES<=0),"",'
                   f'$B{r}/PAR_DIAS_MES)')
    dias_mes = f'DAY(DATE(YEAR({A}),MONTH({A})+1,0))'
    me[f"T{r}"] = (f'=IF({A}="","",IF(TODAY()>=DATE(YEAR({A}),MONTH({A})+1,1),{dias_mes},'
                   f'IF(TODAY()<{A},0,DAY(TODAY()))))')
    me[f"U{r}"] = guard(f'{A}=""', f'{dias_mes}-$T{r}')
    me[f"V{r}"] = (f'=IF(OR({A}="",NOT(ISNUMBER($B{r})),$U{r}<=0),"",MAX(0,($B{r}-$G{r})/$U{r}))')
    me[f"W{r}"] = (f'=IF({A}="","",'
                   f'IF(NOT(ISNUMBER($B{r})),"SIN META",'
                   f'IF($G{r}>=$B{r},"META CUMPLIDA",'
                   f'IF($U{r}<=0,"NO ALCANZADA",'
                   f'IF($L{r}>=($T{r}/MAX(1,{dias_mes})),"EN RITMO","ATRASADA")))))')
    for j, (h, w, tipo, fmt) in enumerate(COLS_METAS, start=1):
        cel = me.cell(row=r, column=j)
        cel.number_format = fmt
        marcar_input(cel) if tipo == "input" else marcar_calc(cel)
    me[f"W{r}"].alignment = AL_CENTRO

me.cell(row=MET_TOT, column=1, value="TOTAL")
for j, (h, w, tipo, fmt) in enumerate(COLS_METAS, start=1):
    cel = me.cell(row=MET_TOT, column=j)
    cel.fill = FILL_HEADER2
    cel.font = Font(name="Calibri", size=10, bold=True, color=BLANCO)
    cel.border = BORDE
    cel.number_format = fmt
    letra = L(j)
    if letra == "A":
        cel.value = "TOTAL"
    elif letra in ("B", "C", "D", "F", "G", "H", "I", "K", "P", "Q", "R"):
        cel.value = f'=SUM(${letra}${MET_R}:${letra}${MET_F})'
    elif letra == "L":
        cel.value = f'=IF(SUM($B${MET_R}:$B${MET_F})=0,"",SUM($G${MET_R}:$G${MET_F})/SUM($B${MET_R}:$B${MET_F}))'
    elif letra == "M":
        cel.value = f'=IF(SUM($C${MET_R}:$C${MET_F})=0,"",SUM($H${MET_R}:$H${MET_F})/SUM($C${MET_R}:$C${MET_F}))'
    elif letra == "N":
        cel.value = f'=IF(SUM($D${MET_R}:$D${MET_F})=0,"",SUM($I${MET_R}:$I${MET_F})/SUM($D${MET_R}:$D${MET_F}))'
    elif letra == "J":
        cel.value = f'=IF(SUM($G${MET_R}:$G${MET_F})=0,"",SUM($H${MET_R}:$H${MET_F})/SUM($G${MET_R}:$G${MET_F}))'

for rng, regla in (
        (f"L{MET_R}:O{MET_F}", CellIsRule(operator="greaterThanOrEqual", formula=["1"],
                                          font=Font(color=VERDE, bold=True),
                                          fill=PatternFill("solid", fgColor="E3F4EA"))),
        (f"L{MET_R}:O{MET_F}", CellIsRule(operator="lessThan", formula=["0.7"],
                                          font=Font(color=ROJO, bold=True),
                                          fill=PatternFill("solid", fgColor="FBE3E6")))):
    me.conditional_formatting.add(rng, regla)
me.conditional_formatting.add(f"W{MET_R}:W{MET_F}", FormulaRule(
    formula=[f'$W{MET_R}="META CUMPLIDA"'], font=Font(color=VERDE, bold=True)))
me.conditional_formatting.add(f"W{MET_R}:W{MET_F}", FormulaRule(
    formula=[f'OR($W{MET_R}="ATRASADA",$W{MET_R}="NO ALCANZADA")'], font=Font(color=ROJO, bold=True)))
dv_numero(me, f"B{MET_R}:D{MET_F}", 0)
dv_numero(me, f"F{MET_R}:F{MET_F}", 0)
me.freeze_panes = f"B{MET_R}"
me.sheet_view.showGridLines = False


# =====================================================================
# 14. ESCENARIOS — simulación base / conservador / crecimiento
# =====================================================================
es = ws["ESCENARIOS"]
titulo(es, "A1", "ESCENARIOS — Simulación de decisiones",
       "Cambie los supuestos y vea al instante qué pasa con las ventas, la utilidad, el margen, "
       "el punto de equilibrio, el ROI y el efectivo. Nada de lo que escriba aquí afecta sus datos reales.")
anchos(es, {"A": 46, "B": 18, "C": 18, "D": 18, "E": 64})
nota(es, "A3", "La columna BASE se llena sola con el promedio de sus datos reales (si aún no hay datos, dirá "
               "PENDIENTE y usted puede escribir sus propios supuestos en la columna manual). "
               "CONSERVADOR y CRECIMIENTO son 100% suyos: no hay supuestos inventados.")
es.merge_cells("A3:E4")
es["A3"].alignment = AL_IZQ_WRAP

encabezado_tabla(es, 6, 1, ["Supuesto", "BASE (automático o manual)", "CONSERVADOR", "CRECIMIENTO",
                            "Notas"], alto=32)
MESES_ACT = f'MAX(1,COUNTIF(RENTABILIDAD!$D${RD}:$D${RF},">0"))'
SUPUESTOS = [
    (7, "Unidades vendidas por mes",
     f'=IF(RENTABILIDAD!$E${RENT_TOT_MES}=0,"PENDIENTE",RENTABILIDAD!$E${RENT_TOT_MES}/{MESES_ACT})',
     FMT_NUM, "Promedio mensual real de unidades vendidas."),
    (8, "Precio de venta promedio",
     f'=IF(RENTABILIDAD!$E${RENT_TOT_MES}=0,"PENDIENTE",RENTABILIDAD!$D${RENT_TOT_MES}/RENTABILIDAD!$E${RENT_TOT_MES})',
     FMT_MONEDA, "Ventas netas ÷ unidades."),
    (9, "Costo variable unitario",
     f'=IF(RENTABILIDAD!$E${RENT_TOT_MES}=0,"PENDIENTE",RENTABILIDAD!$F${RENT_TOT_MES}/RENTABILIDAD!$E${RENT_TOT_MES})',
     FMT_MONEDA, "Costo de ventas ÷ unidades (costo del producto)."),
    (10, "Comisión sobre ventas %", '=0', FMT_PCT, "Comisiones de venta, bancarias o de plataforma."),
    (11, "Gastos fijos mensuales",
     f'=IF(COUNTIF(RENTABILIDAD!$I${RD}:$I${RF},">0")=0,"PENDIENTE",'
     f'SUMIF(RENTABILIDAD!$I${RD}:$I${RF},">0")/COUNTIF(RENTABILIDAD!$I${RD}:$I${RF},">0"))',
     FMT_MONEDA, "Promedio mensual de gastos fijos."),
    (12, "Publicidad mensual",
     f'=IF(RENTABILIDAD!$T${RENT_TOT_MES}=0,0,RENTABILIDAD!$T${RENT_TOT_MES}/{MESES_ACT})',
     FMT_MONEDA, "Inversión mensual en publicidad."),
    (13, "Otros gastos variables mensuales",
     f'=IF(RENTABILIDAD!$J${RENT_TOT_MES}=0,0,MAX(0,(RENTABILIDAD!$J${RENT_TOT_MES}'
     f'-RENTABILIDAD!$T${RENT_TOT_MES})/{MESES_ACT}))',
     FMT_MONEDA, "Gastos variables distintos de publicidad."),
    (14, "% de las ventas cobrado dentro del mes", '=1', FMT_PCT, "Para estimar el efectivo. 100% = todo de contado."),
    (15, "% de las compras y gastos pagado dentro del mes", '=1', FMT_PCT, "100% = paga todo en el mes."),
]
for fila, etiqueta, base, fmt, obs in SUPUESTOS:
    cel = es.cell(row=fila, column=1, value=etiqueta)
    cel.font = F_BOLD
    cel.border = BORDE
    b = es.cell(row=fila, column=2, value=base)
    b.number_format = fmt
    b.fill = FILL_AUTO
    b.border = BORDE
    b.protection = DESBLOQUEADA
    for cidx in (3, 4):
        d = es.cell(row=fila, column=cidx)
        d.number_format = fmt
        marcar_input(d)
    nota(es, f"E{fila}", obs)

banda(es, 17, 1, 5, "RESULTADOS DE CADA ESCENARIO")
RES_ESC = [
    (18, "Ventas del mes", "u*p", FMT_MONEDA, "Unidades × precio."),
    (19, "Costo variable total", "cv", FMT_MONEDA, "Unidades × costo variable unitario + comisiones."),
    (20, "MARGEN DE CONTRIBUCIÓN", "mc", FMT_MONEDA, "Ventas − costos variables."),
    (21, "Margen de contribución %", "mcp", FMT_PCT, "Margen de contribución ÷ ventas."),
    (22, "Gastos fijos + publicidad + otros", "gf", FMT_MONEDA, "Estructura de gastos del mes."),
    (23, "UTILIDAD OPERATIVA", "uo", FMT_MONEDA, "Margen de contribución − gastos."),
    (24, "Margen operativo %", "mo", FMT_PCT, "Utilidad operativa ÷ ventas."),
    (25, "Punto de equilibrio (unidades)", "peu", FMT_NUM, "Gastos ÷ margen de contribución unitario."),
    (26, "Punto de equilibrio (Lempiras)", "pel", FMT_MONEDA, "Punto de equilibrio en unidades × precio."),
    (27, "Margen de seguridad %", "ms", FMT_PCT, "Cuánto puede caer la venta antes de perder."),
    (28, "Inversión mensual en inventario", "inv", FMT_MONEDA, "Unidades × costo variable unitario del producto."),
    (29, "ROI mensual estimado", "roi", FMT_PCT, "Utilidad operativa ÷ (inventario + gastos del mes)."),
    (30, "Flujo de efectivo estimado del mes", "fe", FMT_MONEDA,
     "Ventas cobradas − compras y gastos pagados dentro del mes. Puede ser negativo aunque haya utilidad."),
]
for fila, etiqueta, clave, fmt, obs in RES_ESC:
    cel = es.cell(row=fila, column=1, value=etiqueta)
    cel.font = F_BOLD if etiqueta.isupper() else F_NORMAL
    cel.border = BORDE
    nota(es, f"E{fila}", obs)
    for cidx in (2, 3, 4):
        c_ = L(cidx)
        u, p, cvu = f"${c_}$7", f"${c_}$8", f"${c_}$9"
        com, gfx, pub = f"${c_}$10", f"${c_}$11", f"${c_}$12"
        otr, pc, pp = f"${c_}$13", f"${c_}$14", f"${c_}$15"
        ventas, cvt = f"${c_}$18", f"${c_}$19"
        mc, gastos, uo = f"${c_}$20", f"${c_}$22", f"${c_}$23"
        peu, inv = f"${c_}$25", f"${c_}$28"
        num = lambda x: f'IF(ISNUMBER({x}),{x},0)'  # noqa: E731
        formulas = {
            "u*p": f'=IF(OR(NOT(ISNUMBER({u})),NOT(ISNUMBER({p}))),"PENDIENTE",{u}*{p})',
            "cv": f'=IF(OR(NOT(ISNUMBER({u})),NOT(ISNUMBER({cvu}))),"PENDIENTE",'
                  f'{u}*{cvu}+IF(ISNUMBER({ventas}),{ventas},0)*{num(com)})',
            "mc": f'=IF(OR(NOT(ISNUMBER({ventas})),NOT(ISNUMBER({cvt}))),"PENDIENTE",{ventas}-{cvt})',
            "mcp": f'=IF(OR(NOT(ISNUMBER({mc})),NOT(ISNUMBER({ventas})),{ventas}<=0),"PENDIENTE",{mc}/{ventas})',
            "gf": f'=IF(NOT(ISNUMBER({gfx})),"PENDIENTE",{gfx}+{num(pub)}+{num(otr)})',
            "uo": f'=IF(OR(NOT(ISNUMBER({mc})),NOT(ISNUMBER({gastos}))),"PENDIENTE",{mc}-{gastos})',
            "mo": f'=IF(OR(NOT(ISNUMBER({uo})),NOT(ISNUMBER({ventas})),{ventas}<=0),"PENDIENTE",{uo}/{ventas})',
            "peu": f'=IF(OR(NOT(ISNUMBER({gastos})),NOT(ISNUMBER({mc})),NOT(ISNUMBER({u})),{u}<=0,{mc}<=0),'
                   f'"PENDIENTE",ROUNDUP({gastos}/({mc}/{u}),0))',
            "pel": f'=IF(OR(NOT(ISNUMBER({peu})),NOT(ISNUMBER({p}))),"PENDIENTE",{peu}*{p})',
            "ms": f'=IF(OR(NOT(ISNUMBER({peu})),NOT(ISNUMBER({u})),{u}<=0),"PENDIENTE",({u}-{peu})/{u})',
            "inv": f'=IF(OR(NOT(ISNUMBER({u})),NOT(ISNUMBER({cvu}))),"PENDIENTE",{u}*{cvu})',
            "roi": f'=IF(OR(NOT(ISNUMBER({uo})),NOT(ISNUMBER({inv})),NOT(ISNUMBER({gastos})),'
                   f'(N({inv})+N({gastos}))<=0),"PENDIENTE",{uo}/({inv}+{gastos}))',
            "fe": f'=IF(OR(NOT(ISNUMBER({ventas})),NOT(ISNUMBER({inv})),NOT(ISNUMBER({gastos}))),"PENDIENTE",'
                  f'{ventas}*IF(ISNUMBER({pc}),{pc},1)-({inv}+{gastos})*IF(ISNUMBER({pp}),{pp},1))',
        }
        c2 = es.cell(row=fila, column=cidx, value=formulas[clave])
        c2.number_format = fmt
        marcar_calc(c2)
        if etiqueta.isupper():
            c2.font = F_BOLD

es.conditional_formatting.add("B23:D23", CellIsRule(
    operator="lessThan", formula=["0"], font=Font(color=ROJO, bold=True)))
es.conditional_formatting.add("B30:D30", CellIsRule(
    operator="lessThan", formula=["0"], font=Font(color=ROJO, bold=True)))
es.sheet_view.showGridLines = False


# =====================================================================
# 15. CONTROL — auditoría automática de calidad de datos
# =====================================================================
ct = ws["CONTROL"]
titulo(ct, "A1", "CONTROL DE CALIDAD",
       "Revisión automática de todo el libro. Mientras existan problemas ALTOS, las cifras del "
       "DASHBOARD estarán incompletas.")
anchos(ct, {"A": 6, "B": 58, "C": 12, "D": 12, "E": 16, "F": 46, "G": 3,
            "H": 14, "I": 32, "J": 18, "K": 14, "L": 14, "M": 12, "N": 12,
            "O": 14, "P": 14, "Q": 56})

ct["B3"] = "PROBLEMAS PENDIENTES"
ct["B3"].font = F_KPI_LABEL
ct["B4"] = '=SUMIF($E$8:$E$40,"CORREGIR",$D$8:$D$40)+SUMIF($E$8:$E$40,"REVISAR",$D$8:$D$40)'
ct["B4"].font = F_KPI
ct["B4"].number_format = FMT_NUM
ct["C3"] = "PROBLEMAS CRÍTICOS"
ct["C3"].font = F_KPI_LABEL
ct["C4"] = '=SUMIF($E$8:$E$40,"CORREGIR",$D$8:$D$40)'
ct["C4"].font = Font(name="Calibri", size=18, bold=True, color=ROJO)
ct["C4"].number_format = FMT_NUM

encabezado_tabla(ct, 7, 1, ["#", "Chequeo automático", "Severidad", "Cantidad", "Estado",
                            "Dónde se corrige"], alto=28)

SP = "SUMPRODUCT"
CHEQUEOS = [
    ("Productos sin «Precio de venta actual»", "Alta",
     f'={SP}(({T_PROD}[SKU]<>"")*({T_PROD}[Precio de venta actual]=""))',
     "PRODUCTOS · columna «Precio de venta actual»"),
    ("Productos sin costo capturado", "Alta",
     f'={SP}(({T_PROD}[SKU]<>"")*(NOT(ISNUMBER({T_PROD}[COSTO REAL UNITARIO])))*1)',
     "COSTOS · columna «Costo de compra unitario»"),
    ("SKU de PRODUCTOS que no tienen fila en COSTOS", "Alta",
     f'={SP}(({T_PROD}[SKU]<>"")*(COUNTIF({T_COST}[SKU],{T_PROD}[SKU]&"")=0)*1)',
     "COSTOS · agregue una fila con ese SKU"),
    ("Productos con MARGEN NEGATIVO (vende por debajo del costo)", "Alta",
     f'=COUNTIF({T_PROD}[Estado de datos],"MARGEN NEGATIVO")',
     "PRODUCTOS · revise precio o COSTOS · revise costo"),
    ("Productos con precio igual al costo (utilidad cero)", "Media",
     f'=COUNTIF({T_PROD}[Estado de datos],"PRECIO = COSTO")',
     "PRODUCTOS · columna «Precio de venta actual»"),
    ("SKU duplicados en PRODUCTOS", "Alta",
     f'={SP}(({T_PROD}[SKU]<>"")*(COUNTIF({T_PROD}[SKU],{T_PROD}[SKU]&"")>1))',
     "PRODUCTOS · cada SKU debe ser único"),
    ("Productos duplicados (mismo nombre y presentación)", "Media",
     f'={SP}(({T_PROD}[Nombre del producto]<>"")*'
     f'(COUNTIFS({T_PROD}[Nombre del producto],{T_PROD}[Nombre del producto]&"",'
     f'{T_PROD}[Presentación],{T_PROD}[Presentación]&"")>1))',
     "PRODUCTOS · unifique el producto repetido"),
    ("SKU duplicados en COSTOS", "Alta",
     f'={SP}(({T_COST}[SKU]<>"")*(COUNTIF({T_COST}[SKU],{T_COST}[SKU]&"")>1))',
     "COSTOS · un solo renglón por SKU"),
    ("Productos con STOCK NEGATIVO (vendió más de lo que tenía)", "Alta",
     f'=COUNTIF({T_INV}[ESTADO],"ERROR")',
     "INVENTARIO · registre la compra faltante o corrija la venta"),
    ("Productos AGOTADOS", "Media", f'=COUNTIF({T_INV}[ESTADO],"AGOTADO")',
     "INVENTARIO · reabastezca"),
    ("Productos que necesitan REABASTECERSE", "Media", f'=COUNTIF({T_INV}[ESTADO],"REABASTECER")',
     "INVENTARIO · columna «Unidades sugeridas a comprar»"),
    ("Productos en inventario sin costo para valorizar", "Alta",
     f'=COUNTIF({T_INV}[Método de costo],"PENDIENTE")',
     "COSTOS · capture el costo, o COMPRAS · registre una compra"),
    ("Ventas con algún problema detectado", "Alta",
     f'={SP}(({T_VENTAS}[ALERTA]<>"")*({T_VENTAS}[ALERTA]<>"OK"))',
     "VENTAS · columna ALERTA (última columna)"),
    ("Ventas sin precio definido", "Alta",
     f'={SP}(ISNUMBER(SEARCH("Falta precio",{T_VENTAS}[ALERTA]))*1)',
     "PRODUCTOS · defina el precio de venta actual"),
    ("Ventas sin costo del producto", "Alta",
     f'={SP}(ISNUMBER(SEARCH("Falta costo",{T_VENTAS}[ALERTA]))*1)',
     "COSTOS · capture el costo del SKU vendido"),
    ("Ventas con UTILIDAD NEGATIVA", "Alta",
     f'={SP}(ISNUMBER(SEARCH("UTILIDAD NEGATIVA",{T_VENTAS}[ALERTA]))*1)',
     "VENTAS · revise precio, descuento y costo"),
    ("Ventas sin cliente", "Media",
     f'={SP}(ISNUMBER(SEARCH("Falta cliente",{T_VENTAS}[ALERTA]))*1)', "VENTAS · columna «Cliente»"),
    ("Ventas sin canal", "Baja",
     f'={SP}(ISNUMBER(SEARCH("Falta canal",{T_VENTAS}[ALERTA]))*1)', "VENTAS · columna «Canal»"),
    ("Ventas de un SKU que no existe en PRODUCTOS", "Alta",
     f'={SP}(ISNUMBER(SEARCH("SKU no existe",{T_VENTAS}[ALERTA]))*1)', "VENTAS · seleccione un SKU válido"),
    ("Compras con algún problema detectado", "Alta",
     f'={SP}(({T_COMPRAS}[ALERTA]<>"")*({T_COMPRAS}[ALERTA]<>"OK"))', "COMPRAS · columna ALERTA"),
    ("Compras sin proveedor", "Media",
     f'={SP}(ISNUMBER(SEARCH("Falta proveedor",{T_COMPRAS}[ALERTA]))*1)', "COMPRAS · columna «Proveedor»"),
    ("Gastos SIN CATEGORÍA", "Media",
     f'={SP}(ISNUMBER(SEARCH("SIN CATEGORÍA",{T_GASTOS}[ALERTA]))*1)', "GASTOS · columna «Categoría»"),
    ("Gastos sin clasificar como Fijo o Variable", "Alta",
     f'={SP}(ISNUMBER(SEARCH("Falta tipo",{T_GASTOS}[ALERTA]))*1)', "GASTOS · columna «Tipo de gasto»"),
    ("Gastos con algún problema detectado", "Media",
     f'={SP}(({T_GASTOS}[ALERTA]<>"")*({T_GASTOS}[ALERTA]<>"OK"))', "GASTOS · columna ALERTA"),
    ("Movimientos de caja con algún problema", "Media",
     f'={SP}(({T_CAJAMOV}[ALERTA]<>"")*({T_CAJAMOV}[ALERTA]<>"OK"))', "CAJA · columna ALERTA"),
    ("Clientes duplicados", "Media",
     f'={SP}(({T_CLI}[Nombre]<>"")*(COUNTIF({T_CLI}[Nombre],{T_CLI}[Nombre]&"")>1))',
     "CLIENTES · unifique el nombre repetido"),
    ("Proveedores duplicados", "Media",
     f'={SP}(({T_PROV}[Proveedor]<>"")*(COUNTIF({T_PROV}[Proveedor],{T_PROV}[Proveedor]&"")>1))',
     "PROVEEDORES · unifique el nombre repetido"),
    ("Pagos registrados sin fecha de pago", "Media",
     f'={SP}(ISNUMBER(SEARCH("sin fecha",{T_COMPRAS}[ALERTA]))*1)'
     f'+{SP}(ISNUMBER(SEARCH("sin fecha",{T_GASTOS}[ALERTA]))*1)'
     f'+{SP}(ISNUMBER(SEARCH("sin fecha",{T_VENTAS}[ALERTA]))*1)',
     "COMPRAS / GASTOS / VENTAS · columna «Fecha de pago» o «Fecha de cobro»"),
    ("Saldo inicial de caja sin definir", "Media",
     '=IF(ISNUMBER(PAR_SALDO_CAJA),0,1)', "CONFIG · «Saldo inicial de caja»"),
    ("Capital aportado sin definir", "Baja",
     '=IF(ISNUMBER(PAR_CAPITAL_INICIAL),0,1)', "CONFIG · «Capital aportado inicial»"),
    ("Ventas pendientes de cobro (informativo)", "Baja",
     f'={SP}(({T_VENTAS}[Saldo por cobrar]<>"")*({T_VENTAS}[Saldo por cobrar]>0.01))',
     "VENTAS · columna «Saldo por cobrar»"),
    ("Compras pendientes de pago (informativo)", "Baja",
     f'={SP}(({T_COMPRAS}[Saldo por pagar]<>"")*({T_COMPRAS}[Saldo por pagar]>0.01))',
     "COMPRAS · columna «Saldo por pagar»"),
]
for i, (texto, sev, formula, donde) in enumerate(CHEQUEOS):
    r = 8 + i
    ct.cell(row=r, column=1, value=i + 1).alignment = AL_CENTRO
    ct.cell(row=r, column=2, value=texto)
    ct.cell(row=r, column=3, value=sev).alignment = AL_CENTRO
    ct.cell(row=r, column=4, value=formula).number_format = FMT_NUM
    ct.cell(row=r, column=5,
            value=f'=IF($D{r}=0,"OK",IF($C{r}="Alta","CORREGIR","REVISAR"))').alignment = AL_CENTRO
    ct.cell(row=r, column=6, value=donde).font = F_NOTA
    for j in range(1, 7):
        cel = ct.cell(row=r, column=j)
        cel.border = BORDE
        if j in (4, 5):
            marcar_calc(cel)
        if j == 5:
            cel.font = F_BOLD
FIN_CHEQ = 8 + len(CHEQUEOS) - 1
ct.conditional_formatting.add(f"E8:E{FIN_CHEQ}", FormulaRule(
    formula=['$E8="OK"'], font=Font(color=VERDE, bold=True), fill=PatternFill("solid", fgColor="E3F4EA")))
ct.conditional_formatting.add(f"E8:E{FIN_CHEQ}", FormulaRule(
    formula=['$E8="CORREGIR"'], font=Font(color=ROJO, bold=True), fill=PatternFill("solid", fgColor="FBE3E6")))
ct.conditional_formatting.add(f"E8:E{FIN_CHEQ}", FormulaRule(
    formula=['$E8="REVISAR"'], font=Font(color=AMBAR, bold=True), fill=PatternFill("solid", fgColor="FFF3D6")))

# --- Diagnóstico producto por producto (columnas H..Q) ----------------------
banda(ct, 6, 8, 17, "DIAGNÓSTICO PRODUCTO POR PRODUCTO  ·  use el filtro para ver solo los que tienen problemas")
encabezado_tabla(ct, 7, 8, ["SKU", "Producto", "Estado de datos", "Precio de venta actual",
                            "Costo real unitario", "Margen bruto", "Stock actual", "Estado de inventario",
                            "Valor del inventario", "PROBLEMAS DETECTADOS"], alto=34)
for i in range(N_PROD):
    r = 8 + i
    H = f"$H{r}"
    ct[f"H{r}"] = (f'=IFERROR(IF(INDEX({T_PROD}[SKU],ROW()-7)="","",INDEX({T_PROD}[SKU],ROW()-7)),"")')
    ct[f"I{r}"] = guard(f'{H}=""', buscar(T_PROD, "Nombre del producto", H))
    ct[f"J{r}"] = guard(f'{H}=""', buscar(T_PROD, "Estado de datos", H))
    ct[f"K{r}"] = guard(f'{H}=""', buscar(T_PROD, "Precio de venta actual", H, si_falta='"PENDIENTE"'))
    ct[f"L{r}"] = guard(f'{H}=""', buscar(T_PROD, "COSTO REAL UNITARIO", H, si_falta='"PENDIENTE"'))
    ct[f"M{r}"] = guard(f'{H}=""', buscar(T_PROD, "Margen bruto %", H, si_falta='"PENDIENTE"'))
    ct[f"N{r}"] = guard(f'{H}=""', buscar(T_INV, "Stock actual", H, si_falta='""'))
    ct[f"O{r}"] = guard(f'{H}=""', buscar(T_INV, "ESTADO", H, si_falta='""'))
    ct[f"P{r}"] = guard(f'{H}=""', buscar(T_INV, "VALOR DEL INVENTARIO", H, si_falta='"PENDIENTE"'))
    ct[f"Q{r}"] = alerta(f'$H{r}=""', [
        (f'$K{r}="PENDIENTE"', "Sin precio de venta"),
        (f'$L{r}="PENDIENTE"', "Sin costo"),
        (f'AND(ISNUMBER($M{r}),$M{r}<0)', "MARGEN NEGATIVO"),
        (f'AND(ISNUMBER($M{r}),$M{r}=0)', "Utilidad cero"),
        (f'$O{r}="ERROR"', "STOCK NEGATIVO"),
        (f'$O{r}="AGOTADO"', "Agotado"),
        (f'$O{r}="REABASTECER"', "Stock bajo"),
        (f'AND($H{r}<>"",COUNTIF({T_PROD}[SKU],$H{r})>1)', "SKU DUPLICADO"),
        (f'AND($H{r}<>"",COUNTIF({T_COST}[SKU],$H{r})=0)', "Sin fila en COSTOS"),
        (f'$P{r}="PENDIENTE"', "Inventario sin valorizar"),
    ])
    for j, fmt in ((8, FMT_TEXTO), (9, FMT_TEXTO), (10, FMT_TEXTO), (11, FMT_MONEDA), (12, FMT_MONEDA),
                   (13, FMT_PCT), (14, FMT_NUM), (15, FMT_TEXTO), (16, FMT_MONEDA), (17, FMT_TEXTO)):
        cel = ct.cell(row=r, column=j)
        cel.number_format = fmt
        marcar_calc(cel)
FIN_DIAG = 8 + N_PROD - 1
ct.auto_filter.ref = f"H7:Q{FIN_DIAG}"
ct.conditional_formatting.add(f"Q8:Q{FIN_DIAG}", FormulaRule(
    formula=['AND($Q8<>"",$Q8<>"OK")'], font=Font(color=ROJO, bold=True),
    fill=PatternFill("solid", fgColor="FBE3E6")))
ct.conditional_formatting.add(f"Q8:Q{FIN_DIAG}", FormulaRule(
    formula=['$Q8="OK"'], font=Font(color=VERDE)))
ct.freeze_panes = "A8"
ct.sheet_view.showGridLines = False


# =====================================================================
# 16. DASHBOARD — tablero de control
# =====================================================================
da = ws["DASHBOARD"]
da.sheet_view.showGridLines = False
titulo(da, "B1", "AROMATIC · TABLERO FINANCIERO",
       "Todo lo que ve aquí se calcula solo. Cambie el mes en la celda amarilla para analizar otro período.")
da.column_dimensions["A"].width = 2
for i in range(2, 22):
    da.column_dimensions[L(i)].width = 13.5

da["B4"] = "Mes en análisis:"
da["B4"].font = F_BOLD
da["C4"] = INICIO_CALENDARIO
da["C4"].number_format = FMT_MES
marcar_input(da["C4"])
da["C4"].alignment = AL_CENTRO
dv_mes = DataValidation(type="list", formula1="=LISTA_MESES", allow_blank=True, showDropDown=False)
dv_mes.errorTitle = "Mes inválido"
dv_mes.error = "Seleccione un mes del calendario financiero."
da.add_data_validation(dv_mes)
dv_mes.add("C4")
wb.defined_names.add(DefinedName("LISTA_MESES", attr_text=(
    f"RENTABILIDAD!$A${RENT_R_MES}:$A${RENT_F_MES}")))
nota(da, "E4", "← seleccione el mes")
da["G4"] = '=IF(CONTROL!$B$4=0,"✓ Datos sin problemas pendientes","⚠ "&TEXT(CONTROL!$B$4,"0")&" dato(s) pendiente(s) o problema(s) detectado(s) — vea la hoja CONTROL")'
da["G4"].font = F_BOLD
da.merge_cells("G4:M4")
da.conditional_formatting.add("G4", FormulaRule(
    formula=['CONTROL!$B$4>0'], font=Font(color=ROJO, bold=True)))
da.conditional_formatting.add("G4", FormulaRule(
    formula=['CONTROL!$B$4=0'], font=Font(color=VERDE, bold=True)))

MESREF = "$C$4"
MREF = f'MATCH({MESREF},RENTABILIDAD!$A${RENT_R_MES}:$A${RENT_F_MES},0)'


def rent(colu):
    """Valor del mes seleccionado en la columna indicada de RENTABILIDAD."""
    return (f'IFERROR(INDEX(RENTABILIDAD!${colu}${RENT_R_MES}:${colu}${RENT_F_MES},{MREF}),"")')


def caja(colu):
    return (f'IFERROR(INDEX(CAJA!${colu}${CAJA_R}:${colu}${CAJA_F},{MREF}),"")')


def metas(colu):
    return (f'IFERROR(INDEX(METAS!${colu}${MET_R}:${colu}${MET_F},{MREF}),"")')


def tile(fila, col_ini, etiqueta, formula, fmt, color=None, ancho=3):
    da.merge_cells(start_row=fila, start_column=col_ini, end_row=fila, end_column=col_ini + ancho - 1)
    da.merge_cells(start_row=fila + 1, start_column=col_ini, end_row=fila + 1, end_column=col_ini + ancho - 1)
    lab = da.cell(row=fila, column=col_ini, value=etiqueta)
    lab.font = F_KPI_LABEL
    lab.alignment = AL_CENTRO
    val = da.cell(row=fila + 1, column=col_ini, value=formula)
    val.font = Font(name="Calibri", size=16, bold=True, color=color or AZUL_OSCURO)
    val.number_format = fmt
    val.alignment = AL_CENTRO
    for k in range(ancho):
        for rr in (fila, fila + 1):
            cc = da.cell(row=rr, column=col_ini + k)
            cc.border = BORDE
            if rr == fila + 1:
                cc.fill = FILL_CALC
    da.row_dimensions[fila + 1].height = 26


SECCIONES = [
    (6, "VENTAS DEL MES SELECCIONADO", [
        ("Ventas netas", f'={rent("D")}', FMT_MONEDA0, None),
        ("Unidades vendidas", f'={rent("E")}', FMT_NUM, None),
        ("Ticket promedio", f'={rent("R")}', FMT_MONEDA, None),
        ("Transacciones", f'={rent("Q")}', FMT_NUM, None),
    ]),
    (10, "RENTABILIDAD DEL MES", [
        ("Utilidad bruta", f'={rent("G")}', FMT_MONEDA0, None),
        ("Margen bruto", f'={rent("H")}', FMT_PCT, None),
        ("Utilidad neta", f'={rent("O")}', FMT_MONEDA0, None),
        ("Margen neto", f'={rent("P")}', FMT_PCT, None),
    ]),
    (14, "ACUMULADO DEL NEGOCIO", [
        ("Ventas acumuladas", f'=RENTABILIDAD!$D${RENT_TOT_MES}', FMT_MONEDA0, None),
        ("Utilidad neta acumulada", f'=RENTABILIDAD!$O${RENT_TOT_MES}', FMT_MONEDA0, None),
        ("ROI sobre la inversión", f'=RENTABILIDAD!${VB}${filas_resumen["ROI sobre la inversión"]}', FMT_PCT, None),
        ("Margen neto acumulado", f'=RENTABILIDAD!$P${RENT_TOT_MES}', FMT_PCT, None),
    ]),
    (18, "INVENTARIO Y CAPITAL", [
        ("Valor del inventario", f'=RENTABILIDAD!${VB}${f_valor_inv}', FMT_MONEDA0, None),
        ("Productos con stock bajo", f'=COUNTIF({T_INV}[ESTADO],"REABASTECER")', FMT_NUM, AMBAR),
        ("Productos agotados", f'=COUNTIF({T_INV}[ESTADO],"AGOTADO")', FMT_NUM, ROJO),
        ("Capital de trabajo comprometido",
         f'=RENTABILIDAD!${VB}${filas_resumen["Capital de trabajo comprometido"]}', FMT_MONEDA0, None),
    ]),
    (22, "EFECTIVO DEL MES", [
        ("Entradas de efectivo", f'={caja("G")}', FMT_MONEDA0, VERDE),
        ("Salidas de efectivo", f'={caja("M")}', FMT_MONEDA0, ROJO),
        ("Flujo neto del mes", f'={caja("N")}', FMT_MONEDA0, None),
        ("Saldo disponible al cierre", f'={caja("O")}', FMT_MONEDA0, None),
    ]),
    (26, "CUMPLIMIENTO DE METAS DEL MES", [
        ("Cumplimiento de ventas", f'={metas("L")}', FMT_PCT, None),
        ("Cumplimiento de utilidad", f'={metas("M")}', FMT_PCT, None),
        ("Cumplimiento de unidades", f'={metas("N")}', FMT_PCT, None),
        ("Estado del mes", f'={metas("W")}', FMT_TEXTO, None),
    ]),
    (30, "INDICADORES FINANCIEROS CLAVE", [
        ("Punto de equilibrio (unidades/mes)", '=EQUILIBRIO!$B$16', FMT_NUM, None),
        ("Punto de equilibrio (Lempiras/mes)", '=EQUILIBRIO!$B$17', FMT_MONEDA0, None),
        ("Margen de contribución %", '=EQUILIBRIO!$B$15', FMT_PCT, None),
        ("Cuentas por cobrar", f'=RENTABILIDAD!${VB}${f_cxc}', FMT_MONEDA0, AMBAR),
    ]),
]
for fila_banda, titulo_sec, tiles in SECCIONES:
    banda(da, fila_banda, 2, 13, titulo_sec)
    for k, (etiqueta, formula, fmt, color) in enumerate(tiles):
        tile(fila_banda + 1, 2 + k * 3, etiqueta, formula, fmt, color)

da.conditional_formatting.add("B27:M28", CellIsRule(
    operator="greaterThanOrEqual", formula=["1"], font=Font(size=16, bold=True, color=VERDE)))
da.conditional_formatting.add("B23:M24", CellIsRule(
    operator="lessThan", formula=["0"], font=Font(size=16, bold=True, color=ROJO)))

# ---- Área auxiliar para los rankings (columnas P..U) ------------------------
AUX = 16   # P
da.cell(row=34, column=AUX, value="Datos auxiliares de los gráficos (no editar)").font = F_NOTA
CLAVE_U = CPC["Clave orden (interna)"]
CLAVE_Q = CPC["Clave orden unidades (interna)"]
NOM = CPC["Producto"]
UTI = CPC["Utilidad bruta"]
UNI = CPC["Unidades vendidas"]
da.cell(row=35, column=AUX, value="Producto (utilidad)").font = F_BOLD
da.cell(row=35, column=AUX + 1, value="Utilidad").font = F_BOLD
da.cell(row=35, column=AUX + 3, value="Producto (unidades)").font = F_BOLD
da.cell(row=35, column=AUX + 4, value="Unidades").font = F_BOLD
for k in range(10):
    r = 36 + k
    rng_clave = f"RENTABILIDAD!${CLAVE_U}${RENT_R_PROD}:${CLAVE_U}${RENT_F_PROD}"
    rng_nom = f"RENTABILIDAD!${NOM}${RENT_R_PROD}:${NOM}${RENT_F_PROD}"
    rng_uti = f"RENTABILIDAD!${UTI}${RENT_R_PROD}:${UTI}${RENT_F_PROD}"
    da.cell(row=r, column=AUX, value=(
        f'=IFERROR(IF(LARGE({rng_clave},{k + 1})<=0,"",'
        f'INDEX({rng_nom},MATCH(LARGE({rng_clave},{k + 1}),{rng_clave},0))),"")'))
    da.cell(row=r, column=AUX + 1, value=(
        f'=IFERROR(IF(LARGE({rng_clave},{k + 1})<=0,"",'
        f'INDEX({rng_uti},MATCH(LARGE({rng_clave},{k + 1}),{rng_clave},0))),"")')).number_format = FMT_MONEDA
    rng_claveq = f"RENTABILIDAD!${CLAVE_Q}${RENT_R_PROD}:${CLAVE_Q}${RENT_F_PROD}"
    rng_uni = f"RENTABILIDAD!${UNI}${RENT_R_PROD}:${UNI}${RENT_F_PROD}"
    da.cell(row=r, column=AUX + 3, value=(
        f'=IFERROR(IF(LARGE({rng_claveq},{k + 1})<=0,"",'
        f'INDEX({rng_nom},MATCH(LARGE({rng_claveq},{k + 1}),{rng_claveq},0))),"")'))
    da.cell(row=r, column=AUX + 4, value=(
        f'=IFERROR(IF(LARGE({rng_claveq},{k + 1})<=0,"",'
        f'INDEX({rng_uni},MATCH(LARGE({rng_claveq},{k + 1}),{rng_claveq},0))),"")')).number_format = FMT_NUM
for cc in range(AUX, AUX + 6):
    da.column_dimensions[L(cc)].width = 18
    da.column_dimensions[L(cc)].hidden = True      # área auxiliar: alimenta los gráficos, no se muestra
da.print_area = "B1:M89"


# ---- Gráficos del DASHBOARD -------------------------------------------------
def estilo_grafico(ch, titulo_ch, alto=8.6, ancho=16.4):
    ch.title = titulo_ch
    ch.height = alto
    ch.width = ancho
    ch.style = 2
    ch.y_axis.majorGridlines = ch.y_axis.majorGridlines
    ch.legend.position = "b"
    return ch


ch1 = LineChart()
estilo_grafico(ch1, "Ventas netas y utilidad neta por mes")
d1 = Reference(re_, min_col=4, max_col=4, min_row=RENT_HDR_MES, max_row=RENT_F_MES)
d2 = Reference(re_, min_col=15, max_col=15, min_row=RENT_HDR_MES, max_row=RENT_F_MES)
ch1.add_data(d1, titles_from_data=True)
ch1.add_data(d2, titles_from_data=True)
ch1.set_categories(Reference(re_, min_col=1, max_col=1, min_row=RENT_R_MES, max_row=RENT_F_MES))
ch1.y_axis.numFmt = '"L"#,##0'
da.add_chart(ch1, "B34")

ch2 = BarChart()
estilo_grafico(ch2, "Flujo de efectivo mensual")
ch2.type = "col"
ch2.grouping = "clustered"
for colu in (7, 13):     # G entradas, M salidas
    ch2.add_data(Reference(ca, min_col=colu, max_col=colu, min_row=CAJA_HDR, max_row=CAJA_F),
                 titles_from_data=True)
ch2.set_categories(Reference(ca, min_col=1, max_col=1, min_row=CAJA_R, max_row=CAJA_F))
ch2.y_axis.numFmt = '"L"#,##0'
lin = LineChart()
lin.add_data(Reference(ca, min_col=15, max_col=15, min_row=CAJA_HDR, max_row=CAJA_F), titles_from_data=True)
lin.y_axis.axId = 200
ch2 += lin
da.add_chart(ch2, "I34")

ch3 = BarChart()
estilo_grafico(ch3, "Ventas netas por categoría")
ch3.type = "bar"
ch3.add_data(Reference(re_, min_col=CC_INI + 2, max_col=CC_INI + 2,
                       min_row=RENT_HDR_MES, max_row=RENT_F_CAT), titles_from_data=True)
ch3.set_categories(Reference(re_, min_col=CC_INI, max_col=CC_INI,
                             min_row=RENT_R_CAT, max_row=RENT_F_CAT))
ch3.y_axis.numFmt = '"L"#,##0'
ch3.legend = None
da.add_chart(ch3, "B52")

ch4 = BarChart()
estilo_grafico(ch4, "Top 10 productos por utilidad bruta")
ch4.type = "bar"
ch4.add_data(Reference(da, min_col=AUX + 1, max_col=AUX + 1, min_row=35, max_row=45), titles_from_data=True)
ch4.set_categories(Reference(da, min_col=AUX, max_col=AUX, min_row=36, max_row=45))
ch4.y_axis.numFmt = '"L"#,##0'
ch4.legend = None
da.add_chart(ch4, "I52")

ch5 = LineChart()
estilo_grafico(ch5, "Evolución del margen bruto y del margen neto")
ch5.add_data(Reference(re_, min_col=8, max_col=8, min_row=RENT_HDR_MES, max_row=RENT_F_MES),
             titles_from_data=True)
ch5.add_data(Reference(re_, min_col=16, max_col=16, min_row=RENT_HDR_MES, max_row=RENT_F_MES),
             titles_from_data=True)
ch5.set_categories(Reference(re_, min_col=1, max_col=1, min_row=RENT_R_MES, max_row=RENT_F_MES))
ch5.y_axis.numFmt = '0%'
da.add_chart(ch5, "B70")

ch6 = BarChart()
estilo_grafico(ch6, "Top 10 productos por unidades vendidas")
ch6.type = "bar"
ch6.add_data(Reference(da, min_col=AUX + 4, max_col=AUX + 4, min_row=35, max_row=45), titles_from_data=True)
ch6.set_categories(Reference(da, min_col=AUX + 3, max_col=AUX + 3, min_row=36, max_row=45))
ch6.legend = None
da.add_chart(ch6, "I70")

nota(da, "B88", "Los gráficos se actualizan solos al registrar ventas, compras y gastos. "
                "Si un gráfico aparece vacío es porque todavía no hay datos de ese tipo.")
da.merge_cells("B88:M88")


# =====================================================================
# 17. INICIO — guía de uso
# =====================================================================
ini = ws["INICIO"]
ini.sheet_view.showGridLines = False
anchos(ini, {"A": 3, "B": 36, "C": 112, "D": 3})
titulo(ini, "B1", "AROMATIC · Sistema Financiero y de Gestión Comercial",
       "Guía de uso. Léala una vez y tendrá el control total del sistema.")
ini.row_dimensions[1].height = 24

_fila = [4]


def sec(texto):
    r = _fila[0]
    banda(ini, r, 2, 3, texto)
    ini.row_dimensions[r].height = 22
    _fila[0] = r + 1


def par(etiqueta, texto, negrita=True):
    r = _fila[0]
    if etiqueta:
        c1 = ini.cell(row=r, column=2, value=etiqueta)
        c1.font = F_BOLD if negrita else F_NORMAL
        c1.alignment = AL_IZQ_WRAP
        c1.border = BORDE
    c2 = ini.cell(row=r, column=3, value=texto)
    c2.font = F_NORMAL
    c2.alignment = AL_IZQ_WRAP
    c2.border = BORDE
    ini.row_dimensions[r].height = max(16, 14 * (1 + len(texto) // 108))
    _fila[0] = r + 1
    return r


def vacio(n=1):
    _fila[0] += n


sec("¿QUÉ ES ESTE ARCHIVO?")
par("En una frase",
    "Es el centro financiero de AROMATIC: registra productos, costos, compras, ventas y gastos, y a partir "
    "de eso calcula solo su inventario, su utilidad, su efectivo, su punto de equilibrio y sus metas.")
par("Lo más importante",
    "Usted solo escribe en las celdas AMARILLAS. Todo lo demás se calcula. Nunca borre una fórmula: "
    "si se equivoca, pulse Ctrl+Z.")
par("Precios del catálogo",
    "El catálogo 2016 se usó únicamente para cargar los 40 productos con sus nombres, categorías y "
    "presentaciones. Sus precios quedaron guardados aparte, en la columna «Precio de referencia del "
    "catálogo 2016», que es informativa y NO entra en ningún cálculo. El sistema trabaja exclusivamente "
    "con «Precio de venta actual», que está vacío hasta que usted lo defina.")
par("Nada inventado",
    "No hay ni un solo precio, costo, margen o proyección inventado. Donde falta información el sistema "
    "dice PENDIENTE en lugar de mostrar un número falso o un error de Excel.")
vacio()

sec("CÓDIGO DE COLORES")
r = par("Amarillo", "Celda de captura: usted escribe aquí.")
ini.cell(row=r, column=2).fill = FILL_INPUT
r = par("Gris claro", "Celda calculada: no la toque, contiene una fórmula.")
ini.cell(row=r, column=2).fill = FILL_CALC
r = par("Verde claro", "Se llena sola, pero usted puede sobrescribirla en un caso puntual "
                       "(por ejemplo, el precio de una venta con condiciones especiales).")
ini.cell(row=r, column=2).fill = FILL_AUTO
r = par("Gris con letra cursiva", "Dato informativo del catálogo 2016. No se usa en ningún cálculo.")
ini.cell(row=r, column=2).fill = PatternFill("solid", fgColor="EDEDED")
par("Rojo / Ámbar", "Alertas automáticas: algo está mal o requiere su atención.")
vacio()

sec("MAPA DE HOJAS")
MAPA = [
    ("DASHBOARD", "Tablero con los números clave del mes y del negocio.", "No se escribe (solo el mes)"),
    ("PRODUCTOS", "Catálogo maestro: un SKU por fila, con precio, stock mínimo y máximo.", "SÍ"),
    ("COSTOS", "Todos los costos de cada producto: compra, transporte, impuestos, empaque, comisiones.", "SÍ"),
    ("COMPRAS", "Lo que usted le compra a sus proveedores. Aumenta el inventario.", "SÍ"),
    ("INVENTARIO", "Existencias y valor del inventario. Se calcula solo.", "Solo stock inicial y ajustes"),
    ("VENTAS", "Cada venta, línea por línea. Disminuye el inventario.", "SÍ"),
    ("GASTOS", "Gastos del negocio, separados en fijos y variables.", "SÍ"),
    ("CAJA", "Entradas y salidas de dinero real, mes por mes.", "Solo aportes, retiros y otros movimientos"),
    ("CLIENTES", "Base de clientes con su historial de compras.", "SÍ"),
    ("PROVEEDORES", "Base de proveedores con condiciones y saldos.", "SÍ"),
    ("RENTABILIDAD", "Estado de resultados mensual y análisis por producto, categoría y canal.", "No"),
    ("EQUILIBRIO", "Cuánto necesita vender para no perder dinero.", "Solo los supuestos"),
    ("METAS", "Sus objetivos del mes y el avance real.", "Solo las metas"),
    ("ESCENARIOS", "Simulador: qué pasa si sube el precio, si baja el costo, si vende más.", "Solo los supuestos"),
    ("CONTROL", "Auditoría automática: le dice exactamente qué datos faltan o están mal.", "No"),
    ("CONFIG", "Moneda, categorías, canales, métodos de pago y demás listas del sistema.", "SÍ"),
]
hdr = _fila[0]
encabezado_tabla(ini, hdr, 2, ["Hoja", "Para qué sirve", ""], alto=20)
ini.cell(row=hdr, column=2, value="Hoja")
ini.cell(row=hdr, column=3, value="Para qué sirve  ·  ¿se escribe en ella?")
_fila[0] += 1
for hoja, para, escribe in MAPA:
    r = _fila[0]
    c1 = ini.cell(row=r, column=2, value=hoja)
    c1.font = Font(name="Calibri", size=10, bold=True, color="0B5AA2", underline="single")
    c1.hyperlink = f"#'{hoja}'!A1"
    c1.border = BORDE
    c2 = ini.cell(row=r, column=3, value=f"{para}   →  ¿Escribe usted aquí?: {escribe}")
    c2.alignment = AL_IZQ_WRAP
    c2.border = BORDE
    _fila[0] = r + 1
vacio()

sec("PRIMEROS PASOS (hágalos en este orden)")
PASOS = [
    "1. Vaya a CONFIG y escriba su saldo inicial de caja, su capital aportado y la fecha de inicio del calendario.",
    "2. Vaya a PROVEEDORES y registre a quién le compra (el nombre es la llave del sistema).",
    "3. Vaya a COSTOS y escriba, para cada producto que ya vende, cuánto le cuesta: compra, transporte, "
    "impuestos, empaque. Si algo no aplica, déjelo vacío.",
    "4. Vaya a PRODUCTOS y escriba el «Precio de venta actual» de cada producto. En ese momento el sistema "
    "calcula su utilidad, su margen y su markup.",
    "5. Vaya a INVENTARIO y escriba el «Stock inicial» que tiene hoy de cada producto.",
    "6. Registre sus COMPRAS y sus VENTAS conforme vayan ocurriendo.",
    "7. Registre sus GASTOS (alquiler, internet, publicidad, transporte…).",
    "8. Revise la hoja CONTROL: si aparece algún problema, corríjalo. Luego abra el DASHBOARD.",
]
for pso in PASOS:
    par("", pso)
vacio()

sec("CÓMO HACER CADA COSA")
TAREAS = [
    ("Agregar un producto nuevo",
     "1) En PRODUCTOS, escriba en la primera fila vacía: SKU (código único, por ejemplo GEL-250), nombre, "
     "categoría, presentación y unidad. 2) En COSTOS, agregue una fila con ese mismo SKU y capture sus costos. "
     "3) Vuelva a PRODUCTOS y escriba el precio de venta actual. El inventario y todos los análisis lo "
     "incluirán automáticamente."),
    ("Definir o cambiar un precio",
     "En PRODUCTOS, columna «Precio de venta actual». Es el ÚNICO precio que usa el sistema. Al cambiarlo se "
     "recalculan utilidad, margen, markup, margen de contribución y punto de equilibrio."),
    ("Registrar una compra",
     "En COMPRAS: fecha, proveedor, SKU, cantidad y costo unitario. Agregue transporte, impuestos y otros "
     "costos si los hubo: el sistema calcula el costo real de adquisición y actualiza el costo promedio "
     "ponderado del inventario. Si ya pagó, escriba la fecha de pago y el monto pagado."),
    ("Registrar una venta",
     "En VENTAS: fecha, cliente, canal, SKU y cantidad. El precio y el costo se llenan solos. Si cobró, "
     "escriba la fecha de cobro y el monto cobrado; si no, el sistema lo deja como cuenta por cobrar. "
     "Una venta a crédito NO entra a la caja hasta que se cobre."),
    ("Registrar un gasto",
     "En GASTOS: fecha, tipo (Fijo o Variable), categoría, descripción y monto. El tipo es importante: los "
     "gastos fijos son los que determinan su punto de equilibrio."),
    ("Revisar el inventario",
     "Abra INVENTARIO. La columna ESTADO le dice qué hacer: OK, REABASTECER, AGOTADO o ERROR (ERROR = stock "
     "negativo: vendió algo que no había registrado como comprado). «Unidades sugeridas a comprar» le dice "
     "cuánto pedir para llegar al stock máximo."),
    ("Revisar la rentabilidad",
     "Abra RENTABILIDAD. El bloque 1 (columnas A:Y) es su estado de resultados mes a mes. El bloque 2 "
     "(AA:AP) le dice qué producto deja más utilidad. Los bloques 3 y 4 analizan categorías y canales. "
     "El bloque 5 (BJ:BL) resume la inversión, el capital comprometido y el ROI."),
    ("Revisar el flujo de efectivo",
     "Abra CAJA. Compare la columna «Utilidad neta del mes» con «Flujo neto del mes»: la diferencia le "
     "explica por qué puede tener utilidad y no tener dinero (o al revés)."),
    ("Usar los escenarios",
     "Abra ESCENARIOS. La columna BASE se llena con sus datos reales. Escriba sus supuestos en las columnas "
     "CONSERVADOR y CRECIMIENTO y compare ventas, utilidad, margen, punto de equilibrio, ROI y efectivo. "
     "Nada de eso afecta sus datos reales."),
    ("Interpretar el dashboard",
     "Elija el mes en la celda amarilla. Arriba verá ventas, rentabilidad, acumulado, inventario, efectivo, "
     "metas e indicadores clave; abajo, la evolución en gráficos. Si aparece el aviso rojo de problemas "
     "pendientes, vaya a CONTROL antes de tomar decisiones con esos números."),
    ("Interpretar el punto de equilibrio",
     "Abra EQUILIBRIO. «Punto de equilibrio en unidades» es cuánto debe vender al mes para no perder. Si su "
     "venta promedio está por debajo, está perdiendo dinero. El «margen de seguridad» le dice cuánto pueden "
     "caer sus ventas antes de llegar a ese punto."),
    ("Corregir errores",
     "Abra CONTROL. Cada línea le dice qué está mal, cuántos casos hay y en qué hoja se corrige. "
     "La tabla de la derecha señala producto por producto qué le falta."),
]
for etiqueta, texto in TAREAS:
    par(etiqueta, texto)
vacio()

sec("CINCO REGLAS FINANCIERAS QUE ESTE SISTEMA RESPETA")
REGLAS = [
    ("Ingresos ≠ utilidad",
     "Vender L 10,000 no es ganar L 10,000. A la venta hay que restarle el costo del producto (utilidad bruta) "
     "y después los gastos del negocio (utilidad neta). Vea RENTABILIDAD."),
    ("Utilidad ≠ flujo de efectivo",
     "Puede tener utilidad y no tener dinero: si vendió a crédito o si compró inventario. La hoja CAJA "
     "muestra el dinero real y la columna «Diferencia utilidad − flujo» explica la brecha."),
    ("Margen ≠ markup",
     "Margen = utilidad ÷ PRECIO. Markup = utilidad ÷ COSTO. Un producto que cuesta L 100 y se vende a L 150 "
     "tiene 33.3% de margen y 50% de markup. Confundirlos es la forma más común de fijar mal un precio."),
    ("Ventas ≠ dinero disponible",
     "Lo que está en «Cuentas por cobrar» todavía no es suyo. El saldo disponible está en CAJA."),
    ("Costo de compra ≠ costo real",
     "El costo real incluye transporte, impuestos, aranceles y empaque. Por eso la hoja COSTOS separa costos "
     "directos, logísticos y variables de venta: es la única manera de saber si realmente gana dinero."),
]
for etiqueta, texto in REGLAS:
    par(etiqueta, texto)
vacio()

sec("GLOSARIO: QUÉ SIGNIFICA CADA INDICADOR")
GLOSARIO = [
    ("Costo real unitario", "Compra + materia prima + empaque + transporte + importación + impuestos + otros. "
                            "Lo que de verdad le cuesta una unidad puesta en su bodega."),
    ("Costo variable de venta", "Comisiones, delivery y publicidad atribuibles a esa venta. Depende del precio."),
    ("Utilidad unitaria", "Precio de venta actual − costo real unitario."),
    ("Margen bruto %", "Utilidad ÷ precio. De cada L 100 vendidos, cuánto queda antes de gastos."),
    ("Markup %", "Utilidad ÷ costo. Cuánto le agrega al costo para fijar el precio."),
    ("Margen de contribución", "Precio − costo variable total. Lo que cada unidad aporta para pagar los "
                               "gastos fijos. Es la base del punto de equilibrio."),
    ("Utilidad bruta", "Ventas netas − costo de ventas."),
    ("Utilidad operativa", "Utilidad bruta − gastos fijos y variables."),
    ("Utilidad neta", "Utilidad operativa + otros ingresos − otros egresos. Lo que realmente ganó."),
    ("Margen neto %", "Utilidad neta ÷ ventas netas."),
    ("Punto de equilibrio", "Costos fijos ÷ margen de contribución unitario. Las unidades que debe vender "
                            "para no ganar ni perder."),
    ("ROI sobre la inversión", "Utilidad neta acumulada ÷ (compras + gastos). Cuánto rinde cada lempira "
                               "que ha puesto en el negocio."),
    ("ROI sobre el capital", "Utilidad neta acumulada ÷ capital aportado por usted."),
    ("ROAS", "Ventas ÷ inversión en publicidad. Cuántos lempiras vende por cada lempira de publicidad."),
    ("Ticket promedio", "Ventas netas ÷ número de líneas de venta registradas."),
    ("Costo promedio ponderado", "Costo total de adquisición ÷ unidades compradas. Es el costo con el que se "
                                 "valoriza el inventario y se calcula el costo de cada venta."),
    ("Capital de trabajo comprometido", "Inventario + cuentas por cobrar − cuentas por pagar. El dinero que "
                                        "el negocio tiene «atrapado» para poder operar."),
    ("Cobertura de inventario", "Días que le durará el stock actual al ritmo de venta de los últimos 30 días."),
]
for etiqueta, texto in GLOSARIO:
    par(etiqueta, texto)
vacio()

sec("NOTAS TÉCNICAS Y LÍMITES CONOCIDOS")
NOTAS_TEC = [
    ("Capacidad actual", f"{N_PROD} productos, {N_VENTAS} líneas de venta, {N_COMPRAS} compras, "
                         f"{N_GASTOS} gastos, {N_CLIENTES} clientes, {N_PROV} proveedores y "
                         f"{N_MESES} meses de calendario. Para ampliar, copie la última fila de la tabla "
                         "hacia abajo: las fórmulas se replican solas."),
    ("Costeo del inventario", "Se usa costo promedio ponderado global (no por capas ni FIFO). Es el método "
                              "correcto y suficiente para este tamaño de operación; un software futuro puede "
                              "implementar costeo por lotes."),
    ("Ticket promedio", "Se calcula por línea de venta. Si una factura lleva 3 productos, cuentan 3 líneas. "
                        "Use la columna «Folio» para agrupar líneas de una misma factura."),
    ("Ventas anuladas", "Ponga el Estado en «Anulado»: la venta deja de contar en unidades, ingresos, "
                        "inventario y rentabilidad, pero queda registrada como evidencia."),
    ("Impuestos", "El ISV de CONFIG es informativo. Si sus precios ya incluyen impuesto, el sistema trabaja "
                  "con precios brutos; cuando empiece a facturar con ISV conviene registrar los precios sin "
                  "impuesto para no inflar la utilidad."),
    ("Recálculo", "Si algún número no se actualiza, pulse F9 (recalcular). El archivo está diseñado para "
                  "Excel 2016 o superior, Microsoft 365, LibreOffice Calc y Google Sheets."),
]
for etiqueta, texto in NOTAS_TEC:
    par(etiqueta, texto)
vacio()

sec("PREPARADO PARA CONVERTIRSE EN SOFTWARE")
par("Modelo de datos",
    "Cada hoja de captura es una tabla relacional: PRODUCTOS (clave SKU), CLIENTES (ID), PROVEEDORES (ID), "
    "COMPRAS (ID), VENTAS (ID), GASTOS (ID) y MOVIMIENTOS DE CAJA (ID). Los cálculos viven en hojas aparte "
    "(INVENTARIO, RENTABILIDAD, CAJA, CONTROL) y la parametrización vive en CONFIG. Esa separación entre "
    "datos, cálculos y configuración es exactamente la que necesita una base de datos.")
par("Migración",
    "Cuando el negocio lo pida, cada tabla se convierte en una tabla SQL con las mismas columnas y las mismas "
    "llaves; las fórmulas de INVENTARIO, RENTABILIDAD y CAJA se convierten en vistas o consultas. "
    "En el repositorio se incluye el documento MODELO_DE_DATOS.md con el esquema listo para implementar.")
ini.freeze_panes = "A4"

par("Protección",
    "Las hojas RENTABILIDAD, CONTROL y DASHBOARD están protegidas (sin contraseña) para que nadie borre una "
    "fórmula por accidente. Si necesita modificarlas: Revisar → Desproteger hoja. En las demás hojas las "
    "celdas con fórmula están bloqueadas y las amarillas desbloqueadas; puede activar la protección desde "
    "Revisar → Proteger hoja cuando lo desee.")


# =====================================================================
# 18. Protección, propiedades y guardado
# =====================================================================
for nombre in ("RENTABILIDAD", "CONTROL", "DASHBOARD"):
    prot = ws[nombre].protection
    prot.sheet = True
    prot.autoFilter = False
    prot.sort = False
    prot.formatCells = False
    prot.formatColumns = False
    prot.formatRows = False
    prot.selectLockedCells = False
    prot.selectUnlockedCells = False

# Impresión: apaisado y ajustado al ancho de la página
for nombre in wb.sheetnames:
    h = ws[nombre]
    h.page_setup.orientation = "landscape"
    h.page_setup.fitToWidth = 1
    h.page_setup.fitToHeight = 0
    h.sheet_properties.pageSetUpPr.fitToPage = True
    h.print_options.horizontalCentered = True
    h.page_margins.left = h.page_margins.right = 0.4
    h.page_margins.top = h.page_margins.bottom = 0.5
for nombre, fila in (("PRODUCTOS", HDR_PROD), ("COSTOS", HDR_COST), ("COMPRAS", HDR_COMPRAS),
                     ("VENTAS", HDR_VENTAS), ("GASTOS", HDR_GASTOS), ("INVENTARIO", HDR_INV),
                     ("CLIENTES", HDR_CLI), ("PROVEEDORES", HDR_PROV)):
    ws[nombre].print_title_rows = f"{fila}:{fila}"

wb.properties.title = "AROMATIC — Sistema Financiero y de Gestión Comercial"
wb.properties.creator = "AROMATIC"
wb.properties.description = ("Sistema financiero y de gestión comercial. Los precios del catálogo 2016 son "
                             "informativos y no alimentan ningún cálculo.")
wb.calculation.fullCalcOnLoad = True
ws["INICIO"].sheet_view.tabSelected = True
wb.active = 0

RUTA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "AROMATIC_Sistema_Financiero.xlsx")
wb.save(RUTA)
print(f"✔ Archivo generado: {RUTA}")
print(f"  Hojas: {len(wb.sheetnames)}  ·  Productos cargados: {len(PRODUCTOS)}")
