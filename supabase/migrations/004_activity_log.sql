-- 004_activity_log.sql  ·  ESQUEMA: rental  ·  Proyecto: cfcssfwxdfgqpvyuepjo
-- Registro de actividad: quién hizo qué (pagos, propiedades, inquilinos, edificios, servicios, equipo).
-- Se muestra en Inicio. Idempotente y sin bloques DO. Ejecutar DESPUÉS de 002 (usa rental.my_workspace_owner_ids()).
-- El log es de solo escritura/lectura: no hay políticas de UPDATE ni DELETE (no se puede alterar el historial).

create table if not exists rental.activity_log (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,   -- titular del workspace
    actor_id uuid references auth.users(id) on delete set null,          -- quién ejecutó la acción
    actor_email text,
    action text not null,          -- p. ej. payment.create, property.update, tenant.unassign
    entity_type text not null,     -- payment | property | tenant | building | utility | team | document
    entity_id text,
    meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists activity_log_user_created_idx on rental.activity_log (user_id, created_at desc);

alter table rental.activity_log enable row level security;

drop policy if exists activity_log_select on rental.activity_log;
create policy activity_log_select on rental.activity_log
    for select to authenticated
    using (user_id in (select rental.my_workspace_owner_ids()));

drop policy if exists activity_log_insert on rental.activity_log;
create policy activity_log_insert on rental.activity_log
    for insert to authenticated
    with check (user_id in (select rental.my_workspace_owner_ids()) and actor_id = auth.uid());

grant select, insert on rental.activity_log to authenticated;

-- Refresca la caché de la API para que reconozca la tabla nueva.
notify pgrst, 'reload schema';
