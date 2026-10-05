// src/hooks/useUserSettings.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'

export function useUserSettings() {
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSettings()
    }, [])

    async function fetchSettings() {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) return
            const { data } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', ownerId)
                .maybeSingle()
            setSettings(data)
        } catch (err) {
            console.error('Error fetching user settings:', err)
        } finally {
            setLoading(false)
        }
    }

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
            setSettings(data)
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
