# Rediseño Integral de la Plataforma de Alquiler — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar visualmente la plataforma con estilo Clean Light accesible para adultos mayores, activar luz y agua como servicios adicionales, agregar toggle % / RD$ para el aumento anual, implementar ajustes de factura por usuario con firma, y migrar todas las tablas al schema `rental` de Supabase.

**Architecture:** El layout del Dashboard se reestructura con un `AppLayout` que incluye un `Sidebar` colapsable izquierdo con 4 secciones (Resumen, Propiedades, Inquilinos, Gastos). Las tablas de Supabase se mueven del schema `public` al schema `rental`. Un nuevo hook `useUtilityReadings` reemplaza `useGasReadings` añadiendo soporte para gas/luz/agua vía columna `utility_type`. Las facturas se redeseñan con estilo clásico (Times Roman, líneas doradas) y cargan datos del usuario desde una nueva tabla `rental.user_settings`.

**Tech Stack:** React 18, Supabase JS v2 (schema `rental`), jsPDF + jspdf-autotable, Tailwind CSS v3, date-fns, Supabase Storage

---

## Mapa de Archivos

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Modificar | `src/lib/supabase.js` | Schema `rental` por defecto |
| Crear | `src/hooks/useUtilityReadings.js` | CRUD lecturas con filtro `utility_type` |
| Eliminar | `src/hooks/useGasReadings.js` | Reemplazado por useUtilityReadings |
| Crear | `src/hooks/useUserSettings.js` | CRUD ajustes de factura + upload firma |
| Crear | `src/components/Layout/Sidebar.jsx` | Sidebar colapsable 4 secciones |
| Crear | `src/components/Layout/AppLayout.jsx` | Wrapper layout con sidebar |
| Modificar | `src/pages/Dashboard.jsx` | Restructura con AppLayout + secciones |
| Modificar | `src/pages/Settings.jsx` | Añade sección InvoiceSettings |
| Crear | `src/components/Settings/InvoiceSettings.jsx` | Form ajustes factura + upload firma |
| Modificar | `src/components/Modals/RegisterPropertyModal.jsx` | Toggle % / RD$ en aumento anual |
| Modificar | `src/components/Modals/RegisterGasModal.jsx` | Importar useUtilityReadings |
| Crear | `src/components/Modals/RegisterUtilityModal.jsx` | Modal genérico gas/luz/agua |
| Modificar | `src/components/Dashboard/PropertyDetails.jsx` | Botón 🖨 recibo + useUtilityReadings |
| Modificar | `src/lib/pdfGenerator.js` | Plantilla clásica elegante + firma |
| Modificar | `src/index.css` | Tokens accesibilidad + sidebar styles |

---

## Task 1: Migración SQL — Schema `rental`

**Files:**
- SQL via Supabase MCP (`mcp__claude_ai_Supabase__execute_sql`)

> ⚠️ Ejecutar **en este orden exacto**. El proyecto Supabase es `cfcssfwxdfgqpvyuepjo`.

- [ ] **Step 1.1: Crear schema y mover tablas**

```sql
-- Crear schema dedicado
CREATE SCHEMA IF NOT EXISTS rental;

-- Mover las 4 tablas (preserva todos los datos)
ALTER TABLE public.properties      SET SCHEMA rental;
ALTER TABLE public.tenants         SET SCHEMA rental;
ALTER TABLE public.rent_payments   SET SCHEMA rental;
ALTER TABLE public.gas_consumption SET SCHEMA rental;
```

- [ ] **Step 1.2: Restaurar permisos en el nuevo schema**

```sql
-- Acceso al schema
GRANT USAGE ON SCHEMA rental TO anon, authenticated;

-- Permisos en tablas
GRANT SELECT, INSERT, UPDATE, DELETE ON rental.properties      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rental.tenants         TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rental.rent_payments   TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rental.gas_consumption TO anon, authenticated;
```

- [ ] **Step 1.3: Agregar nuevas columnas**

```sql
-- Tipo de aumento anual en properties
ALTER TABLE rental.properties
  ADD COLUMN IF NOT EXISTS increase_type text DEFAULT 'percentage';

-- Tipo de servicio en gas_consumption
ALTER TABLE rental.gas_consumption
  ADD COLUMN IF NOT EXISTS utility_type text DEFAULT 'gas';
```

- [ ] **Step 1.4: Crear tabla user_settings**

```sql
CREATE TABLE rental.user_settings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  landlord_name  text,
  business_name  text,
  phone          text,
  email          text,
  signature_url  text,
  invoice_footer text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON rental.user_settings TO authenticated;

ALTER TABLE rental.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_settings" ON rental.user_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 1.5: Crear bucket de Storage para firmas**

En Supabase Dashboard → Storage → New bucket:
- Name: `signatures`
- Public: **true** (las URLs se usan en PDF, no contienen datos sensibles)

O via SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_signatures" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "public_read_signatures" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'signatures');
```

- [ ] **Step 1.6: Exponer schema en Supabase API**

Supabase Dashboard → Settings → API → **Extra schemas** → escribir `rental` → Save.

Sin este paso el cliente JS no puede acceder al schema via REST.

- [ ] **Step 1.7: Verificar migración**

En Supabase Dashboard → Table Editor: confirmar que las 4 tablas aparecen bajo schema `rental` y no bajo `public`. Las columnas nuevas `increase_type` y `utility_type` deben estar presentes.

---

## Task 2: Actualizar Cliente Supabase

**Files:**
- Modify: `src/lib/supabase.js`

- [ ] **Step 2.1: Agregar schema por defecto**

Reemplazar el contenido completo de `src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'rental' }
})
```

- [ ] **Step 2.2: Commit**

```bash
git add src/lib/supabase.js
git commit -m "feat: point Supabase client to rental schema"
```

---

## Task 3: Hook useUtilityReadings (reemplaza useGasReadings)

**Files:**
- Create: `src/hooks/useUtilityReadings.js`
- Delete: `src/hooks/useGasReadings.js`

- [ ] **Step 3.1: Crear useUtilityReadings.js**

```js
// src/hooks/useUtilityReadings.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useUtilityReadings(utilityType = null) {
    const [readings, setReadings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchReadings()
        const channel = `utility-${utilityType || 'all'}`
        const subscription = supabase
            .channel(channel)
            .on('postgres_changes',
                { event: '*', schema: 'rental', table: 'gas_consumption' },
                fetchReadings
            )
            .subscribe()
        return () => subscription.unsubscribe()
    }, [utilityType])

    async function fetchReadings() {
        try {
            let query = supabase
                .from('gas_consumption')
                .select('*')
                .order('reading_date', { ascending: false })
            if (utilityType) query = query.eq('utility_type', utilityType)
            const { data, error: fetchError } = await query
            if (fetchError) throw fetchError
            setReadings(data || [])
            setError(null)
        } catch (err) {
            console.error('Error fetching utility readings:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function addReading(readingData) {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')
            const payload = {
                ...readingData,
                user_id: user.id,
                utility_type: utilityType || readingData.utility_type || 'gas'
            }
            const { data, error: insertError } = await supabase
                .from('gas_consumption')
                .insert([payload])
                .select()
            if (insertError) throw insertError
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error adding utility reading:', err)
            return { data: null, error: err.message }
        }
    }

    async function updateReading(id, updates) {
        try {
            const { data, error: updateError } = await supabase
                .from('gas_consumption')
                .update(updates)
                .eq('id', id)
                .select()
            if (updateError) throw updateError
            return { data: data?.[0], error: null }
        } catch (err) {
            return { data: null, error: err.message }
        }
    }

    async function getLatestReadingForProperty(propertyId) {
        try {
            let query = supabase
                .from('gas_consumption')
                .select('*')
                .eq('property_id', propertyId)
                .order('reading_date', { ascending: false })
                .limit(1)
                .maybeSingle()
            if (utilityType) {
                query = supabase
                    .from('gas_consumption')
                    .select('*')
                    .eq('property_id', propertyId)
                    .eq('utility_type', utilityType)
                    .order('reading_date', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            }
            const { data, error: fetchError } = await query
            if (fetchError) throw fetchError
            return { data, error: null }
        } catch (err) {
            return { data: null, error: err.message }
        }
    }

    async function getReadingsByProperty(propertyId) {
        try {
            let query = supabase
                .from('gas_consumption')
                .select('*')
                .eq('property_id', propertyId)
                .order('reading_date', { ascending: false })
            if (utilityType) query = query.eq('utility_type', utilityType)
            const { data, error: fetchError } = await query
            if (fetchError) throw fetchError
            return { data: data || [], error: null }
        } catch (err) {
            return { data: [], error: err.message }
        }
    }

    return {
        readings,
        gasReadings: readings,      // alias para compatibilidad con Dashboard.jsx
        loading,
        error,
        addReading,
        addGasReading: addReading,  // alias para compatibilidad con RegisterGasModal.jsx
        updateReading,
        updateGasReading: updateReading,
        getLatestReadingForProperty,
        getReadingsByProperty,
        refresh: fetchReadings
    }
}
```

- [ ] **Step 3.2: Actualizar importaciones en Dashboard.jsx**

En `src/pages/Dashboard.jsx`, cambiar:
```js
// Antes:
import { useGasReadings } from '../hooks/useGasReadings'
// Después:
import { useUtilityReadings } from '../hooks/useUtilityReadings'
```

Y en la línea de desestructuración:
```js
// Antes:
const { gasReadings, refresh: refreshGas } = useGasReadings()
// Después:
const { gasReadings, refresh: refreshGas } = useUtilityReadings()
```

- [ ] **Step 3.3: Actualizar importaciones en PropertyDetails.jsx**

En `src/components/Dashboard/PropertyDetails.jsx`, cambiar:
```js
// Antes:
import { useGasReadings } from '../../hooks/useGasReadings'
// ...
const { getReadingsByProperty } = useGasReadings()
// Después:
import { useUtilityReadings } from '../../hooks/useUtilityReadings'
// ...
const { getReadingsByProperty } = useUtilityReadings()
```

- [ ] **Step 3.4: Actualizar importaciones en RegisterGasModal.jsx**

En `src/components/Modals/RegisterGasModal.jsx`, cambiar:
```js
// Antes:
import { useGasReadings } from '../../hooks/useGasReadings'
// ...
const { addGasReading, getLatestReadingForProperty } = useGasReadings()
// Después:
import { useUtilityReadings } from '../../hooks/useUtilityReadings'
// ...
const { addGasReading, getLatestReadingForProperty } = useUtilityReadings('gas')
```

- [ ] **Step 3.5: Eliminar useGasReadings.js y verificar que la app compila**

```bash
rm src/hooks/useGasReadings.js
cd "C:/Users/warli/.gemini/antigravity/scratch/rental-management-system"
npm run build 2>&1 | head -50
```

Si hay errores de import, buscar con: `grep -r "useGasReadings" src/`

- [ ] **Step 3.6: Commit**

```bash
git add src/hooks/useUtilityReadings.js src/pages/Dashboard.jsx src/components/Dashboard/PropertyDetails.jsx src/components/Modals/RegisterGasModal.jsx
git rm src/hooks/useGasReadings.js
git commit -m "feat: replace useGasReadings with useUtilityReadings (supports utility_type)"
```

---

## Task 4: Tokens de Accesibilidad en CSS

**Files:**
- Modify: `src/index.css`

- [ ] **Step 4.1: Agregar variables de accesibilidad al :root**

En `src/index.css`, dentro del bloque `:root { ... }` existente, agregar al final:

```css
  /* Accesibilidad — adultos mayores */
  --text-body-min: 16px;
  --text-label: 18px;
  --text-value: 24px;
  --text-title: 20px;
  --touch-min: 48px;
  --focus-ring: 0 0 0 3px rgba(37,99,235,0.5);
```

- [ ] **Step 4.2: Agregar estilos base de accesibilidad**

Al final de `src/index.css`, agregar:

```css
/* ===== ACCESSIBILITY BASE STYLES ===== */

/* Sidebar */
.sidebar-nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 8px;
    font-size: var(--text-label);
    font-weight: 600;
    min-height: var(--touch-min);
    transition: background-color 0.15s, color 0.15s;
    cursor: pointer;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
}

.sidebar-nav-item:hover {
    background: #f1f5f9;
    color: #1e3a8a;
}

.sidebar-nav-item.active {
    background: #eff6ff;
    color: #1d4ed8;
    border-left: 4px solid #2563eb;
}

.sidebar-nav-item:focus-visible {
    outline: 3px solid #2563eb;
    outline-offset: 2px;
}

/* Accessible form controls */
.accessible-input {
    min-height: var(--touch-min);
    font-size: var(--text-label);
    padding: 10px 14px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    color: #0f172a;
    width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.accessible-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: var(--focus-ring);
}

.accessible-label {
    font-size: var(--text-label);
    font-weight: 600;
    color: #374151;
    display: block;
    margin-bottom: 6px;
}

/* Section headers */
.section-title {
    font-size: var(--text-title);
    font-weight: 700;
    color: #0f172a;
}

/* KPI values */
.kpi-amount {
    font-size: var(--text-value);
    font-weight: 800;
    color: #0f172a;
}
```

- [ ] **Step 4.3: Commit**

```bash
git add src/index.css
git commit -m "feat: add accessibility tokens for large text and touch targets"
```

---

## Task 5: Sidebar y AppLayout

**Files:**
- Create: `src/components/Layout/Sidebar.jsx`
- Create: `src/components/Layout/AppLayout.jsx`

- [ ] **Step 5.1: Crear directorio Layout**

```bash
mkdir -p "C:/Users/warli/.gemini/antigravity/scratch/rental-management-system/src/components/Layout"
```

- [ ] **Step 5.2: Crear Sidebar.jsx**

```jsx
// src/components/Layout/Sidebar.jsx
import { useState } from 'react'

const SECTIONS = [
    { id: 'resumen',     icon: '📊', label: 'Resumen' },
    { id: 'propiedades', icon: '🏠', label: 'Propiedades' },
    { id: 'inquilinos',  icon: '👤', label: 'Inquilinos' },
    { id: 'gastos',      icon: '📝', label: 'Gastos' },
]

export default function Sidebar({ activeSection, onSectionChange }) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={`${collapsed ? 'w-16' : 'w-56'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 flex-shrink-0`}
            style={{ minHeight: 'calc(100vh - 65px)' }}
        >
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="self-end m-3 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                style={{ minHeight: '40px', minWidth: '40px' }}
            >
                {collapsed ? '→' : '←'}
            </button>

            <nav className="flex flex-col gap-1 px-2">
                {SECTIONS.map(section => (
                    <button
                        key={section.id}
                        onClick={() => onSectionChange(section.id)}
                        className={`sidebar-nav-item ${activeSection === section.id ? 'active' : ''}`}
                        title={collapsed ? section.label : undefined}
                    >
                        <span className="text-2xl flex-shrink-0">{section.icon}</span>
                        {!collapsed && <span>{section.label}</span>}
                    </button>
                ))}
            </nav>
        </aside>
    )
}
```

- [ ] **Step 5.3: Crear AppLayout.jsx**

```jsx
// src/components/Layout/AppLayout.jsx
import Header from '../Common/Header'
import Sidebar from './Sidebar'
import Footer from '../Common/Footer'

export default function AppLayout({ activeSection, onSectionChange, children }) {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            <Header />
            <div className="flex flex-1">
                <Sidebar activeSection={activeSection} onSectionChange={onSectionChange} />
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
            <Footer />
        </div>
    )
}
```

- [ ] **Step 5.4: Commit**

```bash
git add src/components/Layout/
git commit -m "feat: add collapsible Sidebar and AppLayout components"
```

---

## Task 6: Restructurar Dashboard con AppLayout y Secciones

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 6.1: Reemplazar Dashboard.jsx completo**

```jsx
// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import AppLayout from '../components/Layout/AppLayout'
import MetricsPanel from '../components/Dashboard/MetricsPanel'
import PropertyGrid from '../components/Dashboard/PropertyCarousel'
import PropertyDetails from '../components/Dashboard/PropertyDetails'
import FloatingNotificationButton from '../components/Dashboard/FloatingNotificationButton'
import QuickActions from '../components/Dashboard/QuickActions'
import TenantSection from '../components/Dashboard/TenantSection'
import RegisterPropertyModal from '../components/Modals/RegisterPropertyModal'
import AssignTenantModal from '../components/Modals/AssignTenantModal'
import RegisterPaymentModal from '../components/Modals/RegisterPaymentModal'
import RegisterUtilityModal from '../components/Modals/RegisterUtilityModal'
import Toast from '../components/Common/Toast'
import { useToast } from '../components/Common/Toast'
import { useProperties } from '../hooks/useProperties'
import { useTenants } from '../hooks/useTenants'
import { usePayments } from '../hooks/usePayments'
import { useUtilityReadings } from '../hooks/useUtilityReadings'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'

export default function Dashboard() {
    const { properties, loading: loadingProps, refresh: refreshProperties } = useProperties()
    const { tenants, closeTenant, refresh: refreshTenants } = useTenants()
    const { payments, refresh: refreshPayments } = usePayments()
    const { gasReadings, refresh: refreshGas } = useUtilityReadings()

    const [selectedYear] = useState(new Date().getFullYear())
    const metrics = useDashboardMetrics(selectedYear)

    const [activeSection, setActiveSection] = useState('resumen')
    const [selectedProperty, setSelectedProperty] = useState(null)

    const [isRegisterPropertyOpen, setIsRegisterPropertyOpen] = useState(false)
    const [isAssignTenantOpen, setIsAssignTenantOpen] = useState(false)
    const [isRegisterPaymentOpen, setIsRegisterPaymentOpen] = useState(false)
    const [utilityModalType, setUtilityModalType] = useState(null) // 'gas' | 'electricity' | 'water' | null

    const [paramTenantProperty, setParamTenantProperty] = useState(null)
    const [paramEditTenant, setParamEditTenant] = useState(null)

    const { toast, showToast, hideToast } = useToast()

    useEffect(() => {
        if (!selectedProperty && properties.length > 0) {
            setSelectedProperty(properties[0])
        }
    }, [properties, selectedProperty])

    const handleDataUpdate = () => {
        refreshProperties()
        refreshTenants()
        refreshPayments()
        refreshGas()
        showToast('Datos actualizados', 'success')
        setTimeout(() => window.location.reload(), 800)
    }

    const openAssignModal = (property = null, tenantToEdit = null) => {
        setParamTenantProperty(property || selectedProperty)
        setParamEditTenant(tenantToEdit)
        setIsAssignTenantOpen(true)
    }

    const handleUnassignTenant = async (tenantId) => {
        const { error } = await closeTenant(tenantId, new Date())
        if (error) {
            showToast('Error al desasignar inquilino', 'error')
        } else {
            handleDataUpdate()
        }
    }

    const activeTenantForSelected = tenants.find(t =>
        selectedProperty && t.property_id === selectedProperty.id && t.end_date === null
    )

    if (loadingProps || metrics.loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <AppLayout activeSection={activeSection} onSectionChange={setActiveSection}>

            {/* RESUMEN */}
            {activeSection === 'resumen' && (
                <div className="space-y-6">
                    <h2 className="section-title">Resumen General</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1">
                            <p className="accessible-label mb-3">Acciones Rápidas</p>
                            <QuickActions
                                onNewPayment={() => setIsRegisterPaymentOpen(true)}
                                onNewProperty={() => setIsRegisterPropertyOpen(true)}
                                onRegisterGas={() => setUtilityModalType('gas')}
                                onRegisterElectricity={() => setUtilityModalType('electricity')}
                                onRegisterWater={() => setUtilityModalType('water')}
                                onNewTenant={() => openAssignModal()}
                            />
                        </div>
                        <div className="lg:col-span-3">
                            <p className="accessible-label mb-3">Resumen Financiero</p>
                            <MetricsPanel
                                properties={properties}
                                tenants={tenants}
                                payments={payments}
                                gasReadings={gasReadings}
                            />
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <div className="bg-white p-5 rounded-xl border-2 border-gray-200 flex items-center justify-between">
                                    <div>
                                        <p className="accessible-label">Tasa de Cobro</p>
                                        <p className={`kpi-amount ${metrics.collectionRate >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {metrics.collectionRate}%
                                        </p>
                                    </div>
                                    <span className="text-3xl">📊</span>
                                </div>
                                <div className="bg-white p-5 rounded-xl border-2 border-gray-200 flex items-center justify-between">
                                    <div>
                                        <p className="accessible-label">Ocupación</p>
                                        <p className={`kpi-amount ${metrics.occupancyRate === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                                            {metrics.occupancyRate}%
                                        </p>
                                    </div>
                                    <span className="text-3xl">🏠</span>
                                </div>
                                <div className="bg-white p-5 rounded-xl border-2 border-gray-200 flex items-center justify-between">
                                    <div>
                                        <p className="accessible-label">Alertas</p>
                                        <p className={`kpi-amount ${metrics.alerts.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {metrics.alerts.length}
                                        </p>
                                    </div>
                                    <span className="text-3xl">⚠️</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PROPIEDADES */}
            {activeSection === 'propiedades' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="section-title">Mis Propiedades</h2>
                        <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">{properties.length}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: '600px' }}>
                        <div className="lg:col-span-4 flex flex-col">
                            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-3">
                                <PropertyGrid
                                    properties={properties}
                                    tenants={tenants}
                                    payments={payments}
                                    onSelectProperty={setSelectedProperty}
                                    selectedProperty={selectedProperty}
                                    isVertical={true}
                                />
                            </div>
                        </div>
                        <div className="lg:col-span-8 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200">
                            <PropertyDetails
                                property={selectedProperty}
                                activeTenant={activeTenantForSelected}
                                onEditTenant={(tenant) => openAssignModal(selectedProperty, tenant)}
                                onChangeTenant={() => openAssignModal(selectedProperty, null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* INQUILINOS */}
            {activeSection === 'inquilinos' && (
                <TenantSection
                    tenants={tenants}
                    properties={properties}
                    onNewTenant={() => openAssignModal()}
                    onUnassignTenant={handleUnassignTenant}
                    onEditTenant={(tenant) => openAssignModal(null, tenant)}
                />
            )}

            {/* GASTOS */}
            {activeSection === 'gastos' && (
                <GastosSection
                    onRegisterGas={() => setUtilityModalType('gas')}
                    onRegisterElectricity={() => setUtilityModalType('electricity')}
                    onRegisterWater={() => setUtilityModalType('water')}
                    properties={properties}
                />
            )}

            <FloatingNotificationButton alerts={metrics.alerts} />

            {/* Modales */}
            <RegisterPropertyModal
                isOpen={isRegisterPropertyOpen}
                onClose={() => setIsRegisterPropertyOpen(false)}
                onSuccess={handleDataUpdate}
            />
            <AssignTenantModal
                isOpen={isAssignTenantOpen}
                onClose={() => setIsAssignTenantOpen(false)}
                property={paramTenantProperty}
                tenantToEdit={paramEditTenant}
                onSuccess={handleDataUpdate}
            />
            <RegisterPaymentModal
                isOpen={isRegisterPaymentOpen}
                onClose={() => setIsRegisterPaymentOpen(false)}
                onSuccess={handleDataUpdate}
            />
            <RegisterUtilityModal
                isOpen={utilityModalType !== null}
                utilityType={utilityModalType}
                onClose={() => setUtilityModalType(null)}
                onSuccess={handleDataUpdate}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </AppLayout>
    )
}

// Inline component — simple placeholder para Gastos (se expande en Task 9)
function GastosSection({ onRegisterGas, onRegisterElectricity, onRegisterWater, properties }) {
    const [activeTab, setActiveTab] = useState('gas')
    const { readings } = useUtilityReadings(activeTab === 'gas' ? 'gas' : activeTab === 'electricity' ? 'electricity' : 'water')

    const tabs = [
        { id: 'gas',         icon: '🔥', label: 'Gas' },
        { id: 'electricity', icon: '💡', label: 'Luz' },
        { id: 'water',       icon: '💧', label: 'Agua' },
    ]
    const handlers = { gas: onRegisterGas, electricity: onRegisterElectricity, water: onRegisterWater }

    return (
        <div className="space-y-6">
            <h2 className="section-title">Gastos de Servicios</h2>
            <div className="flex gap-2 border-b-2 border-gray-200">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-3 font-semibold text-[18px] border-b-4 transition ${
                            activeTab === tab.id
                                ? 'border-blue-600 text-blue-700'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                        style={{ minHeight: '48px' }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>
            <div className="flex justify-end">
                <button
                    onClick={handlers[activeTab]}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-lg transition text-[18px]"
                    style={{ minHeight: '48px' }}
                >
                    + Registrar lectura
                </button>
            </div>
            {readings.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
                    <p className="text-gray-500 text-[18px]">No hay registros de {tabs.find(t => t.id === activeTab)?.label.toLowerCase()}</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                    <table className="w-full text-[16px]">
                        <thead className="border-b-2 border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-5 py-4 text-left font-bold text-gray-700">Propiedad</th>
                                <th className="px-5 py-4 text-left font-bold text-gray-700">Fecha</th>
                                <th className="px-5 py-4 text-left font-bold text-gray-700">Consumo</th>
                                <th className="px-5 py-4 text-right font-bold text-gray-700">Costo</th>
                                <th className="px-5 py-4 text-right font-bold text-gray-700">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {readings.map(r => {
                                const prop = properties.find(p => p.id === r.property_id)
                                return (
                                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-5 py-4 font-medium text-gray-900">{prop?.name || '—'}</td>
                                        <td className="px-5 py-4 text-gray-700">{new Date(r.reading_date + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-5 py-4 text-gray-700">{r.consumption_volume} {activeTab === 'electricity' ? 'kWh' : activeTab === 'water' ? 'm³' : 'GL'}</td>
                                        <td className="px-5 py-4 text-right font-bold text-gray-900">RD${parseFloat(r.total_cost).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-5 py-4 text-right">
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${r.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {r.paid ? '✅ Pagado' : '⏳ Pendiente'}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 6.2: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: restructure Dashboard with AppLayout, sidebar sections, and Gastos tab"
```

---

## Task 7: Toggle % / RD$ en RegisterPropertyModal

**Files:**
- Modify: `src/components/Modals/RegisterPropertyModal.jsx`

- [ ] **Step 7.1: Agregar `increase_type` al estado del formulario**

En `RegisterPropertyModal.jsx`, modificar `EMPTY_FORM`:

```js
const EMPTY_FORM = {
    name: '',
    address: '',
    monthly_rent: '',
    bedrooms: '',
    bathrooms: '',
    property_type: 'apartamento',
    unit_number: '',
    square_meters: '',
    notes: '',
    contract_start_date: '',
    deposit_amount: '',
    annual_increase_pct: '',
    increase_type: 'percentage'  // ← nuevo campo
}
```

- [ ] **Step 7.2: Reemplazar el campo `annual_increase_pct` con toggle + preview**

Buscar el bloque `<FormInput label="Incremento anual (%)".../>` (línea ~230 de RegisterPropertyModal.jsx) y reemplazarlo con:

```jsx
<div className="mb-3">
    <label className="accessible-label">Incremento Anual</label>
    {/* Toggle tipo */}
    <div className="flex rounded-lg overflow-hidden border-2 border-gray-200 mb-2" style={{ height: '48px' }}>
        <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, increase_type: 'percentage' }))}
            className={`flex-1 font-semibold text-[16px] transition ${
                formData.increase_type === 'percentage'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
        >
            % Porcentaje
        </button>
        <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, increase_type: 'fixed' }))}
            className={`flex-1 font-semibold text-[16px] transition ${
                formData.increase_type === 'fixed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
        >
            RD$ Monto Fijo
        </button>
    </div>
    {/* Campo de valor */}
    <div className="flex items-center gap-2">
        <input
            type="number"
            name="annual_increase_pct"
            value={formData.annual_increase_pct}
            onChange={handleChange}
            placeholder={formData.increase_type === 'percentage' ? 'Ej: 5' : 'Ej: 1000'}
            min="0"
            step={formData.increase_type === 'percentage' ? '0.1' : '1'}
            className="accessible-input flex-1"
        />
        <span className="text-[18px] font-bold text-gray-600 min-w-[40px]">
            {formData.increase_type === 'percentage' ? '%' : 'RD$'}
        </span>
    </div>
    {/* Preview */}
    {formData.annual_increase_pct && formData.monthly_rent && (
        <p className="mt-2 text-[16px] text-blue-700 bg-blue-50 px-3 py-2 rounded-lg font-medium">
            {formData.increase_type === 'percentage'
                ? `Con ${formData.annual_increase_pct}% → RD$${(parseFloat(formData.monthly_rent) * (1 + parseFloat(formData.annual_increase_pct) / 100)).toLocaleString('es-DO', { minimumFractionDigits: 2 })} el próximo año`
                : `RD$${parseFloat(formData.monthly_rent).toLocaleString('es-DO')} + RD$${parseFloat(formData.annual_increase_pct).toLocaleString('es-DO')} = RD$${(parseFloat(formData.monthly_rent) + parseFloat(formData.annual_increase_pct)).toLocaleString('es-DO', { minimumFractionDigits: 2 })} el próximo año`
            }
        </p>
    )}
</div>
```

- [ ] **Step 7.3: Incluir `increase_type` en propertyData del handleSubmit**

En `handleSubmit`, dentro del objeto `propertyData`, agregar:

```js
increase_type: formData.increase_type || 'percentage',
```

- [ ] **Step 7.4: Commit**

```bash
git add src/components/Modals/RegisterPropertyModal.jsx
git commit -m "feat: add annual increase type toggle (percentage vs fixed amount)"
```

---

## Task 8: RegisterUtilityModal (Gas, Luz, Agua)

**Files:**
- Create: `src/components/Modals/RegisterUtilityModal.jsx`

- [ ] **Step 8.1: Crear RegisterUtilityModal.jsx**

```jsx
// src/components/Modals/RegisterUtilityModal.jsx
import { useState, useEffect } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { useUtilityReadings } from '../../hooks/useUtilityReadings'
import { useProperties } from '../../hooks/useProperties'

const UTILITY_CONFIG = {
    gas: {
        label: 'Gas',
        icon: '🔥',
        unit: 'GL',
        unitLabel: 'Galones',
        costLabel: 'Costo por galón (RD$)',
        costPlaceholder: '150',
    },
    electricity: {
        label: 'Luz (Electricidad)',
        icon: '💡',
        unit: 'kWh',
        unitLabel: 'Kilowatts/hora',
        costLabel: 'Costo por kWh (RD$)',
        costPlaceholder: '12',
    },
    water: {
        label: 'Agua',
        icon: '💧',
        unit: 'm³',
        unitLabel: 'Metros cúbicos',
        costLabel: 'Costo por m³ (RD$)',
        costPlaceholder: '50',
    },
}

const EMPTY_FORM = {
    property_id: '',
    reading_date: new Date().toISOString().split('T')[0],
    current_reading: '',
    previous_reading: '',
    cost_per_unit: '',
}

export default function RegisterUtilityModal({ isOpen, utilityType, onClose, onSuccess }) {
    const { properties } = useProperties()
    const { addReading, getLatestReadingForProperty } = useUtilityReadings(utilityType)
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    const config = UTILITY_CONFIG[utilityType] || UTILITY_CONFIG.gas

    const consumption = formData.current_reading && formData.previous_reading
        ? Math.max(0, parseFloat(formData.current_reading) - parseFloat(formData.previous_reading))
        : 0

    const totalCost = consumption && formData.cost_per_unit
        ? consumption * parseFloat(formData.cost_per_unit)
        : 0

    useEffect(() => {
        if (!isOpen) return
        setFormData(EMPTY_FORM)
        setErrors({})
    }, [isOpen, utilityType])

    const handlePropertyChange = async (e) => {
        const propertyId = e.target.value
        setFormData(prev => ({ ...prev, property_id: propertyId, previous_reading: '' }))
        if (propertyId) {
            const { data: latest } = await getLatestReadingForProperty(propertyId)
            if (latest) {
                setFormData(prev => ({ ...prev, property_id: propertyId, previous_reading: String(latest.current_reading) }))
            }
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
    }

    const validate = () => {
        const newErrors = {}
        if (!formData.property_id) newErrors.property_id = 'Selecciona una propiedad'
        if (!formData.reading_date) newErrors.reading_date = 'La fecha es obligatoria'
        if (!formData.current_reading || parseFloat(formData.current_reading) <= 0)
            newErrors.current_reading = 'Ingresa la lectura actual'
        if (formData.previous_reading && parseFloat(formData.current_reading) < parseFloat(formData.previous_reading))
            newErrors.current_reading = 'La lectura actual no puede ser menor a la anterior'
        if (!formData.cost_per_unit || parseFloat(formData.cost_per_unit) <= 0)
            newErrors.cost_per_unit = 'Ingresa el costo por unidad'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return
        setLoading(true)
        try {
            const { error } = await addReading({
                property_id: formData.property_id,
                reading_date: formData.reading_date,
                current_reading: parseFloat(formData.current_reading),
                consumption_volume: consumption,
                total_cost: totalCost,
                paid: false,
                payment_date: null,
                utility_type: utilityType,
            })
            if (error) throw new Error(error)
            if (onSuccess) onSuccess()
            onClose()
        } catch (err) {
            setErrors({ submit: err.message })
        } finally {
            setLoading(false)
        }
    }

    if (!utilityType) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${config.icon} Registrar ${config.label}`} size="md">
            <form onSubmit={handleSubmit}>
                <FormInput
                    label="Propiedad"
                    name="property_id"
                    type="select"
                    value={formData.property_id}
                    onChange={handlePropertyChange}
                    error={errors.property_id}
                    required
                >
                    <option value="">Seleccionar propiedad...</option>
                    {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name} — {p.address}</option>
                    ))}
                </FormInput>

                <FormInput
                    label="Fecha de Lectura"
                    name="reading_date"
                    type="date"
                    value={formData.reading_date}
                    onChange={handleChange}
                    error={errors.reading_date}
                    required
                    max={new Date().toISOString().split('T')[0]}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        label={`Lectura Anterior (${config.unit})`}
                        name="previous_reading"
                        type="number"
                        value={formData.previous_reading}
                        onChange={handleChange}
                        placeholder="Auto desde última lectura"
                        min="0"
                        step="0.01"
                    />
                    <FormInput
                        label={`Lectura Actual (${config.unit})`}
                        name="current_reading"
                        type="number"
                        value={formData.current_reading}
                        onChange={handleChange}
                        error={errors.current_reading}
                        required
                        placeholder="Ej: 245"
                        min="0"
                        step="0.01"
                    />
                </div>

                <FormInput
                    label={config.costLabel}
                    name="cost_per_unit"
                    type="number"
                    value={formData.cost_per_unit}
                    onChange={handleChange}
                    error={errors.cost_per_unit}
                    required
                    placeholder={config.costPlaceholder}
                    min="0"
                    step="0.01"
                />

                {consumption > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-[16px] font-semibold text-blue-800">
                            Consumo: <strong>{consumption.toFixed(2)} {config.unit}</strong>
                        </p>
                        {totalCost > 0 && (
                            <p className="text-[18px] font-bold text-blue-900 mt-1">
                                Total: <strong>RD${totalCost.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong>
                            </p>
                        )}
                    </div>
                )}

                {errors.submit && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[16px]">
                        {errors.submit}
                    </div>
                )}

                <div className="flex gap-3 justify-end mt-6">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Guardando...' : 'Registrar Lectura'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
```

- [ ] **Step 8.2: Actualizar QuickActions.jsx para activar luz y agua**

En `src/components/Dashboard/QuickActions.jsx`, modificar la firma del componente y los botones desactivados:

```jsx
export default function QuickActions({ onNewPayment, onNewProperty, onRegisterGas, onRegisterElectricity, onRegisterWater, onNewTenant }) {
```

Y reemplazar los botones "Luz (Pronto)" y "Agua (Pronto)" con:

```jsx
<button
    className="w-full text-left px-4 py-3 hover:bg-yellow-50 hover:text-yellow-600 transition flex items-center gap-2 border-b border-gray-50 font-medium"
    onClick={() => { onRegisterElectricity(); setShowExpensesMenu(false) }}
>
    <span>💡</span> Luz (Electricidad)
</button>
<button
    className="w-full text-left px-4 py-3 hover:bg-blue-50 hover:text-blue-600 transition flex items-center gap-2 border-b border-gray-50 font-medium"
    onClick={() => { onRegisterWater(); setShowExpensesMenu(false) }}
>
    <span>💧</span> Agua
</button>
```

- [ ] **Step 8.3: Commit**

```bash
git add src/components/Modals/RegisterUtilityModal.jsx src/components/Dashboard/QuickActions.jsx
git commit -m "feat: add RegisterUtilityModal for gas/electricity/water; activate luz and agua"
```

---

## Task 9: Hook useUserSettings

**Files:**
- Create: `src/hooks/useUserSettings.js`

- [ ] **Step 9.1: Crear useUserSettings.js**

```js
// src/hooks/useUserSettings.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useUserSettings() {
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSettings()
    }, [])

    async function fetchSettings() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle()
            setSettings(data)
        } catch (err) {
            console.error('Error fetching user settings:', err)
        } finally {
            setLoading(false)
        }
    }

    async function updateSettings(updates) {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')
            const { data, error } = await supabase
                .from('user_settings')
                .upsert({ ...updates, user_id: user.id }, { onConflict: 'user_id' })
                .select()
                .single()
            if (error) throw error
            setSettings(data)
            return { data, error: null }
        } catch (err) {
            return { data: null, error: err.message }
        }
    }

    async function uploadSignature(file) {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')
            const ext = file.name.split('.').pop().toLowerCase()
            if (!['png', 'jpg', 'jpeg'].includes(ext)) {
                throw new Error('Solo se aceptan archivos PNG o JPG')
            }
            const path = `${user.id}/signature.${ext}`
            const { error: uploadError } = await supabase.storage
                .from('signatures')
                .upload(path, file, { upsert: true, contentType: file.type })
            if (uploadError) throw uploadError
            const { data: { publicUrl } } = supabase.storage
                .from('signatures')
                .getPublicUrl(path)
            return { url: publicUrl, error: null }
        } catch (err) {
            return { url: null, error: err.message }
        }
    }

    return { settings, loading, updateSettings, uploadSignature, refresh: fetchSettings }
}
```

- [ ] **Step 9.2: Commit**

```bash
git add src/hooks/useUserSettings.js
git commit -m "feat: add useUserSettings hook with signature upload to Supabase Storage"
```

---

## Task 10: InvoiceSettings Component + Settings Page

**Files:**
- Create: `src/components/Settings/InvoiceSettings.jsx`
- Modify: `src/pages/Settings.jsx`

- [ ] **Step 10.1: Crear directorio Settings**

```bash
mkdir -p "C:/Users/warli/.gemini/antigravity/scratch/rental-management-system/src/components/Settings"
```

- [ ] **Step 10.2: Crear InvoiceSettings.jsx**

```jsx
// src/components/Settings/InvoiceSettings.jsx
import { useState, useEffect, useRef } from 'react'
import { useUserSettings } from '../../hooks/useUserSettings'
import Button from '../Common/Button'

export default function InvoiceSettings({ showToast }) {
    const { settings, loading, updateSettings, uploadSignature } = useUserSettings()
    const [formData, setFormData] = useState({
        landlord_name: '',
        business_name: '',
        phone: '',
        email: '',
        invoice_footer: '',
    })
    const [signaturePreview, setSignaturePreview] = useState(null)
    const [saving, setSaving] = useState(false)
    const [uploadingSignature, setUploadingSignature] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (settings) {
            setFormData({
                landlord_name: settings.landlord_name || '',
                business_name: settings.business_name || '',
                phone: settings.phone || '',
                email: settings.email || '',
                invoice_footer: settings.invoice_footer || '',
            })
            if (settings.signature_url) setSignaturePreview(settings.signature_url)
        }
    }, [settings])

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSignatureUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadingSignature(true)
        const { url, error } = await uploadSignature(file)
        if (error) {
            showToast(error, 'error')
        } else {
            setSignaturePreview(url)
            await updateSettings({ signature_url: url })
            showToast('Firma guardada correctamente', 'success')
        }
        setUploadingSignature(false)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        const { error } = await updateSettings(formData)
        setSaving(false)
        if (error) {
            showToast('Error al guardar ajustes: ' + error, 'error')
        } else {
            showToast('Ajustes de factura guardados', 'success')
        }
    }

    if (loading) return <div className="py-6 text-gray-500">Cargando...</div>

    return (
        <div>
            <h3 className="text-[20px] font-bold text-gray-900 mb-2">Plantilla de Factura</h3>
            <p className="text-[16px] text-gray-600 mb-6">
                Esta información aparecerá en todos los recibos que generes. Solo afecta tu cuenta.
            </p>

            <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="accessible-label">Nombre del Arrendador</label>
                        <input
                            name="landlord_name"
                            value={formData.landlord_name}
                            onChange={handleChange}
                            placeholder="Tu nombre completo"
                            className="accessible-input"
                        />
                    </div>
                    <div>
                        <label className="accessible-label">Nombre del Negocio</label>
                        <input
                            name="business_name"
                            value={formData.business_name}
                            onChange={handleChange}
                            placeholder="Ej: Propiedades Bautista"
                            className="accessible-input"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="accessible-label">Teléfono</label>
                        <input
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="(829) 555-0012"
                            className="accessible-input"
                        />
                    </div>
                    <div>
                        <label className="accessible-label">Correo Electrónico</label>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="correo@ejemplo.com"
                            className="accessible-input"
                        />
                    </div>
                </div>

                <div>
                    <label className="accessible-label">Nota al pie de la factura</label>
                    <textarea
                        name="invoice_footer"
                        value={formData.invoice_footer}
                        onChange={handleChange}
                        placeholder="Ej: Este recibo es un comprobante válido de pago."
                        maxLength={200}
                        rows={2}
                        className="accessible-input resize-none"
                    />
                    <p className="text-right text-[14px] text-gray-400 mt-1">{formData.invoice_footer.length}/200</p>
                </div>

                {/* Firma */}
                <div>
                    <label className="accessible-label">Firma del Arrendador</label>
                    <div className="flex items-start gap-6">
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition"
                            style={{ minWidth: '180px', minHeight: '100px' }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {signaturePreview ? (
                                <img
                                    src={signaturePreview}
                                    alt="Firma"
                                    style={{ maxHeight: '70px', maxWidth: '160px', objectFit: 'contain' }}
                                />
                            ) : (
                                <>
                                    <span className="text-3xl mb-2">🖼️</span>
                                    <span className="text-[14px] text-gray-500 text-center">Haz clic para subir</span>
                                </>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-[16px] text-gray-600">PNG o JPG con fondo transparente recomendado.</p>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingSignature}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg transition text-[16px]"
                                style={{ minHeight: '48px' }}
                            >
                                {uploadingSignature ? 'Subiendo...' : signaturePreview ? 'Cambiar firma' : 'Seleccionar archivo'}
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".png,.jpg,.jpeg"
                            className="hidden"
                            onChange={handleSignatureUpload}
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar Ajustes de Factura'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
```

- [ ] **Step 10.3: Modificar Settings.jsx para incluir InvoiceSettings**

Reemplazar el contenido de `src/pages/Settings.jsx`:

```jsx
import { useState } from 'react'
import Header from '../components/Common/Header'
import Footer from '../components/Common/Footer'
import InvoiceSettings from '../components/Settings/InvoiceSettings'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Toast, { useToast } from '../components/Common/Toast'

const TABS = [
    { id: 'account', label: '👤 Cuenta' },
    { id: 'invoice', label: '🧾 Factura' },
]

export default function Settings() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('account')
    const [formData, setFormData] = useState({
        name: user?.user_metadata?.name || user?.email?.split('@')[0] || '',
        email: user?.email || '',
        newPassword: '',
        confirmPassword: ''
    })
    const [loading, setLoading] = useState(false)
    const { toast, showToast, hideToast } = useToast()

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            showToast('Las contraseñas no coinciden', 'error')
            return
        }
        setLoading(true)
        try {
            const updateData = {}
            if (formData.newPassword) updateData.password = formData.newPassword
            if (formData.email !== user?.email) updateData.email = formData.email
            if (updateData.password || updateData.email) {
                const { error } = await supabase.auth.updateUser(updateData)
                if (error) throw error
            }
            showToast('Configuración actualizada exitosamente', 'success')
            setFormData({ ...formData, newPassword: '', confirmPassword: '' })
        } catch (error) {
            showToast(error.message || 'Error al actualizar configuración', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            <Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
                <h1 className="text-[24px] font-bold text-gray-900 mb-6">⚙️ Configuración</h1>

                {/* Tabs */}
                <div className="flex gap-2 border-b-2 border-gray-200 mb-6">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-3 font-semibold text-[18px] border-b-4 transition ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                            style={{ minHeight: '48px' }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-8">
                    {activeTab === 'account' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <h3 className="text-[20px] font-bold text-gray-900 mb-2">Datos de la Cuenta</h3>
                            <div>
                                <label className="accessible-label">Nombre de Usuario</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="accessible-input"
                                    placeholder="Tu nombre"
                                />
                            </div>
                            <div>
                                <label className="accessible-label">Correo Electrónico</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="accessible-input"
                                    placeholder="tucorreo@ejemplo.com"
                                />
                            </div>
                            <div className="border-t-2 border-gray-200 pt-6">
                                <h4 className="text-[18px] font-bold text-gray-900 mb-4">Cambiar Contraseña</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="accessible-label">Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleChange}
                                            className="accessible-input"
                                            placeholder="Dejar vacío para no cambiar"
                                        />
                                    </div>
                                    <div>
                                        <label className="accessible-label">Confirmar Contraseña</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="accessible-input"
                                            placeholder="Repetir nueva contraseña"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-[18px]"
                                    style={{ minHeight: '48px' }}
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'invoice' && (
                        <InvoiceSettings showToast={showToast} />
                    )}
                </div>
            </main>
            <Footer />
            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </div>
    )
}
```

- [ ] **Step 10.4: Commit**

```bash
git add src/components/Settings/InvoiceSettings.jsx src/pages/Settings.jsx
git commit -m "feat: add invoice settings tab with signature upload and customizable fields"
```

---

## Task 11: Rediseño de pdfGenerator (Plantilla Clásica + Firma)

**Files:**
- Modify: `src/lib/pdfGenerator.js`

- [ ] **Step 11.1: Reemplazar pdfGenerator.js completo**

```js
// src/lib/pdfGenerator.js
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const GOLD = [184, 150, 46]
const DARK = [26, 26, 26]
const GRAY = [90, 79, 58]
const LIGHT_GRAY = [138, 122, 90]
const GREEN = [45, 106, 53]

async function loadImageAsDataUrl(url) {
    try {
        const response = await fetch(url)
        const blob = await response.blob()
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

export async function generateReceiptPDF(payment, property, tenant, userSettings = {}) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 22

    const businessName = userSettings.business_name || 'AlquilerPro'
    const landlordName = userSettings.landlord_name || ''
    const landlordPhone = userSettings.phone || ''
    const landlordEmail = userSettings.email || 'info@optimard.com'
    const footerNote = userSettings.invoice_footer || 'Este documento constituye un recibo de pago válido.'
    const signatureUrl = userSettings.signature_url || null

    // === TOP GOLD RULE ===
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(1.2)
    doc.line(margin, 14, pageWidth - margin, 14)

    // === CENTERED HEADER ===
    doc.setFont('times', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...DARK)
    doc.text(businessName.toUpperCase(), pageWidth / 2, 24, { align: 'center', charSpace: 1.5 })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('Gestión de Propiedades', pageWidth / 2, 30, { align: 'center', charSpace: 1 })

    // Thin separator
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.4)
    doc.line(pageWidth / 2 - 18, 34, pageWidth / 2 + 18, 34)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...GRAY)
    doc.text('RECIBO DE PAGO DE ALQUILER', pageWidth / 2, 40, { align: 'center', charSpace: 0.8 })

    // === META ROW ===
    let y = 52
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('No. DE RECIBO', margin, y)
    doc.text('FECHA DE EMISIÓN', 90, y)
    doc.text('PERIODO PAGADO', 150, y)

    y += 5
    doc.setFont('times', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...DARK)
    doc.text(`#${payment.id.slice(0, 8).toUpperCase()}`, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(format(new Date(), 'dd \'de\' MMMM \'de\' yyyy', { locale: es }), 90, y)
    doc.text(
        format(new Date(payment.payment_month), 'MMMM yyyy', { locale: es }).toUpperCase(),
        150, y
    )

    // Separator line
    y += 8
    doc.setDrawColor(220, 210, 190)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)

    // === PARTIES ===
    y += 8
    const colMid = pageWidth / 2 + 5

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('ARRENDADOR', margin, y)
    doc.text('INQUILINO', colMid, y)

    doc.setDrawColor(200, 190, 170)
    doc.setLineWidth(0.3)
    doc.line(margin, y + 2, margin + 52, y + 2)
    doc.line(colMid, y + 2, colMid + 52, y + 2)

    y += 7
    doc.setFont('times', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...DARK)
    doc.text(landlordName || 'Arrendador', margin, y)
    doc.text(tenant.name, colMid, y)

    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...GRAY)
    if (landlordPhone) { doc.text(landlordPhone, margin, y); y += 5 }
    if (landlordEmail) { doc.text(landlordEmail, margin, y) }
    const tenantY = y - (landlordPhone ? 5 : 0)
    doc.text(`Cédula: ${tenant.identity_number || 'N/A'}`, colMid, tenantY)
    doc.text(`${property.name} · ${property.address}`, colMid, tenantY + 5, { maxWidth: 70 })

    // === PAYMENT TABLE ===
    y += 14
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageWidth - margin, y)

    doc.autoTable({
        startY: y + 2,
        margin: { left: margin, right: margin },
        head: [['CONCEPTO', 'DETALLE', 'MONTO', 'PAGADO']],
        body: [
            [
                `Alquiler Mensual\n${format(new Date(payment.payment_month), 'MMMM yyyy', { locale: es }).toUpperCase()}`,
                `${property.name}\n${getPaymentMethodLabel(payment.payment_method)}`,
                `RD$${parseFloat(property.monthly_rent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                `RD$${parseFloat(payment.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            ]
        ],
        foot: [['TOTAL', '', `RD$${parseFloat(property.monthly_rent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, `RD$${parseFloat(payment.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]],
        theme: 'plain',
        headStyles: {
            fillColor: [250, 247, 240],
            textColor: LIGHT_GRAY,
            fontSize: 8,
            fontStyle: 'bold',
            cellPadding: 4,
        },
        bodyStyles: {
            textColor: DARK,
            fontSize: 10,
            fontStyle: 'normal',
            cellPadding: 5,
            lineColor: [232, 223, 200],
            lineWidth: 0.3,
        },
        footStyles: {
            fillColor: [244, 251, 245],
            textColor: GREEN,
            fontSize: 11,
            fontStyle: 'bold',
            cellPadding: 5,
            lineColor: GOLD,
            lineWidth: 0.8,
        },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 55 },
            2: { halign: 'right' },
            3: { halign: 'right' },
        }
    })

    y = doc.lastAutoTable.finalY + 6
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageWidth - margin, y)

    // === PAYMENT DETAILS ===
    y += 10
    const remaining = typeof payment.remaining_balance === 'string'
        ? parseFloat(payment.remaining_balance)
        : (payment.remaining_balance || 0)

    // Method box
    doc.setFillColor(250, 247, 240)
    doc.roundedRect(margin, y, 80, 22, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('MÉTODO DE PAGO', margin + 4, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...DARK)
    doc.text(getPaymentMethodLabel(payment.payment_method), margin + 4, y + 13)
    if (payment.reference) {
        doc.setFontSize(8)
        doc.setTextColor(...GRAY)
        doc.text(`Ref: ${payment.reference}`, margin + 4, y + 19)
    }

    // Balance box
    const balanceColor = remaining > 0 ? [220, 38, 38] : GREEN
    doc.setFillColor(remaining > 0 ? 254 : 244, remaining > 0 ? 242 : 251, remaining > 0 ? 242 : 245)
    doc.roundedRect(pageWidth - margin - 80, y, 80, 22, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('BALANCE PENDIENTE', pageWidth - margin - 76, y + 6)
    doc.setFont('times', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...balanceColor)
    doc.text(
        `RD$${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        pageWidth - margin - 4, y + 16,
        { align: 'right' }
    )

    // === SIGNATURE ===
    y += 32
    const sigX = pageWidth - margin - 60

    if (signatureUrl) {
        const sigDataUrl = await loadImageAsDataUrl(signatureUrl)
        if (sigDataUrl) {
            doc.addImage(sigDataUrl, 'PNG', sigX, y, 56, 22)
            y += 24
        }
    }

    doc.setDrawColor(...DARK)
    doc.setLineWidth(0.5)
    doc.line(sigX, y, pageWidth - margin, y)

    y += 5
    if (landlordName) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...DARK)
        doc.text(landlordName, (sigX + pageWidth - margin) / 2, y, { align: 'center' })
        y += 5
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('ARRENDADOR', (sigX + pageWidth - margin) / 2, y, { align: 'center', charSpace: 0.8 })

    // === FOOTER ===
    const footerY = doc.internal.pageSize.getHeight() - 18
    doc.setDrawColor(220, 210, 190)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text(`${businessName} · ${landlordEmail} · ${landlordPhone}`, pageWidth / 2, footerY, { align: 'center' })

    doc.setFont('times', 'italic')
    doc.setFontSize(8)
    doc.setTextColor([184, 168, 128])
    doc.text(footerNote, pageWidth / 2, footerY + 5, { align: 'center' })

    // Bottom gold rule
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(1.2)
    doc.line(margin, footerY + 10, pageWidth - margin, footerY + 10)

    // Save
    const fileName = `Recibo_${tenant.name.split(' ')[0]}_${format(new Date(payment.payment_month), 'MMM-yyyy')}.pdf`
    doc.save(fileName)
}

const getPaymentMethodLabel = (method) => {
    const map = {
        transfer: 'Transferencia Bancaria',
        cash: 'Efectivo',
        check: 'Cheque',
        pending: 'Pendiente',
        other: 'Otro'
    }
    return map[method] || method || '—'
}
```

- [ ] **Step 11.2: Commit**

```bash
git add src/lib/pdfGenerator.js
git commit -m "feat: redesign invoice PDF — classic elegant style with Times Roman, gold rules, signature support"
```

---

## Task 12: Botón Regenerar Recibo en PropertyDetails

**Files:**
- Modify: `src/components/Dashboard/PropertyDetails.jsx`

- [ ] **Step 12.1: Importar useUserSettings y hacer handleDownloadReceipt async**

En `PropertyDetails.jsx`, agregar el import:

```js
import { useUserSettings } from '../../hooks/useUserSettings'
```

Dentro del componente, agregar:

```js
const { settings: userSettings } = useUserSettings()
```

- [ ] **Step 12.2: Hacer handleDownloadReceipt async y pasar userSettings**

Reemplazar la función `handleDownloadReceipt` existente:

```js
const handleDownloadReceipt = async (payment) => {
    let tenantInfo = { name: 'Inquilino Histórico', identity_number: '' }
    if (activeTenant && activeTenant.id === payment.tenant_id) {
        tenantInfo = activeTenant
    }
    await generateReceiptPDF(payment, property, tenantInfo, userSettings || {})
}
```

- [ ] **Step 12.3: Reemplazar el botón 📄 de historial de pagos**

Buscar el botón con `onClick={() => window.open(\`/receipt/${payment.id}\`, '_blank')}` y reemplazarlo con:

```jsx
<button
    onClick={() => handleDownloadReceipt(payment)}
    className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-blue-600 transition font-medium text-[16px]"
    title="Descargar Recibo PDF"
    style={{ minHeight: '40px', minWidth: '40px' }}
>
    🖨️
</button>
```

- [ ] **Step 12.4: Commit**

```bash
git add src/components/Dashboard/PropertyDetails.jsx
git commit -m "feat: add regenerate receipt button in payment history using user invoice settings"
```

---

## Task 13: Verificación Final y Deploy

- [ ] **Step 13.1: Build de producción sin errores**

```bash
cd "C:/Users/warli/.gemini/antigravity/scratch/rental-management-system"
npm run build
```

Salida esperada: `✓ built in Xs` sin errores de compilación.

- [ ] **Step 13.2: Prueba de schema rental**

Abrir la app en dev, intentar cargar el dashboard. En la consola del browser no deben aparecer errores 404 o "relation not found". Si aparece `relation "public.properties" does not exist` → confirmar que el paso manual de Supabase (Task 1.6, Extra schemas) se completó.

- [ ] **Step 13.3: Prueba del toggle de aumento anual**

Ir a Nueva Propiedad → sección Contrato → verificar que el toggle `% Porcentaje / RD$ Monto Fijo` aparece y el preview se actualiza al escribir un valor. Crear una propiedad con tipo `fixed` y verificar que en Supabase aparece `increase_type = 'fixed'`.

- [ ] **Step 13.4: Prueba de registrar luz**

QuickActions → Registrar Gastos → Luz → verificar que el modal abre, se registra la lectura, y aparece en la pestaña Gastos → Luz con `utility_type = 'electricity'` en Supabase.

- [ ] **Step 13.5: Prueba de ajustes de factura**

Settings → Factura → subir firma PNG → guardar → ir a Propiedades → historial de un pago → clic en 🖨️ → verificar que el PDF generado incluye la firma y los datos del usuario.

- [ ] **Step 13.6: Deploy a Vercel**

```bash
vercel --prod --force
```

- [ ] **Step 13.7: Commit final**

```bash
git add -A
git commit -m "chore: final cleanup and production build verification"
```
