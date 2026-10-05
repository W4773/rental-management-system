# 🚀 Guía de Deploy Manual - Rental Management System

Git no está instalado en tu sistema. Aquí está la guía paso a paso para subir manualmente:

---

## OPCIÓN 1: GitHub Web (MÁS RÁPIDO)

### Paso 1: Crear Repositorio en GitHub
1. Ve a https://github.com/new
2. **Repository name**: `rental-management-system`
3. **Description**: Sistema de gestión de alquileres multi-usuario
4. **Visibility**: Public (o Private si prefieres)
5. ✅ **NO** marques "Add README" (ya lo tienes)
6. Click "Create repository"

### Paso 2: Subir Código
1. En la página del repositorio recién creado, verás "uploading an existing file"
2. Click en ese link
3. Arrastra TODA la carpeta `rental-management-system` (o selecciona archivos)
4. **IMPORTANTE**: Asegúrate de NO subir:
   - `.env` (ya está en .gitignore)
   - `node_modules/` (se instalará en deploy)
   - Archivos `.sql` (opcional, mejor locales)
5. En el campo de commit message escribe:
   ```
   Initial commit: Rental Management System
   ```
6. Click "Commit changes"

---

## OPCIÓN 2: GitHub Desktop (RECOMENDADO)

### Instalar GitHub Desktop:
1. Descarga: https://desktop.github.com/
2. Instala y abre
3. Login con tu cuenta GitHub
4. Click "Add" → "Add existing repository"
5. Selecciona la carpeta: `C:\Users\warli\.gemini\antigravity\scratch\rental-management-system`
6. Click "Create repository"
7. En Summary escribe: "Initial commit"
8. Click "Commit to main"
9. Click "Publish repository"
10. Nombre: `rental-management-system`
11. Click "Publish Repository"

---

## 🌐 DEPLOY EN VERCEL

### Opción A: Interfaz Web (Más Fácil)
1. Ve a https://vercel.com/login
2. Login (conecta con GitHub si es necesario)
3. Click "Add New" → "Project"
4. **Import Git Repository**: Selecciona `rental-management-system`
5. **Framework Preset**: Detectará "Vite" automáticamente
6. **Root Directory**: `./` (dejar por defecto)
7. **Build Command**: `npm run build` (automático)
8. **Output Directory**: `dist` (automático)

### ⚙️ Variables de Entorno (CRÍTICO):
Antes de hacer deploy, en la sección "Environment Variables":

```
VITE_SUPABASE_URL = https://cfcssfwxdfgqpvyuepjo.supabase.co
VITE_SUPABASE_ANON_KEY = <anon key del proyecto cfcssfwxdfgqpvyuepjo>
```

8. Click "Deploy"
9. Espera 2-3 minutos
10. ✅ ¡Listo! Te dará una URL como: `https://rental-management-system-xxxxx.vercel.app`

---

## 📱 Probar en Producción

Una vez deployado:
1. Abre la URL de Vercel
2. Crea una cuenta
3. Login
4. Registra propiedades
5. **Prueba multi-usuario**:
   - Abre en navegador privado
   - Crea otra cuenta
   - Verifica que NO veas datos del primer usuario

---

## 🔄 Futuras Actualizaciones

### Si usas GitHub Desktop:
1. Haz cambios en el código
2. GitHub Desktop detectará cambios automáticamente
3. Escribe mensaje de commit
4. Click "Commit to main"
5. Click "Push origin"
6. Vercel redeploya automáticamente en ~2 min

### Si usas GitHub Web:
1. Ve al repositorio en GitHub
2. Navega al archivo a editar
3. Click "Edit" (ícono lápiz)
4. Haz cambios
5. Commit
6. Vercel redeploya automáticamente

---

## ❓ Problemas Comunes

### Error: "Module not found"
- Solución: Vercel no instaló dependencias → Revisa que `package.json` esté en la raíz

### Error: "Environment variable not found"
- Solución: Vercel → Project Settings → Environment Variables → Añadir las variables
- Redeploy: Deployments → Click "..." → Redeploy

### Página en blanco:
- Solución: Abre Developer Tools (F12)
- Revisa Console para errores
- Casi siempre es problema de variables de entorno

---

## 🎉 ¡Éxito!

Tu app ahora está en la nube, accesible desde cualquier lugar, con:
- ✅ Multi-usuario funcional
- ✅ Base de datos segura en Supabase
- ✅ Deploy automático en cada push
- ✅ HTTPS gratis de Vercel

**URL Final**: La verás en Vercel Dashboard
