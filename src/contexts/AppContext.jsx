import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useProperties } from '../hooks/useProperties'
import { useTenants } from '../hooks/useTenants'
import { usePayments } from '../hooks/usePayments'
import { useUtilityReadings } from '../hooks/useUtilityReadings'
import { useBuildings } from '../hooks/useBuildings'
import { useActivityLog } from '../hooks/useActivityLog'
import { useUserSettings } from '../hooks/useUserSettings'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import { useAlerts } from '../hooks/useAlerts'
import { useHistoryBackfill } from '../hooks/useHistoryBackfill'
import { refreshTable, refreshAllTables } from '../lib/dataStore'
import { startOutbox, stopOutbox } from '../lib/outbox'
import { useToast } from '../components/Common/Toast'
import { getPaymentStatus } from '../lib/paymentStatus'
import { logActivity } from '../lib/activityLog'
import RegisterPropertyModal from '../components/Modals/RegisterPropertyModal'
import RegisterBuildingModal from '../components/Modals/RegisterBuildingModal'
import AssignTenantModal from '../components/Modals/AssignTenantModal'
import RegisterPaymentModal from '../components/Modals/RegisterPaymentModal'
import RegisterUtilityModal from '../components/Modals/RegisterUtilityModal'
import PayGasModal from '../components/Modals/PayGasModal'
import PrintReceiptPrompt from '../components/Modals/PrintReceiptPrompt'
import ReportModal from '../components/Modals/ReportModal'
import AlertDrawer from '../components/AlertDrawer/AlertDrawer'
import Toast from '../components/Common/Toast'
import { useAuth } from './AuthContext'
import { resolveDisplayName } from '../lib/displayName'
import { useTeam } from '../hooks/useTeam'

const AppContext = createContext(null)

export const useApp = () => {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useApp must be used inside AppProvider')
    return ctx
}

/**
 * Single source of truth for data + every global modal. Pages call openX() instead of mounting
 * modals, and refreshAll() replaces the old window.location.reload().
 */
export function AppProvider({ children }) {
    const propsHook = useProperties()
    const tenantsHook = useTenants()
    const paymentsHook = usePayments()
    const utilityHook = useUtilityReadings()
    const buildingsHook = useBuildings()
    const activityHook = useActivityLog()
    const { settings: rawSettings } = useUserSettings()
    const { user } = useAuth()
    const { members, owner: teamOwner } = useTeam()
    // Every PDF reads the name to show (header, owner, signature, watermark) from settings.display_name
    const settings = useMemo(() => ({ ...(rawSettings || {}), display_name: resolveDisplayName(rawSettings, user, { ownerEmail: teamOwner?.email, size: members.length }) }), [rawSettings, user, members, teamOwner])
    const toastApi = useToast()

    const { properties } = propsHook
    const { tenants } = tenantsHook
    const { payments } = paymentsHook
    const baseMetrics = useDashboardMetrics({ properties, tenants, payments, loading: propsHook.loading || tenantsHook.loading || paymentsHook.loading })
    useHistoryBackfill({ properties, tenants, payments })

    // Payments made without a connection are sent from here once we are back (and kept across reloads)
    useEffect(() => { startOutbox(); return () => { stopOutbox() } }, [user?.id])
    const { readings: utilityReadings } = utilityHook
    const { buildings } = buildingsHook
    const alerts = useAlerts(payments, tenants, properties)

    // "Monto atrasado" uses the same month-by-month logic as the status badges, so KPI and lists agree
    const metrics = useMemo(() => {
        const overdueAmount = tenants
            .filter(t => !t.end_date)
            .reduce((sum, t) => {
                const property = properties.find(p => p.id === t.property_id)
                return sum + (property ? getPaymentStatus(property, t, payments).owedAmount : 0)
            }, 0)
        return { ...baseMetrics, overdueAmount }
    }, [baseMetrics, tenants, properties, payments])

    const [paymentModal, setPaymentModal] = useState({ open: false, initial: null })
    const [propertyModal, setPropertyModal] = useState({ open: false, property: null, buildingId: null })
    const [buildingModal, setBuildingModal] = useState({ open: false, building: null })
    const [tenantModal, setTenantModal] = useState({ open: false, property: null, tenant: null })
    const [utilityType, setUtilityType] = useState(null)
    const [payGas, setPayGas] = useState(null)
    const [reportModal, setReportModal] = useState({ open: false, initial: null })
    const [receipt, setReceipt] = useState(null)
    const [alertsOpen, setAlertsOpen] = useState(false)

    // Our own writes already update the shared copy of each table, so by default only the activity log is
    // reloaded; pass { all: true } (or table names) to re-download data that changed on the server side.
    const refreshAll = (opts = {}) => {
        const tables = opts.all ? undefined : opts.tables
        return Promise.all([activityHook.refresh(), opts.all || opts.tables ? refreshAllTables(tables) : null])
    }

    // Payments saved offline reach the server on their own: tell the user when that happens
    useEffect(() => {
        const onSynced = (e) => toastApi.success(`${e.detail.sent} pago${e.detail.sent === 1 ? '' : 's'} enviado${e.detail.sent === 1 ? '' : 's'} al servidor`)
        window.addEventListener('outbox:synced', onSynced)
        return () => window.removeEventListener('outbox:synced', onSynced)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loading = propsHook.loading || tenantsHook.loading || paymentsHook.loading

    const onDataChanged = (message) => {
        refreshAll()
        if (message) toastApi.success(message)
    }

    const saveBuilding = async (values, building) => {
        const res = building ? await buildingsHook.updateBuilding(building.id, values) : await buildingsHook.addBuilding(values)
        // Units copy the building's address when created: keep them in sync when it changes
        if (!res.error && building && (building.address || '') !== (values.address || '')) {
            const units = properties.filter(p => p.building_id === building.id && (p.address || '') === (building.address || ''))
            await Promise.all(units.map(u => propsHook.updateProperty(u.id, { address: values.address || u.address }, { silent: true })))
            propsHook.refresh()
        }
        if (res.error) {
            return { error: /relation|schema cache|does not exist|Could not find/i.test(res.error)
                ? 'Falta ejecutar supabase/migrations/002_buildings.sql en Supabase (esquema rental).'
                : res.error }
        }
        toastApi.success(building ? 'Edificio actualizado' : 'Edificio creado')
        return { error: null }
    }

    /** Downloads the collection letter (Ajustes -> Carta de cobro) for a tenant with overdue months. */
    const generateLetter = async (property, tenant) => {
        if (!property || !tenant) return
        const status = getPaymentStatus(property, tenant, payments)
        if (status.monthsOwed === 0) {
            toastApi.warning(`${tenant.name} no tiene meses pendientes: no hace falta una carta de cobro.`)
            return
        }
        try {
            const { generateCollectionLetter, letterFileName } = await import('../lib/letterTemplate')
            const building = buildings.find(b => b.id === property.building_id) || null
            const doc = await generateCollectionLetter({ property, tenant, building, status, payments, userSettings: settings || {}, letter: settings?.letter_settings })
            doc.save(letterFileName(tenant))
            logActivity({ action: 'document.letter', entityType: 'document', entityId: tenant.id, meta: { name: tenant.name, property_id: property.id, months: status.monthsOwed } })
            toastApi.success(`Carta de cobro generada para ${tenant.name}`)
        } catch (err) {
            console.error('Error generating letter:', err)
            toastApi.error('No se pudo generar la carta: ' + err.message)
        }
    }

    // The server removes the dependants of a deleted property / building: reload just those tables
    const deleteProperty = async (...args) => {
        const res = await propsHook.deleteProperty(...args)
        if (!res?.error) refreshAllTables(['tenants', 'rent_payments', 'gas_consumption'])
        return res
    }
    const deleteBuilding = async (...args) => {
        const res = await buildingsHook.deleteBuilding(...args)
        if (!res?.error) refreshAllTables(['properties'])
        return res
    }

    const value = {
        generateLetter,
        properties, tenants, payments, utilityReadings, buildings, settings, loading, metrics, alerts,
        activity: activityHook.entries,
        activityAvailable: activityHook.available,
        buildingsAvailable: buildingsHook.available,
        closeTenant: tenantsHook.closeTenant,
        deletePayment: paymentsHook.deletePayment,
        updatePayment: paymentsHook.updatePayment,
        setMonthsState: paymentsHook.setMonthsState,
        clearMonthMarks: paymentsHook.clearMonthMarks,
        deleteProperty,
        deleteBuilding,
        updateProperty: propsHook.updateProperty,
        toast: toastApi,
        refreshAll,
        onDataChanged,
        openPayment: (initial = null) => setPaymentModal({ open: true, initial }),
        openProperty: (property = null, opts = {}) => setPropertyModal({ open: true, property, buildingId: opts.buildingId || null }),
        openBuilding: (building = null) => setBuildingModal({ open: true, building }),
        openTenant: (property = null, tenant = null) => setTenantModal({ open: true, property, tenant }),
        openUtility: (type) => setUtilityType(type),
        openPayGas: (reading) => setPayGas(reading),
        openReport: (initial = null) => setReportModal({ open: true, initial }),
        openAlerts: () => setAlertsOpen(true),
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
                    setReceipt(result) // optional receipt: the user decides in the pop-up
                }}
            />
            <PrintReceiptPrompt data={receipt} settings={settings} onClose={() => setReceipt(null)} />

            <RegisterPropertyModal
                isOpen={propertyModal.open}
                propertyToEdit={propertyModal.property}
                defaultBuildingId={propertyModal.buildingId}
                buildings={buildings}
                onNewBuilding={() => setBuildingModal({ open: true, building: null })}
                onClose={() => setPropertyModal({ open: false, property: null, buildingId: null })}
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
            <RegisterUtilityModal
                isOpen={utilityType !== null}
                utilityType={utilityType}
                onClose={() => setUtilityType(null)}
                onSuccess={() => onDataChanged('Lectura registrada')}
            />
            <PayGasModal isOpen={payGas !== null} gasReading={payGas} onClose={() => setPayGas(null)} onSuccess={() => onDataChanged('Pago registrado')} />
            <ReportModal
                isOpen={reportModal.open}
                initial={reportModal.initial}
                properties={properties}
                tenants={tenants}
                payments={payments}
                buildings={buildings}
                settings={settings}
                onClose={() => setReportModal({ open: false, initial: null })}
            />
            <AlertDrawer
                isOpen={alertsOpen}
                onClose={() => setAlertsOpen(false)}
                overdue={alerts.overdue}
                upcoming={alerts.upcoming}
                onPayClick={(alert) => {
                    setAlertsOpen(false)
                    setPaymentModal({ open: true, initial: { propertyId: alert.propertyId, months: [alert.dueMonth] } })
                }}
            />

            <Toast toasts={toastApi.toasts} onRemove={toastApi.removeToast} />
        </AppContext.Provider>
    )
}
