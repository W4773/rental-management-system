import { createClient } from '@supabase/supabase-js'
import { resilientFetch } from './resilientFetch'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'rental' },
    // Time limits, read retries and connection tracking for every request
    global: { fetch: resilientFetch }
})
