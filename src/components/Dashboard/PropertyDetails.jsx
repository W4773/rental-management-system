import { useMemo, useState, useEffect } from 'react'
import { Wallet, FileText, Pencil, Trash2, Printer, BedDouble, ShowerHead, User, Flame, Zap, Droplets, ChevronDown, ChevronUp, X, Building2, UserPlus, UserMinus, CheckSquare, ListChecks, Ban, Eraser } from 'lucide-react'
import { formatCurrency } from '../../lib/calculations'
import { formatDate } from '../../lib/dateUtils'
import { generateReceiptPDF } from '../../lib/pdfGenerator'
import { monthLabel } from '../../lib/pdfHelpers'
import { hasMoney, getMonthStatus, getPaymentStatus } from '../../lib/paymentStatus'
import { nextIncrease } from '../../lib/rentIncrease'
import StatusPill from './StatusPill'
import { useApp } from '../../contexts/AppContext'
import ConfirmModal from '../Common/ConfirmModal'
import YearlyPaymentGrid from './YearlyPaymentGrid'
import EditPaymentModal from '../Modals/EditPaymentModal'
import VoidMonthsModal from '../Modals/VoidMonthsModal'

const VISIBLE_PAYMENTS = 4
const UTILITY_META = {
    gas: { label: 'Gas', unit: 'GL', icon: Flame },
    electricity: { label: 'Luz', unit: 'kWh', icon: Zap },
    water: { label: 'Agua', unit: 'm³', icon: Droplets }
}

const IconBtn = ({ label, onClick, danger, children }) => (
    <button
        onClick={onClick}
        aria-label={label}
        title={label}
        className={`p-1.5 rounded-md border transition ${danger
            ? 'border-red-100 text-red-500 hover:bg-red-50'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
    >
        {children}
    </button>
)

const Section = ({ title, icon: Icon, right, children }) => (
    <section>
        <div className="flex items-center justify-between mb-1.5">
            <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-gray-500 uppercase">
                {Icon && <Icon className="w-3.5 h-3.5" />}{title}
            </h3>
            {right}
        </div>
        {children}
    </section>
)

export default function PropertyDetails({ property, onDeleted }) {
    const {
        payments: allPayments, tenants, utilityReadings, buildings, settings,
        openPayment, openProperty, openTenant, openReport, openPayGas,
        deletePayment, deleteProperty, closeTenant, setMonthsState, clearMonthMarks, onDataChanged, refreshAll, toast
    } = useApp()

    const [year, setYear] = useState(new Date().getFullYear())
    const [showAll, setShowAll] = useState(false)
    const [selectedPayments, setSelectedPayments] = useState([])
    const [selectedMonths, setSelectedMonths] = useState([])
    const [confirmDeleteProperty, setConfirmDeleteProperty] = useState(false)
    const [deleteIds, setDeleteIds] = useState([])
    const [confirmUnlink, setConfirmUnlink] = useState(false)
    const [selectMode, setSelectMode] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [editMonths, setEditMonths] = useState([])
    const [editingPayment, setEditingPayment] = useState(null)
    const [voidModal, setVoidModal] = useState(false)

    // Reset local selections when switching property
    useEffect(() => {
        setSelectedPayments([]); setSelectedMonths([]); setShowAll(false); setSelectMode(false); setEditMode(false); setEditMonths([])
    }, [property?.id])

    const propertyPayments = useMemo(
        () => property ? allPayments.filter(p => p.property_id === property.id) : [],
        [allPayments, property?.id]
    )
    const history = useMemo(
        () => propertyPayments
            .filter(p => hasMoney(p) && !p.auto_generated)
            .sort((a, b) => b.payment_month.localeCompare(a.payment_month) || (b.payment_date || '').localeCompare(a.payment_date || '')),
        [propertyPayments]
    )
    const utilities = useMemo(
        () => property ? utilityReadings.filter(g => g.property_id === property.id) : [],
        [utilityReadings, property?.id]
    )
    const pendingUtilities = utilities.filter(g => !g.paid).reduce((s, g) => s + (parseFloat(g.total_cost) || 0), 0)
    const activeTenant = property ? tenants.find(t => t.property_id === property.id && !t.end_date) : null
    const building = property ? buildings.find(b => b.id === property.building_id) : null

    if (!property) {
        return (
            <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-gray-400 gap-2">
                <Building2 className="w-10 h-10" />
                <p className="text-sm">Seleccione una propiedad para ver los detalles</p>
            </div>
        )
    }

    const rentStatus = getPaymentStatus(property, activeTenant, propertyPayments)
    const increase = nextIncrease(property)
    const visible = showAll ? history : history.slice(0, VISIBLE_PAYMENTS)
    const toggle = (list, setList, id) => setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
    const allSelected = history.length > 0 && selectedPayments.length === history.length

    const exitSelectMode = () => { setSelectMode(false); setSelectedPayments([]); setSelectedMonths([]) }
    const exitEditMode = () => { setEditMode(false); setEditMonths([]) }
    // The two modes are mutually exclusive
    const toggleSelectMode = () => { if (selectMode) exitSelectMode(); else { exitEditMode(); setSelectMode(true) } }
    const toggleEditMode = () => { if (editMode) exitEditMode(); else { exitSelectMode(); setEditMode(true) } }

    // Past months of the year on screen that can be edited (no real payments registered)
    const editableMonthKeys = Array.from({ length: 12 }, (_, i) => getMonthStatus(propertyPayments, property, year, i))
        .filter(m => m.status !== 'future' && !m.locked)
        .map(m => m.key)
    const allEditableSelected = editableMonthKeys.length > 0 && editableMonthKeys.every(k => editMonths.includes(k))
    const selectedHaveMarks = editMonths.some(k => {
        const [y, mo] = k.split('-').map(Number)
        const st = getMonthStatus(propertyPayments, property, y, mo - 1)
        return st.markRows.length > 0
    })

    const reportMarking = (res, verb) => {
        if (res.error) {
            const missing = /voided|void_reason/i.test(res.error)
            toast.error(missing
                ? 'Falta ejecutar supabase/migrations/006_payment_void.sql en Supabase para marcar meses como nulos.'
                : 'No se pudo guardar: ' + res.error, 8000)
            return false
        }
        if (res.done.length > 0) toast.success(`${res.done.length} mes(es) ${verb}`)
        if (res.skipped.length > 0) toast.warning(`${res.skipped.length} mes(es) se omitieron porque tienen pagos registrados: edita o elimina el pago primero.`, 7000)
        return true
    }
    const markPending = async () => {
        const res = await setMonthsState(property, activeTenant, editMonths, 'pending')
        if (reportMarking(res, 'marcados como pendientes')) { refreshAll(); exitEditMode() }
    }
    const markVoid = async (reason) => {
        const res = await setMonthsState(property, activeTenant, editMonths, 'void', { reason })
        setVoidModal(false)
        if (reportMarking(res, 'marcados como nulos')) { refreshAll(); exitEditMode() }
    }
    const clearMarks = async () => {
        const res = await clearMonthMarks(property, editMonths)
        if (res.error) return toast.error('No se pudo quitar la marca: ' + res.error, 6000)
        toast.success(`${res.count} marca(s) quitada(s)`)
        refreshAll(); exitEditMode()
    }
    const pendingMonthKeys = Array.from({ length: 12 }, (_, i) => getMonthStatus(propertyPayments, property, year, i))
        .filter(m => m.status === 'pending' || m.status === 'partial')
        .map(m => m.key)
    const allPendingSelected = pendingMonthKeys.length > 0 && pendingMonthKeys.every(k => selectedMonths.includes(k))

    const tenantFor = (payment) => tenants.find(t => t.id === payment.tenant_id)
        || (activeTenant && activeTenant.id === payment.tenant_id ? activeTenant : { name: 'Inquilino histórico', identity_number: '' })

    const handleDeletePayments = async () => {
        for (const id of deleteIds) {
            const { error } = await deletePayment(id)
            if (error) { toast.error('Error al eliminar pago: ' + error); throw new Error(error) }
        }
        toast.success(`${deleteIds.length} pago(s) eliminado(s)`)
        setDeleteIds([])
        setSelectedPayments([])
        refreshAll()
    }

    const handleUnlinkTenant = async () => {
        const { error } = await closeTenant(activeTenant.id, new Date())
        if (error) { toast.error('Error al desvincular inquilino'); throw new Error(error) }
        onDataChanged('Inquilino desvinculado. Quedó en Inquilinos → Antiguos con su historial de pagos.')
    }

    const handleDeleteProperty = async () => {
        const { error } = await deleteProperty(property.id)
        if (error) { toast.error('Error al eliminar propiedad: ' + error); throw new Error(error) }
        toast.success('Propiedad eliminada')
        refreshAll()
        onDeleted?.()
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-ink leading-tight">{property.name}</h2>
                    <p className="text-sm text-gray-500">
                        {building ? `${building.name} · ` : ''}{property.address}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{property.bedrooms} Hab</span>
                        <span className="flex items-center gap-1"><ShowerHead className="w-3.5 h-3.5" />{property.bathrooms} Baños</span>
                    </div>
                    {increase && (
                        <p className="mt-1 text-xs text-gray-600">
                            Aumento anual: <span className="font-semibold">{increase.label}</span>
                            {increase.date
                                ? <> · próximo el <span className="font-semibold">{formatDate(increase.date)}</span> → {formatCurrency(increase.newRent)}</>
                                : <> · sin fecha definida</>}
                        </p>
                    )}
                    {activeTenant && (
                        <div className="mt-1.5"><StatusPill status={rentStatus} showDetail align="left" /></div>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-xl font-bold text-brand-700 leading-tight">{formatCurrency(property.monthly_rent)}</p>
                    <p className="text-[11px] text-gray-500 mb-1.5">mensual</p>
                    <div className="flex items-center gap-1.5 justify-end">
                        {activeTenant && (
                            <button onClick={() => openPayment({ propertyId: property.id })}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold">
                                <Wallet className="w-3.5 h-3.5" /> Pagar
                            </button>
                        )}
                        <IconBtn label="Reporte PDF" onClick={() => openReport({ propertyId: property.id })}><FileText className="w-4 h-4" /></IconBtn>
                        <IconBtn label="Editar propiedad" onClick={() => openProperty(property)}><Pencil className="w-4 h-4" /></IconBtn>
                        <IconBtn label="Eliminar propiedad" danger onClick={() => setConfirmDeleteProperty(true)}><Trash2 className="w-4 h-4" /></IconBtn>
                    </div>
                </div>
            </div>

            {/* Tenant */}
            <Section title="Inquilino actual" icon={User}>
                {activeTenant ? (
                    <div className="rounded-lg bg-brand-50 border border-brand-100 p-3">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
                            <div><dt className="inline font-semibold">Nombre: </dt><dd className="inline">{activeTenant.name}</dd></div>
                            <div><dt className="inline font-semibold">Cédula: </dt><dd className="inline">{activeTenant.identity_number}</dd></div>
                            <div><dt className="inline font-semibold">Teléfono: </dt><dd className="inline">{activeTenant.phone}</dd></div>
                            <div><dt className="inline font-semibold">Email: </dt><dd className="inline">{activeTenant.email || '-'}</dd></div>
                            <div><dt className="inline font-semibold">Entrada: </dt><dd className="inline">{formatDate(activeTenant.start_date)}</dd></div>
                        </dl>
                        <div className="mt-2.5 flex gap-2">
                            <button onClick={() => openTenant(property, activeTenant)}
                                className="flex-1 bg-brand-600 text-white py-1.5 rounded-md hover:bg-brand-700 text-xs font-semibold">Editar inquilino</button>
                            <button onClick={() => openTenant(property, null)}
                                className="flex-1 bg-accent-500 text-white py-1.5 rounded-md hover:bg-accent-600 text-xs font-semibold">Cambiar inquilino</button>
                            <button onClick={() => setConfirmUnlink(true)} aria-label="Desvincular inquilino"
                                className="flex items-center justify-center gap-1 px-3 bg-white text-red-600 border border-red-200 py-1.5 rounded-md hover:bg-red-50 text-xs font-semibold">
                                <UserMinus className="w-3.5 h-3.5" /> Desvincular
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
                        <p className="text-sm text-gray-500 mb-1">No hay inquilino activo</p>
                        <button onClick={() => openTenant(property, null)} className="inline-flex items-center gap-1 text-brand-700 font-medium text-sm hover:underline">
                            <UserPlus className="w-4 h-4" /> Asignar inquilino
                        </button>
                    </div>
                )}
            </Section>

            {/* Payments toolbar: multi-select */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
                <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-gray-500 uppercase pt-2">
                    <Wallet className="w-3.5 h-3.5" /> Pagos
                </h3>
                <div className="flex items-center gap-1.5 pt-2">
                    {selectMode && activeTenant && pendingMonthKeys.length > 0 && (
                        <button onClick={() => setSelectedMonths(allPendingSelected ? [] : pendingMonthKeys)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50">
                            <ListChecks className="w-3.5 h-3.5" />
                            {allPendingSelected ? 'Quitar meses pendientes' : `Marcar meses pendientes (${pendingMonthKeys.length})`}
                        </button>
                    )}
                    {editMode && editableMonthKeys.length > 0 && (
                        <button onClick={() => setEditMonths(allEditableSelected ? [] : editableMonthKeys)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50">
                            <ListChecks className="w-3.5 h-3.5" />
                            {allEditableSelected ? 'Quitar todos' : `Todos los meses hasta hoy (${editableMonthKeys.length})`}
                        </button>
                    )}
                    {activeTenant && (
                        <button onClick={toggleEditMode} aria-pressed={editMode}
                            title="Marcar meses como pendientes o nulos"
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-semibold transition ${
                                editMode ? 'bg-ink text-white border-ink' : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'}`}>
                            {editMode ? <><X className="w-3.5 h-3.5" /> Salir de edición</> : <><Pencil className="w-3.5 h-3.5" /> Editar meses</>}
                        </button>
                    )}
                    <button onClick={toggleSelectMode} aria-pressed={selectMode}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-semibold transition ${
                            selectMode ? 'bg-ink text-white border-ink' : 'border-brand-300 text-brand-700 bg-brand-50 hover:bg-brand-100'}`}>
                        {selectMode ? <><X className="w-3.5 h-3.5" /> Salir de selección</> : <><CheckSquare className="w-3.5 h-3.5" /> Selección múltiple</>}
                    </button>
                </div>
            </div>

            {/* Payments + yearly grid side by side on wide screens */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Section
                    title="Historial de pagos"
                    right={selectMode && history.length > 0 && (
                        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                            <input type="checkbox" checked={allSelected}
                                onChange={() => setSelectedPayments(allSelected ? [] : history.map(p => p.id))} />
                            Todos
                        </label>
                    )}
                >
                    {history.length === 0 ? (
                        <p className="text-sm italic text-gray-500 py-2">No hay pagos registrados.</p>
                    ) : (
                        <ul className="space-y-1">
                            {visible.map(payment => (
                                <li key={payment.id}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${selectedPayments.includes(payment.id) ? 'bg-brand-50 border-brand-300' : 'bg-white border-gray-100'}`}>
                                    {selectMode && (
                                        <input type="checkbox" aria-label={`Seleccionar ${monthLabel(payment.payment_month)}`}
                                            checked={selectedPayments.includes(payment.id)}
                                            onChange={() => toggle(selectedPayments, setSelectedPayments, payment.id)} />
                                    )}
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${payment.payment_status === 'paid' ? 'bg-green-500' : 'bg-amber-400'}`} />
                                    <div className="min-w-0 flex-1 leading-tight">
                                        <p className="text-[13px] font-medium capitalize">{monthLabel(payment.payment_month)}</p>
                                        <p className="text-[11px] text-gray-500">{formatDate(payment.payment_date)}</p>
                                    </div>
                                    <span className={`text-[13px] font-semibold ${payment.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                                        {formatCurrency(payment.amount_paid)}
                                    </span>
                                    <button onClick={() => generateReceiptPDF(payment, property, tenantFor(payment), settings || {})}
                                        aria-label="Imprimir recibo" title="Imprimir recibo"
                                        className="p-1 rounded text-gray-400 hover:text-brand-700 hover:bg-brand-50"><Printer className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingPayment(payment)}
                                        aria-label="Editar pago" title="Editar pago"
                                        className="p-1 rounded text-gray-400 hover:text-brand-700 hover:bg-brand-50"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => setDeleteIds([payment.id])}
                                        aria-label="Eliminar pago" title="Eliminar pago"
                                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {history.length > VISIBLE_PAYMENTS && (
                        <button onClick={() => setShowAll(s => !s)}
                            className="mt-1.5 w-full flex items-center justify-center gap-1 py-1 rounded-md bg-brand-50 text-brand-700 text-xs font-medium hover:bg-brand-100">
                            {showAll ? <><ChevronUp className="w-3.5 h-3.5" />Ver menos</> : <><ChevronDown className="w-3.5 h-3.5" />Ver más ({history.length - VISIBLE_PAYMENTS} ocultos)</>}
                        </button>
                    )}
                </Section>

                <YearlyPaymentGrid
                    property={property}
                    payments={propertyPayments}
                    year={year}
                    onYearChange={setYear}
                    selectMode={selectMode}
                    editMode={editMode}
                    selected={editMode ? editMonths : selectedMonths}
                    onToggle={activeTenant
                        ? (key) => (editMode ? toggle(editMonths, setEditMonths, key) : toggle(selectedMonths, setSelectedMonths, key))
                        : undefined}
                    onMonthClick={activeTenant ? (key) => openPayment({ propertyId: property.id, months: [key] }) : undefined}
                />
            </div>

            {/* Utilities: gas / luz / agua */}
            <Section title="Servicios (gas, luz, agua)" icon={Flame}
                right={pendingUtilities > 0 && <span className="text-xs font-semibold text-amber-700">Pendiente: {formatCurrency(pendingUtilities)}</span>}>
                {utilities.length === 0 ? (
                    <p className="text-sm italic text-gray-500 py-1.5 text-center bg-gray-50 rounded-lg">No hay lecturas registradas</p>
                ) : (
                    <ul className="space-y-1">
                        {utilities.map(reading => {
                            const meta = UTILITY_META[reading.utility_type] || UTILITY_META.gas
                            return (
                                <li key={reading.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[13px] ${reading.paid ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                                    <meta.icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                    <div className="flex-1 min-w-0 leading-tight">
                                        <span className="font-medium">{meta.label} · {formatDate(reading.reading_date)}</span>
                                        <span className="text-[11px] text-gray-600 ml-2">Lectura {reading.current_reading} · {reading.consumption_volume} {meta.unit}</span>
                                        {reading.paid && <span className="text-[11px] text-green-700 ml-2">Pagado {formatDate(reading.payment_date)}</span>}
                                    </div>
                                    <span className="font-bold">{formatCurrency(reading.total_cost)}</span>
                                    {!reading.paid && (
                                        <button onClick={() => openPayGas(reading)}
                                            className="px-2 py-0.5 rounded bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700">Pagar</button>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </Section>

            {/* Edit-months action bar */}
            {editMode && (
                <div className="sticky bottom-2 z-20 mx-auto w-fit max-w-full flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-ink text-white shadow-xl text-xs">
                    {editMonths.length === 0 ? (
                        <span className="opacity-80">Marca los meses que quieres corregir (los que ya tienen pagos registrados están bloqueados).</span>
                    ) : (
                        <>
                            <span className="font-semibold">{editMonths.length} mes(es)</span>
                            <button className="px-2.5 py-1 rounded-md bg-red-500/90 hover:bg-red-500 font-semibold flex items-center gap-1" onClick={markPending}>
                                <Wallet className="w-3.5 h-3.5" /> Marcar pendiente
                            </button>
                            <button className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 font-semibold flex items-center gap-1" onClick={() => setVoidModal(true)}>
                                <Ban className="w-3.5 h-3.5" /> Marcar nulo…
                            </button>
                            {selectedHaveMarks && (
                                <button className="px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 flex items-center gap-1" onClick={clearMarks}>
                                    <Eraser className="w-3.5 h-3.5" /> Quitar marca
                                </button>
                            )}
                        </>
                    )}
                    <button aria-label="Salir de edición de meses" onClick={exitEditMode}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Floating multi-select action bar */}
            {selectMode && (
                <div className="sticky bottom-2 z-20 mx-auto w-fit max-w-full flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-ink text-white shadow-xl text-xs">
                    {selectedPayments.length === 0 && selectedMonths.length === 0 && (
                        <span className="opacity-80">Marca meses pendientes para pagarlos juntos, o pagos para imprimirlos o eliminarlos.</span>
                    )}
                    {selectedMonths.length > 0 && (
                        <>
                            <span className="font-semibold">{selectedMonths.length} mes(es)</span>
                            <button className="px-2.5 py-1 rounded-md bg-brand-500 hover:bg-brand-400 font-semibold flex items-center gap-1"
                                onClick={() => { openPayment({ propertyId: property.id, months: selectedMonths }); exitSelectMode() }}>
                                <Wallet className="w-3.5 h-3.5" /> Pagar {selectedMonths.length > 1 ? `${selectedMonths.length} meses` : 'mes'}
                            </button>
                        </>
                    )}
                    {selectedPayments.length > 0 && (
                        <>
                            {selectedMonths.length > 0 && <span className="opacity-40">|</span>}
                            <span className="font-semibold">{selectedPayments.length} pago(s)</span>
                            <button className="px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 flex items-center gap-1"
                                onClick={() => openReport({ propertyId: property.id, paymentIds: selectedPayments })}>
                                <FileText className="w-3.5 h-3.5" /> Reporte
                            </button>
                            <button className="px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 flex items-center gap-1"
                                onClick={() => generateReceiptPDF(history.filter(p => selectedPayments.includes(p.id)), property, activeTenant || tenantFor(history.find(p => selectedPayments.includes(p.id))), settings || {})}>
                                <Printer className="w-3.5 h-3.5" /> Recibo
                            </button>
                            <button className="px-2 py-1 rounded-md bg-red-500/80 hover:bg-red-500 flex items-center gap-1"
                                onClick={() => setDeleteIds(selectedPayments)}>
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar
                            </button>
                        </>
                    )}
                    <button aria-label="Salir de selección múltiple" onClick={exitSelectMode}><X className="w-4 h-4" /></button>
                </div>
            )}

            <EditPaymentModal isOpen={editingPayment !== null} payment={editingPayment} property={property} onClose={() => setEditingPayment(null)} />
            <VoidMonthsModal isOpen={voidModal} months={editMonths} onClose={() => setVoidModal(false)} onConfirm={markVoid} />
            <ConfirmModal
                isOpen={confirmUnlink}
                onClose={() => setConfirmUnlink(false)}
                onConfirm={handleUnlinkTenant}
                title="Desvincular inquilino"
                message={`¿Desvincular a ${activeTenant?.name || ''} de ${property.name}? La propiedad quedará vacante y el inquilino pasa a "Antiguos" con todo su historial de pagos.`}
                confirmText="Sí, desvincular"
                isDanger
            />
            <ConfirmModal
                isOpen={confirmDeleteProperty}
                onClose={() => setConfirmDeleteProperty(false)}
                onConfirm={handleDeleteProperty}
                title="Eliminar Propiedad"
                message="ADVERTENCIA: Esto eliminará la propiedad y TODO su historial (inquilinos, pagos, gas). Esta acción es IRREVERSIBLE. ¿Desea continuar?"
                confirmText="Sí, eliminar todo"
                isDanger
            />
            <ConfirmModal
                isOpen={deleteIds.length > 0}
                onClose={() => setDeleteIds([])}
                onConfirm={handleDeletePayments}
                title={deleteIds.length > 1 ? 'Eliminar pagos' : 'Eliminar pago'}
                message={`¿Eliminar ${deleteIds.length} registro(s) de pago? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                isDanger
            />
        </div>
    )
}
