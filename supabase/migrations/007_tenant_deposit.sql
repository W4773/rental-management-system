-- 007: el depósito pasa a ser un dato del inquilino (rental.tenants.deposit_amount).
-- Copia el depósito que ya estuviera en la propiedad al inquilino activo, solo si aún no tiene uno.
-- Es seguro ejecutarlo más de una vez. Copia el archivo COMPLETO en el SQL Editor de Supabase.

alter table rental.tenants add column if not exists deposit_amount numeric;

update rental.tenants t
set deposit_amount = p.deposit_amount
from rental.properties p
where p.id = t.property_id
  and t.end_date is null
  and t.deposit_amount is null
  and p.deposit_amount is not null;

notify pgrst, 'reload schema';
