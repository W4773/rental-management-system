import { format } from 'date-fns'
import { PDF_COLORS, drawHeader, drawFooter, drawField, money, monthLabel, dateLabel } from './pdfHelpers'
import { rentForMonth } from './rentHistory'

const methodLabel = (m) => ({ transfer: 'Transferencia', cash: 'Efectivo', check: 'Cheque' }[m] || m || '-')

/** Pending amount per month = rent - sum of payments in that month (never negative). */
export function summarizePayments(payments) {
    const byMonth = {}
    payments.forEach(p => {
        const key = p.payment_month.split('T')[0].slice(0, 7)
        byMonth[key] = byMonth[key] || { rent: parseFloat(p.rent_amount || 0), paid: 0 }
        byMonth[key].paid += parseFloat(p.amount_paid || 0)
    })
    const months = Object.values(byMonth)
    return {
        totalPaid: months.reduce((s, m) => s + m.paid, 0),
        totalPending: months.reduce((s, m) => s + Math.max(0, m.rent - m.paid), 0),
        monthsCount: months.length
    }
}

/**
 * Elegant PDF statement of payments to send to a tenant.
 * @param {{property, tenant, building, payments, periodLabel}} opts
 */
export async function generatePaymentsReport({ property, tenant, building, payments, periodLabel, settings = {} }) {
    // Same name as receipts and letters: landlord name, else account name (settings.display_name)
    const brand = settings.display_name || settings.landlord_name || 'Alquiler Pro'
    const rows = [...payments]
        .filter(p => parseFloat(p.amount_paid) > 0)
        .sort((a, b) => a.payment_month.localeCompare(b.payment_month))
    // jsPDF is heavy: it is downloaded only when a document is actually generated
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
    const doc = new jsPDF()
    const w = doc.internal.pageSize.getWidth()
    const { totalPaid, totalPending, monthsCount } = summarizePayments(rows)

    let y = drawHeader(doc, 'ESTADO DE PAGOS', periodLabel, brand)

    doc.setFillColor(...PDF_COLORS.cream)
    doc.roundedRect(14, y, w - 28, 40, 3, 3, 'F')
    drawField(doc, 'Inquilino', tenant?.name, 20, y + 8, 80)
    drawField(doc, 'Cédula', tenant?.identity_number, 20, y + 24, 80)
    drawField(doc, 'Propiedad', property?.name, 110, y + 8, 80)
    drawField(doc, building ? `Edificio - ${building.name}` : 'Dirección', building?.address || property?.address, 110, y + 24, 80)
    y += 48

    // Summary cards
    const cards = [
        ['Total pagado', money(totalPaid), PDF_COLORS.green],
        ['Pendiente', money(totalPending), totalPending > 0 ? PDF_COLORS.red : PDF_COLORS.muted],
        ['Renta mensual', money(property?.monthly_rent), PDF_COLORS.brand]
    ]
    const cw = (w - 28 - 12) / 3
    cards.forEach(([label, value, color], i) => {
        const x = 14 + i * (cw + 6)
        doc.setDrawColor(230, 224, 205)
        doc.roundedRect(x, y, cw, 22, 3, 3, 'S')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...PDF_COLORS.muted)
        doc.text(label.toUpperCase(), x + 5, y + 7)
        doc.setFontSize(12.5)
        doc.setTextColor(...color)
        doc.text(value, x + 5, y + 16)
    })
    y += 30

    autoTable(doc, {
        startY: y,
        head: [['Mes', 'Fecha de pago', 'Método', 'Estado', 'Monto']],
        body: rows.map(p => [
            monthLabel(p.payment_month).replace(/^./, c => c.toUpperCase()),
            dateLabel(p.payment_date),
            methodLabel(p.payment_method),
            p.payment_status === 'paid' ? 'Pagado' : 'Parcial',
            money(p.amount_paid)
        ]),
        foot: [['', '', '', `${monthsCount} mes(es)`, money(totalPaid)]],
        theme: 'striped',
        headStyles: { fillColor: PDF_COLORS.brand, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: PDF_COLORS.cream },
        footStyles: { fillColor: PDF_COLORS.brandLight, textColor: PDF_COLORS.ink, fontStyle: 'bold' },
        styles: { fontSize: 9.5, cellPadding: 3, textColor: PDF_COLORS.ink },
        columnStyles: { 4: { halign: 'right' } },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
                data.cell.styles.textColor = data.cell.raw === 'Pagado' ? PDF_COLORS.green : [180, 120, 20]
                data.cell.styles.fontStyle = 'bold'
            }
        },
        margin: { left: 14, right: 14, bottom: 22 }
    })

    drawFooter(doc, `Generado el ${format(new Date(), 'dd/MM/yyyy')} - Alquiler Pro${settings.phone ? ' - ' + settings.phone : ''}`)
    const safe = (property?.name || 'propiedad').replace(/[^\w-]+/g, '_')
    doc.save(`Reporte_${safe}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    return doc
}

/** Columns of the tenants report. `former` limits a column to one tab; `def` = shown by default. */
export const TENANT_REPORT_COLUMNS = [
    { key: 'name', label: 'Inquilino', def: true },
    { key: 'identity', label: 'Cédula', def: false },
    { key: 'phone', label: 'Teléfono', def: true },
    { key: 'property', label: 'Propiedad', def: true },
    { key: 'start', label: 'Entrada', def: true },
    { key: 'end', label: 'Salida', def: true, former: true },
    { key: 'rent', label: 'Renta mensual', def: true, right: true },
    { key: 'deposit', label: 'Depósito', def: false, right: true }
]
export const tenantReportColumns = (former) => TENANT_REPORT_COLUMNS.filter(c => c.former === undefined || c.former === former)

/**
 * Tenant list PDF (no payment status) for the "Activos" or "Antiguos" tab.
 * groupBy 'building' / 'property' prints one table per group (rows must already be sorted by it).
 * @param {{former: boolean, rows: {tenant, property}[], buildings, settings, columns: string[], groupBy?: 'building'|'property', orderLabel?: string}} opts
 */
export async function generateTenantsReport({ former, rows, buildings = [], settings = {}, columns, groupBy, orderLabel = '' }) {
    const brand = settings.display_name || settings.landlord_name || 'Alquiler Pro'
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
    const doc = new jsPDF()
    const title = former ? 'INQUILINOS ANTIGUOS' : 'INQUILINOS ACTIVOS'
    let y = drawHeader(doc, title, `${rows.length} inquilino(s)${orderLabel ? ' - ' + orderLabel : ''}`, brand)

    const buildingOf = (property) => buildings.find(x => x.id === property?.building_id)
    // Active: rent of the current month; former: rent of the month they left
    const rentOf = (tenant, property) => {
        if (!property) return '-'
        const key = former ? tenant.end_date.slice(0, 7) : format(new Date(), 'yyyy-MM')
        const rent = rentForMonth(property, key)
        return rent > 0 ? money(rent) : '-'
    }
    const cell = {
        name: ({ tenant }) => (tenant.name || '').toUpperCase(),
        identity: ({ tenant }) => tenant.identity_number || '-',
        phone: ({ tenant }) => tenant.phone || '-',
        // Grouped by building: the building is already in the table title
        property: ({ property }) => !property ? 'Sin propiedad'
            : (groupBy !== 'building' && buildingOf(property) ? `${property.name}\n${buildingOf(property).name}` : property.name),
        start: ({ tenant }) => dateLabel(tenant.start_date),
        end: ({ tenant }) => dateLabel(tenant.end_date),
        rent: ({ tenant, property }) => rentOf(tenant, property),
        deposit: ({ tenant }) => tenant.deposit_amount > 0 ? money(tenant.deposit_amount) : '-'
    }
    const cols = tenantReportColumns(former).filter(c => columns.includes(c.key))
    const columnStyles = {}
    cols.forEach((c, i) => {
        if (c.key === 'name') columnStyles[i] = { fontStyle: 'bold' }
        if (c.right) columnStyles[i] = { halign: 'right' }
    })

    const groupLabel = ({ property }) => {
        if (groupBy === 'building') return buildingOf(property)?.name || 'Sin edificio'
        if (!property) return 'Sin propiedad'
        return buildingOf(property) ? `${property.name} - ${buildingOf(property).name}` : property.name
    }
    const groups = []
    rows.forEach(r => {
        const label = groupBy ? groupLabel(r) : ''
        if (groups.length && groups[groups.length - 1].label === label) groups[groups.length - 1].rows.push(r)
        else groups.push({ label, rows: [r] })
    })

    const pageH = doc.internal.pageSize.getHeight()
    groups.forEach(({ label, rows: list }) => {
        if (label) {
            if (y > pageH - 50) { doc.addPage(); y = 20 } // keep the title with its table
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10.5)
            doc.setTextColor(...PDF_COLORS.brand)
            doc.text(`${label}  (${list.length})`, 14, y + 4)
            y += 7
        }
        autoTable(doc, {
            startY: y,
            head: [cols.map(c => c.label)],
            body: list.map(r => cols.map(c => cell[c.key](r))),
            theme: 'striped',
            headStyles: { fillColor: PDF_COLORS.brand, textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: PDF_COLORS.cream },
            styles: { fontSize: 8.5, cellPadding: 2.5, textColor: PDF_COLORS.ink },
            columnStyles,
            margin: { left: 14, right: 14, bottom: 22 }
        })
        y = doc.lastAutoTable.finalY + 8
    })

    drawFooter(doc, `Generado el ${format(new Date(), 'dd/MM/yyyy')} - Alquiler Pro${settings.phone ? ' - ' + settings.phone : ''}`)
    doc.save(`Inquilinos_${former ? 'antiguos' : 'activos'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    return doc
}
