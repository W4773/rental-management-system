import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { db: { schema: 'rental' } });

async function check() {
  const { data: tenants } = await supabase.from('tenants').select('*, properties(*)');
  const { data: payments } = await supabase.from('rent_payments').select('*');
  
  console.log('Tenants:', tenants.length);
  tenants.forEach(t => {
    const tPayments = payments.filter(p => p.tenant_id === t.id);
    console.log(`Tenant ${t.name} (Start: ${t.start_date}) - Payments: ${tPayments.length}`);
  });
}
check();
