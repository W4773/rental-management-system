import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { clearEffectiveOwnerCache } from '../lib/effectiveOwner'
import { resetStore } from '../lib/dataStore'
import { resetSettingsStore } from '../hooks/useUserSettings'

const AuthContext = createContext({})

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const lastUid = useRef(null)

    // Drops everything kept for a user (cached tables, settings, owner id). Unsent payments stay stored for that same user only so nothing leaks to the next session
    const forgetUser = (uid) => {
        clearEffectiveOwnerCache(uid)
        resetSettingsStore()
        return resetStore()
    }

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            lastUid.current = session?.user?.id ?? null
            setUser(session?.user ?? null)
            setLoading(false)
        })

        // Listen for auth changes. Token refreshes keep the caches; a sign-out or another user clears them.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const uid = session?.user?.id ?? null
            const previous = lastUid.current
            if (previous && (event === 'SIGNED_OUT' || uid !== previous)) forgetUser(previous)
            lastUid.current = uid
            setUser(prev => (prev?.id === uid && event === 'TOKEN_REFRESHED') ? prev : (session?.user ?? null))
        })

        return () => subscription.unsubscribe()
    }, [])

    const signUp = async (email, password, metadata = {}) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            })
            if (error) throw error
            return { user: data.user, error: null }
        } catch (error) {
            return { user: null, error: error.message }
        }
    }

    const signIn = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            if (error) throw error
            return { user: data.user, error: null }
        } catch (error) {
            return { user: null, error: error.message }
        }
    }

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            return { error: null }
        } catch (error) {
            return { error: error.message }
        }
    }

    const value = {
        user,
        loading,
        signUp,
        signIn,
        signOut
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
