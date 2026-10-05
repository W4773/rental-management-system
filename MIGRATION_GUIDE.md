# Migraciones de Supabase (esquema `rental`)

La app usa **el esquema `rental`** del proyecto Supabase `cfcssfwxdfgqpvyuepjo` (no `public`).
El cliente ya lo declara en `src/lib/supabase.js` (`db: { schema: 'rental' }`).

Tablas existentes: `properties`, `tenants`, `rent_payments`, `gas_consumption`, `user_settings`, `workspace_members`
y la función `rental.effective_owner_id()` (a nombre de quién se guardan los datos del workspace, la usa el front).

## Antes de ejecutar nada: verificar (solo lectura)

Pega esto en el SQL Editor del proyecto y confirma que ves las tablas en `rental`:

```sql
select table_schema, table_name from information_schema.tables
where table_schema = 'rental' order by table_name;

select proname, pg_get_function_result(oid) as devuelve
from pg_proc where pronamespace = 'rental'::regnamespace and proname = 'effective_owner_id';
```

## Migraciones (cada archivo completo; orden recomendado: 002, 003, 004)

| Archivo | Qué hace |
|---|---|
| `supabase/migrations/002_buildings.sql` | Crea `rental.buildings` (nombre, dirección) con RLS del workspace y agrega `rental.properties.building_id`. Solo depende de `rental.properties` y `rental.workspace_members`. |
| `supabase/migrations/004_activity_log.sql` | Tabla `rental.activity_log` (quién hizo qué) para el "Registro de actividad" de Inicio. Ejecutar después de la 002 (usa `rental.my_workspace_owner_ids()`). Sin ella Inicio muestra solo los pagos recientes. |
| `supabase/migrations/003_workspace_team.sql` | Funciones `list/invite/remove_workspace_member` para la pestaña Equipo de Ajustes (usa `rental.workspace_members`, no la modifica). |

- Cada archivo es idempotente y no usa bloques `DO`: copia **todo** el archivo y pégalo de una vez.
- Sin esta migración la app funciona igual; solo no se podrán crear edificios (la pantalla lo avisa).
- **Equipo** (Ajustes → Equipo) usa `rental.workspace_members` (`owner_id`, `member_id`, `role`, `created_at`). Para ver qué valores de `role` ya usas: `select role, count(*) from rental.workspace_members group by 1;`.

## Variables de entorno (Vercel y `.env` local)

```
VITE_SUPABASE_URL=https://cfcssfwxdfgqpvyuepjo.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key del proyecto>
```

## Seguridad

- La app solo usa la `anon key`; nunca pongas la `service_role` en el front ni en el repo.
- `backup_*.json`, `.superpowers/` y `supabase/.temp/` están en `.gitignore`: no subas copias de datos reales.
