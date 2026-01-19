# 📋 Instrucciones de Migración al Nuevo Proyecto Supabase

## Pasos a Seguir (EN ORDEN):

### 1. Limpiar Proyecto Viejo (OPCIONAL)
Si quieres eliminar las tablas del proyecto anterior:
- Ve al proyecto viejo en Supabase Dashboard
- SQL Editor → Ejecuta `000_cleanup_old_project.sql`
- Esto eliminará solo las tablas de rental, sin tocar otros datos

### 2. Configurar Proyecto Nuevo (OBLIGATORIO)
- Ve al NUEVO proyecto: https://supabase.com/dashboard/project/gmbxkyejsfexisrszpvc
- SQL Editor → Ejecuta `001_complete_setup.sql`
- Este script crea:
  - ✅ Tablas (properties, tenants, rent_payments, gas_consumption)
  - ✅ Índices para performance
  - ✅ RLS habilitado en todas las tablas
  - ✅ Políticas de seguridad user-based

### 3. Habilitar Auth en Supabase
- En el nuevo proyecto, ve a: Authentication → Settings
- Email Auth: Asegúrate que esté habilitado
- Email Confirmations: Puedes deshabilitarlo para testing rápido (o dejarlo habilitado para producción)

### 4. Actualizar App Local
- El archivo `.env` ya fue actualizado con las nuevas credenciales
- Para el dev server (`Ctrl+C`)
- Ejecuta: `npm run dev`
- Abre: http://localhost:5173

### 5. Primera Prueba
1. Crea una cuenta nueva (Register)
2. Login
3. Registra una propiedad
4. Verifica que se guarda correctamente
5. Abre otra sesión en navegador privado
6. Crea OTRA cuenta
7. Verifica que NO veas las propiedades del primer usuario

## ✅ Verificación Exitosa
Si cada usuario ve solo SUS datos → RLS está funcionando correctamente

## 🔐 Seguridad
- La `service_role` key NO está en `.env` visible
- Solo se usa para scripts admin si es necesario
- La app solo usa `anon_key` que es segura

## 🚀 Siguiente: Deploy
Una vez todo funcione localmente, procedemos con:
- Subir a GitHub
- Deploy en Vercel
