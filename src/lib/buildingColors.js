import { useMemo } from 'react'

// Twelve well-separated hues. Only the solid colour is stored; tints are derived with alpha so
// they work as inline styles (Tailwind can't generate dynamic class names).
const PALETTE = [
    '#2563eb', '#7c3aed', '#0d9488', '#db2777', '#ea580c', '#4f46e5',
    '#0891b2', '#c026d3', '#65a30d', '#b45309', '#0284c7', '#e11d48'
]

const hash = (str) => {
    let h = 0
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
    return h
}

const toColor = (solid) => ({ solid, text: solid, soft: `${solid}12`, border: `${solid}55`, strong: `${solid}22` })

/**
 * Assigns every building its own colour: the one its id hashes to, or the next free one when taken
 * (buildings are processed in a fixed order, so colours stay the same between reloads).
 * Returns { [buildingId]: { solid, text, soft, border, strong } }.
 */
export function assignBuildingColors(buildings = []) {
    const ordered = [...buildings].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id))
    const taken = new Set()
    const map = {}
    for (const b of ordered) {
        let idx = hash(b.id) % PALETTE.length
        if (taken.size < PALETTE.length) while (taken.has(idx)) idx = (idx + 1) % PALETTE.length
        taken.add(idx)
        map[b.id] = toColor(PALETTE[idx])
    }
    return map
}

export function useBuildingColors(buildings) {
    return useMemo(() => assignBuildingColors(buildings), [buildings])
}
