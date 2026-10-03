---
name: AROMATIC
description: Sistema "producto real" para la web de AROMATIC. Las fotos oficiales recortadas son las protagonistas; la interfaz se retira y las anima con entradas, flotación, inclinación y tipografía editorial.
colors:
  ivory: "#f8f3ec"
  warm-white: "#fcfaf6"
  cream: "#f1e8dc"
  beige: "#e4d5c2"
  champagne: "#cdb592"
  sand: "#a88d6c"
  charcoal: "#24201d"
  ink: "#34302b"
  warm-gray: "#5f574f"
  mist: "#8c8279"
  line: "#ddd0be"
  gold: "#a9834a"
  rose: "#e9c3be"
  sage: "#55654f"
  aroma-chicle: "#f0c6cc"
  aroma-floral: "#ddcde6"
  aroma-tropical: "#f2d3b3"
  aroma-coco: "#f3ece2"
  aroma-cherry: "#ebb4b6"
  aroma-fresh: "#cfe2df"
typography:
  giant:
    fontFamily: "Bodoni Moda, Didot, Bodoni 72, Georgia, serif"
    fontSize: "clamp(6rem, min(0.5rem + 10.5vw, 22svh), 13rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.035em"
  display:
    fontFamily: "Bodoni Moda, Didot, Bodoni 72, Georgia, serif"
    fontSize: "clamp(3.25rem, 1.6rem + 7vw, 9rem)"
    fontWeight: 400
    lineHeight: 0.92
  heading:
    fontFamily: "Bodoni Moda, Didot, Bodoni 72, Georgia, serif"
    fontSize: "clamp(2.5rem, 1.6rem + 3.6vw, 5rem)"
    fontWeight: 400
    lineHeight: 1
  title:
    fontFamily: "Bodoni Moda, Didot, Bodoni 72, Georgia, serif"
    fontSize: "clamp(1.75rem, 1.3rem + 1.5vw, 2.75rem)"
    fontWeight: 400
    lineHeight: 1.05
  lede:
    fontFamily: "Jost, Futura, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 1.05rem + 0.35vw, 1.3125rem)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Jost, Futura, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  eyebrow:
    fontFamily: "Jost, Futura, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.28em"
    textTransform: uppercase
rounded:
  hair: "1px"
  soft: "3px"
spacing:
  gutter: "clamp(1.25rem, 0.5rem + 3vw, 4.5rem)"
  band: "clamp(2.5rem, 1.6rem + 3.5vw, 5.5rem)"
  section: "clamp(6rem, 3.5rem + 9vw, 12rem)"
components:
  button-solid:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.hair}"
    height: "52px"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.hair}"
  button-sage:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.hair}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.hair}"
---

# Design System: AROMATIC

## Overview

**North star: el producto real.** AROMATIC tiene una foto oficial de cada envase (detergente, suavizante y jabón líquido). La web los recorta y los pone en escena: los envases suben desde el piso, se asientan, flotan y se inclinan con el ratón; una palabra gigante en Bodoni pasa por detrás y su contorno por delante, para que se lea completa. La web no redibuja etiquetas ni inventa envases. La interfaz toma sus colores de las fotos: marfil, crema, el dorado de la etiqueta y los tonos de cada líquido.

Regla de oro: **producto real > etiqueta real > identidad AROMATIC > composición > animación.**

## Colors

- **Neutrales (página):** ivory `#f8f3ec` es el fondo; warm-white y cream marcan bandas; beige y line se usan para filetes y bordes.
- **Texto:** charcoal `#24201d` para titulares; ink `#34302b` para el cuerpo; warm-gray `#5f574f` para el texto secundario (AA sobre ivory y cream); mist solo para texto grande o decorativo.
- **Acentos:** gold `#a9834a`, tomado del dorado de la etiqueta, solo en filetes de 1 px y detalles. Sage `#55654f` es el único acento de acción y se reserva para WhatsApp y "Solicitar información".
- **Atmósferas de aroma:** seis tintes pastel que tiñen luz y partículas en la sección de aromas. Son decorativos y no describen la composición del producto.

### Named Rules
- **Dos tintas de acción:** charcoal para navegar ("Conocer producto") y sage para contactar. No hay un tercer color de botón.
- **El color del líquido lo pone la foto.** La UI nunca pinta el producto. Las variantes de aroma del jabón son recoloreados del líquido de la foto original, con la etiqueta intacta.

## Typography

Bodoni Moda (eje opsz) para la voz editorial: palabra gigante del hero, titulares y nombres de producto. Jost para cuerpo, etiquetas de campo y botones. Las fuentes se autoalojan con `next/font/local`.

### Hierarchy
- **Giant:** nombre del producto activo detrás del envase en el hero, limitado por alto de viewport (22svh) para no invadir la ficha.
- **Heading:** títulos de sección ("Más que limpieza.", "Encuentra tu aroma.", "Tu hogar también merece sentirse especial.").
- **Title:** nombres de aroma y títulos de ficha.
- **Eyebrow:** Jost 500 en versalitas con 0.28em de tracking, para uso y categoría ("PARA LA LAVADORA").

## Layout

Mobile-first con `.frame` (máximo 90rem más gutter fluido). **Página de inicio:** AROMATIC a todo el ancho y los tres envases agrupados sobre el piso (detergente al centro y al frente), con el lema y los CTA abajo. **Catálogo:** desde 64rem son tres columnas: selector, escenario (con el producto elegido al centro y los otros dos asomando a los lados) y ficha. En móvil, el escenario va arriba y el selector y la ficha debajo; se cambia de producto deslizando el dedo.

## Elevation & Depth

La profundidad viene de capas, no de tarjetas:
1. Palabra gigante en relleno (detrás).
2. Envase recortado, con una sombra de contacto que se encoge cuando el envase sube.
3. Contorno de la misma palabra (delante), para que se lea aunque el envase la cruce.

### Shadow Vocabulary
- `veil`: superficies elevadas sutiles.
- `float`: botón flotante de WhatsApp.

## Shapes

Casi recto: radio de 1 px en botones, chips y campos. El único elemento redondeado es el botón flotante de WhatsApp.

## Components

### Foto de producto (`ProductImage`)
Recorte con fondo transparente en AVIF/WebP (alturas de 800 y 1600 px), con ancho y alto definidos para evitar saltos de layout. `stature` da la altura relativa del envase real para componerlos juntos.

### Página de inicio (`HomeIntro`)
Las letras de AROMATIC entran una por una (60 ms entre letras, con desenfoque). Los envases suben desde el piso con una leve inclinación inicial (el centro primero) y luego flotan en bucle lento (6.5 s). Con el ratón, cada envase se desplaza con una profundidad distinta (parallax); al bajar, se separan. Cada envase es un enlace a su ficha.

### Catálogo (`ProductUniverse`)
El envase elegido entra desde el lado hacia el que se avanza y sale por el opuesto (0.75 s, AROMATIC FLOW, con giro de 7° y desenfoque), flota y se inclina hasta 6° con el ratón. Los laterales son botones reales ("Ver AROMATIC …") con escala de hover ≤ 1.04.

### Buttons
`btn-solid` (charcoal, primario de navegación), `btn-line` (contorno, secundario) y `btn-sage` (WhatsApp). Alto de 52 px; al presionar, `scale(.97)` en 140 ms.

### Chips
Radios nativos ocultos con etiqueta visible; el chip seleccionado se rellena de charcoal con texto ivory.

### Navigation
Barra fija que se comprime al pasar los 24 px de scroll: se reduce levemente (scale .96) y gana un fondo marfil translúcido con desenfoque y una sombra muy suave. En móvil abre una hoja de menú a pantalla completa con trampa de foco.

### Atmósfera de aroma
Al cambiar de aroma, la nueva atmósfera se expande con `clip-path: circle()` desde la opción elegida, durante 1.1 s. Encima flotan 8 partículas desenfocadas en posiciones fijas. No hay frutas, flores ni burbujas literales.

## Motion

- `ease-flow` `cubic-bezier(.22,1,.36,1)`: cambios de producto, entradas y revelados.
- Entrada del hero en 12 pasos, solo con CSS (`in-fade`, `in-rise`, `in-reveal`, `in-draw`, `in-settle`, `in-focus` con `--d`).
- Revelados de sección con IntersectionObserver (`.reveal`, `.reveal-text`, `.reveal-side`, `.reveal-line`), activos solo con `html[data-js]`.
- Transición de página de 300 a 450 ms (`page-enter`, fill backwards).
- Inclinación de 2 a 3° siguiendo el ratón en la ficha de producto.
- `prefers-reduced-motion`: sin desplazamientos, zoom ni inclinación; solo cambios de opacidad.

## Do's and Don'ts

### Do:
- Usar las fotografías oficiales y sus recortes; animar el envase completo (entrar, flotar, inclinar), nunca deformarlo.
- Recolorear solo el líquido del jabón para cada aroma, sin tocar reflejos, transparencia ni etiqueta.
- Mostrar "Conocer producto", "Solicitar información" y "Consultar producto" como CTAs.

### Don't:
- No mostrar precios en ningún lugar (cards, ficha, metadata ni JSON-LD).
- No redibujar etiquetas, logos ni envases.
- No inventar certificaciones, estadísticas, testimonios, redes, teléfonos ni direcciones.
- No usar ilustraciones literales de aromas (frutas, flores, burbujas).
