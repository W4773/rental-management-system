// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import AppLayout from '../components/Layout/AppLayout'
import PropertyGrid from '../components/Dashboard/PropertyCarousel'
import PropertyDetails from '../components/Dashboard/PropertyDetails'
import TenantSection from '../components/Dashboard/TenantSection'
import RegisterPropertyModal from '../components/Modals/RegisterPropertyModal'
import AssignTenantModal from '../components/Modals/AssignTenantModal'
import RegisterPaymentModal from '../components/Modals/RegisterPaymentModal'
import RegisterUtilityModal from '../components/Modals/RegisterUtilityModal'
import Toast, { useToast } from '../components/Common/Toast'
import { useProperties } from '../hooks/useProperties'
import { useTenants } from '../hooks/useTenants'
import { usePayments } from '../hooks/usePayments'
import { useUtilityReadings } from '../hooks/useUtilityReadings'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import { useAlerts } from '../hooks/useAlerts'
import AlertDrawer from '../components/AlertDrawer/AlertDrawer'
import PropertiesList from '../components/Dashboard/PropertiesList'
import ActivityFeed from '../components/Dashboard/ActivityFeed'
import KPICard from '../components/Dashboard/KPICard'

export default function Dashboard() {
    const { properties, loading: loadingProps, refresh: refreshProperties } = useProperties()
    const { tenants, closeTenant, refresh: refreshTenants } = useTenants()
    const { payments, refresh: refreshPayments } = usePayments()
    const { gasReadings, refresh: refreshGas } = useUtilityReadings()

    const [selectedYear] = useState(new Date().getFullYear())
    const metrics = useDashboardMetrics(selectedYear)

    const [activeSection, setActiveSection] = useState('resumen')
    const [selectedProperty, setSelectedProperty] = useState(null)
    const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false)

    const [isRegisterPropertyOpen, setIsRegisterPropertyOpen] = useState(false)
    const [isAssignTenantOpen, setIsAssignTenantOpen] = useState(false)
    const [isRegisterPaymentOpen, setIsRegisterPaymentOpen] = useState(false)
    const [utilityModalType, setUtilityModalType] = useState(null)

    const [paramTenantProperty, setParamTenantProperty] = useState(null)
    const [paramEditTenant, setParamEditTenant] = useState(null)

    const { toast, showToast, hideToast } = useToast()

    const { overdue, upcoming, total: alertTotal } = useAlerts(payments, tenants, properties)

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
            <div style={{ minHeight: '100vh', background: 'var(--wp-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b8962e]"></div>
            </div>
        )
    }

    return (
        <AppLayout
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            alertCount={alertTotal}
            onAlertClick={() => setIsAlertDrawerOpen(true)}
        >

            {/* RESUMEN */}
            {activeSection === 'resumen' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <h1 className="wp-title" style={{ fontSize: 22 }}>Dashboard</h1>
                            <p style={{ fontSize: 12, color: 'var(--wp-text-muted)', marginTop: 3 }}>
                                {new Date().toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })} · {properties.length} {properties.length === 1 ? 'propiedad activa' : 'propiedades activas'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="wp-btn-secondary" onClick={() => setIsAssignTenantOpen(true)}>+ Inquilino</button>
                            <button className="wp-btn-primary" onClick={() => setIsRegisterPropertyOpen(true)}>+ Propiedad</button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        <KPICard
                            title="Cobrado este mes"
                            value={`RD$${Number(metrics?.totalCollected ?? 0).toLocaleString('es-DO')}`}
                            status="default"
                            barWidth={metrics?.totalExpected ? (metrics.totalCollected / metrics.totalExpected) * 100 : 0}
                            icon="💰"
                        />
                        <KPICard
                            title="Pendiente"
                            value={`RD$${Number(metrics?.totalPending ?? 0).toLocaleString('es-DO')}`}
                            status={metrics?.totalPending > 0 ? 'danger' : 'success'}
                            barWidth={metrics?.totalExpected ? (metrics.totalPending / metrics.totalExpected) * 100 : 0}
                            icon="⏳"
                        />
                        <KPICard
                            title="Ocupación"
                            value={`${metrics?.occupancyRate ?? 0}%`}
                            status={metrics?.occupancyRate >= 100 ? 'success' : 'warning'}
                            barWidth={metrics?.occupancyRate ?? 0}
                            icon="🏠"
                        />
                        <KPICard
                            title="Total esperado"
                            value={`RD$${Number(metrics?.totalExpected ?? 0).toLocaleString('es-DO')}`}
                            status="default"
                            barWidth={100}
                            icon="📊"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <PropertiesList
                            properties={properties}
                            tenants={tenants}
                            payments={payments}
                            onSelectProperty={(p) => { setSelectedProperty(p); setActiveSection('propiedades') }}
                            onAddProperty={() => setIsRegisterPropertyOpen(true)}
                        />
                        <ActivityFeed payments={payments} tenants={tenants} properties={properties} />
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

            <AlertDrawer
                isOpen={isAlertDrawerOpen}
                onClose={() => setIsAlertDrawerOpen(false)}
                overdue={overdue}
                upcoming={upcoming}
                onPayClick={() => { setIsAlertDrawerOpen(false); setIsRegisterPaymentOpen(true) }}
            />

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
