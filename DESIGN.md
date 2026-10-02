---
name: AROMATIC
description: Sistema "etiqueta impresa" para la web de AROMATIC, productos premium de cuidado del hogar.
colors:
  stock: "#fbf8f3"
  ivory: "#f7f1e8"
  cream: "#f1e9dd"
  linen: "#e8dece"
  champagne: "#dcc8aa"
  champagne-deep: "#c4aa84"
  charcoal: "#1f1d1b"
  ink: "#2b2825"
  muted: "#5c554d"
  bronze: "#5f4b33"
  rule: "#d9ccb8"
  rule-strong: "#b59d7b"
  sage: "#4c5d48"
  sage-soft: "#e0e6da"
  aroma-floral: "#ead8d4"
  aroma-chicle: "#ecd7de"
  aroma-tropical: "#eedbbf"
  aroma-coco: "#efe7da"
  aroma-cherry: "#e4c8c6"
  aroma-fresh: "#d8e3da"
typography:
  masthead:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "calc(min(100vw - 2 * gutter, 90rem) * 0.1372)"
    fontWeight: 380
    lineHeight: 0.8
    letterSpacing: "0.07em"
    fontVariation: "'wdth' 125"
  display:
    fontFamily: "Ibarra Real Nova, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(2.5rem, 1.45rem + 3.9vw, 4.75rem)"
    fontWeight: 400
    lineHeight: 1.03
    letterSpacing: "-0.012em"
  index:
    fontFamily: "Ibarra Real Nova, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(3.25rem, 1.6rem + 7vw, 8.5rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Ibarra Real Nova, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(2.375rem, 1.55rem + 3vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.012em"
  title:
    fontFamily: "Ibarra Real Nova, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(1.75rem, 1.35rem + 1.1vw, 2.375rem)"
    fontWeight: 400
    lineHeight: 1.08
  body:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  lede:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.3vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.2em"
    fontVariation: "'wdth' 125"
rounded:
  ink: "2px"
  label: "22px"
  label-inner: "14px"
spacing:
  gutter: "clamp(1.25rem, 0.6rem + 2.6vw, 4rem)"
  band: "clamp(2.5rem, 1.8rem + 3vw, 5rem)"
  section: "clamp(5rem, 3.4rem + 6.4vw, 9.5rem)"
components:
  button-ink:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.stock}"
    typography: "{typography.label}"
    rounded: "{rounded.ink}"
    padding: "0 28px"
    height: "52px"
  button-ink-hover:
    backgroundColor: "#3a3631"
  button-sage:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.stock}"
    typography: "{typography.label}"
    rounded: "{rounded.ink}"
    padding: "0 28px"
    height: "52px"
  button-sage-hover:
    backgroundColor: "#3f4f3c"
  label-panel:
    backgroundColor: "{colors.ivory}"
    rounded: "{rounded.label}"
    padding: "10px"
  option-chip:
    textColor: "{colors.ink}"
    rounded: "{rounded.ink}"
    padding: "0 18px"
    height: "46px"
  option-chip-selected:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.stock}"
  aroma-field:
    backgroundColor: "{colors.champagne}"
    textColor: "{colors.charcoal}"
---

# Design System: AROMATIC

## Overview

**Creative North Star: "La etiqueta impresa"**

La web es el sistema de etiquetas de AROMATIC llevado a escala de página. El papel es la página (blanco cálido); los productos, los aromas y los datos de la marca se componen como etiquetas impresas: papel marfil, esquinas troqueladas, doble filete interior y solo dos tintas. El mástil AROMATIC en Archivo expandido abre y cierra la página como la cabecera de una etiqueta, y las etiquetas dibujadas en los envases repiten exactamente el mismo sistema que la interfaz.

La densidad es baja-media: mucho aire, una sola idea por sección y bandas de color que ocupan regiones completas (el campo champagne de "Encuentra tu aroma", el lino de la pieza editorial) en lugar de acentos dispersos. El tema es claro y fijo: la paleta del brief (ivory, blanco cálido, crema, champagne, carbón, salvia sutil) es la identidad, no una variante.

El movimiento es de imprenta: el texto "se entinta" una sola vez (clip-path), el mástil cede al nav con el scroll y las etiquetas se re-etiquetan al elegir un aroma. Nada flota sin razón ni se repite en bucle.

**Key Characteristics:**
- Mástil AROMATIC a todo el ancho, impreso por encima de la placa de producto.
- Etiquetas troqueladas con doble filete como contenedor único de producto y datos.
- Dos tintas: carbón para todo el texto, salvia solo para selección y WhatsApp.
- Ibarra Real Nova para la voz editorial; Archivo expandido en versalitas para nombres de campo.
- Sin precios visibles: el campo de precio existe en datos y solo se imprime si se activa.

## Colors

Papeles cálidos y tintas profundas; el color fuerte se usa por regiones, nunca como salpicadura.

### Primary
- **Carbón de imprenta** (#1f1d1b): toda la tipografía de titulares, el botón principal, la selección activa en chips y el filete del mástil.

### Secondary
- **Salvia segunda tinta** (#4c5d48): exclusivamente la acción de comprar por WhatsApp, la marca de selección en la lista de aromas, la selección de texto y el cursor.

### Tertiary
- **Campo champagne** (#dcc8aa): fondo a sangre de "Encuentra tu aroma". Sobre él, el texto secundario usa **Bronce** (#5f4b33).

### Neutral
- **Papel de página** (#fbf8f3): fondo general.
- **Papel de etiqueta** (#f7f1e8): paneles de etiqueta (productos, aroma, nota de pedido, banda de marca).
- **Crema** (#f1e9dd) y **Lino** (#e8dece): superficies de placa y banda editorial.
- **Tinta secundaria** (#5c554d): texto secundario sobre papel (6.9:1).
- **Filete** (#d9ccb8): separadores entre filas; **Filete de etiqueta** (#b59d7b): doble filete interior de los paneles.
- **Tintes de aroma** (floral #ead8d4, chicle #ecd7de, frutas tropicales #eedbbf, coco #efe7da, cherry #e4c8c6, fresh #d8e3da): decorativos; tiñen la banda de la etiqueta de aroma y el líquido de las ilustraciones. No describen la composición del producto.

### Named Rules
**The Two Inks Rule.** El texto se imprime en carbón (o tinta secundaria). La salvia se reserva para WhatsApp y la selección; si aparece en cualquier otro lugar, sobra.

**The Region Rule.** El champagne y el lino ocupan secciones completas a sangre; nunca se usan como acento en botones, insignias o bordes.

## Typography

**Display Font:** Ibarra Real Nova (con Iowan Old Style, Georgia)
**Body Font:** Archivo Variable (con ui-sans-serif, system-ui)
**Label Font:** Archivo Variable en ancho expandido (wdth 125)

**Character:** Ibarra, revival de los tipos del impresor español Joaquín Ibarra, aporta la voz editorial en castellano; Archivo expandido en versalitas suena a dato impreso en etiqueta. Ambas autoalojadas con next/font.

### Hierarchy
- **Masthead** (380, 13.72% del ancho del contenedor, 0.8, tracking 0.07em, expandido): solo el wordmark AROMATIC del hero y del pie.
- **Display** (400, clamp 2.5-4.75rem, 1.03): titular del hero, en dos líneas en escritorio.
- **Index** (400, clamp 3.25-8.5rem, 0.95): palabras del índice "Más que limpieza".
- **Headline** (400, clamp 2.375-4.25rem, 1.04): títulos de sección.
- **Title** (400, clamp 1.75-2.375rem, 1.08): nombres de producto en etiquetas.
- **Lede** (400, clamp 1.0625-1.1875rem, 1.6): entradillas, máximo 34-46ch.
- **Body** (400, 1rem, 1.65): descripciones, máximo 44ch en etiquetas.
- **Label** (600, 11px, tracking 0.2em, versalitas expandidas): nombres de campo (Aroma, Presentación), navegación y botones.

### Named Rules
**The Field Name Rule.** Las versalitas expandidas nombran campos de datos (Aroma, Presentación, Disponible en) y la marca en una etiqueta; nunca se usan como antetítulo decorativo de una sección.

**The No Italics Rule.** Ibarra se usa en redonda; la jerarquía viene de tamaño y espacio, no de itálicas.

## Layout

Contenedor `.frame` de 1440px de contenido con medianil fluido (gutter) y zonas seguras. Rejilla de 12 columnas desde 1024px; por debajo, una columna estricta (`minmax(0, 1fr)` para que el texto ampliado no desborde). Breakpoints: móvil < 640, tablet 768, laptop 1024, desktop 1280, wide 1600.

Ritmo: `section` entre secciones, `band` entre bloques de una sección, más espacio sobre un titular que bajo él. Composiciones de sección distintas a propósito: mástil + placa (hero), índice tipográfico (experiencia), vitrina asimétrica 7/5 (productos), campo con etiqueta fija (aromas), manifiesto + banda de campos (marca), pieza editorial a sangre (editorial), nota de pedido centrada (contacto).

## Elevation & Depth

Profundidad de papel sobre papel: sombras cálidas con desplazamiento y desenfoque suave, nunca halos ni sombras duras.

### Shadow Vocabulary
- **Papel** (`box-shadow: 0 1px 0 rgb(31 29 27 / 0.04), 0 18px 34px -24px rgb(84 62 36 / 0.34)`): todo panel de etiqueta en reposo.
- **Papel levantado** (`box-shadow: 0 1px 0 rgb(31 29 27 / 0.05), 0 30px 50px -28px rgb(84 62 36 / 0.42)`): etiqueta de producto en hover (con translateY -4px).
- **Flotante** (`box-shadow: 0 10px 30px -10px rgb(31 29 27 / 0.35)`): solo el botón flotante de WhatsApp.

### Named Rules
**The Paper Rule.** Si una sombra no parece papel apoyado sobre papel, no pertenece al sistema.

## Shapes

Dos radios con significado: tinta (2px) para todo lo que se pulsa (botones, chips, flotante) y troquel (22px, filete interior a 14px) para las etiquetas. El doble filete interior de los paneles es un borde de 1px más un contorno de 1px a 2px de distancia, en tinta de filete al 55%. Los filetes horizontales solo separan filas de datos reales.

## Components

### Buttons
- **Shape:** sello de tinta (2px), 52px de alto.
- **Primary (tinta):** carbón con texto papel, versalitas expandidas 13px, tracking 0.12em; flecha que avanza 4px en hover.
- **WhatsApp (salvia):** salvia con texto papel e icono de WhatsApp; única acción de compra, siempre "Comprar por WhatsApp".
- **Hover / Focus / Active:** hover solo con puntero fino; foco con contorno carbón de 2px a 3px; presión `scale(0.97)` en 140ms.
- **Enlace de tinta:** versalitas con filete inferior que se recoge al 35% en hover.

### Chips
- **Style:** opciones de aroma y presentación en el detalle; contorno de filete de etiqueta, 46px de alto.
- **State:** seleccionado en carbón relleno con texto papel; radios nativos ocultos con foco visible en el chip.

### Cards / Containers
- **Corner Style:** troquel (22px).
- **Background:** papel de etiqueta con placa interior tintada por el producto o el aroma.
- **Shadow Strategy:** Papel en reposo, Papel levantado en hover.
- **Border:** doble filete interior.
- **Internal Padding:** 10px al borde de la placa; cuerpo fluido de 1-2rem.

### Inputs / Fields
- **Style:** selects nativos sin caja: filete inferior carbón, valor en Ibarra 1.375rem, flecha dibujada en CSS.
- **Focus:** contorno carbón de 2px.
- **Disabled:** cuando solo hay una opción, sin flecha y con filete de etiqueta.

### Navigation
- Una línea, 64px, papel translúcido. Links en versalitas expandidas con filete que se dibuja en hover. En el inicio, el wordmark aparece al dejar atrás el mástil (animación ligada al scroll). En móvil, botón "Menú" y hoja a pantalla completa con links en Ibarra y CTA de WhatsApp.

### Etiqueta de aroma (signature)
Panel troquelado fijo junto a la lista de aromas: banda superior con el tinte del aroma, nombre del aroma a gran escala que se re-entinta con desenfoque de 4px al cambiar, envases ilustrados re-etiquetados con el aroma, lista de productos que lo llevan y CTA de WhatsApp con el pedido reescrito.

### Placa de producto
Superficie tintada con luz de estudio y "mesa" inferior donde se apoya el envase. Muestra la fotografía si `image` existe (fundida con multiply sobre la placa) o la ilustración del envase; si la foto falla, vuelve a la ilustración.

## Do's and Don'ts

### Do:
- **Do** componer todo producto o dato de marca como etiqueta: papel marfil, troquel de 22px y doble filete.
- **Do** usar "Comprar por WhatsApp" como única etiqueta de compra, en salvia.
- **Do** dejar que los colores de región ocupen secciones completas a sangre.
- **Do** mantener visibles los contenidos sin JavaScript y con movimiento reducido; animar solo `transform`, `opacity` y `clip-path`.
- **Do** usar iconos de Phosphor (trazo light/regular).

### Don't:
- **Don't** mostrar precios, "Consultar precio" ni rangos de precio mientras `features.prices` esté desactivado.
- **Don't** poner antetítulos en versalitas sobre los títulos de sección.
- **Don't** usar la salvia fuera de WhatsApp y la selección, ni degradados de color en texto.
- **Don't** usar radios de píldora o tarjetas iguales de icono + título + texto.
- **Don't** simular fotografías oficiales: sin foto real, la ilustración del envase.
