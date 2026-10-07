-- 009: los ajustes de documentos se comparten entre los integrantes del equipo.
-- rental.user_settings guarda UNA fila por titular (nombre del arrendador, teléfono, correo, pie, firma,
-- plantilla de la carta). Esta migración permite que los miembros del equipo la lean y la editen, y que
-- suban la firma a la carpeta del titular, para que todos impriman los mismos datos.
-- No borra datos. Es seguro ejecutarlo más de una vez. Requiere 002 (my_workspace_owner_ids).
-- Copia el archivo COMPLETO en el SQL Editor de Supabase.

drop policy if exists user_settings_workspace_access on rental.user_settings;
create policy user_settings_workspace_access on rental.user_settings
    for all to authenticated
    using (user_id in (select rental.my_workspace_owner_ids()))
    with check (user_id in (select rental.my_workspace_owner_ids()));

-- Firma: los miembros pueden subir y reemplazar la firma dentro de la carpeta del titular.
drop policy if exists signatures_workspace_access on storage.objects;
create policy signatures_workspace_access on storage.objects
    for all to authenticated
    using (bucket_id = 'signatures' and (storage.foldername(name))[1] in (select o::text from rental.my_workspace_owner_ids() as o))
    with check (bucket_id = 'signatures' and (storage.foldername(name))[1] in (select o::text from rental.my_workspace_owner_ids() as o));

notify pgrst, 'reload schema';
