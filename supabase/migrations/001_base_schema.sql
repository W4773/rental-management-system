-- 001: esquema COMPLETO de rental (estado al 2026-10-27), reconstruido desde la base en vivo al migrar
-- al proyecto nuevo (gjvdzntnywhvbtzlbwqi). Ya incluye todo lo que hacen 002-012.
-- En un proyecto vacío se ejecuta SOLO este archivo; no se combina con 002-012.
-- Después: exponer "rental" en Settings → API → Exposed schemas y crear los usuarios en Auth.
-- Copia el archivo COMPLETO en el SQL Editor de Supabase.

set check_function_bodies = off;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists rental;
grant usage on schema rental to anon, authenticated, service_role;

create table rental.activity_log (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    actor_id uuid,
    actor_email text,
    action text not null,
    entity_type text not null,
    entity_id text,
    meta jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default now() not null
);
create table rental.buildings (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    name text not null,
    address text,
    created_at timestamp with time zone default now() not null
);
create table rental.error_log (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    actor_id uuid,
    actor_email text,
    level text default 'error'::text not null,
    source text not null,
    message text not null,
    stack text,
    context jsonb default '{}'::jsonb not null,
    route text,
    app_version text,
    user_agent text,
    created_at timestamp with time zone default now() not null
);
create table rental.gas_consumption (
    id uuid default extensions.uuid_generate_v4() not null,
    user_id uuid not null,
    property_id uuid not null,
    reading_date date not null,
    current_reading numeric(10,2) not null,
    previous_reading numeric(10,2) default 0,
    consumption_volume numeric(10,2) not null,
    price_per_unit numeric(10,2) not null,
    total_cost numeric(14,2) not null,
    paid boolean default false,
    payment_date date,
    payment_notes text,
    notes text,
    created_at timestamp with time zone default now(),
    utility_type text default 'gas'::text
);
create table rental.properties (
    id uuid default extensions.uuid_generate_v4() not null,
    user_id uuid not null,
    name text not null,
    address text not null,
    bedrooms integer default 1 not null,
    bathrooms integer default 1 not null,
    monthly_rent numeric(14,2) not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    property_type text default 'apartamento'::text,
    unit_number text,
    square_meters numeric(10,2),
    notes text,
    contract_start_date date,
    deposit_amount numeric(10,2),
    annual_increase_pct numeric(14,2),
    increase_type text default 'percentage'::text,
    building_id uuid,
    increase_start_date date,
    rent_history jsonb
);
create table rental.rent_payments (
    id uuid default extensions.uuid_generate_v4() not null,
    user_id uuid not null,
    property_id uuid not null,
    tenant_id uuid not null,
    payment_month date not null,
    rent_amount numeric(14,2) not null,
    amount_paid numeric(14,2) not null,
    remaining_balance numeric(14,2) default 0,
    payment_date date not null,
    payment_method text default 'cash'::text,
    payment_type text default 'full'::text,
    payment_status text default 'paid'::text,
    reference text,
    notes text,
    created_at timestamp with time zone default now(),
    auto_generated boolean default false,
    voided boolean default false not null,
    void_reason text
);
create table rental.tenants (
    id uuid default extensions.uuid_generate_v4() not null,
    user_id uuid not null,
    property_id uuid not null,
    name text not null,
    identity_number text not null,
    phone text not null,
    email text,
    start_date date not null,
    end_date date,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    deposit_amount numeric
);
create table rental.user_settings (
    id uuid default gen_random_uuid() not null,
    user_id uuid,
    landlord_name text,
    business_name text,
    phone text,
    email text,
    signature_url text,
    invoice_footer text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);
create table rental.workspace_members (
    owner_id uuid not null,
    member_id uuid not null,
    role text default 'collaborator'::text not null,
    created_at timestamp with time zone default now() not null
);

alter table rental.activity_log add constraint activity_log_pkey PRIMARY KEY (id);
alter table rental.buildings add constraint buildings_pkey PRIMARY KEY (id);
alter table rental.error_log add constraint error_log_pkey PRIMARY KEY (id);
alter table rental.gas_consumption add constraint gas_consumption_pkey PRIMARY KEY (id);
alter table rental.properties add constraint properties_pkey PRIMARY KEY (id);
alter table rental.rent_payments add constraint rent_payments_pkey PRIMARY KEY (id);
alter table rental.tenants add constraint tenants_pkey PRIMARY KEY (id);
alter table rental.user_settings add constraint user_settings_pkey PRIMARY KEY (id);
alter table rental.user_settings add constraint user_settings_user_id_key UNIQUE (user_id);
alter table rental.workspace_members add constraint workspace_members_check CHECK ((owner_id <> member_id));
alter table rental.workspace_members add constraint workspace_members_pkey PRIMARY KEY (owner_id, member_id);
alter table rental.activity_log add constraint activity_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table rental.activity_log add constraint activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table rental.buildings add constraint buildings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table rental.error_log add constraint error_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table rental.error_log add constraint error_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table rental.gas_consumption add constraint gas_consumption_property_id_fkey FOREIGN KEY (property_id) REFERENCES rental.properties(id) ON DELETE CASCADE;
alter table rental.gas_consumption add constraint gas_consumption_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table rental.properties add constraint properties_building_id_fkey FOREIGN KEY (building_id) REFERENCES rental.buildings(id) ON DELETE SET NULL;
alter table rental.properties add constraint properties_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table rental.rent_payments add constraint rent_payments_property_id_fkey FOREIGN KEY (property_id) REFERENCES rental.properties(id) ON DELETE CASCADE;
alter table rental.rent_payments add constraint rent_payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES rental.tenants(id) ON DELETE CASCADE;
alter table rental.rent_payments add constraint rent_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table rental.tenants add constraint tenants_property_id_fkey FOREIGN KEY (property_id) REFERENCES rental.properties(id) ON DELETE CASCADE;
alter table rental.tenants add constraint tenants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table rental.user_settings add constraint user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table rental.workspace_members add constraint workspace_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table rental.workspace_members add constraint workspace_members_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX activity_log_user_created_idx ON rental.activity_log USING btree (user_id, created_at DESC);
CREATE INDEX error_log_user_created_idx ON rental.error_log USING btree (user_id, created_at DESC);
CREATE INDEX idx_gas_property_id ON rental.gas_consumption USING btree (property_id);
CREATE INDEX idx_gas_user_id ON rental.gas_consumption USING btree (user_id);
CREATE INDEX idx_payments_property_id ON rental.rent_payments USING btree (property_id);
CREATE INDEX idx_payments_tenant_id ON rental.rent_payments USING btree (tenant_id);
CREATE INDEX idx_payments_user_id ON rental.rent_payments USING btree (user_id);
CREATE INDEX idx_properties_user_id ON rental.properties USING btree (user_id);
CREATE INDEX idx_tenants_property_id ON rental.tenants USING btree (property_id);
CREATE INDEX idx_tenants_user_id ON rental.tenants USING btree (user_id);
CREATE INDEX properties_building_id_idx ON rental.properties USING btree (building_id);
CREATE INDEX workspace_members_member_idx ON rental.workspace_members USING btree (member_id);

CREATE OR REPLACE FUNCTION rental.effective_owner_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'rental', 'auth', 'public'
AS $function$
  SELECT COALESCE(
    (SELECT owner_id FROM rental.workspace_members
       WHERE member_id = auth.uid()
       ORDER BY created_at ASC
       LIMIT 1),
    auth.uid()
  )
$function$;

CREATE OR REPLACE FUNCTION rental.invite_workspace_member(p_email text, p_role text DEFAULT 'member'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'rental', 'auth', 'public'
AS $function$
declare
    v_member uuid;
begin
    if auth.uid() is null then raise exception 'No autenticado'; end if;
    if exists (select 1 from rental.workspace_members m where m.member_id = auth.uid()) then
        raise exception 'Solo el titular del workspace puede invitar miembros';
    end if;

    select u.id into v_member from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
    if v_member is null then
        raise exception 'No existe una cuenta con ese correo. Debe registrarse primero en la app.';
    end if;
    if v_member = auth.uid() then raise exception 'Ese es tu propio correo'; end if;
    if exists (select 1 from rental.workspace_members m where m.owner_id = auth.uid() and m.member_id = v_member) then
        raise exception 'Esa cuenta ya es parte del equipo';
    end if;

    insert into rental.workspace_members (owner_id, member_id, role)
    values (auth.uid(), v_member, coalesce(nullif(trim(p_role), ''), 'member'));
end $function$;

CREATE OR REPLACE FUNCTION rental.list_workspace_members()
 RETURNS TABLE(user_id uuid, email text, role text, is_owner boolean, is_me boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'rental', 'auth', 'public'
AS $function$
declare
    v_owner uuid;
begin
    if auth.uid() is null then raise exception 'No autenticado'; end if;
    v_owner := coalesce(
        (select m.owner_id from rental.workspace_members m where m.member_id = auth.uid() order by m.created_at limit 1),
        auth.uid());

    return query
        select u.id, u.email::text, 'owner'::text, true, (u.id = auth.uid()), u.created_at
          from auth.users u where u.id = v_owner
        union all
        select m.member_id, u.email::text, m.role::text, false, (m.member_id = auth.uid()), m.created_at
          from rental.workspace_members m
          join auth.users u on u.id = m.member_id
         where m.owner_id = v_owner and m.member_id <> v_owner;
end $function$;

CREATE OR REPLACE FUNCTION rental.my_workspace_owner_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'rental', 'public'
AS $function$
    select auth.uid()
    union
    select owner_id from rental.workspace_members where member_id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION rental.purge_error_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'rental', 'public'
AS $function$
begin
    delete from rental.error_log where created_at < now() - interval '7 days';
    return null;
end;
$function$;

CREATE OR REPLACE FUNCTION rental.remove_workspace_member(p_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'rental', 'auth', 'public'
AS $function$
begin
    if auth.uid() is null then raise exception 'No autenticado'; end if;
    delete from rental.workspace_members m
     where m.member_id = p_member_id
       and (m.owner_id = auth.uid() or m.member_id = auth.uid());
end $function$;

CREATE OR REPLACE FUNCTION rental.visible_owner_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'rental', 'auth', 'public'
AS $function$
  SELECT auth.uid()
  UNION
  SELECT owner_id FROM rental.workspace_members WHERE member_id = auth.uid()
$function$;

CREATE TRIGGER error_log_purge AFTER INSERT ON rental.error_log FOR EACH STATEMENT EXECUTE FUNCTION rental.purge_error_log();

alter table rental.activity_log enable row level security;
alter table rental.buildings enable row level security;
alter table rental.error_log enable row level security;
alter table rental.gas_consumption enable row level security;
alter table rental.properties enable row level security;
alter table rental.rent_payments enable row level security;
alter table rental.tenants enable row level security;
alter table rental.user_settings enable row level security;
alter table rental.workspace_members enable row level security;
create policy activity_log_insert on rental.activity_log as permissive for insert to authenticated with check (((user_id IN ( SELECT rental.my_workspace_owner_ids() AS my_workspace_owner_ids)) AND (actor_id = auth.uid())));
create policy activity_log_select on rental.activity_log as permissive for select to authenticated using ((user_id IN ( SELECT rental.my_workspace_owner_ids() AS my_workspace_owner_ids)));
create policy buildings_workspace_access on rental.buildings as permissive for all to authenticated using ((user_id IN ( SELECT rental.my_workspace_owner_ids() AS my_workspace_owner_ids))) with check ((user_id IN ( SELECT rental.my_workspace_owner_ids() AS my_workspace_owner_ids)));
create policy error_log_delete on rental.error_log as permissive for delete to authenticated using ((user_id = auth.uid()));
create policy error_log_insert on rental.error_log as permissive for insert to authenticated with check (((user_id IN ( SELECT rental.my_workspace_owner_ids() AS my_workspace_owner_ids)) AND (actor_id = auth.uid())));
create policy error_log_select on rental.error_log as permissive for select to authenticated using ((user_id IN ( SELECT rental.my_workspace_owner_ids() AS my_workspace_owner_ids)));
create policy "Workspace can delete gas" on rental.gas_consumption as permissive for delete to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can insert gas" on rental.gas_consumption as permissive for insert to public with check ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can update gas" on rental.gas_consumption as permissive for update to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids))) with check ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can view gas" on rental.gas_consumption as permissive for select to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can delete properties" on rental.properties as permissive for delete to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can insert properties" on rental.properties as permissive for insert to public with check ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can update properties" on rental.properties as permissive for update to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids))) with check ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can view properties" on rental.properties as permissive for select to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can delete payments" on rental.rent_payments as permissive for delete to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can insert payments" on rental.rent_payments as permissive for insert to public with check ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can update payments" on rental.rent_payments as permissive for update to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids))) with check ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can view payments" on rental.rent_payments as permissive for select to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can delete tenants" on rental.tenants as permissive for delete to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can insert tenants" on rental.tenants as permissive for insert to public with check ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can update tenants" on rental.tenants as permissive for update to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids))) with check ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can view tenants" on rental.tenants as permissive for select to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy "Workspace can use settings" on rental.user_settings as permissive for all to public using ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids))) with check ((user_id IN ( SELECT rental.visible_owner_ids() AS visible_owner_ids)));
create policy user_settings_workspace_access on rental.user_settings as permissive for all to authenticated using ((user_id IN ( SELECT rental.my_workspace_owner_ids() AS my_workspace_owner_ids))) with check ((user_id IN ( SELECT rental.my_workspace_owner_ids() AS my_workspace_owner_ids)));
create policy "Members can view own memberships" on rental.workspace_members as permissive for select to public using (((auth.uid() = owner_id) OR (auth.uid() = member_id)));

revoke all on all tables in schema rental from anon, authenticated, service_role;
grant DELETE on rental.buildings to authenticated;
grant DELETE on rental.error_log to authenticated;
grant DELETE on rental.gas_consumption to anon;
grant DELETE on rental.gas_consumption to authenticated;
grant DELETE on rental.properties to anon;
grant DELETE on rental.properties to authenticated;
grant DELETE on rental.rent_payments to anon;
grant DELETE on rental.rent_payments to authenticated;
grant DELETE on rental.tenants to anon;
grant DELETE on rental.tenants to authenticated;
grant DELETE on rental.user_settings to authenticated;
grant INSERT on rental.activity_log to authenticated;
grant INSERT on rental.buildings to authenticated;
grant INSERT on rental.error_log to authenticated;
grant INSERT on rental.gas_consumption to anon;
grant INSERT on rental.gas_consumption to authenticated;
grant INSERT on rental.properties to anon;
grant INSERT on rental.properties to authenticated;
grant INSERT on rental.rent_payments to anon;
grant INSERT on rental.rent_payments to authenticated;
grant INSERT on rental.tenants to anon;
grant INSERT on rental.tenants to authenticated;
grant INSERT on rental.user_settings to authenticated;
grant SELECT on rental.activity_log to authenticated;
grant SELECT on rental.buildings to authenticated;
grant SELECT on rental.error_log to authenticated;
grant SELECT on rental.gas_consumption to anon;
grant SELECT on rental.gas_consumption to authenticated;
grant SELECT on rental.properties to anon;
grant SELECT on rental.properties to authenticated;
grant SELECT on rental.rent_payments to anon;
grant SELECT on rental.rent_payments to authenticated;
grant SELECT on rental.tenants to anon;
grant SELECT on rental.tenants to authenticated;
grant SELECT on rental.user_settings to authenticated;
grant UPDATE on rental.buildings to authenticated;
grant UPDATE on rental.gas_consumption to anon;
grant UPDATE on rental.gas_consumption to authenticated;
grant UPDATE on rental.properties to anon;
grant UPDATE on rental.properties to authenticated;
grant UPDATE on rental.rent_payments to anon;
grant UPDATE on rental.rent_payments to authenticated;
grant UPDATE on rental.tenants to anon;
grant UPDATE on rental.tenants to authenticated;
grant UPDATE on rental.user_settings to authenticated;
revoke all on function rental.effective_owner_id() from public, anon, authenticated;
grant execute on function rental.effective_owner_id() to authenticated;
grant execute on function rental.effective_owner_id() to public;
revoke all on function rental.invite_workspace_member(text,text) from public, anon, authenticated;
grant execute on function rental.invite_workspace_member(text,text) to authenticated;
revoke all on function rental.list_workspace_members() from public, anon, authenticated;
grant execute on function rental.list_workspace_members() to authenticated;
revoke all on function rental.my_workspace_owner_ids() from public, anon, authenticated;
grant execute on function rental.my_workspace_owner_ids() to authenticated;
revoke all on function rental.remove_workspace_member(uuid) from public, anon, authenticated;
grant execute on function rental.remove_workspace_member(uuid) to authenticated;
revoke all on function rental.visible_owner_ids() from public, anon, authenticated;
grant execute on function rental.visible_owner_ids() to authenticated;
grant execute on function rental.visible_owner_ids() to public;


notify pgrst, 'reload schema';

-- Firma: bucket público y sus políticas
insert into storage.buckets (id, name, public) values ('signatures', 'signatures', true) on conflict (id) do nothing;
drop policy if exists auth_upload_signatures on storage.objects;
create policy auth_upload_signatures on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'signatures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists public_read_signatures on storage.objects;
create policy public_read_signatures on storage.objects as permissive for select to public using ((bucket_id = 'signatures'::text));
drop policy if exists signatures_workspace_access on storage.objects;
create policy signatures_workspace_access on storage.objects as permissive for all to authenticated using (((bucket_id = 'signatures'::text) AND ((storage.foldername(name))[1] IN ( SELECT (o.o)::text AS o
   FROM rental.my_workspace_owner_ids() o(o))))) with check (((bucket_id = 'signatures'::text) AND ((storage.foldername(name))[1] IN ( SELECT (o.o)::text AS o
   FROM rental.my_workspace_owner_ids() o(o)))));
