# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

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
