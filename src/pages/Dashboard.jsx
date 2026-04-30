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
import Toast, { useToast } from '../components/Common/Toast'
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
    const [utilityModalType, setUtilityModalType] = useState(null)

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
