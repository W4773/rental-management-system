import { useState, useEffect } from 'react'
import Header from '../components/Common/Header'
import SummaryCards from '../components/Dashboard/SummaryCards'
import MetricsPanel from '../components/Dashboard/MetricsPanel'
import PropertyGrid from '../components/Dashboard/PropertyCarousel'
import PropertyDetails from '../components/Dashboard/PropertyDetails'
import KPICard from '../components/Dashboard/KPICard'
import FloatingNotificationButton from '../components/Dashboard/FloatingNotificationButton'
import QuickActions from '../components/Dashboard/QuickActions'
import RegisterPropertyModal from '../components/Modals/RegisterPropertyModal'
import AssignTenantModal from '../components/Modals/AssignTenantModal'
import RegisterPaymentModal from '../components/Modals/RegisterPaymentModal'
import RegisterGasModal from '../components/Modals/RegisterGasModal'
import Footer from '../components/Common/Footer'
import Toast from '../components/Common/Toast'
import { useToast } from '../components/Common/Toast'
import { useProperties } from '../hooks/useProperties'
import { useTenants } from '../hooks/useTenants'
import { usePayments } from '../hooks/usePayments'
import { useGasReadings } from '../hooks/useGasReadings'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'

export default function Dashboard() {
    const { properties, loading: loadingProps, refresh: refreshProperties } = useProperties()
    const { tenants, refresh: refreshTenants } = useTenants()
    const { payments, refresh: refreshPayments } = usePayments()
    const { gasReadings, refresh: refreshGas } = useGasReadings()

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const metrics = useDashboardMetrics(selectedYear)

    const [selectedProperty, setSelectedProperty] = useState(null)
    const [isRegisterPropertyOpen, setIsRegisterPropertyOpen] = useState(false)
    const [isAssignTenantOpen, setIsAssignTenantOpen] = useState(false)
    const [isRegisterPaymentOpen, setIsRegisterPaymentOpen] = useState(false)
    const [isRegisterGasOpen, setIsRegisterGasOpen] = useState(false)

    const [paramTenantProperty, setParamTenantProperty] = useState(null)
    const [paramEditTenant, setParamEditTenant] = useState(null)

    const { toast, showToast, hideToast } = useToast()

    useEffect(() => {
        if (!selectedProperty && properties.length > 0) {
            setSelectedProperty(properties[0])
        }
    }, [properties, selectedProperty])

    const handlePropertySelect = (property) => {
        setSelectedProperty(property)
    }

    const handleDataUpdate = () => {
        refreshProperties()
        refreshTenants()
        refreshPayments()
        refreshGas()
        showToast('Datos actualizados', 'success')
        // Auto-reload to ensure all data is fresh
        setTimeout(() => window.location.reload(), 800)
    }

    const openAssignModal = (property = null, tenantToEdit = null) => {
        setParamTenantProperty(property || selectedProperty)
        setParamEditTenant(tenantToEdit)
        setIsAssignTenantOpen(true)
    }

    const activeTenantForSelected = tenants.find(t =>
        selectedProperty && t.property_id === selectedProperty.id && t.end_date === null
    )

    if (loadingProps || metrics.loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* TOP SECTION: Actions & Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left: Quick Actions (1 Col) */}
                    <div className="lg:col-span-1">
                        <h2 className="text-lg font-bold text-gray-400 uppercase tracking-wider mb-4 text-xs">Acciones Rápidas</h2>
                        <QuickActions
                            onNewPayment={() => setIsRegisterPaymentOpen(true)}
                            onNewProperty={() => setIsRegisterPropertyOpen(true)}
                            onRegisterGas={() => setIsRegisterGasOpen(true)}
                        />
                    </div>

                    {/* Right: Metrics Panel (3 Cols) */}
                    <div className="lg:col-span-3">
                        <h2 className="text-lg font-bold text-gray-400 uppercase tracking-wider mb-4 text-xs">Resumen Financiero</h2>
                        <MetricsPanel
                            properties={properties}
                            tenants={tenants}
                            payments={payments}
                            gasReadings={gasReadings}
                        />

                        {/* Secondary KPIs Row - Compact */}
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase">Tasa de Cobro</p>
                                    <p className={`text-xl font-bold ${metrics.collectionRate >= 95 ? 'text-green-400' : 'text-yellow-400'}`}>{metrics.collectionRate}%</p>
                                </div>
                                <span className="text-2xl">📊</span>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase">Ocupación</p>
                                    <p className={`text-xl font-bold ${metrics.occupancyRate === 100 ? 'text-green-400' : 'text-blue-400'}`}>{metrics.occupancyRate}%</p>
                                </div>
                                <span className="text-2xl">🏠</span>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase">Alertas</p>
                                    <p className={`text-xl font-bold ${metrics.alerts.length === 0 ? 'text-green-400' : 'text-red-400'}`}>{metrics.alerts.length}</p>
                                </div>
                                <span className="text-2xl">⚠️</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM SECTION: Properties & Details */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-400px)] min-h-[600px]">

                    {/* Left: Property List (4 Cols) */}
                    <div className="lg:col-span-4 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Mis Propiedades</h2>
                            <span className="bg-slate-700 text-white text-xs px-2 py-1 rounded-full">{properties.length}</span>
                        </div>
                        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-3 pb-4">
                            <PropertyGrid
                                properties={properties}
                                tenants={tenants}
                                payments={payments}
                                onSelectProperty={handlePropertySelect}
                                selectedProperty={selectedProperty}
                                isVertical={true}
                            />
                        </div>
                    </div>

                    {/* Right: Property Details (8 Cols) */}
                    <div className="lg:col-span-8 h-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                        <PropertyDetails
                            property={selectedProperty}
                            activeTenant={activeTenantForSelected}
                            onEditTenant={(tenant) => openAssignModal(selectedProperty, tenant)}
                            onChangeTenant={() => openAssignModal(selectedProperty, null)}
                        />
                    </div>
                </div>

                {/* Floating Notification Button */}
                <FloatingNotificationButton alerts={metrics.alerts} />
            </main>

            <Footer />

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

            <RegisterGasModal
                isOpen={isRegisterGasOpen}
                onClose={() => setIsRegisterGasOpen(false)}
                onSuccess={handleDataUpdate}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </div>
    )
}

