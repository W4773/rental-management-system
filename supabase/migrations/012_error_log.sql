-- 012_error_log.sql  ·  ESQUEMA: rental  ·  Proyecto: cfcssfwxdfgqpvyuepjo
-- Registro TEMPORAL de errores de la app (evidencia para corregir fallos con precisión).
-- Se conserva 7 días: cada inserción borra lo más antiguo. Se ve en Ajustes → Registro de errores.
-- Idempotente y sin bloques DO. Ejecutar DESPUÉS de 002 (usa rental.my_workspace_owner_ids()).

create table if not exists rental.error_log (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,   -- titular del workspace
    actor_id uuid references auth.users(id) on delete set null,          -- quién vio el error
    actor_email text,
    level text not null default 'error',   -- error | warning
    source text not null,                  -- window.onerror | unhandledrejection | react | supabase | app
    message text not null,
    stack text,
    context jsonb not null default '{}'::jsonb,   -- tabla, operación, código, campos enviados (sin secretos)
    route text,
    app_version text,
    user_agent text,
    created_at timestamptz not null default now()
);

create index if not exists error_log_user_created_idx on rental.error_log (user_id, created_at desc);

alter table rental.error_log enable row level security;

drop policy if exists error_log_select on rental.error_log;
create policy error_log_select on rental.error_log
    for select to authenticated
    using (user_id in (select rental.my_workspace_owner_ids()));

drop policy if exists error_log_insert on rental.error_log;
create policy error_log_insert on rental.error_log
    for insert to authenticated
    with check (user_id in (select rental.my_workspace_owner_ids()) and actor_id = auth.uid());

-- El titular puede vaciar el registro de su workspace.
drop policy if exists error_log_delete on rental.error_log;
create policy error_log_delete on rental.error_log
    for delete to authenticated
    using (user_id = auth.uid());

grant select, insert, delete on rental.error_log to authenticated;

-- Retención: tras cada inserción se borra lo de más de 7 días (también otras cuentas: es un log temporal global).
create or replace function rental.purge_error_log() returns trigger
language plpgsql security definer set search_path = rental, public as $$
begin
    delete from rental.error_log where created_at < now() - interval '7 days';
    return null;
end;
$$;

drop trigger if exists error_log_purge on rental.error_log;
create trigger error_log_purge after insert on rental.error_log
    for each statement execute function rental.purge_error_log();

-- Refresca la caché de la API para que reconozca la tabla nueva.
notify pgrst, 'reload schema';
