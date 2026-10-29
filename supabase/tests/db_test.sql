-- =============================================================================
--  Pruebas de la base de datos (Postgres local con supabase_local_shim.sql).
--  Ejecutar con: supabase/tests/run_db_tests.sh
--  Cada bloque falla con una excepción si algo no se cumple.
-- =============================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create temp table ctx (k text primary key, v text);
create function pg_temp.ctx(p text) returns text language sql as $$ select v from ctx where k = p $$;
create function pg_temp.as_user(p_email text) returns void language sql as $$
  select set_config('request.jwt.claims',
    coalesce((select json_build_object('sub', id, 'role', 'authenticated')::text from auth.users where email = p_email), ''), false);
$$;
create function pg_temp.expect_error(p_sql text, p_code text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'Se esperaba el error % y no ocurrió: %', p_code, p_sql;
exception when others then
  if sqlerrm <> p_code then raise exception 'Error inesperado: % (esperado %) en %', sqlerrm, p_code, p_sql; end if;
end $$;
create function pg_temp.order_payload(p_key text, p_method text, p_items jsonb, p_phone text default '9999-1234',
  p_department text default 'Francisco Morazán') returns jsonb language sql as $$
  select jsonb_build_object(
    'idempotency_key', p_key, 'payment_method', p_method, 'payment_provider', 'pixelpay', 'is_test', false,
    'customer', jsonb_build_object('full_name', 'Cliente de Prueba Local', 'phone', p_phone, 'email', 'cliente@example.com'),
    'shipping', jsonb_build_object('country', 'HN', 'department', p_department, 'city', 'Tegucigalpa',
      'neighborhood', 'Colonia Palmira', 'address', 'Avenida República de Chile, casa 12', 'reference', 'Frente al parque'),
    'items', p_items);
$$;

-- -----------------------------------------------------------------------------
\echo '1. Personal y roles'
insert into auth.users (email) values ('owner@aromatic.test'), ('admin@aromatic.test'), ('staff@aromatic.test'), ('ajeno@aromatic.test');
select app.bootstrap_owner('owner@aromatic.test');
select pg_temp.expect_error($$select app.bootstrap_owner('admin@aromatic.test')$$, 'Ya existe un owner. Administra el personal desde el panel.');
select pg_temp.as_user('owner@aromatic.test');
select app.admin_set_staff('{"email":"admin@aromatic.test","role":"admin"}');
select app.admin_set_staff('{"email":"staff@aromatic.test","role":"staff"}');
select pg_temp.expect_error($$select app.admin_set_staff('{"email":"owner@aromatic.test","role":"admin"}')$$, 'validation');

select pg_temp.as_user('ajeno@aromatic.test');
select pg_temp.expect_error($$select app.admin_list_orders('{}')$$, 'forbidden');
select pg_temp.as_user('');
select pg_temp.expect_error($$select app.admin_me('{}')$$, 'forbidden');
select pg_temp.as_user('staff@aromatic.test');
select pg_temp.expect_error($$select app.admin_save_settings('{"store_enabled":true}')$$, 'forbidden');
select pg_temp.expect_error($$select app.admin_list_staff('{}')$$, 'forbidden');
do $$ begin
  if (app.admin_me('{}') ->> 'role') <> 'staff' then raise exception 'rol staff incorrecto'; end if;
end $$;

-- -----------------------------------------------------------------------------
\echo '2. La tienda arranca cerrada y sin precios'
select pg_temp.expect_error($$select app.place_order(pg_temp.order_payload('k-cerrada-000000001', 'card', '[]'))$$, 'store_closed');
do $$ begin
  if exists (select 1 from app.product_variants where price is not null) then raise exception 'no debe haber precios iniciales'; end if;
  if (select count(*) from app.product_variants) <> 5 then raise exception 'se esperaban 5 presentaciones'; end if;
end $$;

\echo '3. Configuración por un admin (precios, inventario, zonas, métodos)'
select pg_temp.as_user('admin@aromatic.test');
select app.admin_save_settings(jsonb_build_object('store_enabled', true, 'card_enabled', true, 'cod_enabled', true,
  'transfer_enabled', true, 'transfer_instructions', 'Banco de prueba · Cuenta 000 · Titular de prueba'));
select pg_temp.expect_error($$select app.admin_save_settings('{"transfer_instructions":""}')$$, 'validation');
select app.admin_save_zone('{"name":"Francisco Morazán","departments":["Francisco Morazán"],"price":"100","estimated_days":"1 a 2 días"}');
select app.admin_save_zone('{"name":"Resto del país","departments":[],"price":"150","free_over":"2000"}');
select pg_temp.expect_error($$select app.admin_save_zone('{"name":"Duplicada","departments":["Francisco Morazán"],"price":"1"}')$$, 'validation');
select pg_temp.expect_error($$select app.admin_save_zone('{"name":"Inventada","departments":["Narnia"],"price":"1"}')$$, 'validation');

do $$
declare pr jsonb; payload jsonb;
begin
  -- Suavizante: L 250.00, 10 unidades. Jabón 500 mL: L 80.00, sin control. Detergente queda sin precio.
  select x into pr from jsonb_array_elements(app.admin_list_products('{}') -> 'products') x where x ->> 'slug' = 'suavizante';
  payload := pr || jsonb_build_object('variants', jsonb_build_array((pr -> 'variants' -> 0) || '{"price":"250.00","stock":"10"}'));
  perform app.admin_save_product(payload);
  select x into pr from jsonb_array_elements(app.admin_list_products('{}') -> 'products') x where x ->> 'slug' = 'jabon-liquido';
  payload := pr || jsonb_build_object('variants', (
    select jsonb_agg(case when v ->> 'sku' = 'JAB-500' then v || '{"price":"80"}' else v end order by (v ->> 'sort_order')::int)
    from jsonb_array_elements(pr -> 'variants') v));
  perform app.admin_save_product(payload);
  insert into ctx values
    ('sua', (select id::text from app.product_variants where sku = 'SUA-GAL')),
    ('jab500', (select id::text from app.product_variants where sku = 'JAB-500')),
    ('det', (select id::text from app.product_variants where sku = 'DET-GAL'));
  if (select price from app.product_variants where sku = 'SUA-GAL') <> 250 then raise exception 'precio no guardado'; end if;
  if not exists (select 1 from app.audit_log where action = 'product_updated' and details::text like '%SUA-GAL%') then
    raise exception 'falta auditoría del cambio de precio';
  end if;
end $$;

select pg_temp.as_user('staff@aromatic.test');
select pg_temp.expect_error($$select app.admin_save_product('{"slug":"x","name":"xx","short_name":"xx","category":"xx"}')$$, 'forbidden');
select pg_temp.as_user('');

-- -----------------------------------------------------------------------------
\echo '4. Catálogo público: solo lo activo, sin inventario exacto'
do $$
declare c jsonb := app.public_catalog(); v jsonb;
begin
  if not (c -> 'store' ->> 'enabled')::boolean then raise exception 'tienda debería estar abierta'; end if;
  select x into v from jsonb_array_elements(c -> 'products') p, jsonb_array_elements(p -> 'variants') x where x ->> 'sku' = 'DET-GAL';
  if (v ->> 'available')::boolean then raise exception 'sin precio no debe estar disponible'; end if;
  select x into v from jsonb_array_elements(c -> 'products') p, jsonb_array_elements(p -> 'variants') x where x ->> 'sku' = 'SUA-GAL';
  if not (v ->> 'available')::boolean or (v ->> 'maxQuantity')::int <> 10 or v ? 'stock' then raise exception 'variante suavizante incorrecta: %', v; end if;
end $$;

-- -----------------------------------------------------------------------------
\echo '5. Pedido con tarjeta: precios del servidor, envío por zona, inventario reservado'
do $$
declare r jsonb; o app.orders;
begin
  -- El navegador intenta mandar un precio falso: se ignora.
  r := app.place_order(pg_temp.order_payload('k-card-0000000000001', 'card', jsonb_build_array(
    jsonb_build_object('variant_id', pg_temp.ctx('sua'), 'fragrance_id', 'floral', 'quantity', 2, 'unit_price', 1, 'price', 1),
    jsonb_build_object('variant_id', pg_temp.ctx('jab500'), 'fragrance_id', 'coco', 'quantity', 1),
    jsonb_build_object('variant_id', pg_temp.ctx('sua'), 'fragrance_id', 'floral', 'quantity', 1))));
  select * into o from app.orders where order_number = r ->> 'order_number';
  if o.subtotal <> 830 or o.shipping_cost <> 100 or o.total <> 930 then raise exception 'totales incorrectos: % % %', o.subtotal, o.shipping_cost, o.total; end if;
  if o.item_count <> 4 or o.customer_phone <> '+50499991234' then raise exception 'datos incorrectos %', o.customer_phone; end if;
  if (select count(*) from app.order_items where order_id = o.id) <> 2 then raise exception 'las líneas repetidas debían agruparse'; end if;
  if (select stock from app.product_variants where sku = 'SUA-GAL') <> 7 then raise exception 'inventario no reservado'; end if;
  if r ->> 'order_number' !~ '^AR-[0-9]{6}$' then raise exception 'número de pedido inesperado %', r ->> 'order_number'; end if;
  insert into ctx values ('card_order', r ->> 'order_number'), ('card_payment', r ->> 'payment_id'), ('card_order_id', o.id::text);
end $$;

\echo '5b. Guardar la ficha del producto no pisa el inventario reservado'
select pg_temp.as_user('admin@aromatic.test');
do $$
declare pr jsonb;
begin
  -- El formulario se cargó con stock 10; entre tanto el pedido reservó 3 (quedan 7).
  select x into pr from jsonb_array_elements(app.admin_list_products('{}') -> 'products') x where x ->> 'slug' = 'suavizante';
  perform app.admin_save_product(pr || jsonb_build_object('variants', jsonb_build_array(((pr -> 'variants' -> 0) - 'stock') || '{"price":"250.00"}')));
  if (select stock from app.product_variants where sku = 'SUA-GAL') <> 7 then raise exception 'guardar la ficha cambió el inventario'; end if;
  perform app.admin_adjust_stock(jsonb_build_object('variant_id', pg_temp.ctx('sua'), 'mode', 'add', 'value', 0, 'reason', 'Conteo de prueba'));
  if not exists (select 1 from app.audit_log where action = 'stock_adjusted' and details ->> 'motivo' = 'Conteo de prueba') then
    raise exception 'falta auditoría del ajuste de inventario';
  end if;
end $$;
select pg_temp.as_user('');

\echo '6. Idempotencia: el mismo envío no crea otro pedido'
do $$
declare r jsonb;
begin
  r := app.place_order(pg_temp.order_payload('k-card-0000000000001', 'card', '[]'));
  if not (r ->> 'duplicate')::boolean or r ->> 'order_number' <> pg_temp.ctx('card_order') then raise exception 'idempotencia rota: %', r; end if;
  if (select count(*) from app.orders) <> 1 then raise exception 'se duplicó el pedido'; end if;
end $$;

\echo '7. Validaciones del servidor'
select pg_temp.expect_error($$select app.place_order(pg_temp.order_payload('k-val-00000000000001', 'card',
  jsonb_build_array(jsonb_build_object('variant_id', pg_temp.ctx('sua'), 'fragrance_id', 'floral', 'quantity', 8))))$$, 'out_of_stock');
select pg_temp.expect_error($$select app.place_order(pg_temp.order_payload('k-val-00000000000002', 'card',
  jsonb_build_array(jsonb_build_object('variant_id', pg_temp.ctx('det'), 'fragrance_id', 'floral', 'quantity', 1))))$$, 'price_unavailable');
select pg_temp.expect_error($$select app.place_order(pg_temp.order_payload('k-val-00000000000003', 'card',
  jsonb_build_array(jsonb_build_object('variant_id', pg_temp.ctx('sua'), 'fragrance_id', 'floral', 'quantity', 1)), '12345'))$$, 'validation');
select pg_temp.expect_error($$select app.place_order(pg_temp.order_payload('k-val-00000000000004', 'card',
  jsonb_build_array(jsonb_build_object('variant_id', pg_temp.ctx('sua'), 'fragrance_id', 'coco', 'quantity', 1))))$$, 'validation');
select pg_temp.expect_error($$select app.place_order(pg_temp.order_payload('k-val-00000000000005', 'card',
  jsonb_build_array(jsonb_build_object('variant_id', pg_temp.ctx('sua'), 'fragrance_id', 'floral', 'quantity', 1)), '9999-1234', 'Narnia'))$$, 'validation');
select pg_temp.expect_error($$select app.place_order(pg_temp.order_payload('k-val-00000000000006', 'card',
  jsonb_build_array(jsonb_build_object('variant_id', pg_temp.ctx('sua'), 'fragrance_id', 'floral', 'quantity', 0))))$$, 'validation');
select pg_temp.expect_error($$select app.place_order(pg_temp.order_payload('corta', 'card', '[]'))$$, 'validation');
select pg_temp.expect_error($$select app.place_order(jsonb_set(pg_temp.order_payload('k-val-00000000000007', 'card',
  jsonb_build_array(jsonb_build_object('variant_id', pg_temp.ctx('sua'), 'fragrance_id', 'floral', 'quantity', 1))), '{payment_provider}', '"simulated"'))$$, 'payment_method_unavailable');
do $$ begin
  if app.normalize_phone('+504 9999-1234') <> '+50499991234' or app.normalize_phone('22223333') <> '+50422223333'
     or app.normalize_phone('19999999') is not null or app.normalize_phone('+1 305 555 0100') <> '+13055550100' then
    raise exception 'normalización de teléfonos incorrecta';
  end if;
  if (select count(*) from app.orders) <> 1 then raise exception 'un pedido inválido quedó guardado'; end if;
  if (select stock from app.product_variants where sku = 'SUA-GAL') <> 7 then raise exception 'un error dejó inventario reservado'; end if;
end $$;

-- -----------------------------------------------------------------------------
\echo '8. Resultado de pago: monto incorrecto, aprobado, repetido, cobro duplicado'
do $$
declare r jsonb; o app.orders; p2 jsonb;
begin
  r := app.apply_payment_result(jsonb_build_object('payment_id', pg_temp.ctx('card_payment'), 'status', 'approved',
    'amount', '1.00', 'currency', 'HNL', 'provider_payment_id', 'uuid-falso-1', 'event_key', 'ev-1', 'kind', 'confirm'));
  if r ->> 'outcome' <> 'amount_mismatch' then raise exception 'debía detectar monto distinto: %', r; end if;
  select * into o from app.orders where order_number = pg_temp.ctx('card_order');
  if o.payment_status = 'approved' or not o.needs_review then raise exception 'no debía marcarse pagado'; end if;

  r := app.apply_payment_result(jsonb_build_object('payment_id', pg_temp.ctx('card_payment'), 'status', 'approved',
    'amount', '930.00', 'currency', 'HNL', 'provider_payment_id', 'uuid-falso-1', 'reference', 'AUTH123', 'event_key', 'ev-2', 'kind', 'confirm'));
  if r ->> 'outcome' <> 'approved' then raise exception 'debía aprobar: %', r; end if;
  select * into o from app.orders where order_number = pg_temp.ctx('card_order');
  if o.payment_status <> 'approved' or o.status <> 'confirmed' or o.paid_at is null then raise exception 'pedido no confirmado'; end if;

  -- El mismo evento otra vez (webhook repetido): no hace nada.
  r := app.apply_payment_result(jsonb_build_object('payment_id', pg_temp.ctx('card_payment'), 'status', 'approved',
    'amount', '930.00', 'currency', 'HNL', 'event_key', 'ev-2', 'kind', 'webhook'));
  if not (r ->> 'duplicate')::boolean then raise exception 'evento repetido no detectado'; end if;
  if (select count(*) from app.order_events where order_id = o.id and kind = 'payment' and to_value = 'approved') <> 1 then
    raise exception 'el pago se registró dos veces';
  end if;

  -- No se puede iniciar otro cobro de un pedido pagado.
  perform pg_temp.expect_error(format('select app.start_card_payment(%L, %L, false)', o.order_number, 'pixelpay'), 'already_paid');

  -- Si aun así la pasarela aprueba un segundo intento, se marca para revisión.
  insert into app.payments (order_id, method, provider, amount, currency, attempt, provider_order_ref)
  values (o.id, 'card', 'pixelpay', 930, 'HNL', 2, o.order_number || '-2');
  r := app.apply_payment_result(jsonb_build_object('provider', 'pixelpay', 'provider_order_ref', o.order_number || '-2',
    'status', 'approved', 'amount', '930', 'currency', 'HNL', 'event_key', 'ev-3'));
  if r ->> 'outcome' <> 'duplicate_charge' then raise exception 'cobro duplicado no detectado: %', r; end if;
  if not (select needs_review from app.orders where id = o.id) then raise exception 'debía quedar en revisión'; end if;
end $$;

\echo '9. Rechazo y nuevo intento; vencimiento libera inventario'
do $$
declare r jsonb; st jsonb; o app.orders; before_stock int;
begin
  r := app.place_order(pg_temp.order_payload('k-card-0000000000002', 'card',
    jsonb_build_array(jsonb_build_object('variant_id', pg_temp.ctx('sua'), 'fragrance_id', 'floral', 'quantity', 2)), '3333-4444'));
  r := app.apply_payment_result(jsonb_build_object('payment_id', r ->> 'payment_id', 'status', 'declined',
    'response_message', 'Fondos insuficientes', 'event_key', 'ev-4'));
  select * into o from app.orders where order_number = r ->> 'order_number';
  if o.payment_status <> 'declined' or o.status <> 'pending' then raise exception 'rechazo mal aplicado'; end if;
  st := app.start_card_payment(o.order_number, 'pixelpay', false);
  if st ->> 'provider_order_ref' <> o.order_number || '-2' or (st ->> 'amount')::numeric <> o.total then raise exception 'nuevo intento incorrecto: %', st; end if;
  -- Llamar dos veces reutiliza el mismo intento mientras no llegue a la pasarela.
  if (app.start_card_payment(o.order_number, 'pixelpay', false) ->> 'payment_id') <> st ->> 'payment_id' then raise exception 'intento duplicado'; end if;

  before_stock := (select stock from app.product_variants where sku = 'SUA-GAL');
  update app.orders set created_at = now() - interval '2 hours' where id = o.id;
  if app.expire_stale_orders() <> 1 then raise exception 'debía vencer un pedido'; end if;
  select * into o from app.orders where id = o.id;
  if o.status <> 'cancelled' or o.stock_reserved then raise exception 'vencimiento incompleto'; end if;
  if (select stock from app.product_variants where sku = 'SUA-GAL') <> before_stock + 2 then raise exception 'inventario no liberado'; end if;
  perform pg_temp.expect_error(format('select app.start_card_payment(%L, %L, false)', o.order_number, 'pixelpay'), 'order_cancelled');
  -- Pago tardío sobre un pedido cancelado: se registra y queda en revisión.
  r := app.apply_payment_result(jsonb_build_object('payment_id', st ->> 'payment_id', 'status', 'approved', 'amount', o.total, 'currency', 'HNL', 'event_key', 'ev-5'));
  select * into o from app.orders where id = o.id;
  if not o.needs_review or o.status <> 'cancelled' then raise exception 'pago tardío sin revisión'; end if;
end $$;

-- -----------------------------------------------------------------------------
\echo '10. Transferencia: no se marca pagada sin verificación'
do $$
declare r jsonb; o app.orders;
begin
  r := app.place_order(pg_temp.order_payload('k-transfer-000000001', 'bank_transfer',
    jsonb_build_array(jsonb_build_object('variant_id', pg_temp.ctx('jab500'), 'fragrance_id', 'fresh', 'quantity', 30)), '+504 8888-7777', 'Cortés'));
  select * into o from app.orders where order_number = r ->> 'order_number';
  if o.shipping_cost <> 0 or o.total <> 2400 then raise exception 'envío gratis por monto no aplicado: % %', o.shipping_cost, o.total; end if;
  if (app.order_public(o.order_number, false) ->> 'transferInstructions') is null then raise exception 'faltan instrucciones de transferencia'; end if;
  if (app.order_public(o.order_number, false) -> 'shipping') ? 'address' then raise exception 'la consulta sin token no debe mostrar la dirección'; end if;
  perform app.report_transfer(o.order_number, 'REF-998877');
  if (select payment_status from app.orders where id = o.id) <> 'awaiting_verification' then raise exception 'reporte no aplicado'; end if;
  insert into ctx values ('transfer_order_id', o.id::text);
end $$;
select pg_temp.as_user('staff@aromatic.test');
select pg_temp.expect_error(format($$select app.admin_update_order_status('{"id":"%s","status":"shipped"}')$$, pg_temp.ctx('transfer_order_id')), 'invalid_transition');
select pg_temp.expect_error(format($$select app.admin_update_order_status('{"id":"%s","status":"confirmed"}')$$, pg_temp.ctx('transfer_order_id')), 'payment_required');
select pg_temp.expect_error(format($$select app.admin_update_payment_status('{"id":"%s","status":"refunded","note":"x"}')$$, pg_temp.ctx('transfer_order_id')), 'invalid_transition');
do $$
declare r jsonb;
begin
  r := app.admin_update_payment_status(jsonb_build_object('id', pg_temp.ctx('transfer_order_id'), 'status', 'approved', 'note', 'Visto en banca en línea'));
  if r -> 'order' ->> 'payment_status' <> 'approved' or r -> 'order' ->> 'status' <> 'confirmed' then raise exception 'verificación no aplicada'; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'events') e where e ->> 'actor_label' = 'staff@aromatic.test') then
    raise exception 'el historial no registra quién verificó';
  end if;
end $$;
select pg_temp.expect_error(format($$select app.admin_update_payment_status('{"id":"%s","status":"refunded","note":"x"}')$$, pg_temp.ctx('transfer_order_id')), 'forbidden');

\echo '11. Tarjeta: el personal no puede aprobar pagos a mano'
select pg_temp.expect_error(format($$select app.admin_update_payment_status('{"id":"%s","status":"approved"}')$$,
  (select id from app.orders where order_number = pg_temp.ctx('card_order'))), 'invalid_transition');
do $$
declare r jsonb; oid uuid;
begin
  r := app.place_order(pg_temp.order_payload('k-card-review-000001', 'card',
    jsonb_build_array(jsonb_build_object('variant_id', pg_temp.ctx('jab500'), 'fragrance_id', 'cherry', 'quantity', 1)), '3131-3131'));
  oid := (r ->> 'order_id')::uuid;
  -- PixelPay aprobó pero no informó el monto: queda en revisión, no pagado.
  perform app.apply_payment_result(jsonb_build_object('payment_id', r ->> 'payment_id', 'status', 'approved', 'event_key', 'ev-review'));
  if not (select needs_review from app.orders where id = oid) then raise exception 'debía quedar en revisión'; end if;
  insert into ctx values ('review_order_id', oid::text);
end $$;
select pg_temp.expect_error(format($$select app.admin_update_payment_status('{"id":"%s","status":"approved","note":"visto","reference":"A1"}')$$,
  pg_temp.ctx('review_order_id')), 'invalid_transition');
select pg_temp.as_user('owner@aromatic.test');
select pg_temp.expect_error(format($$select app.admin_update_payment_status('{"id":"%s","status":"approved","reference":"A1"}')$$,
  pg_temp.ctx('review_order_id')), 'invalid_transition');
do $$ begin
  perform app.admin_update_payment_status(jsonb_build_object('id', pg_temp.ctx('review_order_id'), 'status', 'approved',
    'reference', 'AUTH-777', 'note', 'Verificado en el panel de PixelPay: L 180.00 aprobado'));
  if (select payment_status from app.orders where id = pg_temp.ctx('review_order_id')::uuid) <> 'approved' then raise exception 'aprobación del owner no aplicada'; end if;
  perform app.admin_resolve_review(jsonb_build_object('id', pg_temp.ctx('review_order_id'), 'note', 'Monto verificado en PixelPay'));
end $$;
select pg_temp.as_user('staff@aromatic.test');

-- -----------------------------------------------------------------------------
\echo '12. Contra entrega, envíos y guías'
select pg_temp.as_user('');
do $$
declare r jsonb;
begin
  r := app.place_order(pg_temp.order_payload('k-cod-00000000000001', 'cash_on_delivery',
    jsonb_build_array(jsonb_build_object('variant_id', pg_temp.ctx('sua'), 'fragrance_id', 'floral', 'quantity', 1)), '9999 1234'));
  insert into ctx values ('cod_order_id', r ->> 'order_id');
  -- Mismo teléfono escrito distinto = mismo cliente.
  if (select count(distinct customer_id) from app.orders where customer_phone = '+50499991234') <> 1 then raise exception 'cliente duplicado'; end if;
end $$;
select pg_temp.as_user('admin@aromatic.test');
select app.admin_save_carrier('{"name":"Transportista de prueba","tracking_url":"https://rastreo.example/{tracking}"}');
select pg_temp.as_user('staff@aromatic.test');
select pg_temp.expect_error(format($$select app.admin_guides('{"order_ids":["%s"]}')$$, pg_temp.ctx('cod_order_id')), 'invalid_state');
do $$
declare r jsonb; g jsonb; carrier uuid := (select id from app.carriers limit 1);
begin
  perform app.admin_update_order_status(jsonb_build_object('id', pg_temp.ctx('cod_order_id'), 'status', 'confirmed'));
  perform app.admin_save_shipment(jsonb_build_object('order_id', pg_temp.ctx('cod_order_id'), 'carrier_id', carrier,
    'tracking_number', 'TRK-1', 'packages', 2, 'weight_kg', '4.5'));
  r := app.admin_bulk_assign_carrier(jsonb_build_object('order_ids', jsonb_build_array(pg_temp.ctx('transfer_order_id'), pg_temp.ctx('card_order_id')), 'carrier_id', carrier));
  if (r ->> 'updated')::int <> 2 then raise exception 'asignación por lote incorrecta: %', r; end if;
  g := app.admin_guides(jsonb_build_object('register_print', true, 'order_ids',
         jsonb_build_array(pg_temp.ctx('cod_order_id'), pg_temp.ctx('transfer_order_id'), pg_temp.ctx('card_order_id'))));
  if jsonb_array_length(g -> 'guides') <> 3 then raise exception 'faltan guías'; end if;
  select x into g from jsonb_array_elements(g -> 'guides') x where x ->> 'orderId' = pg_temp.ctx('cod_order_id');
  if g ->> 'guideNumber' !~ '^AR-G[0-9]{6}$' or (g ->> 'packages')::int <> 2 or (g ->> 'collectOnDelivery')::numeric <> 350 then
    raise exception 'guía contra entrega incorrecta: %', g;
  end if;
  if g::text ~* 'transfer|cuenta|tarjeta|card' then raise exception 'la guía contiene datos de pago: %', g; end if;
  -- Reimpresión: mismo número de guía, contador +1.
  g := app.admin_guides(jsonb_build_object('register_print', true, 'order_ids', jsonb_build_array(pg_temp.ctx('cod_order_id'))));
  if (g -> 'guides' -> 0 ->> 'printCount')::int <> 2 then raise exception 'contador de impresión incorrecto'; end if;
  if (select count(distinct guide_number) from app.shipments) <> 3 then raise exception 'números de guía repetidos'; end if;
  perform app.admin_update_order_status(jsonb_build_object('id', pg_temp.ctx('cod_order_id'), 'status', 'shipped'));
  perform app.admin_update_order_status(jsonb_build_object('id', pg_temp.ctx('cod_order_id'), 'status', 'delivered'));
  perform app.admin_update_payment_status(jsonb_build_object('id', pg_temp.ctx('cod_order_id'), 'status', 'approved', 'note', 'Cobrado por la transportista'));
  if (app.order_public((select order_number from app.orders where id = pg_temp.ctx('cod_order_id')::uuid), true) -> 'shipment' ->> 'trackingUrl')
     <> 'https://rastreo.example/TRK-1' then raise exception 'enlace de seguimiento incorrecto'; end if;
end $$;

-- -----------------------------------------------------------------------------
\echo '13. Resumen: solo ventas válidas; pruebas aparte'
do $$
declare s jsonb; r jsonb;
begin
  s := app.admin_summary('{}');
  -- Válidos: tarjeta 930 + tarjeta verificada 180 + transferencia 2400 + contra entrega 350. El cancelado con pago tardío no cuenta.
  if (s -> 'revenue' ->> 'total')::numeric <> 3860 or (s -> 'revenue' ->> 'paidOrders')::int <> 4 then
    raise exception 'ventas incorrectas: %', s -> 'revenue';
  end if;
  if (s -> 'counts' ->> 'needsReview')::int <> 2 or (s -> 'counts' ->> 'delivered')::int <> 1 then raise exception 'conteos incorrectos: %', s -> 'counts'; end if;
  if (s -> 'topProducts' -> 0 ->> 'sku') <> 'JAB-500' then raise exception 'más vendido incorrecto: %', s -> 'topProducts'; end if;
  r := app.admin_list_orders('{"q":"8888"}');
  if (r ->> 'total')::int <> 1 then raise exception 'búsqueda por teléfono: %', r ->> 'total'; end if;
  r := app.admin_list_orders('{"q":"TRK-1"}');
  if (r ->> 'total')::int <> 1 then raise exception 'búsqueda por seguimiento'; end if;
  r := app.admin_list_orders('{"status":["cancelled"]}');
  if (r ->> 'total')::int <> 1 then raise exception 'filtro por estado'; end if;
  r := app.admin_list_customers('{}');
  if (r ->> 'total')::int <> 4 then raise exception 'clientes: %', r ->> 'total'; end if;
  if jsonb_array_length(app.admin_export_orders('{}')) <> 5 then raise exception 'exportación incompleta'; end if;
end $$;

\echo '14. Permisos de la API: anon y authenticated no leen tablas'
set role anon;
select pg_temp.expect_error('select count(*) from app.orders', 'permission denied for schema app');
reset role;
set role authenticated;
select pg_temp.expect_error('select count(*) from app.orders', 'permission denied for table orders');
select pg_temp.expect_error('select app.public_catalog()', 'permission denied for function public_catalog');
select pg_temp.expect_error($$select app.place_order('{}')$$, 'permission denied for function place_order');
reset role;

do $$
declare bad text;
begin
  select string_agg(p.proname, ', ') into bad
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'app' and p.proname <> 'has_staff_role'
    and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
  if bad is not null then raise exception 'Funciones expuestas a la API: %', bad; end if;
  if exists (select 1 from pg_tables where schemaname = 'app' and not rowsecurity) then raise exception 'Tabla sin RLS'; end if;
end $$;

\echo 'OK: todas las pruebas de base de datos pasaron.'
