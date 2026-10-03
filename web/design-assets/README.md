# Assets de diseño: procedencia

Las imágenes de producto salen de **tres fotografías oficiales** de AROMATIC (1052×1024), guardadas en
`originales/`. Esta carpeta no se publica.

| Archivo | Producto |
|---|---|
| `originales/detergente.jpg` | AROMATIC Detergente Líquido, galón |
| `originales/suavizante.jpg` | AROMATIC Suavizante, galón |
| `originales/jabon.jpg` | AROMATIC Jabón Líquido, 500 mL (sobre un pedestal de mármol) |

**Reglas aplicadas:** las etiquetas, los logos, los textos de etiqueta y los envases no se retocan.
Lo único que se modifica es el **color del líquido** del jabón para mostrar cada aroma, conservando
los reflejos, la transparencia y la forma del envase.

## Proceso (`pipeline/`)

1. **Recorte** (`1-recorte.py`): se quita el fondo con rembg y el modelo `isnet-general-use`. En la
   foto del jabón también se quita el pedestal. El hueco de las asas queda transparente.
2. **Escala ×2** (`2-escala.py`): recorte al contenido (más 14 px de margen) y superresolución EDSR ×2
   (OpenCV `dnn_superres`). El canal alfa se escala por separado.
3. **Aromas del jabón** (`3-aromas-jabon.py`): el líquido se recolorea en el espacio LAB. Solo se
   cambian los píxeles de tono ámbar con croma, fuera de la franja de la etiqueta (y 731–1594 en la
   imagen escalada). La etiqueta, la bomba y el plástico transparente quedan como en el original.
   El color original (ámbar) se usa para **Frutas tropicales**.
4. **Exportación** (Pillow): `public/images/products/<nombre>-{800,1600}.{avif,webp}`, con fondo
   transparente. `<nombre>` es `suavizante`, `detergente` o `jabon-<aroma>`.
5. **Editorial** (`public/images/editorial/suavizante-luz-*`): es la foto original del suavizante,
   con su luz de ventana, escalada ×2 con EDSR y sin recorte.
6. **OG** (`public/og.jpg`): composición HTML de 1200×630 con los tres recortes, capturada con
   Playwright.
7. **Favicon** (`public/favicon.svg`): glifo "A" de Bodoni Moda (opsz 6, wght 600) extraído con
   fontTools.

Los scripts usan rutas relativas a la carpeta `pipeline/`. Sirven como registro del proceso, no
como build automático. Requieren `rembg`, `onnxruntime`, `opencv-contrib-python` y `Pillow`.

## Advertencia sobre las etiquetas

Las etiquetas de las fotos tienen textos que **no coinciden del todo con el catálogo**:

- El envase del jabón dice **"DETERSIVO LÍQUIDO"**, no "Jabón líquido".
- Las tres etiquetas dicen "Ingredientes Biodegradables", "Fórmula Eficaz" y "Fragancia Floral y
  Fresca". El jabón y el detergente dicen además "Limpia, Suaviza y Protege".

Por la regla de no rediseñar etiquetas se dejaron intactos, y la web nunca repite esas afirmaciones
en su propio texto.
