-- =============================================================================
--  AROMATIC · Seguridad: RLS, permisos mínimos y roles del personal
-- =============================================================================
--  Modelo:
--  · Los roles de la API (anon, authenticated) no tienen ningún permiso sobre
--    las tablas de `app`. RLS está activado en todas, sin políticas para esos
--    roles: si algún día se expusiera el esquema por error, la respuesta sería
--    vacía (denegar por defecto).
--  · Las funciones de servidor se conectan como el dueño de las tablas y llaman
--    a funciones SQL que validan todo. Las del panel (`app.admin_*`) exigen un
--    usuario del personal con el rol adecuado, tomado del JWT verificado
--    (`auth.uid()`), y registran quién hizo cada cambio.
-- =============================================================================

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'app'
  loop
    execute format('alter table app.%I enable row level security', t.tablename);
    execute format('alter table app.%I force row level security', t.tablename);
    execute format('revoke all on app.%I from public, anon, authenticated', t.tablename);
  end loop;
end $$;

-- El dueño de las tablas (postgres) opera desde las funciones de servidor.
-- FORCE RLS también lo alcanzaría, así que se le da una política explícita.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'app'
  loop
    execute format(
      'create policy server_full_access on app.%I as permissive for all to postgres using (true) with check (true)',
      t.tablename
    );
  end loop;
end $$;

revoke all on all sequences in schema app from public, anon, authenticated;

-- -----------------------------------------------------------------------------
--  Rol del usuario actual (según el JWT verificado por la función de servidor)
-- -----------------------------------------------------------------------------
create function app.has_staff_role(p_min app.staff_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from app.staff_members s
    where s.user_id = auth.uid()
      and s.is_active
      and case p_min
            when 'staff' then true
            when 'admin' then s.role in ('owner', 'admin')
            when 'owner' then s.role = 'owner'
          end
  );
$$;

-- Devuelve el miembro del personal o detiene la operación (42501 = sin permiso).
create function app.require_staff(p_min app.staff_role) returns app.staff_members
language plpgsql stable security definer set search_path = '' as $$
declare m app.staff_members;
begin
  select * into m from app.staff_members s where s.user_id = auth.uid() and s.is_active;
  if not found then
    raise exception using errcode = '42501', message = 'forbidden', hint = 'Tu usuario no tiene acceso al panel.';
  end if;
  if (p_min = 'admin' and m.role not in ('owner', 'admin')) or (p_min = 'owner' and m.role <> 'owner') then
    raise exception using errcode = '42501', message = 'forbidden', hint = 'Tu rol no permite esta acción.';
  end if;
  return m;
end $$;

-- Las políticas de Storage (imágenes de productos) se evalúan como `authenticated`.
grant usage on schema app to authenticated;
revoke all on all functions in schema app from public, anon, authenticated;
grant execute on function app.has_staff_role(app.staff_role) to authenticated;

-- Postgres concede EXECUTE a PUBLIC en cada función nueva y eso no se puede
-- quitar por esquema. Por eso cada migración que crea funciones en `app`
-- termina con el bloque "Permisos" (revocar todo y volver a conceder solo
-- has_staff_role a authenticated). Las pruebas lo verifican.

-- -----------------------------------------------------------------------------
--  Primer dueño (owner)
-- -----------------------------------------------------------------------------
--  Uso (una sola vez, en el SQL Editor de Supabase, después de crear el usuario
--  en Authentication → Users):
--      select app.bootstrap_owner('correo@dominio.com');
--  Solo funciona mientras no exista ningún owner. Después, el owner administra
--  al resto del personal desde el panel.
create function app.bootstrap_owner(p_email text) returns text
language plpgsql security definer set search_path = '' as $$
declare u record;
begin
  if exists (select 1 from app.staff_members where role = 'owner') then
    raise exception 'Ya existe un owner. Administra el personal desde el panel.';
  end if;
  select id, email into u from auth.users where lower(email) = lower(btrim(p_email));
  if not found then
    raise exception 'No existe un usuario con ese correo en Authentication → Users.';
  end if;
  insert into app.staff_members (user_id, email, role) values (u.id, u.email, 'owner');
  insert into app.audit_log (actor_label, action, entity, entity_id)
    values ('SQL Editor', 'bootstrap_owner', 'staff_members', u.id::text);
  return 'Owner creado: ' || u.email;
end $$;
revoke all on function app.bootstrap_owner(text) from public, anon, authenticated;
