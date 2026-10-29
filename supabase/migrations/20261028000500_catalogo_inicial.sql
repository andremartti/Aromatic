-- =============================================================================
--  AROMATIC · Catálogo inicial (datos oficiales del catálogo)
-- =============================================================================
--  Los PRECIOS quedan en NULL a propósito: no se inventan. El negocio los carga
--  desde el panel (/admin → Productos). Una presentación sin precio no se puede
--  comprar en línea. El inventario queda en NULL (sin control) hasta que se
--  cargue. La tienda arranca deshabilitada (settings.store_enabled = false).
--  Los SKU coinciden con el sistema financiero AROMATIC.
-- =============================================================================

insert into app.fragrances (id, name, sort_order) values
  ('chicle', 'Chicle', 1),
  ('floral', 'Floral', 2),
  ('frutas-tropicales', 'Frutas tropicales', 3),
  ('coco', 'Coco', 4),
  ('cherry', 'Cherry', 5),
  ('fresh', 'Fresh', 6)
on conflict (id) do nothing;

insert into app.products (slug, name, short_name, category, use_label, summary, description, sort_order) values
  ('suavizante', 'AROMATIC Suavizante', 'Suavizante', 'Suavizante', 'Para la ropa',
   'Producto enfocado en aportar suavidad y una agradable fragancia a las prendas.',
   'Suavizante líquido perfumado que proporciona sensación de suavidad y frescura, con un perfume agradable, sutil y duradero. También facilita el planchado.',
   1),
  ('detergente-liquido', 'AROMATIC Detergente Líquido', 'Detergente Líquido', 'Detergente líquido para lavadora', 'Para la lavadora',
   'Detergente líquido para lavadora orientado a limpieza, frescura y cuidado de las prendas.',
   'Detergente líquido para lavadora, apto para todo tipo de ropa, con un agradable y duradero aroma. Su fórmula está enriquecida con jabón natural para ayudar a cuidar y alargar la vida de las prendas.',
   2),
  ('jabon-liquido', 'AROMATIC Jabón Líquido', 'Jabón Líquido', 'Jabón líquido para manos', 'Para las manos',
   'Jabón líquido para la limpieza de manos, en seis aromas y tres presentaciones.',
   'Jabón líquido especialmente formulado para la limpieza de manos, con propiedades que ayudan a suavizar y humectar la piel.',
   3)
on conflict (slug) do nothing;

insert into app.product_variants (product_id, sku, presentation, sort_order)
select p.id, v.sku, v.presentation, v.sort_order
from (values
  ('suavizante', 'SUA-GAL', 'Galón', 1),
  ('detergente-liquido', 'DET-GAL', 'Galón', 1),
  ('jabon-liquido', 'JAB-500', '500 mL', 1),
  ('jabon-liquido', 'JAB-2L', '2 Litros', 2),
  ('jabon-liquido', 'JAB-GAL', 'Galón', 3)
) as v(slug, sku, presentation, sort_order)
join app.products p on p.slug = v.slug
on conflict (sku) do nothing;

insert into app.product_fragrances (product_id, fragrance_id, sort_order)
select p.id, f.fragrance_id, f.sort_order
from (values
  ('suavizante', 'floral', 1),
  ('detergente-liquido', 'floral', 1),
  ('jabon-liquido', 'chicle', 1),
  ('jabon-liquido', 'floral', 2),
  ('jabon-liquido', 'frutas-tropicales', 3),
  ('jabon-liquido', 'coco', 4),
  ('jabon-liquido', 'cherry', 5),
  ('jabon-liquido', 'fresh', 6)
) as f(slug, fragrance_id, sort_order)
join app.products p on p.slug = f.slug
on conflict (product_id, fragrance_id) do nothing;
