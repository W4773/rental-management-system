import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const PDF_COLORS = {
    brand: [154, 125, 36],
    brandLight: [245, 236, 201],
    ink: [38, 34, 28],
    muted: [120, 113, 100],
    cream: [248, 246, 240],
    green: [34, 130, 70],
    red: [200, 50, 40]
}

export const money = (n) =>
    `RD$ ${(parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// 'YYYY-MM-DD' -> local Date (avoids timezone shift)
export const parseLocalDate = (value) => {
    if (!value) return null
    if (value instanceof Date) return value
    const [y, m, d] = value.slice(0, 10).split('-').map(Number)
    return new Date(y, m - 1, d || 1)
}

export const monthLabel = (value) => {
    const d = parseLocalDate(value)
    return d ? format(d, 'MMMM yyyy', { locale: es }) : '-'
}

export const dateLabel = (value) => {
    const d = parseLocalDate(value)
    return d ? format(d, 'dd/MM/yyyy') : '-'
}

/** Gold brand band with title/subtitle. Returns the Y where content may start. */
export function drawHeader(doc, title, subtitle) {
    const w = doc.internal.pageSize.getWidth()
    doc.setFillColor(...PDF_COLORS.brand)
    doc.rect(0, 0, w, 34, 'F')
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(14, 9, 16, 16, 3, 3, 'F')
    doc.setTextColor(...PDF_COLORS.brand)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('AP', 22, 19.5, { align: 'center' })

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.text('Alquiler Pro', 36, 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Gestión de alquileres', 36, 22)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text(title, w - 14, 16, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (subtitle) doc.text(subtitle, w - 14, 22, { align: 'right' })
    return 44
}

export function drawFooter(doc, text) {
    const w = doc.internal.pageSize.getWidth()
    const h = doc.internal.pageSize.getHeight()
    const pages = doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        doc.setDrawColor(225, 220, 205)
        doc.line(14, h - 16, w - 14, h - 16)
        doc.setFontSize(8)
        doc.setTextColor(...PDF_COLORS.muted)
        doc.text(text, 14, h - 10)
        doc.text(`Página ${i} de ${pages}`, w - 14, h - 10, { align: 'right' })
    }
}

/** Labelled info block (small caps label + value). */
export function drawField(doc, label, value, x, y, maxWidth = 80) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(label.toUpperCase(), x, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(...PDF_COLORS.ink)
    doc.text(String(value || '-'), x, y + 5.5, { maxWidth })
}

const methodLabel = (m) => ({ transfer: 'Transferencia', cash: 'Efectivo', check: 'Cheque', other: 'Otro' }[m] || m || '-')
const typeLabel = (t) => ({ full: 'Pago completo', partial: 'Pago parcial', prepaid: 'Pago + abono' }[t] || t || '-')

/**
 * Receipt for one payment or a consolidated receipt for several.
 * Returns the jsPDF doc and saves it (call only from a user action).
 */
export const generateReceiptPDF = (paymentOrList, property, tenant) => {
    const list = (Array.isArray(paymentOrList) ? paymentOrList : [paymentOrList]).filter(Boolean)
    const doc = new jsPDF()
    const w = doc.internal.pageSize.getWidth()
    const first = list[0]
    const ref = first.id ? first.id.slice(0, 8).toUpperCase() : '-'

    let y = drawHeader(doc, 'RECIBO DE PAGO', `No. ${ref}${list.length > 1 ? ` (+${list.length - 1})` : ''}`)

    doc.setFillColor(...PDF_COLORS.cream)
    doc.roundedRect(14, y, w - 28, 34, 3, 3, 'F')
    drawField(doc, 'Recibido de', tenant?.name, 20, y + 8, 80)
    drawField(doc, 'Cédula', tenant?.identity_number || 'N/A', 20, y + 22, 80)
    drawField(doc, 'Propiedad', property?.name, 110, y + 8, 80)
    drawField(doc, 'Dirección', property?.address, 110, y + 22, 80)
    y += 42

    autoTable(doc, {
        startY: y,
        head: [['Mes pagado', 'Fecha de pago', 'Método', 'Tipo', 'Monto']],
        body: list.map(p => [
            monthLabel(p.payment_month).toUpperCase(),
            dateLabel(p.payment_date),
            methodLabel(p.payment_method),
            typeLabel(p.payment_type),
            money(p.amount_paid)
        ]),
        theme: 'striped',
        headStyles: { fillColor: PDF_COLORS.brand, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: PDF_COLORS.cream },
        styles: { fontSize: 10, cellPadding: 3.5, textColor: PDF_COLORS.ink },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
    })

    const total = list.reduce((s, p) => s + (parseFloat(p.amount_paid) || 0), 0)
    const pending = list.reduce((s, p) => s + (parseFloat(p.remaining_balance) || 0), 0)
    let ty = doc.lastAutoTable.finalY + 10

    doc.setFillColor(...PDF_COLORS.brandLight)
    doc.roundedRect(w - 94, ty, 80, pending > 0 ? 28 : 20, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text('TOTAL PAGADO', w - 88, ty + 7)
    doc.setFontSize(15)
    doc.setTextColor(...PDF_COLORS.brand)
    doc.text(money(total), w - 20, ty + 15, { align: 'right' })
    if (pending > 0) {
        doc.setFontSize(9)
        doc.setTextColor(...PDF_COLORS.red)
        doc.text(`Pendiente: ${money(pending)}`, w - 20, ty + 23, { align: 'right' })
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(`Emitido el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, ty + 8)
    if (first.reference || first.notes) doc.text(`Ref./Nota: ${first.reference || first.notes}`, 14, ty + 14, { maxWidth: w - 120 })

    drawFooter(doc, 'Este documento es un comprobante de pago emitido por Alquiler Pro.')

    const suffix = list.length > 1 ? `${list.length}-meses` : format(parseLocalDate(first.payment_month), 'MMM-yyyy')
    doc.save(`Recibo_${(tenant?.name || 'inquilino').split(' ')[0]}_${suffix}.pdf`)
    return doc
}
