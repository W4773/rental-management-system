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
export function drawHeader(doc, title, subtitle, brand = 'Alquiler Pro') {
    const w = doc.internal.pageSize.getWidth()
    doc.setFillColor(...PDF_COLORS.brand)
    doc.rect(0, 0, w, 34, 'F')
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(14, 9, 16, 16, 3, 3, 'F')
    doc.setTextColor(...PDF_COLORS.brand)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text((brand || 'AP').trim().slice(0, 2).toUpperCase(), 22, 19.5, { align: 'center' })

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.text(brand, 36, 16)
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
