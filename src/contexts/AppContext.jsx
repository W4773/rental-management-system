import { createContext, useContext, useMemo, useState } from 'react'
import { useProperties } from '../hooks/useProperties'
import { useTenants } from '../hooks/useTenants'
import { usePayments } from '../hooks/usePayments'
import { useGasReadings } from '../hooks/useGasReadings'
import { useBuildings } from '../hooks/useBuildings'
import { useToast } from '../components/Common/Toast'
import { computeMetrics } from '../lib/metrics'
import RegisterPropertyModal from '../components/Modals/RegisterPropertyModal'
import RegisterBuildingModal from '../components/Modals/RegisterBuildingModal'
import AssignTenantModal from '../components/Modals/AssignTenantModal'
import RegisterPaymentModal from '../components/Modals/RegisterPaymentModal'
import RegisterGasModal from '../components/Modals/RegisterGasModal'
import PayGasModal from '../components/Modals/PayGasModal'
import PrintReceiptPrompt from '../components/Modals/PrintReceiptPrompt'
import ReportModal from '../components/Modals/ReportModal'
import Toast from '../components/Common/Toast'

const AppContext = createContext(null)

export const useApp = () => {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useApp must be used inside AppProvider')
    return ctx
}

/**
 * Single source of truth for data + every global modal. Pages call openX() instead of
 * mounting modals, and refreshAll() replaces the old window.location.reload().
 */
export function AppProvider({ children }) {
    const propsHook = useProperties()
    const tenantsHook = useTenants()
    const paymentsHook = usePayments()
    const gasHook = useGasReadings()
    const buildingsHook = useBuildings()
    const toastApi = useToast()

    const { properties } = propsHook
    const { tenants } = tenantsHook
    const { payments } = paymentsHook
    const { gasReadings } = gasHook
    const { buildings } = buildingsHook

    const [paymentModal, setPaymentModal] = useState({ open: false, initial: null })
    const [propertyModal, setPropertyModal] = useState({ open: false, property: null })
    const [buildingModal, setBuildingModal] = useState({ open: false, building: null })
    const [tenantModal, setTenantModal] = useState({ open: false, property: null, tenant: null })
    const [gasOpen, setGasOpen] = useState(false)
    const [payGas, setPayGas] = useState(null)
    const [reportModal, setReportModal] = useState({ open: false, initial: null })
    const [receipt, setReceipt] = useState(null)

    const refreshAll = () => Promise.all([
        propsHook.refresh(), tenantsHook.refresh(), paymentsHook.refresh(), gasHook.refresh(), buildingsHook.refresh()
    ])

    const loading = propsHook.loading || tenantsHook.loading || paymentsHook.loading

    const metrics = useMemo(
        () => computeMetrics({ properties, tenants, payments, gasReadings }),
        [properties, tenants, payments, gasReadings]
    )

    const onDataChanged = (message) => {
        refreshAll()
        if (message) toastApi.success(message)
    }

    const saveBuilding = async (values, building) => {
        const res = building ? await buildingsHook.updateBuilding(building.id, values) : await buildingsHook.addBuilding(values)
        if (res.error) {
            return { error: /relation|schema cache|does not exist/i.test(res.error)
                ? 'Falta ejecutar la migración supabase/migrations/002_buildings.sql en Supabase.'
                : res.error }
        }
        toastApi.success(building ? 'Edificio actualizado' : 'Edificio creado')
        return { error: null }
    }

    const value = {
        properties, tenants, payments, gasReadings, buildings, loading, metrics,
        buildingsAvailable: buildingsHook.available,
        deletePayment: paymentsHook.deletePayment,
        deleteProperty: propsHook.deleteProperty,
        deleteBuilding: buildingsHook.deleteBuilding,
        toast: toastApi,
        refreshAll,
        onDataChanged,
        openPayment: (initial = null) => setPaymentModal({ open: true, initial }),
        openProperty: (property = null) => setPropertyModal({ open: true, property }),
        openBuilding: (building = null) => setBuildingModal({ open: true, building }),
        openTenant: (property = null, tenant = null) => setTenantModal({ open: true, property, tenant }),
        openGas: () => setGasOpen(true),
        openPayGas: (reading) => setPayGas(reading),
        openReport: (initial = null) => setReportModal({ open: true, initial }),
        offerReceipt: setReceipt
    }

    return (
        <AppContext.Provider value={value}>
            {children}

            <RegisterPaymentModal
                isOpen={paymentModal.open}
                initial={paymentModal.initial}
                properties={properties}
                tenants={tenants}
                payments={payments}
                onClose={() => setPaymentModal({ open: false, initial: null })}
                onSuccess={(result) => {
                    onDataChanged('Pago registrado')
                    setReceipt(result) // optional receipt: user decides in the pop-up
                }}
            />
            <PrintReceiptPrompt data={receipt} onClose={() => setReceipt(null)} />

            <RegisterPropertyModal
                isOpen={propertyModal.open}
                property={propertyModal.property}
                buildings={buildings}
                onNewBuilding={() => setBuildingModal({ open: true, building: null })}
                onClose={() => setPropertyModal({ open: false, property: null })}
                onSuccess={() => onDataChanged(propertyModal.property ? 'Propiedad actualizada' : 'Propiedad registrada')}
            />
            <RegisterBuildingModal
                isOpen={buildingModal.open}
                building={buildingModal.building}
                onSave={saveBuilding}
                onClose={() => setBuildingModal({ open: false, building: null })}
            />
            <AssignTenantModal
                isOpen={tenantModal.open}
                property={tenantModal.property}
                tenantToEdit={tenantModal.tenant}
                onClose={() => setTenantModal({ open: false, property: null, tenant: null })}
                onSuccess={() => onDataChanged('Inquilino guardado')}
            />
            <RegisterGasModal isOpen={gasOpen} onClose={() => setGasOpen(false)} onSuccess={() => onDataChanged('Lectura de gas registrada')} />
            <PayGasModal isOpen={payGas !== null} gasReading={payGas} onClose={() => setPayGas(null)} onSuccess={() => onDataChanged('Gas pagado')} />
            <ReportModal
                isOpen={reportModal.open}
                initial={reportModal.initial}
                properties={properties}
                tenants={tenants}
                payments={payments}
                buildings={buildings}
                onClose={() => setReportModal({ open: false, initial: null })}
            />

            <Toast toasts={toastApi.toasts} onRemove={toastApi.removeToast} />
        </AppContext.Provider>
    )
}
