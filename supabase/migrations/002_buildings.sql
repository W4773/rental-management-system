-- 002_buildings.sql  ·  ESQUEMA: rental  ·  Proyecto: cfcssfwxdfgqpvyuepjo
-- Edificios (nombre + dirección) y vínculo propiedad -> edificio.
-- Idempotente: se puede ejecutar varias veces. Sin bloques DO (se pega entero sin problema).
--
-- Requisitos que ya existen en el proyecto: la tabla rental.properties y rental.workspace_members
-- (columnas owner_id, member_id, role, created_at).

-- Cuentas cuyos datos puede ver/escribir el usuario actual: la suya y las de los workspaces donde es miembro.
create or replace function rental.my_workspace_owner_ids()
returns setof uuid
language sql stable security definer
set search_path = rental, public
as $$
    select auth.uid()
    union
    select owner_id from rental.workspace_members where member_id = auth.uid()
$$;

revoke all on function rental.my_workspace_owner_ids() from public, anon;
grant execute on function rental.my_workspace_owner_ids() to authenticated;

create table if not exists rental.buildings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    address text,
    created_at timestamptz not null default now()
);

alter table rental.buildings enable row level security;

drop policy if exists buildings_workspace_access on rental.buildings;
create policy buildings_workspace_access on rental.buildings
    for all to authenticated
    using (user_id in (select rental.my_workspace_owner_ids()))
    with check (user_id in (select rental.my_workspace_owner_ids()));

grant select, insert, update, delete on rental.buildings to authenticated;

alter table rental.properties
    add column if not exists building_id uuid references rental.buildings(id) on delete set null;

create index if not exists properties_building_id_idx on rental.properties (building_id);

-- Refresca la caché de la API para que reconozca la tabla y la columna nuevas.
notify pgrst, 'reload schema';
