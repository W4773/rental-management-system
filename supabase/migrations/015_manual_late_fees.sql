-- 015: mora manual por inquilino (se agrega desde la carta de cobro).
-- JSON por mes: { "2026-09": { "type": "percent" | "fixed", "value": 5 } }.
-- value 0 = ese mes queda explícitamente SIN mora (anula la regla automática de Ajustes -> Cargos).
-- Reutiliza las políticas RLS de rental.tenants. Es seguro ejecutarlo más de una vez.
-- Copia el archivo COMPLETO en el SQL Editor de Supabase.

alter table rental.tenants add column if not exists manual_late_fees jsonb;

notify pgrst, 'reload schema';
