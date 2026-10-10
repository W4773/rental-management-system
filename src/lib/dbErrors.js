// Turns database errors into messages a person can act on. The raw error (with the data that was
// sent) is already in the error log, so nothing is lost by showing something clearer here.

const FIELD_LABEL = {
    monthly_rent: 'Precio mensual', annual_increase_pct: 'Aumento anual', square_meters: 'Metros cuadrados',
    deposit_amount: 'Depósito', rent_amount: 'Precio del mes', amount_paid: 'Monto pagado',
    remaining_balance: 'Balance pendiente', total_cost: 'Costo total', current_reading: 'Lectura actual',
    previous_reading: 'Lectura anterior', consumption_volume: 'Consumo', bedrooms: 'Habitaciones', bathrooms: 'Baños'
}

const isOverflow = (err) => err?.code === '22003' || /numeric field overflow|out of range|value too large/i.test(err?.message || '')

/** Numeric fields of `payload` that reach the limit Postgres reports ("precision 5, scale 2" → 10^3), smallest first. */
export function overflowCandidates(payload, details = '') {
    const m = /precision (\d+), scale (\d+)/.exec(details || '')
    const bound = m ? Math.pow(10, parseInt(m[1], 10) - parseInt(m[2], 10)) : 0
    const rows = Array.isArray(payload) ? payload : [payload]
    const found = new Map()
    for (const row of rows) {
        for (const [key, value] of Object.entries(row || {})) {
            const n = typeof value === 'number' ? value : (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? parseFloat(value) : NaN)
            if (Number.isFinite(n) && FIELD_LABEL[key] && Math.abs(n) >= bound) found.set(key, n)
        }
    }
    return [...found].map(([key, value]) => ({ key, value })).sort((a, b) => Math.abs(a.value) - Math.abs(b.value))
}

/** Message to show for a failed save. `payload` is what was being saved (used to point at the field). */
export function friendlyDbError(err, payload = null) {
    const message = typeof err === 'string' ? err : err?.message || 'Error desconocido'
    if (!isOverflow(typeof err === 'string' ? { message } : err)) return message
    const list = overflowCandidates(payload, err?.details).slice(0, 3)
        .map(c => `«${FIELD_LABEL[c.key]}» (${c.value.toLocaleString('es-DO')})`).join(', ')
    const what = list ? `Alguno de estos valores no cabe en la base de datos: ${list}.` : 'Uno de los valores numéricos no cabe en la base de datos.'
    return `${what} Revisa que sea correcto; si es un valor normal, falta ejecutar supabase/migrations/011_numeric_ranges.sql en Supabase.`
}
