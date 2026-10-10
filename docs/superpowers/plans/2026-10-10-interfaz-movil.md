# Interfaz móvil — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al abrir Alquiler Pro desde un móvil (< 768px) la interfaz está pensada para móvil (barra inferior, hojas inferiores, tarjetas en lugar de tablas, áreas táctiles de 44px), con paridad total de funciones y sin cambios en escritorio.

**Architecture:** Capa móvil sobre los componentes existentes con los breakpoints de Tailwind (`md:` = escritorio; `max-md:` = móvil). Un bloque de CSS móvil en `src/index.css` (tamaño de inputs, áreas táctiles, pie de acciones pegado), un hook `useIsMobile` solo donde hace falta lógica distinta (maestro→detalle, drawer), y pares tabla/tarjetas con `hidden md:block` / `md:hidden`. Sin vistas `*.mobile.jsx`.

**Tech Stack:** React 18, Tailwind 3.4.17 (variante `max-md:` disponible), react-router-dom 6.30, lucide-react, Vite. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-10-interfaz-movil-design.md` (léelo antes de empezar; este plan lo implementa).

## Global Constraints

- Móvil = ancho `< 768px`. Desde 768px la app debe verse **idéntica a hoy** (tablet y escritorio no cambian).
- Áreas táctiles ≥ 44×44px; inputs a 16px en móvil (iOS no debe hacer zoom al enfocar).
- Sin scroll horizontal de página a 360, 390 y 430px.
- Elementos fijos respetan `env(safe-area-inset-bottom)`; se usa `dvh`, no `vh`, para alturas de pantalla completa.
- Sin dependencias nuevas, sin cambios de lógica, datos, rutas, colores ni marca.
- Navegación móvil: barra inferior con Inicio, Propiedades, Inquilinos, Finanzas y **Más** (Edificios, Gastos, Configuración, Cerrar sesión).
- Tenants: **"Registrar pago" es el botón principal** de la tarjeta; carta, reporte, editar y desvincular van en un menú "⋯".
- Inicio: la **actividad reciente va plegada por defecto** en móvil.
- Propiedades en móvil: maestro → detalle conservando `?p=<id>`.
- Texto de UI en español, igual que el resto de la app.
- Z-index: header y barra inferior `z-40` < hojas/modales/drawer `z-50` < toast `z-[70]`.

## Desviaciones respecto al spec (aprobar junto con el plan)

1. **Pie de acciones pegado:** en vez de un prop `footer` en `Modal`, se usa una clase CSS `.sheet-actions` (sticky al fondo del cuerpo de la hoja, solo en móvil) que se añade a la fila de botones de los 6 modales largos. Mismo resultado, sin reestructurar los formularios (el prop `footer` obligaba a mover botones fuera del `<form>`).
2. **Áreas táctiles:** en vez de editar botón por botón, una regla CSS móvil global (`button`, `[role=button]` → `min-height/min-width: 44px`, con `.no-touch` para excepciones). Las filas que quedan apretadas por ello se ajustan en su tarea.
3. **Tablas a tarjetas:** sin componente "que decide"; cada página renderiza ambas (`hidden md:block` la tabla, `md:hidden` las tarjetas). El único componente compartido es `RowMenu` (menú "⋯" como hoja inferior).
4. **`LetterSettings`:** su `<table>` es la **vista previa de la carta en PDF**, no una tabla de datos; no pasa a tarjetas (solo se asegura que no desborde).

## Review Focus

Entradas o condiciones que el spec implica pero que ninguna tarea cubre con un test; cada una tiene su comprobación en la tarea que se indica.

1. Nombres largos de inquilino/propiedad/edificio (≈ 40 caracteres) y montos grandes (`RD$ 12,345,678.00`) deben partir línea o truncarse sin provocar scroll horizontal de página (Tareas 5, 7, 8).
2. Teclado abierto en iPhone/Android con el pie de acciones: el botón Guardar debe seguir alcanzable y la barra inferior no debe tapar contenido ni el pie de la hoja (Tarea 3).
3. Enlace directo `/propiedades?p=<id>` en móvil abre el detalle; "← Propiedades" vuelve a la lista; un `p` inválido muestra la lista, sin bucle de auto-selección (Tarea 9).
4. Cruzar el breakpoint (girar el móvil a horizontal, ≥ 768px) no debe perder la propiedad seleccionada ni dejar la pantalla en blanco (Tarea 9).
5. Estados vacíos y datos nulos: sin inquilinos, sin lecturas, sin edificios, `rate === null` (se muestra `—`) y sin pagos deben mostrar su mensaje en la vista de tarjetas igual que en la de tabla (Tareas 5, 6, 7).

## Protocolo de verificación (el proyecto no tiene framework de tests)

Añadir uno sería una dependencia nueva (regla `dependency-vetting`), así que las tareas se verifican así. **Prerrequisito (una vez):** el repo no tiene `.env`; copiar `.env.example` a `.env` y pedirle a Warlin `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` y una cuenta de prueba (nunca commitear `.env`). Si no se dispone de ellas, verificar con `npm run build` y pedir a Warlin que revise el preview de Vercel de la rama desde su móvil.

Cada tarea termina con **V1 + V2** (y V3 si toca pantallas):

- **V1 — build:** `npm run build` termina sin errores.
- **V2 — escritorio intacto:** con `npm run dev` y el navegador a 1280×800 y 768×1024, la pantalla tocada se ve igual que en `main` (comparar con `git stash` o con otra pestaña en `main`).
- **V3 — móvil:** con el navegador a 390×844 (y repasar 360×740 y 430×932), ejecutar en consola:

```js
// 1) ¿hay scroll horizontal de página? (esperado: true)
document.documentElement.scrollWidth <= window.innerWidth
// 2) botones/inputs visibles con área táctil < 44px (esperado: lista vacía o solo excepciones justificadas)
[...document.querySelectorAll('button,[role=button],select,input:not([type=checkbox]):not([type=radio])')]
  .filter(e => e.offsetParent !== null)
  .map(e => ({ e, r: e.getBoundingClientRect() }))
  .filter(({ r }) => r.width && (r.height < 43.5 || r.width < 43.5))
  .map(({ e, r }) => `${e.tagName} "${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
```

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `index.html` | modificar | `viewport-fit=cover` |
| `src/index.css` | modificar (añadir al final) | Reglas móviles: inputs 16px/44px, áreas táctiles, `.sheet-actions`, animación de hoja, padding del login |
| `src/hooks/useIsMobile.js` | crear | `true` si `(max-width: 767px)`; reactivo |
| `src/components/Layout/BottomNav.jsx` | crear | Barra inferior + hoja "Más" |
| `src/components/Layout/Header.jsx` | modificar | Header móvil (logo, campana) |
| `src/components/Layout/AppLayout.jsx` | modificar | Monta `BottomNav`, espacio inferior |
| `src/components/Common/Modal.jsx` | modificar | Hoja inferior en móvil, centrado en escritorio |
| `src/components/Common/RowMenu.jsx` | crear | Botón "⋯" que abre una hoja con acciones |
| `src/components/Common/Toast.jsx` | modificar | Toast a ancho completo en móvil |
| `src/components/AlertDrawer/AlertDrawer.jsx` | modificar | Hoja inferior en móvil |
| `src/components/Modals/*.jsx` (7 archivos) | modificar | Rejillas a 1 columna y `.sheet-actions` |
| `src/pages/Tenants.jsx`, `Expenses.jsx`, `Finances.jsx` | modificar | Tarjetas en móvil |
| `src/pages/Home.jsx`, `components/Common/Kpi.jsx`, `Dashboard/PropertyFilters.jsx`, `PropertyList.jsx`, `ActivityLog.jsx` | modificar | Inicio móvil |
| `src/pages/Properties.jsx`, `Dashboard/PropertyDetails.jsx`, `YearlyPaymentGrid.jsx` | modificar | Maestro→detalle y cuadrícula 4×3 |
| `src/pages/Buildings.jsx`, `BuildingDetail.jsx` | modificar | Edificios móvil |
| `src/pages/Settings.jsx`, `Settings/InvoiceSettings.jsx`, `Login.jsx`, `Register.jsx` | modificar | Ajustes y acceso |
| `CHANGELOG.md`, `package.json`, `AppLayout.jsx` | modificar | Entrada de versión |

---

### Task 1: Base móvil (viewport, CSS global, hook)

**Files:**
- Modify: `index.html`
- Modify: `src/index.css` (añadir al final)
- Create: `src/hooks/useIsMobile.js`

**Interfaces:**
- Produces: `useIsMobile(): boolean` (default export de `src/hooks/useIsMobile.js`), clases CSS `.sheet-actions`, `.animate-sheet-up`, `.scrollbar-none`, `.no-touch`.

- [ ] **Step 1: Viewport con área segura**

En `index.html`, cambiar la línea del viewport:

```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 2: Crear el hook**

`src/hooks/useIsMobile.js`:

```js
import { useEffect, useState } from 'react'

const QUERY = '(max-width: 767px)'

/** true on phones (< 768px); updates when the window is resized or the phone is rotated. */
export default function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches)

    useEffect(() => {
        const mq = window.matchMedia(QUERY)
        const onChange = (e) => setIsMobile(e.matches)
        setIsMobile(mq.matches)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    return isMobile
}
```

- [ ] **Step 3: CSS móvil (añadir al final de `src/index.css`)**

```css
/* ===== MOBILE (< 768px) ===== */
@keyframes sheetUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.animate-sheet-up { animation: sheetUp .22s ease-out; }

.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }

@media (min-width: 768px) {
  .animate-sheet-up { animation: none; }
}

@media (max-width: 767px) {
  /* 16px stops iOS from zooming when an input gets focus; 44px is a comfortable touch height */
  input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']),
  select,
  textarea {
    font-size: 16px;
  }

  input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']),
  select {
    min-height: 44px;
  }

  /* Touch targets. Opt out with .no-touch (e.g. inline text links built as buttons). */
  button:not(.no-touch),
  [role='button']:not(.no-touch) {
    min-height: 44px;
    min-width: 44px;
  }

  /* Action row stuck to the bottom of a bottom sheet (add the class to a modal's button row).
     Negative margins cancel the sheet body padding (px-4, pb-3 + safe area) so it spans edge to edge. */
  .sheet-actions {
    position: sticky;
    bottom: 0;
    z-index: 1;
    display: flex;
    gap: 0.5rem;
    margin: 1rem -1rem calc(-0.75rem - env(safe-area-inset-bottom));
    padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
    background: #fff;
    border-top: 1px solid #f3f4f6;
  }

  .sheet-actions > * {
    flex: 1 1 0;
  }

  .login-container {
    padding: 1.75rem 1.25rem;
    border-radius: 20px;
  }
}
```

- [ ] **Step 4: Verificar**

Run: `npm run build`
Expected: build OK (V1). La app aún no cambia visualmente salvo inputs/botones en móvil (V2: escritorio idéntico).

- [ ] **Step 5: Commit**

```bash
git add index.html src/index.css src/hooks/useIsMobile.js
git commit -m "feat(movil): base móvil (viewport, reglas CSS, useIsMobile)"
```

---

### Task 2: Esqueleto móvil (header, barra inferior, layout)

**Files:**
- Create: `src/components/Layout/BottomNav.jsx`
- Modify: `src/components/Layout/Header.jsx`
- Modify: `src/components/Layout/AppLayout.jsx`

**Interfaces:**
- Consumes: `Modal` (`isOpen`, `onClose`, `title`, `size`) de `../Common/Modal` (su versión móvil llega en la Tarea 3; mientras tanto funciona como modal normal), `useAuth()` → `{ user, signOut }`.
- Produces: `BottomNav` (sin props), montado en `AppLayout`.

- [ ] **Step 1: Crear `BottomNav.jsx`**

```jsx
import { useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { House, DoorOpen, Users, ChartColumn, Ellipsis, Building2, Flame, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../Common/Modal'

const MAIN = [
    { to: '/', label: 'Inicio', icon: House, end: true },
    { to: '/propiedades', label: 'Propiedades', icon: DoorOpen },
    { to: '/inquilinos', label: 'Inquilinos', icon: Users },
    { to: '/finanzas', label: 'Finanzas', icon: ChartColumn }
]
const MORE = [
    { to: '/edificios', label: 'Edificios', icon: Building2 },
    { to: '/gastos', label: 'Gastos', icon: Flame },
    { to: '/settings', label: 'Configuración', icon: Settings }
]

const tabClass = (active) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[10px] font-medium transition ${
        active ? 'text-brand-700' : 'text-gray-500'}`

/** Fixed bottom navigation for phones. "Más" opens a sheet with the remaining sections and the account. */
export default function BottomNav() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const [moreOpen, setMoreOpen] = useState(false)
    const moreActive = MORE.some(m => pathname.startsWith(m.to))

    const handleLogout = async () => {
        setMoreOpen(false)
        await signOut()
        navigate('/login')
    }

    return (
        <>
            <nav aria-label="Navegación principal"
                className="md:hidden fixed bottom-0 inset-x-0 z-40 flex bg-white/95 backdrop-blur border-t border-brand-200 pb-[env(safe-area-inset-bottom)]">
                {MAIN.map(({ to, label, icon: Icon, end }) => (
                    <NavLink key={to} to={to} end={end} className={({ isActive }) => tabClass(isActive)}>
                        <Icon className="w-5 h-5" />
                        {label}
                    </NavLink>
                ))}
                <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className={tabClass(moreActive)}>
                    <Ellipsis className="w-5 h-5" />
                    Más
                </button>
            </nav>

            <Modal isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Más" size="sm">
                <p className="text-xs text-gray-500 truncate mb-2">{user?.email}</p>
                <ul className="-mx-4 divide-y divide-gray-100 border-y border-gray-100">
                    {MORE.map(({ to, label, icon: Icon }) => (
                        <li key={to}>
                            <Link to={to} onClick={() => setMoreOpen(false)}
                                className="flex items-center gap-3 px-4 min-h-[48px] text-sm text-gray-700 active:bg-gray-50">
                                <Icon className="w-5 h-5 text-gray-500" />{label}
                            </Link>
                        </li>
                    ))}
                    <li>
                        <button type="button" onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 min-h-[48px] text-sm text-red-600 active:bg-red-50">
                            <LogOut className="w-5 h-5" />Cerrar sesión
                        </button>
                    </li>
                </ul>
            </Modal>
        </>
    )
}
```

- [ ] **Step 2: `Header.jsx` — header móvil**

Edit 1 (logos, el símbolo se muestra bajo `md`):

old:
```jsx
                    <img src="/logo-symbol.svg" alt="" className="h-7 w-7 sm:hidden" />
                    <img src="/logo.svg" alt="Alquiler Pro" className="hidden sm:block h-8 w-auto" />
```
new:
```jsx
                    <img src="/logo-symbol.svg" alt="" className="h-7 w-7 md:hidden" />
                    <img src="/logo.svg" alt="Alquiler Pro" className="hidden md:block h-8 w-auto" />
```

Edit 2 (las pestañas salen del header móvil; un separador empuja la campana a la derecha):

old:
```jsx
                <nav className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
```
new:
```jsx
                <div className="flex-1 md:hidden" />
                <nav className="hidden md:flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
```

Edit 3 (Configuración y cuenta solo en escritorio; en móvil están en "Más"):

old: `className="w-8 h-8 rounded-lg border border-gray-200 hidden sm:flex items-center justify-center hover:bg-gray-50">`
new: `className="w-8 h-8 rounded-lg border border-gray-200 hidden md:flex items-center justify-center hover:bg-gray-50">`

old: `<div className="relative" ref={menuRef}>`
new: `<div className="relative hidden md:block" ref={menuRef}>`

- [ ] **Step 3: `AppLayout.jsx` — montar la barra y dejar espacio**

Añadir import junto a los otros: `import BottomNav from './BottomNav'`.

old:
```jsx
                <footer className="text-center text-[11px] text-gray-400 py-3">
                    &copy; {new Date().getFullYear()} Alquiler Pro · Desarrollado por Optimard · v1.12.4
                </footer>
```
new:
```jsx
                <footer className="text-center text-[11px] text-gray-400 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:py-3">
                    &copy; {new Date().getFullYear()} Alquiler Pro · Desarrollado por Optimard · v1.12.4
                </footer>
                <BottomNav />
```

- [ ] **Step 4: Verificar**

V1 (build). V2 (1280×800 y 768×1024: header y pestañas como antes; no hay barra inferior). V3 a 390×844: el header muestra logo-símbolo y campana; barra inferior con 5 pestañas; tocar "Más" abre la hoja con email, Edificios, Gastos, Configuración y Cerrar sesión; navegar a `/gastos` deja "Más" en color de marca; al final de cada página el pie no queda tapado por la barra.

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout/BottomNav.jsx src/components/Layout/Header.jsx src/components/Layout/AppLayout.jsx
git commit -m "feat(movil): header móvil y barra de navegación inferior con hoja Más"
```

---

### Task 3: Modal como hoja inferior, formularios y pie de acciones

**Files:**
- Modify: `src/components/Common/Modal.jsx` (reescribir el `return`)
- Modify: `src/components/Modals/EditPaymentModal.jsx`, `RegisterPaymentModal.jsx`, `RegisterPropertyModal.jsx`, `RegisterGasModal.jsx`, `RegisterUtilityModal.jsx`, `AssignTenantModal.jsx`

**Interfaces:**
- Consumes: clases `.animate-sheet-up`, `.sheet-actions` (Tarea 1).
- Produces: `Modal` con la misma firma `{ isOpen, onClose, title, children, size }`; en móvil es una hoja inferior (`sm` = alto ajustado al contenido, el resto `92dvh`).

- [ ] **Step 1: Reescribir el JSX de `Modal.jsx`** (los dos `useEffect` quedan igual)

Reemplazar desde `const sizes = {` hasta el final del archivo por:

```jsx
    const sizes = {
        sm: 'md:max-w-md',
        md: 'md:max-w-2xl',
        lg: 'md:max-w-4xl',
        xl: 'md:max-w-6xl'
    }

    return (
        <div className="fixed inset-0 z-50 md:overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Phone: bottom sheet. md+: centered dialog, same as before. */}
            <div className="fixed inset-x-0 bottom-0 md:static md:flex md:min-h-screen md:items-center md:justify-center md:p-4">
                <div
                    className={`relative flex w-full ${sizes[size]} flex-col bg-white shadow-xl rounded-t-2xl md:rounded-xl max-h-[92dvh] ${
                        size === 'sm' ? '' : 'h-[92dvh]'} md:h-auto md:max-h-none animate-sheet-up`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
                        <h2 className="text-base font-semibold text-ink">{title}</h2>
                        <button
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:max-h-[calc(100vh-160px)] md:flex-none md:pb-3">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
```

(El botón cerrar mide 44×44 en móvil por la regla global de la Tarea 1.)

- [ ] **Step 2: Rejillas de los modales → 1 columna en móvil**

Regla: dos campos de texto lado a lado pasan a `grid-cols-1 sm:grid-cols-2`; se mantienen en 2/3 columnas los pares cortos (selects numéricos, mes+año, monto+fecha).

`EditPaymentModal.jsx` — solo la rejilla Referencia/Notas:
old:
```jsx
                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Referencia" name="reference" value={form.reference} onChange={handleChange} />
```
new:
```jsx
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormInput label="Referencia" name="reference" value={form.reference} onChange={handleChange} />
```

`RegisterPaymentModal.jsx` — Tipo de pago/Monto y Referencia/Notas:
old:
```jsx
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <FormInput label="Tipo de pago"
```
new:
```jsx
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            <FormInput label="Tipo de pago"
```
old:
```jsx
                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Referencia" name="reference" value={formData.reference} onChange={handleChange} />
```
new:
```jsx
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormInput label="Referencia" name="reference" value={formData.reference} onChange={handleChange} />
```

`RegisterPropertyModal.jsx`:
old: `<div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">` → new: `<div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 flex-1">`
old: `<div className="grid grid-cols-2 gap-4">\n                                    <FormInput\n                                        label="Tipo de propiedad"` → new con `grid grid-cols-1 sm:grid-cols-2 gap-4` (la rejilla de 3 selects numéricos de habitaciones/baños se queda en 3 columnas).

`RegisterGasModal.jsx`: old `<div className="grid grid-cols-2 gap-4">\n                    <div>\n                        <label className="block text-sm font-medium text-gray-700 mb-1">Lectura Anterior</label>` → `grid grid-cols-1 sm:grid-cols-2 gap-4`.

`RegisterUtilityModal.jsx`: old `<div className="grid grid-cols-2 gap-4">\n                    <div>\n                    <FormInput\n                        label={`Lectura Anterior (${config.unit})`}` → `grid grid-cols-1 sm:grid-cols-2 gap-4`.

- [ ] **Step 3: `.sheet-actions` en las filas de botones de los modales largos**

Solo se añade la clase; en escritorio no tiene efecto (todas sus reglas están dentro de `@media (max-width: 767px)`).

- `RegisterPaymentModal.jsx`: `<div className="flex justify-end gap-2 mt-2">` → `<div className="flex justify-end gap-2 mt-2 sheet-actions">`
- `RegisterPropertyModal.jsx`: `<div className="flex gap-3 justify-end pt-6 mt-4 border-t border-gray-100">` → `<div className="flex gap-3 justify-end pt-6 mt-4 border-t border-gray-100 sheet-actions">`
- `RegisterGasModal.jsx`: `<div className="flex justify-end gap-2 mt-6">` → `<div className="flex justify-end gap-2 mt-6 sheet-actions">`
- `RegisterUtilityModal.jsx`: `<div className="flex gap-3 justify-end mt-6">` → `<div className="flex gap-3 justify-end mt-6 sheet-actions">`
- `AssignTenantModal.jsx` (dos filas con el mismo texto; editar cada una con su contexto):
  - paso 1: old `<div className="flex gap-3 justify-end mt-6">\n                            <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>` → añadir ` sheet-actions` a la clase.
  - paso 2: old `<div className="flex gap-3 justify-end mt-6">\n                            {!isEditing && !property ? (` → añadir ` sheet-actions`.

- [ ] **Step 4: Verificar**

V1, V2 (a 1280×800 abrir "Registrar pago" y "Registrar propiedad": idénticos a `main`). V3 a 390×844, para cada uno de los 6 modales largos: abre como hoja inferior con esquinas redondeadas; el cuerpo hace scroll por dentro; los botones quedan pegados al fondo y ocupan todo el ancho repartido; en un campo de texto al enfocar (teclado abierto en un dispositivo real o con la emulación del navegador) el botón Guardar sigue visible. Cerrar con la X (44px), tocando el fondo y con Escape. `EditPaymentModal`/`RegisterBuildingModal` (tamaño `sm`) se ajustan al contenido.

- [ ] **Step 5: Commit**

```bash
git add src/components/Common/Modal.jsx src/components/Modals
git commit -m "feat(movil): Modal como hoja inferior, formularios a 1 columna y pie de acciones pegado"
```

---

### Task 4: Piezas compartidas (RowMenu, Toast, AlertDrawer)

**Files:**
- Create: `src/components/Common/RowMenu.jsx`
- Modify: `src/components/Common/Toast.jsx`
- Modify: `src/components/AlertDrawer/AlertDrawer.jsx`

**Interfaces:**
- Consumes: `Modal` (Tarea 3), `useIsMobile` (Tarea 1).
- Produces: `RowMenu({ title: string, items: Array<{ label: string, icon: LucideIcon, onClick: () => void, danger?: boolean } | false | null | undefined> })` — los elementos falsy se omiten; si no queda ninguno no renderiza nada.

- [ ] **Step 1: Crear `RowMenu.jsx`**

```jsx
import { useState } from 'react'
import { Ellipsis } from 'lucide-react'
import Modal from './Modal'

/** "⋯" button that opens a bottom sheet with a list of actions (phone-friendly row menu). */
export default function RowMenu({ title, items, label = 'Más acciones' }) {
    const [open, setOpen] = useState(false)
    const list = items.filter(Boolean)
    if (list.length === 0) return null

    return (
        <>
            <button type="button" aria-label={label} aria-haspopup="dialog" onClick={() => setOpen(true)}
                className="flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 active:bg-gray-50">
                <Ellipsis className="w-5 h-5" />
            </button>
            <Modal isOpen={open} onClose={() => setOpen(false)} title={title} size="sm">
                <ul className="-mx-4 divide-y divide-gray-100 border-y border-gray-100">
                    {list.map(({ label: text, icon: Icon, onClick, danger }) => (
                        <li key={text}>
                            <button type="button" onClick={() => { setOpen(false); onClick() }}
                                className={`w-full flex items-center gap-3 px-4 min-h-[48px] text-sm text-left ${
                                    danger ? 'text-red-600 active:bg-red-50' : 'text-gray-700 active:bg-gray-50'}`}>
                                <Icon className="w-5 h-5" />{text}
                            </button>
                        </li>
                    ))}
                </ul>
            </Modal>
        </>
    )
}
```

- [ ] **Step 2: `Toast.jsx` — ancho completo bajo el header en móvil**

old: `<div className="fixed top-4 right-4 z-50 space-y-2">`
new: `<div className="fixed top-14 left-3 right-3 md:top-4 md:left-auto md:right-4 z-[70] space-y-2">`

old: `min-w-[300px] max-w-md animate-fade-in`
new: `md:min-w-[300px] max-w-md animate-fade-in`

- [ ] **Step 3: `AlertDrawer.jsx` — hoja inferior en móvil**

Añadir `import useIsMobile from '../../hooks/useIsMobile'` y, dentro del componente (junto a `const total = ...`), `const isMobile = useIsMobile()`.

Backdrop (queda bajo el drawer y sobre la barra inferior): `zIndex: 40` → `zIndex: 49`.

Reemplazar el bloque de estilo del `<aside>`:

old:
```jsx
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 300,
                background: 'var(--wp-surface)', borderLeft: '1px solid var(--wp-border)',
                boxShadow: '-4px 0 20px rgba(0,0,0,.10)', zIndex: 50,
                display: 'flex', flexDirection: 'column',
                transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform .25s ease',
```
new:
```jsx
                position: 'fixed', bottom: 0, zIndex: 50,
                background: 'var(--wp-surface)',
                display: 'flex', flexDirection: 'column',
                transition: 'transform .25s ease',
                ...(isMobile
                    ? {
                        left: 0, right: 0, maxHeight: '85dvh',
                        borderTop: '1px solid var(--wp-border)', borderRadius: '16px 16px 0 0',
                        boxShadow: '0 -4px 20px rgba(0,0,0,.10)', paddingBottom: 'env(safe-area-inset-bottom)',
                        transform: isOpen ? 'translateY(0)' : 'translateY(100%)'
                    }
                    : {
                        top: 0, right: 0, width: 300,
                        borderLeft: '1px solid var(--wp-border)', boxShadow: '-4px 0 20px rgba(0,0,0,.10)',
                        transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
                    }),
```

- [ ] **Step 4: Verificar**

V1, V2 (a 1280×800 el drawer entra por la derecha con 300px como antes; los toasts salen arriba a la derecha). V3 a 390×844: tocar la campana abre una hoja desde abajo (máx. 85dvh) por encima de la barra inferior; los botones "Registrar pago →" miden ≥ 44px; el contenido hace scroll dentro de la hoja; un toast (p. ej. guardar algo) aparece bajo el header a ancho completo y no tapa la campana.

- [ ] **Step 5: Commit**

```bash
git add src/components/Common/RowMenu.jsx src/components/Common/Toast.jsx src/components/AlertDrawer/AlertDrawer.jsx
git commit -m "feat(movil): RowMenu, toast a ancho completo y AlertDrawer como hoja inferior"
```

---

### Task 5: Inquilinos → tarjetas

**Files:**
- Modify: `src/pages/Tenants.jsx`

**Interfaces:**
- Consumes: `RowMenu` (Tarea 4); del contexto `openPayment`, `openReport`, `openTenant`, `generateLetter`; `getPaymentStatus`, `StatusPill`, `formatDate`, `formatCurrency` (ya importados).

- [ ] **Step 1: Imports**

Añadir `Phone` al import de `lucide-react` y `import RowMenu from '../components/Common/RowMenu'`.

- [ ] **Step 2: Añadir `TenantCard` antes de `export default function Tenants()`**

```jsx
function TenantCard({ tenant, property, building, status, onPay, onLetter, onReport, onEdit, onUnassign }) {
    const [open, setOpen] = useState(false)
    return (
        <li className="bg-white rounded-xl border border-brand-200 shadow-sm p-3">
            <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    <p className="font-semibold uppercase leading-tight break-words">{tenant.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5 break-words">
                        {property ? property.name : 'Sin propiedad'}{building && <span className="text-gray-400"> · {building.name}</span>}
                    </p>
                    {tenant.phone && (
                        <a href={`tel:${tenant.phone}`} className="inline-flex items-center gap-1 mt-1 text-xs text-brand-700 underline">
                            <Phone className="w-3 h-3" />{tenant.phone}
                        </a>
                    )}
                </div>
                <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
                    aria-label={open ? 'Ocultar detalles' : 'Ver detalles'} className="-mt-1 -mr-1 flex items-center justify-center text-gray-400">
                    {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
            </div>
            <div className="mt-1.5"><StatusPill showDetail align="left" status={status} /></div>
            {open && (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-[13px]">
                    <div><dt className="text-[10px] font-bold uppercase text-gray-400">Cédula</dt><dd>{tenant.identity_number || '-'}</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase text-gray-400">Entrada</dt><dd>{formatDate(tenant.start_date)}</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase text-gray-400">Depósito</dt><dd>{tenant.deposit_amount > 0 ? formatCurrency(tenant.deposit_amount) : '-'}</dd></div>
                </dl>
            )}
            <div className="flex items-center gap-2 mt-3">
                {property && (
                    <button type="button" onClick={onPay}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-semibold shadow-sm">
                        <Wallet className="w-4 h-4" /> Registrar pago
                    </button>
                )}
                <RowMenu title={tenant.name} items={[
                    property && status.monthsOwed > 0 && { label: 'Carta de cobro', icon: Mail, onClick: onLetter },
                    property && { label: 'Reporte PDF', icon: FileText, onClick: onReport },
                    { label: 'Editar inquilino', icon: Pencil, onClick: onEdit },
                    { label: 'Desvincular inquilino', icon: UserMinus, danger: true, onClick: onUnassign }
                ]} />
            </div>
        </li>
    )
}
```

- [ ] **Step 3: Cabecera, pestañas y botón "Nuevo inquilino"**

old: `<button onClick={() => openTenant()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 text-white text-xs font-semibold shadow-sm hover:brightness-105">`
new: `<button onClick={() => openTenant()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 text-white text-xs font-semibold shadow-sm hover:brightness-105 max-md:w-full max-md:justify-center">`

old: `const tabClass = (id) => \`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px transition ${`
new: `const tabClass = (id) => \`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px transition max-md:flex-1 max-md:justify-center ${`

- [ ] **Step 4: Tabla de activos (solo ≥ md) + lista de tarjetas (solo móvil)**

La rama `view === 'active'` pasa a devolver un fragmento.

old:
```jsx
            {view === 'active' ? (
                <div className="bg-white rounded-xl border border-brand-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-[13px]">
```
new:
```jsx
            {view === 'active' ? (
                <>
                <div className="hidden md:block bg-white rounded-xl border border-brand-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-[13px]">
```

old:
```jsx
                    </table>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
```
new:
```jsx
                    </table>
                </div>

                <ul className="md:hidden space-y-2">
                    {active.length === 0 && (
                        <li className="bg-white rounded-xl border border-dashed border-brand-200 p-6 text-center text-sm text-gray-500">No hay inquilinos activos.</li>
                    )}
                    {active.map(({ tenant, property }) => {
                        const building = buildings.find(b => b.id === property?.building_id)
                        const status = getPaymentStatus(property, tenant, payments)
                        return (
                            <TenantCard key={tenant.id} tenant={tenant} property={property} building={building} status={status}
                                onPay={() => openPayment({ propertyId: property.id })}
                                onLetter={() => generateLetter(property, tenant)}
                                onReport={() => openReport({ propertyId: property.id, tenantId: tenant.id })}
                                onEdit={() => openTenant(property, tenant)}
                                onUnassign={() => setToUnassign(tenant)} />
                        )
                    })}
                </ul>
                </>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
```

(`getPaymentStatus(property, tenant, payments)` con `property` indefinido ya es el comportamiento de la tabla; no se cambia.)

- [ ] **Step 5: Verificar**

V1, V2 (1280 y 768: tabla igual que antes, sin tarjetas). V3 a 390: lista de tarjetas con nombre, propiedad · edificio, teléfono (toca → marcar), estado; "Registrar pago" abre el modal de la propiedad correcta; "⋯" abre la hoja con carta (solo si debe), reporte, editar, desvincular (rojo) y cada acción funciona; la flecha expande cédula/entrada/depósito. Review Focus 1 y 5: probar con un nombre de 40 caracteres y con la búsqueda sin resultados (mensaje "No hay inquilinos activos."). La vista "Antiguos" se revisa en la Tarea 12.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Tenants.jsx
git commit -m "feat(movil): inquilinos activos como tarjetas con Registrar pago y menú de acciones"
```

---

### Task 6: Gastos → tarjetas

**Files:**
- Modify: `src/pages/Expenses.jsx`

- [ ] **Step 1: Botón de registro y pestañas**

old: `<button onClick={() => openUtility(tab)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 text-white text-xs font-semibold shadow-sm hover:brightness-105">`
new: `<button onClick={() => openUtility(tab)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 text-white text-xs font-semibold shadow-sm hover:brightness-105 max-md:w-full max-md:justify-center">`

old: `className={\`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px transition ${`
new: `className={\`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px transition max-md:flex-1 max-md:justify-center ${`

- [ ] **Step 2: Tabla solo ≥ md y tarjetas en móvil**

old:
```jsx
            <div className="bg-white rounded-xl border border-brand-200 shadow-sm overflow-x-auto">
                <table className="w-full text-[13px]">
```
new:
```jsx
            <div className="hidden md:block bg-white rounded-xl border border-brand-200 shadow-sm overflow-x-auto">
                <table className="w-full text-[13px]">
```

Al final del componente, justo antes del `</div>\n    )\n}` de cierre (después del `</div>` que cierra el contenedor de la tabla), añadir:

```jsx

            <ul className="md:hidden space-y-2">
                {rows.length === 0 && (
                    <li className="bg-white rounded-xl border border-dashed border-brand-200 p-6 text-center text-sm text-gray-500">No hay lecturas.</li>
                )}
                {rows.map(({ reading, property }) => (
                    <li key={reading.id} className="bg-white rounded-xl border border-brand-200 shadow-sm p-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-semibold leading-tight break-words">{property?.name || '-'}</p>
                                <p className="text-xs text-gray-500">{formatDate(reading.reading_date)} · {reading.consumption_volume} {current.unit}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-bold">{formatCurrency(reading.total_cost)}</p>
                                <span className={reading.paid ? 'wp-badge-green' : 'wp-badge-amber'} style={{ fontSize: 9 }}>
                                    {reading.paid ? 'PAGADO' : 'PENDIENTE'}
                                </span>
                            </div>
                        </div>
                        {!reading.paid && (
                            <button type="button" onClick={() => openPayGas(reading)}
                                className="mt-3 w-full rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">Pagar</button>
                        )}
                    </li>
                ))}
            </ul>
```

- [ ] **Step 3: Verificar**

V1, V2, V3 (Gas/Luz/Agua con datos y sin datos → "No hay lecturas."; "Pagar" abre el modal de pago de la lectura; el consumo se ve siempre).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Expenses.jsx
git commit -m "feat(movil): gastos como tarjetas"
```

---

### Task 7: Finanzas → tarjetas

**Files:**
- Modify: `src/pages/Finances.jsx`

**Interfaces:**
- Consumes: ya en el archivo: `Link`, `A`, `StatusPill`, `formatCurrency`, `ArrowUpDown`, `Mail`, `data.buildingRows`, `totals`, `tenantRows`, `sort`/`setSort`, `generateLetter`, `tenantLink`, `propertyLink`.

- [ ] **Step 1: Helper `Stat` (junto a `Card`, al inicio del archivo)**

```jsx
const Stat = ({ label, value, className = '' }) => (
    <div className="min-w-0">
        <dt className="text-[9px] font-bold uppercase tracking-wide text-gray-500">{label}</dt>
        <dd className={`text-[13px] font-semibold break-words ${className}`}>{value}</dd>
    </div>
)
```

- [ ] **Step 2: "Resumen por edificio" — tabla solo ≥ md + tarjetas**

old:
```jsx
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead className="text-[10px] uppercase tracking-wide text-gray-500">
                                <tr className="text-right"><th className="text-left py-1.5">Edificio</th>
```
new:
```jsx
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead className="text-[10px] uppercase tracking-wide text-gray-500">
                                <tr className="text-right"><th className="text-left py-1.5">Edificio</th>
```

Justo después del `</div>` que cierra ese `overflow-x-auto` (antes de `</Card>` del resumen por edificio) añadir:

```jsx
                    <ul className="md:hidden space-y-2">
                        {data.buildingRows.map(b => (
                            <li key={b.id} className="rounded-lg border border-gray-100 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-semibold text-[13px] min-w-0 break-words">
                                        {b.building ? <Link to={`/edificios/${b.id}`} className="hover:text-brand-700">{b.building.name}</Link> : 'Sin edificio'}
                                    </p>
                                    <span className="text-[11px] text-gray-500 shrink-0">{b.units} unid. · {b.occupied}/{b.units} ocup.</span>
                                </div>
                                <dl className="grid grid-cols-3 gap-2 mt-2">
                                    <Stat label="Cobrado" value={formatCurrency(b.collected)} />
                                    <Stat label="Esperado" value={formatCurrency(b.expected)} />
                                    <Stat label="Tasa" value={b.rate === null ? '—' : `${b.rate}%`} />
                                </dl>
                                <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                                    <span className={b.owed > 0 ? 'font-bold text-red-600' : 'text-gray-400'}>Pendiente {formatCurrency(b.owed)}</span>
                                    <span><span className="text-yellow-600 font-semibold">{b.pendingCount}</span> pend. / <span className="text-red-600 font-semibold">{b.lateCount}</span> atras.</span>
                                </div>
                            </li>
                        ))}
                        <li className="rounded-lg bg-brand-50 p-3">
                            <p className="text-xs font-bold mb-1">Total · {properties.length} unidades</p>
                            <dl className="grid grid-cols-3 gap-2">
                                <Stat label="Cobrado" value={formatCurrency(totals.collected)} />
                                <Stat label="Esperado" value={formatCurrency(totals.expected)} />
                                <Stat label="Tasa" value={totals.rate === null ? '—' : `${totals.rate}%`} />
                            </dl>
                            <p className="mt-2 text-xs">
                                <span className="font-bold text-red-600">Pendiente {formatCurrency(totals.owed)}</span>
                                {' · '}{totals.pendingCount} pend. / {totals.lateCount} atras.
                            </p>
                        </li>
                    </ul>
```

- [ ] **Step 3: "Detalle por inquilino" — selector de orden, tabla solo ≥ md y tarjetas**

Exportar CSV y casilla "Solo con deuda" ya están en la fila de filtros (que hace `flex-wrap`); no cambian.

Después del `</div>` que cierra esa fila de filtros (la que contiene el buscador, "Solo con deuda" y "Exportar CSV") y antes de la tabla, añadir:

```jsx
                <div className="md:hidden flex items-center gap-2 mb-2">
                    <label htmlFor="orden-inquilinos" className="text-xs text-gray-600 shrink-0">Ordenar por</label>
                    <select id="orden-inquilinos" value={sort.key}
                        onChange={(e) => setSort({ key: e.target.value, dir: e.target.value === 'name' || e.target.value === 'building' ? 'asc' : 'desc' })}
                        className="flex-1 min-w-0 px-2 text-sm border border-gray-200 rounded-lg bg-white">
                        <option value="owed">Pendiente</option>
                        <option value="name">Inquilino</option>
                        <option value="building">Propiedad</option>
                        <option value="collected">Cobrado</option>
                        <option value="expected">Esperado</option>
                        <option value="rate">Tasa</option>
                        <option value="months">Meses deb.</option>
                    </select>
                    <button type="button" onClick={() => setSort(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
                        aria-label={`Orden ${sort.dir === 'asc' ? 'ascendente' : 'descendente'}; tocar para invertir`}
                        className="flex items-center justify-center rounded-lg border border-gray-200 text-gray-600">
                        <ArrowUpDown className="w-4 h-4" />
                    </button>
                </div>
```

old:
```jsx
                <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                        <thead className="text-[10px] text-gray-500">
```
new:
```jsx
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-[12px]">
                        <thead className="text-[10px] text-gray-500">
```

Después del `</div>` que cierra ese contenedor (antes de `</Card>`), añadir:

```jsx
                <ul className="md:hidden space-y-2">
                    {tenantRows.length === 0 && <li className="p-6 text-center text-sm text-gray-500">No hay inquilinos que coincidan.</li>}
                    {tenantRows.map(r => (
                        <li key={r.tenant.id} className="rounded-lg border border-gray-100 p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-medium uppercase leading-tight break-words">
                                        <A to={tenantLink(r)}>{r.tenant.name}</A>
                                        {!r.active && <span className="ml-1.5 text-[9px] font-bold normal-case bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Antiguo</span>}
                                    </p>
                                    <p className="text-xs text-gray-500 break-words">
                                        <A to={propertyLink(r.property)}>{r.property?.name}</A>
                                        {r.building && <> · <A to={`/edificios/${r.building.id}`}>{r.building.name}</A></>}
                                    </p>
                                </div>
                                {r.active && r.monthsOwed > 0 && (
                                    <button type="button" onClick={() => generateLetter(r.property, r.tenant)} aria-label={`Carta de cobro ${r.tenant.name}`}
                                        className="flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 shrink-0"><Mail className="w-4 h-4" /></button>
                                )}
                            </div>
                            <dl className="grid grid-cols-3 gap-2 mt-2">
                                <Stat label="Cobrado" value={formatCurrency(r.collected)} />
                                <Stat label="Esperado" value={formatCurrency(r.expected)} />
                                <Stat label="Tasa" value={r.rate === null ? '—' : `${r.rate}%`} />
                            </dl>
                            <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                                <span className={r.owed > 0 ? 'font-bold text-red-600' : 'text-gray-400'}>
                                    {r.active ? `Pendiente ${formatCurrency(r.owed)} · ${r.monthsOwed} mes(es)` : 'Sin pendiente'}
                                </span>
                                {r.status && <StatusPill status={r.status} align="right" />}
                            </div>
                        </li>
                    ))}
                </ul>
```

- [ ] **Step 4: Cabecera y casilla "Solo con deuda"**

La cabecera (`flex flex-wrap ... gap-3` con "Incluir historial generado" y el selector de año) ya envuelve; no se cambia. Verificar en V3 que no desborda.

- [ ] **Step 5: Verificar**

V1, V2 (1280/768: tablas como antes, sin selector de orden). V3 a 390: KPIs 2×2, gráficos a 1 columna sin cortarse (revisar `MonthlyChart` con 12 barras y `HBars` con nombres largos de edificio), tarjetas por edificio + total, selector "Ordenar por" cambia el orden (probar Pendiente, Inquilino, Tasa) y el botón invierte, "Solo con deuda" y el buscador filtran las tarjetas, "Exportar CSV" sigue descargando. Review Focus 1 y 5: monto grande en "Cobrado" y `rate === null` muestra `—`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Finances.jsx
git commit -m "feat(movil): finanzas con tarjetas por edificio e inquilino y selector de orden"
```

---

### Task 8: Inicio, filtros, lista de propiedades y actividad

**Files:**
- Modify: `src/pages/Home.jsx`, `src/components/Common/Kpi.jsx`, `src/components/Dashboard/PropertyFilters.jsx`, `PropertyList.jsx`, `ActivityLog.jsx`

- [ ] **Step 1: `Home.jsx` — cabecera y listas**

Botón "Edificio" visible siempre; "Registrar pago" primero y a ancho completo en móvil; los secundarios se reparten la fila siguiente.

old: `<div className="flex items-center gap-1.5">\n                    <button onClick={() => openTenant()}`
new: `<div className="flex flex-wrap items-center gap-1.5 max-md:w-full">\n                    <button onClick={() => openTenant()}`

old: `<button onClick={() => openTenant()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50">`
new: `<button onClick={() => openTenant()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50 max-md:flex-1 max-md:justify-center">`

old: `<button onClick={() => openProperty()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50">`
new: `<button onClick={() => openProperty()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50 max-md:flex-1 max-md:justify-center">`

old: `<button onClick={() => openBuilding()} className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50">`
new: `<button onClick={() => openBuilding()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50 max-md:flex-1 max-md:justify-center">`

old: `<button onClick={() => openPayment()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-semibold shadow-sm hover:brightness-105">`
new: `<button onClick={() => openPayment()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-semibold shadow-sm hover:brightness-105 max-md:order-first max-md:w-full max-md:justify-center">`

Lista sin scroll interno en móvil:

old: `<div className="max-h-[calc(100vh-330px)] min-h-[260px] overflow-y-auto">`
new: `<div className="md:max-h-[calc(100vh-330px)] md:min-h-[260px] md:overflow-y-auto">`

- [ ] **Step 2: `Kpi.jsx` — montos largos no desbordan**

old: `<p className={\`text-xl font-bold leading-tight ${tones[0]}\`}>{value}</p>`
new: `<p className={\`text-xl font-bold leading-tight break-words ${tones[0]}\`}>{value}</p>`

old: `<div className="bg-white rounded-xl border border-brand-100 shadow-sm px-3 py-2 relative overflow-hidden">`
new: `<div className="bg-white rounded-xl border border-brand-100 shadow-sm px-3 py-2 relative overflow-hidden min-w-0">`

- [ ] **Step 3: `PropertyFilters.jsx` — chips en una fila con scroll, controles a ancho completo**

old: `<div className="relative flex-1 min-w-[180px]">`
new: `<div className="relative flex-1 min-w-[180px] max-md:basis-full">`

old: `<div className="flex items-center gap-1 flex-wrap">`
new: `<div className="flex items-center gap-1 flex-wrap max-md:flex-nowrap max-md:basis-full max-md:overflow-x-auto scrollbar-none">`

old: `className={\`px-2.5 py-1 rounded-full text-xs font-medium border transition ${`
new: `className={\`px-2.5 py-1 rounded-full text-xs font-medium border transition max-md:px-4 max-md:shrink-0 max-md:whitespace-nowrap ${`

old: `className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"`
new: `className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white max-md:w-full"`

- [ ] **Step 4: `PropertyList.jsx` — filas cómodas y encabezados pegados bajo el header**

old: `className={\`group flex items-center gap-2 px-3 ${dense ? 'py-1.5' : 'py-2'} cursor-pointer`
new: `className={\`group flex items-center gap-2 px-3 ${dense ? 'py-1.5' : 'py-2'} max-md:py-2.5 cursor-pointer`

old: `<p className="text-[13px] font-semibold text-ink truncate leading-tight">{property.name}</p>`
new: `<p className="text-[13px] max-md:text-sm font-semibold text-ink truncate leading-tight">{property.name}</p>`

old: `<p className={\`text-[10px] truncate leading-tight mt-px font-medium ${`
new: `<p className={\`text-[10px] max-md:text-[11px] truncate leading-tight mt-px font-medium ${`

old: `<div className="sticky top-0 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-brand-50/90 backdrop-blur border-y border-brand-100"`
new: `<div className="sticky top-12 md:top-0 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-brand-50/90 backdrop-blur border-y border-brand-100"`

(El botón de pago de 28px pasa a 44×44px por la regla global; el de editar edificio también.)

- [ ] **Step 5: `ActivityLog.jsx` — plegada por defecto en móvil**

Añadir `useState` (`import { useState } from 'react'`) y, dentro de `ActivityLog`, `const [open, setOpen] = useState(false)`.

Cabecera:

old:
```jsx
            <header className="px-3 py-2 border-b border-gray-100">
                <h2 className="flex items-center gap-1.5 text-sm font-bold"><ScrollText className="w-4 h-4 text-brand-500" />Registro de actividad</h2>
            </header>
            {!available && (
                <p className="px-3 py-1.5 text-[11px] bg-amber-50 text-amber-800 border-b border-amber-100">
```
new:
```jsx
            <header className={`flex items-center justify-between gap-2 px-3 py-2 ${open ? 'border-b border-gray-100' : 'max-md:border-b-0 border-b border-gray-100'}`}>
                <h2 className="flex items-center gap-1.5 text-sm font-bold"><ScrollText className="w-4 h-4 text-brand-500" />Registro de actividad</h2>
                <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
                    className="md:hidden text-xs font-semibold text-brand-700">
                    {open ? 'Ocultar' : 'Ver actividad reciente'}
                </button>
            </header>
            {!available && (
                <p className={`px-3 py-1.5 text-[11px] bg-amber-50 text-amber-800 border-b border-amber-100 ${open ? '' : 'max-md:hidden'}`}>
```

Contenido plegable:

old: `<p className="p-6 text-center text-sm text-gray-500">Aún no hay actividad registrada.</p>`
new: `<p className={\`p-6 text-center text-sm text-gray-500 ${open ? '' : 'max-md:hidden'}\`}>Aún no hay actividad registrada.</p>`

old: `<ul className="divide-y divide-gray-100 max-h-[calc(100vh-330px)] min-h-[260px] overflow-y-auto">`
new: `<ul className={\`divide-y divide-gray-100 max-md:max-h-[70dvh] md:max-h-[calc(100vh-330px)] md:min-h-[260px] overflow-y-auto ${open ? '' : 'max-md:hidden'}\`}>`

- [ ] **Step 6: Verificar**

V1, V2 (1280×800: Inicio idéntico; la actividad se ve desplegada y sin botón "Ver actividad reciente"). V3 a 390: "Registrar pago" ocupa una fila entera arriba, Inquilino/Propiedad/Edificio comparten la fila siguiente; KPIs 2×2 sin desbordar (probar `RD$ 12,345,678.00`); chips de estado en una sola fila con scroll horizontal; select de edificio a ancho completo; la lista hace scroll con la página y el encabezado de cada edificio queda pegado justo bajo el header de 48px; el botón de pago de cada fila mide ≥ 44px; la actividad aparece plegada y "Ver actividad reciente" la despliega y "Ocultar" la pliega.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Home.jsx src/components/Common/Kpi.jsx src/components/Dashboard
git commit -m "feat(movil): inicio con acciones, filtros en una fila, lista cómoda y actividad plegada"
```

---

### Task 9: Propiedades maestro→detalle y cuadrícula anual 4×3

**Files:**
- Modify: `src/pages/Properties.jsx` (reemplazar el archivo completo)
- Modify: `src/components/Dashboard/PropertyDetails.jsx`
- Modify: `src/components/Dashboard/YearlyPaymentGrid.jsx`

**Interfaces:**
- Consumes: `useIsMobile` (Tarea 1), `RowMenu` (Tarea 4).
- Produces: en móvil `Properties` muestra la lista (sin `?p` válido) o el detalle (con `?p` válido); `select(property)` guarda `state: { fromList: true }` para que "← Propiedades" use `navigate(-1)` cuando se llegó desde la lista y `setParams({}, { replace: true })` cuando se llegó por enlace directo.

- [ ] **Step 1: Reemplazar `src/pages/Properties.jsx`**

```jsx
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Building2, ChevronLeft } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import useIsMobile from '../hooks/useIsMobile'
import { usePropertyFilters } from '../hooks/usePropertyFilters'
import PropertyFilters from '../components/Dashboard/PropertyFilters'
import PropertyList from '../components/Dashboard/PropertyList'
import PropertyDetails from '../components/Dashboard/PropertyDetails'

export default function Properties() {
    const { properties, tenants, payments, buildings, loading, openProperty, openBuilding, openPayment } = useApp()
    const [params, setParams] = useSearchParams()
    const navigate = useNavigate()
    const location = useLocation()
    const isMobile = useIsMobile()
    const filters = usePropertyFilters({ properties, tenants, payments })

    const selectedId = params.get('p')
    const selected = useMemo(() => properties.find(p => p.id === selectedId) || null, [properties, selectedId])

    // Desktop: default to the first property. Phone: no auto-select, the list is the landing view.
    useEffect(() => {
        if (!isMobile && !loading && !selected && properties.length > 0) {
            setParams({ p: properties[0].id }, { replace: true })
        }
    }, [isMobile, loading, selected, properties])

    const select = (property) => setParams({ p: property.id }, { state: { fromList: true } })
    // Came from the list in this session -> go back in history; opened by direct link -> just clear the id.
    const backToList = () => (location.state?.fromList ? navigate(-1) : setParams({}, { replace: true }))

    if (loading) {
        return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>
    }

    const showList = !isMobile || !selected
    const showDetail = !isMobile || !!selected

    return (
        <div className="space-y-3">
            {isMobile && selected ? (
                <button onClick={backToList} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                    <ChevronLeft className="w-4 h-4" /> Propiedades
                </button>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="flex items-center gap-2 text-xl font-bold">
                        Mis Propiedades
                        <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{properties.length}</span>
                    </h1>
                    <div className="flex items-center gap-1.5 max-md:w-full">
                        <button onClick={() => openBuilding()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50 max-md:flex-1 max-md:justify-center">
                            <Building2 className="w-3.5 h-3.5" /> Nuevo edificio
                        </button>
                        <button onClick={() => openProperty()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-semibold shadow-sm hover:brightness-105 max-md:flex-1 max-md:justify-center">
                            <Plus className="w-3.5 h-3.5" /> Nueva propiedad
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                {showList && (
                    <aside className="lg:col-span-4 xl:col-span-3 bg-white rounded-xl border border-brand-100 shadow-sm overflow-hidden lg:sticky lg:top-14">
                        <div className="p-2 border-b border-gray-100">
                            <PropertyFilters filters={filters} buildings={buildings} compact />
                        </div>
                        <div className="md:max-h-[320px] lg:max-h-[calc(100vh-170px)] md:overflow-y-auto">
                            <PropertyList
                                colorize
                                items={filters.filtered}
                                buildings={buildings}
                                selectedId={selected?.id}
                                onSelect={select}
                                onPay={(p) => openPayment({ propertyId: p.id })}
                                onEditBuilding={openBuilding}
                            />
                        </div>
                    </aside>
                )}
                {showDetail && (
                    <section className="lg:col-span-8 xl:col-span-9 bg-white rounded-xl border border-brand-100 shadow-sm min-w-0">
                        <PropertyDetails property={selected} onDeleted={() => setParams({}, { replace: true })} />
                    </section>
                )}
            </div>
        </div>
    )
}
```

(El estado `p` inválido en móvil muestra la lista: `selected` es `null` → `showList`. Al borrar una propiedad en móvil, `onDeleted` limpia `p` y vuelve a la lista.)

- [ ] **Step 2: `PropertyDetails.jsx` — cabecera, menú de pagos, barras de selección**

Import: `import RowMenu from '../Common/RowMenu'`.

Cabecera (precio y acciones a todo el ancho y alineados a la izquierda en móvil):

old:
```jsx
                <div className="text-right">
                    <p className="text-xl font-bold text-brand-700 leading-tight">{formatCurrency(property.monthly_rent)}</p>
```
new:
```jsx
                <div className="text-right max-md:w-full max-md:text-left">
                    <p className="text-xl font-bold text-brand-700 leading-tight">{formatCurrency(property.monthly_rent)}</p>
```

old: `<div className="flex items-center gap-1.5 justify-end">`
new: `<div className="flex flex-wrap items-center gap-1.5 justify-end max-md:justify-start">`

Barra de "Pagos" (puede envolver):

old: `<div className="flex items-center gap-1.5 pt-2">`
new: `<div className="flex flex-wrap items-center gap-1.5 pt-2">`

Acciones de cada pago: en móvil un menú "⋯", en escritorio los tres botones de siempre.

old:
```jsx
                                    <button onClick={() => generateReceiptPDF(payment, property, tenantFor(payment), settings || {})}
                                        aria-label="Imprimir recibo" title="Imprimir recibo"
                                        className="p-1 rounded text-gray-400 hover:text-brand-700 hover:bg-brand-50"><Printer className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingPayment(payment)} disabled={payment._pending}
                                        aria-label="Editar pago" title="Editar pago"
                                        className="p-1 rounded text-gray-400 hover:text-brand-700 hover:bg-brand-50"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => setDeleteIds([payment.id])} disabled={payment._pending}
                                        aria-label="Eliminar pago" title="Eliminar pago"
                                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
```
new:
```jsx
                                    <div className="hidden md:flex items-center gap-2">
                                        <button onClick={() => generateReceiptPDF(payment, property, tenantFor(payment), settings || {})}
                                            aria-label="Imprimir recibo" title="Imprimir recibo"
                                            className="p-1 rounded text-gray-400 hover:text-brand-700 hover:bg-brand-50"><Printer className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingPayment(payment)} disabled={payment._pending}
                                            aria-label="Editar pago" title="Editar pago"
                                            className="p-1 rounded text-gray-400 hover:text-brand-700 hover:bg-brand-50"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => setDeleteIds([payment.id])} disabled={payment._pending}
                                            aria-label="Eliminar pago" title="Eliminar pago"
                                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    <div className="md:hidden">
                                        <RowMenu title={monthLabel(payment.payment_month)} items={[
                                            { label: 'Imprimir recibo', icon: Printer, onClick: () => generateReceiptPDF(payment, property, tenantFor(payment), settings || {}) },
                                            !payment._pending && { label: 'Editar pago', icon: Pencil, onClick: () => setEditingPayment(payment) },
                                            !payment._pending && { label: 'Eliminar pago', icon: Trash2, danger: true, onClick: () => setDeleteIds([payment.id]) }
                                        ]} />
                                    </div>
```

Barras flotantes (dos, mismo prefijo): usar `replace_all` sobre

old: `className="sticky bottom-2 z-20 mx-auto w-fit max-w-full`
new: `className="sticky bottom-2 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mx-auto w-fit max-w-full`

- [ ] **Step 3: `YearlyPaymentGrid.jsx` — 4×3 en móvil**

old: `<div className="grid grid-cols-6 gap-1.5">`
new: `<div className="grid grid-cols-4 md:grid-cols-6 gap-1.5">`

old: `className={\`relative h-11 rounded-lg flex flex-col`
new: `className={\`relative h-12 md:h-11 rounded-lg flex flex-col`

old: `<span className="text-[11px] font-bold uppercase">{name}</span>`
new: `<span className="text-xs md:text-[11px] font-bold uppercase">{name}</span>`

old: `<span className="text-[9px] opacity-90 mt-0.5">{LABELS[status]}</span>`
new: `<span className="text-[10px] md:text-[9px] opacity-90 mt-0.5">{LABELS[status]}</span>`

- [ ] **Step 4: Verificar**

V1, V2 (1280×800 y 768×1024: lista + detalle lado a lado como antes; se auto-selecciona la primera propiedad). V3 a 390×844:
1. `/propiedades` sin `p` → lista a pantalla completa (sin auto-selección); al tocar una propiedad aparece el detalle con "← Propiedades"; el botón vuelve a la lista y el botón atrás del navegador también (Review Focus 3).
2. Abrir `/propiedades?p=<id válido>` directamente → detalle; "← Propiedades" muestra la lista; `/propiedades?p=inexistente` → lista, sin bucle.
3. Detalle: precio y botones (Pagar, Reporte, Editar, Eliminar) en una fila ancha; cuadrícula anual 4×3 con meses legibles; cada pago tiene "⋯" con recibo/editar/eliminar; en "Selección múltiple" y "Editar meses" la barra flotante queda **por encima** de la barra inferior y se pueden tocar sus botones.
4. Review Focus 4: con una propiedad abierta a 390px, ensanchar la ventana a 900px y volver a 390px → sigue la misma propiedad, sin pantalla en blanco.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Properties.jsx src/components/Dashboard/PropertyDetails.jsx src/components/Dashboard/YearlyPaymentGrid.jsx
git commit -m "feat(movil): propiedades maestro-detalle, cuadrícula anual 4x3 y menú de acciones por pago"
```

---

### Task 10: Edificios

**Files:**
- Modify: `src/pages/Buildings.jsx`, `src/pages/BuildingDetail.jsx`

- [ ] **Step 1: `Buildings.jsx` — acciones de la tarjeta en su propia fila en móvil**

old: `<div className="flex items-start gap-3">\n                            <span className="w-9 h-9 rounded-lg text-white`
new: `<div className="flex flex-wrap items-start gap-3">\n                            <span className="w-9 h-9 rounded-lg text-white`

old: `<Link to={\`/edificios/${building.id}\`} className="min-w-0 flex-1 group" title="Ver detalle del edificio">`
new: `<Link to={\`/edificios/${building.id}\`} className="min-w-0 flex-1 basis-40 group" title="Ver detalle del edificio">`

Envolver los tres controles (Ver, Editar, Eliminar) en un contenedor que en móvil ocupa la fila completa:

old:
```jsx
                            <Link to={`/edificios/${building.id}`} aria-label={`Ver ${building.name}`} title="Ver detalle"
```
new:
```jsx
                            <div className="flex items-center gap-2 max-md:w-full max-md:justify-end">
                            <Link to={`/edificios/${building.id}`} aria-label={`Ver ${building.name}`} title="Ver detalle"
```

old:
```jsx
                                className="p-1.5 rounded-md border border-red-100 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        </div>
```
new:
```jsx
                                className="p-1.5 rounded-md border border-red-100 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
```

El enlace "Ver" (`<a>`) también debe medir 44px: añadir `max-md:min-h-[44px] max-md:justify-center` a su `className` (`flex items-center gap-0.5 px-2 py-1.5 rounded-md border border-brand-200 ...`).

- [ ] **Step 2: `BuildingDetail.jsx`**

Volver, cabecera y filtros:

old: `<Link to="/edificios" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">`
new: `<Link to="/edificios" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline max-md:min-h-[44px]">`

old: `<div className="flex gap-2">\n                    <button onClick={() => openBuilding(building)}`
new: `<div className="flex gap-2 max-md:w-full">\n                    <button onClick={() => openBuilding(building)}`

old: `className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50">`
new: `className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 max-md:flex-1 max-md:justify-center">`

old: `<button onClick={() => openProperty(null, { buildingId: building.id })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 text-white text-xs font-semibold shadow-sm hover:brightness-105">\n                        <Plus className="w-3.5 h-3.5" /> Agregar propiedad`
new: igual con ` max-md:flex-1 max-md:justify-center` añadido al final de la clase.

old: `<div className="flex gap-1">\n                        {FILTERS.map(`
new: `<div className="flex gap-1 max-md:w-full max-md:overflow-x-auto scrollbar-none">\n                        {FILTERS.map(`

old: `className={\`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${filter === key`
new: `className={\`px-2.5 py-1 rounded-full text-xs font-semibold border transition max-md:px-4 max-md:shrink-0 max-md:whitespace-nowrap ${filter === key`

Filas de propiedades (anchos fijos pasan a automáticos en móvil):

old: `<span className="text-sm font-semibold text-gray-700 w-28 text-right">`
new: `<span className="text-sm font-semibold text-gray-700 w-28 max-md:w-auto text-right">`

old: `<div className="w-44"><StatusPill status={status} showDetail align="left" /></div>`
new: `<div className="w-44 max-md:w-auto"><StatusPill status={status} showDetail align="left" /></div>`

- [ ] **Step 3: Verificar**

V1, V2. V3 a 390: lista de edificios en 1 columna; en cada tarjeta, título legible y la fila Ver/Editar/Eliminar debajo, con botones de 44px; las cifras (`dl`) no se cortan; detalle de edificio con KPIs 2×2, filtros en una fila con scroll, cada propiedad con renta y estado visibles y botón "Cobrar"/"Asignar inquilino" tocable. Sin edificios → mensaje "Aún no hay edificios…" (Review Focus 5).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Buildings.jsx src/pages/BuildingDetail.jsx
git commit -m "feat(movil): edificios y detalle de edificio"
```

---

### Task 11: Ajustes, Login y Registro

**Files:**
- Modify: `src/pages/Settings.jsx`, `src/components/Settings/InvoiceSettings.jsx`, `src/pages/Login.jsx`, `src/pages/Register.jsx`

- [ ] **Step 1: `Settings.jsx` — pestañas con scroll y tarjeta con menos padding**

old: `<div className="flex gap-2 border-b-2 border-gray-200 mb-6">`
new: `<div className="flex gap-1 md:gap-2 overflow-x-auto scrollbar-none border-b-2 border-gray-200 mb-4 md:mb-6">`

old: `className={\`px-5 py-3 font-semibold text-[18px] border-b-4 transition ${`
new: `className={\`px-3 md:px-5 py-3 font-semibold text-base md:text-[18px] whitespace-nowrap shrink-0 border-b-4 transition ${`

old: `<div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-8">`
new: `<div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 md:p-8">`

old: `className="bg-brand-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-700 transition disabled:opacity-50 text-[18px]"`
new: `className="bg-brand-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-700 transition disabled:opacity-50 text-[18px] max-md:w-full"`

- [ ] **Step 2: `InvoiceSettings.jsx` — rejillas a 1 columna** (dos ocurrencias idénticas; usar `replace_all`)

old: `<div className="grid grid-cols-2 gap-5">`
new: `<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">`

- [ ] **Step 3: `Login.jsx` y `Register.jsx` — alto dinámico y menos padding**

`Login.jsx`: old `className="login-page min-h-screen flex items-center justify-center p-4 relative"` → new `className="login-page min-h-[100dvh] flex items-center justify-center p-4 relative"`. (El padding de `.login-container` baja a `1.75rem 1.25rem` en móvil por la regla de la Tarea 1; el botón `.btn-login` ya mide más de 44px.)

`Register.jsx` (cada una aparece dos veces —pantalla de éxito y formulario—; usar `replace_all`):
- old `className="min-h-screen bg-slate-900 flex items-center justify-center p-4"` → new `className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4"`
- old `shadow-xl p-8 w-full max-w-md` → new `shadow-xl p-5 md:p-8 w-full max-w-md`

- [ ] **Step 4: Verificar**

V1, V2 (1280: Ajustes, Login y Registro idénticos). V3 a 390×844: Ajustes con pestañas desplazables lateralmente y la activa visible; formulario de cuenta con inputs de 44px y botón ancho completo; pestaña "Factura" con campos en 1 columna; pestaña "Carta de cobro" sin scroll horizontal de página (si la tabla de la vista previa desborda, envolverla en `<div className="overflow-x-auto">`); "Equipo" y "Registro de errores" sin desbordar. Login y Registro: tarjeta con padding reducido, inputs sin zoom al enfocar, botón de enviar visible con el teclado abierto.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.jsx src/components/Settings/InvoiceSettings.jsx src/pages/Login.jsx src/pages/Register.jsx
git commit -m "feat(movil): ajustes, login y registro"
```

---

### Task 12: Verificación integral, ajustes finales y versión

**Files:**
- Modify (si aparece algo en la revisión): los archivos de las tareas anteriores
- Modify: `CHANGELOG.md`, `package.json`, `src/components/Layout/AppLayout.jsx` (versión en el pie)

- [ ] **Step 1: Barrido completo a 390×844**

Recorrer **todas** las rutas (`/`, `/propiedades`, `/propiedades?p=<id>`, `/inquilinos` en Activos y Antiguos, `/edificios`, `/edificios/<id>`, `/finanzas`, `/gastos` en Gas/Luz/Agua, `/settings` en sus 5 pestañas, `/login`, `/register`) y abrir los 11 modales (pago, pago múltiple, propiedad, inquilino, edificio, gas/luz/agua, pagar gas, editar pago, anular meses, reporte, recibo). En cada pantalla ejecutar los dos scripts de V3. Corregir lo que falle en el archivo correspondiente (los casos probables: botones de 44px que apretan una fila; usar `.no-touch` solo si el botón es un enlace de texto en línea).

- [ ] **Step 2: Casos del Review Focus**

Repasar los cinco puntos de la sección "Review Focus" y marcar cada uno como comprobado o corregido. Revisar además a 360×740 y 430×932, y a 768×1024 y 1280×800 (V2) que nada de escritorio cambió. Revisar `PropertyPicker` (desplegable `absolute` con `max-h-64`) dentro de la hoja de "Asignar inquilino": si queda cortado o fuera de pantalla, cambiar su contenedor a `max-md:fixed max-md:inset-x-3 max-md:bottom-3 max-md:max-h-[60dvh]`.

- [ ] **Step 3: Build y limpieza**

Run: `npm run build`
Expected: build OK, sin advertencias nuevas. Confirmar `git status` limpio de archivos efímeros (capturas, scripts de prueba: van al scratchpad de la sesión, nunca al repo) y que `.env` no está en el commit.

- [ ] **Step 4: Versión y CHANGELOG**

Subir `1.12.4` → `1.13.0` en `package.json` (`"version"`) y en el pie de `AppLayout.jsx` (`v1.12.4`). Añadir una entrada arriba de `CHANGELOG.md` con el mismo formato que la entrada más reciente del archivo, resumiendo: barra de navegación inferior, hojas inferiores para modales y alertas, tarjetas en Inquilinos/Gastos/Finanzas, Propiedades en maestro→detalle en móvil, cuadrícula anual 4×3, áreas táctiles de 44px e inputs a 16px.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "v1.13.0: interfaz optimizada para móvil"
```

- [ ] **Step 6: Revisión previa a integrar**

Pasar `/code-review` (y, si Warlin lo quiere, `/codex:review` — antes confirmar que `.env` está en `.gitignore`) sobre la rama; después `superpowers:finishing-a-development-branch` para integrar. Proponer `/clear` en el cierre.

---

## Self-Review

**Cobertura del spec**
- §3 Esqueleto (header, BottomNav, Más, padding, `viewport-fit`, 16px) → Tareas 1–2.
- §4 Modal como hoja, formularios a 1 columna, pie pegado → Tarea 3 (con la desviación 1). Tablas→tarjetas: Tenants (Registrar pago principal, "⋯", expandir), Expenses, Finances (edificio + detalle + selector de orden + gráficos revisados) → Tareas 5–7.
- §5 Inicio (acciones, KPIs, filtros en una fila, lista sin scroll interno, actividad plegada) → Tarea 8. PropertyList → Tarea 8. Propiedades maestro→detalle con `?p`, barras de selección elevadas → Tarea 9. YearlyPaymentGrid 4×3 → Tarea 9. Edificios → Tarea 10. Ajustes (pestañas, 1 columna; LetterSettings: desviación 4), Login/Register → Tarea 11. AlertDrawer, Toast, PropertyPicker, escala de z-index → Tareas 4 y 12 (z-index: Modal `z-50`, barra inferior/header `z-40`, backdrop del drawer `z-[49]`, toast `z-[70]`).
- §6 Verificación (360/390/430/768/1280, build, criterios) → Protocolo V1–V3 y Tarea 12.
- Gap conocido: el spec dice que "las tablas internas de Edificios usan tarjetas"; en el código no hay tablas en Edificios (usa tarjetas y chips), así que no hay tarea de conversión.

**Placeholders:** ninguno; todo cambio de código lleva el texto exacto. Las ediciones por "old/new" requieren cadenas únicas: donde un texto se repite se indica el contexto o `replace_all`.

**Consistencia de nombres:** `useIsMobile` (default export), `RowMenu({ title, items })`, `.sheet-actions`, `.animate-sheet-up`, `.scrollbar-none`, `.no-touch`, `Stat({ label, value, className })`, `TenantCard` — mismos nombres y firmas en todas las tareas que los usan.

**Review Focus:** los cinco puntos tienen su comprobación en la tarea que se indica y se repasan en la Tarea 12.
