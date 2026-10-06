# Base de datos y migraciones · Database & migrations

**Español** · [English](#english) · [← README](../README.md)

La app usa **Supabase (PostgreSQL)** con el esquema **`rental`** (el cliente lo declara en `src/lib/supabase.js`: `db: { schema: 'rental' }`). Toda tabla tiene `user_id` (el titular del *workspace*) y **Row Level Security** activo.

## Tablas

> Columnas principales, tal como las usa el código. El esquema base (tablas 1–5) existía antes de las migraciones versionadas en este repositorio.

| Tabla | Para qué | Columnas principales |
|---|---|---|
| `properties` | Propiedades | `id`, `user_id`, `name`, `address`, `monthly_rent`, `bedrooms`, `bathrooms`, `property_type`, `unit_number`, `square_meters`, `notes`, `contract_start_date`, `annual_increase_pct`, `increase_type`, **`increase_start_date`** (005), **`building_id`** (002) |
| `tenants` | Inquilinos (activo = `end_date` nulo) | `id`, `user_id`, `property_id`, `name`, `identity_number`, `phone`, `email`, `start_date`, `end_date`, **`deposit_amount`** (007) |
| `rent_payments` | Un registro por pago o marca de mes | `id`, `user_id`, `property_id`, `tenant_id`, `payment_month`, `rent_amount`, `amount_paid`, `remaining_balance`, `payment_date`, `payment_method`, `payment_type`, `payment_status`, `reference`, `notes`, `auto_generated`, **`voided`**, **`void_reason`** (006) |
| `gas_consumption` | Lecturas de gas, luz y agua | `id`, `user_id`, `property_id`, `utility_type`, `reading_date`, `previous_reading`, `current_reading`, `price_per_unit`, `consumption_volume`, `total_cost`, `paid`, `payment_date` |
| `user_settings` | Datos para los PDFs | `user_id`, `business_name`, `landlord_name`, `phone`, `email`, `invoice_footer`, `signature_url` |
| `workspace_members` | Equipo | `owner_id`, `member_id`, `role`, `created_at` |
| `buildings` (002) | Edificios | `id`, `user_id`, `name`, `address`, `created_at` |
| `activity_log` (004) | Registro de actividad | `id`, `user_id`, `actor_id`, `actor_email`, `action`, `entity_type`, `entity_id`, `meta` (jsonb), `created_at` |

## Funciones

| Función | Origen | Uso |
|---|---|---|
| `rental.effective_owner_id()` | base | A nombre de quién se guardan los datos nuevos (el titular del equipo). |
| `rental.my_workspace_owner_ids()` | 002 | Cuentas cuyos datos puede ver el usuario (la suya y la de su titular); la usan las políticas RLS nuevas. |
| `rental.list_workspace_members()` · `invite_workspace_member(email, role)` · `remove_workspace_member(id)` | 003 | Pestaña **Equipo**. Buscan correos en `auth.users` (por eso son `SECURITY DEFINER`). |

## Migraciones

Ejecuta **cada archivo completo** en el *SQL Editor* de Supabase, del proyecto correcto, **en este orden**. Todas son idempotentes (se pueden repetir) y ninguna usa bloques `DO`.

| # | Archivo | Qué hace | Sin ella |
|---|---|---|---|
| 002 | [`002_buildings.sql`](../supabase/migrations/002_buildings.sql) | Tabla `buildings`, función `my_workspace_owner_ids`, columna `properties.building_id`. | No se pueden crear edificios (la pantalla avisa). |
| 003 | [`003_workspace_team.sql`](../supabase/migrations/003_workspace_team.sql) | Funciones de la pestaña Equipo. | La pestaña Equipo avisa que falta. |
| 004 | [`004_activity_log.sql`](../supabase/migrations/004_activity_log.sql) | Tabla `activity_log` (solo lectura/inserción). Requiere 002. | Inicio muestra solo los pagos recientes. |
| 005 | [`005_increase_start_date.sql`](../supabase/migrations/005_increase_start_date.sql) | `properties.increase_start_date` (fecha del primer aumento). | Guardar una propiedad con esa fecha falla y lo avisa. |
| 006 | [`006_payment_void.sql`](../supabase/migrations/006_payment_void.sql) | `rent_payments.voided` y `void_reason` (meses nulos). | Marcar meses como nulos avisa; "pendiente" funciona. |
| 007 | [`007_tenant_deposit.sql`](../supabase/migrations/007_tenant_deposit.sql) | `tenants.deposit_amount` (el depósito pasa al inquilino; copia el que tuviera la propiedad). | Guardar un inquilino con depósito avisa; lo demás funciona. |

### Verificación (solo lectura)

```sql
select table_schema, table_name from information_schema.tables
where table_schema = 'rental' order by table_name;

select proname from pg_proc
where pronamespace = 'rental'::regnamespace order by proname;
```

## Seguridad

- RLS activo en todas las tablas; el acceso se decide por `user_id` ∈ `rental.my_workspace_owner_ids()`.
- `activity_log` no tiene políticas de `UPDATE` ni `DELETE`: el historial no se puede alterar desde la app.
- El front usa solo la `anon key`. Nunca subas la `service_role` ni respaldos con datos reales al repositorio.

---

<a id="english"></a>

# Database & migrations (English)

[Español](#base-de-datos-y-migraciones--database--migrations) · [← README](../README.en.md)

The app uses **Supabase (PostgreSQL)** with the **`rental`** schema (declared in `src/lib/supabase.js`: `db: { schema: 'rental' }`). Every table has `user_id` (the workspace owner) and **Row Level Security** enabled.

## Tables

> Main columns as used by the code. The base schema (the first five tables) existed before the migrations versioned in this repository. See the Spanish section above for the column lists.

| Table | Purpose |
|---|---|
| `properties` | Properties (+ `increase_start_date` from 005, `building_id` from 002) |
| `tenants` | Tenants (active = `end_date` is null; + `deposit_amount` from 007) |
| `rent_payments` | One row per payment or month mark (+ `voided`, `void_reason` from 006) |
| `gas_consumption` | Gas, electricity and water readings |
| `user_settings` | Data used in PDFs (business name, contact, footer, signature) |
| `workspace_members` | Team: `owner_id`, `member_id`, `role`, `created_at` |
| `buildings` (002) | Buildings |
| `activity_log` (004) | Activity log |

## Functions

| Function | Origin | Use |
|---|---|---|
| `rental.effective_owner_id()` | base | On whose behalf new data is stored (the team owner). |
| `rental.my_workspace_owner_ids()` | 002 | Accounts whose data the user can see (own + owner's); used by the new RLS policies. |
| `rental.list_workspace_members()` · `invite_workspace_member(email, role)` · `remove_workspace_member(id)` | 003 | **Team** tab. They look up emails in `auth.users` (hence `SECURITY DEFINER`). |

## Migrations

Run **each file in full** in the Supabase *SQL Editor* of the right project, **in this order**. All are idempotent and none uses `DO` blocks.

| # | File | What it does | Without it |
|---|---|---|---|
| 002 | `002_buildings.sql` | `buildings` table, `my_workspace_owner_ids`, `properties.building_id`. | Buildings can't be created (the screen says so). |
| 003 | `003_workspace_team.sql` | Team tab functions. | The Team tab says it is missing. |
| 004 | `004_activity_log.sql` | `activity_log` table (read/insert only). Requires 002. | Home shows only recent payments. |
| 005 | `005_increase_start_date.sql` | `properties.increase_start_date`. | Saving a property with that date fails and says why. |
| 006 | `006_payment_void.sql` | `rent_payments.voided` / `void_reason` (void months). | Marking void months warns; "pending" still works. |
| 007 | `007_tenant_deposit.sql` | `tenants.deposit_amount` (the deposit moves to the tenant; copies the one stored on the property). | Saving a tenant with a deposit warns; everything else works. |

## Security

- RLS on every table; access is decided by `user_id` ∈ `rental.my_workspace_owner_ids()`.
- `activity_log` has no `UPDATE` or `DELETE` policies: history cannot be altered from the app.
- The front end only uses the `anon key`. Never commit the `service_role` key or backups with real data.
