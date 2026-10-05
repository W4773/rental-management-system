import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MISSING = /could not find the function|schema cache|does not exist|PGRST202/i

/**
 * Workspace team ("Equipo") backed by rental.workspace_members through three RPCs
 * (migration 003). `available` is false until that migration has been applied.
 */
export function useTeam() {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [available, setAvailable] = useState(true)

    const refresh = useCallback(async () => {
        const { data, error } = await supabase.rpc('list_workspace_members')
        if (error) {
            setAvailable(!MISSING.test(`${error.message} ${error.code || ''}`))
            setMembers([])
        } else {
            setAvailable(true)
            setMembers(data || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => { refresh() }, [refresh])

    const owner = members.find(m => m.is_owner) || null
    const me = members.find(m => m.is_me) || null
    const isOwner = !!me?.is_owner

    async function invite(email, role = 'member') {
        const { error } = await supabase.rpc('invite_workspace_member', { p_email: email, p_role: role })
        if (error) return { error: error.message }
        await refresh()
        return { error: null }
    }

    async function remove(memberId) {
        const { error } = await supabase.rpc('remove_workspace_member', { p_member_id: memberId })
        if (error) return { error: error.message }
        await refresh()
        return { error: null }
    }

    return { loading, available, members, owner, isOwner, invite, remove, refresh }
}
