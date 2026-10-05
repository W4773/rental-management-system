import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ACTIVITY_EVENT } from '../lib/activityLog'

const LIMIT = 30

/** Latest entries of rental.activity_log. `available` is false until migration 004 is applied. */
export function useActivityLog() {
    const [entries, setEntries] = useState([])
    const [available, setAvailable] = useState(true)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        const { data, error } = await supabase
            .from('activity_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(LIMIT)
        if (error) {
            setAvailable(false)
            setEntries([])
        } else {
            setAvailable(true)
            setEntries(data || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        refresh()
        // logActivity() announces every new entry
        window.addEventListener(ACTIVITY_EVENT, refresh)
        return () => window.removeEventListener(ACTIVITY_EVENT, refresh)
    }, [refresh])

    return { entries, available, loading, refresh }
}
