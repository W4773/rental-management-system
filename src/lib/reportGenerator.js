import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { PDF_COLORS, drawHeader, drawFooter, drawField, money, monthLabel, dateLabel } from './pdfHelpers'

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
export function generatePaymentsReport({ property, tenant, building, payments, periodLabel, settings = {} }) {
    const brand = settings.business_name || 'Alquiler Pro'
    const rows = [...payments]
        .filter(p => parseFloat(p.amount_paid) > 0)
        .sort((a, b) => a.payment_month.localeCompare(b.payment_month))
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

    drawFooter(doc, `Generado el ${format(new Date(), 'dd/MM/yyyy')} - ${brand}${settings.phone ? ' - ' + settings.phone : ''}`)
    const safe = (property?.name || 'propiedad').replace(/[^\w-]+/g, '_')
    doc.save(`Reporte_${safe}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    return doc
}
