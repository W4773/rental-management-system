# Interfaz optimizada para móvil — Diseño

Fecha: 2026-10-10 · Proyecto: Alquiler Pro (`rental-management-system`) · Estado: spec aprobado en conversación, pendiente de revisión escrita.

## 1. Objetivo y alcance

Al abrir la app desde un móvil (ancho < 768px) la interfaz debe estar pensada para móvil: táctil, legible y usable con una mano. No basta con que "no se rompa".

- **Paridad total de funciones:** todo lo que se hace en PC se puede hacer en el móvil; nada se oculta.
- **Fuera de alcance:** tablet y escritorio (≥ 768px) no cambian; lógica, datos, rutas, dependencias, colores y marca tampoco; limpieza de `src/index.css` (1440 líneas, parte parece sin uso).
- **Stack actual:** React 18 + Tailwind 3 + react-router 6. La app ya tiene algo de responsive (`sm:`/`md:` en header, KPIs en `grid-cols-2`) pero es una UI densa de escritorio (header de 48px, texto de 11–13px).

## 2. Enfoque

**Capa móvil sobre los componentes existentes** con los breakpoints de Tailwind: desde `md:` se conserva el comportamiento actual; por debajo se aplica el diseño móvil. No se crean vistas `*.mobile.jsx` ni detección de dispositivo (duplicaría lógica y cada corrección habría que hacerla dos veces).

Reglas comunes de móvil:
- Áreas táctiles ≥ 44×44px.
- Inputs a 16px (`text-base`, `md:text-sm`) para que iOS no haga zoom al enfocar.
- `viewport-fit=cover` y `env(safe-area-inset-*)` en elementos fijos.
- `100dvh` en lugar de `100vh`.
- Evitar scroll dentro de scroll en la página principal.

## 3. Esqueleto: header, navegación inferior, contenido

- **Header móvil:** 48px con logo, campana de alertas y avatar. Las pestañas salen de arriba. Ajustes y cerrar sesión pasan a "Más".
- **`BottomNav.jsx` (nuevo):** barra fija inferior de ~56px + `safe-area-inset-bottom`. Pestañas: Inicio, Propiedades, Inquilinos, Finanzas y **Más** (hoja inferior con Edificios, Gastos, Ajustes, Cerrar sesión). Pestaña activa con el color de marca. Solo visible `< md`.
- **Contenido:** padding inferior para que la barra no tape nada.
- **Archivos:** `Header.jsx`, `AppLayout.jsx`, `BottomNav.jsx`, `index.html` (`viewport-fit=cover`).

## 4. Modales, formularios y tablas → tarjetas

**`Modal.jsx` (un cambio para los 11 modales).** En móvil es una hoja inferior casi a pantalla completa (`h-[92dvh]`, esquinas superiores redondeadas). Los de tamaño `sm` se ajustan al contenido. Header fijo con botón cerrar de 44×44px; el cuerpo hace scroll interno con `overscroll-contain`. Prop opcional `footer` para dejar Cancelar/Guardar `sticky bottom-0` con área segura; los modales que hoy ponen sus botones dentro de `children` se migran de uno en uno. Desde `md:` queda como hoy.

**Formularios.** `FormInput` a 16px y altura mínima 44px en móvil. Los `grid-cols-2/3` de los modales pasan a 1 columna en móvil (2 columnas solo en pares cortos, p. ej. mes y año). `RegisterPropertyModal` apila sus dos mitades. Selects y fechas usan el control nativo.

**Tablas → tarjetas.** Bajo `md` la tabla se oculta y se muestra una lista de tarjetas con los mismos datos y acciones; desde `md:` sigue la tabla intacta. Cada página define una vez cómo se ve una fila y un componente decide tabla o tarjeta.

- **Tenants:** tarjeta con nombre, propiedad + edificio, `StatusPill` con detalle y teléfono (toque para llamar). **Registrar pago es el botón principal visible**; carta, reporte, editar y desvincular van en un menú "⋯". Cédula, entrada y depósito aparecen al expandir la tarjeta (hoy esas columnas se ocultan en pantallas chicas).
- **Expenses:** tarjeta con fecha/mes, monto y consumo (visible siempre; hoy se oculta bajo `sm`).
- **Finances:**
  - "Resumen por edificio" (8 columnas): una tarjeta por edificio con Cobrado/Esperado/Tasa arriba y Pendiente en rojo si hay deuda; unidades, ocupación y pend./atras. en una línea secundaria; tarjeta final de totales.
  - "Detalle por inquilino" (9 columnas con orden): tarjetas, con el orden convertido en un selector "Ordenar por". Se mantienen buscador, "Solo con deuda" y Exportar CSV.
  - Gráficos (`YearBars`, etc.) a 1 columna; se verifica que no se corten.

## 5. Inicio, propiedades, cuadrícula, edificios, ajustes, acceso y alertas

**Inicio (`Home.jsx`).**
- Título arriba; "Registrar pago" como botón ancho de 44px debajo; Inquilino, Propiedad y Edificio en una fila secundaria (Edificio ahora visible también bajo `sm`).
- KPIs 2×2 con el valor más grande; se comprueba que montos largos no se corten a 360px.
- Filtros: buscador en fila completa, chips de estado en **una sola fila con scroll horizontal**, select de edificio a ancho completo, todo a 44px.
- Lista a una columna sin `max-h` interno en móvil (la página hace scroll; encabezados de edificio `sticky` bajo el header).
- **Actividad reciente plegada por defecto** ("Ver actividad reciente" la despliega). Decisión confirmada por el usuario.

**`PropertyList`.** Filas de ~64px; botón de pago de 44×44px (hoy 28px); nombre 14px y detalle de estado 11px en móvil; encabezados de edificio colapsables con botón de editar a 44px.

**Propiedades (`Properties.jsx` + `PropertyDetails`).** Hoy en móvil es lista (máx. 320px) y detalle en la misma página. Pasa a **maestro → detalle**: al tocar una propiedad se muestra el detalle a pantalla completa con "← Propiedades". Se conserva `?p=<id>` (el botón atrás del móvil funciona y los enlaces existentes siguen abriendo el detalle). Datos en 1 columna; pagos y cuadrícula anual apilados. Las barras de selección `sticky bottom-2` suben `bottom-[calc(56px+env(safe-area-inset-bottom)+8px)]` para no quedar bajo la barra inferior.

**`YearlyPaymentGrid`.** De 6×2 a **4×3** en móvil; texto de mes/estado 12/10px; celdas de 48px; flechas de año con área de 44px; aro y check de selección más grandes.

**Edificios (`Buildings`, `BuildingDetail`).** Tarjetas a 1 columna; `dl` de cifras en 3 columnas con texto ajustado; detalle con KPIs 2×2; tablas internas con el patrón de tarjetas de la sección 4.

**Ajustes.** Secciones/pestañas con scroll horizontal si no caben; `InvoiceSettings`, `LetterSettings`, `TeamSection` y `ErrorLogSettings` en 1 columna; la tabla de `LetterSettings` pasa a tarjetas; botones de guardar a ancho completo.

**Login y Register.** `min-h-[100dvh]`, padding de tarjeta `p-5` en móvil, inputs a 16px, botón principal de 48px; se comprueba que el teclado no tape el botón de enviar.

**`AlertDrawer`.** Panel fijo de 300px a la derecha con estilos en línea → hoja inferior en móvil (ancho completo, `max-h-[85dvh]`), reutilizando el comportamiento de `Modal` cuando sea posible; filas con botones de 44px.

**Piezas transversales.**
- **`Toast`:** ancho completo con margen lateral y bajo el header (`top-14`) en móvil.
- **`PropertyPicker`:** se revisa dentro de hojas inferiores; si el desplegable queda cortado, pasa a lista a pantalla completa en móvil.
- **Z-index:** escala corta y explícita (barra inferior < hojas/drawer < toast) para que una hoja siempre quede sobre la barra inferior.

## 6. Verificación

- Revisión de cada pantalla y modal a **360, 390 y 430px**; **768 y 1280px** deben quedar idénticos a hoy.
- Con Playwright y sesión de prueba; si el login con Supabase lo impide, el usuario aporta capturas.
- Criterios: sin scroll horizontal de página, sin elementos tapados por la barra inferior o el teclado, áreas táctiles ≥ 44px, sin zoom de iOS al enfocar inputs, flujos clave completos en móvil (registrar pago, alta de inquilino/propiedad, ver alertas, exportar).
- `npm run build` sin errores.

## 7. Riesgos

- Modales con botones dentro de `children`: migración a `footer` uno a uno; mientras tanto siguen funcionando (solo sin pie fijo).
- Estilos antiguos en `index.css` (`.kpi-*`, `.table-*`, etc.) podrían interferir en móvil; se tratan solo si aparecen en las pruebas.
- Maestro → detalle cambia la navegación de Propiedades en móvil; se mitiga conservando `?p=<id>`.
