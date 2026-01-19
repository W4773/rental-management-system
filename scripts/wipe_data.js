import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Config
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('Missing env vars. Ensure .env is present in root.')
    process.exit(1)
}

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

async function wipeData() {
    console.log('🧹 Starting data wipe...')

    // Delete in order to respect Foreign Keys (though CASCADE should handle it, explicit is safer sometimes)
    // But wait, user said "clean tables".
    // Note: Anon key can only delete if RLS policies allow. 
    // We added policies "FOR ALL TO public" so it should work.

    const tables = ['gas_consumption', 'rent_payments', 'tenants', 'properties']

    for (const table of tables) {
        console.log(`Deleting all rows from ${table}...`)
        // neq id 0 is a hack to 'delete all' since delete() requires a filter usually, or use .delete().neq('id', '00000000-0000-0000-0000-000000000000') but standard is just a filter that matches all.
        // However, with RLS policy "USING (true)", we can delete.
        // Supabase JS requires at least one filter.
        const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Efficient "Where ID is not null-ish UUID" (effectively all)

        if (error) {
            console.error(`Error deleting from ${table}:`, error.message)
        } else {
            console.log(`✅ ${table} cleared.`)
        }
    }

    console.log('✨ Data wipe complete.')
}

wipeData()
