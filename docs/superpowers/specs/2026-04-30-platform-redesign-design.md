# Diseño: Rediseño Integral de la Plataforma de Alquiler

**Fecha:** 2026-04-30  
**Proyecto:** rental-management-system  
**Estado:** Aprobado — pendiente de implementación

---

## Contexto

La plataforma actual es funcional pero presenta tres problemas principales:
1. **Interfaz poco accesible** — texto pequeño, baja densidad de contraste, layout denso difícil de usar para adultos mayores con problemas de visión.
2. **Funcionalidad incompleta** — luz y agua marcadas como "pronto", el aumento anual solo acepta porcentaje, no se pueden regenerar facturas desde el historial, y las facturas tienen un diseño básico sin firma ni personalización.
3. **Organización de base de datos** — las 4 tablas del proyecto están mezcladas en `public` junto con otras tablas de otros proyectos del usuario.

---

## 1. Navegación y Layout

### Estructura
- **Sidebar izquierdo colapsable** con íconos grandes (32px) + etiquetas de texto
- Cuando está colapsado: solo íconos, tooltip al hover
- Cuando está expandido: ícono + texto en 16px mínimo, altura de ítem 52px
- **Barra superior:** marca, email del usuario, botón logout (siempre visible)

### 4 Secciones principales
| Ícono | Sección | Contenido |
|-------|---------|-----------|
| 📊 | Resumen | KPIs, alertas prominentes, acciones rápidas |
| 🏠 | Propiedades | Lista + detalles + historial de pagos |
| 👤 | Inquilinos | Tabla de inquilinos activos |
| 📝 | Gastos | Gas · Luz · Agua (tres sub-pestañas) |

Ajustes sigue como página separada accesible desde el header (ícono de engranaje).

---

## 2. Sistema de Diseño — Clean Light + Accesibilidad

### Paleta
- Fondo de página: `#f8fafc`
- Tarjetas/paneles: `#ffffff` con `border: 1px solid #e2e8f0`
- Acento primario: `#2563eb` (azul)
- Texto principal: `#0f172a` — contraste AAA sobre blanco
- Texto secundario: `#374151` — contraste AA mínimo
- **Prohibido:** texto gris claro (`#94a3b8` o más claro) sobre fondo blanco para contenido relevante

### Tipografía (accesibilidad prioritaria)
- Etiquetas y metadatos: **18px mínimo**
- Valores de KPI / montos: **24px mínimo**, `font-weight: 800`
- Texto en tablas: **16px mínimo**
- Títulos de sección: **20px**, `font-weight: 700`

### Interactividad
- Altura mínima de botones y campos: **48px**
- Focus ring visible: `outline: 3px solid #2563eb` con `outline-offset: 2px`
- Estados hover con cambio de color claramente visible (no solo opacidad)

---

## 3. Cambios Funcionales

### 3.1 Aumento Anual del Alquiler — Toggle % / RD$

**Dónde:** `RegisterPropertyModal.jsx` (campo `annual_increase_pct` existente)

**UI:** Toggle segmentado `[ % Porcentaje | RD$ Monto fijo ]` + campo numérico único + preview en tiempo real:
> *"Con 5% → RD$18,500 pasará a **RD$19,425** el próximo año"*

**DB:** Agregar columna `increase_type text DEFAULT 'percentage'` a `rental.properties`. El campo existente `annual_increase_pct` se reutiliza para ambos tipos — el tipo determina cómo interpretarlo.

**Archivos:** `RegisterPropertyModal.jsx`, migración SQL.

---

### 3.2 Luz y Agua Activadas

**Dónde:** Sección Gastos → sub-pestañas `Gas` / `Luz` / `Agua`

**Implementación:** Agregar columna `utility_type text DEFAULT 'gas'` a `rental.gas_consumption`. Un único modal genérico `RegisterUtilityModal.jsx` recibe `utilityType` como prop y adapta labels y unidades:
- Gas → m³, costo por m³
- Luz → kWh, costo por kWh  
- Agua → galones/m³, costo por unidad

El hook `useGasReadings.js` se renombra a `useUtilityReadings.js` y acepta un parámetro `utilityType` para filtrar. Todos los usos existentes de gas pasan `'gas'` explícitamente — sin cambio de comportamiento.

**Archivos:** `RegisterUtilityModal.jsx` (nuevo), `useGasReadings.js` → renombrar a `useUtilityReadings.js`, migración SQL.

---

### 3.3 Regenerar Factura desde Historial de Pagos

**Dónde:** `PropertyDetails.jsx` → historial de pagos (cada fila)

**UI:** Botón `🖨 Recibo` al final de cada fila del historial. Llama a `generateReceiptPDF()` con los datos del pago + datos del usuario desde `useUserSettings`.

**Archivos:** `PropertyDetails.jsx`, `pdfGenerator.js`.

---

### 3.4 Plantilla de Factura — Estilo Clásico y Elegante

**Rediseño de `pdfGenerator.js`:**
- Tipografía: `Times Roman` (la fuente serif nativa de jsPDF) para el cuerpo y nombre del negocio — equivalente funcional al estilo Georgia aprobado; Helvetica para datos secundarios y metadatos
- Reglas horizontales doradas (RGB: 184, 150, 46)
- Encabezado centrado: nombre del negocio + subtítulo + línea decorativa
- Tabla de conceptos con líneas `setDrawColor` doradas en header/footer
- Sección de firma: imagen cargada desde `user_settings.signature_url` renderizada con `addImage()`
- Footer: `info@optimard.com` · teléfono · nota personalizada del usuario

**Datos que usa:** `user_settings` del usuario actual (nombre, negocio, teléfono, email, firma, nota al pie).

---

### 3.5 Ajustes de Factura por Usuario

**Dónde:** `Settings.jsx` → nueva sección "Plantilla de Factura"

**Campos configurables:**
| Campo | Tipo | Notas |
|-------|------|-------|
| Nombre del arrendador | text | Aparece en firma y encabezado del emisor |
| Nombre del negocio | text | Aparece en header de la factura |
| Teléfono de contacto | text | Footer |
| Correo electrónico | email | Footer |
| Imagen de firma | file upload | PNG/JPG, se sube a Supabase Storage |
| Nota al pie | textarea | Texto libre, max 200 chars |

**Upload de firma:** `supabase.storage.from('signatures').upload(...)` en bucket privado. La URL se guarda en `user_settings.signature_url`.

**Preview en vivo:** Al guardar, muestra un mini-preview de la factura con los datos actualizados.

**Hook:** `useUserSettings.js` — `getSettings()`, `updateSettings()`, `uploadSignature()`.

---

## 4. Migración a Schema `rental`

### Por qué
Actualmente las tablas `properties`, `tenants`, `rent_payments` y `gas_consumption` están en `public` mezcladas con tablas de otros proyectos. El schema `rental` las agrupa y las identifica claramente.

### Pasos SQL
```sql
-- 1. Crear schema
CREATE SCHEMA IF NOT EXISTS rental;

-- 2. Mover tablas (preserva datos)
ALTER TABLE public.properties    SET SCHEMA rental;
ALTER TABLE public.tenants       SET SCHEMA rental;
ALTER TABLE public.rent_payments SET SCHEMA rental;
ALTER TABLE public.gas_consumption SET SCHEMA rental;

-- 3. Re-aplicar permisos (RLS sigue activo, pero GRANTs deben rehacerse en el nuevo schema)
GRANT USAGE ON SCHEMA rental TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA rental TO anon, authenticated;

-- 4. Nuevas columnas
ALTER TABLE rental.properties ADD COLUMN IF NOT EXISTS increase_type text DEFAULT 'percentage';
ALTER TABLE rental.gas_consumption ADD COLUMN IF NOT EXISTS utility_type text DEFAULT 'gas';

-- 5. Tabla de configuración de usuario
CREATE TABLE rental.user_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  landlord_name  text,
  business_name  text,
  phone          text,
  email          text,
  signature_url  text,
  invoice_footer text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON rental.user_settings TO authenticated;

-- 6. RLS en user_settings
ALTER TABLE rental.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON rental.user_settings
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Paso manual en Supabase
Dashboard → Settings → API → **Extra schemas** → agregar `rental`. Sin este paso el cliente JS no puede acceder al schema.

### Cambio en el cliente JS
```js
// src/lib/supabase.js
export const supabase = createClient(url, key, {
  db: { schema: 'rental' }
})
```

### Bucket de Supabase Storage
Crear bucket `signatures` (privado) desde el Dashboard o via SQL. Los archivos se acceden con `createSignedUrl()`.

---

## 5. Archivos a Modificar / Crear

| Acción | Archivo | Motivo |
|--------|---------|--------|
| Modificar | `src/lib/supabase.js` | Schema `rental` |
| Crear | `src/components/Layout/Sidebar.jsx` | Sidebar colapsable |
| Crear | `src/components/Layout/AppLayout.jsx` | Layout wrapper con sidebar |
| Modificar | `src/pages/Dashboard.jsx` | Usar AppLayout, reorganizar secciones |
| Modificar | `src/pages/Settings.jsx` | Agregar sección InvoiceSettings |
| Crear | `src/components/Settings/InvoiceSettings.jsx` | Form de ajustes de factura |
| Crear | `src/hooks/useUserSettings.js` | CRUD de user_settings + upload de firma |
| Modificar | `src/components/Dashboard/PropertyDetails.jsx` | Botón regenerar factura por pago |
| Modificar | `src/components/Modals/RegisterPropertyModal.jsx` | Toggle % / RD$ en aumento anual |
| Crear | `src/components/Modals/RegisterUtilityModal.jsx` | Modal genérico gas/luz/agua |
| Renombrar + modificar | `src/hooks/useGasReadings.js` → `useUtilityReadings.js` | Acepta parámetro `utilityType`, retrocompatible |
| Modificar | `src/lib/pdfGenerator.js` | Plantilla clásica + firma + user_settings |
| Modificar | `src/index.css` | Tokens de accesibilidad, sidebar styles |
| SQL | Migración Supabase | Schema rental + nuevas columnas + user_settings |

---

## 6. Funciones Existentes a Reutilizar

- `generateReceiptPDF()` en `src/lib/pdfGenerator.js` — rediseñar, no reescribir desde cero
- `useGasReadings.js` — extender con parámetro `utilityType`
- `useProperties()`, `useTenants()`, `usePayments()` — sin cambios de API, solo apuntan al nuevo schema
- `handleDataUpdate()` en `Dashboard.jsx` — mantener patrón de refresh global
- `useToast()` — reutilizar para feedback en InvoiceSettings

---

## 7. Verificación

1. **Schema rental:** Confirmar en Supabase Dashboard que las 4 tablas aparecen bajo `rental`, no `public`
2. **Cliente JS:** App carga sin errores 404 en queries tras cambio de schema
3. **Toggle aumento:** Registrar propiedad con `RD$ 1,000` fijo → verificar `increase_type = 'fixed'` en DB
4. **Luz/Agua:** Registrar lectura de luz → aparece en sub-pestaña Luz de Gastos, `utility_type = 'electricity'` en DB
5. **Regenerar factura:** Clic en `🖨 Recibo` en historial de pagos → PDF generado con diseño clásico y datos del pago
6. **Ajustes de factura:** Subir imagen de firma → guardar → generar factura → firma aparece en el PDF
7. **Sidebar:** Colapsar/expandir sidebar → layout se ajusta correctamente sin overflow
8. **Accesibilidad:** Ningún texto relevante por debajo de 16px, contraste verificado con DevTools
