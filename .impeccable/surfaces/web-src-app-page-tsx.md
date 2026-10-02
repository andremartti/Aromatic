---
version: 2
slug: "web-src-app-page-tsx"
primary_target: "web/src/app/page.tsx"
related_targets: ["web/src/app/productos/[slug]/page.tsx"]
---

# Home AROMATIC (/)

Mode: Persuade (catálogo informativo, no ecommerce). Visitor: hogar en Tegucigalpa, casi siempre en móvil, que quiere conocer los tres productos y sus aromas y pedir información por WhatsApp. Action: "Conocer producto" (ficha) y "Solicitar información" / "Consultar producto" (WhatsApp con mensaje redactado). Proof: solo hechos del catálogo y del brief. Constraints: sin precios en ningún lugar; solo 3 productos; la fotografía oficial es intocable salvo el color del líquido; tema claro de la paleta del brief.

Memorable moment: el "product universe": la cámara se mueve por la foto real, el producto elegido queda nítido y su nombre gigante en Bodoni pasa por detrás del envase.

## Direction contract

THESIS: La fotografía oficial es el set y la web es la cámara. Encuadre, foco y desenfoque cuentan la historia; la interfaz se retira y toma sus colores de la escena. Rechaza las etiquetas redibujadas, los envases flotando entre burbujas, la fila de tres tarjetas de beneficios y la grilla de ecommerce con precio.

OWN-WORLD: Marfil, crema y champagne de la cortina y el mármol; dorado de la etiqueta solo en filetes de 1px; salvia solo para WhatsApp. Bodoni Moda (opsz) para la voz editorial y la palabra gigante; Jost para texto y controles. Controles casi rectos (1px). Profundidad por capas fotográficas (fondo desenfocado → palabra → producto nítido por máscara alfa), no por sombras.

STORY: Limpieza → Suavidad → Fragancia (AROMATIC FLOW). El visitante entiende que AROMATIC son tres productos para el hogar, ve el producto real con su etiqueta real, explora los seis aromas del jabón líquido y pide información por WhatsApp.

FIRST VIEWPORT: 1440x900. Nav de una línea (wordmark Bodoni con tracking, cuatro enlaces). Escena centrada al 46% del ancho con bordes desvanecidos; detergente en foco y laterales desenfocados que son botones. Palabra gigante del producto a 31% del alto, detrás del envase. Selector 01/02/03 a la izquierda; ficha (eyebrow, título, filete, resumen, "Conocer producto" + "Solicitar información") abajo a la derecha; indicador "Descubrir" abajo a la izquierda. Móvil: escena arriba con alto calculado para que el CTA quepa en la primera pantalla, selector en fila, ficha debajo, swipe para cambiar de producto. Entrada en 12 pasos solo con CSS. Gramática de motion: cubic-bezier(.22,1,.36,1), cambios de 400 a 700 ms, cámara de 850 a 900 ms, presión .97, nada en bucle salvo las partículas lentas de la atmósfera; prefers-reduced-motion deja solo cambios de opacidad.

FORM: Escena fotográfica con cámara. Reemplaza la v1 "etiqueta impresa", que el cliente descartó por verse generada por IA.

FINISH: build verificado en 1440/1280/1024/768/430/390/375, axe sin violaciones en las páginas de producto, DESIGN.md y sidecar actualizados, procedencia de los rasters en web/design-assets/README.md.
