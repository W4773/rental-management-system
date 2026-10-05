-- 003_workspace_team.sql  ·  ESQUEMA: rental  ·  Proyecto: cfcssfwxdfgqpvyuepjo
-- Sección "Equipo": listar, invitar (por correo) y quitar miembros de rental.workspace_members
-- (owner_id, member_id, role, created_at). No modifica la tabla ni sus políticas.
-- Las funciones son SECURITY DEFINER porque necesitan buscar correos en auth.users, que el front no puede leer.
-- Idempotente. Ejecutar DESPUÉS de 002.

-- Lista del equipo del usuario actual: el titular y sus miembros.
create or replace function rental.list_workspace_members()
returns table (user_id uuid, email text, role text, is_owner boolean, is_me boolean, created_at timestamptz)
language plpgsql stable security definer
set search_path = rental, auth, public
as $$
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
end $$;

-- Invita a una cuenta existente (por correo). Solo el titular puede invitar.
create or replace function rental.invite_workspace_member(p_email text, p_role text default 'member')
returns void
language plpgsql security definer
set search_path = rental, auth, public
as $$
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
end $$;

-- El titular quita a un miembro, o un miembro se quita a sí mismo (salir del equipo).
create or replace function rental.remove_workspace_member(p_member_id uuid)
returns void
language plpgsql security definer
set search_path = rental, auth, public
as $$
begin
    if auth.uid() is null then raise exception 'No autenticado'; end if;
    delete from rental.workspace_members m
     where m.member_id = p_member_id
       and (m.owner_id = auth.uid() or m.member_id = auth.uid());
end $$;

revoke all on function rental.list_workspace_members() from public, anon;
revoke all on function rental.invite_workspace_member(text, text) from public, anon;
revoke all on function rental.remove_workspace_member(uuid) from public, anon;
grant execute on function rental.list_workspace_members() to authenticated;
grant execute on function rental.invite_workspace_member(text, text) to authenticated;
grant execute on function rental.remove_workspace_member(uuid) to authenticated;

notify pgrst, 'reload schema';
