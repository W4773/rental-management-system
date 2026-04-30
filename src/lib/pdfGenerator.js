// src/lib/pdfGenerator.js
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const GOLD = [184, 150, 46]
const DARK = [26, 26, 26]
const GRAY = [90, 79, 58]
const LIGHT_GRAY = [138, 122, 90]
const GREEN = [45, 106, 53]

async function loadImageAsDataUrl(url) {
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

export async function generateReceiptPDF(payment, property, tenant, userSettings = {}) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 22

    const businessName = userSettings.business_name || 'AlquilerPro'
    const landlordName = userSettings.landlord_name || ''
    const landlordPhone = userSettings.phone || ''
    const landlordEmail = userSettings.email || 'info@optimard.com'
    const footerNote = userSettings.invoice_footer || 'Este documento constituye un recibo de pago válido.'
    const signatureUrl = userSettings.signature_url || null

    // === TOP GOLD RULE ===
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(1.2)
    doc.line(margin, 14, pageWidth - margin, 14)

    // === CENTERED HEADER ===
    doc.setFont('times', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...DARK)
    doc.text(businessName.toUpperCase(), pageWidth / 2, 24, { align: 'center', charSpace: 1.5 })

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
    doc.text(
        format(new Date(payment.payment_month), 'MMMM yyyy', { locale: es }).toUpperCase(),
        150, y
    )

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
    doc.text(landlordName || 'Arrendador', margin, y)
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
        body: [
            [
                `Alquiler Mensual\n${format(new Date(payment.payment_month), 'MMMM yyyy', { locale: es }).toUpperCase()}`,
                `${property.name}\n${getPaymentMethodLabel(payment.payment_method)}`,
                `RD$${parseFloat(property.monthly_rent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                `RD$${parseFloat(payment.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            ]
        ],
        foot: [['TOTAL', '', `RD$${parseFloat(property.monthly_rent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, `RD$${parseFloat(payment.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]],
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
            0: { cellWidth: 55 },
            1: { cellWidth: 55 },
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
    const remaining = typeof payment.remaining_balance === 'string'
        ? parseFloat(payment.remaining_balance)
        : (payment.remaining_balance || 0)

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
    const footerY = doc.internal.pageSize.getHeight() - 18
    doc.setDrawColor(220, 210, 190)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text(`${businessName} · ${landlordEmail} · ${landlordPhone}`, pageWidth / 2, footerY, { align: 'center' })

    doc.setFont('times', 'italic')
    doc.setFontSize(8)
    doc.setTextColor([184, 168, 128])
    doc.text(footerNote, pageWidth / 2, footerY + 5, { align: 'center' })

    // Bottom gold rule
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(1.2)
    doc.line(margin, footerY + 10, pageWidth - margin, footerY + 10)

    // Save
    const fileName = `Recibo_${tenant.name.split(' ')[0]}_${format(new Date(payment.payment_month), 'MMM-yyyy')}.pdf`
    doc.save(fileName)
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
