import { useState } from 'react'

export default function QuickActions({ onNewPayment, onNewProperty, onRegisterGas, onRegisterElectricity, onRegisterWater, onNewTenant }) {
    const [showExpensesMenu, setShowExpensesMenu] = useState(false)

    return (
        <div className="flex flex-col gap-3 w-full">
            <button
                className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all text-left group"
                onClick={onNewPayment}
            >
                <span className="text-2xl group-hover:scale-110 transition-transform">💰</span>
                <span className="font-semibold text-gray-700">Registrar Pago</span>
            </button>

            <button
                className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all text-left group"
                onClick={onNewProperty}
            >
                <span className="text-2xl group-hover:scale-110 transition-transform">🏠</span>
                <span className="font-semibold text-gray-700">Nueva Propiedad</span>
            </button>

            <button
                className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all text-left group"
                onClick={onNewTenant}
            >
                <span className="text-2xl group-hover:scale-110 transition-transform">👤</span>
                <span className="font-semibold text-gray-700">Nuevo Inquilino</span>
            </button>

            <div className="relative">
                <button
                    className="w-full flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all text-left group"
                    onClick={() => setShowExpensesMenu(!showExpensesMenu)}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl group-hover:scale-110 transition-transform">📝</span>
                        <span className="font-semibold text-gray-700">Registrar Gastos</span>
                    </div>
                    <span className="text-gray-400 text-sm transform transition-transform duration-200" style={{ transform: showExpensesMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▼
                    </span>
                </button>

                {showExpensesMenu && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in-down">
                        <button
                            className="w-full text-left px-4 py-3 hover:bg-orange-50 hover:text-orange-600 transition flex items-center gap-2 border-b border-gray-50"
                            onClick={() => { onRegisterGas(); setShowExpensesMenu(false) }}
                        >
                            <span>🔥</span> Gas
                        </button>
                        <button
                            className="w-full text-left px-4 py-3 hover:bg-yellow-50 hover:text-yellow-600 transition flex items-center gap-2 border-b border-gray-50"
                            onClick={() => { onRegisterElectricity(); setShowExpensesMenu(false) }}
                        >
                            <span>💡</span> Luz (Electricidad)
                        </button>
                        <button
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 hover:text-blue-600 transition flex items-center gap-2 border-b border-gray-50"
                            onClick={() => { onRegisterWater(); setShowExpensesMenu(false) }}
                        >
                            <span>💧</span> Agua
                        </button>
                        <button className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center gap-2 text-gray-400 cursor-not-allowed">
                            <span>📋</span> Extra (Pronto)
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
