import { Flame, Zap, Droplets, Trash2, Sparkles, Wrench } from 'lucide-react'

/** Expense types stored in gas_consumption.utility_type. `unit` = types that also accept meter readings. */
export const EXPENSE_TYPES = [
    { id: 'electricity', label: 'Luz', unit: 'kWh', icon: Zap },
    { id: 'water', label: 'Agua', unit: 'm³', icon: Droplets },
    { id: 'garbage', label: 'Basura', icon: Trash2 },
    { id: 'gas', label: 'Gas', unit: 'GL', icon: Flame },
    { id: 'cleaning', label: 'Limpieza', icon: Sparkles },
    { id: 'maintenance', label: 'Mantenimiento', icon: Wrench }
]

// Old rows without utility_type are gas
export const expenseType = (id) => EXPENSE_TYPES.find(t => t.id === (id || 'gas')) || EXPENSE_TYPES[3]
