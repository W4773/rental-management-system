-- 002_buildings.sql  ·  ESQUEMA: rental  ·  Proyecto: cfcssfwxdfgqpvyuepjo
-- Edificios (nombre + dirección) y vínculo propiedad -> edificio.
-- Idempotente: se puede ejecutar varias veces. Sin bloques DO ni funciones (se pega entero sin problema).
--
-- Requisitos que ya existen en el proyecto: rental.properties y la función rental.effective_owner_id()
-- (la misma que usa la app para saber a nombre de quién se guardan los datos del workspace).

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
    using (user_id = rental.effective_owner_id() or user_id = auth.uid())
    with check (user_id = rental.effective_owner_id());

grant select, insert, update, delete on rental.buildings to authenticated;

alter table rental.properties
    add column if not exists building_id uuid references rental.buildings(id) on delete set null;

create index if not exists properties_building_id_idx on rental.properties (building_id);

-- Refresca la caché de la API para que reconozca la tabla y la columna nuevas.
notify pgrst, 'reload schema';
