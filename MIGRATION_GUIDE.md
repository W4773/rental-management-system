# Migraciones de Supabase (esquema `rental`)

La app usa **el esquema `rental`** del proyecto Supabase `cfcssfwxdfgqpvyuepjo` (no `public`).
El cliente ya lo declara en `src/lib/supabase.js` (`db: { schema: 'rental' }`).

Tablas existentes: `properties`, `tenants`, `rent_payments`, `gas_consumption`, `user_settings`, `workspace_members`
y la función `rental.effective_owner_id()` (a nombre de quién se guardan los datos del workspace).

## Antes de ejecutar nada: verificar (solo lectura)

Pega esto en el SQL Editor del proyecto y confirma que ves las tablas en `rental`:

```sql
select table_schema, table_name from information_schema.tables
where table_schema = 'rental' order by table_name;

select proname, pg_get_function_result(oid) as devuelve
from pg_proc where pronamespace = 'rental'::regnamespace and proname = 'effective_owner_id';
```

## Migraciones (en orden, cada archivo completo)

| Archivo | Qué hace |
|---|---|
| `supabase/migrations/002_buildings.sql` | Crea `rental.buildings` (nombre, dirección) con RLS del workspace y agrega `rental.properties.building_id`. |

- Cada archivo es idempotente y no usa bloques `DO`: copia **todo** el archivo y pégalo de una vez.
- Sin esta migración la app funciona igual; solo no se podrán crear edificios (la pantalla lo avisa).
- La sección **Equipo** usa `rental.workspace_members`, que ya existe: no hay migración de equipo.

## Variables de entorno (Vercel y `.env` local)

```
VITE_SUPABASE_URL=https://cfcssfwxdfgqpvyuepjo.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key del proyecto>
```

## Seguridad

- La app solo usa la `anon key`; nunca pongas la `service_role` en el front ni en el repo.
- `backup_*.json`, `.superpowers/` y `supabase/.temp/` están en `.gitignore`: no subas copias de datos reales.
