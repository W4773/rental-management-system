import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

async function testDelete() {
    console.log('🧪 Testing DELETE permission...')

    // 1. Create dummy functionality
    const { data, error: insertError } = await supabase
        .from('properties')
        .insert([{
            name: 'Delete Test',
            address: 'Temp',
            monthly_rent: 100,
            bedrooms: 1,
            bathrooms: 1,
            status: 'vacant'
        }])
        .select()

    if (insertError) {
        console.error('❌ Insert failed (prerequisite):', insertError.message)
        return
    }

    const id = data[0].id
    console.log('✅ Dummy property created:', id)

    // 2. Try delete
    const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)

    if (deleteError) {
        console.error('❌ DELETE FAILED:', deleteError.message)
        console.error('⚠️  You likely need RLS policies enabling DELETE for anon/public role.')
    } else {
        console.log('✅ DELETE SUCCESSFUL. Permissions seem OK.')
    }
}

testDelete()
