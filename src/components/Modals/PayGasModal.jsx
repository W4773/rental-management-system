import { useState } from 'react'
import Modal from '../Common/Modal'
import Button from '../Common/Button'
import ConfirmModal from '../Common/ConfirmModal'
import { useGasReadings } from '../../hooks/useGasReadings'
import { formatCurrency } from '../../lib/calculations'
import { formatDate } from '../../lib/dateUtils'

export default function PayGasModal({ isOpen, onClose, onSuccess, gasReading }) {
    const { updateGasReading } = useGasReadings()
    const [paymentNotes, setPaymentNotes] = useState('')

    if (!gasReading) return null

    const handleConfirmPayment = async () => {
        const updates = {
            paid: true,
            payment_date: new Date().toISOString().split('T')[0],
            payment_notes: paymentNotes
        }

        const { error } = await updateGasReading(gasReading.id, updates)
        if (error) {
            alert('Error al registrar pago: ' + error)
            throw error
        }

        if (onSuccess) onSuccess()
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pagar Consumo de Gas">
            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-600">Fecha Lectura:</span>
                            <p className="font-semibold">{formatDate(gasReading.reading_date)}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Consumo:</span>
                            <p className="font-semibold">{gasReading.consumption_volume} unidades</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-blue-200">
                            <span className="text-gray-600">Monto a Pagar:</span>
                            <p className="text-2xl font-bold text-blue-900">{formatCurrency(gasReading.total_cost)}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notas de Pago (opcional)</label>
                    <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        rows="3"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Método de pago, referencia, etc."
                    />
                </div>

                <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-yellow-800">
                    ⚠️ Al confirmar, este consumo se marcará como pagado y se actualizarán los pendientes.
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" onClick={handleConfirmPayment}>
                        Confirmar Pago de {formatCurrency(gasReading.total_cost)}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
