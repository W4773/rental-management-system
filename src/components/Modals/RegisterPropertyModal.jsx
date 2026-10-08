import { refreshTable } from '../../lib/dataStore'
import { useState, useEffect } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { validatePropertyName, validateMonthlyRent } from '../../lib/validators'
import { useProperties } from '../../hooks/useProperties'
import { useTenants } from '../../hooks/useTenants'
import { usePayments } from '../../hooks/usePayments'
import { useApp } from '../../contexts/AppContext'
import { supabase } from '../../lib/supabase'
import { logActivity } from '../../lib/activityLog'
import { withRentChange, nextMonthKey } from '../../lib/rentHistory'
import { createTenantWithHistory, depositColumnMissing, DEPOSIT_MIGRATION_MESSAGE } from '../../lib/createTenantWithHistory'
import { validateCedula, validatePhone, validateEmail, validateNotFutureDate, formatCedulaInput, formatPhoneInput } from '../../lib/validators'

const EMPTY_TENANT = {
    name: '', identity_number: '', phone: '', email: '', deposit_amount: '',
    start_date: new Date().toISOString().split('T')[0]
}

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
    annual_increase_pct: '',
    increase_type: 'percentage',
    increase_start_date: '',
    building_id: ''
}

export default function RegisterPropertyModal({ isOpen, onClose, onSuccess, propertyToEdit = null, buildings = [], onNewBuilding, defaultBuildingId = null }) {
    const { addProperty, updateProperty } = useProperties()
    const { toast, tenants: appTenants, payments: appPayments } = useApp()
    const [rentFrom, setRentFrom] = useState(nextMonthKey())
    const { addTenant } = useTenants()
    const { generateHistoricalPayments } = usePayments()
    const [tenantData, setTenantData] = useState(EMPTY_TENANT)
    const [errors, setErrors] = useState({})
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [customAddress, setCustomAddress] = useState(false)
    const selectedBuilding = buildings.find(b => b.id === formData.building_id)
    // Changing the price of a property that already has history: ask from which month it applies.
    // Paid months and earlier months keep their price.
    const newRent = parseFloat(formData.monthly_rent)
    const rentChanged = !!propertyToEdit && Number.isFinite(newRent) && newRent !== parseFloat(propertyToEdit.monthly_rent)
    const hasHistory = !!propertyToEdit && (appPayments.some(p => p.property_id === propertyToEdit.id) || appTenants.some(t => t.property_id === propertyToEdit.id))
    const askEffective = rentChanged && hasHistory
    // With a building that has an address, the unit takes it automatically unless the user opts out
    const addressFromBuilding = Boolean(selectedBuilding?.address) && !customAddress
    const effectiveAddress = addressFromBuilding ? selectedBuilding.address : formData.address

    useEffect(() => {
        if (isOpen && propertyToEdit) {
            setFormData({
                name: propertyToEdit.name || '',
                address: propertyToEdit.address || '',
                monthly_rent: propertyToEdit.monthly_rent || '',
                bedrooms: propertyToEdit.bedrooms || '',
                bathrooms: propertyToEdit.bathrooms || '',
                property_type: propertyToEdit.property_type || 'apartamento',
                unit_number: propertyToEdit.unit_number || '',
                square_meters: propertyToEdit.square_meters || '',
                notes: propertyToEdit.notes || '',
                contract_start_date: propertyToEdit.contract_start_date || '',
                annual_increase_pct: propertyToEdit.annual_increase_pct || '',
                increase_type: propertyToEdit.increase_type || 'percentage',
                increase_start_date: propertyToEdit.increase_start_date || '',
                building_id: propertyToEdit.building_id || ''
            })
            // A stored address that differs from the building's is a deliberate custom one
            const b = buildings.find(x => x.id === propertyToEdit.building_id)
            setCustomAddress(Boolean(b?.address && propertyToEdit.address && propertyToEdit.address !== b.address))
            setRentFrom(nextMonthKey())
        } else if (isOpen) {
            setFormData({ ...EMPTY_FORM, building_id: defaultBuildingId || '' })
            setTenantData(EMPTY_TENANT)
            setCustomAddress(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, propertyToEdit, defaultBuildingId])

    const handleChange = (e) => {
        const { name, value } = e.target
        if (name === 'building_id' && value === '__new__') {
            onNewBuilding?.()
            return
        }
        if (name === 'building_id') setCustomAddress(false)
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
    }

    const handleTenantChange = (e) => {
        let { name, value } = e.target
        if (name === 'identity_number') value = formatCedulaInput(value)
        else if (name === 'phone') value = formatPhoneInput(value)
        setTenantData(prev => ({ ...prev, [name]: value }))
        if (errors[`tenant_${name}`]) setErrors(prev => ({ ...prev, [`tenant_${name}`]: null }))
    }

    // The tenant section is optional: it only counts when a name is typed
    const wantsTenant = !propertyToEdit && tenantData.name.trim().length > 0

    const validate = () => {
        const newErrors = {}

        const nameError = validatePropertyName(formData.name)
        if (nameError) newErrors.name = nameError

        if (!effectiveAddress || effectiveAddress.trim().length === 0) {
            newErrors.address = selectedBuilding ? 'Este edificio no tiene dirección: escríbela aquí o edítalo' : 'La dirección es obligatoria'
        } else if (effectiveAddress.length > 255) {
            newErrors.address = 'La dirección no puede exceder 255 caracteres'
        }

        const rentError = validateMonthlyRent(formData.monthly_rent)
        if (rentError) newErrors.monthly_rent = rentError

        if (formData.increase_start_date && !(parseFloat(formData.annual_increase_pct) > 0)) {
            newErrors.annual_increase_pct = 'Indica el porcentaje o monto del aumento para usar la fecha de entrada en vigor'
        }

        if (formData.notes && formData.notes.length > 500) {
            newErrors.notes = 'Las notas no pueden exceder 500 caracteres'
        }

        if (wantsTenant) {
            const cedulaError = validateCedula(tenantData.identity_number)
            if (cedulaError) newErrors.tenant_identity_number = cedulaError
            const phoneError = validatePhone(tenantData.phone)
            if (phoneError) newErrors.tenant_phone = phoneError
            const emailError = validateEmail(tenantData.email)
            if (emailError) newErrors.tenant_email = emailError
            const dateError = validateNotFutureDate(tenantData.start_date)
            if (dateError) newErrors.tenant_start_date = dateError
            if (tenantData.deposit_amount !== '' && !(parseFloat(tenantData.deposit_amount) >= 0)) {
                newErrors.tenant_deposit_amount = 'El depósito debe ser un monto válido'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        const propertyData = {
            name: formData.name.trim(),
            address: effectiveAddress.trim(),
            monthly_rent: parseFloat(formData.monthly_rent),
            bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 1,
            bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 1,
            property_type: formData.property_type || 'apartamento',
            unit_number: formData.unit_number.trim() || null,
            square_meters: formData.square_meters ? parseFloat(formData.square_meters) : null,
            notes: formData.notes.trim() || null,
            contract_start_date: formData.contract_start_date || null,
            annual_increase_pct: formData.annual_increase_pct ? parseFloat(formData.annual_increase_pct) : null,
            increase_type: formData.increase_type || 'percentage',
        }

        // The date column comes with migration 005: only send it when there is something to save
        if (formData.increase_start_date) propertyData.increase_start_date = formData.increase_start_date
        else if (propertyToEdit?.increase_start_date) propertyData.increase_start_date = null

        // building_id only travels when relevant, so saving keeps working before migration 002 is applied
        if (formData.building_id) propertyData.building_id = formData.building_id
        else if (propertyToEdit?.building_id) propertyData.building_id = null

        setSaving(true)
        let saved, error
        if (propertyToEdit && askEffective) {
            if (!/^\d{4}-\d{2}$/.test(rentFrom)) { setSaving(false); setErrors({ monthly_rent: 'Elige el mes desde el que aplica el nuevo precio' }); return }
            // 1) Freeze: payment rows without their own rent keep the OLD price
            const freeze = await supabase.from('rent_payments').update({ rent_amount: parseFloat(propertyToEdit.monthly_rent) })
                .eq('property_id', propertyToEdit.id).or('rent_amount.is.null,rent_amount.eq.0')
            if (freeze.error) console.warn('Could not freeze old rent on payments:', freeze.error.message)
            else refreshTable('rent_payments')
            // 2) Keep the price history so unpaid earlier months keep the old price too
            ;({ data: saved, error } = await updateProperty(propertyToEdit.id, { ...propertyData, rent_history: withRentChange(propertyToEdit, newRent, rentFrom) }))
            if (error && /rent_history/i.test(error)) {
                ;({ data: saved, error } = await updateProperty(propertyToEdit.id, propertyData))
                if (!error) toast.warning('Precio guardado, pero falta ejecutar supabase/migrations/010_rent_history.sql en Supabase: sin ella, los meses anteriores sin cobrar usarán el precio nuevo.', 12000)
            }
            if (!error) logActivity({ action: 'property.rent_change', entityType: 'property', entityId: propertyToEdit.id, meta: { name: propertyData.name, from: parseFloat(propertyToEdit.monthly_rent), to: newRent, effective: rentFrom } })
        } else {
            ;({ data: saved, error } = propertyToEdit
                ? await updateProperty(propertyToEdit.id, propertyData)
                : await addProperty(propertyData))
        }
        if (error) {
            setSaving(false)
            const duplicate = /duplicate|unique/i.test(error)
            const missingColumn = /increase_start_date/i.test(error)
            setErrors(duplicate
                ? { name: 'Ya existe una propiedad con este nombre' }
                : { submit: missingColumn ? 'Falta ejecutar supabase/migrations/005_increase_start_date.sql en Supabase (esquema rental) para guardar la fecha del aumento.' : error })
            return
        }

        // Optional all-in-one: the property is saved, so a tenant problem must not undo it
        if (wantsTenant) {
            const propertyId = saved?.id || saved?.[0]?.id
            const { error: tenantError } = propertyId
                ? await createTenantWithHistory({ addTenant, generateHistoricalPayments }, { propertyId, monthlyRent: propertyData.monthly_rent, values: tenantData })
                : { error: 'No se pudo leer la propiedad creada' }
            if (tenantError) {
                setSaving(false)
                if (onSuccess) onSuccess()
                setFormData(EMPTY_FORM)
                setTenantData(EMPTY_TENANT)
                setErrors({})
                onClose()
                toast.warning(`La propiedad se guardó, pero no se pudo registrar el inquilino: ${depositColumnMissing(tenantError) ? DEPOSIT_MIGRATION_MESSAGE : tenantError}\nPuedes asignarlo desde la propiedad con "Asignar inquilino".`, 10000)
                return
            }
        }
        setSaving(false)

        setFormData(EMPTY_FORM)
        setTenantData(EMPTY_TENANT)
        setErrors({})
        if (onSuccess) onSuccess()
        onClose()
    }

    const handleClose = () => {
        setTenantData(EMPTY_TENANT)
        setCustomAddress(false)
        setFormData(EMPTY_FORM)
        setErrors({})
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={propertyToEdit ? "Editar Propiedad" : "Registrar Nueva Propiedad"} size="xl">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                    {/* Left Column: Identificación y Detalles Físicos */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">Identificación</p>
                            <div className="space-y-3">
                                <FormInput
                                    label="Nombre / Código"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    error={errors.name}
                                    required
                                    placeholder="Ej: APT 101"
                                    maxLength={50}
                                />
                                <FormInput
                                    label="Edificio"
                                    name="building_id"
                                    type="select"
                                    value={formData.building_id}
                                    onChange={handleChange}
                                >
                                    <option value="">Sin edificio</option>
                                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    {onNewBuilding && <option value="__new__">+ Nuevo edificio...</option>}
                                </FormInput>
                                <FormInput
                                    label="Dirección Completa"
                                    name="address"
                                    value={effectiveAddress}
                                    onChange={handleChange}
                                    error={errors.address}
                                    required
                                    disabled={addressFromBuilding}
                                    placeholder="Ej: Calle Principal #123, Santo Domingo"
                                    maxLength={255}
                                />
                                {addressFromBuilding && (
                                    <p className="-mt-2 mb-3 text-xs text-gray-500">
                                        Tomada del edificio.{' '}
                                        <button type="button" className="text-brand-700 font-semibold hover:underline"
                                            onClick={() => { setFormData(prev => ({ ...prev, address: selectedBuilding.address })); setCustomAddress(true) }}>
                                            Usar otra dirección
                                        </button>
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3 pt-2">Detalles físicos</p>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput
                                        label="Tipo de propiedad"
                                        name="property_type"
                                        type="select"
                                        value={formData.property_type}
                                        onChange={handleChange}
                                    >
                                        <option value="apartamento">Apartamento</option>
                                        <option value="casa">Casa</option>
                                        <option value="local_comercial">Local comercial</option>
                                        <option value="otro">Otro</option>
                                    </FormInput>
                                    <FormInput
                                        label="Piso / Número de unidad"
                                        name="unit_number"
                                        value={formData.unit_number}
                                        onChange={handleChange}
                                        placeholder="Ej: Piso 3, Apto 3B"
                                        maxLength={50}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormInput
                                        label="Habitaciones"
                                        name="bedrooms"
                                        type="select"
                                        value={formData.bedrooms}
                                        onChange={handleChange}
                                    >
                                        <option value="">—</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                        <option value="5">5+</option>
                                    </FormInput>
                                    <FormInput
                                        label="Baños"
                                        name="bathrooms"
                                        type="select"
                                        value={formData.bathrooms}
                                        onChange={handleChange}
                                    >
                                        <option value="">—</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4+</option>
                                    </FormInput>
                                    <FormInput
                                        label="Metros cuadrados"
                                        name="square_meters"
                                        type="number"
                                        value={formData.square_meters}
                                        onChange={handleChange}
                                        placeholder="Ej: 75"
                                        min="1"
                                        step="0.5"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Contrato y Notas */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">Contrato</p>
                            <div className="space-y-3">
                                <FormInput
                                    label="Precio de Alquiler Mensual (RD$)"
                                    name="monthly_rent"
                                    type="number"
                                    value={formData.monthly_rent}
                                    onChange={handleChange}
                                    error={errors.monthly_rent}
                                    required
                                    placeholder="15000"
                                    min="0"
                                    step="0.01"
                                />
                                {askEffective && (
                                    <div className="-mt-1 mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                                        <p className="font-semibold">Cambio de precio: {`RD$ ${parseFloat(propertyToEdit.monthly_rent).toLocaleString('en-US')} → RD$ ${newRent.toLocaleString('en-US')}`}</p>
                                        <label className="flex items-center gap-2">
                                            Aplicar el nuevo precio desde
                                            <input type="month" value={rentFrom} onChange={(e) => setRentFrom(e.target.value)} aria-label="Aplicar nuevo precio desde"
                                                className="px-2 py-1 border border-amber-300 rounded bg-white text-sm" />
                                        </label>
                                        <p>Los pagos ya cobrados y los meses anteriores a esa fecha conservan su monto: el histórico no se altera.</p>
                                    </div>
                                )}
                                <FormInput
                                    label="Fecha inicio contrato"
                                    name="contract_start_date"
                                    type="date"
                                    value={formData.contract_start_date}
                                    onChange={handleChange}
                                />
                                <div>
                                    <label className="accessible-label mb-1 block">Incremento anual <span className="text-gray-400 font-normal">(opcional)</span></label>
                                    {/* Toggle tipo */}
                                    <div className="flex rounded-lg overflow-hidden border-2 border-gray-200 mb-2" style={{ height: '48px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, increase_type: 'percentage' }))}
                                            className={`flex-1 font-semibold text-[16px] transition ${
                                                formData.increase_type === 'percentage'
                                                    ? 'bg-brand-600 text-white'
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
                                                    ? 'bg-brand-600 text-white'
                                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            RD$ Monto Fijo
                                        </button>
                                    </div>
                                    {/* Input field */}
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
                                    {/* First increase date */}
                                    <div className="mt-3">
                                        <label className="accessible-label mb-1 block" htmlFor="increase_start_date">
                                            Fecha del primer aumento <span className="text-gray-400 font-normal">(opcional)</span>
                                        </label>
                                        <input
                                            id="increase_start_date"
                                            type="date"
                                            name="increase_start_date"
                                            value={formData.increase_start_date}
                                            onChange={handleChange}
                                            className="accessible-input w-full"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Día en que entra en vigor el aumento por primera vez; después se repite cada año en la misma fecha.
                                        </p>
                                    </div>
                                    {errors.annual_increase_pct && <p className="mt-1 text-xs text-red-600">{errors.annual_increase_pct}</p>}
                                    {/* Live preview */}
                                    {formData.annual_increase_pct && formData.monthly_rent && (
                                        <p className="mt-2 text-[14px] text-blue-700 bg-blue-50 px-3 py-2 rounded-lg font-medium">
                                            {formData.increase_type === 'percentage'
                                                ? `Con ${formData.annual_increase_pct}% → RD$${(parseFloat(formData.monthly_rent) * (1 + parseFloat(formData.annual_increase_pct) / 100)).toLocaleString('es-DO', { minimumFractionDigits: 2 })} el próximo aumento`
                                                : `RD$${parseFloat(formData.monthly_rent).toLocaleString('es-DO')} + RD$${parseFloat(formData.annual_increase_pct).toLocaleString('es-DO')} = RD$${(parseFloat(formData.monthly_rent) + parseFloat(formData.annual_increase_pct)).toLocaleString('es-DO', { minimumFractionDigits: 2 })} el próximo aumento`
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3 pt-2">Notas</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción / Notas <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Características especiales, observaciones, etc."
                                    maxLength={500}
                                    rows={3}
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none ${errors.notes ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
                                <p className="mt-1 text-xs text-gray-400 text-right">{formData.notes.length}/500</p>
                            </div>
                        </div>
                    </div>
                </div>

                {!propertyToEdit && (
                    <section className="mt-6" aria-label="Inquilino (opcional)">
                        <div className="flex items-center gap-3 mb-3" role="separator">
                            <span className="flex-1 border-t border-dashed border-gray-300" />
                            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">opcional</span>
                            <span className="flex-1 border-t border-dashed border-gray-300" />
                        </div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Inquilino actual</p>
                        <p className="text-xs text-gray-500 mb-3">Si ya tiene inquilino, regístralo aquí y todo queda en un solo paso. Déjalo vacío para registrar solo la propiedad.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                            <FormInput label="Nombre completo" name="name" value={tenantData.name} onChange={handleTenantChange} placeholder="Juan García López" maxLength={255} />
                            <FormInput label="Cédula" name="identity_number" value={tenantData.identity_number} onChange={handleTenantChange} error={errors.tenant_identity_number} required={wantsTenant} placeholder="123-4567890-1" maxLength={13} />
                            <FormInput label="Teléfono" name="phone" value={tenantData.phone} onChange={handleTenantChange} error={errors.tenant_phone} required={wantsTenant} placeholder="(829) 555-1234" maxLength={15} />
                            <FormInput label="Email" name="email" type="email" value={tenantData.email} onChange={handleTenantChange} error={errors.tenant_email} placeholder="correo@ejemplo.com" />
                            <FormInput label="Fecha de ingreso" name="start_date" type="date" value={tenantData.start_date} onChange={handleTenantChange} error={errors.tenant_start_date} required={wantsTenant} max={new Date().toISOString().split('T')[0]} />
                            <FormInput label="Depósito (RD$) — opcional" name="deposit_amount" type="number" value={tenantData.deposit_amount} onChange={handleTenantChange} error={errors.tenant_deposit_amount} placeholder="Ej: 30000" min="0" step="0.01" />
                        </div>
                    </section>
                )}

                {errors.submit && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mt-4">
                        {errors.submit}
                    </div>
                )}

                <div className="flex gap-3 justify-end pt-6 mt-4 border-t border-gray-100">
                    <Button type="button" variant="secondary" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? 'Guardando...' : propertyToEdit ? 'Guardar Cambios' : wantsTenant ? 'Registrar propiedad e inquilino' : 'Registrar Propiedad'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
