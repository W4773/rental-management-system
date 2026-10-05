import { Printer, CheckCircle2 } from 'lucide-react'
import Modal from '../Common/Modal'
import Button from '../Common/Button'
import { generateReceiptPDF } from '../../lib/pdfGenerator'

/** Shown after a payment is saved. Printing is optional and only happens on "Sí". */
export default function PrintReceiptPrompt({ data, settings, onClose }) {
    if (!data) return null
    const { payments, property, tenant } = data
    const count = payments.length

    const handlePrint = async () => {
        try {
            await generateReceiptPDF(payments, property, tenant, settings || {})
        } catch (err) {
            console.error('PDF Error', err)
        }
        onClose()
    }

    return (
        <Modal isOpen onClose={onClose} title="Pago registrado" size="sm">
            <div className="flex items-start gap-3 py-2">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                <div>
                    <p className="font-medium text-ink">
                        {count > 1 ? `${count} pagos registrados` : 'Pago registrado'} para {property?.name}.
                    </p>
                    <p className="text-sm text-gray-600 mt-1">¿Desea imprimir el recibo?</p>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" size="sm" onClick={onClose}>Ahora no</Button>
                <Button size="sm" onClick={handlePrint} className="inline-flex items-center gap-1.5" autoFocus>
                    <Printer className="w-4 h-4" /> Sí, imprimir
                </Button>
            </div>
        </Modal>
    )
}
