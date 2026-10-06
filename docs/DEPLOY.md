# Despliegue · Deployment

**Español** · [English](#english) · [← README](../README.md)

Alquiler Pro se publica como sitio estático en **Vercel** y usa **Supabase** como backend.

## 1. Supabase

1. Crea (o usa) el proyecto de Supabase y habilita *Email Auth* en **Authentication → Providers**.
2. En **SQL Editor** ejecuta, completos y en orden, los archivos de [`supabase/migrations`](../supabase/migrations) (ver [DATABASE.md](DATABASE.md)).
3. En **Project Settings → API** copia la **Project URL** y la **anon public key**. Verifica que el esquema `rental` esté expuesto en **API → Exposed schemas**.

## 2. Vercel

1. Importa el repositorio en Vercel (framework **Vite**; build `npm run build`, salida `dist`).
2. En **Settings → Environment Variables** crea, para Production y Preview:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | la *anon public key* |

3. `vercel.json` ya redirige todas las rutas a `index.html` (SPA).
4. Cada *push* a `main` genera un despliegue de producción; las demás ramas generan *previews*.

> Tras un **rollback** en Vercel, la promoción automática de `main` queda desactivada: promueve el despliegue deseado desde el panel (**Promote to Production**).

## 3. Lista de verificación

- [ ] Las variables de entorno apuntan al proyecto correcto.
- [ ] Las migraciones 002–006 se ejecutaron en ese proyecto.
- [ ] Inicias sesión y ves tus propiedades.
- [ ] **Ajustes → Factura** tiene el nombre del negocio y la firma.
- [ ] No hay claves `service_role` ni respaldos con datos reales en el repositorio.

---

<a id="english"></a>

# Deployment (English)

[Español](#despliegue--deployment) · [← README](../README.en.md)

Alquiler Pro is published as a static site on **Vercel** and uses **Supabase** as its backend.

## 1. Supabase

1. Create (or use) the Supabase project and enable *Email Auth* under **Authentication → Providers**.
2. In the **SQL Editor** run, in full and in order, the files in [`supabase/migrations`](../supabase/migrations) (see [DATABASE.md](DATABASE.md)).
3. In **Project Settings → API** copy the **Project URL** and the **anon public key**. Make sure the `rental` schema is exposed under **API → Exposed schemas**.

## 2. Vercel

1. Import the repository into Vercel (framework **Vite**; build `npm run build`, output `dist`).
2. Under **Settings → Environment Variables** create, for Production and Preview:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the *anon public key* |

3. `vercel.json` already rewrites every route to `index.html` (SPA).
4. Every push to `main` creates a production deployment; other branches create previews.

> After a **rollback** in Vercel, automatic promotion of `main` is disabled: promote the desired deployment from the dashboard (**Promote to Production**).

## 3. Checklist

- [ ] Environment variables point to the right project.
- [ ] Migrations 002–006 were run on that project.
- [ ] You can log in and see your properties.
- [ ] **Ajustes → Factura** has the business name and signature.
- [ ] No `service_role` keys or backups with real data in the repository.
