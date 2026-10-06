-- 006_payment_void.sql  ·  ESQUEMA: rental  ·  Proyecto: cfcssfwxdfgqpvyuepjo
-- Meses "nulos": un mes que no se cobró ni se cobrará (apartamento vacío, acuerdo especial...).
-- Se guarda como una fila de rent_payments con voided = true (monto 0). No cuenta como deuda ni como pago.
-- Idempotente y sin bloques DO. No cambia ningún valor existente.

alter table rental.rent_payments
    add column if not exists voided boolean not null default false;

alter table rental.rent_payments
    add column if not exists void_reason text;

-- Refresca la caché de la API para que reconozca las columnas nuevas.
notify pgrst, 'reload schema';
