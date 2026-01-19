import { useEffect, useState, useMemo } from 'react'
import { formatCurrency } from '../../lib/calculations'
import { formatDate } from '../../lib/dateUtils'
import { usePayments } from '../../hooks/usePayments'
import { useProperties } from '../../hooks/useProperties'
import { useGasReadings } from '../../hooks/useGasReadings'
import ConfirmModal from '../Common/ConfirmModal'
import PayGasModal from '../Modals/PayGasModal'
import YearlyPaymentGrid from './YearlyPaymentGrid'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { generateReceiptPDF } from '../../lib/pdfGenerator'

export default function PropertyDetails({ property, activeTenant, onEditTenant, onChangeTenant }) {
    const { getPaymentsByProperty, deletePayment } = usePayments()
    const { deleteProperty } = useProperties()
    const { getReadingsByProperty } = useGasReadings()

    const [payments, setPayments] = useState([])
    const [allPayments, setAllPayments] = useState([])
    const [gasReadings, setGasReadings] = useState([])

    // Modals
    const [deletePropertyModal, setDeletePropertyModal] = useState(false)
    const [deletePaymentModal, setDeletePaymentModal] = useState(null)
    const [payGasModal, setPayGasModal] = useState(null) // stores gas reading to pay

    const currentYear = new Date().getFullYear()

    // Calculate pending gas amount
    const pendingGas = useMemo(() => {
        return gasReadings
            .filter(g => !g.paid)
            .reduce((sum, g) => sum + (parseFloat(g.total_cost) || 0), 0)
    }, [gasReadings])

    const refreshData = () => {
        if (property) {
            getPaymentsByProperty(property.id).then(({ data }) => {
                setAllPayments(data || [])
                setPayments((data || []).slice(0, 3))
            })
            getReadingsByProperty(property.id).then(({ data }) => {
                setGasReadings(data || [])
            })
        }
    }

    useEffect(() => {
        if (property) {
            refreshData()
        } else {
            setPayments([])
            setAllPayments([])
            setGasReadings([])
        }
    }, [property])

    const handleDownloadReceipt = (payment) => {
        let tenantInfo = { name: 'Inquilino Histórico', identity_number: '' }
        if (activeTenant && activeTenant.id === payment.tenant_id) {
            tenantInfo = activeTenant
        }
        generateReceiptPDF(payment, property, tenantInfo)
    }

    const confirmDeletePayment = async () => {
        const { error } = await deletePayment(deletePaymentModal)
        if (error) {
            alert('Error al eliminar pago: ' + error)
            throw error
        } else {
            refreshData()
        }
    }

    const confirmDeleteProperty = async () => {
        const { error } = await deleteProperty(property.id)
        if (error) {
            alert('Error al eliminar propiedad: ' + error)
            throw error
        } else {
            window.location.reload()
        }
    }

    const handlePayGasSuccess = () => {
        refreshData()
        // Also reload to update global pending
        setTimeout(() => window.location.reload(), 500)
    }

    if (!property) {
        return (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center h-full flex flex-col items-center justify-center text-gray-400">
                <span className="text-4xl mb-4">👈</span>
                <p>Seleccione una propiedad para ver los detalles</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 h-full overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{property.name}</h2>
                    <p className="text-gray-500">{property.address}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(property.monthly_rent)}</p>
                    <p className="text-xs text-gray-500 mb-2">mensual</p>
                    <button
                        onClick={() => setDeletePropertyModal(true)}
                        className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-md transition font-medium"
                    >
                        🗑️ Eliminar Propiedad
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <span>🛏️</span> {property.bedrooms} Hab
                </div>
                <div className="flex items-center gap-2">
                    <span>🚿</span> {property.bathrooms} Baños
                </div>
            </div>

            <hr className="my-6 border-gray-100" />

            {/* Tenant Info */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>👤</span> INQUILINO ACTUAL
                </h3>
                {activeTenant ? (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 animate-fade-in">
                        <div className="space-y-2 text-sm text-gray-700">
                            <p><span className="font-semibold">Nombre:</span> {activeTenant.name}</p>
                            <p><span className="font-semibold">Cédula:</span> {activeTenant.identity_number}</p>
                            <p><span className="font-semibold">Teléfono:</span> {activeTenant.phone}</p>
                            <p><span className="font-semibold">Email:</span> {activeTenant.email || '-'}</p>
                            <p><span className="font-semibold">Fecha Entrada:</span> {formatDate(activeTenant.start_date)}</p>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => onEditTenant(activeTenant)}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-medium text-sm"
                            >
                                Editar Inquilino
                            </button>
                            <button
                                onClick={() => onChangeTenant(activeTenant)}
                                className="flex-1 bg-orange-600 text-white py-2 rounded-md hover:bg-orange-700 transition font-medium text-sm"
                            >
                                Cambiar Inquilino
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200 border-dashed">
                        <p className="text-gray-500 mb-2">No hay inquilino activo</p>
                        <button
                            onClick={() => onChangeTenant(null)}
                            className="text-blue-600 font-medium hover:underline text-sm"
                        >
                            + Asignar Nuevo Inquilino
                        </button>
                    </div>
                )}
            </div>

            {/* GAS PENDING SECTION (NEW) */}
            {pendingGas > 0 && (
                <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="font-semibold text-yellow-900">⚠️ Gas Pendiente</h4>
                            <p className="text-2xl font-bold text-yellow-800 mt-2">{formatCurrency(pendingGas)}</p>
                        </div>
                        <p className="text-xs text-yellow-700">Por pagar</p>
                    </div>
                </div>
            )}

            {/* Payment History */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>📋</span> HISTORIAL PAGOS
                </h3>
                <ul className="space-y-3">
                    {payments.length === 0 ? (
                        <li className="text-gray-500 text-sm italic">No hay pagos registrados reciente.</li>
                    ) : (
                        payments.filter(p => p.amount_paid > 0).map(payment => (
                            <li key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${payment.payment_status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 capitalize">
                                            {format(new Date(payment.payment_month), 'MMMM yyyy', { locale: es })}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatDate(payment.payment_date)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-semibold text-sm ${payment.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {formatCurrency(payment.amount_paid)}
                                    </span>
                                    {payment.amount_paid > 0 && (
                                        <>
                                            <button
                                                onClick={() => handleDownloadReceipt(payment)}
                                                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-blue-600 transition"
                                                title="Descargar Recibo"
                                            >
                                                📄
                                            </button>
                                            <button
                                                onClick={() => setDeletePaymentModal(payment.id)}
                                                className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition"
                                                title="Eliminar Pago"
                                            >
                                                🗑️
                                            </button>
                                        </>
                                    )}
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Yearly Grid */}
            <YearlyPaymentGrid
                property={property}
                payments={allPayments}
                year={currentYear}
            />

            {/* Gas Consumption (ENHANCED WITH PAY BUTTON) */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>🔷</span> CONSUMO DE GAS
                </h3>
                <ul className="space-y-3">
                    {gasReadings.length === 0 ? (
                        <li className="text-gray-500 text-sm italic py-2 bg-gray-50 rounded-lg text-center">No hay lecturas de gas registradas</li>
                    ) : (
                        gasReadings.map(reading => (
                            <li key={reading.id} className={`p-3 rounded-lg border flex justify-between items-center ${reading.paid ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                                }`}>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{formatDate(reading.reading_date)}</p>
                                    <p className="text-xs text-gray-600">Lectura: {reading.current_reading} | Consumo: {reading.consumption_volume} GL</p>
                                    {reading.paid && <p className="text-xs text-green-700 mt-1">✅ Pagado: {formatDate(reading.payment_date)}</p>}
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{formatCurrency(reading.total_cost)}</p>
                                        {!reading.paid && (
                                            <button
                                                onClick={() => setPayGasModal(reading)}
                                                className="mt-1 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition font-medium"
                                            >
                                                💳 Pagar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Confirmation Modals */}
            <ConfirmModal
                isOpen={deletePropertyModal}
                onClose={() => setDeletePropertyModal(false)}
                onConfirm={confirmDeleteProperty}
                title="Eliminar Propiedad"
                message="⚠️ ADVERTENCIA: Esto eliminará la propiedad y TODO su historial (inquilinos, pagos, gas, etc). Esta acción es IRREVERSIBLE. ¿Desea continuar?"
                confirmText="Sí, Eliminar Todo"
                isDanger={true}
            />

            <ConfirmModal
                isOpen={deletePaymentModal !== null}
                onClose={() => setDeletePaymentModal(null)}
                onConfirm={confirmDeletePayment}
                title="Eliminar Pago"
                message="¿Está seguro de eliminar este registro de pago? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                isDanger={true}
            />

            <PayGasModal
                isOpen={payGasModal !== null}
                onClose={() => setPayGasModal(null)}
                onSuccess={handlePayGasSuccess}
                gasReading={payGasModal}
            />
        </div>
    )
}
