import { useState, useEffect, useMemo } from 'react'
import { FileText } from 'lucide-react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { generatePaymentsReport } from '../../lib/reportGenerator'

/**
 * Payments report PDF.
 * `initial` = { propertyId?, paymentIds? } — paymentIds comes from the multi-select bar.
 */
export default function ReportModal({ isOpen, onClose, initial, properties, tenants, payments, buildings }) {
    const currentYear = new Date().getFullYear()
    const [propertyId, setPropertyId] = useState('')
    const [period, setPeriod] = useState(String(currentYear))
    const [error, setError] = useState('')

    const selectedIds = initial?.paymentIds
    useEffect(() => {
        if (isOpen) {
            setPropertyId(initial?.propertyId || '')
            setPeriod(selectedIds?.length ? 'selected' : String(currentYear))
            setError('')
        }
    }, [isOpen, initial])

    const years = useMemo(() => {
        const set = new Set(payments.map(p => p.payment_month?.slice(0, 4)).filter(Boolean))
        set.add(String(currentYear))
        return [...set].sort().reverse()
    }, [payments, currentYear])

    const handleGenerate = () => {
        const property = properties.find(p => p.id === propertyId)
        if (!property) return setError('Seleccione una propiedad')

        let rows = payments.filter(p => p.property_id === propertyId)
        let periodLabel = 'Historial completo'
        if (period === 'selected') {
            rows = rows.filter(p => selectedIds.includes(p.id))
            periodLabel = `${rows.length} pagos seleccionados`
        } else if (period !== 'all') {
            rows = rows.filter(p => p.payment_month.startsWith(period))
            periodLabel = `Año ${period}`
        }
        rows = rows.filter(p => parseFloat(p.amount_paid) > 0)
        if (rows.length === 0) return setError('No hay pagos para ese período')

        const tenant = tenants.find(t => t.property_id === propertyId && t.end_date === null)
            || tenants.find(t => t.id === rows[0].tenant_id)
        const building = buildings.find(b => b.id === property.building_id)
        generatePaymentsReport({ property, tenant, building, payments: rows, periodLabel })
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reporte de pagos (PDF)" size="sm">
            <FormInput label="Propiedad" name="property" type="select" value={propertyId}
                onChange={(e) => { setPropertyId(e.target.value); setError('') }} disabled={!!selectedIds?.length}>
                <option value="">Seleccionar propiedad...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </FormInput>
            <FormInput label="Período" name="period" type="select" value={period} onChange={(e) => setPeriod(e.target.value)}>
                {selectedIds?.length > 0 && <option value="selected">Pagos seleccionados ({selectedIds.length})</option>}
                {years.map(y => <option key={y} value={y}>Año {y}</option>)}
                <option value="all">Historial completo</option>
            </FormInput>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
                <Button size="sm" onClick={handleGenerate} className="inline-flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Descargar PDF
                </Button>
            </div>
        </Modal>
    )
}
