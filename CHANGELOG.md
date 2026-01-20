# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

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
