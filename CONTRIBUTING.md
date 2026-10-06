# Contribuir · Contributing

**Español** · [English](#english)

Alquiler Pro es software propietario de Optimard: las contribuciones son por invitación. Si trabajas en el proyecto:

1. Crea una rama desde `main` (`feat/…`, `fix/…`, `docs/…`).
2. Instala y ejecuta: `npm install` · `npm run dev`. Antes de abrir el PR: `npm run build` debe pasar sin errores.
3. Si tu cambio necesita **columnas o tablas nuevas**, agrega un archivo en `supabase/migrations` (numerado, idempotente, esquema `rental`, sin bloques `DO`) y documéntalo en [`docs/DATABASE.md`](docs/DATABASE.md). La app debe **degradar con gracia** si la migración aún no se ejecutó.
4. Actualiza [`CHANGELOG.md`](CHANGELOG.md) y la documentación afectada.
5. Nunca incluyas datos reales, claves ni respaldos. Las capturas del README usan datos de demostración ficticios.
6. Describe el PR: qué cambia, por qué y cómo lo probaste.

Estilo: interfaz en español, código y comentarios técnicos en inglés; componentes pequeños; la lógica de negocio va en `src/lib` o en hooks, no dentro de los componentes visuales.

---

<a id="english"></a>

Alquiler Pro is proprietary software owned by Optimard: contributions are by invitation. If you work on the project:

1. Branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Install and run: `npm install` · `npm run dev`. Before opening the PR, `npm run build` must pass.
3. If your change needs **new columns or tables**, add a file in `supabase/migrations` (numbered, idempotent, `rental` schema, no `DO` blocks) and document it in [`docs/DATABASE.md`](docs/DATABASE.md). The app must **degrade gracefully** if the migration has not been run yet.
4. Update [`CHANGELOG.md`](CHANGELOG.md) and any affected documentation.
5. Never include real data, keys or backups. README screenshots use fictitious demo data.
6. Describe the PR: what changes, why and how you tested it.

Style: Spanish UI, English code and technical comments; small components; business logic goes in `src/lib` or hooks, not in presentational components.
