# Modelo de datos — de Excel a aplicación

El libro está construido como una base de datos: cada hoja de captura es una tabla con clave
primaria, los cálculos viven en hojas separadas (vistas) y la parametrización está centralizada.
Este documento traduce esa estructura a un esquema relacional listo para implementar.

## Entidades

| Tabla Excel | Tabla destino | Clave primaria | Tipo |
|---|---|---|---|
| PRODUCTOS | `producto` | `sku` | Maestro |
| COSTOS | `producto_costo` | `sku` (1:1 con producto) | Maestro |
| CLIENTES | `cliente` | `id_cliente` | Maestro |
| PROVEEDORES | `proveedor` | `id_proveedor` | Maestro |
| COMPRAS | `compra_linea` | `id_compra` | Transaccional |
| VENTAS | `venta_linea` | `id_venta` (+ `folio` agrupa la factura) | Transaccional |
| GASTOS | `gasto` | `id_gasto` | Transaccional |
| CAJA (movimientos) | `movimiento_caja` | `id_movimiento` | Transaccional |
| METAS | `meta_mensual` | `mes` | Planificación |
| CONFIG | `parametro` + `catalogo_valor` | `clave` | Configuración |

Las hojas **INVENTARIO, RENTABILIDAD, CAJA (flujo mensual), EQUILIBRIO, ESCENARIOS, CONTROL y
DASHBOARD no son tablas**: son vistas calculadas. En la aplicación se implementan como consultas
o vistas materializadas, nunca como datos guardados.

## Esquema

```sql
CREATE TABLE producto (
  sku                      VARCHAR(24) PRIMARY KEY,
  nombre                   VARCHAR(120) NOT NULL,
  categoria                VARCHAR(40),
  subcategoria             VARCHAR(60),
  presentacion             VARCHAR(30),
  unidad_medida            VARCHAR(20),
  contenido_ml             INTEGER,
  aromas                   TEXT,
  proveedor_principal_id   INTEGER REFERENCES proveedor(id_proveedor),
  precio_catalogo_2016     NUMERIC(12,2),   -- SOLO informativo, nunca en cálculos
  precio_venta_actual      NUMERIC(12,2),   -- NULL = pendiente de definir
  stock_minimo             INTEGER,
  stock_maximo             INTEGER,
  estado                   VARCHAR(20) DEFAULT 'Activo',
  actualizado_en           DATE
);

CREATE TABLE producto_costo (            -- costos unitarios variables
  sku                      VARCHAR(24) PRIMARY KEY REFERENCES producto(sku),
  costo_compra             NUMERIC(12,4),  -- NULL = pendiente
  materia_prima            NUMERIC(12,4),
  empaque                  NUMERIC(12,4),
  transporte               NUMERIC(12,4),
  importacion              NUMERIC(12,4),
  impuestos_aranceles      NUMERIC(12,4),
  otros_logisticos         NUMERIC(12,4),
  otros_variables          NUMERIC(12,4),
  comision_venta_pct       NUMERIC(6,4),
  comision_bancaria_pct    NUMERIC(6,4),
  delivery_unitario        NUMERIC(12,4),
  publicidad_unitaria      NUMERIC(12,4),
  otros_variables_venta    NUMERIC(12,4),
  actualizado_en           DATE
);
-- costo_real_unitario  = suma de los 8 primeros componentes (NULL si costo_compra es NULL)
-- costo_variable_venta = precio_venta_actual*(comisiones) + delivery + publicidad + otros
-- Ambos son columnas calculadas / vistas, no se almacenan.

CREATE TABLE proveedor (
  id_proveedor   SERIAL PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL UNIQUE,
  contacto       VARCHAR(120), telefono VARCHAR(40), email VARCHAR(120),
  suministra     TEXT,
  condiciones_pago VARCHAR(40), dias_credito INTEGER, dias_entrega INTEGER,
  estado         VARCHAR(20), observaciones TEXT
);

CREATE TABLE cliente (
  id_cliente     SERIAL PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL UNIQUE,
  telefono       VARCHAR(40), email VARCHAR(120),
  canal_preferido VARCHAR(40), ciudad VARCHAR(80),
  estado         VARCHAR(20), observaciones TEXT
);

CREATE TABLE compra_linea (
  id_compra      SERIAL PRIMARY KEY,
  fecha          DATE NOT NULL,
  proveedor_id   INTEGER NOT NULL REFERENCES proveedor(id_proveedor),
  sku            VARCHAR(24) NOT NULL REFERENCES producto(sku),
  cantidad       NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  costo_unitario NUMERIC(12,4) NOT NULL,
  transporte     NUMERIC(12,2) DEFAULT 0,
  impuestos      NUMERIC(12,2) DEFAULT 0,
  otros_costos   NUMERIC(12,2) DEFAULT 0,
  metodo_pago    VARCHAR(30), estado_pago VARCHAR(20),
  fecha_pago     DATE, monto_pagado NUMERIC(12,2) DEFAULT 0,
  observaciones  TEXT
);
-- costo_total_adquisicion = cantidad*costo_unitario + transporte + impuestos + otros_costos
-- saldo_por_pagar         = costo_total_adquisicion - monto_pagado

CREATE TABLE venta_linea (
  id_venta       SERIAL PRIMARY KEY,
  folio          VARCHAR(30),                      -- agrupa las líneas de una factura
  fecha          DATE NOT NULL,
  cliente_id     INTEGER REFERENCES cliente(id_cliente),
  canal          VARCHAR(40),
  sku            VARCHAR(24) NOT NULL REFERENCES producto(sku),
  cantidad       NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,4) NOT NULL,          -- copiado del producto, editable
  descuento      NUMERIC(12,2) DEFAULT 0,
  costo_unitario NUMERIC(12,4),                    -- costo aplicado al momento de la venta
  metodo_pago    VARCHAR(30),
  estado         VARCHAR(20),                      -- Cobrado | Pendiente | Parcial | Anulado
  fecha_cobro    DATE, monto_cobrado NUMERIC(12,2) DEFAULT 0,
  observaciones  TEXT
);
-- venta_bruta=cantidad*precio_unitario · venta_neta=venta_bruta-descuento
-- costo_total=cantidad*costo_unitario · utilidad=venta_neta-costo_total
-- Las líneas con estado 'Anulado' se excluyen de todo agregado.

CREATE TABLE gasto (
  id_gasto     SERIAL PRIMARY KEY,
  fecha        DATE NOT NULL,
  tipo         VARCHAR(10) NOT NULL CHECK (tipo IN ('Fijo','Variable')),
  categoria    VARCHAR(40) NOT NULL,
  descripcion  VARCHAR(200) NOT NULL,
  proveedor_id INTEGER REFERENCES proveedor(id_proveedor),
  monto        NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  metodo_pago  VARCHAR(30), estado VARCHAR(20),
  fecha_pago   DATE, monto_pagado NUMERIC(12,2) DEFAULT 0,
  canal_atribuido VARCHAR(40),                     -- para ROAS por canal
  observaciones TEXT
);

CREATE TABLE movimiento_caja (
  id_movimiento SERIAL PRIMARY KEY,
  fecha         DATE NOT NULL,
  tipo          VARCHAR(10) NOT NULL CHECK (tipo IN ('Entrada','Salida')),
  concepto      VARCHAR(40) NOT NULL,   -- Aporte de capital, Préstamo, Retiro, Otro ingreso/egreso
  descripcion   VARCHAR(200),
  monto         NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  metodo_pago   VARCHAR(30), observaciones TEXT
);

CREATE TABLE meta_mensual (
  mes           DATE PRIMARY KEY,       -- primer día del mes
  meta_ventas   NUMERIC(14,2), meta_utilidad NUMERIC(14,2),
  meta_unidades NUMERIC(14,2), meta_margen NUMERIC(6,4), meta_efectivo NUMERIC(14,2)
);
```

## Vistas derivadas (equivalen a las hojas calculadas)

| Vista | Definición |
|---|---|
| `v_inventario` | `stock_inicial + Σ compras − Σ ventas efectivas + ajustes`; costo aplicado = `Σ costo_total_adquisicion / Σ cantidad` (promedio ponderado) y, si no hay compras, `costo_real_unitario` |
| `v_resultados_mes` | Ventas netas, costo de ventas, utilidad bruta, gastos fijos/variables, utilidad operativa y neta, márgenes, ticket, ROAS, ROI — agrupado por mes de `fecha` |
| `v_flujo_caja_mes` | Entradas por `monto_cobrado`/`fecha_cobro` y movimientos de entrada; salidas por `monto_pagado`/`fecha_pago` y movimientos de salida; saldo acumulado |
| `v_rentabilidad_producto` | Agregados de `venta_linea` por `sku`, con ranking por utilidad y por unidades |
| `v_control_calidad` | Los 32 chequeos de la hoja CONTROL, como reglas de validación del backend |

## Reglas de negocio que deben viajar al software

1. `precio_catalogo_2016` es un campo muerto: nunca debe entrar en un cálculo.
2. Un producto sin `precio_venta_actual` o sin `costo_compra` no produce márgenes: devuelve
   `null`/`PENDIENTE`, nunca cero.
3. El efectivo solo se mueve con `monto_cobrado` / `monto_pagado` y su fecha; nunca con la fecha
   del documento.
4. Un aporte de capital entra a caja pero no al estado de resultados.
5. Las líneas anuladas se conservan pero se excluyen de todo agregado.
6. Los costos fijos nunca se prorratean al costo unitario del producto: solo entran al punto de
   equilibrio y a la utilidad operativa.
