-- =============================================================================
--  AROMATIC · Funciones del panel administrativo
-- =============================================================================
--  Todas reciben un objeto jsonb y devuelven jsonb. Todas empiezan con
--  app.require_staff(<rol mínimo>), que lee el usuario del JWT verificado
--  (auth.uid()). La función de servidor `admin` solo llama a las funciones de
--  esta lista blanca. Cada cambio queda en order_events o audit_log con el
--  correo de quien lo hizo.
--
--  Ventas: solo cuentan pedidos con pago aprobado que no están cancelados ni
--  devueltos, y nunca pedidos de prueba.
-- =============================================================================

create function app.like_pattern(p text) returns text
language sql immutable as $$
  select '%' || replace(replace(replace(p, '\', '\\'), '%', '\%'), '_', '\_') || '%';
$$;

create function app.text_array(p jsonb) returns text[]
language sql immutable as $$
  select case when jsonb_typeof(p) = 'array' then array(select jsonb_array_elements_text(p))
              when jsonb_typeof(p) = 'string' and p #>> '{}' <> '' then array[p #>> '{}'] end;
$$;

create function app.order_transition_allowed(p_from app.order_status, p_to app.order_status) returns boolean
language sql immutable as $$
  select case p_from
    when 'pending'        then p_to in ('confirmed', 'cancelled')
    when 'confirmed'      then p_to in ('preparing', 'ready_to_ship', 'shipped', 'cancelled')
    when 'preparing'      then p_to in ('ready_to_ship', 'shipped', 'cancelled')
    when 'ready_to_ship'  then p_to in ('preparing', 'shipped', 'cancelled')
    when 'shipped'        then p_to in ('delivered', 'returned')
    when 'delivered'      then p_to in ('returned')
    when 'cancelled'      then p_to in ('confirmed')
    else false
  end;
$$;

create function app.audit(p_m app.staff_members, p_action text, p_entity text, p_entity_id text, p_details jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into app.audit_log (actor_id, actor_label, action, entity, entity_id, details)
  values (p_m.user_id, p_m.email, p_action, p_entity, p_entity_id, p_details);
$$;

-- -----------------------------------------------------------------------------
--  Sesión
-- -----------------------------------------------------------------------------
create function app.admin_me(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m app.staff_members := app.require_staff('staff');
begin
  return jsonb_build_object('userId', m.user_id, 'email', m.email, 'fullName', m.full_name, 'role', m.role,
    'currency', (select currency from app.settings where id = 1),
    'storeEnabled', (select store_enabled from app.settings where id = 1));
end $$;

-- -----------------------------------------------------------------------------
--  Resumen general
-- -----------------------------------------------------------------------------
create function app.admin_summary(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('staff');
  tz text := coalesce(nullif(p ->> 'tz', ''), 'America/Tegucigalpa');
  v_test boolean := coalesce((p ->> 'test')::boolean, false);
  today date;
  res jsonb;
begin
  if not exists (select 1 from pg_timezone_names where name = tz) then tz := 'America/Tegucigalpa'; end if;
  today := (now() at time zone tz)::date;

  with valid as (
    select o.*, (o.paid_at at time zone tz)::date as paid_day
    from app.orders o
    where o.is_test = v_test and o.payment_status = 'approved' and o.status not in ('cancelled', 'returned')
  ),
  allo as (select * from app.orders where is_test = v_test)
  select jsonb_build_object(
    'currency', (select currency from app.settings where id = 1),
    'test', v_test,
    'revenue', (select jsonb_build_object(
        'total', coalesce(sum(total), 0),
        'today', coalesce(sum(total) filter (where paid_day = today), 0),
        'week', coalesce(sum(total) filter (where paid_day >= date_trunc('week', today::timestamp)::date), 0),
        'month', coalesce(sum(total) filter (where paid_day >= date_trunc('month', today::timestamp)::date), 0),
        'paidOrders', count(*),
        'averageTicket', coalesce(round(avg(total), 2), 0)
      ) from valid),
    'counts', (select jsonb_build_object(
        'orders', count(*),
        'pendingPayment', count(*) filter (where status = 'pending' and payment_status <> 'approved'),
        'awaitingVerification', count(*) filter (where payment_status = 'awaiting_verification'),
        'paid', count(*) filter (where payment_status = 'approved' and status not in ('cancelled', 'returned')),
        'toShip', count(*) filter (where status in ('confirmed', 'preparing', 'ready_to_ship')),
        'shipped', count(*) filter (where status = 'shipped'),
        'delivered', count(*) filter (where status = 'delivered'),
        'cancelled', count(*) filter (where status = 'cancelled'),
        'needsReview', count(*) filter (where needs_review)
      ) from allo),
    'topProducts', coalesce((select jsonb_agg(t order by t.units desc, t.revenue desc) from (
        select i.sku, i.product_name as name, i.presentation, sum(i.quantity)::int as units, sum(i.line_total) as revenue
        from app.order_items i join valid v on v.id = i.order_id
        group by i.sku, i.product_name, i.presentation
        order by units desc, revenue desc limit 8) t), '[]'::jsonb),
    'daily', (select jsonb_agg(jsonb_build_object('date', d::date, 'revenue', coalesce(x.rev, 0), 'orders', coalesce(x.n, 0)) order by d)
              from generate_series(today - 29, today, interval '1 day') d
              left join (select paid_day, sum(total) as rev, count(*) as n from valid group by paid_day) x on x.paid_day = d::date),
    'monthly', (select jsonb_agg(jsonb_build_object('month', to_char(mth, 'YYYY-MM'), 'revenue', coalesce(x.rev, 0), 'orders', coalesce(x.n, 0)) order by mth)
              from generate_series(date_trunc('month', today::timestamp) - interval '11 months', date_trunc('month', today::timestamp), interval '1 month') mth
              left join (select date_trunc('month', paid_day::timestamp) as mm, sum(total) as rev, count(*) as n from valid group by 1) x on x.mm = mth)
  ) into res;
  return res;
end $$;

-- -----------------------------------------------------------------------------
--  Pedidos
-- -----------------------------------------------------------------------------
create function app.admin_list_orders(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('staff');
  tz text := 'America/Tegucigalpa';
  v_q text := app.clean_text(p ->> 'q');
  v_digits text := nullif(regexp_replace(coalesce(p ->> 'q', ''), '\D', '', 'g'), '');
  v_status text[] := app.text_array(p -> 'status');
  v_pay text[] := app.text_array(p -> 'paymentStatus');
  v_method text[] := app.text_array(p -> 'paymentMethod');
  v_city text := app.clean_text(p ->> 'city');
  v_from date := nullif(p ->> 'dateFrom', '')::date;
  v_to date := nullif(p ->> 'dateTo', '')::date;
  v_review boolean := coalesce((p ->> 'needsReview')::boolean, false);
  v_test boolean := coalesce((p ->> 'test')::boolean, false);
  v_size int := least(greatest(coalesce((p ->> 'pageSize')::int, 25), 1), 200);
  v_page int := greatest(coalesce((p ->> 'page')::int, 1), 1);
  res jsonb;
begin
  with f as (
    select o.id, o.order_number, o.created_at, o.customer_name, o.customer_phone, o.ship_city, o.ship_department,
           o.total, o.currency, o.payment_method, o.payment_status, o.status, o.is_test, o.needs_review, o.item_count,
           sh.carrier_name, sh.tracking_number, sh.guide_number, coalesce(sh.print_count, 0) as print_count
    from app.orders o left join app.shipments sh on sh.order_id = o.id
    where o.is_test = v_test
      and (v_q is null
           or o.order_number ilike app.like_pattern(v_q)
           or o.customer_name ilike app.like_pattern(v_q)
           or o.ship_city ilike app.like_pattern(v_q)
           or sh.tracking_number ilike app.like_pattern(v_q)
           or (v_digits is not null and length(v_digits) >= 4 and o.customer_phone like '%' || v_digits || '%'))
      and (v_status is null or o.status::text = any (v_status))
      and (v_pay is null or o.payment_status::text = any (v_pay))
      and (v_method is null or o.payment_method::text = any (v_method))
      and (v_city is null or lower(o.ship_city) = lower(v_city))
      and (v_from is null or (o.created_at at time zone tz)::date >= v_from)
      and (v_to is null or (o.created_at at time zone tz)::date <= v_to)
      and (not v_review or o.needs_review)
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'page', v_page, 'pageSize', v_size,
    'rows', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc)
                      from (select * from f order by created_at desc limit v_size offset (v_page - 1) * v_size) x), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(c order by c) from (select distinct ship_city as c from app.orders where is_test = v_test) cc), '[]'::jsonb)
  ) into res;
  return res;
end $$;

create function app.admin_get_order(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('staff');
  o app.orders;
begin
  select * into o from app.orders where id = (p ->> 'id')::uuid;
  if not found then perform app.fail('not_found', null, 'Pedido no encontrado.'); end if;
  return jsonb_build_object(
    'order', to_jsonb(o) - 'idempotency_key' - 'ip_hash',
    'items', (select jsonb_agg(to_jsonb(i) order by i.product_name) from app.order_items i where i.order_id = o.id),
    'payments', (select jsonb_agg(jsonb_build_object(
        'id', pay.id, 'method', pay.method, 'provider', pay.provider, 'status', pay.status, 'amount', pay.amount,
        'currency', pay.currency, 'attempt', pay.attempt, 'providerOrderRef', pay.provider_order_ref,
        'providerPaymentId', pay.provider_payment_id, 'reference', pay.provider_reference,
        'responseCode', pay.response_code, 'responseMessage', pay.response_message, 'isTest', pay.is_test,
        'createdAt', pay.created_at, 'approvedAt', pay.approved_at,
        'raw', case when m.role in ('owner', 'admin') then pay.raw end) order by pay.attempt)
      from app.payments pay where pay.order_id = o.id),
    'shipment', (select to_jsonb(sh) from app.shipments sh where sh.order_id = o.id),
    'events', (select jsonb_agg(to_jsonb(e) - 'order_id' order by e.created_at, e.id) from app.order_events e where e.order_id = o.id),
    'customer', (select jsonb_build_object('id', c.id, 'fullName', c.full_name, 'phone', c.phone, 'email', c.email,
        'orders', (select count(*) from app.orders x where x.customer_id = c.id and not x.is_test))
      from app.customers c where c.id = o.customer_id),
    'allowedStatuses', (select jsonb_agg(s) from unnest(enum_range(null::app.order_status)) s
                        where app.order_transition_allowed(o.status, s))
  );
end $$;

create function app.admin_update_order_status(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('staff');
  o app.orders;
  v_to app.order_status;
  v_note text := app.clean_text(p ->> 'note');
begin
  begin
    v_to := (p ->> 'status')::app.order_status;
  exception when others then
    perform app.fail('validation', 'status', 'Estado inválido.');
  end;
  select * into o from app.orders where id = (p ->> 'id')::uuid for update;
  if not found then perform app.fail('not_found', null, 'Pedido no encontrado.'); end if;
  if not app.order_transition_allowed(o.status, v_to) then
    perform app.fail('invalid_transition', 'status', 'No se puede pasar de ' || o.status || ' a ' || v_to || '.');
  end if;

  if v_to in ('confirmed', 'preparing', 'ready_to_ship', 'shipped', 'delivered')
     and o.payment_status <> 'approved' and o.payment_method <> 'cash_on_delivery' then
    perform app.fail('payment_required', 'status', 'El pago todavía no está confirmado.');
  end if;

  if o.status = 'cancelled' and v_to = 'confirmed' then
    perform app.require_staff('admin');
    perform app.reserve_stock(o.id);
    update app.orders set cancelled_at = null where id = o.id;
  end if;

  if v_to = 'cancelled' then
    perform app.release_stock(o.id);
    update app.payments set status = 'cancelled' where order_id = o.id and status in ('pending', 'awaiting_verification');
    if o.payment_status = 'approved' then
      update app.orders set needs_review = true,
        review_reason = 'Pedido cancelado con pago aprobado: hacer el reembolso y marcarlo.' where id = o.id;
    elsif o.payment_status in ('pending', 'awaiting_verification') then
      update app.orders set payment_status = 'cancelled' where id = o.id;
    end if;
    update app.orders set cancelled_at = now() where id = o.id;
  end if;

  update app.orders set status = v_to,
    confirmed_at = case when v_to = 'confirmed' then now() else confirmed_at end,
    shipped_at = case when v_to = 'shipped' then now() else shipped_at end,
    delivered_at = case when v_to = 'delivered' then now() else delivered_at end
  where id = o.id;
  perform app.log_order_event(o.id, 'status', o.status::text, v_to::text, v_note, m.user_id, m.email);
  return app.admin_get_order(jsonb_build_object('id', o.id));
end $$;

create function app.admin_update_payment_status(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('staff');
  o app.orders;
  pay app.payments;
  v_to app.payment_status;
  v_note text := app.clean_text(p ->> 'note');
  v_ref text := app.clean_text(p ->> 'reference');
  ok boolean := false;
begin
  begin
    v_to := (p ->> 'status')::app.payment_status;
  exception when others then
    perform app.fail('validation', 'status', 'Estado de pago inválido.');
  end;
  select * into o from app.orders where id = (p ->> 'id')::uuid for update;
  if not found then perform app.fail('not_found', null, 'Pedido no encontrado.'); end if;
  select * into pay from app.payments where order_id = o.id
  order by (status = 'approved') desc, attempt desc limit 1 for update;

  if o.payment_method = 'card' then
    -- Los pagos con tarjeta los aprueba la pasarela. Única excepción: un pedido
    -- en revisión (p. ej. PixelPay no informó el monto) que el owner verificó
    -- en el panel de PixelPay; la nota es obligatoria y queda en el historial.
    ok := (o.payment_status = 'approved' and v_to = 'refunded')
       or (o.payment_status in ('pending', 'declined') and v_to = 'cancelled')
       or (o.payment_status in ('pending', 'declined') and v_to = 'approved' and o.needs_review
           and m.role = 'owner' and v_note is not null and v_ref is not null);
  elsif o.payment_method = 'bank_transfer' then
    ok := (o.payment_status in ('pending', 'awaiting_verification', 'declined') and v_to = 'approved')
       or (o.payment_status in ('pending', 'awaiting_verification') and v_to in ('declined', 'cancelled'))
       or (o.payment_status = 'approved' and v_to = 'refunded');
  else -- contra entrega
    ok := (o.payment_status = 'pending' and v_to in ('approved', 'cancelled'))
       or (o.payment_status = 'approved' and v_to = 'refunded');
  end if;
  if not ok then
    perform app.fail('invalid_transition', 'status', 'Ese cambio de pago no está permitido para este pedido.');
  end if;
  if v_to = 'refunded' then
    perform app.require_staff('admin');
    if v_note is null then perform app.fail('validation', 'note', 'Describe el reembolso (fecha, medio, referencia).'); end if;
  end if;
  if v_to = 'approved' and o.payment_method = 'bank_transfer' and coalesce(v_ref, pay.provider_reference) is null then
    perform app.fail('validation', 'reference', 'Escribe la referencia de la transferencia verificada.');
  end if;

  update app.payments set status = v_to,
    provider_reference = coalesce(v_ref, provider_reference),
    approved_at = case when v_to = 'approved' then now() else approved_at end
  where id = pay.id;
  insert into app.payment_events (provider, event_key, kind, order_id, payment_id, payload, outcome)
  values (pay.provider, 'admin:' || gen_random_uuid(), 'admin', o.id, pay.id,
          jsonb_build_object('by', m.email, 'to', v_to, 'reference', v_ref, 'note', v_note), v_to::text);

  if v_to = 'approved' then
    perform app.mark_order_paid(o.id, m.user_id, m.email);
    if v_note is not null or v_ref is not null then
      perform app.log_order_event(o.id, 'note', null, null,
        concat_ws(' · ', 'Pago verificado', 'Ref. ' || v_ref, v_note), m.user_id, m.email);
    end if;
  else
    update app.orders set payment_status = v_to where id = o.id;
    perform app.log_order_event(o.id, 'payment', o.payment_status::text, v_to::text,
      concat_ws(' · ', 'Ref. ' || v_ref, v_note), m.user_id, m.email);
  end if;
  return app.admin_get_order(jsonb_build_object('id', o.id));
end $$;

create function app.admin_add_note(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m app.staff_members := app.require_staff('staff'); v_note text := app.clean_text(p ->> 'note');
begin
  if v_note is null or char_length(v_note) > 1000 then perform app.fail('validation', 'note', 'Escribe la nota (máx. 1000).'); end if;
  if not exists (select 1 from app.orders where id = (p ->> 'id')::uuid) then perform app.fail('not_found', null, 'Pedido no encontrado.'); end if;
  perform app.log_order_event((p ->> 'id')::uuid, 'note', null, null, v_note, m.user_id, m.email);
  return app.admin_get_order(jsonb_build_object('id', p ->> 'id'));
end $$;

create function app.admin_resolve_review(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m app.staff_members := app.require_staff('admin'); v_note text := app.clean_text(p ->> 'note');
begin
  if v_note is null then perform app.fail('validation', 'note', 'Explica cómo se resolvió.'); end if;
  update app.orders set needs_review = false, review_reason = null where id = (p ->> 'id')::uuid and needs_review;
  if not found then perform app.fail('invalid_state', null, 'El pedido no tenía una revisión pendiente.'); end if;
  perform app.log_order_event((p ->> 'id')::uuid, 'review', 'pendiente', 'resuelta', v_note, m.user_id, m.email);
  return app.admin_get_order(jsonb_build_object('id', p ->> 'id'));
end $$;

-- -----------------------------------------------------------------------------
--  Envíos y guías
-- -----------------------------------------------------------------------------
create function app.default_contents(p_order uuid) returns text
language sql stable security definer set search_path = '' as $$
  select left('AROMATIC: ' || string_agg(i.quantity || ' × ' || i.product_name || ' ' || i.presentation, ', ' order by i.product_name), 300)
  from app.order_items i where i.order_id = p_order;
$$;

create function app.admin_save_shipment(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('staff');
  o app.orders;
  old app.shipments;
  v_carrier app.carriers;
  v_tracking text := app.clean_text(p ->> 'tracking_number');
begin
  select * into o from app.orders where id = (p ->> 'order_id')::uuid for update;
  if not found then perform app.fail('not_found', null, 'Pedido no encontrado.'); end if;
  if o.status in ('pending', 'cancelled') then
    perform app.fail('invalid_state', null, 'Confirma el pedido antes de registrar el envío.');
  end if;
  if nullif(p ->> 'carrier_id', '') is not null then
    select * into v_carrier from app.carriers where id = (p ->> 'carrier_id')::uuid;
    if not found then perform app.fail('validation', 'carrier_id', 'Transportista inválida.'); end if;
  end if;
  select * into old from app.shipments where order_id = o.id;

  insert into app.shipments as s (order_id, carrier_id, carrier_name, tracking_number, packages, weight_kg, declared_value,
    contents, handling_notes, updated_by)
  values (o.id, v_carrier.id, v_carrier.name, v_tracking, coalesce(nullif(p ->> 'packages', '')::int, 1),
    nullif(p ->> 'weight_kg', '')::numeric, nullif(p ->> 'declared_value', '')::numeric,
    coalesce(app.clean_text(p ->> 'contents'), app.default_contents(o.id)), app.clean_text(p ->> 'handling_notes'), m.user_id)
  on conflict (order_id) do update set
    carrier_id = excluded.carrier_id, carrier_name = excluded.carrier_name, tracking_number = excluded.tracking_number,
    packages = excluded.packages, weight_kg = excluded.weight_kg, declared_value = excluded.declared_value,
    contents = excluded.contents, handling_notes = excluded.handling_notes, updated_by = m.user_id;

  if old.id is null or old.carrier_id is distinct from v_carrier.id or old.tracking_number is distinct from v_tracking then
    perform app.log_order_event(o.id, 'shipment', concat_ws(' · ', old.carrier_name, old.tracking_number),
      concat_ws(' · ', v_carrier.name, v_tracking), null, m.user_id, m.email);
  end if;
  return app.admin_get_order(jsonb_build_object('id', o.id));
end $$;

create function app.admin_bulk_assign_carrier(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('staff');
  v_ids uuid[] := array(select jsonb_array_elements_text(p -> 'order_ids')::uuid);
  v_carrier app.carriers;
  r record; n int := 0;
begin
  if coalesce(array_length(v_ids, 1), 0) = 0 or array_length(v_ids, 1) > 200 then
    perform app.fail('validation', 'order_ids', 'Selecciona entre 1 y 200 pedidos.');
  end if;
  select * into v_carrier from app.carriers where id = (p ->> 'carrier_id')::uuid and is_active;
  if not found then perform app.fail('validation', 'carrier_id', 'Elige una transportista activa.'); end if;
  for r in select o.id from app.orders o where o.id = any (v_ids) and o.status in ('confirmed', 'preparing', 'ready_to_ship', 'shipped') for update
  loop
    insert into app.shipments as s (order_id, carrier_id, carrier_name, contents, updated_by)
    values (r.id, v_carrier.id, v_carrier.name, app.default_contents(r.id), m.user_id)
    on conflict (order_id) do update set carrier_id = excluded.carrier_id, carrier_name = excluded.carrier_name, updated_by = m.user_id
    where s.carrier_id is distinct from excluded.carrier_id;
    perform app.log_order_event(r.id, 'shipment', null, v_carrier.name, 'Asignación por lote', m.user_id, m.email);
    n := n + 1;
  end loop;
  return jsonb_build_object('updated', n, 'skipped', array_length(v_ids, 1) - n);
end $$;

-- Datos de las guías (A4). Asigna el número de guía interno la primera vez y,
-- si p.register_print = true, suma la impresión al historial.
create function app.admin_guides(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('staff');
  v_ids uuid[] := array(select jsonb_array_elements_text(p -> 'order_ids')::uuid);
  v_print boolean := coalesce((p ->> 'register_print')::boolean, false);
  s app.settings;
  r record;
  bad text;
  guides jsonb := '[]'::jsonb;
begin
  if coalesce(array_length(v_ids, 1), 0) = 0 or array_length(v_ids, 1) > 100 then
    perform app.fail('validation', 'order_ids', 'Selecciona entre 1 y 100 pedidos por lote.');
  end if;
  select string_agg(order_number, ', ') into bad from app.orders
  where id = any (v_ids) and status in ('pending', 'cancelled');
  if bad is not null then
    perform app.fail('invalid_state', 'order_ids', 'Estos pedidos no están confirmados: ' || bad || '.');
  end if;
  select * into s from app.settings where id = 1;

  for r in select o.* from app.orders o where o.id = any (v_ids) order by o.order_number for update
  loop
    insert into app.shipments (order_id, contents, updated_by) values (r.id, app.default_contents(r.id), m.user_id)
    on conflict (order_id) do nothing;
    update app.shipments set guide_number = s.order_prefix || '-G' || lpad(nextval('app.guide_number_seq')::text, 6, '0')
    where order_id = r.id and guide_number is null;
    if v_print then
      update app.shipments set print_count = print_count + 1,
        first_printed_at = coalesce(first_printed_at, now()), last_printed_at = now()
      where order_id = r.id;
      perform app.log_order_event(r.id, 'guide', null,
        (select guide_number || ' (impresión ' || print_count || ')' from app.shipments where order_id = r.id),
        null, m.user_id, m.email);
    end if;
    guides := guides || (
      select jsonb_build_object(
        'orderId', r.id, 'orderNumber', r.order_number, 'createdAt', r.created_at, 'isTest', r.is_test,
        'guideNumber', sh.guide_number, 'carrier', sh.carrier_name, 'tracking', sh.tracking_number,
        'packages', sh.packages, 'weightKg', sh.weight_kg, 'declaredValue', sh.declared_value,
        'contents', sh.contents, 'handlingNotes', sh.handling_notes, 'printCount', sh.print_count,
        'currency', r.currency,
        -- Monto a cobrar al entregar (solo contra entrega sin cobrar). No es información bancaria.
        'collectOnDelivery', case when r.payment_method = 'cash_on_delivery' and r.payment_status = 'pending' then r.total end,
        'recipient', jsonb_build_object(
          'name', r.ship_recipient_name, 'buyerName', r.customer_name, 'phone', r.ship_phone, 'altPhone', r.ship_alt_phone,
          'country', r.ship_country, 'department', r.ship_department, 'city', r.ship_city,
          'neighborhood', r.ship_neighborhood, 'address', r.ship_address, 'reference', r.ship_reference,
          'instructions', r.delivery_instructions))
      from app.shipments sh where sh.order_id = r.id);
  end loop;

  return jsonb_build_object(
    'sender', jsonb_build_object('name', s.sender_name, 'phone', s.sender_phone, 'address', s.sender_address,
      'city', s.sender_city, 'department', s.sender_department, 'country', s.sender_country),
    'guides', guides);
end $$;

create function app.admin_export_orders(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('staff');
  listing jsonb := app.admin_list_orders(p || jsonb_build_object('page', 1, 'pageSize', 200));
  v_ids uuid[];
  tz text := 'America/Tegucigalpa';
  v_size int := 200; v_page int := 1; total int := (listing ->> 'total')::int;
begin
  if total > 5000 then perform app.fail('too_many', null, 'Filtra el listado: máximo 5000 pedidos por exportación.'); end if;
  v_ids := array(select (x ->> 'id')::uuid from jsonb_array_elements(listing -> 'rows') x);
  while v_page * v_size < total loop
    v_page := v_page + 1;
    v_ids := v_ids || array(select (x ->> 'id')::uuid from jsonb_array_elements(
      app.admin_list_orders(p || jsonb_build_object('page', v_page, 'pageSize', v_size)) -> 'rows') x);
  end loop;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'pedido', o.order_number, 'fecha', to_char(o.created_at at time zone tz, 'YYYY-MM-DD HH24:MI'),
      'cliente', o.customer_name, 'telefono', o.customer_phone, 'correo', o.customer_email,
      'recibe', o.ship_recipient_name, 'telefono_recibe', o.ship_phone, 'departamento', o.ship_department,
      'ciudad', o.ship_city, 'colonia', o.ship_neighborhood, 'direccion', o.ship_address, 'referencias', o.ship_reference,
      'productos', (select string_agg(i.quantity || ' x ' || i.sku || coalesce(' (' || i.fragrance || ')', ''), '; ')
                    from app.order_items i where i.order_id = o.id),
      'subtotal', o.subtotal, 'descuento', o.discount, 'envio', o.shipping_cost, 'total', o.total, 'moneda', o.currency,
      'metodo_pago', o.payment_method, 'estado_pago', o.payment_status, 'estado_pedido', o.status,
      'transportista', sh.carrier_name, 'guia', sh.guide_number, 'seguimiento', sh.tracking_number
    ) order by o.created_at desc)
    from app.orders o left join app.shipments sh on sh.order_id = o.id where o.id = any (v_ids)), '[]'::jsonb);
end $$;

-- -----------------------------------------------------------------------------
--  Clientes
-- -----------------------------------------------------------------------------
create function app.admin_list_customers(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('staff');
  v_q text := app.clean_text(p ->> 'q');
  v_digits text := nullif(regexp_replace(coalesce(p ->> 'q', ''), '\D', '', 'g'), '');
  v_size int := least(greatest(coalesce((p ->> 'pageSize')::int, 25), 1), 100);
  v_page int := greatest(coalesce((p ->> 'page')::int, 1), 1);
  res jsonb;
begin
  with f as (
    select c.id, c.full_name, c.phone, c.email, c.created_at, c.last_order_at,
           count(o.id) filter (where not o.is_test) as orders,
           coalesce(sum(o.total) filter (where not o.is_test and o.payment_status = 'approved'
                                         and o.status not in ('cancelled', 'returned')), 0) as total_spent,
           (select a.city || ', ' || a.department from app.customer_addresses a
             where a.customer_id = c.id order by a.last_used_at desc limit 1) as location
    from app.customers c left join app.orders o on o.customer_id = c.id
    where v_q is null or c.full_name ilike app.like_pattern(v_q) or c.email ilike app.like_pattern(v_q)
          or (v_digits is not null and length(v_digits) >= 4 and c.phone like '%' || v_digits || '%')
    group by c.id
  )
  select jsonb_build_object('total', (select count(*) from f), 'page', v_page, 'pageSize', v_size,
    'rows', coalesce((select jsonb_agg(to_jsonb(x) order by x.last_order_at desc nulls last)
      from (select * from f order by last_order_at desc nulls last limit v_size offset (v_page - 1) * v_size) x), '[]'::jsonb))
  into res;
  return res;
end $$;

create function app.admin_get_customer(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m app.staff_members := app.require_staff('staff'); c app.customers;
begin
  select * into c from app.customers where id = (p ->> 'id')::uuid;
  if not found then perform app.fail('not_found', null, 'Cliente no encontrado.'); end if;
  return jsonb_build_object(
    'customer', to_jsonb(c),
    'addresses', (select jsonb_agg(to_jsonb(a) - 'fingerprint' order by a.last_used_at desc) from app.customer_addresses a where a.customer_id = c.id),
    'orders', (select jsonb_agg(jsonb_build_object('id', o.id, 'orderNumber', o.order_number, 'createdAt', o.created_at,
                 'status', o.status, 'paymentStatus', o.payment_status, 'paymentMethod', o.payment_method,
                 'total', o.total, 'currency', o.currency, 'isTest', o.is_test) order by o.created_at desc)
               from app.orders o where o.customer_id = c.id),
    'stats', (select jsonb_build_object(
        'orders', count(*) filter (where not is_test),
        'totalSpent', coalesce(sum(total) filter (where not is_test and payment_status = 'approved' and status not in ('cancelled', 'returned')), 0),
        'lastOrderAt', max(created_at) filter (where not is_test))
      from app.orders where customer_id = c.id)
  );
end $$;

-- -----------------------------------------------------------------------------
--  Productos, presentaciones, aromas e inventario
-- -----------------------------------------------------------------------------
create function app.admin_list_products(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m app.staff_members := app.require_staff('staff');
begin
  return jsonb_build_object(
    'products', coalesce((select jsonb_agg(to_jsonb(pr) || jsonb_build_object(
        'variants', coalesce((select jsonb_agg(to_jsonb(v) order by v.sort_order, v.presentation) from app.product_variants v where v.product_id = pr.id), '[]'::jsonb),
        'fragrance_ids', coalesce((select jsonb_agg(pf.fragrance_id order by pf.sort_order) from app.product_fragrances pf where pf.product_id = pr.id and pf.is_active), '[]'::jsonb)
      ) order by pr.sort_order, pr.name) from app.products pr), '[]'::jsonb),
    'fragrances', coalesce((select jsonb_agg(to_jsonb(f) order by f.sort_order, f.name) from app.fragrances f), '[]'::jsonb)
  );
end $$;

create function app.admin_save_product(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('admin');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_old app.products;
  v jsonb;
  v_vid uuid;
  old_v app.product_variants;
  v_price numeric(12,2);
  v_stock int;
  v_kept uuid[] := '{}';
  v_changes jsonb := '[]'::jsonb;
  i int := 0;
  f text;
begin
  if v_id is not null then
    select * into v_old from app.products where id = v_id for update;
    if not found then perform app.fail('not_found', null, 'Producto no encontrado.'); end if;
  end if;
  begin
    if v_id is null then
      insert into app.products (slug, name, short_name, category, use_label, summary, description, image_url, is_active, sort_order)
      values (lower(app.clean_text(p ->> 'slug')), app.clean_text(p ->> 'name'), app.clean_text(p ->> 'short_name'),
        app.clean_text(p ->> 'category'), app.clean_text(p ->> 'use_label'), app.clean_text(p ->> 'summary'),
        nullif(btrim(p ->> 'description'), ''), app.clean_text(p ->> 'image_url'),
        coalesce((p ->> 'is_active')::boolean, true), coalesce((p ->> 'sort_order')::int, 0))
      returning id into v_id;
    else
      update app.products set slug = lower(app.clean_text(p ->> 'slug')), name = app.clean_text(p ->> 'name'),
        short_name = app.clean_text(p ->> 'short_name'), category = app.clean_text(p ->> 'category'),
        use_label = app.clean_text(p ->> 'use_label'), summary = app.clean_text(p ->> 'summary'),
        description = nullif(btrim(p ->> 'description'), ''), image_url = app.clean_text(p ->> 'image_url'),
        is_active = coalesce((p ->> 'is_active')::boolean, true), sort_order = coalesce((p ->> 'sort_order')::int, 0)
      where id = v_id;
    end if;
  exception
    when unique_violation then perform app.fail('validation', 'slug', 'Ya existe un producto con ese identificador (slug).');
    when check_violation or not_null_violation then perform app.fail('validation', 'product', 'Revisa nombre, slug (minúsculas y guiones), categoría e imagen (https).');
  end;

  -- Aromas
  update app.product_fragrances set is_active = false where product_id = v_id;
  for f in select jsonb_array_elements_text(coalesce(p -> 'fragrance_ids', '[]'::jsonb))
  loop
    i := i + 1;
    if not exists (select 1 from app.fragrances where id = f) then perform app.fail('validation', 'fragrance_ids', 'Aroma inválido: ' || f); end if;
    insert into app.product_fragrances (product_id, fragrance_id, is_active, sort_order) values (v_id, f, true, i)
    on conflict (product_id, fragrance_id) do update set is_active = true, sort_order = i;
  end loop;

  -- Presentaciones
  i := 0;
  for v in select * from jsonb_array_elements(coalesce(p -> 'variants', '[]'::jsonb))
  loop
    i := i + 1;
    begin
      v_price := nullif(v ->> 'price', '')::numeric;
      v_stock := nullif(v ->> 'stock', '')::int;
    exception when others then
      perform app.fail('validation', 'variants', 'Precio o inventario inválido en la presentación ' || i || '.');
    end;
    if v_price < 0 or v_stock < 0 then perform app.fail('validation', 'variants', 'Precio e inventario no pueden ser negativos.'); end if;
    v_vid := nullif(v ->> 'id', '')::uuid;
    begin
      if v_vid is null then
        insert into app.product_variants (product_id, sku, presentation, price, stock, weight_kg, image_url, is_active, sort_order)
        values (v_id, upper(app.clean_text(v ->> 'sku')), app.clean_text(v ->> 'presentation'), v_price, v_stock,
          nullif(v ->> 'weight_kg', '')::numeric, app.clean_text(v ->> 'image_url'), coalesce((v ->> 'is_active')::boolean, true), i)
        returning id into v_vid;
        v_changes := v_changes || jsonb_build_object('sku', upper(v ->> 'sku'), 'nuevo', true, 'precio', v_price, 'inventario', v_stock);
      else
        select * into old_v from app.product_variants where id = v_vid and product_id = v_id for update;
        if not found then perform app.fail('validation', 'variants', 'Presentación inválida.'); end if;
        -- Sin la clave "stock" se conserva el inventario actual: así guardar la ficha no
        -- pisa unidades reservadas por pedidos entre la carga del formulario y el guardado
        -- (los ajustes de inventario van por admin_adjust_stock, con motivo).
        if not (v ? 'stock') then v_stock := old_v.stock; end if;
        update app.product_variants set sku = upper(app.clean_text(v ->> 'sku')), presentation = app.clean_text(v ->> 'presentation'),
          price = v_price, stock = v_stock, weight_kg = nullif(v ->> 'weight_kg', '')::numeric,
          image_url = app.clean_text(v ->> 'image_url'), is_active = coalesce((v ->> 'is_active')::boolean, true), sort_order = i
        where id = v_vid;
        if old_v.price is distinct from v_price or old_v.stock is distinct from v_stock or old_v.is_active is distinct from coalesce((v ->> 'is_active')::boolean, true) then
          v_changes := v_changes || jsonb_build_object('sku', old_v.sku, 'precio_antes', old_v.price, 'precio', v_price,
            'inventario_antes', old_v.stock, 'inventario', v_stock, 'activa', coalesce((v ->> 'is_active')::boolean, true));
        end if;
      end if;
    exception
      when unique_violation then perform app.fail('validation', 'variants', 'El SKU ' || upper(v ->> 'sku') || ' ya existe.');
      when check_violation or not_null_violation then perform app.fail('validation', 'variants', 'Revisa la presentación ' || i || ': SKU (mayúsculas, números y guiones), nombre e imagen (https).');
    end;
    v_kept := v_kept || v_vid;
  end loop;
  -- Las presentaciones que se quitan se desactivan (los pedidos viejos conservan su copia).
  update app.product_variants set is_active = false where product_id = v_id and not (id = any (v_kept)) and is_active;

  perform app.audit(m, case when v_old.id is null then 'product_created' else 'product_updated' end, 'products', v_id::text,
    jsonb_build_object('slug', p ->> 'slug', 'cambios', v_changes));
  return app.admin_list_products('{}'::jsonb);
end $$;

create function app.admin_adjust_stock(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('admin');
  v app.product_variants;
  v_new int;
  v_reason text := app.clean_text(p ->> 'reason');
begin
  if v_reason is null then perform app.fail('validation', 'reason', 'Escribe el motivo del ajuste.'); end if;
  select * into v from app.product_variants where id = (p ->> 'variant_id')::uuid for update;
  if not found then perform app.fail('not_found', null, 'Presentación no encontrada.'); end if;
  if p ->> 'mode' = 'untrack' then v_new := null;
  elsif p ->> 'mode' = 'set' then v_new := (p ->> 'value')::int;
  else v_new := coalesce(v.stock, 0) + (p ->> 'value')::int;
  end if;
  if v_new < 0 then perform app.fail('validation', 'value', 'El inventario no puede quedar negativo.'); end if;
  update app.product_variants set stock = v_new where id = v.id;
  perform app.audit(m, 'stock_adjusted', 'product_variants', v.id::text,
    jsonb_build_object('sku', v.sku, 'antes', v.stock, 'despues', v_new, 'motivo', v_reason));
  return app.admin_list_products('{}'::jsonb);
end $$;

create function app.admin_save_fragrance(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m app.staff_members := app.require_staff('admin');
begin
  begin
    insert into app.fragrances (id, name, sort_order)
    values (lower(app.clean_text(p ->> 'id')), app.clean_text(p ->> 'name'), coalesce((p ->> 'sort_order')::int, 0))
    on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;
  exception
    when unique_violation then perform app.fail('validation', 'name', 'Ya existe un aroma con ese nombre.');
    when check_violation or not_null_violation then perform app.fail('validation', 'id', 'Identificador: minúsculas y guiones; nombre de 2 a 60 caracteres.');
  end;
  perform app.audit(m, 'fragrance_saved', 'fragrances', p ->> 'id', p);
  return app.admin_list_products('{}'::jsonb);
end $$;

-- -----------------------------------------------------------------------------
--  Ajustes, zonas de envío, transportistas
-- -----------------------------------------------------------------------------
create function app.admin_get_settings(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m app.staff_members := app.require_staff('staff');
begin
  return jsonb_build_object(
    'settings', (select to_jsonb(s) from app.settings s where s.id = 1),
    'zones', coalesce((select jsonb_agg(to_jsonb(z) order by z.sort_order, z.name) from app.shipping_zones z), '[]'::jsonb),
    'carriers', coalesce((select jsonb_agg(to_jsonb(c) order by c.name) from app.carriers c), '[]'::jsonb),
    'departments', to_jsonb(app.hn_departments()),
    'role', m.role
  );
end $$;

create function app.admin_save_settings(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('admin');
  old app.settings;
  n app.settings;
begin
  select * into old from app.settings where id = 1 for update;
  begin
    update app.settings set
      store_enabled = coalesce((p ->> 'store_enabled')::boolean, store_enabled),
      prices_include_tax = coalesce((p ->> 'prices_include_tax')::boolean, prices_include_tax),
      card_enabled = coalesce((p ->> 'card_enabled')::boolean, card_enabled),
      transfer_enabled = coalesce((p ->> 'transfer_enabled')::boolean, transfer_enabled),
      cod_enabled = coalesce((p ->> 'cod_enabled')::boolean, cod_enabled),
      transfer_instructions = case when p ? 'transfer_instructions' then nullif(btrim(p ->> 'transfer_instructions'), '') else transfer_instructions end,
      cod_instructions = case when p ? 'cod_instructions' then nullif(btrim(p ->> 'cod_instructions'), '') else cod_instructions end,
      max_units_per_order = coalesce((p ->> 'max_units_per_order')::int, max_units_per_order),
      card_payment_ttl_minutes = coalesce((p ->> 'card_payment_ttl_minutes')::int, card_payment_ttl_minutes),
      sender_name = coalesce(app.clean_text(p ->> 'sender_name'), sender_name),
      sender_phone = case when p ? 'sender_phone' then app.clean_text(p ->> 'sender_phone') else sender_phone end,
      sender_address = case when p ? 'sender_address' then app.clean_text(p ->> 'sender_address') else sender_address end,
      sender_city = case when p ? 'sender_city' then app.clean_text(p ->> 'sender_city') else sender_city end,
      sender_department = case when p ? 'sender_department' then app.clean_text(p ->> 'sender_department') else sender_department end,
      updated_by = m.user_id
    where id = 1
    returning * into n;
  exception when check_violation or invalid_text_representation then
    perform app.fail('validation', 'settings', 'Revisa los valores: hay un dato fuera de rango.');
  end;
  if n.transfer_enabled and n.transfer_instructions is null then
    perform app.fail('validation', 'transfer_instructions', 'Para habilitar transferencias escribe los datos de la cuenta.');
  end if;
  perform app.audit(m, 'settings_updated', 'settings', '1',
    (select jsonb_object_agg(k, jsonb_build_object('antes', to_jsonb(old) -> k, 'despues', to_jsonb(n) -> k))
     from jsonb_object_keys(to_jsonb(n)) k where to_jsonb(old) -> k is distinct from to_jsonb(n) -> k and k not in ('updated_at', 'updated_by')));
  return app.admin_get_settings('{}'::jsonb);
end $$;

create function app.admin_save_zone(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('admin');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_deps text[] := coalesce(app.text_array(p -> 'departments'), '{}');
  v_country text := upper(coalesce(app.clean_text(p ->> 'country'), 'HN'));
  v_active boolean := coalesce((p ->> 'is_active')::boolean, true);
  clash text;
begin
  if v_country = 'HN' and exists (select 1 from unnest(v_deps) d where not (d = any (app.hn_departments()))) then
    perform app.fail('validation', 'departments', 'Hay un departamento que no existe.');
  end if;
  if v_active then
    select string_agg(distinct d, ', ') into clash
    from app.shipping_zones z, unnest(z.departments) d
    where z.is_active and z.country = v_country and z.id is distinct from v_id and d = any (v_deps);
    if clash is not null then perform app.fail('validation', 'departments', 'Ya están en otra zona: ' || clash || '.'); end if;
  end if;
  begin
    if v_id is null then
      insert into app.shipping_zones (name, country, departments, price, free_over, estimated_days, is_active, sort_order)
      values (app.clean_text(p ->> 'name'), v_country, v_deps, (p ->> 'price')::numeric, nullif(p ->> 'free_over', '')::numeric,
        app.clean_text(p ->> 'estimated_days'), v_active, coalesce((p ->> 'sort_order')::int, 0))
      returning id into v_id;
    else
      update app.shipping_zones set name = app.clean_text(p ->> 'name'), country = v_country, departments = v_deps,
        price = (p ->> 'price')::numeric, free_over = nullif(p ->> 'free_over', '')::numeric,
        estimated_days = app.clean_text(p ->> 'estimated_days'), is_active = v_active, sort_order = coalesce((p ->> 'sort_order')::int, 0)
      where id = v_id;
      if not found then perform app.fail('not_found', null, 'Zona no encontrada.'); end if;
    end if;
  exception
    when unique_violation then perform app.fail('validation', 'departments', 'Ya existe una zona "resto del país" activa.');
    when check_violation or not_null_violation or invalid_text_representation then
      perform app.fail('validation', 'zone', 'Revisa el nombre y el costo de envío.');
  end;
  perform app.audit(m, 'zone_saved', 'shipping_zones', v_id::text, p);
  return app.admin_get_settings('{}'::jsonb);
end $$;

create function app.admin_delete_zone(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m app.staff_members := app.require_staff('admin');
begin
  delete from app.shipping_zones where id = (p ->> 'id')::uuid;
  perform app.audit(m, 'zone_deleted', 'shipping_zones', p ->> 'id', null);
  return app.admin_get_settings('{}'::jsonb);
end $$;

create function app.admin_save_carrier(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m app.staff_members := app.require_staff('admin'); v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  begin
    if v_id is null then
      insert into app.carriers (name, phone, tracking_url, is_active)
      values (app.clean_text(p ->> 'name'), app.clean_text(p ->> 'phone'), app.clean_text(p ->> 'tracking_url'), coalesce((p ->> 'is_active')::boolean, true))
      returning id into v_id;
    else
      update app.carriers set name = app.clean_text(p ->> 'name'), phone = app.clean_text(p ->> 'phone'),
        tracking_url = app.clean_text(p ->> 'tracking_url'), is_active = coalesce((p ->> 'is_active')::boolean, true)
      where id = v_id;
    end if;
  exception
    when unique_violation then perform app.fail('validation', 'name', 'Ya existe una transportista con ese nombre.');
    when check_violation or not_null_violation then perform app.fail('validation', 'carrier', 'Revisa el nombre y el enlace de seguimiento (https, con {tracking}).');
  end;
  perform app.audit(m, 'carrier_saved', 'carriers', v_id::text, p);
  return app.admin_get_settings('{}'::jsonb);
end $$;

-- -----------------------------------------------------------------------------
--  Personal (solo owner)
-- -----------------------------------------------------------------------------
create function app.admin_list_staff(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m app.staff_members := app.require_staff('owner');
begin
  return coalesce((select jsonb_agg(to_jsonb(s) order by s.role, s.email) from app.staff_members s), '[]'::jsonb);
end $$;

create function app.admin_set_staff(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m app.staff_members := app.require_staff('owner');
  u record;
  v_role app.staff_role;
  v_active boolean := coalesce((p ->> 'is_active')::boolean, true);
begin
  begin
    v_role := (p ->> 'role')::app.staff_role;
  exception when others then
    perform app.fail('validation', 'role', 'Rol inválido.');
  end;
  select id, email into u from auth.users where lower(email) = lower(btrim(p ->> 'email'));
  if not found then
    perform app.fail('validation', 'email', 'Primero invita o crea ese usuario en Supabase (Authentication → Users).');
  end if;
  if (v_role <> 'owner' or not v_active)
     and exists (select 1 from app.staff_members where user_id = u.id and role = 'owner' and is_active)
     and (select count(*) from app.staff_members where role = 'owner' and is_active) = 1 then
    perform app.fail('validation', 'role', 'Debe quedar al menos un owner activo.');
  end if;
  insert into app.staff_members (user_id, email, full_name, role, is_active, created_by)
  values (u.id, u.email, app.clean_text(p ->> 'full_name'), v_role, v_active, m.user_id)
  on conflict (user_id) do update set role = excluded.role, is_active = excluded.is_active,
    full_name = coalesce(excluded.full_name, app.staff_members.full_name), email = excluded.email;
  perform app.audit(m, 'staff_set', 'staff_members', u.id::text, jsonb_build_object('email', u.email, 'role', v_role, 'activo', v_active));
  return app.admin_list_staff('{}'::jsonb);
end $$;

create function app.admin_audit_log(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m app.staff_members := app.require_staff('admin');
begin
  return coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc)
    from (select * from app.audit_log order by created_at desc limit 200) a), '[]'::jsonb);
end $$;

-- -----------------------------------------------------------------------------
--  Permisos: ninguna función de `app` es ejecutable por los roles de la API.
-- -----------------------------------------------------------------------------
revoke all on all functions in schema app from public, anon, authenticated;
grant execute on function app.has_staff_role(app.staff_role) to authenticated;
