# 🏠 Rental Management System

Sistema de gestión de alquileres multi-usuario desarrollado con React, Vite, Tailwind CSS y Supabase.

## 🚀 Características

- ✅ **Multi-usuario** con autenticación segura
- ✅ **Gestión de propiedades** (CRUD completo)
- ✅ **Gestión de inquilinos** (asignación, historial)
- ✅ **Registro de pagos** (mensual, parcial, adelantado)
- ✅ **Consumo de gas** con cálculo automático
- ✅ **Generación de recibos** en PDF
- ✅ **Dashboard visual** con métricas en tiempo real
- ✅ **Row Level Security (RLS)** para aislamiento de datos

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + Vite
- **Estilos**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **PDF**: jsPDF + jsPDF-AutoTable
- **Routing**: React Router v6

## 📦 Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/W4773/rental-management-system.git
cd rental-management-system

# Instalar dependencias
npm install

# Configurar variables de entorno
# Crear archivo .env con:
# VITE_SUPABASE_URL=tu_url
# VITE_SUPABASE_ANON_KEY=tu_key

# Iniciar servidor de desarrollo
npm run dev
```

## 🗄️ Setup de Base de Datos

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar script `001_complete_setup.sql` en SQL Editor
3. Habilitar Email Auth en Authentication → Settings

## 🌐 Deploy en Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Variables de entorno requeridas:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📝 Licencia

MIT

## 👤 Autor

Desarrollado por [W4773](https://github.com/W4773)
