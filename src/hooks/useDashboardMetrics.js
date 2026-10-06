import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'

export const useDashboardMetrics = (year = new Date().getFullYear(), refreshTrigger = 0) => {
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        collectionRate: 0,
        occupancyRate: 0,
        overdueAmount: 0,
        alerts: [],
        loading: true,
        error: null
    })
    const { user } = useAuth()

    useEffect(() => {
        if (!user) return

        const fetchMetrics = async () => {
            try {
                setMetrics(prev => ({ ...prev, error: null }))

                const ownerId = await getEffectiveOwnerId()

                // Fetch all properties (RLS already scopes to the workspace; ownerId filter is defensive)
                const { data: properties, error: propsError } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('user_id', ownerId)

                if (propsError) throw propsError

                // Fetch all tenants
                const { data: tenants, error: tenantsError } = await supabase
                    .from('tenants')
                    .select('*')
                    .eq('user_id', ownerId)

                if (tenantsError) throw tenantsError

                // Fetch ALL payments
                const { data: allPayments, error: paymentsError } = await supabase
                    .from('rent_payments')
                    .select('*, properties(*)')
                    .eq('user_id', ownerId)

                if (paymentsError) throw paymentsError

                // --- BACKFILL HISTORICAL PAYMENTS FOR OLD TENANTS ---
                const today = new Date()
                const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)

                const activeTenants = tenants.filter(t => t.end_date === null)
                
                for (const tenant of activeTenants) {
                    const start = new Date(tenant.start_date)
                    start.setDate(1)
                    start.setHours(0, 0, 0, 0)
                    
                    if (start < prevMonthStart) {
                        const oldPayments = allPayments.filter(p => p.tenant_id === tenant.id && new Date(p.payment_month) < prevMonthStart)
                        
                        if (oldPayments.length === 0) {
                            const property = properties.find(p => p.id === tenant.property_id)
                            if (property) {
                                const records = []
                                const cursor = new Date(start)

                                while (cursor < prevMonthStart) {
                                    const y = cursor.getFullYear()
                                    const m = String(cursor.getMonth() + 1).padStart(2, '0')
                                    records.push({
                                        property_id: tenant.property_id,
                                        tenant_id: tenant.id,
                                        payment_month: `${y}-${m}-01`,
                                        rent_amount: property.monthly_rent,
                                        amount_paid: property.monthly_rent,
                                        remaining_balance: 0,
                                        payment_date: `${y}-${m}-01`,
                                        payment_method: 'historical',
                                        payment_type: 'full',
                                        payment_status: 'paid',
                                        auto_generated: true,
                                        user_id: ownerId,
                                        notes: 'Generado automáticamente (backfill)'
                                    })
                                    cursor.setMonth(cursor.getMonth() + 1)
                                }

                                if (records.length > 0) {
                                    const { data: inserted } = await supabase.from('rent_payments').insert(records).select('*, properties(*)')
                                    if (inserted) {
                                        allPayments.push(...inserted)
                                    }
                                }
                            }
                        }
                    }
                }

                // Filter payments for current year calculations (revenue, collection rate)
                const payments = allPayments.filter(p => p.payment_month.startsWith(`${year}-`))

                // Fetch unpaid gas consumption
                const { data: unpaidGas, error: gasError } = await supabase
                    .from('gas_consumption')
                    .select('*, properties(*)')
                    .eq('user_id', ownerId)
                    .eq('paid', false)

                if (gasError) throw gasError

                // Calculate Total Revenue (all payments this year)
                const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)

                // Calculate Collection Rate
                const currentMonth = new Date().getMonth() + 1
                const currentYear = new Date().getFullYear()

                // Only calculate for current year
                if (year === currentYear) {
                    const rentedProperties = tenants.filter(t => t.end_date === null).length
                    // Months marked as "nulo" (not charged) are not expected
                    const voidedMonths = payments.filter(p => p.voided && activeTenants.some(t => t.id === p.tenant_id)).length
                    const expectedPayments = Math.max(0, rentedProperties * currentMonth - voidedMonths)

                    const receivedPaymentsCount = payments.filter(p => {
                        const paymentDate = new Date(p.payment_month)
                        return paymentDate.getFullYear() === currentYear &&
                            p.payment_type === 'full' &&
                            parseFloat(p.amount_paid || 0) > 0 // pending / void marks have type 'full' but no money
                    }).length

                    const collectionRate = expectedPayments > 0
                        ? Math.round((receivedPaymentsCount / expectedPayments) * 100)
                        : 100

                    // Calculate Occupancy Rate
                    const totalProperties = properties.length
                    const occupancyRate = totalProperties > 0
                        ? Math.round((rentedProperties / totalProperties) * 100)
                        : 0

                    // Calculate Overdue Amount
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)

                    let overdueAmount = 0
                    const alertsList = []

                    // Check each active tenant
                    tenants.filter(t => t.end_date === null).forEach(tenant => {
                        const property = properties.find(p => p.id === tenant.property_id)
                        if (!property) return

                        const tenantStart = new Date(tenant.start_date)
                        tenantStart.setDate(1) // First day of start month
                        tenantStart.setHours(0, 0, 0, 0)

                        // Check each month from tenant start to previous month (not current)
                        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

                        let checkDate = new Date(tenantStart)

                        while (checkDate < currentMonthStart) {
                            const checkYear = checkDate.getFullYear()
                            const checkMonth = checkDate.getMonth()

                            // Check if payment exists for this past month
                            const monthPayment = allPayments.find(p => {
                                const pDate = new Date(p.payment_month)
                                return p.property_id === property.id &&
                                    pDate.getMonth() === checkMonth &&
                                    pDate.getFullYear() === checkYear &&
                                    p.payment_type === 'full'
                            })

                            // If no payment found for this past month, it's overdue
                            if (!monthPayment) {
                                const rentAmount = parseFloat(property.monthly_rent || 0)
                                overdueAmount += rentAmount

                                const monthName = checkDate.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })
                                alertsList.push({
                                    id: `overdue-${property.id}-${checkYear}-${checkMonth}`,
                                    type: 'error',
                                    title: `Pago Atrasado - ${property.name}`,
                                    subtitle: `${tenant.name} - ${monthName} - RD$${rentAmount.toFixed(2)}`,
                                    amount: rentAmount,
                                    property: property,
                                    tenant: tenant,
                                    month: monthName
                                })
                            }

                            // Move to next month
                            checkDate.setMonth(checkDate.getMonth() + 1)
                        }
                    })

                    // Add gas alerts (gas is overdue only if from a PREVIOUS completed month)
                    unpaidGas.forEach(gas => {
                        const readingDate = new Date(gas.reading_date)
                        const readingYear = readingDate.getFullYear()
                        const readingMonth = readingDate.getMonth()

                        const currentYear = today.getFullYear()
                        const currentMonth = today.getMonth()

                        // Only show as overdue if the reading is from a month BEFORE the current month
                        const isFromPreviousMonth = (readingYear < currentYear) ||
                            (readingYear === currentYear && readingMonth < currentMonth)

                        if (isFromPreviousMonth) {
                            const gasAmount = parseFloat(gas.total_cost || 0)
                            const monthName = readingDate.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })

                            alertsList.push({
                                id: `gas-${gas.id}`,
                                type: 'warning',
                                title: `Gas Atrasado - ${gas.properties?.name || 'Propiedad'}`,
                                subtitle: `${monthName} - ${gas.consumption_volume || 0}m³ - RD$${gasAmount.toFixed(2)}`,
                                amount: gasAmount,
                                isGas: true,
                                month: monthName
                            })
                        }
                    })

                    setMetrics({
                        totalRevenue,
                        collectionRate,
                        occupancyRate,
                        overdueAmount,
                        alerts: alertsList,
                        loading: false,
                        error: null
                    })
                } else {
                    // For past years, simpler calculation
                    setMetrics({
                        totalRevenue,
                        collectionRate: 100,
                        occupancyRate: 100,
                        overdueAmount: 0,
                        alerts: [],
                        loading: false,
                        error: null
                    })
                }

            } catch (err) {
                console.error('Error fetching dashboard metrics:', err)
                setMetrics(prev => ({
                    ...prev,
                    loading: false,
                    error: err.message || 'Error loading metrics'
                }))
            }
        }

        fetchMetrics()
    }, [user, year, refreshTrigger])

    return metrics
}
