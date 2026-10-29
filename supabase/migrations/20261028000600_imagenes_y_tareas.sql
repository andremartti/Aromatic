-- =============================================================================
--  AROMATIC · Imágenes de productos (Storage) y tareas programadas
-- =============================================================================
--  Ambas partes dependen de servicios de Supabase. Si no existen (por ejemplo,
--  en una base de pruebas local), se omiten sin fallar.
-- =============================================================================

-- Bucket público de lectura para las fotos de productos. Solo el personal con
-- rol admin u owner puede subir, cambiar o borrar archivos.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
    on conflict (id) do nothing;

    execute $p$create policy "product_images_admin_insert" on storage.objects for insert to authenticated
      with check (bucket_id = 'product-images' and app.has_staff_role('admin'))$p$;
    execute $p$create policy "product_images_admin_update" on storage.objects for update to authenticated
      using (bucket_id = 'product-images' and app.has_staff_role('admin'))$p$;
    execute $p$create policy "product_images_admin_delete" on storage.objects for delete to authenticated
      using (bucket_id = 'product-images' and app.has_staff_role('admin'))$p$;
  end if;
end $$;

-- Cada 10 minutos: cancelar pedidos con tarjeta no pagados a tiempo (libera
-- inventario). Requiere la extensión pg_cron (Database → Extensions).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('aromatic-expire-orders', '*/10 * * * *', 'select app.expire_stale_orders()');
  end if;
exception when others then
  raise notice 'pg_cron no disponible: la expiración se ejecutará desde las funciones de servidor (%).', sqlerrm;
end $$;
