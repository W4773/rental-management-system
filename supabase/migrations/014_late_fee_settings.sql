-- 014: reglas de mora (Ajustes -> Cargos).
-- JSON: { enabled, type: 'fixed' | 'percent', value, graceDay, graceMonth: 'same' | 'next' }.
-- Es seguro ejecutarlo más de una vez. Copia el archivo COMPLETO en el SQL Editor de Supabase.

alter table rental.user_settings add column if not exists late_fee_settings jsonb;

notify pgrst, 'reload schema';
