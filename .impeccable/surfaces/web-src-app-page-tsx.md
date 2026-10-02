---
version: 1
slug: "web-src-app-page-tsx"
primary_target: "web/src/app/page.tsx"
related_targets: ["web/src/app/productos/[slug]/page.tsx"]
---

# Home AROMATIC (/)

Mode: Persuade. Visitor: hogar en Tegucigalpa, casi siempre en móvil, que elige producto + aroma + presentación y pide por WhatsApp. Action: abrir WhatsApp con el pedido escrito (desde detalle de producto y desde "Encuentra tu aroma"). Proof: solo hechos del catálogo y del brief. Constraints: sin precios visibles, solo 3 productos, sin fotos aptas (ilustraciones reemplazables por `image`), tema claro fijado por la paleta del brief.

Memorable moment: el selector de aromas re-etiqueta una etiqueta grande en vivo.

## Direction contract

THESIS: La web es el sistema de etiquetas de AROMATIC a escala arquitectónica: mástil de marca, etiquetas de producto y campos de aroma compuestos como una etiqueta impresa fina (papel, dos tintas, filetes que sostienen campos reales: aroma, presentación). Rechaza el envase flotando entre burbujas, la fila de tres tarjetas de beneficios y la grilla de ecommerce con precio.

OWN-WORLD: Papel blanco cálido como página; paneles de etiqueta en papel marfil/crema con doble filete interior en tinta champagne y esquinas troqueladas de 22px; campos champagne que ocupan regiones completas (aromas); tinta carbón para el texto; salvia como segunda tinta solo para selección y la acción de WhatsApp. Ibarra Real Nova (herencia tipográfica española de imprenta) para titulares y nombres de producto, sin itálicas decorativas; Archivo expandido en versalitas para el mástil y los nombres de campo, Archivo normal para texto. Controles de 2px como sello de tinta; sombras papel sobre papel, cálidas y con desplazamiento.

STORY: El visitante entiende que AROMATIC son tres productos para el hogar con aroma a elegir; cree que es una marca cuidada y honesta (nada inventado); elige producto, aroma y presentación y abre WhatsApp con el pedido redactado.

FIRST VIEWPORT: 1440x900. Nav de una línea: links a la derecha, wordmark pequeño oculto hasta que el mástil sale. Mástil AROMATIC en Archivo expandido ocupando el ancho completo del contenedor, doble filete debajo. Debajo, 7 columnas: titular de dos líneas en Ibarra (~4.5rem), subtítulo (<=20 palabras), CTA primario "Descubrir productos" (carbón, 2px) + enlace "Conocer AROMATIC". 5 columnas: panel de etiqueta troquelado con los tres envases agrupados sobre su filete inferior, cruzando el doble filete del mástil. Móvil: mástil a todo ancho, panel de producto, titular, CTAs apilados a ancho completo. Interacción firma: "re-etiquetar" en Encuentra tu aroma (nombre del aroma se re-entinta con desenfoque de 2-4px, productos que lo llevan pasan al frente, tinte del campo cambia, el CTA de WhatsApp se reescribe). Gramática de motion: entintado de carga una sola vez (clip-path), mástil que se acopla al nav con el scroll, presión 0.97, salidas más rápidas que entradas, nada en bucle.

FORM: Etiqueta impresa, posición 6 de 7 en mi lista ordenada (1 casa de fragancia, 2 ropa recién doblada, 3 luz de ventana, 4 tira olfativa, 5 revista de interiorismo, 6 etiqueta impresa, 7 espuma). Seed key c80ccb85 (roll degradado: sin challengers, servicio de roll bloqueado por la red).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
