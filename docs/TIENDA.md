# Tienda en línea, pagos y panel administrativo

Este documento explica cómo funciona la tienda de AROMATIC, cómo ponerla en marcha y qué falta
para cobrar con tarjeta de verdad. Está escrito para el equipo del negocio; los comandos son para
quien haga la instalación técnica.

---

## 1. Qué hay y cómo funciona

```
Navegador (sitio estático en GitHub Pages)
   │  catálogo, carrito, checkout, "Mi pedido", panel /admin
   │  (los datos de la tarjeta van directo del navegador a PixelPay, cifrados por su SDK)
   ▼
Funciones de servidor (Supabase Edge Functions, Deno)
   store · checkout · payment · payment-webhook · order-status · admin
   │  validan todo, calculan precios y envío, verifican pagos con PixelPay
   ▼
Base de datos (Supabase Postgres, esquema privado `app`)
   productos, precios, inventario, clientes, pedidos, pagos, envíos, historial, auditoría
```

- **El sitio sigue siendo estático.** GitHub Pages no ejecuta código de servidor, así que la lógica
  sensible vive en Supabase. Mientras el sitio no tenga configurado Supabase, se comporta como
  antes: catálogo con pedidos por WhatsApp.
- **El navegador nunca manda precios.** Solo dice qué presentación, qué aroma y cuántas unidades.
  El servidor toma el precio de la base de datos, calcula el envío por zona, reserva el inventario
  y guarda en el pedido una copia de los precios y la dirección de ese momento.
- **Un pago con tarjeta solo se marca como pagado cuando el servidor lo confirma con PixelPay**
  (consulta del estado de la transacción con las credenciales secretas, mismo monto que el
  pedido, referencia única). El aviso del navegador o del webhook nunca basta por sí solo.
- **Las transferencias no se marcan como pagadas** hasta que alguien del personal verifica el
  depósito y escribe la referencia en el panel.
- **Nada de tarjetas en AROMATIC:** ni número, ni CVV, ni fecha se guardan o pasan por las
  funciones. El formulario usa el SDK oficial de PixelPay, que cifra la tarjeta en el navegador.

### Estados

| Pedido | Significado |
|---|---|
| Pendiente | Recibido. Falta el pago (tarjeta o transferencia) o la confirmación (contra entrega). |
| Confirmado | Pago aprobado, o pedido contra entrega confirmado por el personal. |
| En preparación · Listo para enviar · Enviado · Entregado | Avance logístico. |
| Cancelado · Devuelto | Fuera de los reportes de ventas. Cancelar libera el inventario. |

| Pago | Significado |
|---|---|
| Pendiente de pago | No hay pago todavía. |
| Pago por verificar | El cliente avisó que transfirió; falta verificarlo en el banco. |
| Pagado | Confirmado por PixelPay o verificado por el personal. |
| Pago rechazado · Pago cancelado · Reembolsado | Estados finales o de excepción. |

Un pedido con tarjeta que no se paga en el tiempo configurado (60 min por defecto) se cancela solo
y devuelve el inventario. Si un pago llega tarde, con monto distinto o duplicado, el pedido queda
**en revisión** y nunca se da por pagado automáticamente.

---

## 2. Estado actual (qué funciona, qué está en pruebas, qué falta)

| Parte | Estado |
|---|---|
| Base de datos, reglas de seguridad, migraciones | **Listo.** Falta crear el proyecto en Supabase y aplicarlas. |
| Funciones de servidor | **Listas y probadas localmente.** Falta desplegarlas en su proyecto Supabase. |
| Tienda, carrito, checkout, confirmación, "Mi pedido" | **Listo.** Se activa al configurar Supabase en GitHub. |
| Panel `/admin` (resumen, pedidos, envíos, clientes, productos, ajustes, personal, bitácora) | **Listo.** |
| Guías de envío A4 (impresión, PDF, lote, reimpresión, QR y código de barras) | **Listo.** |
| Tarjeta con PixelPay | **Integrado en modo de pruebas (sandbox).** Para cobrar de verdad falta la afiliación del comercio con PixelPay y cargar sus credenciales (sección 5). |
| Transferencia bancaria | **Listo.** Falta escribir los datos de la cuenta en Ajustes. |
| Pago contra entrega | **Listo.** |
| API de transportistas | **No integrada.** No se encontró una transportista hondureña con API pública verificable. El número de seguimiento se registra a mano; si la transportista tiene enlace de rastreo, el cliente lo ve en su pedido. |
| Precios e inventario | **Vacíos a propósito.** Los define el negocio en Productos. Una presentación sin precio se muestra pero no se puede comprar. |
| Correos o WhatsApp automáticos al cliente | **No incluidos.** El cliente recibe su enlace privado del pedido en la página de confirmación. |

Mientras `PAYMENTS_MODE=test`, todos los pedidos se numeran `AR-T00001…`, llevan la marca
**PRUEBA**, no cuentan en los reportes y el panel los muestra solo con el interruptor
"Datos de prueba".

---

## 3. Pasarela de pago: por qué PixelPay

Se revisaron las opciones utilizables por un comercio hondureño:

| Proveedor | Lo que se pudo verificar | Conclusión |
|---|---|---|
| **PixelPay** (Honduras) | Pasarela hondureña que procesa en lempiras con bancos adquirentes locales (Ficohsa, Promérica, Banrural, BAC, entre otros). SDK oficial para navegador con cifrado de tarjeta, entorno sandbox público y consulta de estado de transacciones desde servidor. Afiliación: negocio constituido o comerciante individual, escritura o documento de constitución, RTN, identidad del representante legal, permiso de operación y cuenta en un banco aliado. Las comisiones las cotiza el agente de afiliación. Contacto: info@pixel.hn. | **Elegido e integrado.** |
| Pagadito | Pasarela regional con integración por credenciales (UID/WSK). Opera principalmente en dólares con conversión. | Alternativa si PixelPay no aprueba la afiliación. La arquitectura permite agregarlo. |
| BAC Credomatic | Ofrece comercio electrónico a comercios afiliados; no se encontró documentación técnica pública. | Consultar con su ejecutivo de BAC; normalmente se accede vía una pasarela como PixelPay. |
| Otras (Tilopay, etc.) | No se pudo confirmar operación para comercios con sede en Honduras. | Descartadas por ahora. |

> **Verifique con el proveedor antes de firmar:** comisiones, plazos de depósito, monedas,
> requisitos vigentes y si exige 3-D Secure o registrar el dominio del sitio. Durante la
> implementación no fue posible abrir la documentación web de PixelPay (docs.pixelpay.app,
> pixelpay.zendesk.com, pixelpay.com) desde el entorno de trabajo; la integración se hizo con su
> SDK oficial publicado en npm (`@pixelpay/sdk-core`) y su SDK de servidor.

---

## 4. Puesta en marcha (una sola vez)

Necesita: una cuenta en [Supabase](https://supabase.com), la [CLI de Supabase](https://supabase.com/docs/guides/cli)
y acceso de administrador al repositorio de GitHub.

### 4.1 Crear el proyecto y la base de datos

1. En Supabase cree un proyecto (región más cercana a Honduras, p. ej. *East US*). Guarde la
   contraseña de la base de datos en un gestor de contraseñas.
   Para una tienda en producción use un plan de pago: los proyectos gratuitos se pausan por inactividad.
2. **Database → Extensions:** active `pg_cron` (cancela cada 10 minutos los pagos con tarjeta vencidos).
3. Desde la carpeta del repositorio:

   ```bash
   supabase login
   supabase link --project-ref <ref-del-proyecto>
   supabase db push            # aplica supabase/migrations/*.sql
   ```

   Las migraciones crean el esquema privado `app`, activan RLS en todas las tablas, cargan los tres
   productos con sus textos oficiales (sin precios ni inventario) y crean el almacenamiento de fotos.
   **No ejecute `supabase/tests/dev_seed.sql` en producción** (son datos ficticios de desarrollo).

### 4.2 Acceso del personal (Authentication)

1. **Authentication → Providers → Email:** desactive *Allow new users to sign up* (nadie se registra solo).
2. **Authentication → URL Configuration:**
   *Site URL* = `https://andremartti.github.io/Aromatic/admin/` y agréguelo también en *Redirect URLs*.
3. **Primer propietario:** *Authentication → Users → Invite user* con su correo. Abra el correo,
   cree su contraseña (mínimo 10 caracteres) y luego, en **SQL Editor**, ejecute una sola vez:

   ```sql
   select app.bootstrap_owner('su-correo@dominio.com');
   ```

   Esta función solo funciona mientras no exista ningún propietario. No hay usuarios ni contraseñas
   por defecto. El resto del personal se invita igual (*Invite user*) y se le asigna el rol en
   **/admin → Ajustes → Personal**.

| Rol | Puede |
|---|---|
| Personal | Ver todo; atender pedidos, verificar transferencias, registrar envíos, imprimir guías, exportar. |
| Administrador | Además: productos, precios, inventario, zonas, transportistas, ajustes, reembolsos, resolver revisiones. |
| Propietario | Además: personal y roles; aprobar a mano un pago con tarjeta en revisión (tras verificarlo en PixelPay). |

Los permisos los verifica la base de datos en cada operación; ocultar un botón no es la protección.

### 4.3 Secretos de las funciones

Genere dos valores aleatorios y cárguelos junto con el resto (lista completa y explicación en
`supabase/functions/.env.example`):

```bash
openssl rand -base64 48   # ORDER_TOKEN_SECRET
openssl rand -hex 24      # PIXELPAY_WEBHOOK_TOKEN

supabase secrets set \
  ALLOWED_ORIGINS=https://andremartti.github.io \
  PUBLIC_SITE_URL=https://andremartti.github.io/Aromatic \
  ORDER_TOKEN_SECRET=<valor> \
  PIXELPAY_WEBHOOK_TOKEN=<valor> \
  PAYMENTS_MODE=test \
  CARD_PROVIDER=pixelpay
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_DB_URL` los entrega Supabase a las funciones
automáticamente. Nunca escriba secretos en el repositorio.

### 4.4 Desplegar las funciones

```bash
supabase functions deploy store checkout payment payment-webhook order-status admin
```

`supabase/config.toml` ya indica `verify_jwt = false` para estas funciones: cada una verifica por su
cuenta lo que necesita (sesión del personal, token privado del pedido o token del webhook).

### 4.5 Conectar el sitio

En GitHub: **Settings → Secrets and variables → Actions → Variables** cree:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | `https://<ref-del-proyecto>.supabase.co` |
| `SUPABASE_ANON_KEY` | La clave *anon* / *publishable* (Project Settings → API). Es pública por diseño. |

Luego **Actions → "Publicar sitio web" → Run workflow**. Al terminar aparecen *Tienda* y *Mi pedido*
en el menú y el panel en `https://andremartti.github.io/Aromatic/admin/`.

### 4.6 Configurar la tienda en el panel

1. **Ajustes → Envíos:** datos del remitente (teléfono y dirección de origen, aparecen en cada guía),
   zonas con su costo (al menos una zona "resto del país" sin departamentos) y transportistas
   (con enlace de rastreo si lo tienen, usando `{tracking}`).
2. **Ajustes → Tienda y pagos:** métodos habilitados, datos de la cuenta para transferencias,
   indicaciones de contra entrega, tiempo para pagar con tarjeta.
3. **Productos:** precio e inventario de cada presentación. Los productos oficiales conservan sus
   fotografías y etiquetas; nuevos productos o presentaciones se crean aquí (con foto subida o enlace).
4. **Ajustes → Tienda y pagos → Tienda abierta.**
5. Haga compras de prueba con cada método. Las de tarjeta usan el sandbox de PixelPay (tarjetas de
   prueba según la documentación de PixelPay); no se cobra dinero.

---

## 5. Empezar a cobrar con tarjeta (producción)

1. **Afiliación con PixelPay** (info@pixel.hn): presente la documentación del negocio y la cuenta en
   un banco aliado. Pida por escrito comisiones, plazos de depósito, endpoint de producción, y si
   requieren 3-D Secure o registrar el dominio `https://andremartti.github.io`.
2. En el panel de PixelPay obtenga **Key ID** y **Secret Key** del comercio.
3. Borre los datos de prueba: ejecute `supabase/sql/limpiar_datos_de_prueba.sql` en SQL Editor
   (devuelve el inventario reservado por pedidos de prueba y borra solo pedidos/clientes de prueba).
4. Cargue los secretos de producción:

   ```bash
   supabase secrets set PAYMENTS_MODE=live \
     PIXELPAY_ENDPOINT=<endpoint indicado por PixelPay> \
     PIXELPAY_KEY_ID=<key id> PIXELPAY_SECRET_KEY=<secret key> \
     PIXELPAY_3DS=<true si su afiliación usa 3-D Secure>
   ```

   En modo `live` el simulador queda bloqueado y cada transacción se verifica con PixelPay.
5. **Webhook:** cada venta envía a PixelPay su URL de aviso
   `https://<ref>.supabase.co/functions/v1/payment-webhook?k=<PIXELPAY_WEBHOOK_TOKEN>`.
   Si PixelPay pide registrar una URL de notificaciones en su panel, use esa misma. El aviso solo
   provoca una nueva consulta a PixelPay; no marca nada como pagado por sí mismo.
6. Haga una compra real de monto bajo, verifique que aparece **Pagado** en el panel y en PixelPay, y
   regístrele el reembolso en ambos lados. Desde ese momento la tienda cobra de verdad.

Si algún pago queda pendiente (cliente cerró la página, falla de red), el botón
**Consultar en PixelPay** del pedido lo concilia al instante.

---

## 6. Operación diaria

- **Resumen:** ventas pagadas de hoy, la semana (desde el lunes), el mes y total; ticket promedio;
  gráfico de 30 días y 12 meses; productos más vendidos; colas "por atender". Solo cuenta pedidos
  pagados y vigentes (sin cancelados, devueltos, sin pagar ni de prueba), una vez cada uno.
- **Pedidos:** búsqueda por número, cliente, teléfono, ciudad o seguimiento; filtros por estado,
  pago, método, ciudad, fechas y revisión; exportación CSV (abre en Excel con tildes correctas).
  En el detalle: cambiar estado, verificar transferencias, marcar cobros contra entrega, registrar
  reembolsos, datos de envío, notas internas e historial con quién hizo cada cambio y cuándo.
- **Envíos:** pedidos por etapa (por preparar, listos, en camino, entregados), selección múltiple
  para asignar transportista, cambiar estado o **generar guías por lote**.
- **Guías:** A4, una por hoja, con remitente, destinatario, pedido, guía interna (`AR-G000001`),
  transportista, seguimiento, paquetes, peso, contenido, valor declarado, indicaciones de manejo,
  monto a cobrar si es contra entrega, código de barras, QR (abre el pedido en el panel, requiere
  sesión) y espacio para firma. No incluye datos de pago ni bancarios. **Imprimir** y
  **Descargar PDF** registran cada impresión (cuántas y quién); se pueden reimprimir.
  **Copiar dirección** sirve para pegarla en la plataforma de la transportista.
- **Clientes:** uno por teléfono (se unifican solos al comprar), con sus pedidos y direcciones.
- **Bitácora:** cambios de precios, inventario, ajustes, zonas, transportistas y personal.

---

## 7. Seguridad aplicada

- Esquema `app` privado: RLS forzado en todas las tablas y sin permisos para los roles públicos de
  la API; solo las funciones de servidor llegan a los datos.
- Panel: sesión de Supabase Auth verificada en el servidor + rol comprobado en la base de datos en
  cada operación; lista blanca de acciones; registro de autor en historial y bitácora.
- Precios, envío, inventario y totales calculados en el servidor; inventario reservado con bloqueo
  de filas (sin sobreventa); pedidos idempotentes (un doble clic no crea dos pedidos).
- Pagos: verificación del estado y del monto con PixelPay usando el secreto del comercio, hash del
  pago cuando existe, referencia única por intento, eventos idempotentes, alerta de revisión ante
  montos distintos o cobros duplicados.
- Webhook con token secreto en la URL y verificación del hash.
- Límites de intentos por IP (checkout, consulta de pedidos) y por usuario (panel).
- El enlace de cada pedido lleva un token firmado (HMAC); la consulta por teléfono muestra datos
  limitados. Las páginas de pedido y el panel no se indexan ni envían el enlace a otros sitios.
- Errores genéricos hacia el navegador, sin datos personales en los registros; CSV protegido contra
  fórmulas.
- Sin secretos en el repositorio; solo valores públicos en el sitio (`SUPABASE_URL`, clave anon).

---

## 8. Credenciales y datos que debe conseguir

- [ ] Proyecto Supabase (ref, URL, clave anon) y su contraseña de base de datos.
- [ ] Correo del propietario para la primera cuenta del panel.
- [ ] `ORDER_TOKEN_SECRET` y `PIXELPAY_WEBHOOK_TOKEN` (generados con `openssl`).
- [ ] Afiliación PixelPay: Key ID, Secret Key, endpoint de producción, si aplica 3-D Secure.
- [ ] Datos de la cuenta bancaria para transferencias (si las va a aceptar).
- [ ] Teléfono y dirección de origen para las guías.
- [ ] Transportistas con las que trabaja (y su enlace de rastreo, si existe).
- [ ] Zonas y costos de envío; precios e inventario de cada presentación.

---

## 9. Pruebas realizadas

Todas en un entorno local (Postgres 16 + funciones en Deno + PixelPay simulado que imita su API y
exige la tarjeta cifrada); ninguna tocó servicios reales.

| Prueba | Resultado |
|---|---|
| `supabase/tests/run_db_tests.sh`: 15 bloques (roles, tienda cerrada, configuración, catálogo público, precios del servidor, inventario, idempotencia, validaciones, monto alterado, pago duplicado, rechazo y reintento, vencimiento, transferencias, pagos manuales prohibidos con tarjeta, contra entrega y guías, resumen, permisos de la API) | Pasan |
| `supabase/tests/run_function_tests.sh`: 12 pasos de integración HTTP (CORS, sesión y roles del panel, checkout sin fugas de secretos, confirmación con monto alterado, webhook con token/hash, rechazo y reintento, consulta del pedido, límites por IP, listado, guía y exportación) | Pasan |
| Navegador (Playwright): compra con tarjeta (SDK de PixelPay cifrando contra el simulador) y con transferencia con otro destinatario | Pasan, sin errores de consola |
| Navegador: acceso, recuperación de contraseña, usuario sin rol (bloqueado), propietario (resumen, filtros, verificar transferencia, estados, envío, notas, guía, PDF, impresión, lote, clientes, precios, inventario, ajustes), personal (solo lectura en ajustes; el servidor responde 403 si fuerza un cambio) | Pasan |
| Pantallas 1440, 768 y 390 px | Sin desbordes horizontales |
| PDF de guía (pdfmake) e impresión A4 del navegador | A4, una página por guía |
| `npm run lint`, `npm run typecheck`, `next build` con y sin Supabase y bajo `/Aromatic` | Pasan |

Cómo repetirlas: ver `supabase/tests/` (cada script indica sus variables). Para usar la tienda y el
panel en local: base con migraciones + `supabase/tests/dev_seed.sql`, `deno run -A supabase/tests/dev_server.ts`
y `web/.env.local` con `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon`, `NEXT_PUBLIC_FUNCTIONS_URL=http://127.0.0.1:54321/functions/v1`.

---

## 10. Pendientes y recomendaciones

- Afiliación y credenciales de PixelPay (sin esto no hay cobros reales con tarjeta).
- Probar en el sandbox real de PixelPay con sus tarjetas de prueba, incluido 3-D Secure si aplica.
- Integración con la API de una transportista cuando exista una con API documentada.
- Notificaciones automáticas al cliente (correo o WhatsApp) si se desean.
- Actualizar Next.js dentro de la versión 16 cuando sea posible: `npm audit` reporta avisos que
  afectan funciones de servidor de Next (caché, optimización de imágenes, Server Actions) que este
  sitio estático no usa.
