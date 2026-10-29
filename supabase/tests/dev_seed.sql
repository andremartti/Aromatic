-- =============================================================================
--  SOLO PARA DESARROLLO LOCAL. NUNCA EJECUTAR EN PRODUCCIÓN.
--  Precios, inventario, zonas y usuarios FICTICIOS para probar la tienda y el
--  panel en una base local. Los precios reales los carga el negocio en /admin.
-- =============================================================================
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'owner.local@aromatic.test'),
  ('00000000-0000-4000-8000-000000000002', 'staff.local@aromatic.test')
on conflict do nothing;
select app.bootstrap_owner('owner.local@aromatic.test');
insert into app.staff_members (user_id, email, role) values ('00000000-0000-4000-8000-000000000002', 'staff.local@aromatic.test', 'staff')
on conflict do nothing;

update app.settings set store_enabled = true, card_enabled = true, transfer_enabled = true, cod_enabled = true,
  transfer_instructions = 'DATOS DE PRUEBA · Banco Ejemplo · Cuenta 0000-0000 · Titular: Prueba',
  sender_phone = '0000-0000 (prueba)', sender_address = 'Dirección de prueba', sender_city = 'Tegucigalpa',
  sender_department = 'Francisco Morazán';

insert into app.shipping_zones (name, departments, price, estimated_days) values
  ('Distrito Central (prueba)', '{"Francisco Morazán"}', 80, '1 a 2 días hábiles');
insert into app.shipping_zones (name, departments, price, free_over, estimated_days) values
  ('Resto del país (prueba)', '{}', 150, 1500, '2 a 4 días hábiles');
insert into app.carriers (name, tracking_url) values ('Transportista de prueba', 'https://example.com/rastreo?guia={tracking}');

update app.product_variants set price = 111.11, stock = 25 where sku = 'SUA-GAL';
update app.product_variants set price = 122.22, stock = 25 where sku = 'DET-GAL';
update app.product_variants set price = 33.33 where sku = 'JAB-500';
update app.product_variants set price = 66.66, stock = 3 where sku = 'JAB-2L';
-- JAB-GAL queda sin precio a propósito (prueba "precio por confirmar").
