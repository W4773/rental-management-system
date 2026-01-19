import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Config
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

console.log('Testing connection to:', process.env.VITE_SUPABASE_URL)

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('❌ Missing env vars. Ensure .env is present in root.')
    process.exit(1)
}

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

async function testConnection() {
    console.log('⏳ Pinging Supabase...')
    const start = Date.now()
    const { data, error } = await supabase.from('properties').select('count', { count: 'exact', head: true })

    if (error) {
        console.error('❌ Connection Failed:', error.message)
        console.error('Details:', error)
    } else {
        console.log('✅ Connection Successful!')
        console.log(`⏱️ Latency: ${Date.now() - start}ms`)
        console.log('Data access:', data === null ? 'OK (Head request)' : 'OK')

        // Try a read
        const { data: props, error: readError } = await supabase.from('properties').select('*').limit(1)
        if (readError) console.error('❌ Read Error:', readError.message)
        else console.log(`✅ Read properties table OK. Rows found: ${props.length}`)
    }
}

testConnection()
