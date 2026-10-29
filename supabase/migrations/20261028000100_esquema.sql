-- =============================================================================
--  AROMATIC · Tienda en línea · Esquema base
-- =============================================================================
--  Todas las tablas viven en el esquema `app`, que la API automática de Supabase
--  (PostgREST) NO expone. El navegador nunca habla con estas tablas: solo las
--  funciones de servidor (supabase/functions) y las funciones SQL de este
--  proyecto. Así los precios, el inventario y los estados se deciden siempre en
--  el servidor.
--
--  Dinero: numeric(12,2), en la moneda de la tienda (HNL por defecto).
--  Teléfonos: formato E.164 (+504XXXXXXXX).
-- =============================================================================

create schema if not exists app;
revoke all on schema app from public;
comment on schema app is 'Tienda AROMATIC: datos privados. No exponer en la API pública.';

-- -----------------------------------------------------------------------------
--  Tipos
-- -----------------------------------------------------------------------------
create type app.staff_role as enum ('owner', 'admin', 'staff');
comment on type app.staff_role is
  'owner: todo, incluido el personal · admin: productos, precios y ajustes · staff: pedidos, clientes y envíos';

create type app.order_status as enum (
  'pending',        -- recibido, esperando pago o confirmación
  'confirmed',      -- pago confirmado (o contra entrega aceptado): listo para preparar
  'preparing',      -- en preparación
  'ready_to_ship',  -- empacado, esperando a la transportista
  'shipped',        -- entregado a la transportista
  'delivered',      -- entregado al cliente
  'cancelled',
  'returned'
);

create type app.payment_status as enum (
  'pending',                -- sin pago todavía
  'awaiting_verification',  -- el cliente reportó una transferencia: falta verificarla
  'approved',               -- pago confirmado (por la pasarela o verificado por el personal)
  'declined',               -- rechazado
  'cancelled',              -- cancelado o vencido
  'refunded'                -- reembolsado
);

create type app.payment_method as enum ('card', 'bank_transfer', 'cash_on_delivery');

-- -----------------------------------------------------------------------------
--  Personal (usuarios de Supabase Auth con acceso al panel)
-- -----------------------------------------------------------------------------
create table app.staff_members (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        app.staff_role not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid
);

-- -----------------------------------------------------------------------------
--  Ajustes de la tienda (una sola fila)
-- -----------------------------------------------------------------------------
create table app.settings (
  id                        smallint primary key default 1 check (id = 1),
  store_enabled             boolean not null default false,
  currency                  char(3) not null default 'HNL' check (currency ~ '^[A-Z]{3}$'),
  prices_include_tax        boolean not null default true,
  card_enabled              boolean not null default false,
  transfer_enabled          boolean not null default false,
  cod_enabled               boolean not null default false,
  -- Texto que ve el cliente al elegir transferencia (banco, cuenta, titular).
  -- Lo escribe el negocio; vacío = la transferencia no se puede habilitar.
  transfer_instructions     text check (char_length(transfer_instructions) <= 2000),
  cod_instructions          text check (char_length(cod_instructions) <= 1000),
  allowed_countries         text[] not null default '{HN}',
  max_units_per_order       int not null default 30 check (max_units_per_order between 1 and 500),
  card_payment_ttl_minutes  int not null default 60 check (card_payment_ttl_minutes between 15 and 1440),
  order_prefix              text not null default 'AR' check (order_prefix ~ '^[A-Z]{1,4}$'),
  -- Remitente de las guías de envío (vacío hasta que el negocio lo complete).
  sender_name               text not null default 'AROMATIC' check (char_length(sender_name) between 1 and 80),
  sender_phone              text check (char_length(sender_phone) <= 40),
  sender_address            text check (char_length(sender_address) <= 300),
  sender_city               text check (char_length(sender_city) <= 80),
  sender_department         text check (char_length(sender_department) <= 80),
  sender_country            text not null default 'Honduras',
  updated_at                timestamptz not null default now(),
  updated_by                uuid
);
insert into app.settings default values;

-- -----------------------------------------------------------------------------
--  Catálogo
-- -----------------------------------------------------------------------------
create table app.products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name         text not null check (char_length(name) between 2 and 120),
  short_name   text not null check (char_length(short_name) between 2 and 80),
  category     text not null check (char_length(category) between 2 and 80),
  use_label    text check (char_length(use_label) <= 80),
  summary      text check (char_length(summary) <= 400),
  description  text check (char_length(description) <= 4000),
  image_url    text check (image_url is null or image_url ~ '^https://'),
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table app.fragrances (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null unique check (char_length(name) between 2 and 60),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table app.product_fragrances (
  product_id    uuid not null references app.products (id) on delete cascade,
  fragrance_id  text not null references app.fragrances (id) on delete restrict,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  primary key (product_id, fragrance_id)
);

-- Presentación = variante vendible con SKU, precio e inventario propios.
create table app.product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references app.products (id) on delete cascade,
  sku           text not null unique check (sku ~ '^[A-Z0-9][A-Z0-9-]{1,23}$'),
  presentation  text not null check (char_length(presentation) between 1 and 60),
  -- NULL = precio por definir: la presentación no se puede comprar en línea.
  price         numeric(12,2) check (price >= 0),
  -- NULL = inventario no controlado. Un número = unidades disponibles.
  stock         int check (stock >= 0),
  weight_kg     numeric(8,3) check (weight_kg > 0),
  image_url     text check (image_url is null or image_url ~ '^https://'),
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index product_variants_product_idx on app.product_variants (product_id);

-- -----------------------------------------------------------------------------
--  Envíos: zonas (costo por departamento) y transportistas
-- -----------------------------------------------------------------------------
create table app.shipping_zones (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 2 and 80),
  country         text not null default 'HN' check (country ~ '^[A-Z]{2}$'),
  -- Departamentos cubiertos. Vacío = "resto del país" (zona por defecto).
  departments     text[] not null default '{}',
  price           numeric(12,2) not null check (price >= 0),
  free_over       numeric(12,2) check (free_over >= 0),
  estimated_days  text check (char_length(estimated_days) <= 60),
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index shipping_zones_one_default
  on app.shipping_zones (country) where (departments = '{}' and is_active);

create table app.carriers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique check (char_length(name) between 2 and 80),
  phone         text check (char_length(phone) <= 40),
  -- Plantilla de seguimiento con {tracking}, p. ej. https://transportista.hn/rastreo?g={tracking}
  tracking_url  text check (tracking_url is null or tracking_url ~ '^https://'),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
--  Clientes y direcciones
-- -----------------------------------------------------------------------------
create table app.customers (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null check (char_length(full_name) between 2 and 120),
  phone          text not null unique check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  email          text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_order_at  timestamptz
);
create index customers_email_idx on app.customers (lower(email));
create index customers_name_idx on app.customers (lower(full_name));

create table app.customer_addresses (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references app.customers (id) on delete cascade,
  recipient_name   text not null,
  recipient_phone  text not null,
  alt_phone        text,
  country          text not null,
  department       text not null,
  city             text not null,
  neighborhood     text not null,
  address_line     text not null,
  reference        text,
  fingerprint      text not null,
  created_at       timestamptz not null default now(),
  last_used_at     timestamptz not null default now(),
  unique (customer_id, fingerprint)
);

-- -----------------------------------------------------------------------------
--  Pedidos
-- -----------------------------------------------------------------------------
create sequence app.order_number_seq;
create sequence app.test_order_number_seq;
create sequence app.guide_number_seq;

create table app.orders (
  id                     uuid primary key default gen_random_uuid(),
  order_number           text not null unique,
  customer_id            uuid not null references app.customers (id) on delete restrict,
  address_id             uuid references app.customer_addresses (id) on delete set null,
  status                 app.order_status not null default 'pending',
  payment_method         app.payment_method not null,
  payment_status         app.payment_status not null default 'pending',
  currency               char(3) not null,
  subtotal               numeric(12,2) not null check (subtotal >= 0),
  discount               numeric(12,2) not null default 0 check (discount >= 0),
  shipping_cost          numeric(12,2) not null check (shipping_cost >= 0),
  total                  numeric(12,2) not null check (total >= 0),
  item_count             int not null check (item_count > 0),
  -- Copia de los datos del cliente y del envío al momento de comprar:
  -- no cambian aunque después se edite el cliente o su dirección.
  customer_name          text not null,
  customer_email         text,
  customer_phone         text not null,
  ship_recipient_name    text not null,
  ship_phone             text not null,
  ship_alt_phone         text,
  ship_country           text not null,
  ship_department        text not null,
  ship_city              text not null,
  ship_neighborhood      text not null,
  ship_address           text not null,
  ship_reference         text,
  delivery_instructions  text,
  shipping_zone_name     text,
  shipping_estimate      text,
  idempotency_key        text not null unique check (char_length(idempotency_key) between 16 and 100),
  is_test                boolean not null default false,
  stock_reserved         boolean not null default false,
  needs_review           boolean not null default false,
  review_reason          text,
  internal_notes         text check (char_length(internal_notes) <= 4000),
  ip_hash                text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  confirmed_at           timestamptz,
  paid_at                timestamptz,
  shipped_at             timestamptz,
  delivered_at           timestamptz,
  cancelled_at           timestamptz,
  constraint orders_total_ok check (total = subtotal - discount + shipping_cost)
);
create index orders_created_idx on app.orders (created_at desc);
create index orders_status_idx on app.orders (status);
create index orders_payment_status_idx on app.orders (payment_status);
create index orders_customer_idx on app.orders (customer_id);
create index orders_city_idx on app.orders (lower(ship_city));
create index orders_phone_idx on app.orders (customer_phone);
create index orders_paid_idx on app.orders (paid_at) where payment_status = 'approved';

create table app.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references app.orders (id) on delete cascade,
  product_id    uuid references app.products (id) on delete set null,
  variant_id    uuid references app.product_variants (id) on delete set null,
  -- Copia del producto y del precio al comprar.
  sku           text not null,
  product_name  text not null,
  presentation  text not null,
  fragrance     text,
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  quantity      int not null check (quantity between 1 and 500),
  line_total    numeric(12,2) not null,
  constraint order_items_line_ok check (line_total = unit_price * quantity)
);
create index order_items_order_idx on app.order_items (order_id);
create index order_items_variant_idx on app.order_items (variant_id);

-- -----------------------------------------------------------------------------
--  Pagos (intentos) y eventos de la pasarela
-- -----------------------------------------------------------------------------
create table app.payments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references app.orders (id) on delete cascade,
  method               app.payment_method not null,
  provider             text not null check (provider in ('pixelpay', 'simulated', 'manual')),
  status               app.payment_status not null default 'pending',
  amount               numeric(12,2) not null check (amount >= 0),
  currency             char(3) not null,
  attempt              int not null default 1 check (attempt between 1 and 20),
  provider_order_ref   text,   -- referencia enviada a la pasarela (p. ej. AR-000123-1)
  provider_payment_id  text,   -- identificador de la pasarela (payment_uuid en PixelPay)
  provider_reference   text,   -- código de autorización / referencia bancaria
  response_code        text,
  response_message     text,
  is_test              boolean not null default false,
  -- Respuesta de la pasarela ya depurada (nunca contiene número de tarjeta ni CVV).
  raw                  jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  approved_at          timestamptz,
  unique (provider, provider_payment_id),
  unique (provider, provider_order_ref)
);
create index payments_order_idx on app.payments (order_id);

create table app.payment_events (
  id           bigint generated always as identity primary key,
  provider     text not null,
  event_key    text not null,
  kind         text not null check (kind in ('webhook', 'confirm', 'reconcile', 'admin')),
  order_id     uuid references app.orders (id) on delete set null,
  payment_id   uuid references app.payments (id) on delete set null,
  payload      jsonb,
  outcome      text,
  received_at  timestamptz not null default now(),
  unique (provider, event_key)
);

-- -----------------------------------------------------------------------------
--  Envíos y guías
-- -----------------------------------------------------------------------------
create table app.shipments (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null unique references app.orders (id) on delete cascade,
  guide_number      text unique,
  carrier_id        uuid references app.carriers (id) on delete set null,
  carrier_name      text,
  tracking_number   text check (char_length(tracking_number) <= 80),
  packages          int not null default 1 check (packages between 1 and 50),
  weight_kg         numeric(8,2) check (weight_kg > 0),
  declared_value    numeric(12,2) check (declared_value >= 0),
  contents          text check (char_length(contents) <= 300),
  handling_notes    text check (char_length(handling_notes) <= 300),
  print_count       int not null default 0,
  first_printed_at  timestamptz,
  last_printed_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid
);
create index shipments_tracking_idx on app.shipments (lower(tracking_number));

-- -----------------------------------------------------------------------------
--  Historial y auditoría
-- -----------------------------------------------------------------------------
create table app.order_events (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references app.orders (id) on delete cascade,
  kind         text not null check (kind in ('created', 'status', 'payment', 'shipment', 'guide', 'note', 'review')),
  from_value   text,
  to_value     text,
  note         text,
  actor_id     uuid,          -- usuario del personal (auth.users), si aplica
  actor_label  text not null, -- 'Cliente', 'Sistema', 'PixelPay' o el correo del personal
  created_at   timestamptz not null default now()
);
create index order_events_order_idx on app.order_events (order_id, created_at);

create table app.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  actor_label  text not null,
  action       text not null,
  entity       text not null,
  entity_id    text,
  details      jsonb,
  created_at   timestamptz not null default now()
);
create index audit_log_created_idx on app.audit_log (created_at desc);

-- Límite de solicitudes por ventana fija (claves = hash de IP + ruta).
create table app.rate_limits (
  bucket        text not null,
  window_start  timestamptz not null,
  hits          int not null default 0,
  primary key (bucket, window_start)
);

-- -----------------------------------------------------------------------------
--  updated_at automático
-- -----------------------------------------------------------------------------
create function app.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['settings', 'products', 'product_variants', 'shipping_zones', 'customers', 'orders', 'payments', 'shipments']
  loop
    execute format('create trigger %I_touch before update on app.%I for each row execute function app.touch_updated_at()', t, t);
  end loop;
end $$;
