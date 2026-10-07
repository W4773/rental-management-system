// src/lib/pdfGenerator.js
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { parseLocalDate, drawWatermark } from './pdfHelpers'

// Product name printed only in the footer; the owner's name goes everywhere else
const PRODUCT_NAME = 'Alquiler Pro'
const GOLD = [184, 150, 46]
const DARK = [26, 26, 26]
const GRAY = [90, 79, 58]
const LIGHT_GRAY = [138, 122, 90]
const GREEN = [45, 106, 53]

export async function loadImageAsDataUrl(url) {
    try {
        const response = await fetch(url)
        const blob = await response.blob()
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

const fmtMoney = (n) => `RD$${(parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
const monthName = (value) => format(parseLocalDate(value), 'MMMM yyyy', { locale: es }).toUpperCase()

/**
 * Receipt for one payment, or a consolidated receipt when an array of payments is passed.
 * Downloads the PDF (no new tab): call it only from a user action (e.g. "Sí, imprimir").
 */
export async function generateReceiptPDF(paymentOrList, property, tenant, userSettings = {}) {
    const list = (Array.isArray(paymentOrList) ? paymentOrList : [paymentOrList])
        .filter(Boolean)
        .sort((a, b) => a.payment_month.localeCompare(b.payment_month))
    const payment = list[0]
    const totalPaid = list.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0)
    const totalRent = list.reduce((sum, p) => sum + (parseFloat(p.rent_amount ?? property.monthly_rent) || 0), 0)
    const totalRemaining = list.reduce((sum, p) => sum + (parseFloat(p.remaining_balance) || 0), 0)
    const periodLabel = list.length > 1
        ? `${monthName(list[0].payment_month)} - ${monthName(list[list.length - 1].payment_month)}`
        : monthName(payment.payment_month)
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 22

    // Name shown on the document: landlord name, else account name (resolved in AppContext)
    const ownerName = userSettings.display_name || userSettings.landlord_name || 'Alquiler Pro'
    const landlordName = ownerName
    const landlordPhone = userSettings.phone || ''
    const landlordEmail = userSettings.email || 'info@optimard.com'
    const footerNote = userSettings.invoice_footer || 'Este documento constituye un recibo de pago válido.'
    const signatureUrl = userSettings.signature_url || null

    // === WATERMARK (first, so it stays behind everything) ===
    drawWatermark(doc, ownerName)

    // === TOP GOLD RULE ===
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(1.2)
    doc.line(margin, 14, pageWidth - margin, 14)

    // === CENTERED HEADER ===
    doc.setFont('times', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...DARK)
    const headerName = ownerName.toUpperCase()
    const tracking = 1.5
    const available = pageWidth - margin * 2
    let headerSize = 22
    doc.setFontSize(headerSize)
    // Shrink long names until they fit between the margins (letter-spacing included), then centre by hand
    while (headerSize > 11 && doc.getTextWidth(headerName) + tracking * (headerName.length - 1) > available) {
        headerSize -= 0.5
        doc.setFontSize(headerSize)
    }
    const headerWidth = doc.getTextWidth(headerName) + tracking * (headerName.length - 1)
    doc.text(headerName, (pageWidth - headerWidth) / 2, 24, { charSpace: tracking })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('Gestión de Propiedades', pageWidth / 2, 30, { align: 'center', charSpace: 1 })

    // Thin separator
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.4)
    doc.line(pageWidth / 2 - 18, 34, pageWidth / 2 + 18, 34)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...GRAY)
    doc.text('RECIBO DE PAGO DE ALQUILER', pageWidth / 2, 40, { align: 'center', charSpace: 0.8 })

    // === META ROW ===
    let y = 52
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('No. DE RECIBO', margin, y)
    doc.text('FECHA DE EMISIÓN', 90, y)
    doc.text('PERIODO PAGADO', 150, y)

    y += 5
    doc.setFont('times', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...DARK)
    doc.text(`#${payment.id.slice(0, 8).toUpperCase()}`, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(format(new Date(), 'dd \'de\' MMMM \'de\' yyyy', { locale: es }), 90, y)
    doc.setFontSize(list.length > 1 ? 8 : 11)
    doc.text(periodLabel, 150, y, { maxWidth: pageWidth - margin - 150 })

    // Separator line
    y += 8
    doc.setDrawColor(220, 210, 190)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)

    // === PARTIES ===
    y += 8
    const colMid = pageWidth / 2 + 5

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('ARRENDADOR', margin, y)
    doc.text('INQUILINO', colMid, y)

    doc.setDrawColor(200, 190, 170)
    doc.setLineWidth(0.3)
    doc.line(margin, y + 2, margin + 52, y + 2)
    doc.line(colMid, y + 2, colMid + 52, y + 2)

    y += 7
    doc.setFont('times', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...DARK)
    doc.text(landlordName, margin, y, { maxWidth: colMid - margin - 6 })
    doc.text(tenant.name, colMid, y)

    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...GRAY)
    if (landlordPhone) { doc.text(landlordPhone, margin, y); y += 5 }
    if (landlordEmail) { doc.text(landlordEmail, margin, y) }
    const tenantY = y - (landlordPhone ? 5 : 0)
    doc.text(`Cédula: ${tenant.identity_number || 'N/A'}`, colMid, tenantY)
    doc.text(`${property.name} · ${property.address}`, colMid, tenantY + 5, { maxWidth: 70 })

    // === PAYMENT TABLE ===
    y += 14
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageWidth - margin, y)

    doc.autoTable({
        startY: y + 2,
        margin: { left: margin, right: margin },
        head: [['CONCEPTO', 'DETALLE', 'MONTO', 'PAGADO']],
        body: list.map(p => [
            `Alquiler Mensual\n${monthName(p.payment_month)}`,
            `${property.name}\n${getPaymentMethodLabel(p.payment_method)}`,
            fmtMoney(p.rent_amount ?? property.monthly_rent),
            fmtMoney(p.amount_paid)
        ]),
        foot: [['TOTAL', '', fmtMoney(totalRent), fmtMoney(totalPaid)]],
        theme: 'plain',
        headStyles: {
            fillColor: [250, 247, 240],
            textColor: LIGHT_GRAY,
            fontSize: 8,
            fontStyle: 'bold',
            cellPadding: 4,
        },
        bodyStyles: {
            textColor: DARK,
            fontSize: 10,
            fontStyle: 'normal',
            cellPadding: 5,
            lineColor: [232, 223, 200],
            lineWidth: 0.3,
        },
        footStyles: {
            fillColor: [244, 251, 245],
            textColor: GREEN,
            fontSize: 11,
            fontStyle: 'bold',
            cellPadding: 5,
            lineColor: GOLD,
            lineWidth: 0.8,
        },
        columnStyles: {
            0: { cellWidth: 46 },
            1: { cellWidth: 44 },
            2: { halign: 'right' },
            3: { halign: 'right' },
        }
    })

    y = doc.lastAutoTable.finalY + 6
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageWidth - margin, y)

    // === PAYMENT DETAILS ===
    y += 10
    const remaining = totalRemaining

    // Method box
    doc.setFillColor(250, 247, 240)
    doc.roundedRect(margin, y, 80, 22, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('MÉTODO DE PAGO', margin + 4, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...DARK)
    doc.text(getPaymentMethodLabel(payment.payment_method), margin + 4, y + 13)
    if (payment.reference) {
        doc.setFontSize(8)
        doc.setTextColor(...GRAY)
        doc.text(`Ref: ${payment.reference}`, margin + 4, y + 19)
    }

    // Balance box
    const balanceColor = remaining > 0 ? [220, 38, 38] : GREEN
    doc.setFillColor(remaining > 0 ? 254 : 244, remaining > 0 ? 242 : 251, remaining > 0 ? 242 : 245)
    doc.roundedRect(pageWidth - margin - 80, y, 80, 22, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('BALANCE PENDIENTE', pageWidth - margin - 76, y + 6)
    doc.setFont('times', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...balanceColor)
    doc.text(
        `RD$${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        pageWidth - margin - 4, y + 16,
        { align: 'right' }
    )

    // === SIGNATURE ===
    y += 32
    const sigX = pageWidth - margin - 60

    if (signatureUrl) {
        const sigDataUrl = await loadImageAsDataUrl(signatureUrl)
        if (sigDataUrl) {
            doc.addImage(sigDataUrl, 'PNG', sigX, y, 56, 22)
            y += 24
        }
    }

    doc.setDrawColor(...DARK)
    doc.setLineWidth(0.5)
    doc.line(sigX, y, pageWidth - margin, y)

    y += 5
    if (landlordName) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...DARK)
        doc.text(landlordName, (sigX + pageWidth - margin) / 2, y, { align: 'center' })
        y += 5
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text('ARRENDADOR', (sigX + pageWidth - margin) / 2, y, { align: 'center', charSpace: 0.8 })

    // === FOOTER ===
    const footerY = doc.internal.pageSize.getHeight() - 22
    doc.setDrawColor(220, 210, 190)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text([PRODUCT_NAME, landlordEmail, landlordPhone].filter(Boolean).join(' · '), pageWidth / 2, footerY, { align: 'center' })

    doc.setFont('times', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(184, 168, 128)
    doc.text(footerNote, pageWidth / 2, footerY + 5, { align: 'center' })

    // Verification code
    const verRaw = payment.id.replace(/-/g, '').toUpperCase()
    const verCode = `${verRaw.slice(0, 4)}-${verRaw.slice(4, 8)}-${verRaw.slice(8, 12)}`
    doc.setFont('courier', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(170, 160, 140)
    doc.text(
        `VER: ${verCode} · Válido únicamente con firma original del arrendador · No se acepta copia sin sello`,
        pageWidth / 2, footerY + 10, { align: 'center' }
    )

    // Bottom gold rule
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(1.2)
    doc.line(margin, footerY + 15, pageWidth - margin, footerY + 15)

    const suffix = list.length > 1 ? `${list.length}-meses` : format(parseLocalDate(payment.payment_month), 'MMM-yyyy', { locale: es })
    doc.save(`Recibo_${(tenant.name || 'inquilino').split(' ')[0]}_${suffix}.pdf`)
    return doc
}

const getPaymentMethodLabel = (method) => {
    const map = {
        transfer: 'Transferencia Bancaria',
        cash: 'Efectivo',
        check: 'Cheque',
        pending: 'Pendiente',
        other: 'Otro'
    }
    return map[method] || method || '—'
}
