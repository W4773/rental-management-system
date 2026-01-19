import { useState } from 'react'
import { getPaymentStatusColor, formatCurrency } from '../../lib/calculations'
import { formatDate } from '../../lib/dateUtils'

export default function PropertyGrid({ properties = [], tenants = [], payments = [], onSelectProperty, selectedProperty }) {
    const safeProps = Array.isArray(properties) ? properties : []
    const safeTenants = Array.isArray(tenants) ? tenants : []
    const safePayments = Array.isArray(payments) ? payments : []

    if (safeProps.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center min-h-[200px] flex items-center justify-center">
                <div className='flex flex-col items-center'>
                    <span className="text-4xl mb-2">🏠</span>
                    <p className="text-gray-500 font-medium">No hay propiedades registradas</p>
                    <p className="text-sm text-gray-400 mt-1">Usa el botón "Nueva Propiedad" para comenzar</p>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeProps.map(property => {
                // Find active tenant for this property
                const activeTenant = safeTenants.find(
                    tenant => tenant.property_id === property.id && tenant.end_date === null
                )

                // Get payment status
                const status = getPaymentStatusColor(property, activeTenant, safePayments)
                const isSelected = selectedProperty?.id === property.id

                return (
                    <div
                        key={property.id}
                        className={`bg-white rounded-lg shadow-md border-2 p-4 cursor-pointer transition-all hover:scale-[1.02] ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
                            } ${status.className}`}
                        onClick={() => onSelectProperty(property)}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-gray-800 truncate" title={property.name}>{property.name}</h3>
                            <span className="text-xl">{status.emoji}</span>
                        </div>

                        {activeTenant ? (
                            <div className="text-sm text-gray-600 space-y-1 mb-3">
                                <p><span className="font-semibold">Inquilino:</span> {activeTenant.name}</p>
                                <p><span className="font-semibold">Estado:</span> {status.label}</p>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 italic mb-3">
                                {status.label}
                            </div>
                        )}

                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-sm">
                            <span className="font-bold text-gray-700">{formatCurrency(property.monthly_rent)}</span>
                            <button
                                className="text-blue-600 hover:text-blue-800 font-medium"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSelectProperty(property)
                                }}
                            >
                                Ver Detalles →
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
