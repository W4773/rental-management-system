import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const generateReceiptPDF = (payment, property, tenant) => {
    const doc = new jsPDF()

    // Colors
    const primaryColor = [59, 130, 246] // Blue-500
    const grayColor = [107, 114, 128]   // Gray-500

    // Header
    doc.setFontSize(22)
    doc.setTextColor(...primaryColor)
    doc.text('RECIBO DE PAGO', 105, 20, { align: 'center' })

    doc.setFontSize(10)
    doc.setTextColor(...grayColor)
    doc.text(`Fecha de Emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 28, { align: 'center' })
    doc.text(`No. Referencia: ${payment.id.slice(0, 8).toUpperCase()}`, 105, 33, { align: 'center' })

    // Line separator
    doc.setDrawColor(200, 200, 200)
    doc.line(20, 38, 190, 38)

    // Property & Tenant Info
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)

    // Left Column (Inquilino)
    doc.setFont('helvetica', 'bold')
    doc.text('Recibido de:', 20, 50)
    doc.setFont('helvetica', 'normal')
    doc.text(tenant.name, 20, 57)
    doc.text(`Cédula: ${tenant.identity_number || 'N/A'}`, 20, 64)

    // Right Column (Propiedad)
    doc.setFont('helvetica', 'bold')
    doc.text('Por concepto de alquiler:', 110, 50)
    doc.setFont('helvetica', 'normal')
    doc.text(property.name, 110, 57)
    doc.text(property.address, 110, 64, { maxWidth: 80 })

    // Payment Details Table
    doc.autoTable({
        startY: 85,
        head: [['Concepto', 'Detalle']],
        body: [
            ['Mes Pagado', format(new Date(payment.payment_month), 'MMMM yyyy', { locale: es }).toUpperCase()],
            ['Fecha de Pago', format(new Date(payment.payment_date), 'dd/MM/yyyy')],
            ['Método de Pago', getPaymentMethodLabel(payment.payment_method)],
            ['Tipo de Pago', getPaymentTypeLabel(payment.payment_type)],
            ['Referencia / Nota', payment.reference || payment.notes || '-']
        ],
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        styles: { fontSize: 11, cellPadding: 3 }
    })

    // Totals
    const finalY = doc.lastAutoTable.finalY + 10

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')

    // Amount Box
    doc.setFillColor(245, 247, 250)
    doc.roundedRect(120, finalY, 70, 25, 3, 3, 'F')

    doc.text('Total Pagado:', 125, finalY + 8)
    doc.setFontSize(16)
    doc.setTextColor(...primaryColor)

    // SAFE PARSING
    const amount = typeof payment.amount_paid === 'string' ? parseFloat(payment.amount_paid) : payment.amount_paid
    const remaining = typeof payment.remaining_balance === 'string' ? parseFloat(payment.remaining_balance) : payment.remaining_balance

    doc.text(`RD$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 185, finalY + 18, { align: 'right' })

    if (remaining > 0) {
        doc.setFontSize(10)
        doc.setTextColor(220, 38, 38) // Red
        doc.text(`Pendiente: RD$ ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 185, finalY + 28, { align: 'right' })
    }

    // Footer
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text('Este documento es un comprobante de pago válido emitido por el sistema.', 105, 280, { align: 'center' })

    // Save
    const fileName = `Recibo_${tenant.name.split(' ')[0]}_${format(new Date(payment.payment_month), 'MMM-yyyy')}.pdf`
    doc.save(fileName)
}

const getPaymentMethodLabel = (method) => {
    const map = {
        'transfer': 'Transferencia Bancaria',
        'cash': 'Efectivo',
        'check': 'Cheque',
        'other': 'Otro'
    }
    return map[method] || method
}

const getPaymentTypeLabel = (type) => {
    const map = {
        'full': 'Pago Completo',
        'partial': 'Pago Parcial',
        'prepaid': 'Pago + Abono'
    }
    return map[type] || type
}
