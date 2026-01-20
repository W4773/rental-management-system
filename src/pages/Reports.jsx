import { useState } from 'react'
import Header from '../components/Common/Header'

export default function Reports() {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    return (
        <div className="min-h-screen bg-slate-900">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">📊 Reportes e Histórico</h1>

                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {[2026, 2025, 2024, 2023].map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="border rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Histórico de Pagos</h3>
                            <p className="text-gray-600">Los reportes de pagos por año se mostrarán próximamente.</p>
                        </div>

                        <div className="border rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Gastos Registrados</h3>
                            <p className="text-gray-600">Los reportes de gastos (gas, luz, agua) se mostrarán próximamente.</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">🚧 En Construcción</h3>
                        <p className="text-blue-700">
                            Esta página está siendo desarrollada. Pronto podrás ver históricos detallados de:
                        </p>
                        <ul className="list-disc list-inside text-blue-700 mt-2 space-y-1">
                            <li>Pagos de renta por propiedad y mes</li>
                            <li>Consumos de gas, luz y agua</li>
                            <li>Gastos extraordinarios</li>
                            <li>Gráficas de tendencias anuales</li>
                            <li>Exportación de datos a Excel/PDF</li>
                        </ul>
                    </div>
                </div>
            </main >
        </div >
    )
}
