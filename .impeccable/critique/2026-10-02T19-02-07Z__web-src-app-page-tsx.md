---
target: home AROMATIC
total_score: 25
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/Aromatic/web/src/app/page.tsx"
target_fingerprint: "sha256:c513266209bb51b69708882bdd3a0ed7eca05abf1a068a0aec3adae9e70d7e2f"
target_path: /home/user/Aromatic/web/src/app/page.tsx
timestamp: 2026-10-02T19-02-07Z
slug: web-src-app-page-tsx
---
⚠️ DEGRADED: single-context (la sesión no autoriza lanzar sub-agentes sin pedido explícito del usuario; A se completó antes de leer B)

# Critique: home AROMATIC (web/src/app/page.tsx) + detalle de producto

## Design Health Score

| # | Heurística | Score | Hallazgo clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | La etiqueta viva refleja el aroma al instante; el CTA explica que abre WhatsApp con el pedido escrito. |
| 2 | Coincidencia con el mundo real | 4 | Lenguaje de etiqueta de producto (aroma, presentación) y pedido por WhatsApp, como compra el público en Tegucigalpa. |
| 3 | Control y libertad | 3 | Menú móvil con Cerrar/Escape y retorno de foco; WhatsApp abre en pestaña nueva. |
| 4 | Consistencia | 3 | Una sola etiqueta de compra ("Comprar por WhatsApp"); selectores distintos entre la sección de aromas (lista) y el detalle (chips). |
| 5 | Prevención de errores | 3 | Combinaciones imposibles no se pueden elegir; selects de una sola opción quedan fijos. |
| 6 | Reconocer antes que recordar | 3 | Conteo de productos por aroma y campos visibles en cada etiqueta. |
| 7 | Flexibilidad y eficiencia | n/a | Superficie Persuade. |
| 8 | Estética y minimalismo | 3 | Lista de aromas repetida en demasiados lugares (índice, etiquetas, aromas, detalle). |
| 9 | Recuperación de errores | 3 | 404 con salida clara; sin número de WhatsApp configurado el CTA abre el selector de contactos. |
| 10 | Ayuda y documentación | n/a | Superficie Persuade. |
| **Total** | | **25/32** | **Bueno** |

## Design Specificity Verdict

**LLM**: La página es propia de AROMATIC: el mástil de etiqueta, las etiquetas de los envases que repiten el sistema de la interfaz y el selector que re-etiqueta los envases con el aroma elegido no se pueden trasladar a otra marca sin cambiar. Partes más intercambiables: el bloque de marca (titular + dos párrafos + banda de tres campos) y el cierre centrado de la nota de pedido.

**Detector**: código fuente limpio (0 hallazgos). En vivo (1440 y 390): `cream-palette` (falso positivo justificado: paleta fijada por el brief; excepción registrada en .impeccable/config.json), `low-contrast` sobre el subtítulo del hero medido durante su animación de entrada con desenfoque (corregido: la entrada ya no usa filtro), `content-hidden-at-rest` y `all-caps-body` (corregidos: revelado único con IntersectionObserver y contenido visible sin JS; categorías fuera de versalitas).

## Overall Impression

Mundo coherente y memorable; la mayor oportunidad sigue siendo la fotografía real de producto: el sistema está listo para recibirla sin rehacer componentes.

## What's Working

- El mástil AROMATIC a todo el ancho con la placa de producto impresa por encima: marca y producto en el primer viewport, sin plantilla de hero partido genérica.
- La sección de aromas funciona como herramienta: elegir un aroma muestra qué productos lo tienen y deja el pedido de WhatsApp redactado.
- Tipografía con criterio (Ibarra Real Nova + Archivo expandido) y dos tintas disciplinadas: la salvia solo aparece en selección y WhatsApp.

## Priority Issues

- **[P1] Imágenes ilustradas en lugar de fotografía**: el brief pide imágenes protagonistas y solo hay fotos de catálogo no aptas. *Fix*: cargar fotos reales en `image` (products.ts); la ilustración se reemplaza sola. *Comando*: /impeccable polish (cuando existan fotos).
- **[P1] WhatsApp sin número configurado**: sin `WHATSAPP_NUMBER`, el cliente debe elegir el contacto manualmente. *Fix*: definir la variable `WHATSAPP_NUMBER` del repositorio antes de difundir el sitio. *Comando*: /impeccable harden.
- **[P2] Repetición de la lista de aromas**: aparecía completa en el índice "Más que limpieza", en la etiqueta del jabón, en "Encuentra tu aroma" y en el detalle. *Fix aplicado*: el índice ahora remite a la sección de aromas sin repetir la lista. *Comando*: /impeccable distill.
- **[P2] Etiqueta de aroma con un solo envase se veía vacía**: *Fix aplicado*: un envase por forma de presentación (dosificador para 500 mL y galón) y envases más grandes. *Comando*: /impeccable layout.
- **[P3] Botón flotante encima de los CTA de WhatsApp de cada sección**: *Fix aplicado*: el flotante se retira mientras otro CTA de WhatsApp está en pantalla.

## Persona Red Flags

**Cliente en Tegucigalpa, Android de gama media, llega desde un enlace de WhatsApp**: si el número no está configurado, el botón abre la lista de contactos y no sabe a quién escribir. Fuentes autoalojadas (~126 KB) y animaciones CSS no bloquean la lectura.

**Primera visita (Jordan)**: entiende qué es AROMATIC en el primer viewport (mástil + tres envases + titular). Sin precios, la pregunta "¿cuánto cuesta?" se resuelve por WhatsApp; el texto del CTA lo deja claro.

**Usuario de teclado/lector de pantalla**: aromas y presentaciones son radios nativos con foco visible; la etiqueta viva anuncia el nombre del aroma (aria-live="polite").

## Minor Observations

- En móvil el nav oculta el wordmark mientras el mástil está a la vista (intencional: el mástil es la marca).
- El bloque de marca es deliberadamente silencioso tras el campo champagne de aromas.

## Questions to Consider

- ¿Qué fotografía de producto (fondo, luz, superficie) haría que la placa de etiqueta se lea como bodegón real?
- ¿Debería la nota de pedido permitir varias líneas (carrito) cuando el volumen lo justifique? La capa `CommerceProvider` ya lo admite.

Questions skipped: el brief autoriza el pipeline completo (critique → audit → polish) sin pausas.
