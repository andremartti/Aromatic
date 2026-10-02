# Assets de diseño: procedencia

Todo lo que se ve en la web sale de **una única fotografía oficial** de AROMATIC:
`aromatic-escena-original.jpg` (720×1440, los tres productos sobre mármol). Este archivo queda fuera
de `public/` y no se publica.

**Reglas aplicadas:** las etiquetas, los logos, los textos de etiqueta y la composición no se
retocan. Lo único que se modifica es el **color del líquido** del jabón líquido, para mostrar cada
aroma, conservando los reflejos, la transparencia y la forma del envase.

## Proceso (`pipeline/`)

1. **Escala ×3** (`sr.py`): superresolución EDSR ×3 con OpenCV `dnn_superres`, procesada en
   mosaicos con solape. Modelo: `EDSR_x3.pb` del repositorio `Saafke/EDSR_Tensorflow`.
   Ejemplo: `python sr.py 3 ../aromatic-escena-original.jpg up3.png`.
2. **Máscaras** (`seg.py`): GrabCut con polígonos seguros por producto, con refinado de bordes →
   `public/images/scene/mask-{suavizante,detergente,jabon}.png`
   (1080×2160, el canal alfa es la máscara).
3. **Escena** (Pillow): `scene-1440` y `scene-2160` en AVIF/WebP (más un respaldo JPG en 1440);
   `scene-blur` es la misma escena desenfocada (la capa base del cambio de foco).
4. **Aromas del jabón** (`recolor.py`): el jabón se recorta con un polígono suavizado (Chaikin)
   y el líquido se recolorea en el espacio LAB. El peso del cambio solo es mayor que cero dentro
   del envase, por debajo del hombro (y ≥ 748) y fuera de la franja de la etiqueta
   (y 870–1048), así que la etiqueta y el dosificador quedan como en el original.
   → `public/images/jabon/jabon-{chicle,floral,frutas-tropicales,coco,cherry,fresh}.webp`.
   **Chicle** es el color original de la foto.
5. **Editorial**: `editorial-1440/2160` es un recorte del mármol con pétalos (y ≥ 1063). Se cortó
   por debajo de las etiquetas para que no aparezca ningún texto de etiqueta fuera de contexto.
6. **OG** (`public/og.jpg`): composición HTML de 1200×630 con la escena a la derecha, el wordmark y
   el lema en Bodoni Moda y Jost. Se capturó con Playwright.
7. **Favicon** (`public/favicon.svg`): glifo "A" de Bodoni Moda (opsz 6, wght 600) extraído con
   fontTools, sobre charcoal `#24201d`.

Los scripts usan rutas relativas al directorio de trabajo en el que se ejecutaron; sirven como
registro del proceso, no como build automático.

## Advertencia sobre la fotografía

Las etiquetas de la foto contienen textos que **no coinciden con la información oficial** del
catálogo. Por ejemplo: "Fragancia Lavanda y Vainilla" (el suavizante es Floral), "500 mL" en envases
de galón, "Biodegradable" e "Ingredientes Naturales", "Elimina 99.9% gérmenes" y erratas. Por la
regla de no rediseñar etiquetas se dejaron intactos, y la web nunca repite esas afirmaciones en su
propio texto. Se recomienda reemplazar la foto por una sesión oficial con las etiquetas definitivas.
