# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.12.0] - 2026-10-10

### Corregido
- **"Numeric field overflow" al registrar una propiedad**: un valor (típicamente un aumento fijo en RD$, p. ej. 5,000) no cabía en una columna numérica estrecha. Nueva migración `supabase/migrations/011_numeric_ranges.sql` que amplía las columnas de dinero y medidas (sin tocar datos). Además los formularios validan topes (precio, aumento %, aumento fijo, m², depósito) con mensajes claros y, si la base rechaza un número, la app dice qué campos pueden ser los culpables en lugar del error técnico. Consulta de diagnóstico de solo lectura: `supabase/diagnostics/numeric_columns.sql`.

### Agregado
- **Registro de errores temporal**: cada fallo de la app (errores no controlados, promesas rechazadas, errores de pantalla y respuestas fallidas de la base de datos con la tabla, el código, el detalle y los datos enviados) se guarda con ruta, versión y navegador, y se conserva **7 días**. Los datos sensibles (contraseñas, tokens, cédulas, teléfonos, correos) se ocultan, los repetidos se agrupan y, sin conexión, se guardan en el equipo y se envían al volver. Se consulta en **Ajustes → Registro de errores** (Copiar, Descargar JSON, Vaciar para el titular). Requiere `supabase/migrations/012_error_log.sql`; sin ella se guarda solo en el equipo.

### Cambiado
- La generación de historial en segundo plano ahora exige que ninguna de las tablas haya fallado al cargarse.

## [1.11.0] - 2026-10-08

### Agregado
- **Funciona con internet lento o inestable**: la app guarda en el equipo los últimos datos (propiedades, inquilinos, pagos, servicios, edificios y ajustes) y los muestra al instante al abrir; se actualizan en segundo plano. Si la conexión cae con la página abierta, se sigue viendo todo y aparece un aviso "Sin conexión · datos guardados (hace X)" con botón **Reintentar**; con conexión lenta se avisa "Conexión lenta".
- **Registrar pagos sin conexión**: el pago se guarda en una cola del equipo, aparece de inmediato con la marca **"Por enviar"** (se puede imprimir su recibo) y se envía solo, en orden y una sola vez, al volver la conexión (también tras recargar). Cada pago lleva un identificador propio, así un reintento nunca lo duplica. Si el servidor rechaza alguno, queda visible con opciones de reintentar o descartar. Los pagos sin enviar se conservan en el equipo hasta llegar al servidor.
- Las demás acciones (editar, borrar, marcar meses…) sin conexión responden al instante "Sin conexión: esta acción necesita internet" en lugar de quedarse esperando.
- Peticiones con tiempo límite y reintentos con espera creciente (solo lecturas; las escrituras nunca se repiten solas).

### Cambiado
- **Mucho menos tráfico**: una sola copia de los datos compartida por toda la app (antes cada ventana pedía las mismas tablas varias veces: ~11 peticiones al abrir), cambios en vivo aplicados directamente sin volver a descargar las tablas, métricas calculadas en memoria y refresco solo de lo necesario tras cada acción.
- **Carga inicial ~85 % más ligera**: el código principal baja de ~1.05 MB a ~160 KB; las páginas pesadas y la librería de PDF se descargan solo cuando se usan, y la fuente ya no bloquea la pantalla.
- Al cerrar sesión se borran del equipo los datos guardados.

### Limitaciones
- Sin conexión no se puede **abrir** la página desde cero (no es una app instalable/PWA); sí funciona si ya estaba abierta o se recarga con red lenta.

## [1.10.0] - 2026-10-08

### Agregado
- **Cambiar el precio sin alterar el histórico**: al editar el precio de una propiedad con inquilino o pagos, el formulario pide **"Aplicar el nuevo precio desde"** (propone el mes siguiente). Los pagos ya cobrados no cambian nunca y los meses anteriores sin cobrar conservan el precio que tenían. El historial de precios se guarda en `properties.rent_history` (migración `supabase/migrations/010_rent_history.sql`; sin ella el precio se guarda igual y la app avisa que los atrasos usarán el precio nuevo). El estado, las facturas pendientes, Finanzas y el historial generado usan el precio vigente de cada mes, y el cambio queda en el registro de actividad.

### Corregido
- **"Marcar pendiente / nulo / Quitar marca" ya no falla en silencio**: trabaja sobre los datos actuales de la base, convierte los registros existentes en lugar de borrarlos, comprueba cuántos registros se afectaron y verifica el resultado; los botones muestran "Guardando…" y siempre termina con un mensaje (éxito, "sin cambios" o el error). Una petición que no responde se corta a los 15 s con un aviso claro, tras reintentar una vez.

## [1.9.1] - 2026-10-07

### Cambiado
- **Pie de los documentos**: el nombre "Alquiler Pro" queda únicamente en la parte de abajo (recibo, reporte y carta); arriba, en el bloque de arrendador, en la firma y en la marca de agua va el nombre del arrendador.
- **Configuración compartida por el equipo**: los ajustes de documentos (nombre del arrendador, teléfono, correo, pie, firma y plantilla de la carta) son del equipo, no de cada usuario. Nueva migración `supabase/migrations/009_shared_settings.sql` para que los miembros los lean, los editen y suban la firma. Si el nombre del arrendador está vacío, dentro de un equipo se usa la cuenta del titular (igual para todos) en lugar de la cuenta de cada persona.
- Al guardar los ajustes, recibos, reportes y cartas usan los datos nuevos sin recargar la página.

## [1.9.0] - 2026-10-07

### Cambiado
- **Tu nombre en los documentos**: recibos, reportes de pago y cartas de cobro muestran tu nombre (el *Nombre del arrendador* de Ajustes → Factura; si está vacío, el nombre de tu cuenta y, si tampoco, tu correo) en el encabezado, en el bloque "Arrendador" y en la línea de firma, en lugar de "Alquiler Pro" / "Arrendador".
- **Marca de agua detrás del contenido**: ahora se dibuja primero (tenue, con tu nombre) y ya no tapa el texto; se eliminó la segunda marca fija "Documento auténtico". Las cartas de cobro también la llevan, y la vista previa de Ajustes la muestra.
- Los nombres largos se reducen para caber entre los márgenes del encabezado.

## [1.8.0] - 2026-10-06

### Cambiado
- **Los pagos se aplican en orden (lo más antiguo primero)**: elegir un mes significa "ponerme al día hasta ese mes". El pago completo suma todo lo pendiente hasta el mes elegido y un **pago parcial se descuenta de la factura pendiente más antigua**, luego de la siguiente; el formulario muestra cómo se repartirá. En "Selección múltiple", los meses anteriores pendientes se incluyen y se marcan como *anterior pendiente*.
- **Estado sin falsos atrasos**: como se paga en orden, un mes **sin ningún registro** anterior a un mes ya pagado se da por saldado (antes un inquilino con ingreso antiguo podía figurar "Atrasado" por meses sin registro aunque estuviera al día en el año). Las marcas de *pendiente*, los pagos parciales y los meses posteriores al último pago siguen contando como deuda. Finanzas no cuenta esos meses como "esperados".
- **Finanzas con enlaces**: inquilinos y propiedades abren su ficha, los edificios abren su detalle (también desde las gráficas y las listas) y los inquilinos antiguos abren Inquilinos → Antiguos filtrado por su nombre.

## [1.7.1] - 2026-10-06

### Corregido
- **Estado "Al día" incorrecto**: si un inquilino se registra con una fecha de ingreso reciente pero ya tiene meses anteriores en el historial (pagos, historial generado o marcas), el estado ahora cuenta desde su primer mes registrado; antes ignoraba los meses previos a la fecha de ingreso y mostraba "Al día" aunque el Estado anual tuviera meses pendientes.

### Cambiado
- **Edificios** muestra el nombre del inquilino (o "Vacante") junto a cada propiedad, también en "Sin edificio".
- **Carta de cobro**: se puede subir, cambiar y quitar la firma desde su configuración (es la misma firma de Factura) y se ve en la vista previa.

## [1.7.0] - 2026-10-06

### Agregado
- **Sección Finanzas** (`/finanzas`): indicadores del año (cobrado, esperado, tasa de cobro, pendiente por cobrar, promedio mensual, renta perdida por vacantes), gráfica de cobrado por mes, estado de las propiedades, cobrado y pendiente **por edificio**, mayores deudas, histórico por año y detalle **por inquilino** con búsqueda, orden, filtro "solo con deuda" y exportación a CSV. Selector de año y opción de incluir o no el historial generado.
- **Carta de cobro**: plantilla editable en Ajustes → *Carta de cobro* con variables dinámicas (`<<Nombre del inquilino>>`, `<<Meses pendientes>>`, `<<Detalle de meses>>`, `<<Monto adeudado>>`, etc.), dos diseños base (Formal y Cordial), vista previa en vivo y PDF de ejemplo. Se genera en PDF desde el detalle de la propiedad, Inquilinos y Finanzas para quien tenga meses pendientes. Requiere `supabase/migrations/008_letter_template.sql` para guardar la plantilla (sin ella se usa el diseño base).

## [1.6.1] - 2026-10-06

### Cambiado
- **Semáforo en Edificios**: punto verde (al día), **amarillo (1 mes pendiente)**, **rojo (2 o más meses)** y gris (vacante), con leyenda; el mismo punto en las filas del detalle del edificio.
- El contador "Atrasadas" se separa en **Pendientes** (1 mes) y **Atrasadas** (2+ meses) en las tarjetas y en el detalle del edificio, donde además hay filtro "Pendientes".

## [1.6.0] - 2026-10-06

### Agregado
- **Registro todo en uno**: al crear una propiedad, una sección opcional (separada por la línea *opcional*) permite registrar también a su inquilino; se crea el inquilino y su historial en el mismo paso.
- **Depósito en el inquilino** (`tenants.deposit_amount`, migración `007_tenant_deposit.sql`, que copia el depósito que ya tuviera la propiedad). Se ve en el detalle de la propiedad y en Inquilinos.
- **Color por edificio** (automático y fijo) en Edificios, detalle de edificio y Propiedades, aplicado también a sus unidades e inquilinos.

### Cambiado
- El incremento anual se indica como opcional.
- El depósito ya no se pide en la propiedad.
- Las unidades de cada edificio se ordenan alfabéticamente (1-A, 2-A, 10-A).

## [1.5.0] - 2026-10-06

### Agregado
- **Nueva identidad visual**: logo "Torres en alza" (símbolo, horizontal y apilado; color, negro y blanco), favicon y set de íconos web/PWA, y guía de marca (`docs/BRAND.md`, archivos en `docs/brand/`). El encabezado usa el logo real en lugar de un ícono genérico.

### Cambiado
- El mes en curso sin pago se muestra como **"Mes actual"** en gris (borde punteado) en lugar de "Pendiente", para no confundirlo con un mes vencido. Sigue siendo pagable.

### Corregido
- **Marcar como pendiente** un mes que estaba "pagado" automáticamente ya no falla por valores nulos: las marcas llevan fecha (día 1 del mes) y método válidos.

## [1.4.0] - 2026-10-06

### Agregado
- **Detalle de edificio** (`/edificios/:id`): al pulsar un edificio ves sus datos, KPIs (unidades, ocupación, renta mensual, monto atrasado, atrasadas) y la lista de unidades con inquilino, estado de pago y acciones (Cobrar / Asignar inquilino), con buscador y filtros (Todas, Ocupadas, Vacantes, Atrasadas). Desde ahí también puedes editar el edificio y agregar propiedades.

### Corregido
- Una pantalla ya no se queda en blanco ante un error de interfaz: se muestra un aviso con el detalle y opciones de recargar o ir al inicio (`ErrorBoundary`); el historial de pagos tolera pagos sin mes.

### Cambiado
- **Dirección automática**: al registrar una propiedad en un edificio con dirección, esta se toma del edificio (campo bloqueado, con la opción "Usar otra dirección").
- **Asignar inquilino**: el selector de propiedad muestra solo las **disponibles** (sin inquilino activo), con contador y filtro por edificio; si solo hay una, se preselecciona y se salta al paso 2.

## [1.3.0] - 2026-10-06

### Agregado
- **Editar pagos**: lápiz en cada pago del historial (monto, fecha, método, referencia, notas; recalcula saldo y estado).
- **Editar meses**: marca meses como **pendientes** o **nulos** (no cobrados, con motivo) en lote, o quita la marca. Los meses con pagos registrados están bloqueados. Requiere `supabase/migrations/006_payment_void.sql` para los nulos.
- Los meses nulos no cuentan como deuda, ni en alertas, ni en el monto atrasado, ni en la tasa de cobro; se ven grises rayados en el Estado anual.
- Documentación comercial en español e inglés: `README`, guía de uso, arquitectura, base de datos, despliegue y roadmap, con capturas de demostración.
- `LICENSE` (propietaria), `SECURITY.md` y `CONTRIBUTING.md`.

### Cambiado
- `MIGRATION_GUIDE.md` y `DEPLOY_GUIDE.md` pasan a `docs/DATABASE.md` y `docs/DEPLOY.md`.
- La tasa de cobro ya no cuenta marcas de mes sin dinero como pagos recibidos.

## [1.2.2] - 2026-10-05

### Agregado
- Incremento anual: campo **Fecha del primer aumento** (cuándo entra en vigor por primera vez; luego se repite cada año). El detalle de la propiedad muestra el próximo aumento y el monto resultante. Requiere `supabase/migrations/005_increase_start_date.sql`.

### Corregido
- Asignar inquilino fallaba con "Cannot read properties of undefined (reading 'monthly_rent')" en propiedades recién creadas, y dejaba el inquilino a medio crear. El modal usaba una copia desactualizada de la lista de propiedades; ahora usa la lista compartida y valida la propiedad antes de crear nada. Lo mismo en el modal de lecturas de servicios.

## [1.2.1] - 2026-10-05

### Cambiado
- Reglas del estado de pago: **Al día** = solo falta el mes actual (o nada); **Pendiente** = falta el mes anterior; **Atrasado** = falta el mes anterior y uno o más antes. El detalle indica los meses ("Debe jul – sep 2026 (3 meses)").

## [1.2.0] - 2026-10-05

### Agregado
- Sección **Edificios** en el header: editar nombre y dirección, ver unidades, ocupación y renta, eliminar y asignar propiedades sueltas.
- **Registro de actividad** en Inicio (quién hizo qué y cuándo). Requiere `supabase/migrations/004_activity_log.sql`.
- Inquilinos separados en **Activos** y **Antiguos**: el histórico conserva período, pagos y reporte PDF de cada inquilino anterior.
- Botón **Desvincular inquilino** en Propiedades (el inquilino pasa a Antiguos; no se borra nada).
- Selector de propiedad con **buscador** (propiedad, edificio, dirección o inquilino) en pagos, asignar inquilino, lecturas de servicios y reportes; muestra el edificio y el inquilino de cada propiedad, y al elegir una, su edificio.

### Corregido
- El estado de pago ya no marca "AL DÍA" a quien debe: se calcula mes a mes (incluye meses sin registro) y muestra hasta qué mes está atrasado ("Debe jul – sep 2026"). Alertas y "Monto atrasado" usan la misma lógica.

## [1.1.0] - 2026-10-05

### Agregado
- Navegación por rutas: Inicio, Propiedades, Inquilinos y Gastos; el logo "Alquiler Pro" lleva al Inicio.
- Edificios (nombre y dirección) con propiedades agrupadas por edificio. Requiere `supabase/migrations/002_buildings.sql` (esquema `rental`).
- Buscador por inquilino/propiedad con filtros de estado y edificio.
- Selección múltiple: pagos (reporte, recibo, eliminar) y meses (pagar varios a la vez).
- Reporte de pagos en PDF y recibo consolidado de varios meses.
- Iconos `lucide-react` en lugar de emoji; diseño más compacto.
- Ajustes → Equipo: ver, agregar (por correo) y quitar miembros de `rental.workspace_members`. Requiere `supabase/migrations/003_workspace_team.sql`.

### Cambiado
- Al registrar un pago se actualiza la vista sin recargar y se pregunta "¿Desea imprimir el recibo?" (Sí / Ahora no); ya no se abre una pestaña nueva.
- "Dashboard" ahora se llama "Inicio".

### Corregido
- Las suscripciones en tiempo real apuntaban al esquema `public`; ahora usan `rental`.
- Fechas de recibos sin desfase de zona horaria (mayo 1 ya no sale como abril).
- Migraciones y guías apuntan al proyecto y esquema correctos; `backup_*.json`, `.superpowers/` y `supabase/.temp/` dejan de versionarse.

## [1.0.1] - 2026-01-19

### Agregado
- Logo de Rental Manager como favicon
- Indicador de carga durante generación de PDF
- Tiempos de espera estratégicos para asegurar generación completa de PDF
- Documentación de versiones (CHANGELOG.md)

### Corregido
- **PDF Generation**: Cambio de Data URI a Blob URL para resolver problemas de:
  - Páginas en blanco al abrir PDF
  - Archivos descargados con extensión incorrecta (VHDX)
  - PDFs corruptos que no se podían abrir
- Tabla incorrecta en consulta de pagos (`payments` → `rent_payments`)
- Error de sintaxis JSX en `ReceiptPreview.jsx`
- Modal de registro de gas no mostraba última lectura

### Cambiado
- Versión actualizada de 1.0.0 a 1.0.1
- Texto del footer mejorado: "Desarrollado por Optimard, equipo especializado en la creación de soluciones innovadoras y adaptadas al cliente"
- Botón "Descargar PDF" cambiado a "Ver PDF" (abre en visor del navegador)
- Método de generación de PDF optimizado con compresión JPEG (80% calidad)

### Removido
- Botón "Enviar Correo" del recibo (limitación de `mailto:` con archivos adjuntos)

## [1.0.0] - 2026-01-18

### Agregado
- **Autenticación y Usuarios**
  - Sistema de login con Supabase Auth
  - Registro de nuevos usuarios
  - Recuperación de contraseña
  - Gestión de sesión persistente

- **Dashboard Principal**
  - Panel de métricas financieras (ingresos totales, pendientes)
  - Vista de propiedades con estado de inquilinos
  - Acciones rápidas (Registrar Pago, Nueva Propiedad, Registrar Gastos)
  - Botón flotante de notificaciones

- **Gestión de Propiedades**
  - CRUD completo de propiedades
  - Asignación de inquilinos a propiedades
  - Vista detallada de cada propiedad
  - Estados: Disponible, Ocupada, En Mantenimiento

- **Gestión de Inquilinos**
  - CRUD completo de inquilinos
  - Información de contacto completa
  - Historial de pagos por inquilino
  - Estado de cuenta (Al día, Atrasado)

- **Registro de Pagos**
  - Registro de pagos de alquiler
  - Cálculo automático de saldo pendiente
  - Filtrado por mes y año
  - Historial completo de transacciones

- **Consumo de Gas**
  - Registro de lecturas de medidor
  - Cálculo automático de consumo
  - Cálculo de monto a pagar basado en tarifa
  - Historial de lecturas por propiedad

- **Registro de Gastos**
  - Registro de gastos operativos
  - Categorización de gastos
  - Asociación a propiedades específicas
  - Filtrado por fecha y categoría

- **Generación de Recibos**
  - Vista previa de recibo en página dedicada
  - Generación de PDF con datos del pago
  - Diseño profesional del recibo
  - Información completa (inquilino, propiedad, monto, fecha)

- **Configuración**
  - Página de ajustes de usuario
  - Edición de perfil (nombre, email)
  - Cambio de contraseña
  - Cierre de sesión

- **Interfaz de Usuario**
  - Diseño responsivo con Tailwind CSS
  - Tema oscuro (slate-900)
  - Componentes reutilizables (Header, Footer, Modals)
  - Animaciones y transiciones suaves
  - Iconos emoji para mejor UX

### Tecnologías
- **Frontend**: React 18 + Vite
- **Estilos**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Routing**: React Router DOM v6
- **PDF**: jsPDF + html2canvas
- **Fechas**: date-fns
- **Deployment**: Vercel

### Base de Datos
- Tablas: `properties`, `tenants`, `rent_payments`, `gas_readings`, `expenses`
- Row Level Security (RLS) habilitado
- Políticas de acceso por usuario autenticado
- Triggers para actualización automática de timestamps

---

## Formato de Versionado

- **Major (X.0.0)**: Cambios incompatibles con versiones anteriores
- **Minor (0.X.0)**: Nueva funcionalidad compatible con versiones anteriores
- **Patch (0.0.X)**: Correcciones de bugs compatibles con versiones anteriores

## Enlaces

- [Repositorio GitHub](https://github.com/optimard/rental-management-system)
- [Producción](https://rental-management-system.vercel.app)
- [Documentación](https://github.com/optimard/rental-management-system/wiki)
