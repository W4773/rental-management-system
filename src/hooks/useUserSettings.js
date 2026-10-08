// src/hooks/useUserSettings.js
import { useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'
import { cacheGet, cacheSet } from '../lib/localCache'

// The settings row is shared by every component that reads it (receipts, letters, Ajustes): one copy,
// one request, kept in IndexedDB so it is there instantly on the next visit.
let state = { settings: null, loading: true }
let started = false
let inflight = null
const listeners = new Set()

const emit = () => listeners.forEach(l => l())
const setState = (patch) => { state = { ...state, ...patch }; emit() }

async function userId() {
    const { data } = await supabase.auth.getSession()
    return data?.session?.user?.id || null
}

async function fetchSettings() {
    if (inflight) return inflight
    inflight = (async () => {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) return
            const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', ownerId).maybeSingle()
            if (error) throw error
            setState({ settings: data, loading: false })
            const uid = await userId()
            if (uid) cacheSet(`u:${uid}:settings`, data)
        } catch (err) {
            console.warn('Could not fetch user settings:', err.message)
            setState({ loading: false })
        } finally {
            inflight = null
        }
    })()
    return inflight
}

async function start() {
    if (started) return
    started = true
    try {
        const uid = await userId()
        const cached = uid ? await cacheGet(`u:${uid}:settings`) : undefined
        if (cached !== undefined && state.loading) setState({ settings: cached, loading: false })
    } catch { /* no cache */ }
    fetchSettings()
}

const subscribe = (listener) => { listeners.add(listener); start(); return () => listeners.delete(listener) }
const getSnapshot = () => state

export function resetSettingsStore() {
    state = { settings: null, loading: true }
    started = false
    emit()
}

if (typeof window !== 'undefined') {
    window.addEventListener('network:restored', () => { if (started) fetchSettings() })
}

export function useUserSettings() {
    const { settings, loading } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

    async function updateSettings(updates) {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) throw new Error('No autenticado')
            const { data, error } = await supabase
                .from('user_settings')
                .upsert({ ...updates, user_id: ownerId }, { onConflict: 'user_id' })
                .select()
                .single()
            if (error) throw error
            setState({ settings: data, loading: false })
            const uid = await userId()
            if (uid) cacheSet(`u:${uid}:settings`, data)
            return { data, error: null }
        } catch (err) {
            return { data: null, error: err.message }
        }
    }

    async function uploadSignature(file) {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) throw new Error('No autenticado')
            const ext = file.name.split('.').pop().toLowerCase()
            if (!['png', 'jpg', 'jpeg'].includes(ext)) {
                throw new Error('Solo se aceptan archivos PNG o JPG')
            }
            const path = `${ownerId}/signature.${ext}`
            const { error: uploadError } = await supabase.storage
                .from('signatures')
                .upload(path, file, { upsert: true, contentType: file.type })
            if (uploadError) throw uploadError
            const { data: { publicUrl } } = supabase.storage
                .from('signatures')
                .getPublicUrl(path)
            return { url: publicUrl, error: null }
        } catch (err) {
            return { url: null, error: err.message }
        }
    }

    return { settings, loading, updateSettings, uploadSignature, refresh: fetchSettings }
}
