-- =============================================================================
--  AROMATIC · Funciones de la tienda (llamadas solo por las funciones de servidor)
-- =============================================================================
--  Errores de validación: SQLSTATE P0001, message = código, detail = campo,
--  hint = mensaje legible para el cliente. Las funciones de servidor los
--  traducen a respuestas 4xx sin exponer detalles internos.
-- =============================================================================

-- -----------------------------------------------------------------------------
--  Utilidades
-- -----------------------------------------------------------------------------
create function app.fail(p_code text, p_field text, p_message text) returns void
language plpgsql as $$
begin
  raise exception using errcode = 'P0001', message = p_code, detail = coalesce(p_field, ''), hint = p_message;
end $$;

-- Texto limpio: sin caracteres de control, espacios normalizados.
create function app.clean_text(p text) returns text
language sql immutable as $$
  select nullif(btrim(regexp_replace(regexp_replace(coalesce(p, ''), '[[:cntrl:]]', ' ', 'g'), '\s+', ' ', 'g')), '');
$$;

-- Lee y valida un campo de texto de un objeto JSON.
create function app.text_field(p jsonb, p_key text, p_field text, p_label text, p_min int, p_max int, p_required boolean)
returns text language plpgsql as $$
declare v text := app.clean_text(p ->> p_key);
begin
  if v is null then
    if p_required then perform app.fail('validation', p_field, 'Completa: ' || p_label || '.'); end if;
    return null;
  end if;
  if char_length(v) < p_min then
    perform app.fail('validation', p_field, p_label || ': escribe al menos ' || p_min || ' caracteres.');
  end if;
  if char_length(v) > p_max then
    perform app.fail('validation', p_field, p_label || ': máximo ' || p_max || ' caracteres.');
  end if;
  return v;
end $$;

-- Teléfono → E.164. Honduras: 8 dígitos que empiezan en 2-9 (fijo o celular).
create function app.normalize_phone(p text, p_country text default 'HN') returns text
language plpgsql immutable as $$
declare
  d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  intl boolean := btrim(coalesce(p, '')) like '+%' or btrim(coalesce(p, '')) like '00%';
begin
  if d like '00%' then d := substr(d, 3); end if;
  if d = '' then return null; end if;
  if d ~ '^504' and (intl or length(d) = 11) then
    return case when length(d) = 11 and d ~ '^504[2-9]' then '+' || d end;
  end if;
  if not intl then
    if p_country = 'HN' then
      return case when length(d) = 8 and d ~ '^[2-9]' then '+504' || d end;
    end if;
    return null;
  end if;
  return case when length(d) between 7 and 15 and d !~ '^0' then '+' || d end;
end $$;

create function app.country_name(p_code text) returns text
language sql immutable as $$
  select case upper(p_code) when 'HN' then 'Honduras' else upper(p_code) end;
$$;

-- Departamentos de Honduras (para validar el formulario de envío).
create function app.hn_departments() returns text[]
language sql immutable as $$
  select array['Atlántida', 'Choluteca', 'Colón', 'Comayagua', 'Copán', 'Cortés', 'El Paraíso',
               'Francisco Morazán', 'Gracias a Dios', 'Intibucá', 'Islas de la Bahía', 'La Paz',
               'Lempira', 'Ocotepeque', 'Olancho', 'Santa Bárbara', 'Valle', 'Yoro'];
$$;

-- Límite de solicitudes (ventana fija). Devuelve true si la solicitud se permite.
create function app.rate_limit_hit(p_bucket text, p_max int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n int;
begin
  insert into app.rate_limits as r (bucket, window_start, hits) values (p_bucket, w, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning hits into n;
  if random() < 0.01 then
    delete from app.rate_limits where window_start < now() - interval '1 day';
  end if;
  return n <= p_max;
end $$;

-- Registro de historial del pedido.
create function app.log_order_event(p_order uuid, p_kind text, p_from text, p_to text, p_note text, p_actor uuid, p_label text)
returns void language sql security definer set search_path = '' as $$
  insert into app.order_events (order_id, kind, from_value, to_value, note, actor_id, actor_label)
  values (p_order, p_kind, p_from, p_to, p_note, p_actor, coalesce(p_label, 'Sistema'));
$$;

-- -----------------------------------------------------------------------------
--  Catálogo público (lo sirve la función `store`)
-- -----------------------------------------------------------------------------
create function app.public_catalog() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'store', (
      select jsonb_build_object(
        'enabled', s.store_enabled,
        'currency', s.currency,
        'pricesIncludeTax', s.prices_include_tax,
        'allowedCountries', s.allowed_countries,
        'maxUnitsPerOrder', s.max_units_per_order,
        'paymentMethods', jsonb_build_object(
          'card', s.card_enabled,
          'bank_transfer', s.transfer_enabled and s.transfer_instructions is not null,
          'cash_on_delivery', s.cod_enabled
        ),
        'codInstructions', s.cod_instructions
      ) from app.settings s where s.id = 1
    ),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'slug', p.slug, 'name', p.name, 'shortName', p.short_name, 'category', p.category,
        'use', p.use_label, 'summary', p.summary, 'description', p.description, 'imageUrl', p.image_url,
        'fragrances', coalesce((
          select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name) order by pf.sort_order, f.sort_order)
          from app.product_fragrances pf join app.fragrances f on f.id = pf.fragrance_id
          where pf.product_id = p.id and pf.is_active
        ), '[]'::jsonb),
        'variants', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', v.id, 'sku', v.sku, 'presentation', v.presentation,
            'price', v.price, 'imageUrl', v.image_url,
            'available', v.price is not null and (v.stock is null or v.stock > 0),
            -- Solo se informa el máximo comprable, no el inventario exacto.
            'maxQuantity', case when v.stock is null then null else least(v.stock, 99) end
          ) order by v.sort_order, v.presentation)
          from app.product_variants v where v.product_id = p.id and v.is_active
        ), '[]'::jsonb)
      ) order by p.sort_order, p.name)
      from app.products p where p.is_active
    ), '[]'::jsonb),
    'shippingZones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', z.id, 'name', z.name, 'country', z.country, 'departments', z.departments,
        'price', z.price, 'freeOver', z.free_over, 'estimatedDays', z.estimated_days
      ) order by z.sort_order, z.name)
      from app.shipping_zones z where z.is_active
    ), '[]'::jsonb)
  );
$$;

-- Zona de envío para un país/departamento (o la zona por defecto del país).
create function app.find_shipping_zone(p_country text, p_department text) returns app.shipping_zones
language sql stable security definer set search_path = '' as $$
  select z.* from app.shipping_zones z
  where z.is_active and z.country = upper(p_country)
    and (p_department = any (z.departments) or z.departments = '{}')
  order by (z.departments = '{}'), z.sort_order
  limit 1;
$$;

-- -----------------------------------------------------------------------------
--  Inventario
-- -----------------------------------------------------------------------------
create function app.release_stock(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update app.product_variants v set stock = v.stock + i.qty
  from (select variant_id, sum(quantity)::int as qty from app.order_items where order_id = p_order group by variant_id) i
  where v.id = i.variant_id and v.stock is not null
    and exists (select 1 from app.orders o where o.id = p_order and o.stock_reserved);
  update app.orders set stock_reserved = false where id = p_order;
end $$;

-- Vuelve a reservar inventario (reactivar un pedido cancelado). Falla si no alcanza.
create function app.reserve_stock(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if (select stock_reserved from app.orders where id = p_order) then return; end if;
  perform 1 from app.product_variants v
  where v.id in (select variant_id from app.order_items where order_id = p_order)
  order by v.id for update;
  for r in
    select v.id, v.sku, v.stock, sum(i.quantity)::int as qty
    from app.order_items i join app.product_variants v on v.id = i.variant_id
    where i.order_id = p_order and v.stock is not null
    group by v.id, v.sku, v.stock
    order by v.id
  loop
    if r.stock < r.qty then
      perform app.fail('out_of_stock', r.sku, 'No hay inventario suficiente de ' || r.sku || ' (quedan ' || r.stock || ').');
    end if;
    update app.product_variants set stock = stock - r.qty where id = r.id;
  end loop;
  update app.orders set stock_reserved = true where id = p_order;
end $$;

-- -----------------------------------------------------------------------------
--  Crear pedido (atómico e idempotente)
-- -----------------------------------------------------------------------------
--  Entrada (jsonb):
--    idempotency_key, is_test, ip_hash, payment_method, payment_provider,
--    customer {full_name, phone, email},
--    shipping {recipient_name, phone, alt_phone, country, department, city,
--              neighborhood, address, reference, instructions},
--    items [{variant_id, fragrance_id, quantity}]
--  Los precios NUNCA vienen del navegador: se leen de product_variants.
create function app.place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s app.settings;
  v_key text := app.clean_text(p ->> 'idempotency_key');
  v_existing app.orders;
  v_method app.payment_method;
  v_provider text;
  v_test boolean := coalesce((p ->> 'is_test')::boolean, false);
  c jsonb := coalesce(p -> 'customer', '{}'::jsonb);
  sh jsonb := coalesce(p -> 'shipping', '{}'::jsonb);
  v_name text; v_phone text; v_email text;
  v_country text; v_department text; v_city text; v_neigh text; v_address text; v_ref text; v_instr text;
  v_rec_name text; v_rec_phone text; v_alt_phone text;
  v_zone app.shipping_zones;
  v_item jsonb;
  v_lines jsonb := '[]'::jsonb;
  r record;
  v_units int := 0;
  v_subtotal numeric(12,2) := 0;
  v_shipping numeric(12,2);
  v_customer uuid;
  v_address_id uuid;
  v_order_id uuid;
  v_number text;
  v_payment uuid;
  v_seq bigint;
begin
  if v_key is null or char_length(v_key) < 16 or char_length(v_key) > 100 then
    perform app.fail('validation', 'idempotency_key', 'Solicitud inválida. Recarga la página e inténtalo de nuevo.');
  end if;

  -- Misma clave = mismo pedido (doble clic, reintento por red): nunca se duplica.
  perform pg_advisory_xact_lock(hashtextextended('order:' || v_key, 0));
  select * into v_existing from app.orders where idempotency_key = v_key;
  if found then
    return jsonb_build_object(
      'order_id', v_existing.id, 'order_number', v_existing.order_number, 'total', v_existing.total,
      'currency', v_existing.currency, 'payment_method', v_existing.payment_method,
      'status', v_existing.status, 'payment_status', v_existing.payment_status, 'duplicate', true,
      'payment_id', (select id from app.payments where order_id = v_existing.id order by attempt limit 1)
    );
  end if;

  select * into s from app.settings where id = 1;
  if not s.store_enabled then
    perform app.fail('store_closed', null, 'La tienda en línea no está recibiendo pedidos en este momento.');
  end if;

  -- Método de pago habilitado
  begin
    v_method := (p ->> 'payment_method')::app.payment_method;
  exception when others then
    perform app.fail('validation', 'payment_method', 'Elige un método de pago.');
  end;
  if v_method is null
     or (v_method = 'card' and not s.card_enabled)
     or (v_method = 'bank_transfer' and not (s.transfer_enabled and s.transfer_instructions is not null))
     or (v_method = 'cash_on_delivery' and not s.cod_enabled) then
    perform app.fail('payment_method_unavailable', 'payment_method', 'Ese método de pago no está disponible.');
  end if;
  v_provider := case when v_method = 'card' then coalesce(p ->> 'payment_provider', 'pixelpay') else 'manual' end;
  if v_provider not in ('pixelpay', 'simulated', 'manual') or (v_provider = 'simulated' and not v_test) then
    perform app.fail('payment_method_unavailable', 'payment_method', 'Ese método de pago no está disponible.');
  end if;

  -- Cliente
  v_name := app.text_field(c, 'full_name', 'customer.full_name', 'Nombre completo', 3, 120, true);
  v_country := upper(coalesce(app.clean_text(sh ->> 'country'), 'HN'));
  if not (v_country = any (s.allowed_countries)) then
    perform app.fail('validation', 'shipping.country', 'Por ahora solo enviamos a ' ||
      array_to_string(array(select app.country_name(x) from unnest(s.allowed_countries) x), ', ') || '.');
  end if;
  v_phone := app.normalize_phone(c ->> 'phone', v_country);
  if v_phone is null then
    perform app.fail('validation', 'customer.phone', 'Escribe un teléfono válido (8 dígitos en Honduras).');
  end if;
  v_email := lower(app.text_field(c, 'email', 'customer.email', 'Correo electrónico', 6, 254, true));
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    perform app.fail('validation', 'customer.email', 'Escribe un correo electrónico válido.');
  end if;

  -- Envío
  v_department := app.text_field(sh, 'department', 'shipping.department', 'Departamento', 2, 80, true);
  if v_country = 'HN' and not (v_department = any (app.hn_departments())) then
    perform app.fail('validation', 'shipping.department', 'Elige un departamento de la lista.');
  end if;
  v_city := app.text_field(sh, 'city', 'shipping.city', 'Ciudad o municipio', 2, 80, true);
  v_neigh := app.text_field(sh, 'neighborhood', 'shipping.neighborhood', 'Colonia, barrio o aldea', 2, 120, true);
  v_address := app.text_field(sh, 'address', 'shipping.address', 'Dirección completa', 8, 300, true);
  v_ref := app.text_field(sh, 'reference', 'shipping.reference', 'Referencias', 3, 300, true);
  v_instr := app.text_field(sh, 'instructions', 'shipping.instructions', 'Instrucciones de entrega', 0, 300, false);
  v_rec_name := coalesce(app.text_field(sh, 'recipient_name', 'shipping.recipient_name', 'Nombre de quien recibe', 3, 120, false), v_name);
  v_rec_phone := v_phone;
  if app.clean_text(sh ->> 'phone') is not null then
    v_rec_phone := app.normalize_phone(sh ->> 'phone', v_country);
    if v_rec_phone is null then
      perform app.fail('validation', 'shipping.phone', 'Teléfono de quien recibe: escribe un número válido.');
    end if;
  end if;
  if app.clean_text(sh ->> 'alt_phone') is not null then
    v_alt_phone := app.normalize_phone(sh ->> 'alt_phone', v_country);
    if v_alt_phone is null then
      perform app.fail('validation', 'shipping.alt_phone', 'Teléfono alternativo: escribe un número válido.');
    end if;
  end if;

  v_zone := app.find_shipping_zone(v_country, v_department);
  if v_zone.id is null then
    perform app.fail('shipping_unavailable', 'shipping.department',
      'Todavía no tenemos envío configurado para ' || v_department || '. Escríbenos por WhatsApp.');
  end if;

  -- Productos: agrupar líneas repetidas y validar contra la base de datos.
  if coalesce(jsonb_typeof(p -> 'items'), '') <> 'array' or jsonb_array_length(p -> 'items') = 0 then
    perform app.fail('validation', 'items', 'Tu carrito está vacío.');
  end if;
  if jsonb_array_length(p -> 'items') > 50 then
    perform app.fail('validation', 'items', 'Demasiadas líneas en el carrito.');
  end if;
  for v_item in select * from jsonb_array_elements(p -> 'items')
  loop
    if (v_item ->> 'variant_id') !~ '^[0-9a-f-]{36}$' or (v_item ->> 'quantity') !~ '^[0-9]{1,3}$'
       or (v_item ->> 'quantity')::int < 1 then
      perform app.fail('validation', 'items', 'Hay un producto inválido en el carrito.');
    end if;
  end loop;

  for r in
    with req as (
      select (e ->> 'variant_id')::uuid as variant_id,
             nullif(e ->> 'fragrance_id', '') as fragrance_id,
             sum((e ->> 'quantity')::int)::int as qty
      from jsonb_array_elements(p -> 'items') e
      group by 1, 2
    )
    select req.*, v.sku, v.presentation, v.price, v.stock, v.is_active as v_active,
           pr.id as product_id, pr.name as product_name, pr.is_active as p_active,
           exists (select 1 from app.product_fragrances pf where pf.product_id = pr.id and pf.is_active) as has_fragrances,
           (select f.name from app.product_fragrances pf join app.fragrances f on f.id = pf.fragrance_id
             where pf.product_id = pr.id and pf.is_active and pf.fragrance_id = req.fragrance_id) as fragrance_name
    from req
    left join app.product_variants v on v.id = req.variant_id
    left join app.products pr on pr.id = v.product_id
    order by req.variant_id
  loop
    if r.sku is null or not r.v_active or not r.p_active then
      perform app.fail('product_unavailable', r.variant_id::text, 'Uno de los productos ya no está disponible.');
    end if;
    if r.price is null then
      perform app.fail('price_unavailable', r.sku, r.product_name || ' ' || r.presentation || ' todavía no tiene precio en línea.');
    end if;
    if r.has_fragrances and r.fragrance_name is null then
      perform app.fail('validation', 'items', 'Elige un aroma disponible para ' || r.product_name || '.');
    end if;
    if not r.has_fragrances and r.fragrance_id is not null then
      perform app.fail('validation', 'items', 'Aroma inválido para ' || r.product_name || '.');
    end if;
    v_units := v_units + r.qty;
    v_lines := v_lines || jsonb_build_object(
      'variant_id', r.variant_id, 'product_id', r.product_id, 'sku', r.sku, 'product_name', r.product_name,
      'presentation', r.presentation, 'fragrance', r.fragrance_name, 'unit_price', r.price, 'quantity', r.qty
    );
    v_subtotal := v_subtotal + r.price * r.qty;
  end loop;

  if v_units > s.max_units_per_order then
    perform app.fail('too_many_items', 'items', 'El máximo por pedido es de ' || s.max_units_per_order || ' unidades.');
  end if;

  -- Reservar inventario con bloqueo de fila (evita vender lo que no hay).
  perform 1 from app.product_variants v
  where v.id in (select (l ->> 'variant_id')::uuid from jsonb_array_elements(v_lines) l)
  order by v.id for update;
  for r in
    select v.id, v.sku, v.stock, sum((l ->> 'quantity')::int)::int as qty
    from jsonb_array_elements(v_lines) l
    join app.product_variants v on v.id = (l ->> 'variant_id')::uuid
    where v.stock is not null
    group by v.id, v.sku, v.stock
    order by v.id
  loop
    if r.stock < r.qty then
      perform app.fail('out_of_stock', r.sku,
        case when r.stock = 0 then 'Se agotó ' || r.sku || '.' else 'Solo quedan ' || r.stock || ' unidades de ' || r.sku || '.' end);
    end if;
    update app.product_variants set stock = stock - r.qty where id = r.id;
  end loop;

  v_shipping := case when v_zone.free_over is not null and v_subtotal >= v_zone.free_over then 0 else v_zone.price end;

  -- Cliente: uno por teléfono (si vuelve a comprar, se actualizan sus datos).
  insert into app.customers as cu (full_name, phone, email, last_order_at)
  values (v_name, v_phone, v_email, now())
  on conflict (phone) do update
    set full_name = excluded.full_name, email = excluded.email, last_order_at = now()
  returning cu.id into v_customer;

  insert into app.customer_addresses as a (customer_id, recipient_name, recipient_phone, alt_phone, country, department,
    city, neighborhood, address_line, reference, fingerprint)
  values (v_customer, v_rec_name, v_rec_phone, v_alt_phone, app.country_name(v_country), v_department,
    v_city, v_neigh, v_address, v_ref,
    md5(lower(concat_ws('|', v_rec_name, v_rec_phone, v_country, v_department, v_city, v_neigh, v_address))))
  on conflict (customer_id, fingerprint) do update
    set last_used_at = now(), reference = excluded.reference, alt_phone = excluded.alt_phone
  returning a.id into v_address_id;

  if v_test then
    v_seq := nextval('app.test_order_number_seq');
    v_number := s.order_prefix || '-T' || lpad(v_seq::text, 5, '0');
  else
    v_seq := nextval('app.order_number_seq');
    v_number := s.order_prefix || '-' || lpad(v_seq::text, 6, '0');
  end if;

  insert into app.orders (order_number, customer_id, address_id, payment_method, currency, subtotal, shipping_cost, total,
    item_count, customer_name, customer_email, customer_phone, ship_recipient_name, ship_phone, ship_alt_phone,
    ship_country, ship_department, ship_city, ship_neighborhood, ship_address, ship_reference, delivery_instructions,
    shipping_zone_name, shipping_estimate, idempotency_key, is_test, stock_reserved, ip_hash)
  values (v_number, v_customer, v_address_id, v_method, s.currency, v_subtotal, v_shipping, v_subtotal + v_shipping,
    v_units, v_name, v_email, v_phone, v_rec_name, v_rec_phone, v_alt_phone,
    app.country_name(v_country), v_department, v_city, v_neigh, v_address, v_ref, v_instr,
    v_zone.name, v_zone.estimated_days, v_key, v_test, true, app.clean_text(p ->> 'ip_hash'))
  returning id into v_order_id;

  insert into app.order_items (order_id, product_id, variant_id, sku, product_name, presentation, fragrance, unit_price, quantity, line_total)
  select v_order_id, (l ->> 'product_id')::uuid, (l ->> 'variant_id')::uuid, l ->> 'sku', l ->> 'product_name',
         l ->> 'presentation', l ->> 'fragrance', (l ->> 'unit_price')::numeric, (l ->> 'quantity')::int,
         (l ->> 'unit_price')::numeric * (l ->> 'quantity')::int
  from jsonb_array_elements(v_lines) l;

  insert into app.payments (order_id, method, provider, amount, currency, attempt, provider_order_ref, is_test)
  values (v_order_id, v_method, v_provider, v_subtotal + v_shipping, s.currency, 1,
          case when v_method = 'card' then v_number || '-1' end, v_test)
  returning id into v_payment;

  perform app.log_order_event(v_order_id, 'created', null, 'pending',
    'Pedido recibido · ' || case v_method when 'card' then 'Tarjeta' when 'bank_transfer' then 'Transferencia'
    else 'Contra entrega' end || case when v_test then ' · MODO DE PRUEBAS' else '' end, null, 'Cliente');

  return jsonb_build_object(
    'order_id', v_order_id, 'order_number', v_number, 'total', v_subtotal + v_shipping, 'currency', s.currency,
    'payment_method', v_method, 'status', 'pending', 'payment_status', 'pending', 'payment_id', v_payment,
    'duplicate', false
  );
end $$;

-- -----------------------------------------------------------------------------
--  Pagos con tarjeta
-- -----------------------------------------------------------------------------
-- Prepara un intento de pago (el primero se crea con el pedido). Nunca permite
-- cobrar un pedido ya pagado, cancelado o con un monto distinto al del pedido.
create function app.start_card_payment(p_order_number text, p_provider text, p_is_test boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o app.orders;
  pay app.payments;
  n int;
begin
  select * into o from app.orders where order_number = p_order_number for update;
  if not found then perform app.fail('not_found', null, 'Pedido no encontrado.'); end if;
  if o.payment_method <> 'card' then perform app.fail('invalid_state', null, 'Este pedido no se paga con tarjeta.'); end if;
  if o.is_test <> p_is_test then perform app.fail('invalid_state', null, 'Este pedido pertenece a otro modo de pagos.'); end if;
  if o.payment_status = 'approved' then perform app.fail('already_paid', null, 'Este pedido ya está pagado.'); end if;
  if o.status = 'cancelled' then perform app.fail('order_cancelled', null, 'Este pedido fue cancelado. Haz un pedido nuevo.'); end if;
  if exists (select 1 from app.payments where order_id = o.id and status = 'awaiting_verification') then
    perform app.fail('payment_in_review', null, 'Estamos verificando un pago de este pedido. Espera un momento.');
  end if;

  -- Reutiliza el intento pendiente que aún no llegó a la pasarela.
  select * into pay from app.payments
  where order_id = o.id and status = 'pending' and provider_payment_id is null and provider = p_provider
  order by attempt desc limit 1;
  if not found then
    select count(*) into n from app.payments where order_id = o.id;
    if n >= 6 then perform app.fail('too_many_attempts', null, 'Se alcanzó el máximo de intentos de pago para este pedido.'); end if;
    insert into app.payments (order_id, method, provider, amount, currency, attempt, provider_order_ref, is_test)
    values (o.id, 'card', p_provider, o.total, o.currency, n + 1, o.order_number || '-' || (n + 1), o.is_test)
    returning * into pay;
  end if;

  return jsonb_build_object(
    'payment_id', pay.id, 'provider_order_ref', pay.provider_order_ref, 'amount', o.total, 'currency', o.currency,
    'order_number', o.order_number, 'customer_name', o.customer_name, 'customer_email', o.customer_email,
    'customer_phone', o.customer_phone, 'ship_address', o.ship_address, 'ship_city', o.ship_city,
    'ship_department', o.ship_department, 'ship_country', o.ship_country,
    'items', (select jsonb_agg(jsonb_build_object('sku', sku, 'name', product_name || ' ' || presentation ||
               coalesce(' · ' || fragrance, ''), 'price', unit_price, 'qty', quantity)) from app.order_items where order_id = o.id)
  );
end $$;

-- Guarda el identificador de la pasarela en cuanto el navegador lo recibe.
create function app.attach_provider_payment(p_payment uuid, p_provider_payment_id text) returns void
language sql security definer set search_path = '' as $$
  update app.payments set provider_payment_id = p_provider_payment_id
  where id = p_payment and provider_payment_id is null;
$$;

-- Marca el pedido como pagado (uso interno).
create function app.mark_order_paid(p_order uuid, p_actor uuid, p_label text) returns void
language plpgsql security definer set search_path = '' as $$
declare o app.orders;
begin
  select * into o from app.orders where id = p_order for update;
  if o.payment_status = 'approved' then return; end if;
  update app.orders set payment_status = 'approved', paid_at = now() where id = p_order;
  perform app.log_order_event(p_order, 'payment', o.payment_status::text, 'approved', null, p_actor, p_label);
  if o.status = 'pending' then
    update app.orders set status = 'confirmed', confirmed_at = now() where id = p_order;
    perform app.log_order_event(p_order, 'status', 'pending', 'confirmed', 'Pago confirmado', p_actor, p_label);
  elsif o.status = 'cancelled' then
    update app.orders set needs_review = true,
      review_reason = 'Se recibió un pago para un pedido cancelado: reactivar o reembolsar.' where id = p_order;
    perform app.log_order_event(p_order, 'review', null, null,
      'Pago recibido con el pedido cancelado. Revisar: reactivar o reembolsar.', p_actor, p_label);
  end if;
end $$;

-- Aplica el resultado verificado de la pasarela. Idempotente por event_key.
--  p: provider, payment_id | provider_order_ref, provider_payment_id, status
--     ('approved'|'declined'|'cancelled'|'refunded'), amount, currency,
--     reference, response_code, response_message, raw, event_key, kind, actor_label
create function app.apply_payment_result(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  pay app.payments;
  o app.orders;
  v_status app.payment_status := (p ->> 'status')::app.payment_status;
  v_amount numeric(12,2) := nullif(p ->> 'amount', '')::numeric;
  v_label text := coalesce(p ->> 'actor_label', 'Pasarela');
  v_outcome text;
  v_inserted int;
begin
  if v_status not in ('approved', 'declined', 'cancelled', 'refunded') then
    perform app.fail('validation', 'status', 'Estado de pago inválido.');
  end if;

  if p ? 'payment_id' then
    select * into pay from app.payments where id = (p ->> 'payment_id')::uuid for update;
  else
    select * into pay from app.payments
    where provider = p ->> 'provider' and provider_order_ref = p ->> 'provider_order_ref' for update;
  end if;
  if not found then perform app.fail('not_found', null, 'Pago no encontrado.'); end if;
  select * into o from app.orders where id = pay.order_id for update;

  if p ->> 'event_key' is not null then
    insert into app.payment_events (provider, event_key, kind, order_id, payment_id, payload)
    values (pay.provider, p ->> 'event_key', coalesce(p ->> 'kind', 'confirm'), o.id, pay.id, p -> 'raw')
    on conflict (provider, event_key) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then
      return jsonb_build_object('duplicate', true, 'order_number', o.order_number,
        'payment_status', pay.status, 'order_payment_status', o.payment_status, 'order_status', o.status);
    end if;
  end if;

  if p ->> 'provider_payment_id' is not null then
    if pay.provider_payment_id is not null and pay.provider_payment_id <> p ->> 'provider_payment_id' then
      perform app.fail('mismatch', null, 'El identificador de pago no coincide.');
    end if;
    update app.payments set provider_payment_id = p ->> 'provider_payment_id' where id = pay.id;
  end if;

  update app.payments set
    provider_reference = coalesce(nullif(p ->> 'reference', ''), provider_reference),
    response_code = coalesce(nullif(p ->> 'response_code', ''), response_code),
    response_message = coalesce(nullif(p ->> 'response_message', ''), response_message),
    raw = coalesce(p -> 'raw', raw)
  where id = pay.id;

  if v_status = 'approved' then
    if pay.status = 'approved' then
      v_outcome := 'already_approved';
    elsif v_amount is null or v_amount <> pay.amount or v_amount <> o.total
          or coalesce(p ->> 'currency', pay.currency) <> pay.currency then
      update app.orders set needs_review = true,
        review_reason = 'La pasarela reportó un monto distinto al del pedido.' where id = o.id;
      perform app.log_order_event(o.id, 'review', null, null,
        'Monto reportado ' || coalesce(v_amount::text, '¿?') || ' ≠ total ' || o.total || '. No se marcó como pagado.', null, v_label);
      v_outcome := 'amount_mismatch';
    else
      update app.payments set status = 'approved', approved_at = now() where id = pay.id;
      if o.payment_status = 'approved' then
        -- Otro intento ya había cobrado este pedido: posible cobro duplicado.
        update app.orders set needs_review = true,
          review_reason = 'Posible cobro duplicado: hay más de un pago aprobado. Reembolsar uno.' where id = o.id;
        perform app.log_order_event(o.id, 'review', null, null,
          'Segundo pago aprobado (' || pay.provider_order_ref || '). Revisar y reembolsar.', null, v_label);
        v_outcome := 'duplicate_charge';
      else
        perform app.mark_order_paid(o.id, null, v_label);
        v_outcome := 'approved';
      end if;
    end if;

  elsif v_status = 'refunded' then
    if pay.status = 'approved' then
      update app.payments set status = 'refunded' where id = pay.id;
      if not exists (select 1 from app.payments where order_id = o.id and status = 'approved') then
        update app.orders set payment_status = 'refunded' where id = o.id;
      end if;
      perform app.log_order_event(o.id, 'payment', 'approved', 'refunded', pay.provider_order_ref, null, v_label);
      v_outcome := 'refunded';
    else
      v_outcome := 'ignored';
    end if;

  else -- declined / cancelled
    if pay.status in ('pending', 'awaiting_verification') then
      update app.payments set status = v_status where id = pay.id;
      if o.payment_status not in ('approved', 'refunded') then
        update app.orders set payment_status = v_status where id = o.id;
      end if;
      perform app.log_order_event(o.id, 'payment', pay.status::text, v_status::text,
        nullif(concat_ws(' · ', pay.provider_order_ref, nullif(p ->> 'response_message', '')), ''), null, v_label);
      v_outcome := v_status::text;
    else
      v_outcome := 'ignored';
    end if;
  end if;

  if p ->> 'event_key' is not null then
    update app.payment_events set outcome = v_outcome where provider = pay.provider and event_key = p ->> 'event_key';
  end if;

  select * into o from app.orders where id = o.id;
  return jsonb_build_object('duplicate', false, 'outcome', v_outcome, 'order_number', o.order_number,
    'order_status', o.status, 'order_payment_status', o.payment_status);
end $$;

-- Pagos pendientes que conviene volver a consultar en la pasarela.
create function app.pending_card_payments(p_limit int default 50) returns setof app.payments
language sql stable security definer set search_path = '' as $$
  select pay.* from app.payments pay join app.orders o on o.id = pay.order_id
  where pay.method = 'card' and pay.status = 'pending' and pay.provider_payment_id is not null
    and pay.created_at > now() - interval '3 days'
  order by pay.created_at limit p_limit;
$$;

-- Cancela pedidos con tarjeta que no se pagaron a tiempo y libera el inventario.
create function app.expire_stale_orders() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; ttl int;
begin
  select card_payment_ttl_minutes into ttl from app.settings where id = 1;
  for r in
    select o.id from app.orders o
    where o.status = 'pending' and o.payment_method = 'card' and o.payment_status <> 'approved'
      and o.created_at < now() - make_interval(mins => ttl)
      and not exists (select 1 from app.payments p where p.order_id = o.id and p.status in ('approved', 'awaiting_verification'))
    for update skip locked
  loop
    perform app.release_stock(r.id);
    update app.payments set status = 'cancelled' where order_id = r.id and status = 'pending';
    update app.orders set status = 'cancelled', payment_status = 'cancelled', cancelled_at = now() where id = r.id;
    perform app.log_order_event(r.id, 'status', 'pending', 'cancelled', 'Pago no completado a tiempo. Inventario liberado.', null, 'Sistema');
    n := n + 1;
  end loop;
  return n;
end $$;

-- -----------------------------------------------------------------------------
--  Consulta del pedido por el cliente
-- -----------------------------------------------------------------------------
-- p_full = true (enlace con token): incluye la dirección completa.
create function app.order_public(p_order_number text, p_full boolean) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'orderNumber', o.order_number, 'createdAt', o.created_at, 'status', o.status,
    'paymentMethod', o.payment_method, 'paymentStatus', o.payment_status, 'isTest', o.is_test,
    'currency', o.currency, 'subtotal', o.subtotal, 'discount', o.discount, 'shippingCost', o.shipping_cost,
    'total', o.total, 'customerName', split_part(o.customer_name, ' ', 1),
    'shipping', case when p_full then jsonb_build_object(
        'recipientName', o.ship_recipient_name, 'phone', o.ship_phone, 'altPhone', o.ship_alt_phone,
        'country', o.ship_country, 'department', o.ship_department, 'city', o.ship_city,
        'neighborhood', o.ship_neighborhood, 'address', o.ship_address, 'reference', o.ship_reference,
        'instructions', o.delivery_instructions, 'zone', o.shipping_zone_name, 'estimate', o.shipping_estimate)
      else jsonb_build_object('city', o.ship_city, 'department', o.ship_department, 'estimate', o.shipping_estimate) end,
    'items', (select jsonb_agg(jsonb_build_object('sku', i.sku, 'name', i.product_name, 'presentation', i.presentation,
               'fragrance', i.fragrance, 'unitPrice', i.unit_price, 'quantity', i.quantity, 'lineTotal', i.line_total) order by i.product_name)
              from app.order_items i where i.order_id = o.id),
    'shipment', (select jsonb_build_object('carrier', sh.carrier_name, 'tracking', sh.tracking_number,
                   'trackingUrl', case when c.tracking_url is not null and sh.tracking_number is not null
                                       then replace(c.tracking_url, '{tracking}', sh.tracking_number) end)
                 from app.shipments sh left join app.carriers c on c.id = sh.carrier_id
                 where sh.order_id = o.id and sh.tracking_number is not null),
    'transferInstructions', case when o.payment_method = 'bank_transfer' and o.payment_status in ('pending', 'declined')
                                 then (select transfer_instructions from app.settings where id = 1) end,
    'codInstructions', case when o.payment_method = 'cash_on_delivery'
                            then (select cod_instructions from app.settings where id = 1) end,
    'canPayAgain', o.payment_method = 'card' and o.status = 'pending' and o.payment_status in ('pending', 'declined', 'cancelled'),
    'canReportTransfer', o.payment_method = 'bank_transfer' and o.status = 'pending' and o.payment_status in ('pending', 'declined'),
    'timeline', (select jsonb_agg(jsonb_build_object('at', e.created_at, 'kind', e.kind, 'to', e.to_value) order by e.created_at)
                 from app.order_events e where e.order_id = o.id and e.kind in ('created', 'status', 'payment'))
  )
  from app.orders o where o.order_number = p_order_number;
$$;

-- Verificación alternativa: número de pedido + teléfono del comprador.
create function app.order_matches_phone(p_order_number text, p_phone text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from app.orders o
    where o.order_number = p_order_number
      and o.customer_phone = app.normalize_phone(p_phone, case when o.ship_country = 'Honduras' then 'HN' else '' end)
  );
$$;

-- El cliente avisa que ya transfirió (queda "por verificar"; no se marca pagado).
create function app.report_transfer(p_order_number text, p_reference text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o app.orders; v_ref text := app.clean_text(p_reference);
begin
  if v_ref is null or char_length(v_ref) < 3 or char_length(v_ref) > 80 then
    perform app.fail('validation', 'reference', 'Escribe el número de referencia de la transferencia.');
  end if;
  select * into o from app.orders where order_number = p_order_number for update;
  if not found then perform app.fail('not_found', null, 'Pedido no encontrado.'); end if;
  if o.payment_method <> 'bank_transfer' or o.status <> 'pending' or o.payment_status not in ('pending', 'declined') then
    perform app.fail('invalid_state', null, 'Este pedido no está esperando una transferencia.');
  end if;
  update app.payments set status = 'awaiting_verification', provider_reference = v_ref
  where id = (select id from app.payments where order_id = o.id and method = 'bank_transfer' order by attempt desc limit 1);
  update app.orders set payment_status = 'awaiting_verification' where id = o.id;
  perform app.log_order_event(o.id, 'payment', o.payment_status::text, 'awaiting_verification',
    'Referencia reportada por el cliente: ' || v_ref, null, 'Cliente');
  return jsonb_build_object('ok', true);
end $$;

-- -----------------------------------------------------------------------------
--  Permisos: ninguna función de `app` es ejecutable por los roles de la API.
-- -----------------------------------------------------------------------------
revoke all on all functions in schema app from public, anon, authenticated;
grant execute on function app.has_staff_role(app.staff_role) to authenticated;
